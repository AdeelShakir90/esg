-- READ ONLY. Not executed. Manually verify the dashboard project ref first:
-- envario-security-test / gkhrtrakukqdhgvucudv. Do not run on production.
-- Outputs schema metadata and aggregate counts, never emails/source text/keys.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';

-- RLS flags, owners and raw ACLs, including any unexpected views.
select n.nspname, c.relname, c.relkind, pg_catalog.pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity, c.relforcerowsecurity, c.relacl, c.reloptions
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm'))
   or (n.nspname = 'storage' and c.relname in ('objects', 'buckets'))
order by 1, 2;

-- All policies: inspect command, TO roles, OR-combined permissive policies,
-- restrictive policies, null handling and parent joins. Names are not proof.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- Exact helper identity/security metadata and code fingerprints.
-- Definitions are intentionally not printed: review previously supplied bodies
-- privately and compare these fingerprints to a recorded review snapshot.
select p.oid::regprocedure as signature,
       pg_catalog.pg_get_userbyid(p.proowner) as owner,
       p.prosecdef, p.provolatile,
       pg_catalog.pg_get_function_result(p.oid) as returns,
       array(select x from unnest(p.proconfig) x where x like 'search_path=%') as search_path_setting,
       p.proacl,
       md5(pg_catalog.pg_get_functiondef(p.oid)) as definition_fingerprint
from pg_catalog.pg_proc p
where p.oid in (
  pg_catalog.to_regprocedure('public.is_active_organization_member(uuid)'),
  pg_catalog.to_regprocedure('public.has_active_organization_role(uuid,text[])'),
  pg_catalog.to_regprocedure('public.document_storage_organization_id(text)')
)
order by 1;

-- Report missing helpers explicitly and assess the VALUE of the configured path.
-- Empty spelling checks also reject nonexistent named schemas: resolving to no
-- current schemas alone is insufficient. The migration additionally uses
-- transaction-local set_config/current_schemas(false) to verify resolution.
with expected(signature) as (values
  ('public.is_active_organization_member(uuid)'),
  ('public.has_active_organization_role(uuid,text[])'),
  ('public.document_storage_organization_id(text)')
), configured as (
  select e.signature, p.oid,
         count(s.setting) as search_path_setting_count,
         min(pg_catalog.substr(s.setting, pg_catalog.strpos(s.setting, '=') + 1)) as configured_value
  from expected e
  left join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(e.signature)
  left join lateral (
    select setting from pg_catalog.unnest(p.proconfig) as settings(setting)
    where pg_catalog.split_part(setting, '=', 1) = 'search_path'
  ) s on true
  group by e.signature, p.oid
)
select signature, oid is not null as helper_exists,
       search_path_setting_count, configured_value,
       coalesce(search_path_setting_count = 1 and
         pg_catalog.regexp_replace(configured_value, '^[[:space:]]+|[[:space:]]+$', '', 'g')
         in ('', '""'), false) as explicitly_empty_configured_path
from configured order by signature;

-- Changing TO authenticated must not add a previously inapplicable role.
select n.nspname, c.relname, p.polname,
       exists (
         select 1 from pg_catalog.unnest(p.polroles) as roles(role_oid)
         where case when role_oid = 0 then true
           else pg_catalog.pg_has_role('authenticated'::regrole, role_oid, 'USAGE') end
       ) as already_applies_to_authenticated
from pg_catalog.pg_policy p
join pg_catalog.pg_class c on c.oid = p.polrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where p.polname in (
  'documents_select_active_member', 'esg_extractions_select_active_member',
  'extracted_esg_fields_select_active_member', 'storage_documents_select_active_member'
)
order by 1, 2, 3;

-- Effective EXECUTE grants include inherited/PUBLIC grants.
select r.rolname, p.oid::regprocedure as signature,
       pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
from pg_catalog.pg_roles r
cross join pg_catalog.pg_proc p
where r.rolname in ('anon', 'authenticated', 'service_role')
  and p.oid in (
    pg_catalog.to_regprocedure('public.is_active_organization_member(uuid)'),
    pg_catalog.to_regprocedure('public.has_active_organization_role(uuid,text[])'),
    pg_catalog.to_regprocedure('public.document_storage_organization_id(text)')
  )
order by 1, 2;

-- Effective table privileges, NOT only explicit information_schema grants.
select r.rolname, n.nspname, c.relname,
       pg_catalog.has_schema_privilege(r.oid, n.oid, 'USAGE') as schema_usage,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'SELECT') as can_select,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT') as can_insert,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'UPDATE') as can_update,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'DELETE') as can_delete,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'TRUNCATE') as can_truncate,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'REFERENCES') as can_reference,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'TRIGGER') as can_trigger
from pg_catalog.pg_roles r
cross join pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where r.rolname in ('anon', 'authenticated', 'service_role')
  and c.relkind in ('r', 'p', 'v', 'm')
  and (n.nspname = 'public' or (n.nspname = 'storage' and c.relname in ('objects', 'buckets')))
