-- REVIEW ONLY. NOT EXECUTED. Isolated gkhrtrakukqdhgvucudv only, after separate approval.
-- NULL parameters/operator=false deliberately block accidental use. No credentials/users.
-- READ ONLY SQL simulations, NOT real authenticated sessions; no JWT/token inputs.
-- Requires already-approved public fixtures and 3 real synthetic Storage objects.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
do $manifest$
declare
  org_a uuid := null; org_b uuid := null;
  owner_a uuid := null; reviewer_a uuid := null; owner_b uuid := null;
  member_a uuid := null; suspended_a uuid := null; outsider uuid := null;
  operator_confirmed_synthetic_target boolean := false;
  fixture jsonb;
begin
  if current_user <> 'postgres' then raise exception 'STOP: intended existing executor required'; end if;
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
  if (select count(*) from public.documents where
    (id = '70170000-0000-4000-8000-000000000001' and organization_id = org_a and storage_path = org_a::text || '/70170000-0000-4000-8000-000000000001.pdf') or
    (id = '70170000-0000-4000-8000-000000000002' and organization_id = org_b and storage_path = org_b::text || '/70170000-0000-4000-8000-000000000002.pdf') or
    (id = '70170000-0000-4000-8000-000000000003' and organization_id is null and storage_path = org_a::text || '/70170000-0000-4000-8000-000000000003.pdf')) <> 3
    then raise exception 'STOP: positive/unowned parent fixtures missing or changed'; end if;
  if (select count(*) from public.esg_extractions where (id, document_id) in
    (values ('71170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000001'::uuid), ('71170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000002'::uuid), ('71170000-0000-4000-8000-000000000003'::uuid, '70170000-0000-4000-8000-000000000003'::uuid))) <> 3
    or (select count(*) from public.extracted_esg_fields where (id, extraction_id) in
    (values ('72170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000001'::uuid), ('72170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000002'::uuid), ('72170000-0000-4000-8000-000000000003'::uuid, '71170000-0000-4000-8000-000000000003'::uuid))) <> 3
    then raise exception 'STOP: positive child fixtures missing or changed'; end if;
  if (select count(*) from storage.objects where bucket_id = 'documents' and name in
    (org_a::text || '/70170000-0000-4000-8000-000000000001.pdf', org_b::text || '/70170000-0000-4000-8000-000000000002.pdf', org_a::text || '/70170000-0000-4000-8000-000000000003.pdf')) <> 3
    then raise exception 'STOP: Storage positive/unowned fixtures missing; absence is not denial'; end if;
  fixture := jsonb_build_object('org_a', org_a, 'org_b', org_b, 'owner_a', owner_a, 'reviewer_a', reviewer_a,
    'owner_b', owner_b, 'member_a', member_a, 'suspended_a', suspended_a, 'outsider', outsider);
  perform set_config('envario_security.fixture', fixture::text, true);
end;
$manifest$;

-- Persona anonymous; claims are test simulations only.
do $claims$
declare f jsonb := current_setting('envario_security.fixture')::jsonb; u text;
begin
  u := null::text;
  perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claims', (jsonb_build_object('role', 'anon') || case when u is null then '{}'::jsonb else jsonb_build_object('sub', u) end)::text, true);
  perform set_config('envario_security.expected_user', coalesce(u, ''), true);
end;
$claims$;
set local role anon;
select 'anonymous'::text as principal, 'verified_simulation_context'::text as check_name,
  case when current_user = 'anon' and not r.rolsuper and not r.rolbypassrls
    and auth.uid() is not distinct from nullif(current_setting('envario_security.expected_user'), '')::uuid then 'PASS' else 'FAIL' end as result
from pg_catalog.pg_roles r where r.rolname = current_user;
select 'anonymous'::text as principal, 'no_public_select_privileges'::text as check_name,
  case when bool_and(not pg_catalog.has_table_privilege(current_user, t.name, 'SELECT')
    and not pg_catalog.has_any_column_privilege(current_user, t.name, 'SELECT')) then 'PASS' else 'FAIL' end as result
from (values ('public.documents'), ('public.organizations'), ('public.organization_memberships'),
  ('public.esg_extractions'), ('public.extracted_esg_fields')) t(name);
