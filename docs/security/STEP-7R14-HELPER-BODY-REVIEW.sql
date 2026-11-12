-- READ ONLY / NOT EXECUTED. ONLY envario-security-test / gkhrtrakukqdhgvucudv.
-- PRIVATE MANUAL EXPORT of exactly THREE known security functions.
-- Full CREATE FUNCTION definitions can contain hardcoded literals/settings.
-- Review privately; do not publish unexpected secrets or paste unredacted output
-- until checked. No application/user rows, JWT claims or credentials are queried.
-- pg_get_functiondef/prosrc are catalog text: NONE of these helpers is invoked.
-- No reviewed original definitions/body fingerprints exist in the checkout.
-- NULL reference fields and reference_approved=false deliberately retain REVIEW.
-- Never fill expected values or approval flags automatically from observed output.
-- Run the whole file in SQL Editor under the approved isolated project/role;
-- export its ONE result grid privately, then review with STEP-7R14-REVIEW.md.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
with
reference(signature, expected_definer, expected_volatility, expected_return,
          reviewed_original_definition, reviewed_original_md5, reference_approved) as (values
  ('public.is_active_organization_member(uuid)', true, 's', 'boolean', null::text, null::text, false),
  ('public.has_active_organization_role(uuid,text[])', true, 's', 'boolean', null::text, null::text, false),
  ('public.document_storage_organization_id(text)', false, 'i', 'uuid', null::text, null::text, false)
),
roles as (
  select e.role_name, r.oid, r.rolsuper, r.rolbypassrls
  from (values ('postgres'), ('authenticated'), ('anon')) e(role_name)
  left join pg_catalog.pg_roles r on r.rolname = e.role_name
),
helpers as (
  select e.*, p.oid, p.proowner, p.prokind, p.prosecdef, p.provolatile,
         p.prorettype, p.proleakproof, p.proisstrict, p.proparallel, p.proargnames,
         p.proacl, p.prosrc, l.lanname,
         pg_catalog.pg_get_functiondef(p.oid) as observed_definition,
         paths.setting_count, paths.path_value
  from reference e
  left join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(e.signature)
  left join pg_catalog.pg_language l on l.oid = p.prolang
  left join lateral (
    select count(*) as setting_count,
      min(pg_catalog.substr(setting, pg_catalog.strpos(setting, '=') + 1)) as path_value
    from pg_catalog.unnest(p.proconfig) cfg(setting)
    where pg_catalog.split_part(setting, '=', 1) = 'search_path'
  ) paths on true
),
report(category, object_name, check_name, result, details) as (
  select 'scope'::text, 'envario-security-test'::text, 'manual_target_and_provenance'::text, 'REVIEW'::text,
    jsonb_build_object('project_ref', 'gkhrtrakukqdhgvucudv',
      'original_definitions_available_locally', false, 'reference_approved', false,
      'reason', 'Verify project manually. Prior summaries/policy references are not full independently reviewed function definitions. This export does not adopt observations as an approved or historical baseline.')
  union all
  select 'definition', h.signature, 'private_catalog_definition_export',
    case when h.oid is null then 'FAIL' else 'REVIEW' end,
    jsonb_build_object('exists', h.oid is not null,
      'observed_pg_get_functiondef', h.observed_definition,
      'observed_definition_md5', md5(h.observed_definition),
      'observed_body_md5', md5(h.prosrc),
      'argument_names', h.proargnames,
      'reason', 'Human-review the actual complete definition, not the hash alone. Catalog text is exported without running the function. Handle unexpected sensitive literals privately.')
  from helpers h
  union all
  select 'comparison', h.signature, 'independently_reviewed_original_comparison',
    case when h.oid is null then 'FAIL'
      when not h.reference_approved or (h.reviewed_original_definition is null and h.reviewed_original_md5 is null) then 'REVIEW'
      when (h.reviewed_original_definition is null or h.observed_definition = h.reviewed_original_definition)
       and (h.reviewed_original_md5 is null or md5(h.observed_definition) = h.reviewed_original_md5) then 'PASS'
      else 'FAIL' end,
    jsonb_build_object('reference_approved', h.reference_approved,
      'has_original_definition', h.reviewed_original_definition is not null,
      'has_reviewed_fingerprint', h.reviewed_original_md5 is not null,
      'reason', 'Expected fields are deliberately absent. If an independent reference is later supplied, compare exactly; formatting differences require human review, not unsafe whole-body whitespace normalization. Observed hashes never approve themselves.')
  from helpers h
  union all
  select 'structure', h.signature, 'reviewed_signature_owner_modes',
    case when h.oid is null or owner_role.oid is null
      or h.proowner is distinct from owner_role.oid
      or h.prokind is distinct from 'f'
      or h.prosecdef is distinct from h.expected_definer
      or h.provolatile::text is distinct from h.expected_volatility
      or pg_catalog.format_type(h.prorettype, null) is distinct from h.expected_return
      then 'FAIL' else 'PASS' end,
    jsonb_build_object('owner', pg_catalog.pg_get_userbyid(h.proowner),
      'language', h.lanname, 'security_definer', h.prosecdef,
      'volatility', h.provolatile, 'return_type', pg_catalog.format_type(h.prorettype, null),
      'strict_null_inputs', h.proisstrict, 'leakproof', h.proleakproof, 'parallel_mode', h.proparallel,
      'reason', 'Structural PASS is not semantic/body approval. Confirm unexpected language, leakproof or parallel attributes and caller-controlled arguments during review.')
  from helpers h cross join roles owner_role where owner_role.role_name = 'postgres'
  union all
  select 'configuration', h.signature, 'explicit_empty_search_path',
    case when h.oid is not null and h.setting_count = 1 and
      coalesce(pg_catalog.regexp_replace(h.path_value, '^[[:space:]]+|[[:space:]]+$', '', 'g') in ('', '""'), false)
      then 'PASS' else 'FAIL' end,
    jsonb_build_object('setting_count', h.setting_count,
      'reason', 'An explicit empty configured path is required; a missing setting or unresolved named schema is not empty. Review body qualification, including relations/types/functions; implicit pg_temp requires care. No helper setting is changed.')
  from helpers h
  union all
  select 'privileges', h.signature || '.' || r.role_name, 'effective_execute',
    case when h.oid is null or r.oid is null then 'FAIL'
      when r.role_name = 'authenticated' and pg_catalog.has_function_privilege(r.oid, h.oid, 'EXECUTE') is distinct from true then 'FAIL'
      when r.role_name = 'anon' and pg_catalog.has_function_privilege(r.oid, h.oid, 'EXECUTE') then 'REVIEW' else 'PASS' end,
    jsonb_build_object('can_execute', pg_catalog.has_function_privilege(r.oid, h.oid, 'EXECUTE'),
      'acl', h.proacl,
      'reason', 'Includes inherited/PUBLIC EXECUTE. Anonymous reachability needs review but is not itself table access. This script changes no grants.')
  from helpers h cross join roles r where r.role_name in ('authenticated', 'anon')
  union all
  select 'semantics', h.signature, 'mandatory_manual_body_review',
    case when h.oid is null then 'FAIL' else 'REVIEW' end,
    jsonb_build_object('auth_uid_text_marker', coalesce(h.prosrc ~* 'auth[.]uid[[:space:]]*[(]', false),
      'active_literal_text_marker', coalesce(pg_catalog.strpos(h.prosrc, '''active''') > 0, false),
      'any_text_marker', coalesce(h.prosrc ~* '\mANY\M', false),
      'reason', case h.signature
        when 'public.is_active_organization_member(uuid)' then
          'Must use auth.uid() for the caller, scope to the supplied organization, require active status and fail closed for anonymous/null input. Broad active member=true is the known original behavior, not owner/reviewer authorization.'
        when 'public.has_active_organization_role(uuid,text[])' then
          'Must require caller auth.uid(), supplied organization, active membership AND role in the supplied allowlist; reject broad OR/fallback/admin exceptions. Review NULL/empty array and caller-controlled parameter semantics. Policy allowlists stay fixed owner/reviewer.'
        else
          'Must be a pure SECURITY INVOKER immutable string parser. Inspect guards before UUID casts for NULL/empty/malformed/legacy names, exception behavior and extra segments. It must not read tables, identity, time or mutable state while declared IMMUTABLE. It does not prove document ownership.' end,
      'warning', 'Text markers are navigation aids only: comments/strings can contain them. Presence or absence is not a semantic verdict, and no function is called to test them.')
  from helpers h
  union all
  select 'dependencies', h.signature, 'direct_catalog_dependency', 'REVIEW',
    jsonb_build_object('referenced_object', pg_catalog.pg_describe_object(d.refclassid, d.refobjid, d.refobjsubid),
      'dependency_type', d.deptype,
      'reason', 'Review nested calls and mutable/privileged dependencies. Catalog dependencies are incomplete for string-defined SQL/PLpgSQL and dynamic SQL; inspect exported bodies too.')
  from helpers h join pg_catalog.pg_depend d
    on d.classid = 'pg_catalog.pg_proc'::regclass and d.objid = h.oid
  union all
  select 'recursion', 'postgres', 'membership_read_without_entering_policy',
    case when r.oid is not null and c.oid is not null and
      (r.rolsuper or r.rolbypassrls or (c.relowner = r.oid and not c.relforcerowsecurity)) then 'PASS' else 'FAIL' end,
    jsonb_build_object('owner_superuser', r.rolsuper, 'owner_bypassrls', r.rolbypassrls,
      'owns_memberships', c.relowner = r.oid, 'force_rls', c.relforcerowsecurity,
      'reason', 'Definer membership lookup must not recursively enter its own RLS. No bypass permission or ownership is granted.')
  from roles r left join pg_catalog.pg_class c on c.oid = pg_catalog.to_regclass('public.organization_memberships')
  where r.role_name = 'postgres'
  union all
  select 'approval', 'helper_review', 'no_automatic_clearance', 'REVIEW',
    jsonb_build_object('reason', 'After private semantic review, explicitly accept a CURRENT-state helper baseline, record full definitions/settings/ACLs and fingerprints, then prepare a new read-only comparison. This report does not fill R13 expected hashes, approve DDL, or enable application access.')
)
select category, object_name, check_name, result, details
from report order by category, object_name, check_name;
rollback;