order by 1, 2, 3;

-- Column-only grants can matter even where table-level privileges are absent.
select r.rolname, n.nspname, c.relname, a.attname, a.attacl,
       pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT') as can_select,
       pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT') as can_insert,
       pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE') as can_update
from pg_catalog.pg_attribute a
join pg_catalog.pg_class c on c.oid = a.attrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
cross join pg_catalog.pg_roles r
where a.attnum > 0 and not a.attisdropped
  and r.rolname in ('anon', 'authenticated')
  and ((n.nspname = 'public' and c.relname in (
    'documents', 'organizations', 'organization_memberships', 'esg_extractions', 'extracted_esg_fields'
  )) or (n.nspname = 'storage' and c.relname = 'objects'))
order by 1, 2, 3, a.attnum;

select rolname, rolsuper, rolbypassrls, rolinherit
from pg_catalog.pg_roles
where rolname in ('anon', 'authenticated', 'service_role')
   or oid in (select proowner from pg_catalog.pg_proc where oid in (
      pg_catalog.to_regprocedure('public.is_active_organization_member(uuid)'),
      pg_catalog.to_regprocedure('public.has_active_organization_role(uuid,text[])')
   ));

select parent.rolname as granted_role, child.rolname as member_role, m.admin_option
from pg_catalog.pg_auth_members m
join pg_catalog.pg_roles parent on parent.oid = m.roleid
join pg_catalog.pg_roles child on child.oid = m.member
order by 1, 2;

select nspname, nspacl
from pg_catalog.pg_namespace where nspname in ('public', 'private', 'storage');
select pg_catalog.pg_get_userbyid(d.defaclrole) as owner,
       n.nspname, d.defaclobjtype, d.defaclacl
from pg_catalog.pg_default_acl d
left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace;

-- Constraints, columns and indexes. No assumption that created_by exists.
select n.nspname, c.relname, k.conname, k.convalidated,
       pg_catalog.pg_get_constraintdef(k.oid) as definition
from pg_catalog.pg_constraint k
join pg_catalog.pg_class c on c.oid = k.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by 1, 2, 3;

select table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in (
 'documents', 'organizations', 'organization_memberships', 'esg_extractions', 'extracted_esg_fields'
)
order by table_name, ordinal_position;
select schemaname, tablename, indexname, indexdef
from pg_catalog.pg_indexes where schemaname = 'public'
order by tablename, indexname;

-- Detect trigger/view/RPC paths that may bypass otherwise-correct policies.
select n.nspname, c.relname, t.tgname, t.tgenabled,
       p.oid::regprocedure as function_signature
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal and n.nspname in ('public', 'storage', 'auth');
select n.nspname, p.oid::regprocedure as signature,
       pg_catalog.pg_get_userbyid(p.proowner) as owner,
       p.prosecdef, p.proacl,
       md5(pg_catalog.pg_get_functiondef(p.oid)) as definition_fingerprint
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') and p.prokind = 'f';

select id, name, public,
       to_jsonb(b)->>'file_size_limit' as file_size_limit,
       to_jsonb(b)->'allowed_mime_types' as allowed_mime_types
from storage.buckets b where id = 'documents';

-- Aggregate health checks; identifiers and object names are not returned.
select count(*) as documents,
       count(*) filter (where organization_id is null) as unowned_documents
from public.documents;
select count(*) as duplicate_membership_groups
from (select organization_id, user_id from public.organization_memberships
      group by organization_id, user_id having count(*) > 1) x;
select role, status, count(*) from public.organization_memberships group by role, status;
select count(*) as duplicate_storage_path_groups
from (select storage_path from public.documents
      group by storage_path having count(*) > 1) x;
select count(*) as objects,
       count(*) filter (where name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]pdf$') as noncanonical_objects,
       count(*) filter (where not exists (
         select 1 from public.documents d where d.storage_path = o.name
       )) as objects_without_document_metadata
from storage.objects o where bucket_id = 'documents';

-- Exact org AND document-id matching, without emitting paths or identifiers.
-- CASE (not AND alone) protects UUID casts against malformed names.
select count(*) as objects,
       count(*) filter (where case
         when o.name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]pdf$'
         then exists (
           select 1 from public.documents d
           where d.storage_path = o.name and d.organization_id is not null
             and d.organization_id = pg_catalog.split_part(o.name, '/', 1)::uuid
             and d.id = pg_catalog.split_part(pg_catalog.split_part(o.name, '/', 2), '.', 1)::uuid
         ) else false end
       ) as canonical_objects_matching_org_and_document
from storage.objects o where o.bucket_id = 'documents';

select pg_catalog.to_regclass('supabase_migrations.schema_migrations') is not null
       as migration_history_exists;
rollback;
