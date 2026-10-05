import { MAX_DOCUMENT_SIZE_BYTES, type DocumentRecord } from "@/lib/documents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DOCUMENTS_BUCKET = "documents";
const PDF_MIME_TYPE = "application/pdf";

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

function isPdf(file: File) {
  return file.type.toLowerCase() === PDF_MIME_TYPE && /\.pdf$/i.test(file.name);
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("documents")
      .select("id, created_at, file_name, storage_path, file_type, file_size, status")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load documents from Supabase:", error.message);
      return json({ error: "Unable to load documents." }, { status: 500 });
    }

    return json({ documents: (data ?? []) as DocumentRecord[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("Documents GET failed:", message);
    return json({ error: "Unable to load documents." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return json({ error: "A multipart form upload is required." }, { status: 400 });
  }

  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length !== 1) {
    return json({ error: "Upload exactly one PDF file per request." }, { status: 400 });
  }

  const file = files[0];

  if (!isPdf(file)) {
    return json(
      { error: "Only PDF files with a .pdf extension are accepted." },
      { status: 415 }
    );
  }

  if (file.size === 0) {
    return json({ error: "The selected PDF is empty." }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return json({ error: "PDF files must be 5 MB or smaller." }, { status: 413 });
  }

  const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.pdf`;

  try {
    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: PDF_MIME_TYPE,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage upload failed:", uploadError.message);
      return json({ error: "The PDF could not be stored." }, { status: 500 });
    }

    const { data, error: insertError } = await supabase
      .from("documents")
      .insert({
        file_name: file.name,
        storage_path: storagePath,
        file_type: PDF_MIME_TYPE,
        file_size: file.size,
        status: "uploaded",
      })
      .select("id, created_at, file_name, storage_path, file_type, file_size, status")
      .single();

    if (insertError) {
      const { error: cleanupError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([storagePath]);

      console.error("Supabase document insert failed:", insertError.message);

      if (cleanupError) {
        console.error("Supabase Storage rollback failed:", cleanupError.message);
        return json(
          { error: "Document metadata could not be saved, and storage cleanup failed." },
          { status: 500 }
        );
      }

      return json(
        { error: "Document metadata could not be saved. The uploaded file was removed." },
        { status: 500 }
      );
    }

    return json({ document: data as DocumentRecord }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("Documents POST failed:", message);
    return json({ error: "The document upload failed." }, { status: 500 });
  }
}
