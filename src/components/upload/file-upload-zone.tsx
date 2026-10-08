"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { ContentCard } from "@/components/primitives/content-card";
import {
  type EsgExtractionActionResult,
  triggerEsgExtraction,
} from "@/components/upload/esg-extraction-action";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  type DocumentExtractionResponse,
  type DocumentExtractionStatus,
  formatFileSize,
  MAX_DOCUMENT_SIZE_BYTES,
  type DocumentRecord,
} from "@/lib/documents";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type UploadStatus = "uploading" | "success" | "error";

type UploadItem = {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  error?: string;
  document?: DocumentRecord;
};

type EsgExtractionUiState =
  | { status: "extracting" }
  | { status: "success"; extractionId: string }
  | { status: "error" };

function getClientValidationError(file: File) {
  if (file.type.toLowerCase() !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
    return "Only PDF files are accepted.";
  }
  if (file.size === 0) return "The selected PDF is empty.";
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) return "PDF files must be 5 MB or smaller.";
  return null;
}

function UploadStatusBadge({ status }: { status: UploadStatus }) {
  if (status === "uploading") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200/90 bg-amber-50/90 font-medium text-amber-900"
      >
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Uploading
      </Badge>
    );
  }

  if (status === "error") {
    return (
      <Badge variant="destructive" className="gap-1 font-medium">
        <AlertCircle className="size-3" aria-hidden />
        Failed
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="gap-1 border border-primary/15 bg-primary/10 font-medium text-primary"
    >
      <CheckCircle2 className="size-3" aria-hidden />
      Uploaded
    </Badge>
  );
}

function StoredStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className="border border-primary/15 bg-primary/10 font-medium capitalize text-primary"
    >
      {status}
    </Badge>
  );
}

