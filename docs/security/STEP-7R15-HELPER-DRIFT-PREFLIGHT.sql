-- READ ONLY / NOT EXECUTED. Only envario-security-test / gkhrtrakukqdhgvucudv.
-- Proposed CURRENT-state references; NOT historical definitions or approval.
-- Source: STEP-7R15-HELPER-CURRENT-STATE-REFERENCE.json. Source export bytes are
-- not verified, and reported MD5 values were not reproduced from the transcript.
-- Exact live-to-reported MD5 checks are separate from transcript text comparison.
-- CRLF-to-LF equality is diagnostic ONLY, never semantic/exact-byte approval.
-- No functions are invoked; this reads catalogs only. No data, credentials,
-- function bodies or arbitrary configuration values are returned.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
with
reference as (
  select * from pg_catalog.jsonb_to_recordset($helper_reference$
[
  {
    "signature": "public.document_storage_organization_id(text)",
    "definition_text": "CREATE OR REPLACE FUNCTION public.document_storage_organization_id(object_name text)\n RETURNS uuid\n LANGUAGE sql\n IMMUTABLE\n SET search_path TO ''\nAS $function$\n  select case\n    when split_part(object_name, '/', 1) ~\n      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'\n    then split_part(object_name, '/', 1)::uuid\n    else null\n  end;\n$function$",
    "reported_definition_md5": "cdc03d374173e351092dff040c30edf6",
    "owner": "postgres",
    "language": "sql",
    "volatility": "i",
    "security_definer": false,
    "search_path": "",
    "return_type": "uuid",
    "acl": [
      "postgres=X/postgres",
      "authenticated=X/postgres",
      "service_role=X/postgres"
    ],
    "effective_execute": {
      "anon": false,
      "authenticated": true
    }
  },
  {
    "signature": "public.has_active_organization_role(uuid,text[])",
    "definition_text": "CREATE OR REPLACE FUNCTION public.has_active_organization_role(target_organization_id uuid, allowed_roles text[])\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO ''\nAS $function$\n  select exists (\n    select 1\n    from public.organization_memberships membership\n    where membership.organization_id = target_organization_id\n      and membership.user_id = auth.uid()\n      and membership.status = 'active'\n      and membership.role = any(allowed_roles)\n  );\n$function$",
    "reported_definition_md5": "f1b147b487ffc4b7239b7a65627b5f87",
    "owner": "postgres",
    "language": "sql",
    "volatility": "s",
    "security_definer": true,
    "search_path": "",
    "return_type": "boolean",
    "acl": [
      "postgres=X/postgres",
      "authenticated=X/postgres",
      "service_role=X/postgres"
    ],
    "effective_execute": {
      "anon": false,
      "authenticated": true
    }
  },
  {
    "signature": "public.is_active_organization_member(uuid)",
    "definition_text": "CREATE OR REPLACE FUNCTION public.is_active_organization_member(target_organization_id uuid)\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO ''\nAS $function$\n  select exists (\n    select 1\n    from public.organization_memberships membership\n    where membership.organization_id = target_organization_id\n      and membership.user_id = auth.uid()\n      and membership.status = 'active'\n  );\n$function$",
    "reported_definition_md5": "7f7bc2ad759c7dde9b2b68cf03a1af6a",
    "owner": "postgres",
    "language": "sql",
    "volatility": "s",
    "security_definer": true,
    "search_path": "",
    "return_type": "boolean",
    "acl": [
      "postgres=X/postgres",
      "authenticated=X/postgres",
      "service_role=X/postgres"
    ],
    "effective_execute": {
      "anon": false,
      "authenticated": true
    }
  }
]
$helper_reference$::jsonb) as r(signature text, definition_text text,
    reported_definition_md5 text, owner text, language text, volatility text,
    security_definer boolean, search_path text, return_type text, acl text[], effective_execute jsonb)
),
actual as (
  select r.*, p.oid, p.proowner, p.prokind, p.prosecdef, p.provolatile, p.prorettype,
    l.lanname, p.proacl,
    pg_catalog.pg_get_functiondef(p.oid) as actual_definition,
    array(select x::text from pg_catalog.unnest(p.proacl) x order by x::text collate "C") as actual_acl,
    array(select x from pg_catalog.unnest(r.acl) x order by x collate "C") as expected_acl,
    cfg.setting_count, cfg.path_value, cfg.other_keys
  from reference r
  left join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(r.signature)
  left join pg_catalog.pg_language l on l.oid = p.prolang
  left join lateral (
    select count(*) filter (where pg_catalog.split_part(setting, '=', 1) = 'search_path') as setting_count,
      min(pg_catalog.substr(setting, pg_catalog.strpos(setting, '=') + 1))
        filter (where pg_catalog.split_part(setting, '=', 1) = 'search_path') as path_value,
      array_agg(pg_catalog.split_part(setting, '=', 1) order by setting)
        filter (where pg_catalog.split_part(setting, '=', 1) <> 'search_path') as other_keys
    from pg_catalog.unnest(p.proconfig) cfg(setting)
  ) cfg on true
),
roles as (
  select e.role_name, p.oid from (values ('anon'), ('authenticated')) e(role_name)
  left join pg_catalog.pg_roles p on p.rolname = e.role_name
),
report(category, object_name, check_name, result, details) as (
  select 'reference'::text, 'proposed_current_state'::text, 'not_approval_or_historical_proof'::text, 'REVIEW'::text,
    jsonb_build_object('project_ref', 'gkhrtrakukqdhgvucudv', 'historical_provenance_verified', false,
      'baseline_approved', false, 'source_bytes_verified', false,
      'reason', 'The user-supplied text and observed hashes are preserved separately. None of the hashes was reproduced by the local LF/CRLF/trailing-newline checks; raw export evidence and explicit baseline acceptance are still needed.')
  union all
  select 'hash', signature, 'live_matches_supplied_observed_md5',
    case when oid is null then 'FAIL'
      when reported_definition_md5 !~ '^[0-9a-fA-F]{32}$' then 'REVIEW'
      when md5(actual_definition) = lower(reported_definition_md5) then 'PASS' else 'FAIL' end,
    jsonb_build_object('reported_observed_md5', reported_definition_md5,
      'live_definition_md5', md5(actual_definition),
      'reason', 'This compares live bytes to the supplied observed fingerprint only. It does not prove transcript equality, semantic review, historical equivalence or execution approval. Mismatch may include formatting differences and requires review.')
  from actual
  union all
  select 'text', signature, 'transcript_and_line_ending_uncertainty',
    case when oid is null then 'FAIL' else 'REVIEW' end,
    jsonb_build_object('raw_live_text_equals_transcript', actual_definition = definition_text,
      'crlf_to_lf_diagnostic_equal', replace(actual_definition, E'\r\n', E'\n') = definition_text,
      'transcribed_lf_md5', md5(definition_text),
      'transcript_reproduces_reported_md5', md5(definition_text) = lower(reported_definition_md5),
      'reason', 'Original source line endings/trailing bytes were not supplied. No whitespace/comment stripping, trailing-newline trimming or normalization can turn this into exact-byte approval.')
  from actual
  union all
  select 'metadata', signature, 'exact_proposed_metadata_match',
    case when oid is null or prokind is distinct from 'f'
      or pg_catalog.pg_get_userbyid(proowner)::text is distinct from owner
      or lanname::text is distinct from language or provolatile::text is distinct from volatility
      or prosecdef is distinct from security_definer
      or pg_catalog.format_type(prorettype, null) is distinct from return_type
      or actual_acl is distinct from expected_acl
      or search_path is distinct from '' or setting_count <> 1
      or coalesce(pg_catalog.regexp_replace(path_value, '^[[:space:]]+|[[:space:]]+$', '', 'g') in ('', '""'), false) is distinct from true
      or coalesce(cardinality(other_keys), 0) <> 0 then 'FAIL' else 'PASS' end,
    jsonb_build_object('actual_owner', pg_catalog.pg_get_userbyid(proowner),
      'actual_language', lanname, 'actual_volatility', provolatile, 'actual_definer', prosecdef,
      'actual_acl', actual_acl, 'reference_acl_sorted', expected_acl,
      'unexpected_setting_keys', other_keys,
      'reason', 'Metadata/ACL equality is separate from function body equality. Empty path is compared semantically across PostgreSQL serializations; no grants/settings are changed.')
  from actual
  union all
  select 'execute', a.signature || '.' || r.role_name, 'effective_execute_matches_observation',
    case when a.oid is null or r.oid is null then 'FAIL'
      when pg_catalog.has_function_privilege(r.oid, a.oid, 'EXECUTE') is not distinct from (a.effective_execute ->> r.role_name)::boolean then 'PASS' else 'FAIL' end,
    jsonb_build_object('expected', (a.effective_execute ->> r.role_name)::boolean,
      'actual', pg_catalog.has_function_privilege(r.oid, a.oid, 'EXECUTE'),
      'reason', 'Supplied effective anon=false and authenticated=true are checked, including inherited/PUBLIC privileges.')
  from actual a cross join roles r
  union all
  select 'approval', 'execution_checklist', 'no_automatic_acceptance', 'REVIEW',
    jsonb_build_object('reason', 'Resolve text/hash provenance and review parser test results, then explicitly approve a current-state helper baseline and separately authorize any migration. All application read/write gates stay closed.')
)
select category, object_name, check_name, result, details
from report order by category, object_name, check_name;
rollback;
