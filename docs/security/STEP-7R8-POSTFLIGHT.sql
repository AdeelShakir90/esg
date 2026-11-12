-- READ ONLY POSTFLIGHT / NOT EXECUTED. ONLY envario-security-test / gkhrtrakukqdhgvucudv.
-- Expected predicates are independently derived; no actual expression is adopted.
-- Exact token comparison ignores inter-token whitespace ONLY, preserving all grouping.
-- PostgreSQL deparser/version/type formatting differences FAIL for manual review.
-- No helper calls, writes, object paths, contents, identities or secrets are output.
-- Verified Storage export is embedded as PROPOSED; equality remains REVIEW until approved.
-- Unexpected policy/helper/grant differences FAIL. Catalog PASS is not tenant testing.
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
    ('public.is_active_organization_member(uuid)', true, 's', 'boolean', '7f7bc2ad759c7dde9b2b68cf03a1af6a'::text),
    ('public.has_active_organization_role(uuid,text[])', true, 's', 'boolean', 'f1b147b487ffc4b7239b7a65627b5f87'::text),
    ('public.document_storage_organization_id(text)', false, 'i', 'uuid', 'cdc03d374173e351092dff040c30edf6'::text)
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
verified_helper_reference as (
  select * from pg_catalog.jsonb_to_recordset($verified_helpers$
[
  {
    "signature": "public.document_storage_organization_id(text)",
    "md5": "cdc03d374173e351092dff040c30edf6",
    "sha256": "5964753263af84dc63ffc7e85fcb755d08a1ea1a0c5a1385816e802693f82912",
    "definition_hex": "435245415445204f52205245504c4143452046554e4354494f4e207075626c69632e646f63756d656e745f73746f726167655f6f7267616e697a6174696f6e5f6964286f626a6563745f6e616d652074657874290a2052455455524e5320757569640a204c414e47554147452073716c0a20494d4d555441424c450a20534554207365617263685f7061746820544f2027270a4153202466756e6374696f6e240d0a202073656c65637420636173650d0a202020207768656e2073706c69745f70617274286f626a6563745f6e616d652c20272f272c203129207e0d0a202020202020275e5b302d39612d66412d465d7b387d2d5b302d39612d66412d465d7b347d2d5b312d385d5b302d39612d66412d465d7b337d2d5b3839616241425d5b302d39612d66412d465d7b337d2d5b302d39612d66412d465d7b31327d24270d0a202020207468656e2073706c69745f70617274286f626a6563745f6e616d652c20272f272c2031293a3a757569640d0a20202020656c7365206e756c6c0d0a2020656e643b0d0a2466756e6374696f6e240a",
    "owner": "postgres",
    "security_definer": false,
    "volatility": "i",
    "configuration": [
      "search_path=\"\""
    ],
    "acl": [
      "authenticated=X/postgres",
      "postgres=X/postgres",
      "service_role=X/postgres"
    ]
  },
  {
    "signature": "public.has_active_organization_role(uuid,text[])",
    "md5": "f1b147b487ffc4b7239b7a65627b5f87",
    "sha256": "41cddc0bb041bcf41f15b8f23c60409b4faa73735a57ac6497fa13f7c3a6f9dc",
    "definition_hex": "435245415445204f52205245504c4143452046554e4354494f4e207075626c69632e6861735f6163746976655f6f7267616e697a6174696f6e5f726f6c65287461726765745f6f7267616e697a6174696f6e5f696420757569642c20616c6c6f7765645f726f6c657320746578745b5d290a2052455455524e5320626f6f6c65616e0a204c414e47554147452073716c0a20535441424c4520534543555249545920444546494e45520a20534554207365617263685f7061746820544f2027270a4153202466756e6374696f6e240d0a202073656c6563742065786973747320280d0a2020202073656c65637420310d0a2020202066726f6d207075626c69632e6f7267616e697a6174696f6e5f6d656d6265727368697073206d656d626572736869700d0a202020207768657265206d656d626572736869702e6f7267616e697a6174696f6e5f6964203d207461726765745f6f7267616e697a6174696f6e5f69640d0a202020202020616e64206d656d626572736869702e757365725f6964203d20617574682e75696428290d0a202020202020616e64206d656d626572736869702e737461747573203d2027616374697665270d0a202020202020616e64206d656d626572736869702e726f6c65203d20616e7928616c6c6f7765645f726f6c6573290d0a2020293b0d0a2466756e6374696f6e240a",
    "owner": "postgres",
    "security_definer": true,
    "volatility": "s",
    "configuration": [
      "search_path=\"\""
    ],
    "acl": [
      "authenticated=X/postgres",
      "postgres=X/postgres",
      "service_role=X/postgres"
    ]
  },
  {
    "signature": "public.is_active_organization_member(uuid)",
    "md5": "7f7bc2ad759c7dde9b2b68cf03a1af6a",
    "sha256": "d021d0c4138078519bbf74cae0f8f3cc3795417fc50b0ecc33af97fbdea46f7e",
    "definition_hex": "435245415445204f52205245504c4143452046554e4354494f4e207075626c69632e69735f6163746976655f6f7267616e697a6174696f6e5f6d656d626572287461726765745f6f7267616e697a6174696f6e5f69642075756964290a2052455455524e5320626f6f6c65616e0a204c414e47554147452073716c0a20535441424c4520534543555249545920444546494e45520a20534554207365617263685f7061746820544f2027270a4153202466756e6374696f6e240d0a202073656c6563742065786973747320280d0a2020202073656c65637420310d0a2020202066726f6d207075626c69632e6f7267616e697a6174696f6e5f6d656d6265727368697073206d656d626572736869700d0a202020207768657265206d656d626572736869702e6f7267616e697a6174696f6e5f6964203d207461726765745f6f7267616e697a6174696f6e5f69640d0a202020202020616e64206d656d626572736869702e757365725f6964203d20617574682e75696428290d0a202020202020616e64206d656d626572736869702e737461747573203d2027616374697665270d0a2020293b0d0a2466756e6374696f6e240a",
    "owner": "postgres",
    "security_definer": true,
    "volatility": "s",
    "configuration": [
      "search_path=\"\""
    ],
    "acl": [
      "authenticated=X/postgres",
      "postgres=X/postgres",
      "service_role=X/postgres"
    ]
  }
]
$verified_helpers$::jsonb) as h(signature text, md5 text, sha256 text, definition_hex text,
  owner text, security_definer boolean, volatility text, configuration text[], acl text[])
),
storage_baseline as (
  -- Verified original export; PROPOSED, NOT approved. Never adopt live values.
  select false::boolean as baseline_approved,
    '6c5330a0c944c5d481ad1cd5e4d6147b02032b332e97501835de3b28bbe2ca04'::text as source_export_sha256,
    $proposed_storage${
  "acl": [
    "anon=arwd/supabase_storage_admin",
    "authenticated=arwd/supabase_storage_admin",
    "postgres=a*r*w*d*D*x*t*m*/supabase_storage_admin",
    "service_role=arwdDxtm/supabase_storage_admin",
    "supabase_storage_admin=a*r*w*d*D*x*t*m*/supabase_storage_admin"
  ],
  "owner": "supabase_storage_admin",
  "effective": {
    "anon": {
      "role_exists": true,
      "table_delete": true,
      "table_insert": true,
      "table_select": true,
      "table_update": true,
      "column_insert": true,
      "column_select": true,
      "column_update": true,
      "table_trigger": false,
      "table_truncate": false,
      "grantable_table": [
        false,
        false,
        false,
        false,
        false,
        false,
        false
      ],
      "table_references": false,
      "column_references": false
    },
    "authenticated": {
      "role_exists": true,
      "table_delete": true,
      "table_insert": true,
      "table_select": true,
      "table_update": true,
      "column_insert": true,
      "column_select": true,
      "column_update": true,
      "table_trigger": false,
      "table_truncate": false,
      "grantable_table": [
        false,
        false,
        false,
        false,
        false,
        false,
        false
      ],
      "table_references": false,
      "column_references": false
    }
  },
  "acl_is_null": false,
  "column_acls": [],
  "column_effective": [
    {
      "role": "anon",
      "column": "id",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "id",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "bucket_id",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "bucket_id",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "name",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "name",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "owner",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "owner",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "created_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "created_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "updated_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "updated_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "last_accessed_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "last_accessed_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "metadata",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "metadata",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "path_tokens",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "path_tokens",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "version",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "version",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "owner_id",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "owner_id",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "user_metadata",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "user_metadata",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "archived_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "archived_at",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "is_delete_marker",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "is_delete_marker",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "anon",
      "column": "is_versioned",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    },
    {
      "role": "authenticated",
      "column": "is_versioned",
      "insert": true,
      "select": true,
      "update": true,
      "references": false,
      "grantable_insert": false,
      "grantable_select": false,
      "grantable_update": false,
      "grantable_references": false
    }
  ]
}$proposed_storage$::jsonb as proposed_snapshot
),
storage_snapshot as (
  select c.oid,
    jsonb_build_object('owner', pg_catalog.pg_get_userbyid(c.relowner), 'acl_is_null', c.relacl is null,
      'acl', array(select a::text from pg_catalog.unnest(c.relacl) a order by a::text collate "C"),
      'column_acls', (select coalesce(jsonb_agg(jsonb_build_object('column', a.attname,
        'acl', array(select x::text from pg_catalog.unnest(a.attacl) x order by x::text collate "C")) order by a.attnum), '[]'::jsonb)
        from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attacl is not null),
      'column_effective', (select coalesce(jsonb_agg(jsonb_build_object(
        'column', a.attname, 'role', r.role_name,
        'select', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT'),
        'insert', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT'),
        'update', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE'),
        'references', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'REFERENCES'),
        'grantable_select', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT WITH GRANT OPTION'),
        'grantable_insert', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT WITH GRANT OPTION'),
        'grantable_update', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE WITH GRANT OPTION'),
        'grantable_references', pg_catalog.has_column_privilege(r.oid, c.oid, a.attnum, 'REFERENCES WITH GRANT OPTION')
      ) order by a.attnum, r.role_name), '[]'::jsonb)
        from pg_catalog.pg_attribute a cross join roles r
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and r.role_name in ('anon', 'authenticated')),
      'effective', (select jsonb_object_agg(r.role_name, jsonb_build_object(
        'role_exists', r.oid is not null,
        'table_select', pg_catalog.has_table_privilege(r.oid, c.oid, 'SELECT'),
        'table_insert', pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT'),
        'table_update', pg_catalog.has_table_privilege(r.oid, c.oid, 'UPDATE'),
        'table_delete', pg_catalog.has_table_privilege(r.oid, c.oid, 'DELETE'),
        'table_truncate', pg_catalog.has_table_privilege(r.oid, c.oid, 'TRUNCATE'),
        'table_references', pg_catalog.has_table_privilege(r.oid, c.oid, 'REFERENCES'),
        'table_trigger', pg_catalog.has_table_privilege(r.oid, c.oid, 'TRIGGER'),
        'column_select', pg_catalog.has_any_column_privilege(r.oid, c.oid, 'SELECT'),
        'column_insert', pg_catalog.has_any_column_privilege(r.oid, c.oid, 'INSERT'),
        'column_update', pg_catalog.has_any_column_privilege(r.oid, c.oid, 'UPDATE'),
        'column_references', pg_catalog.has_any_column_privilege(r.oid, c.oid, 'REFERENCES'),
        'grantable_table', jsonb_build_array(
          pg_catalog.has_table_privilege(r.oid, c.oid, 'SELECT WITH GRANT OPTION'),
          pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT WITH GRANT OPTION'),
          pg_catalog.has_table_privilege(r.oid, c.oid, 'UPDATE WITH GRANT OPTION'),
          pg_catalog.has_table_privilege(r.oid, c.oid, 'DELETE WITH GRANT OPTION'),
          pg_catalog.has_table_privilege(r.oid, c.oid, 'TRUNCATE WITH GRANT OPTION'),
          pg_catalog.has_table_privilege(r.oid, c.oid, 'REFERENCES WITH GRANT OPTION'),
          pg_catalog.has_table_privilege(r.oid, c.oid, 'TRIGGER WITH GRANT OPTION'))
      )) from roles r where r.role_name in ('anon', 'authenticated'))
    ) as snapshot
  from (values ('storage.objects')) e(name)
  left join pg_catalog.pg_class c on c.oid = pg_catalog.to_regclass(e.name)
),
postflight_additions(category, object_name, check_name, result, details) as (
  select 'storage'::text, 'storage.objects'::text, 'unchanged_grants'::text,
    case when s.oid is null then 'FAIL'
      when b.proposed_snapshot is null then 'REVIEW'
      when s.snapshot is distinct from b.proposed_snapshot then 'FAIL'
      when b.baseline_approved is distinct from true then 'REVIEW' else 'PASS' end,
    jsonb_build_object('actual_snapshot', s.snapshot,
      'snapshot_available', b.proposed_snapshot is not null,
      'baseline_approved', b.baseline_approved, 'source_export_sha256', b.source_export_sha256,
      'reason', 'Exact comparison to the verified pre-migration export covers owner, table ACL/null state, column ACLs, effective table/column rights and grant options for anon/authenticated. Mismatch FAILS; equality remains REVIEW pending explicit baseline acceptance. Unchanged SQL privileges do not establish RLS authorization.')
  from storage_snapshot s cross join storage_baseline b
  union all
  select 'storage_limitations', 'storage.objects.' || r.role_name, 'maintain_not_baselined',
    case when t.table_oid is null or r.oid is null then 'FAIL'
      when c.version_num >= 170000 then 'REVIEW' else 'PASS' end,
    jsonb_build_object('server_version_num', c.version_num,
      'effective_maintain', case when c.version_num >= 170000 then pg_catalog.has_table_privilege(r.oid, t.table_oid, 'MAINTAIN') else null::boolean end,
      'grantable_maintain', case when c.version_num >= 170000 then pg_catalog.has_table_privilege(r.oid, t.table_oid, 'MAINTAIN WITH GRANT OPTION') else null::boolean end,
      'reason', 'PostgreSQL 17+ MAINTAIN rights were not exported in the proposed baseline. Current observations are diagnostics, NOT adopted expectations; obtain reviewed pre-migration evidence. Before PostgreSQL 17 this privilege does not exist.')
  from tables t cross join roles r cross join platform c
  where t.relation_name = 'storage.objects' and r.role_name in ('anon', 'authenticated')
  union all
  select 'storage_limitations', 'role_membership_graph', 'full_graph_not_baselined', 'REVIEW',
    jsonb_build_object('reason', 'Effective rights include inherited/PUBLIC privileges at snapshot time. The complete role graph, SET ROLE routes and all role attributes were not captured. Existing bypass/owner checks remain separate; equal privileges do not prove an unchanged graph or row-level authorization.')
  union all
  select 'grants', t.relation_name || '.' || r.role_name, 'no_public_maintain_privilege',
    case when t.table_oid is null or r.oid is null then 'FAIL'
      when c.version_num >= 170000 then case
        when pg_catalog.has_table_privilege(r.oid, t.table_oid, 'MAINTAIN') is distinct from false
          or pg_catalog.has_table_privilege(r.oid, t.table_oid, 'MAINTAIN WITH GRANT OPTION') is distinct from false
          then 'FAIL' else 'PASS' end
      else 'PASS' end,
    jsonb_build_object('reason', 'The public-table final contract allows only authenticated SELECT and no anon privileges; MAINTAIN is not authorized. Before PostgreSQL 17 this privilege does not exist.')
  from tables t cross join roles r cross join platform c
  where t.relation_name <> 'storage.objects' and r.role_name in ('anon', 'authenticated')
  union all
  select 'grants', t.relation_name, 'no_authenticated_select_delegation',
    case when t.table_oid is null then 'FAIL'
      when pg_catalog.has_table_privilege('authenticated', t.table_oid, 'SELECT WITH GRANT OPTION') is distinct from false then 'FAIL'
      else 'PASS' end,
    jsonb_build_object('reason', 'Only ordinary SELECT was authorized, not delegation rights.')
  from tables t where t.relation_name <> 'storage.objects'
  union all
  select 'policies', t.relation_name, 'no_public_write_policies',
    case when t.table_oid is null then 'FAIL' when exists(select 1 from pg_catalog.pg_policy p
      where p.polrelid = t.table_oid and p.polcmd in ('a', 'w', 'd', '*')) then 'FAIL' else 'PASS' end,
    jsonb_build_object('reason', 'Supplied application baseline had no write policies; migration adds none. Managed Storage write policies are outside this check and its ACL must remain unchanged.')
  from tables t where t.relation_name <> 'storage.objects'
),
verified_helper_report(category, object_name, check_name, result, details) as (
  select 'verified_helpers'::text, h.signature, 'exact_bytes_metadata_acl_execute'::text,
    case when p.oid is null or p.prokind is distinct from 'f'
      or pg_catalog.encode(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8'), 'hex') is distinct from h.definition_hex
      or pg_catalog.md5(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8')) is distinct from h.md5
      or pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8')), 'hex') is distinct from h.sha256
      or pg_catalog.pg_get_userbyid(p.proowner)::text is distinct from h.owner
      or l.lanname::text is distinct from 'sql'
      or p.prosecdef is distinct from h.security_definer or p.provolatile::text is distinct from h.volatility
      or p.proconfig is distinct from h.configuration
      or array(select x::text from pg_catalog.unnest(p.proacl) x order by x::text collate "C")
        is distinct from array(select x from pg_catalog.unnest(h.acl) x order by x collate "C")
      or pg_catalog.to_regrole('anon') is null or pg_catalog.to_regrole('authenticated') is null
      or pg_catalog.to_regrole('service_role') is null
      or pg_catalog.has_function_privilege(pg_catalog.to_regrole('anon')::oid, p.oid, 'EXECUTE') is distinct from false
      or pg_catalog.has_function_privilege(pg_catalog.to_regrole('authenticated')::oid, p.oid, 'EXECUTE') is distinct from true
      or pg_catalog.has_function_privilege(pg_catalog.to_regrole('service_role')::oid, p.oid, 'EXECUTE') is distinct from true
      then 'FAIL' else 'PASS' end,
    jsonb_build_object('reference', 'STEP-7R17-VERIFIED-CURRENT-STATE',
      'expected_md5', h.md5,
      'actual_md5', pg_catalog.md5(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8')),
      'reason', 'Exact UTF-8 bytes, MD5/SHA256, SQL language, owner, definer, volatility, complete configuration, ACL and effective EXECUTE. No normalization, helper calls or automatic baseline adoption.')
  from verified_helper_reference h
  left join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(h.signature)
  left join pg_catalog.pg_language l on l.oid = p.prolang
  union all
  select 'policies', t.relation_name, 'unexpected_permissive_select_all',
    case when t.table_oid is null then 'FAIL' when exists (
      select 1 from pg_catalog.pg_policy p where p.polrelid = t.table_oid
        and p.polcmd in ('r', '*') and p.polpermissive and p.polname <> t.policy_name
    ) then 'FAIL' else 'PASS' end,
    jsonb_build_object('reason', 'Fails closed on any additional permissive SELECT/ALL policy, regardless of current role applicability.')
  from tables t
  union all
  select 'policy_metadata', t.relation_name || '.' || p.polname, 'select_all_role_applicability',
    case when p.polname = t.policy_name then 'PASS' else 'FAIL' end,
    jsonb_build_object('command', p.polcmd, 'permissive', p.polpermissive,
      'roles', array(select case when r = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(r)::text end
        from pg_catalog.unnest(p.polroles) r order by r),
      'applies_to_authenticated', exists(select 1 from pg_catalog.unnest(p.polroles) r where
        case when r = 0 then true else pg_catalog.pg_has_role('authenticated'::regrole::oid, r, 'USAGE') end),
      'applies_to_anon', exists(select 1 from pg_catalog.unnest(p.polroles) r where
        case when r = 0 then true else pg_catalog.pg_has_role('anon'::regrole::oid, r, 'USAGE') end),
      'reason', 'Metadata inventory only; exact six baseline comparisons separately control PASS. All unexpected SELECT/ALL policies fail the fixed six-policy contract, including restrictive policies.')
  from tables t join pg_catalog.pg_policy p on p.polrelid = t.table_oid where p.polcmd in ('r', '*')
),
report(category, object_name, check_name, result, details) as (
  select 'scope'::text, 'envario-security-test'::text, 'reference_and_execution_approval'::text, 'REVIEW'::text,
    jsonb_build_object('project_ref', 'gkhrtrakukqdhgvucudv',
      'reference', 'Independently derived R13 original AND R8 restriction; exact helper bytes from verified R17',
      'historical_provenance_verified', false, 'execution_approved', false,
      'reason', 'Verify target/hash manually. Postflight PASS is not authorization to enable application access.')
  union all
  select 'baseline', relation_name || '.' || policy_name, 'exact_expected_postmigration_predicate',
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
    'FAIL',
    jsonb_build_object('command', p.polcmd, 'permissive', p.polpermissive,
      'reason', 'Any additional SELECT/ALL policy differs from the fixed reviewed contract, regardless of mode or role applicability.')
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
  select 'grants', t.relation_name || '.' || r.role_name, 'authenticated_select_only_anon_denied',
    case when t.table_oid is null or r.oid is null then 'FAIL'
      when r.role_name = 'authenticated' then case
        when pg_catalog.has_table_privilege(r.oid, t.table_oid, 'SELECT') is distinct from true
          or pg_catalog.has_table_privilege(r.oid, t.table_oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') is distinct from false
          or pg_catalog.has_any_column_privilege(r.oid, t.table_oid, 'INSERT,UPDATE,REFERENCES') is distinct from false
          then 'FAIL' else 'PASS' end
      when pg_catalog.has_table_privilege(r.oid, t.table_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') is distinct from false
        or pg_catalog.has_any_column_privilege(r.oid, t.table_oid, 'SELECT,INSERT,UPDATE,REFERENCES') is distinct from false then 'FAIL' else 'PASS' end,
    jsonb_build_object('reason', 'After migration, authenticated requires table SELECT only on these five tables; anon must remain denied. Baseline had zero privileges. Any effective writes or other ordinary table/column privileges FAIL.')
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
  select 'helpers', h.signature, 'unchanged_reviewed_helper',
    case when h.oid is null then 'FAIL' when h.expected_body_md5 is null then 'REVIEW'
      when h.expected_body_md5 = md5(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(h.oid), 'UTF8')) then 'PASS' else 'FAIL' end,
    jsonb_build_object('actual_body_md5', md5(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(h.oid), 'UTF8')),
      'expected_body_md5', h.expected_body_md5,
      'reason', 'Expected fingerprint comes from the byte-verified Step 7R.17 CURRENT-state artifact. Separate exact UTF-8 hex and metadata checks must also PASS; no live value is adopted.')
  from helpers h
  union all
  select 'helpers', 'postgres', 'membership_read_without_recursive_rls',
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
    jsonb_build_object('reason', 'Resolve all FAIL, proposed Storage baseline approval and unbaselined MAINTAIN/role-graph REVIEW items. Static policy matches do not replace live synthetic role-based tests. Keep application reads/writes disabled.')
)
select category, object_name, check_name, result, details
from (select * from report union all select * from verified_helper_report union all select * from postflight_additions) consolidated
order by category, object_name, check_name, details::text;
rollback;
