import { authorizeDocument, authorizeOrganization, type AuthorizationContext } from "./authorization";
import { assertValidDocumentId, loadValidationData, type ValidationDocumentSource, type ValidationExtractionSource } from "../esg/validation";
import type { DocumentRecord } from "../documents";

export class ReadAccessError extends Error {
  constructor(readonly status: 401 | 403 | 404 | 503) {
    super(status === 503 ? "Document access is temporarily disabled pending database security verification." : status === 401 ? "Unauthorized." : status === 404 ? "Document not found." : "Organization access denied.");
  }
}

export type ScopedDocument = ValidationDocumentSource & { organization_id: string | null };
export interface ReadPort {
  getUser(): Promise<{ id: string } | null>;
  memberships(userId: string): Promise<AuthorizationContext["memberships"]>;
  documents(organizationId: string): Promise<(DocumentRecord & { organization_id: string | null })[]>;
  document(id: string, organizationId: string): Promise<ScopedDocument | null>;
  extractions(documentId: string): Promise<ValidationExtractionSource[]>;
  fields(extractionId: string): Promise<unknown[]>;
}

export async function verifiedReadContext(port: ReadPort, selectedOrganization: string | null, databaseVerified = false) {
  const user = await port.getUser();
  if (!user) throw new ReadAccessError(401);
  // Hard stop before any membership/document query in the live adapter.
  if (!databaseVerified) throw new ReadAccessError(503);
  const memberships = await port.memberships(user.id);
  const context: AuthorizationContext = { userId: user.id, memberships };
  const allowed = [...new Set(memberships.map((m) => m.organizationId))].filter((id) => authorizeOrganization(context, id, "read").allowed);
  // No arbitrary first-organization selection when multiple memberships exist.
  const organizationId = selectedOrganization ?? (allowed.length === 1 ? allowed[0] : null);
  const decision = authorizeOrganization(context, organizationId, "read");
  if (!decision.allowed || !organizationId) throw new ReadAccessError(403);
  return { context, organizationId, scopeKey: `${user.id}:${organizationId}` };
}

export async function readDocuments(port: ReadPort, selected: string | null, databaseVerified = false) {
  const scope = await verifiedReadContext(port, selected, databaseVerified);
  const rows = await port.documents(scope.organizationId);
  if (rows.some((row) => row.organization_id !== scope.organizationId)) throw new ReadAccessError(503);
  // Explicit public projection: storage paths, source text and attribution are excluded.
  const documents: DocumentRecord[] = rows.map((row) => ({
    id: row.id, created_at: row.created_at, file_name: row.file_name,
    file_type: row.file_type, file_size: row.file_size, status: row.status,
    extraction_status: row.extraction_status, page_count: row.page_count,
    extracted_at: row.extracted_at, extraction_error: row.extraction_error,
    parser_version: row.parser_version,
  }));
  return { documents, scopeKey: scope.scopeKey };
}

export async function readValidation(port: ReadPort, id: string, selected: string | null, databaseVerified = false) {
  const scope = await verifiedReadContext(port, selected, databaseVerified).catch((error: unknown) => {
    // Document entry points conceal unavailable organization membership too.
    if (error instanceof ReadAccessError && error.status === 403) throw new ReadAccessError(404);
    throw error;
  });
  assertValidDocumentId(id);
  const document = await port.document(id, scope.organizationId);
  const decision = authorizeDocument(scope.context, document && { organizationId: document.organization_id }, "read");
  if (!document || document.id !== id || document.organization_id !== scope.organizationId || !decision.allowed) throw new ReadAccessError(404);
  const validation = await loadValidationData(id, {
    async findDocument() { return document; },
    async findCompletedExtractions() {
      const rows = await port.extractions(id);
      if (rows.some((row) => row.document_id !== id)) throw new ReadAccessError(503);
      return rows;
    },
    async findFields(extractionId) {
      const rows = await port.fields(extractionId);
      if (rows.some((row) => !row || typeof row !== "object" || !("extraction_id" in row) || row.extraction_id !== extractionId)) throw new ReadAccessError(503);
      return rows;
    },
  });
  return { validation, scopeKey: scope.scopeKey };
}
