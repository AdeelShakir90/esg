-- READ ONLY DIAGNOSTIC / NOT EXECUTED. Only envario-security-test / gkhrtrakukqdhgvucudv.
-- Confirm target manually. Export privately: full policy SQL is intentional schema evidence.
-- No helper calls or customer/object rows. Does NOT replace canonical FAIL/REVIEW results.
-- Never run returned expression text. Normalization diagnostics do not prove equivalence.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
with
baseline as (
  select b.relation_name, b.policy_name,
    case when b.relation_name = 'public.organization_memberships' then
      replace(replace(b.using_sql,
        '(status)::text', case when (select a.atttypid from pg_catalog.pg_attribute a
          where a.attrelid = pg_catalog.to_regclass(b.relation_name) and a.attname = 'status' and not a.attisdropped) = 'text'::regtype then 'status' else '(status)::text' end),
        '(role)::text', case when (select a.atttypid from pg_catalog.pg_attribute a
          where a.attrelid = pg_catalog.to_regclass(b.relation_name) and a.attname = 'role' and not a.attisdropped) = 'text'::regtype then 'role' else '(role)::text' end)
    else b.using_sql end as using_sql,
    b.with_check_sql, b.roles, b.command, b.permissive
  from pg_catalog.jsonb_to_recordset($snapshots$
[
  {
    "relation_name": "public.documents",
    "policy_name": "documents_select_active_member",
    "using_sql": "((organization_id IS NOT NULL) AND public.is_active_organization_member(organization_id) AND (organization_id IS NOT NULL) AND public.has_active_organization_role(organization_id, ARRAY['owner'::text, 'reviewer'::text]))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true,
    "original_using_sql": "((organization_id IS NOT NULL) AND public.is_active_organization_member(organization_id))",
    "restriction_deparsed": "((organization_id IS NOT NULL) AND public.has_active_organization_role(organization_id, ARRAY['owner'::text, 'reviewer'::text]))"
  },
  {
    "relation_name": "public.esg_extractions",
    "policy_name": "esg_extractions_select_active_member",
    "using_sql": "((EXISTS ( SELECT 1 FROM public.documents document WHERE ((document.id = esg_extractions.document_id) AND (document.organization_id IS NOT NULL) AND public.is_active_organization_member(document.organization_id)))) AND (EXISTS ( SELECT 1 FROM public.documents d WHERE ((d.id = esg_extractions.document_id) AND (d.organization_id IS NOT NULL) AND public.has_active_organization_role(d.organization_id, ARRAY['owner'::text, 'reviewer'::text])))))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true,
    "original_using_sql": "(EXISTS ( SELECT 1 FROM public.documents document WHERE ((document.id = esg_extractions.document_id) AND (document.organization_id IS NOT NULL) AND public.is_active_organization_member(document.organization_id))))",
    "restriction_deparsed": "(EXISTS ( SELECT 1 FROM public.documents d WHERE ((d.id = esg_extractions.document_id) AND (d.organization_id IS NOT NULL) AND public.has_active_organization_role(d.organization_id, ARRAY['owner'::text, 'reviewer'::text]))))"
  },
  {
    "relation_name": "public.extracted_esg_fields",
    "policy_name": "extracted_esg_fields_select_active_member",
    "using_sql": "((EXISTS ( SELECT 1 FROM (public.esg_extractions extraction JOIN public.documents document ON ((document.id = extraction.document_id))) WHERE ((extraction.id = extracted_esg_fields.extraction_id) AND (document.organization_id IS NOT NULL) AND public.is_active_organization_member(document.organization_id)))) AND (EXISTS ( SELECT 1 FROM (public.esg_extractions e JOIN public.documents d ON ((d.id = e.document_id))) WHERE ((e.id = extracted_esg_fields.extraction_id) AND (d.organization_id IS NOT NULL) AND public.has_active_organization_role(d.organization_id, ARRAY['owner'::text, 'reviewer'::text])))))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true,
    "original_using_sql": "(EXISTS ( SELECT 1 FROM (public.esg_extractions extraction JOIN public.documents document ON ((document.id = extraction.document_id))) WHERE ((extraction.id = extracted_esg_fields.extraction_id) AND (document.organization_id IS NOT NULL) AND public.is_active_organization_member(document.organization_id))))",
    "restriction_deparsed": "(EXISTS ( SELECT 1 FROM (public.esg_extractions e JOIN public.documents d ON ((d.id = e.document_id))) WHERE ((e.id = extracted_esg_fields.extraction_id) AND (d.organization_id IS NOT NULL) AND public.has_active_organization_role(d.organization_id, ARRAY['owner'::text, 'reviewer'::text]))))"
  },
  {
    "relation_name": "public.organization_memberships",
    "policy_name": "memberships_select_same_organization",
    "using_sql": "(((user_id = auth.uid()) OR public.has_active_organization_role(organization_id, ARRAY['owner'::text, 'admin'::text])) AND (user_id = auth.uid()) AND ((status)::text = 'active'::text) AND ((role)::text = ANY (ARRAY['owner'::text, 'reviewer'::text])))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true,
    "original_using_sql": "((user_id = auth.uid()) OR public.has_active_organization_role(organization_id, ARRAY['owner'::text, 'admin'::text]))",
    "restriction_deparsed": "((user_id = auth.uid()) AND ((status)::text = 'active'::text) AND ((role)::text = ANY (ARRAY['owner'::text, 'reviewer'::text])))"
  },
  {
    "relation_name": "public.organizations",
    "policy_name": "organizations_select_active_member",
    "using_sql": "(public.is_active_organization_member(id) AND public.has_active_organization_role(id, ARRAY['owner'::text, 'reviewer'::text]))",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true,
    "original_using_sql": "public.is_active_organization_member(id)",
    "restriction_deparsed": "public.has_active_organization_role(id, ARRAY['owner'::text, 'reviewer'::text])"
  },
  {
    "relation_name": "storage.objects",
    "policy_name": "storage_documents_select_active_member",
    "using_sql": "CASE WHEN ((bucket_id = 'documents'::text) AND (name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]pdf$'::text)) THEN ((bucket_id = 'documents'::text) AND public.is_active_organization_member(public.document_storage_organization_id(name)) AND (bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1 FROM public.documents d WHERE ((d.storage_path = objects.name) AND (d.organization_id IS NOT NULL) AND (d.organization_id = (split_part(objects.name, '/'::text, 1))::uuid) AND (d.id = (split_part(split_part(objects.name, '/'::text, 2), '.'::text, 1))::uuid) AND public.has_active_organization_role(d.organization_id, ARRAY['owner'::text, 'reviewer'::text]))))) ELSE false END",
    "with_check_sql": null,
    "roles": [
      "authenticated"
    ],
    "command": "r",
    "permissive": true,
    "original_using_sql": "((bucket_id = 'documents'::text) AND public.is_active_organization_member(public.document_storage_organization_id(name)))",
    "restriction_deparsed": "((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1 FROM public.documents d WHERE ((d.storage_path = objects.name) AND (d.organization_id IS NOT NULL) AND (d.organization_id = (split_part(objects.name, '/'::text, 1))::uuid) AND (d.id = (split_part(split_part(objects.name, '/'::text, 2), '.'::text, 1))::uuid) AND public.has_active_organization_role(d.organization_id, ARRAY['owner'::text, 'reviewer'::text])))))"
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
    p.actual_roles::text[] is not distinct from p.expected_roles::text[] as roles_equal,
    p.polcmd::text is not distinct from p.command as command_equal,
    p.polpermissive is not distinct from p.permissive as mode_equal
  from paired p
  join tokenized eu on eu.relation_name = p.relation_name and eu.policy_name = p.policy_name and eu.expression_kind = 'using' and eu.source_kind = 'expected'
  join tokenized au on au.relation_name = p.relation_name and au.policy_name = p.policy_name and au.expression_kind = 'using' and au.source_kind = 'actual'
  join tokenized ec on ec.relation_name = p.relation_name and ec.policy_name = p.policy_name and ec.expression_kind = 'check' and ec.source_kind = 'expected'
  join tokenized ac on ac.relation_name = p.relation_name and ac.policy_name = p.policy_name and ac.expression_kind = 'check' and ac.source_kind = 'actual'
),
targets as (
  select * from comparisons where policy_name in
    ('documents_select_active_member', 'memberships_select_same_organization', 'storage_documents_select_active_member')
),
diagnostic(category, object_name, check_name, result, details) as (
  select 'predicate_comparison'::text, t.relation_name || '.' || t.policy_name,
    'full_expected_actual_export'::text,
    case when t.policy_oid is not null and t.using_tokens_equal and t.check_tokens_equal
      and t.roles_equal and t.command_equal and t.mode_equal then 'PASS' else 'FAIL' end,
    jsonb_build_object('expected_using', t.using_sql, 'actual_using', t.actual_using,
      'actual_using_pretty_diagnostic_only', pg_catalog.pg_get_expr(p.polqual, p.polrelid, true),
      'expected_with_check', t.with_check_sql, 'actual_with_check', t.actual_check,
      'expected_roles', t.expected_roles, 'actual_roles', t.actual_roles,
      'expected_command', t.command, 'actual_command', t.polcmd,
      'expected_permissive', t.permissive, 'actual_permissive', t.polpermissive,
      'raw_equal', t.using_raw_equal, 'tokens_equal', t.using_tokens_equal,
      'expected_using_md5', md5(t.using_sql), 'actual_using_md5', md5(t.actual_using),
      'expected_utf8_hex', pg_catalog.encode(pg_catalog.convert_to(t.using_sql, 'UTF8'), 'hex'),
      'actual_utf8_hex', pg_catalog.encode(pg_catalog.convert_to(t.actual_using, 'UTF8'), 'hex'),
      'reason', 'Exact canonical expected comparison, unchanged. Full SQL/UTF8 export enables independent review. No comparison rule is weakened.')
  from targets t left join pg_catalog.pg_policy p on p.oid = t.policy_oid
  union all
  select 'token_diagnostic', t.relation_name || '.' || t.policy_name, 'first_token_differences',
    case when t.policy_oid is null then 'FAIL' else 'REVIEW' end,
    jsonb_build_object('expected_token_count', cardinality(e.tokens), 'actual_token_count', cardinality(a.tokens),
      'first_24_positional_differences', (select coalesce(jsonb_agg(to_jsonb(d) order by d.position), '[]'::jsonb) from (
        select coalesce(et.position, observed_token.position) as position, et.token as expected_token, observed_token.token as actual_token
        from pg_catalog.unnest(e.tokens) with ordinality et(token, position)
        full join pg_catalog.unnest(a.tokens) with ordinality observed_token(token, position) on et.position = observed_token.position
        where et.token is distinct from observed_token.token order by coalesce(et.position, observed_token.position) limit 24
      ) d),
      'reason', 'Positional differences are navigation only: insertion shifts later tokens. Parentheses and boolean branch scope must be reviewed, never stripped for acceptance.')
  from targets t
  join tokenized e on e.relation_name = t.relation_name and e.policy_name = t.policy_name and e.expression_kind = 'using' and e.source_kind = 'expected'
  join tokenized a on a.relation_name = t.relation_name and a.policy_name = t.policy_name and a.expression_kind = 'using' and a.source_kind = 'actual'
  union all
  select 'overlap_inventory', t.relation_name || '.' || p.polname, 'all_select_all_policies',
    case when p.polname = t.policy_name then 'REVIEW' else 'FAIL' end,
    jsonb_build_object('command', p.polcmd, 'permissive', p.polpermissive,
      'roles', array(select case when r = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(r)::text end from pg_catalog.unnest(p.polroles) r order by r),
      'using', pg_catalog.pg_get_expr(p.polqual, p.polrelid), 'with_check', pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid),
      'reason', 'Expected policy metadata is checked separately. Any extra SELECT/ALL policy remains FAIL regardless of permissive/restrictive mode.')
  from targets t join pg_catalog.pg_policy p on p.polrelid = pg_catalog.to_regclass(t.relation_name) and p.polcmd in ('r', '*')
  union all
  select 'types', 'public.organization_memberships.' || e.column_name, 'membership_cast_context',
    case when a.attnum is null then 'FAIL' else 'REVIEW' end,
    jsonb_build_object('type', pg_catalog.format_type(a.atttypid, a.atttypmod), 'type_kind', ty.typtype,
      'reason', 'Inspect text versus enum coercions and original column binding. No caller data or values are read.')
  from (values ('user_id'), ('organization_id'), ('role'), ('status')) e(column_name)
  left join pg_catalog.pg_attribute a on a.attrelid = pg_catalog.to_regclass('public.organization_memberships')
    and a.attname = e.column_name and a.attnum > 0 and not a.attisdropped
  left join pg_catalog.pg_type ty on ty.oid = a.atttypid
  union all
  select 'review', 'all_three_predicates', 'no_equivalence_or_execution_approval', 'REVIEW',
    jsonb_build_object('server_version_num', pg_catalog.current_setting('server_version_num'),
      'reason', 'This query exports evidence only. Preserve canonical FAILs and proposed Storage/MAINTAIN/full-role-graph REVIEWs. No policy/migration change, historical-equivalence claim or application enablement follows.')
)
select category, object_name, check_name, result, details from diagnostic
order by category, object_name, check_name;
rollback;