function ExtractionStatusBadge({
  status,
  pageCount,
}: {
  status: DocumentExtractionStatus;
  pageCount: number | null;
}) {
  if (status === "processing") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200/90 bg-amber-50/90 font-medium text-amber-900"
      >
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Extracting…
      </Badge>
    );
  }

  if (status === "completed") {
    const pages = pageCount
      ? ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}`
      : "";
    return (
      <Badge
        variant="secondary"
        className="border border-primary/15 bg-primary/10 font-medium text-primary"
      >
        Extracted{pages}
      </Badge>
    );
  }

  if (status === "no_text") {
    return (
      <Badge
        variant="outline"
        className="border-amber-200/90 bg-amber-50/90 font-medium text-amber-900"
      >
        No text found
      </Badge>
    );
  }

  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  return <Badge variant="outline">Pending</Badge>;
}

export function FileUploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [extractingIds, setExtractingIds] = useState<Set<string>>(() => new Set());
  const esgExtractionInFlight = useRef<Set<string>>(new Set());
  const [esgExtractionStates, setEsgExtractionStates] = useState<
    Record<string, EsgExtractionUiState>
  >({});
  const validationDocumentId = documents.find(
    (document) => esgExtractionStates[document.id]?.status === "success"
  )?.id;

  const loadDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      const payload = (await response.json()) as {
        documents?: DocumentRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load documents.");
      }

      setDocuments(payload.documents ?? []);
    } catch (error) {
      setDocumentsError(
        error instanceof Error ? error.message : "Unable to load documents."
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const extractDocument = useCallback(
    async (documentId: string) => {
      setExtractingIds((current) => new Set(current).add(documentId));
      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId
            ? {
                ...document,
                extraction_status: "processing",
                extraction_error: null,
              }
            : document
        )
      );

      try {
        const response = await fetch(`/api/documents/${documentId}/extract`, {
          method: "POST",
        });
        const payload = (await response.json()) as DocumentExtractionResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Text extraction failed.");
        }
      } catch {
        // The extraction route persists its own safe failure state when it runs.
      } finally {
        await loadDocuments();
        setExtractingIds((current) => {
          const next = new Set(current);
          next.delete(documentId);
          return next;
        });
      }
    },
    [loadDocuments]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      const validationError = getClientValidationError(file);
      const entry: UploadItem = {
        id,
        name: file.name,
        size: file.size,
        status: validationError ? "error" : "uploading",
        error: validationError ?? undefined,
      };

      setUploads((current) => [entry, ...current]);
      if (validationError) return;

      const formData = new FormData();
      formData.set("file", file);

      try {
        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as {
          document?: DocumentRecord;
          error?: string;
        };

        if (!response.ok || !payload.document) {
          throw new Error(payload.error ?? "The PDF could not be uploaded.");
        }

        const uploadedDocument = payload.document;
        setUploads((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, status: "success", document: uploadedDocument }
              : item
          )
        );
        setDocuments((current) => [
          uploadedDocument,
          ...current.filter((document) => document.id !== uploadedDocument.id),
        ]);

        await extractDocument(uploadedDocument.id);
      } catch (error) {
        setUploads((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "error",
                  error:
                    error instanceof Error
                      ? error.message
                      : "The PDF could not be uploaded.",
                }
              : item
          )
        );
      }
    },
    [extractDocument]
  );

  const extractEsgData = useCallback(async (documentId: string) => {
    if (esgExtractionInFlight.current.has(documentId)) return;

    esgExtractionInFlight.current.add(documentId);
    setEsgExtractionStates((current) => ({
      ...current,
      [documentId]: { status: "extracting" },
    }));

    let result: EsgExtractionActionResult;
    try {
      result = await triggerEsgExtraction(documentId);
    } catch {
      result = { success: false };
    } finally {
      esgExtractionInFlight.current.delete(documentId);
    }

    setEsgExtractionStates((current) => ({
      ...current,
      [documentId]: result.success
        ? { status: "success", extractionId: result.extractionId }
        : { status: "error" },
    }));
  }, []);

  const uploadFiles = useCallback(
    async (selectedFiles: File[]) => {
      for (const file of selectedFiles) {
        await uploadFile(file);
      }
    },
    [uploadFile]
  );

  return (
    <div className={design.page.centeredMd}>
      <ContentCard elevation="lg" className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-secondary/20 pb-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Upload your ESG documents
          </h1>
          <CardDescription className="text-base">
            Upload PDF documents securely for your ESG workspace. Each file can be up
            to 5 MB.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-8 pt-8">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files ?? []);
              event.target.value = "";
              void uploadFiles(selectedFiles);
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDrag(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              void uploadFiles(Array.from(event.dataTransfer.files));
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex min-h-[min(22rem,55vh)] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out motion-safe:hover:-translate-y-0.5 sm:min-h-[20rem] sm:py-16",
              drag
                ? "border-primary/50 bg-primary/[0.1] shadow-[0_0_0_4px_rgb(31_122_99_/0.14)] motion-safe:scale-[1.01]"
                : "border-primary/25 bg-gradient-to-b from-secondary/55 via-secondary/35 to-secondary/20 hover:border-primary/45 hover:from-secondary/75 hover:via-secondary/45 hover:to-secondary/30 hover:shadow-soft"
            )}
          >
            <span
              className={cn(
                "flex size-16 items-center justify-center rounded-2xl text-primary transition-[transform,background-color] duration-300 ease-out",
                drag ? "scale-105 bg-primary/18 shadow-soft" : "bg-primary/10 shadow-sm"
              )}
            >
              <UploadCloud className="size-8" strokeWidth={1.35} aria-hidden />
            </span>
            <p className="mt-6 text-base font-semibold text-foreground">
              Click to upload
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              or drag and drop your files here
            </p>
            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-primary/80">
              PDF only · Maximum 5 MB
            </p>
          </div>

          {uploads.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Current uploads</h3>
              <ul className="flex flex-col gap-2" aria-label="Current uploads">
                {uploads.map((upload) => (
                  <li
                    key={upload.id}
                    className="rounded-xl border border-border/50 bg-card px-4 py-3.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="size-5" strokeWidth={1.5} aria-hidden />
                        </span>
                        <div className="min-w-0 text-left">
                          <p className="truncate font-medium text-foreground">
                            {upload.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(upload.size)}
                          </p>
                        </div>
                      </div>
                      <UploadStatusBadge status={upload.status} />
                    </div>
                    {upload.error && (
                      <p className="mt-2 pl-[3.25rem] text-sm text-destructive" role="alert">
                        {upload.error}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Stored documents</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void loadDocuments()}
                disabled={documentsLoading}
              >
                {documentsLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Refresh
              </Button>
            </div>

            {documentsError && (
              <p
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {documentsError}
              </p>
            )}

            {!documentsLoading && !documentsError && documents.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No documents have been uploaded yet.
              </p>
            )}

            {documents.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label="Stored documents">
                {documents.map((document) => (
                  <StoredDocument
                    key={document.id}
                    document={document}
                    isExtracting={extractingIds.has(document.id)}
                    esgExtractionState={esgExtractionStates[document.id]}
                    onExtract={extractDocument}
                    onExtractEsg={extractEsgData}
                  />
                ))}
              </ul>
            )}
          </div>

          <div
            className="flex gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-secondary/40 px-4 py-4 sm:px-5 sm:py-5"
            role="status"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-5" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground">
                Your PDFs are stored securely
              </span>
              <span className="mt-1 block text-muted-foreground">
                Completed ESG extractions can now be reviewed in read-only validation.
                Editing and approvals will be added in a later milestone.
              </span>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border/50 bg-muted/20 px-4 py-6 sm:flex-row sm:justify-between sm:px-6">
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full border-border/80 bg-background sm:w-auto"
            )}
          >
            Back
          </Link>
          <Button
            type="button"
            className="w-full shadow-soft transition-all duration-200 hover:shadow-soft-lg sm:w-auto sm:min-w-[11rem]"
            disabled={
              !validationDocumentId ||
              uploads.some((item) => item.status === "uploading")
            }
            onClick={() => {
              if (validationDocumentId) {
                router.push(
                  `/validation?documentId=${encodeURIComponent(validationDocumentId)}`
                );
              }
            }}
          >
            Continue to Validation
          </Button>
        </CardFooter>
      </ContentCard>
    </div>
  );
}

function StoredDocument({
  document,
  isExtracting,
  esgExtractionState,
  onExtract,
  onExtractEsg,
}: {
  document: DocumentRecord;
  isExtracting: boolean;
  esgExtractionState: EsgExtractionUiState | undefined;
  onExtract: (documentId: string) => Promise<void>;
  onExtractEsg: (documentId: string) => Promise<void>;
}) {
  const extractionStatus = isExtracting ? "processing" : document.extraction_status;
  const canExtract =
    !isExtracting &&
    (["pending", "failed", "no_text"] as DocumentExtractionStatus[]).includes(
      document.extraction_status
    );
  const extractionActionLabel =
    document.extraction_status === "pending" ? "Extract text" : "Retry extraction";
  const canExtractEsg = document.extraction_status === "completed";
  const isExtractingEsg = esgExtractionState?.status === "extracting";

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card px-4 py-3.5 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/25 hover:shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-5" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <p className="truncate font-medium text-foreground">{document.file_name}</p>
          <p className="text-xs text-muted-foreground">
            PDF · {formatFileSize(document.file_size)} ·{" "}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(document.created_at))}
          </p>
          {document.extraction_error &&
            ["failed", "no_text"].includes(document.extraction_status) && (
              <p
                className={cn(
                  "mt-1 text-xs",
                  document.extraction_status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {document.extraction_error}
              </p>
            )}
          {esgExtractionState?.status === "error" && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              ESG extraction failed. Please try again.
            </p>
          )}
          {esgExtractionState?.status === "success" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Extraction ID: {esgExtractionState.extractionId}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <StoredStatusBadge status={document.status} />
        <ExtractionStatusBadge
          status={extractionStatus}
          pageCount={document.page_count}
        />
        {canExtract && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onExtract(document.id)}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {extractionActionLabel}
          </Button>
        )}
        {canExtractEsg && esgExtractionState?.status !== "success" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExtractingEsg}
            onClick={() => void onExtractEsg(document.id)}
          >
            {isExtractingEsg ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5" aria-hidden />
            )}
            {isExtractingEsg ? "Extracting ESG..." : "Extract ESG data"}
          </Button>
        )}
        {esgExtractionState?.status === "success" && (
          <Badge
            variant="secondary"
            className="gap-1 border border-primary/15 bg-primary/10 font-medium text-primary"
          >
            <CheckCircle2 className="size-3" aria-hidden />
            ESG extracted
          </Badge>
        )}
        {canExtractEsg && !isExtractingEsg && (
          <Link
            href={`/validation?documentId=${encodeURIComponent(document.id)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Review ESG data
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled
          title="Document deletion will be available in a later milestone."
          aria-label={`Delete ${document.file_name} unavailable`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}
