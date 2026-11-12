-- APPROVAL COPY: gkhrtrakukqdhgvucudv. Persistent fixture transaction after explicit approval.
-- Populate only the eight private UUIDs and the operator flag after the approved admission checks.
-- Payload: output/pdf/envario-rls-synthetic.pdf, 1638 bytes, SHA-256 113DF6E64181DCD497B469848BAC07108645B293734A195487C0D039B87F6E3A.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local search_path = pg_catalog;
do $fixtures$
declare
  org_a uuid := null; org_b uuid := null;
  owner_a uuid := null; reviewer_a uuid := null; owner_b uuid := null;
  member_a uuid := null; suspended_a uuid := null; outsider uuid := null;
  operator_confirmed_synthetic_target boolean := false;
  synthetic_pdf_bytes constant integer := 1638;
  inserted_rows integer;
begin
  if operator_confirmed_synthetic_target is distinct from true or org_a is null or org_b is null
    or owner_a is null or reviewer_a is null or owner_b is null or member_a is null or suspended_a is null or outsider is null
    or org_a = org_b then raise exception 'STOP: separately approved synthetic manifest and target confirmation required'; end if;
  if (select count(distinct x) from unnest(array[owner_a, reviewer_a, owner_b, member_a, suspended_a, outsider]) x) <> 6
    then raise exception 'STOP: personas must be distinct'; end if;
  if (select count(*) from public.organizations where id in (org_a, org_b)) <> 2
    then raise exception 'STOP: mapped organizations missing'; end if;
  if exists (
    select 1 from (values (org_a, owner_a, 'owner', 'active'), (org_a, reviewer_a, 'reviewer', 'active'),
      (org_b, owner_b, 'owner', 'active'), (org_a, member_a, 'member', 'active'), (org_a, suspended_a, 'member', 'suspended'))
      e(org_id, user_id, role_name, status_name)
    where (select count(*) from public.organization_memberships m where m.organization_id = e.org_id
      and m.user_id = e.user_id and m.role::text = e.role_name and m.status::text = e.status_name) <> 1
  ) then raise exception 'STOP: role/status fixture mismatch'; end if;
  if exists(select 1 from public.organization_memberships where user_id = outsider and organization_id in (org_a, org_b))
    then raise exception 'STOP: outsider is a member of a tested organization'; end if;
  -- No extra cross-memberships for these personas: would change the expected matrix.
  if (select count(*) from public.organization_memberships where organization_id in (org_a, org_b)
    and user_id = any(array[owner_a, reviewer_a, owner_b, member_a, suspended_a, outsider])) <> 5
    then raise exception 'STOP: unexpected additional persona membership'; end if;
  if synthetic_pdf_bytes is null or synthetic_pdf_bytes <= 0 or synthetic_pdf_bytes > 5242880
    then raise exception 'STOP: exact approved synthetic PDF byte count required'; end if;
  if exists(select 1 from public.documents where id = any(array['70170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid]))
    or exists(select 1 from public.esg_extractions where id = any(array['71170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid]))
    or exists(select 1 from public.extracted_esg_fields where id = any(array['72170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid]))
    then raise exception 'STOP: reserved fixture ID collision; never upsert or overwrite'; end if;
  if (select count(*) from auth.users where id = any(array[owner_a, reviewer_a, owner_b, member_a, suspended_a, outsider])) <> 6
    then raise exception 'STOP: mapped Auth users missing'; end if;
  if current_user <> 'postgres' or exists (
    select 1 from (values ('public.documents'), ('public.esg_extractions'),
      ('public.extracted_esg_fields'), ('storage.objects')) t(name)
    where pg_catalog.row_security_active(t.name::regclass)
  ) then raise exception 'STOP: full-visibility setup executor required'; end if;
  if exists (select 1 from public.documents)
    or exists (select 1 from public.esg_extractions)
    or exists (select 1 from public.extracted_esg_fields)
    or exists (select 1 from storage.objects where bucket_id = 'documents') then
    raise exception 'STOP: admission zero baseline changed';
  end if;
  insert into public.documents (id, organization_id, uploaded_by, file_name, storage_path, file_type, file_size, status)
  values ('70170000-0000-4000-8000-000000000001', org_a, owner_a, 'security-synthetic-A1.pdf', org_a::text || '/70170000-0000-4000-8000-000000000001.pdf', 'application/pdf', synthetic_pdf_bytes, 'uploaded'),
    ('70170000-0000-4000-8000-000000000002', org_b, owner_b, 'security-synthetic-B1.pdf', org_b::text || '/70170000-0000-4000-8000-000000000002.pdf', 'application/pdf', synthetic_pdf_bytes, 'uploaded'),
    ('70170000-0000-4000-8000-000000000003', null, null, 'security-synthetic-U1.pdf', org_a::text || '/70170000-0000-4000-8000-000000000003.pdf', 'application/pdf', synthetic_pdf_bytes, 'uploaded');
  get diagnostics inserted_rows = row_count;
  if inserted_rows <> 3 then raise exception 'STOP: expected three documents'; end if;
  insert into public.esg_extractions (id, document_id, status, schema_version, provider, model, prompt_version, completed_at)
  select x.extraction_id, x.document_id, 'completed', 'security-synthetic-v1', 'synthetic-no-api', 'synthetic-no-model', 'security-review-v1', now()
  from (values ('71170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000001'::uuid), ('71170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000002'::uuid), ('71170000-0000-4000-8000-000000000003'::uuid, '70170000-0000-4000-8000-000000000003'::uuid)) x(extraction_id, document_id);
  get diagnostics inserted_rows = row_count;
  if inserted_rows <> 3 then raise exception 'STOP: expected three extractions'; end if;
  insert into public.extracted_esg_fields (id, extraction_id, field_key, label, category, status)
  select x.field_id, x.extraction_id, 'electricity_consumption', 'Synthetic security fixture only', 'environmental', 'not_found'
  from (values ('72170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000001'::uuid), ('72170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000002'::uuid), ('72170000-0000-4000-8000-000000000003'::uuid, '71170000-0000-4000-8000-000000000003'::uuid)) x(field_id, extraction_id);
  get diagnostics inserted_rows = row_count;
  if inserted_rows <> 3 then raise exception 'STOP: expected three fields'; end if;
end;
$fixtures$;
-- No Storage table writes. Uploads/cleanup use separately approved Storage API operations.
commit;