select 'anonymous'::text as principal, 'direct_storage_rows'::text as check_name,
  case when coalesce((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000003.pdf')), array[]::text[]) = array[]::text[]
    then 'PASS' else 'FAIL' end as result;
reset role;

-- Persona owner_a; claims are test simulations only.
do $claims$
declare f jsonb := current_setting('envario_security.fixture')::jsonb; u text;
begin
  u := f->>'owner_a';
  perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', (jsonb_build_object('role', 'authenticated') || case when u is null then '{}'::jsonb else jsonb_build_object('sub', u) end)::text, true);
  perform set_config('envario_security.expected_user', coalesce(u, ''), true);
end;
$claims$;
set local role authenticated;
select 'owner_a'::text as principal, 'verified_simulation_context'::text as check_name,
  case when current_user = 'authenticated' and not r.rolsuper and not r.rolbypassrls
    and auth.uid() is not distinct from nullif(current_setting('envario_security.expected_user'), '')::uuid then 'PASS' else 'FAIL' end as result
from pg_catalog.pg_roles r where r.rolname = current_user;
select 'owner_a'::text as principal, v.check_name, case when v.ok is true then 'PASS' else 'FAIL' end as result
from (values
  ('exact_document_set', coalesce((select array_agg(id::text order by id::text) from public.documents where id = any(array['70170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['70170000-0000-4000-8000-000000000001']::text[]),
  ('parent_extraction_set', coalesce((select array_agg(id::text order by id::text) from public.esg_extractions where id = any(array['71170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['71170000-0000-4000-8000-000000000001']::text[]),
  ('parent_field_set', coalesce((select array_agg(id::text order by id::text) from public.extracted_esg_fields where id = any(array['72170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['72170000-0000-4000-8000-000000000001']::text[]),
  ('organization_metadata', coalesce((select array_agg(id::text order by id::text) from public.organizations where id in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid, (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[current_setting('envario_security.fixture')::jsonb->>'org_a']::text[]),
  ('self_only_membership', coalesce((select array_agg(user_id::text || ':' || organization_id::text order by user_id::text || ':' || organization_id::text)
    from public.organization_memberships where organization_id in ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid,
      (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[current_setting('envario_security.expected_user') || ':' || (current_setting('envario_security.fixture')::jsonb->>'org_a')]::text[])
) v(check_name, ok);
select 'owner_a'::text as principal, 'direct_storage_rows'::text as check_name,
  case when coalesce((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000003.pdf')), array[]::text[]) = array[(current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf']::text[]
    then 'PASS' else 'FAIL' end as result;
reset role;

-- Persona reviewer_a; claims are test simulations only.
do $claims$
declare f jsonb := current_setting('envario_security.fixture')::jsonb; u text;
begin
  u := f->>'reviewer_a';
  perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', (jsonb_build_object('role', 'authenticated') || case when u is null then '{}'::jsonb else jsonb_build_object('sub', u) end)::text, true);
  perform set_config('envario_security.expected_user', coalesce(u, ''), true);
end;
$claims$;
set local role authenticated;
select 'reviewer_a'::text as principal, 'verified_simulation_context'::text as check_name,
  case when current_user = 'authenticated' and not r.rolsuper and not r.rolbypassrls
    and auth.uid() is not distinct from nullif(current_setting('envario_security.expected_user'), '')::uuid then 'PASS' else 'FAIL' end as result
from pg_catalog.pg_roles r where r.rolname = current_user;
select 'reviewer_a'::text as principal, v.check_name, case when v.ok is true then 'PASS' else 'FAIL' end as result
from (values
  ('exact_document_set', coalesce((select array_agg(id::text order by id::text) from public.documents where id = any(array['70170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['70170000-0000-4000-8000-000000000001']::text[]),
  ('parent_extraction_set', coalesce((select array_agg(id::text order by id::text) from public.esg_extractions where id = any(array['71170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['71170000-0000-4000-8000-000000000001']::text[]),
  ('parent_field_set', coalesce((select array_agg(id::text order by id::text) from public.extracted_esg_fields where id = any(array['72170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['72170000-0000-4000-8000-000000000001']::text[]),
  ('organization_metadata', coalesce((select array_agg(id::text order by id::text) from public.organizations where id in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid, (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[current_setting('envario_security.fixture')::jsonb->>'org_a']::text[]),
  ('self_only_membership', coalesce((select array_agg(user_id::text || ':' || organization_id::text order by user_id::text || ':' || organization_id::text)
    from public.organization_memberships where organization_id in ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid,
      (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[current_setting('envario_security.expected_user') || ':' || (current_setting('envario_security.fixture')::jsonb->>'org_a')]::text[])
) v(check_name, ok);
select 'reviewer_a'::text as principal, 'direct_storage_rows'::text as check_name,
  case when coalesce((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000003.pdf')), array[]::text[]) = array[(current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf']::text[]
    then 'PASS' else 'FAIL' end as result;
reset role;

-- Persona owner_b; claims are test simulations only.
do $claims$
declare f jsonb := current_setting('envario_security.fixture')::jsonb; u text;
begin
  u := f->>'owner_b';
  perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', (jsonb_build_object('role', 'authenticated') || case when u is null then '{}'::jsonb else jsonb_build_object('sub', u) end)::text, true);
  perform set_config('envario_security.expected_user', coalesce(u, ''), true);
end;
$claims$;
set local role authenticated;
select 'owner_b'::text as principal, 'verified_simulation_context'::text as check_name,
  case when current_user = 'authenticated' and not r.rolsuper and not r.rolbypassrls
    and auth.uid() is not distinct from nullif(current_setting('envario_security.expected_user'), '')::uuid then 'PASS' else 'FAIL' end as result
from pg_catalog.pg_roles r where r.rolname = current_user;
select 'owner_b'::text as principal, v.check_name, case when v.ok is true then 'PASS' else 'FAIL' end as result
from (values
  ('exact_document_set', coalesce((select array_agg(id::text order by id::text) from public.documents where id = any(array['70170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['70170000-0000-4000-8000-000000000002']::text[]),
  ('parent_extraction_set', coalesce((select array_agg(id::text order by id::text) from public.esg_extractions where id = any(array['71170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['71170000-0000-4000-8000-000000000002']::text[]),
  ('parent_field_set', coalesce((select array_agg(id::text order by id::text) from public.extracted_esg_fields where id = any(array['72170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array['72170000-0000-4000-8000-000000000002']::text[]),
  ('organization_metadata', coalesce((select array_agg(id::text order by id::text) from public.organizations where id in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid, (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[current_setting('envario_security.fixture')::jsonb->>'org_b']::text[]),
  ('self_only_membership', coalesce((select array_agg(user_id::text || ':' || organization_id::text order by user_id::text || ':' || organization_id::text)
    from public.organization_memberships where organization_id in ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid,
      (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[current_setting('envario_security.expected_user') || ':' || (current_setting('envario_security.fixture')::jsonb->>'org_b')]::text[])
) v(check_name, ok);
select 'owner_b'::text as principal, 'direct_storage_rows'::text as check_name,
  case when coalesce((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000003.pdf')), array[]::text[]) = array[(current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf']::text[]
    then 'PASS' else 'FAIL' end as result;
reset role;

-- Persona active_member; claims are test simulations only.
do $claims$
declare f jsonb := current_setting('envario_security.fixture')::jsonb; u text;
begin
  u := f->>'member_a';
  perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', (jsonb_build_object('role', 'authenticated') || case when u is null then '{}'::jsonb else jsonb_build_object('sub', u) end)::text, true);
  perform set_config('envario_security.expected_user', coalesce(u, ''), true);
end;
$claims$;
set local role authenticated;
select 'active_member'::text as principal, 'verified_simulation_context'::text as check_name,
  case when current_user = 'authenticated' and not r.rolsuper and not r.rolbypassrls
    and auth.uid() is not distinct from nullif(current_setting('envario_security.expected_user'), '')::uuid then 'PASS' else 'FAIL' end as result
from pg_catalog.pg_roles r where r.rolname = current_user;
select 'active_member'::text as principal, v.check_name, case when v.ok is true then 'PASS' else 'FAIL' end as result
from (values
  ('exact_document_set', coalesce((select array_agg(id::text order by id::text) from public.documents where id = any(array['70170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('parent_extraction_set', coalesce((select array_agg(id::text order by id::text) from public.esg_extractions where id = any(array['71170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('parent_field_set', coalesce((select array_agg(id::text order by id::text) from public.extracted_esg_fields where id = any(array['72170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('organization_metadata', coalesce((select array_agg(id::text order by id::text) from public.organizations where id in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid, (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[]::text[]),
  ('self_only_membership', coalesce((select array_agg(user_id::text || ':' || organization_id::text order by user_id::text || ':' || organization_id::text)
    from public.organization_memberships where organization_id in ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid,
      (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[]::text[])
) v(check_name, ok);
select 'active_member'::text as principal, 'direct_storage_rows'::text as check_name,
  case when coalesce((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000003.pdf')), array[]::text[]) = array[]::text[]
    then 'PASS' else 'FAIL' end as result;
reset role;

-- Persona suspended_member; claims are test simulations only.
do $claims$
declare f jsonb := current_setting('envario_security.fixture')::jsonb; u text;
begin
  u := f->>'suspended_a';
  perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', (jsonb_build_object('role', 'authenticated') || case when u is null then '{}'::jsonb else jsonb_build_object('sub', u) end)::text, true);
  perform set_config('envario_security.expected_user', coalesce(u, ''), true);
end;
$claims$;
set local role authenticated;
select 'suspended_member'::text as principal, 'verified_simulation_context'::text as check_name,
  case when current_user = 'authenticated' and not r.rolsuper and not r.rolbypassrls
    and auth.uid() is not distinct from nullif(current_setting('envario_security.expected_user'), '')::uuid then 'PASS' else 'FAIL' end as result
from pg_catalog.pg_roles r where r.rolname = current_user;
select 'suspended_member'::text as principal, v.check_name, case when v.ok is true then 'PASS' else 'FAIL' end as result
from (values
  ('exact_document_set', coalesce((select array_agg(id::text order by id::text) from public.documents where id = any(array['70170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('parent_extraction_set', coalesce((select array_agg(id::text order by id::text) from public.esg_extractions where id = any(array['71170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('parent_field_set', coalesce((select array_agg(id::text order by id::text) from public.extracted_esg_fields where id = any(array['72170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('organization_metadata', coalesce((select array_agg(id::text order by id::text) from public.organizations where id in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid, (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[]::text[]),
  ('self_only_membership', coalesce((select array_agg(user_id::text || ':' || organization_id::text order by user_id::text || ':' || organization_id::text)
    from public.organization_memberships where organization_id in ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid,
      (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[]::text[])
) v(check_name, ok);
select 'suspended_member'::text as principal, 'direct_storage_rows'::text as check_name,
  case when coalesce((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000003.pdf')), array[]::text[]) = array[]::text[]
    then 'PASS' else 'FAIL' end as result;
reset role;

-- Persona outsider; claims are test simulations only.
do $claims$
declare f jsonb := current_setting('envario_security.fixture')::jsonb; u text;
begin
  u := f->>'outsider';
  perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', (jsonb_build_object('role', 'authenticated') || case when u is null then '{}'::jsonb else jsonb_build_object('sub', u) end)::text, true);
  perform set_config('envario_security.expected_user', coalesce(u, ''), true);
end;
$claims$;
set local role authenticated;
select 'outsider'::text as principal, 'verified_simulation_context'::text as check_name,
  case when current_user = 'authenticated' and not r.rolsuper and not r.rolbypassrls
    and auth.uid() is not distinct from nullif(current_setting('envario_security.expected_user'), '')::uuid then 'PASS' else 'FAIL' end as result
from pg_catalog.pg_roles r where r.rolname = current_user;
select 'outsider'::text as principal, v.check_name, case when v.ok is true then 'PASS' else 'FAIL' end as result
from (values
  ('exact_document_set', coalesce((select array_agg(id::text order by id::text) from public.documents where id = any(array['70170000-0000-4000-8000-000000000001'::uuid, '70170000-0000-4000-8000-000000000002'::uuid, '70170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('parent_extraction_set', coalesce((select array_agg(id::text order by id::text) from public.esg_extractions where id = any(array['71170000-0000-4000-8000-000000000001'::uuid, '71170000-0000-4000-8000-000000000002'::uuid, '71170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('parent_field_set', coalesce((select array_agg(id::text order by id::text) from public.extracted_esg_fields where id = any(array['72170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000003'::uuid])), array[]::text[]) = array[]::text[]),
  ('organization_metadata', coalesce((select array_agg(id::text order by id::text) from public.organizations where id in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid, (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[]::text[]),
  ('self_only_membership', coalesce((select array_agg(user_id::text || ':' || organization_id::text order by user_id::text || ':' || organization_id::text)
    from public.organization_memberships where organization_id in ((current_setting('envario_security.fixture')::jsonb->>'org_a')::uuid,
      (current_setting('envario_security.fixture')::jsonb->>'org_b')::uuid)), array[]::text[])
    = array[]::text[])
) v(check_name, ok);
select 'outsider'::text as principal, 'direct_storage_rows'::text as check_name,
  case when coalesce((select array_agg(name order by name) from storage.objects where bucket_id = 'documents' and name in
    ((current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000001.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_b') || '/70170000-0000-4000-8000-000000000002.pdf',
     (current_setting('envario_security.fixture')::jsonb->>'org_a') || '/70170000-0000-4000-8000-000000000003.pdf')), array[]::text[]) = array[]::text[]
    then 'PASS' else 'FAIL' end as result;
reset role;

rollback;
