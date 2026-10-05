begin;

alter table public.documents
  add column if not exists extraction_status text not null default 'pending',
  add column if not exists extracted_text text,
  add column if not exists page_count integer,
  add column if not exists extracted_at timestamptz,
  add column if not exists extraction_error text,
  add column if not exists parser_version text;

commit;
