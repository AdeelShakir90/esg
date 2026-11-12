-- READ ONLY / NOT EXECUTED. Only envario-security-test / gkhrtrakukqdhgvucudv.
-- Run separately approved checks under the SAME SQL Editor connection/role
-- proposed for application. Do not infer SET ROLE authority from table SELECT,
-- role names, current_user alone, a service-role API key or UI availability.
-- No SET ROLE is attempted. No credentials, JWT settings or application rows read.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
with
execution_roles as (
  select 'session_user'::text as identity_kind, r.oid, r.rolname, r.rolsuper
  from pg_catalog.pg_roles r where r.rolname = session_user
  union all
  select 'current_user', r.oid, r.rolname, r.rolsuper from pg_catalog.pg_roles r where r.rolname = current_user
),
targets(role_name) as (values ('supabase_storage_admin'), ('postgres')),
target_roles as (
  select t.role_name, r.oid from targets t
  left join pg_catalog.pg_roles r on r.rolname = t.role_name
),
set_authority as (
  select e.identity_kind, e.oid as executor_oid, e.rolname, e.rolsuper,
         t.role_name, t.oid as target_oid,
         case when t.oid is null then false
           when pg_catalog.current_setting('server_version_num')::integer >= 160000
             then pg_catalog.pg_has_role(e.oid, t.oid, 'SET')
           else pg_catalog.pg_has_role(e.oid, t.oid, 'MEMBER') end as can_set_role
  from execution_roles e cross join target_roles t
),
relations as (
  select c.oid, c.relowner, c.relrowsecurity, c.relforcerowsecurity
  from pg_catalog.pg_class c where c.oid = pg_catalog.to_regclass('storage.objects')
),
report(category, object_name, check_name, result, details) as (
  select 'target'::text, 'envario-security-test'::text, 'manual_identity'::text, 'REVIEW'::text,
    jsonb_build_object('expected_ref', 'gkhrtrakukqdhgvucudv',
      'reason', 'Verify the project manually. This report neither connects to another project nor authorizes execution.')
  union all
  select 'executor', e.identity_kind, 'database_role', 'REVIEW',
    jsonb_build_object('role', e.rolname, 'superuser', e.rolsuper,
      'reason', 'SET ROLE permission is rooted in the session identity, which may differ from the current SQL Editor role.')
  from execution_roles e
  union all
  select 'ownership', 'storage.objects', 'actual_owner_and_rls',
    case when c.oid is not null and c.relowner = t.oid and c.relrowsecurity then 'PASS' else 'FAIL' end,
    jsonb_build_object('exists', c.oid is not null,
      'owner', pg_catalog.pg_get_userbyid(c.relowner), 'rls', c.relrowsecurity,
      'force_rls', c.relforcerowsecurity, 'reason', 'Expected managed owner is supabase_storage_admin. Ownership/RLS must not be changed.')
  from (values (1)) dummy(n) left join relations c on true
  left join target_roles t on t.role_name = 'supabase_storage_admin'
  union all
  select 'role_switch', s.identity_kind || ' -> ' || s.role_name, 'existing_set_authority',
    case when s.target_oid is null or not s.can_set_role then 'FAIL' else 'REVIEW' end,
    jsonb_build_object('can_set_role', s.can_set_role,
      'reason', 'PG16+ checks SET specifically; earlier PostgreSQL uses MEMBER semantics. Positive catalog rights still require platform authorization and an approved scoped execution artifact. No SET ROLE is run.')
  from set_authority s
  union all
  select 'role_switch', 'session_user', 'atomic_switch_and_explicit_restore_possible',
    case when count(*) = 2 and bool_and(can_set_role) then 'REVIEW' else 'FAIL' end,
    jsonb_build_object('both_target_roles_accessible', count(*) = 2 and bool_and(can_set_role),
      'reason', 'The session must be able to enter the Storage owner AND explicitly restore postgres. RESET ROLE may restore a more privileged session identity and is not a safe substitute.')
  from set_authority where identity_kind = 'session_user'
  union all
  select 'schema', 'supabase_storage_admin.' || s.schema_name, 'owner_role_schema_usage',
    case when t.oid is not null and n.oid is not null and pg_catalog.has_schema_privilege(t.oid, n.oid, 'USAGE') then 'PASS'
      when s.schema_name = 'auth' then 'REVIEW' else 'FAIL' end,
    jsonb_build_object('reason', 'Owner context must resolve Storage/public references. auth schema access depends on the reviewed original predicate references; a missing auth right is REVIEW, not permission to grant it automatically.')
  from (values ('storage'), ('public'), ('auth')) s(schema_name)
  left join pg_catalog.pg_namespace n on n.nspname = s.schema_name
  cross join target_roles t where t.role_name = 'supabase_storage_admin'
  union all
  select 'memberships', parent.rolname || ' -> ' || child.rolname, 'role_edge_metadata', 'REVIEW',
    jsonb_build_object('admin_option', m.admin_option,
      'inherit_option', to_jsonb(m)->'inherit_option', 'set_option', to_jsonb(m)->'set_option',
      'reason', 'Optional PG16+ flags are shown only as metadata. Transitive pg_has_role SET is authoritative for the session check; no membership grant is proposed.')
  from pg_catalog.pg_auth_members m
  join pg_catalog.pg_roles parent on parent.oid = m.roleid
  join pg_catalog.pg_roles child on child.oid = m.member
  where parent.rolname in ('supabase_storage_admin', 'postgres')
     or child.rolname in (current_user, session_user)
  union all
  select 'support', 'managed_storage_ownership', 'supported_route_confirmation', 'REVIEW',
    jsonb_build_object('reason', 'Catalog results cannot confirm which managed Supabase execution mechanisms are supported for this project. Obtain provider confirmation if existing authorized role switching is unavailable. Do not assume Dashboard/CLI/service_role bypasses ownership.')
)
select category, object_name, check_name, result, details
from report order by category, object_name, check_name;
rollback;
