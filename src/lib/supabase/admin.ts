import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { DocumentRow } from "@/lib/documents";
import type {
  EsgExtractionInsert,
  EsgExtractionRow,
  ExtractedEsgFieldInsert,
  ExtractedEsgFieldRow,
} from "@/lib/esg/types";

type Database = {
  public: {
    Tables: {
      documents: {
        Row: DocumentRow;
        Insert: {
          id?: string;
          created_at?: string;
          file_name: string;
          storage_path: string;
          file_type: string;
          file_size: number;
          status?: string;
          extraction_status?: string;
          extracted_text?: string | null;
          page_count?: number | null;
          extracted_at?: string | null;
          extraction_error?: string | null;
          parser_version?: string | null;
        };
        Update: Partial<DocumentRow>;
        Relationships: [];
      };
      esg_extractions: {
        Row: EsgExtractionRow;
        Insert: EsgExtractionInsert;
        Update: Partial<EsgExtractionRow>;
        Relationships: [];
      };
      extracted_esg_fields: {
        Row: ExtractedEsgFieldRow;
        Insert: ExtractedEsgFieldInsert;
        Update: Partial<ExtractedEsgFieldRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let adminClient: SupabaseClient<Database> | undefined;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Supabase server configuration is missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }

  adminClient = createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return adminClient;
}
