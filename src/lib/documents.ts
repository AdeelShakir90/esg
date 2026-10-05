export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

export type DocumentRecord = {
  id: string;
  created_at: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  status: string;
  extraction_status: string;
  extracted_text: string | null;
  page_count: number | null;
  extracted_at: string | null;
  extraction_error: string | null;
  parser_version: string | null;
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
