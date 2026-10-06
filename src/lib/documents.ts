export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

export type DocumentExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "no_text"
  | "failed";

export type DocumentRecord = {
  id: string;
  created_at: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  extraction_status: DocumentExtractionStatus;
  page_count: number | null;
  extracted_at: string | null;
  extraction_error: string | null;
  parser_version: string | null;
};

export type DocumentRow = DocumentRecord & {
  storage_path: string;
  extracted_text: string | null;
};

export type DocumentExtractionResponse = {
  id: string;
  extraction_status: DocumentExtractionStatus;
  page_count?: number;
  character_count?: number;
  extracted_at?: string;
  parser_version?: string;
  error?: string;
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
