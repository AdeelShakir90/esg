-- READ ONLY / NOT EXECUTED. ONLY envario-security-test / gkhrtrakukqdhgvucudv.
-- Source: STEP-7R13-CURRENT-STATE-REFERENCE.json, supplied Step 7R.10 observations.
-- CURRENT-STATE reference, NOT proven historical SQL and NOT execution approval.
-- Run the entire file as the intended postgres executor; export the single grid.
-- No customer rows, object paths, credentials, claims, helper bodies or policy
-- literals are output. Only catalogs/configuration and bucket metadata are read.
-- Supautils configuration is inspected, never set/loaded/installed. An unexpected
-- malformed registered JSON setting aborts; stop instead of attempting repairs.
-- FAIL = drift/blocker; REVIEW = unresolved evidence/manual approval; a comparison
-- PASS never adopts a baseline or authorizes DDL. Missing helper body fingerprints
-- remain REVIEW even if owner/signature/configuration match.
-- Expression matching preserves every token/literal/identifier/operator and token
-- boundary, ignoring ONLY whitespace between tokens (e.g. export line wrapping).
-- No case folding, literal trimming, alias rewriting or Boolean simplification.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
with
baseline as (
  select * from pg_catalog.jsonb_to_recordset($snapshots$
[
  {
    "relation_name": "public.documents",
    "policy_name": "documents_select_active_member",
    "using_sql": "((organization_id IS NOT NULL) AND public.is_active_organization_member(organization_id))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true
  },
  {
    "relation_name": "public.esg_extractions",
    "policy_name": "esg_extractions_select_active_member",
    "using_sql": "(EXISTS ( SELECT 1 FROM public.documents document WHERE ((document.id = esg_extractions.document_id) AND (document.organization_id IS NOT NULL) AND public.is_active_organization_member(document.organization_id))))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true
  },
  {
    "relation_name": "public.extracted_esg_fields",
    "policy_name": "extracted_esg_fields_select_active_member",
    "using_sql": "(EXISTS ( SELECT 1 FROM (public.esg_extractions extraction JOIN public.documents document ON ((document.id = extraction.document_id))) WHERE ((extraction.id = extracted_esg_fields.extraction_id) AND (document.organization_id IS NOT NULL) AND public.is_active_organization_member(document.organization_id))))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true
  },
  {
    "relation_name": "public.organization_memberships",
    "policy_name": "memberships_select_same_organization",
    "using_sql": "((user_id = auth.uid()) OR public.has_active_organization_role(organization_id, ARRAY['owner'::text, 'admin'::text]))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true
  },
  {
    "relation_name": "public.organizations",
    "policy_name": "organizations_select_active_member",
    "using_sql": "public.is_active_organization_member(id)",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true
  },
  {
    "relation_name": "storage.objects",
    "policy_name": "storage_documents_select_active_member",
    "using_sql": "((bucket_id = 'documents'::text) AND public.is_active_organization_member(public.document_storage_organization_id(name)))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true
  }
]
$snapshots$::jsonb) as b(relation_name text, policy_name text, using_sql text,
  with_check_sql text, roles text[], command text, permissive boolean)
),
executor as (select oid, rolname, rolsuper from pg_catalog.pg_roles where rolname = current_user),
roles as (
  select e.role_name, r.oid, r.rolsuper, r.rolbypassrls
  from (values ('authenticated'), ('anon'), ('postgres')) e(role_name)
  left join pg_catalog.pg_roles r on r.rolname = e.role_name
),
tables as (
  select b.*, c.oid as table_oid, c.relowner, c.relkind, c.relrowsecurity, c.relforcerowsecurity
  from baseline b left join pg_catalog.pg_class c on c.oid = pg_catalog.to_regclass(b.relation_name)
),
paired as (
  select t.*, p.oid as policy_oid, p.polcmd, p.polpermissive,
    pg_catalog.pg_get_expr(p.polqual, p.polrelid) as actual_using,
    pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) as actual_check,
    array(select case when role_oid = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(role_oid) end
      from pg_catalog.unnest(p.polroles) pr(role_oid) order by 1) as actual_roles,
    array(select role_name from pg_catalog.unnest(t.roles) pr(role_name) order by 1) as expected_roles
  from tables t left join pg_catalog.pg_policy p
    on p.polrelid = t.table_oid and p.polname = t.policy_name
),
expression_inputs as (
  select p.relation_name, p.policy_name, v.expression_kind, v.source_kind, v.expression
  from paired p cross join lateral (values
    ('using', 'expected', p.using_sql), ('using', 'actual', p.actual_using),
    ('check', 'expected', p.with_check_sql), ('check', 'actual', p.actual_check)
  ) v(expression_kind, source_kind, expression)
),
tokenized as (
  select i.*, case when i.expression is null then null::text[] else array(
    select m.parts[1] from pg_catalog.regexp_matches(i.expression,
      $lex$'(?:[^']|'')*'|"(?:[^"]|"")*"|::|[A-Za-z_][A-Za-z_0-9$]*|[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|[-+*/<>=~!@#%^&|`?]+|[^[:space:]]$lex$,
      'g') with ordinality as m(parts, token_no) order by m.token_no
  ) end as tokens from expression_inputs i
),
comparisons as (
  select p.*,
    p.actual_using is not distinct from p.using_sql as using_raw_equal,
    au.tokens is not distinct from eu.tokens as using_tokens_equal,
    p.actual_check is not distinct from p.with_check_sql as check_raw_equal,
    ac.tokens is not distinct from ec.tokens as check_tokens_equal,
    p.actual_roles is not distinct from p.expected_roles as roles_equal,
    p.polcmd::text is not distinct from p.command as command_equal,
    p.polpermissive is not distinct from p.permissive as mode_equal
  from paired p
  join tokenized eu on eu.relation_name = p.relation_name and eu.policy_name = p.policy_name and eu.expression_kind = 'using' and eu.source_kind = 'expected'
  join tokenized au on au.relation_name = p.relation_name and au.policy_name = p.policy_name and au.expression_kind = 'using' and au.source_kind = 'actual'
  join tokenized ec on ec.relation_name = p.relation_name and ec.policy_name = p.policy_name and ec.expression_kind = 'check' and ec.source_kind = 'expected'
  join tokenized ac on ac.relation_name = p.relation_name and ac.policy_name = p.policy_name and ac.expression_kind = 'check' and ac.source_kind = 'actual'
),
configuration as (
  select (select setting from pg_catalog.pg_settings where name = 'supautils.policy_grants') as value,
    exists(select 1 from pg_catalog.pg_settings where name = 'supautils.policy_grants') as registered,
    pg_catalog.current_setting('server_version_num')::integer as version_num
),
platform as (
  select c.*, case when c.registered and nullif(btrim(c.value), '') is not null
    then c.value::jsonb else null end as policy_grants from configuration c
),
helpers as (
  select e.*, p.oid, p.proowner, p.prokind, p.prosecdef, p.provolatile, p.prorettype,
    paths.setting_count, paths.path_value
  from (values
    ('public.is_active_organization_member(uuid)', true, 's', 'boolean', null::text),
    ('public.has_active_organization_role(uuid,text[])', true, 's', 'boolean', null::text),
    ('public.document_storage_organization_id(text)', false, 'i', 'uuid', null::text)
  ) e(signature, expected_definer, expected_volatility, expected_return, expected_body_md5)
  left join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(e.signature)
  left join lateral (
    select count(*) as setting_count,
      min(pg_catalog.substr(setting, pg_catalog.strpos(setting, '=') + 1)) as path_value
    from pg_catalog.unnest(p.proconfig) cfg(setting)
    where pg_catalog.split_part(setting, '=', 1) = 'search_path'
  ) paths on true
),
required_columns(relation_name, column_name, expected_type) as (values
  ('public.documents', 'id', 'uuid'), ('public.documents', 'organization_id', 'uuid'),
  ('public.documents', 'storage_path', 'text'), ('public.organizations', 'id', 'uuid'),
  ('public.organization_memberships', 'user_id', 'uuid'), ('public.organization_memberships', 'organization_id', 'uuid'),
  ('public.organization_memberships', 'role', '[text or enum]'), ('public.organization_memberships', 'status', '[text or enum]'),
  ('public.esg_extractions', 'id', 'uuid'), ('public.esg_extractions', 'document_id', 'uuid'),
  ('public.extracted_esg_fields', 'extraction_id', 'uuid')
),
report(category, object_name, check_name, result, details) as (
  select 'scope'::text, 'envario-security-test'::text, 'reference_and_execution_approval'::text, 'REVIEW'::text,
    jsonb_build_object('project_ref', 'gkhrtrakukqdhgvucudv',
      'reference', 'User-supplied exact Step 7R.10 CURRENT observations received in Step 7R.13',
      'historical_provenance_verified', false, 'execution_approved', false,
      'reason', 'Verify target and local migration hash manually. A drift PASS is not baseline adoption or execution approval.')
  union all
  select 'baseline', relation_name || '.' || policy_name, 'exact_policy_snapshot_comparison',
    case when policy_oid is not null and using_tokens_equal and check_tokens_equal and roles_equal and command_equal and mode_equal then 'PASS' else 'FAIL' end,
    jsonb_build_object('policy_exists', policy_oid is not null,
      'using_raw_text_equal', using_raw_equal, 'using_tokens_equal', using_tokens_equal,
      'with_check_raw_equal', check_raw_equal, 'with_check_tokens_equal', check_tokens_equal,
      'roles_equal', roles_equal, 'actual_roles', actual_roles, 'expected_roles', expected_roles,
      'command_equal', command_equal, 'actual_command', polcmd, 'expected_command', command,
      'mode_equal', mode_equal, 'actual_permissive', polpermissive, 'expected_permissive', permissive,
      'actual_using_md5', md5(actual_using), 'reference_using_md5', md5(using_sql),
      'reason', 'Only inter-token whitespace is ignored. Literals, identifiers, aliases, operators and Boolean structure must match; NULL WITH CHECK is compared explicitly. No observed value is copied into the reference.')
  from comparisons
  union all
  select 'policies', t.relation_name || '.' || p.polname, 'overlapping_select_all',
    case when p.polpermissive and p.polname <> t.policy_name then 'FAIL' else 'REVIEW' end,
    jsonb_build_object('command', p.polcmd, 'permissive', p.polpermissive,
      'reason', 'Additional permissive SELECT/ALL is an execution blocker. Restrictive policies may deny further access and require review; policy names alone are not proof.')
  from tables t join pg_catalog.pg_policy p on p.polrelid = t.table_oid
  where p.polcmd in ('r', '*') and p.polname <> t.policy_name
  union all
  select 'platform', 'postgres:storage.objects', 'existing_supautils_policy_authority',
    case when e.rolname <> 'postgres' then 'FAIL'
      when c.policy_grants is null then 'REVIEW'
      when jsonb_typeof(c.policy_grants) = 'object' and jsonb_typeof(c.policy_grants -> 'postgres') = 'array'
        and (c.policy_grants -> 'postgres') @> '["storage.objects"]'::jsonb then 'PASS' else 'FAIL' end,
    jsonb_build_object('executor', e.rolname, 'registered', c.registered,
      'reason', 'Checks the existing role/table policy-DDL allowlist, not native table ownership or SET ROLE. No provider setting is changed and no DDL probe is performed.')
  from executor e cross join platform c
  union all
  select 'locks', t.relation_name, 'existing_access_exclusive_lock_rights',
    case when t.table_oid is null then 'FAIL'
      when e.rolsuper or pg_catalog.has_table_privilege(e.oid, t.table_oid, 'UPDATE,DELETE,TRUNCATE') then 'PASS'
      when c.version_num >= 170000 then case when pg_catalog.has_table_privilege(e.oid, t.table_oid, 'MAINTAIN') then 'PASS' else 'FAIL' end
      else 'FAIL' end,
    jsonb_build_object('reason', 'Independent of supautils policy DDL permission. Lock availability and contention remain maintenance-window checks; no lock is attempted.')
  from tables t cross join executor e cross join platform c
  union all
  select 'rls', relation_name, 'table_and_rls',
    case when table_oid is not null and relkind in ('r', 'p') and relrowsecurity then 'PASS' else 'FAIL' end,
    jsonb_build_object('exists', table_oid is not null, 'rls', relrowsecurity,
      'force_rls', relforcerowsecurity, 'owner', pg_catalog.pg_get_userbyid(relowner),
      'reason', 'All six policy targets must remain RLS-enabled tables.')
  from tables
  union all
  select 'grants', t.relation_name || '.' || r.role_name, 'unapplied_no_application_grants_baseline',
    case when t.table_oid is null or r.oid is null then 'FAIL'
      when pg_catalog.has_table_privilege(r.oid, t.table_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or pg_catalog.has_any_column_privilege(r.oid, t.table_oid, 'SELECT,INSERT,UPDATE,REFERENCES') then 'FAIL' else 'PASS' end,
    jsonb_build_object('reason', 'Before migration, no authenticated/anon application table or column access is expected. Detects SELECT and unexpected writes; no revocation or repair is performed.')
  from tables t cross join roles r
  where t.relation_name <> 'storage.objects' and r.role_name in ('authenticated', 'anon')
  union all
  select 'storage_grants', 'storage.objects.authenticated', 'existing_select',
    case when t.table_oid is not null and r.oid is not null and pg_catalog.has_table_privilege(r.oid, t.table_oid, 'SELECT') then 'PASS' else 'FAIL' end,
    jsonb_build_object('reason', 'Existing authenticated table-level Storage SELECT must satisfy the unchanged migration precondition. No Storage grant is added.')
  from tables t cross join roles r where t.relation_name = 'storage.objects' and r.role_name = 'authenticated'
  union all
  select 'authority', t.relation_name, 'public_table_owner_and_grant_authority',
    case when t.table_oid is null then 'FAIL'
      when e.rolsuper or pg_catalog.pg_has_role(e.oid, t.relowner, 'USAGE') then 'PASS' else 'FAIL' end,
    jsonb_build_object('reason', 'Public policy DDL needs usable ownership; that supplies grant authority. Storage uses the separate documented platform capability.')
  from tables t cross join executor e where t.relation_name <> 'storage.objects'
  union all
  select 'roles', r.role_name, 'no_application_bypass_or_owner_membership',
    case when r.oid is null or r.rolsuper or r.rolbypassrls then 'FAIL'
      when exists(select 1 from tables t where t.relowner is not null and pg_catalog.pg_has_role(r.oid, t.relowner, 'MEMBER')) then 'FAIL'
      when exists(select 1 from roles p where p.role_name = 'postgres' and p.oid is not null and pg_catalog.pg_has_role(r.oid, p.oid, 'MEMBER')) then 'FAIL'
      when r.role_name = 'anon' and exists(select 1 from roles a where a.role_name = 'authenticated' and a.oid is not null and pg_catalog.pg_has_role(r.oid, a.oid, 'MEMBER')) then 'FAIL'
      else 'PASS' end,
    jsonb_build_object('reason', 'Rejects superuser/BYPASSRLS and inherited/obtainable owner role paths; anon must not inherit future authenticated grants.')
  from roles r where r.role_name in ('authenticated', 'anon')
  union all
  select 'helpers', h.signature, 'reviewed_owner_signature_path_execute',
    case when h.oid is null or p.oid is null or a.oid is null
      or h.proowner is distinct from p.oid or h.prokind is distinct from 'f'
      or h.prosecdef is distinct from h.expected_definer or h.provolatile::text is distinct from h.expected_volatility
      or pg_catalog.format_type(h.prorettype, null) is distinct from h.expected_return
      or h.setting_count <> 1
      or coalesce(pg_catalog.regexp_replace(h.path_value, '^[[:space:]]+|[[:space:]]+$', '', 'g') in ('', '""'), false) is distinct from true
      or pg_catalog.has_function_privilege(a.oid, h.oid, 'EXECUTE') is distinct from true then 'FAIL' else 'PASS' end,
    jsonb_build_object('owner', pg_catalog.pg_get_userbyid(h.proowner),
      'reason', 'Checks known reviewed structural settings and authenticated EXECUTE; function bodies are not invoked.')
  from helpers h cross join roles p cross join roles a where p.role_name = 'postgres' and a.role_name = 'authenticated'
  union all
  select 'helpers', h.signature, 'exact_body_drift',
    case when h.oid is null then 'FAIL' when h.expected_body_md5 is null then 'REVIEW'
      when h.expected_body_md5 = md5(pg_catalog.pg_get_functiondef(h.oid)) then 'PASS' else 'FAIL' end,
    jsonb_build_object('actual_body_md5', md5(pg_catalog.pg_get_functiondef(h.oid)),
      'expected_body_md5', h.expected_body_md5,
      'reason', 'No exact reviewed helper body fingerprint was supplied. Owner/path/signature equality alone does not prove unchanged helper semantics. Compare with reviewed helper evidence; do not auto-adopt the observed hash.')
  from helpers h
  union all
  select 'helpers', 'postgres', 'nonrecursive_membership_lookup',
    case when t.table_oid is not null and r.oid is not null and
      (r.rolsuper or r.rolbypassrls or (t.relowner = r.oid and not t.relforcerowsecurity)) then 'PASS' else 'FAIL' end,
    jsonb_build_object('reason', 'Retained definer helpers must query membership rows without recursively entering membership RLS.')
  from tables t cross join roles r where t.relation_name = 'public.organization_memberships' and r.role_name = 'postgres'
  union all
  select 'schema', e.relation_name || '.' || e.column_name, 'required_policy_column',
    case when a.attnum is null then 'FAIL'
      when pg_catalog.format_type(a.atttypid, a.atttypmod) = e.expected_type then 'PASS'
      when e.expected_type = '[text or enum]' and (a.atttypid = 'text'::regtype or ty.typtype = 'e') then 'PASS' else 'REVIEW' end,
    jsonb_build_object('actual_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'expected_type', e.expected_type, 'reason', 'Schema contract check, not a complete historical schema fingerprint; created_by is not assumed.')
  from required_columns e left join pg_catalog.pg_attribute a on a.attrelid = pg_catalog.to_regclass(e.relation_name)
    and a.attname = e.column_name and a.attnum > 0 and not a.attisdropped
  left join pg_catalog.pg_type ty on ty.oid = a.atttypid
  union all
  select 'schema', 'public.organization_memberships', 'unique_user_organization_key',
    case when exists (
      select 1 from pg_catalog.pg_index i
      where i.indrelid = pg_catalog.to_regclass('public.organization_memberships')
        and i.indisunique and i.indisvalid and i.indisready
        and i.indpred is null and i.indexprs is null and i.indnkeyatts = 2
        and array(select a.attname::text
          from pg_catalog.unnest(i.indkey::smallint[]) with ordinality k(attnum, key_no)
          join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
          where k.key_no <= i.indnkeyatts order by a.attname)
          = array['organization_id', 'user_id']::text[]
    ) then 'PASS' else 'FAIL' end,
    jsonb_build_object('reason', 'An unconditional valid unique membership key prevents contradictory duplicate memberships, matching the offline contract. No membership rows are queried or repaired.')
  union all
  select 'schema', 'executor.' || e.schema_name, 'required_schema_usage',
    case when n.oid is not null and pg_catalog.has_schema_privilege(r.oid, n.oid, 'USAGE') then 'PASS' else 'FAIL' end,
    jsonb_build_object('executor', r.rolname,
      'reason', 'The applying executor must resolve all policy tables/helpers; no schema grant is performed.')
  from (values ('public'), ('storage'), ('auth')) e(schema_name)
  left join pg_catalog.pg_namespace n on n.nspname = e.schema_name cross join executor r
  union all
  select 'schema', 'authenticated.' || e.schema_name, 'required_schema_usage',
    case when n.oid is not null and r.oid is not null and pg_catalog.has_schema_privilege(r.oid, n.oid, 'USAGE') then 'PASS' else 'FAIL' end,
    jsonb_build_object('reason', 'Required for table reads and the direct auth.uid() membership check; no schema grant is authorized.')
  from (values ('public'), ('storage'), ('auth')) e(schema_name)
  left join pg_catalog.pg_namespace n on n.nspname = e.schema_name
  cross join roles r where r.role_name = 'authenticated'
  union all
  select 'schema', 'auth.uid()', 'authenticated_identity_helper_execute',
    case when p.oid is not null and r.oid is not null and p.prorettype = 'uuid'::regtype
      and pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') then 'PASS' else 'FAIL' end,
    jsonb_build_object('reason', 'Catalog access check only; no identity function or JWT value is evaluated.')
  from roles r left join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure('auth.uid()')
  where r.role_name = 'authenticated'
  union all
  select 'storage', 'documents', 'private_pdf_only_5mb',
    case when b.id is not null and b.public is false
      and to_jsonb(b)->>'file_size_limit' = '5242880'
      and to_jsonb(b)->'allowed_mime_types' = '["application/pdf"]'::jsonb then 'PASS' else 'FAIL' end,
    jsonb_build_object('reason', 'Only bucket configuration is inspected. No Storage object rows or paths are read.')
  from (values ('documents')) e(id) left join storage.buckets b on b.id = e.id
  union all
  select 'approval', 'execution_checklist', 'manual_checkpoint', 'REVIEW',
    jsonb_build_object('reason', 'Resolve FAIL/REVIEW; approve the CURRENT reference, exact migration hash, maintenance window and postflight/rollback scope separately. No mutation or gate enablement follows from this report.')
)
select category, object_name, check_name, result, details
from report order by category, object_name, check_name, details::text;
rollback;
