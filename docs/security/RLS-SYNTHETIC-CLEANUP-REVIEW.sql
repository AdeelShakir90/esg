-- REVIEW ONLY. Mutating cleanup proposal, default ROLLBACK. Separate approval required.
-- Supported Storage API cleanup must complete first; NEVER DELETE storage.objects.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local search_path = pg_catalog;
do $cleanup$
declare
  org_a uuid := null; org_b uuid := null;
  operator_confirmed_target_and_storage_cleanup boolean := false;
  documents uuid[] := array['70170000-0000-4000-8000-000000000001'::uuid,
    '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid];
  extractions uuid[] := array['71170000-0000-4000-8000-000000000001'::uuid,
    '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid];
  fields uuid[] := array['72170000-0000-4000-8000-000000000001'::uuid,
    '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid];
begin
  if operator_confirmed_target_and_storage_cleanup is distinct from true or org_a is null or org_b is null or org_a = org_b
    then raise exception 'STOP: explicit target/manifest/Storage-cleanup review required'; end if;
  -- Require exact persisted fixture identity; partial or modified state needs reconciliation.
  if (select count(*) from public.documents where
    (id = documents[1] and organization_id = org_a and file_name = 'security-synthetic-A1.pdf' and storage_path = org_a::text || '/' || documents[1]::text || '.pdf') or
    (id = documents[2] and organization_id = org_b and file_name = 'security-synthetic-B1.pdf' and storage_path = org_b::text || '/' || documents[2]::text || '.pdf') or
    (id = documents[3] and organization_id is null and file_name = 'security-synthetic-U1.pdf' and storage_path = org_a::text || '/' || documents[3]::text || '.pdf')) <> 3
    then raise exception 'STOP: document fixture identity changed'; end if;
  if exists(select 1 from storage.objects where bucket_id = 'documents' and name in
    (org_a::text || '/' || documents[1]::text || '.pdf', org_b::text || '/' || documents[2]::text || '.pdf',
      org_a::text || '/' || documents[3]::text || '.pdf'))
    then raise exception 'STOP: remove owned manifest objects via Storage API first'; end if;
  if (select count(*) from public.esg_extractions where (id, document_id) in
    (values (extractions[1], documents[1]), (extractions[2], documents[2]), (extractions[3], documents[3]))
    and schema_version = 'security-synthetic-v1' and provider = 'synthetic-no-api' and model = 'synthetic-no-model') <> 3
    or exists(select 1 from public.esg_extractions where document_id = any(documents) and not (id = any(extractions)))
    then raise exception 'STOP: extraction fixture/dependent rows changed'; end if;
  if (select count(*) from public.extracted_esg_fields where (id, extraction_id) in
    (values (fields[1], extractions[1]), (fields[2], extractions[2]), (fields[3], extractions[3]))
    and label = 'Synthetic security fixture only' and field_key = 'electricity_consumption' and status = 'not_found') <> 3
    or exists(select 1 from public.extracted_esg_fields where extraction_id = any(extractions) and not (id = any(fields)))
    then raise exception 'STOP: field fixture/dependent rows changed'; end if;
  -- Schema/trigger/inbound-FK review and private fixture receipts remain prerequisites.
  delete from public.extracted_esg_fields where id = any(fields);
  delete from public.esg_extractions where id = any(extractions);
  delete from public.documents where id = any(documents);
end;
$cleanup$;
-- No org, membership, user or Storage rows are deleted. COMMIT variant needs approval.
rollback;
