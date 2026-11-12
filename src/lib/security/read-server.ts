import "server-only";
import { createAuthServerClient } from "../supabase/server";
import { DATABASE_READS_VERIFIED } from "./database-verification";
import { ReadAccessError, readDocuments, readValidation, type ReadPort } from "./read-access";

async function createReadPort(): Promise<ReadPort> {
  const client = await createAuthServerClient();
  return {
    async getUser() {
      const { data, error } = await client.auth.getUser();
      return error ? null : data.user;
    },
    async memberships(userId) {
      const { data, error } = await client.from("organization_memberships")
        .select("user_id, organization_id, role, status").eq("user_id", userId);
      if (error) throw new ReadAccessError(503);
      return (data ?? []).map((row) => ({ userId: row.user_id, organizationId: row.organization_id, role: row.role, status: row.status }));
    },
    async documents(organizationId) {
      const { data, error } = await client.from("documents")
        .select("id, organization_id, created_at, file_name, file_type, file_size, status, extraction_status, page_count, extracted_at, extraction_error, parser_version")
        .eq("organization_id", organizationId).order("created_at", { ascending: false });
      if (error) throw new ReadAccessError(503);
      return data ?? [];
    },
    async document(id, organizationId) {
      const { data, error } = await client.from("documents")
        .select("id, organization_id, file_name, extraction_status, extracted_at, parser_version")
        .eq("id", id).eq("organization_id", organizationId).maybeSingle();
      if (error) throw new ReadAccessError(503);
      return data;
    },
    async extractions(documentId) {
      const { data, error } = await client.from("esg_extractions")
        .select("id, document_id, status, schema_version, source_parser_version, source_extracted_at, created_at, completed_at")
        .eq("document_id", documentId).eq("status", "completed")
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(2);
      if (error) throw new ReadAccessError(503);
      return data ?? [];
    },
    async fields(extractionId) {
      const { data, error } = await client.from("extracted_esg_fields")
        .select("id, extraction_id, field_key, label, category, status, value, unit, reporting_period_label, reporting_period_start, reporting_period_end, confidence, evidence_quote, evidence_page, validation_status, validated_value, updated_at")
        .eq("extraction_id", extractionId);
      if (error) throw new ReadAccessError(503);
      return data ?? [];
    },
  };
}

export async function getAuthorizedDocuments(selected: string | null = null) {
  try { return await readDocuments(await createReadPort(), selected, DATABASE_READS_VERIFIED); }
  catch (error) { if (error instanceof ReadAccessError) throw error; throw new ReadAccessError(503); }
}

export async function getAuthorizedValidation(id: string, selected: string | null = null) {
  try { return await readValidation(await createReadPort(), id, selected, DATABASE_READS_VERIFIED); }
  catch (error) {
    if (error instanceof ReadAccessError || (error instanceof Error && error.name === "ValidationDataError")) throw error;
    throw new ReadAccessError(503);
  }
}
