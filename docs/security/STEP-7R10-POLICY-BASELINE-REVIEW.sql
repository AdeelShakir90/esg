-- READ ONLY / NOT EXECUTED. Only the separately approved isolated test project.
-- PRIVATE HUMAN REVIEW: exports actual schema policy expressions, including their
-- SQL literals. It does NOT read application rows, credentials or function bodies.
-- Unexpected sensitive hardcoded literals must be handled privately, not published.
-- Use the same search_path/deparser context for future comparisons.
-- Original reviewed predicate SQL/fingerprints have NOT been supplied. NULLs are
-- deliberate; observed expressions/hashes must never auto-approve themselves.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
with
approved_baselines(relation_name, policy_name, approved_using_sql, approved_with_check_sql, approved_roles, independently_approved) as (values
  ('public.documents', 'documents_select_active_member', null::text, null::text, null::text[], false),
  ('public.esg_extractions', 'esg_extractions_select_active_member', null::text, null::text, null::text[], false),
  ('public.extracted_esg_fields', 'extracted_esg_fields_select_active_member', null::text, null::text, null::text[], false),
  ('storage.objects', 'storage_documents_select_active_member', null::text, null::text, null::text[], false),
  ('public.organizations', 'organizations_select_active_member', null::text, null::text, null::text[], false),
  ('public.organization_memberships', 'memberships_select_same_organization', null::text, null::text, null::text[], false)
),
actual as (
  select b.*, p.oid, p.polcmd, p.polpermissive,
    pg_catalog.pg_get_expr(p.polqual, p.polrelid) as actual_using_sql,
    pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) as actual_with_check_sql,
    array(select case when x = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(x) end
      from pg_catalog.unnest(p.polroles) x order by 1) as actual_roles
  from approved_baselines b left join pg_catalog.pg_policy p
    on p.polrelid = pg_catalog.to_regclass(b.relation_name) and p.polname = b.policy_name
)
select 'policy_baseline'::text as category,
  relation_name || '.' || policy_name as object_name,
  'original_expression_human_comparison'::text as check_name,
  case when oid is null or polcmd is distinct from 'r' or polpermissive is distinct from true then 'FAIL'
    when not independently_approved or approved_using_sql is null or approved_roles is null then 'REVIEW'
    when actual_using_sql is not distinct from approved_using_sql
      and actual_with_check_sql is not distinct from approved_with_check_sql
      and actual_roles is not distinct from approved_roles then 'PASS' else 'FAIL' end as result,
  jsonb_build_object('exists', oid is not null, 'command', polcmd,
    'permissive', polpermissive, 'roles', actual_roles,
    'actual_using_sql', actual_using_sql, 'actual_with_check_sql', actual_with_check_sql,
    'actual_using_md5', md5(coalesce(actual_using_sql, '')),
    'actual_with_check_md5', md5(coalesce(actual_with_check_sql, '')),
    'approved_using_sql', approved_using_sql, 'approved_with_check_sql', approved_with_check_sql,
    'approved_roles_sorted', approved_roles,
    'reason', 'Review real expressions against independently supplied original SQL, roles and mode. Hash equality alone is not approval; deparser differences need human review. No approved baseline is invented.') as details
from actual order by object_name;
rollback;
