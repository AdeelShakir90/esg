-- READ-ONLY ADMISSION. Run on envario-security-test / gkhrtrakukqdhgvucudv.
-- Private UUID parameters are deliberately unset. This check emits no identity values.
-- Catalog reference: rls-synthetic-schema-preflight-results.csv, 115 non-count rows.
-- Export SHA-256: 5D3BBB93ED532E661D0BE9F0099126A09F0CC9966B539944BC73C3388792AE7F.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;

do $admission$
declare
  target_confirmed boolean := false;
  org_a uuid := null;
  org_b uuid := null;
  owner_a uuid := null;
  reviewer_a uuid := null;
  owner_b uuid := null;
  member_a uuid := null;
  suspended_a uuid := null;
  outsider uuid := null;
  personas uuid[];
  a1 constant uuid := '70170000-0000-4000-8000-000000000001';
  b1 constant uuid := '70170000-0000-4000-8000-000000000002';
  u1 constant uuid := '70170000-0000-4000-8000-000000000003';
begin
  personas := array[owner_a, reviewer_a, owner_b, member_a, suspended_a, outsider];
  if target_confirmed is distinct from true or org_a is null or org_b is null or org_a = org_b
    or (select count(distinct p.id) from unnest(personas) as p(id)) <> 6 then
    raise exception 'STOP: confirmed target, two organizations and six distinct existing Auth IDs required';
  end if;

  if current_user <> 'postgres' or exists (
    select 1 from (values ('auth.users'), ('public.documents'), ('public.organizations'),
      ('public.organization_memberships'), ('public.esg_extractions'),
      ('public.extracted_esg_fields'), ('storage.buckets'), ('storage.objects')) r(name)
    where to_regclass(r.name) is null
      or pg_catalog.row_security_active(to_regclass(r.name)) is distinct from false
  ) then
    raise exception 'STOP: postgres inspection context with complete row visibility required';
  end if;

  -- Exact catalog comparison to the reviewed 115 non-count rows of the schema export.
  if exists (
with targets(name) as (values ('public.documents'), ('public.organizations'),
  ('public.organization_memberships'), ('public.esg_extractions'), ('public.extracted_esg_fields'), ('storage.objects')),
report(category, object_name, details) as (
  select 'column'::text, t.name || '.' || a.attname,
    jsonb_build_object('type', pg_catalog.format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
      'identity', a.attidentity, 'generated', a.attgenerated,
      'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid))
  from targets t join pg_catalog.pg_attribute a on a.attrelid = pg_catalog.to_regclass(t.name)
    and a.attnum > 0 and not a.attisdropped
  left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  union all
  select 'constraint', t.name || '.' || c.conname,
    jsonb_build_object('type', c.contype, 'validated', c.convalidated, 'definition', pg_catalog.pg_get_constraintdef(c.oid))
  from targets t join pg_catalog.pg_constraint c on c.conrelid = pg_catalog.to_regclass(t.name)
  union all
  select 'inbound_foreign_key', c.conrelid::regclass::text || '.' || c.conname,
    jsonb_build_object('referenced_table', t.name, 'definition', pg_catalog.pg_get_constraintdef(c.oid),
      'reason', 'Review all inbound dependencies/cascades before fixture cleanup approval.')
  from targets t join pg_catalog.pg_constraint c on c.confrelid = pg_catalog.to_regclass(t.name) and c.contype = 'f'
  union all
  select 'trigger', t.name || '.' || tr.tgname,
    jsonb_build_object('enabled', tr.tgenabled, 'function', tr.tgfoid::regprocedure::text,
      'reason', 'Review side effects before approving fixture INSERT/DELETE; no trigger is invoked here.')
  from targets t join pg_catalog.pg_trigger tr on tr.tgrelid = pg_catalog.to_regclass(t.name) and not tr.tgisinternal
  union all
  select 'table', t.name, jsonb_build_object('exists', c.oid is not null, 'rls', c.relrowsecurity,
    'force_rls', c.relforcerowsecurity, 'owner', pg_catalog.pg_get_userbyid(c.relowner))
  from targets t left join pg_catalog.pg_class c on c.oid = pg_catalog.to_regclass(t.name)
), expected as (
  select * from pg_catalog.jsonb_to_recordset($reviewed_schema$
[{"category":"column","object_name":"public.documents.created_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.extracted_at","details":{"type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.documents.extracted_text","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.documents.extraction_error","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.documents.extraction_status","details":{"type":"text","default":"'pending'::text","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.file_name","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.file_size","details":{"type":"bigint","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.file_type","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.id","details":{"type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.organization_id","details":{"type":"uuid","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.documents.page_count","details":{"type":"integer","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.documents.parser_version","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.documents.status","details":{"type":"text","default":"'uploaded'::text","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.storage_path","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.documents.uploaded_by","details":{"type":"uuid","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.completed_at","details":{"type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.created_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.document_id","details":{"type":"uuid","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.error","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.id","details":{"type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.model","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.prompt_version","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.provider","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.schema_version","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.source_extracted_at","details":{"type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.source_parser_version","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.esg_extractions.status","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.category","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.confidence","details":{"type":"numeric","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.created_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.evidence_page","details":{"type":"integer","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.evidence_quote","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.extraction_id","details":{"type":"uuid","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.field_key","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.id","details":{"type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.label","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.reporting_period_end","details":{"type":"date","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.reporting_period_label","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.reporting_period_start","details":{"type":"date","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.status","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.unit","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.updated_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.validated_value","details":{"type":"jsonb","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.validation_status","details":{"type":"text","default":"'pending'::text","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.extracted_esg_fields.value","details":{"type":"jsonb","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"public.organization_memberships.created_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organization_memberships.id","details":{"type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organization_memberships.organization_id","details":{"type":"uuid","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organization_memberships.role","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organization_memberships.status","details":{"type":"text","default":"'invited'::text","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organization_memberships.updated_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organization_memberships.user_id","details":{"type":"uuid","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organizations.created_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organizations.created_by","details":{"type":"uuid","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organizations.id","details":{"type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organizations.name","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organizations.slug","details":{"type":"text","default":null,"identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"public.organizations.updated_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"storage.objects.archived_at","details":{"type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.bucket_id","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.created_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.id","details":{"type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"storage.objects.is_delete_marker","details":{"type":"boolean","default":"false","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"storage.objects.is_versioned","details":{"type":"boolean","default":"false","identity":"","not_null":true,"generated":""}},
{"category":"column","object_name":"storage.objects.last_accessed_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.metadata","details":{"type":"jsonb","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.name","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.owner","details":{"type":"uuid","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.owner_id","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.path_tokens","details":{"type":"text[]","default":"string_to_array(name, '/'::text)","identity":"","not_null":false,"generated":"s"}},
{"category":"column","object_name":"storage.objects.updated_at","details":{"type":"timestamp with time zone","default":"now()","identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.user_metadata","details":{"type":"jsonb","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"column","object_name":"storage.objects.version","details":{"type":"text","default":null,"identity":"","not_null":false,"generated":""}},
{"category":"constraint","object_name":"public.documents.documents_organization_id_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT"}},
{"category":"constraint","object_name":"public.documents.documents_pkey","details":{"type":"p","validated":true,"definition":"PRIMARY KEY (id)"}},
{"category":"constraint","object_name":"public.documents.documents_uploaded_by_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL"}},
{"category":"constraint","object_name":"public.esg_extractions.esg_extractions_completion_check","details":{"type":"c","validated":true,"definition":"CHECK ((((status = 'processing'::text) AND (completed_at IS NULL) AND (error IS NULL)) OR ((status = 'completed'::text) AND (completed_at IS NOT NULL) AND (error IS NULL)) OR ((status = 'failed'::text) AND (completed_at IS NOT NULL) AND (error IS NOT NULL))))"}},
{"category":"constraint","object_name":"public.esg_extractions.esg_extractions_document_id_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE"}},
{"category":"constraint","object_name":"public.esg_extractions.esg_extractions_pkey","details":{"type":"p","validated":true,"definition":"PRIMARY KEY (id)"}},
{"category":"constraint","object_name":"public.esg_extractions.esg_extractions_status_check","details":{"type":"c","validated":true,"definition":"CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])))"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_category_check","details":{"type":"c","validated":true,"definition":"CHECK ((category = ANY (ARRAY['environmental'::text, 'social'::text, 'governance'::text])))"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_confidence_check","details":{"type":"c","validated":true,"definition":"CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))))"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_extraction_id_field_key_key","details":{"type":"u","validated":true,"definition":"UNIQUE (extraction_id, field_key)"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_extraction_id_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (extraction_id) REFERENCES public.esg_extractions(id) ON DELETE CASCADE"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_field_key_check","details":{"type":"c","validated":true,"definition":"CHECK ((field_key = ANY (ARRAY['electricity_consumption'::text, 'renewable_electricity_share'::text, 'natural_gas_consumption'::text, 'scope_1_emissions'::text, 'scope_2_emissions'::text, 'water_consumption'::text, 'waste_generated'::text, 'recycling_recovery_rate'::text, 'employee_count'::text, 'employee_training_hours_total'::text, 'supplier_code_of_conduct'::text, 'anti_corruption_policy'::text])))"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_page_check","details":{"type":"c","validated":true,"definition":"CHECK ((evidence_page IS NULL))"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_pkey","details":{"type":"p","validated":true,"definition":"PRIMARY KEY (id)"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_status_check","details":{"type":"c","validated":true,"definition":"CHECK ((status = ANY (ARRAY['found'::text, 'not_found'::text])))"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_status_data_check","details":{"type":"c","validated":true,"definition":"CHECK ((((status = 'found'::text) AND (value IS NOT NULL) AND (confidence IS NOT NULL) AND (evidence_quote IS NOT NULL)) OR ((status = 'not_found'::text) AND (value IS NULL) AND (unit IS NULL) AND (reporting_period_label IS NULL) AND (reporting_period_start IS NULL) AND (reporting_period_end IS NULL) AND (confidence IS NULL) AND (evidence_quote IS NULL))))"}},
{"category":"constraint","object_name":"public.extracted_esg_fields.extracted_esg_fields_validation_status_check","details":{"type":"c","validated":true,"definition":"CHECK ((validation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'edited'::text])))"}},
{"category":"constraint","object_name":"public.organization_memberships.organization_memberships_organization_id_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE"}},
{"category":"constraint","object_name":"public.organization_memberships.organization_memberships_organization_id_user_id_key","details":{"type":"u","validated":true,"definition":"UNIQUE (organization_id, user_id)"}},
{"category":"constraint","object_name":"public.organization_memberships.organization_memberships_pkey","details":{"type":"p","validated":true,"definition":"PRIMARY KEY (id)"}},
{"category":"constraint","object_name":"public.organization_memberships.organization_memberships_role_check","details":{"type":"c","validated":true,"definition":"CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'reviewer'::text, 'member'::text])))"}},
{"category":"constraint","object_name":"public.organization_memberships.organization_memberships_status_check","details":{"type":"c","validated":true,"definition":"CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text])))"}},
{"category":"constraint","object_name":"public.organization_memberships.organization_memberships_user_id_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE"}},
{"category":"constraint","object_name":"public.organizations.organizations_created_by_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT"}},
{"category":"constraint","object_name":"public.organizations.organizations_name_check","details":{"type":"c","validated":true,"definition":"CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 200)))"}},
{"category":"constraint","object_name":"public.organizations.organizations_pkey","details":{"type":"p","validated":true,"definition":"PRIMARY KEY (id)"}},
{"category":"constraint","object_name":"public.organizations.organizations_slug_check","details":{"type":"c","validated":true,"definition":"CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text))"}},
{"category":"constraint","object_name":"public.organizations.organizations_slug_key","details":{"type":"u","validated":true,"definition":"UNIQUE (slug)"}},
{"category":"constraint","object_name":"storage.objects.objects_bucketId_fkey","details":{"type":"f","validated":true,"definition":"FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)"}},
{"category":"constraint","object_name":"storage.objects.objects_pkey","details":{"type":"p","validated":true,"definition":"PRIMARY KEY (id)"}},
{"category":"inbound_foreign_key","object_name":"public.documents.documents_organization_id_fkey","details":{"reason":"Review all inbound dependencies/cascades before fixture cleanup approval.","definition":"FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT","referenced_table":"public.organizations"}},
{"category":"inbound_foreign_key","object_name":"public.esg_extractions.esg_extractions_document_id_fkey","details":{"reason":"Review all inbound dependencies/cascades before fixture cleanup approval.","definition":"FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE","referenced_table":"public.documents"}},
{"category":"inbound_foreign_key","object_name":"public.extracted_esg_fields.extracted_esg_fields_extraction_id_fkey","details":{"reason":"Review all inbound dependencies/cascades before fixture cleanup approval.","definition":"FOREIGN KEY (extraction_id) REFERENCES public.esg_extractions(id) ON DELETE CASCADE","referenced_table":"public.esg_extractions"}},
{"category":"inbound_foreign_key","object_name":"public.organization_memberships.organization_memberships_organization_id_fkey","details":{"reason":"Review all inbound dependencies/cascades before fixture cleanup approval.","definition":"FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE","referenced_table":"public.organizations"}},
{"category":"table","object_name":"public.documents","details":{"rls":true,"owner":"postgres","exists":true,"force_rls":false}},
{"category":"table","object_name":"public.esg_extractions","details":{"rls":true,"owner":"postgres","exists":true,"force_rls":false}},
{"category":"table","object_name":"public.extracted_esg_fields","details":{"rls":true,"owner":"postgres","exists":true,"force_rls":false}},
{"category":"table","object_name":"public.organization_memberships","details":{"rls":true,"owner":"postgres","exists":true,"force_rls":false}},
{"category":"table","object_name":"public.organizations","details":{"rls":true,"owner":"postgres","exists":true,"force_rls":false}},
{"category":"table","object_name":"storage.objects","details":{"rls":true,"owner":"supabase_storage_admin","exists":true,"force_rls":false}},
{"category":"trigger","object_name":"storage.objects.protect_objects_delete","details":{"reason":"Review side effects before approving fixture INSERT/DELETE; no trigger is invoked here.","enabled":"O","function":"storage.protect_delete()"}},
{"category":"trigger","object_name":"storage.objects.update_objects_updated_at","details":{"reason":"Review side effects before approving fixture INSERT/DELETE; no trigger is invoked here.","enabled":"O","function":"storage.update_updated_at_column()"}}]
$reviewed_schema$::jsonb) as e(category text, object_name text, details jsonb)
)
    (select * from report except all select * from expected)
    union all
    (select * from expected except all select * from report)
  ) then
    raise exception 'STOP: schema, constraints, RLS, ownership or trigger metadata differ from the reviewed export';
  end if;

  if not exists (
    select 1 from storage.buckets b where b.id = 'documents' and b.public is false
      and b.file_size_limit = 5242880 and b.allowed_mime_types = array['application/pdf']::text[]
  ) then
    raise exception 'STOP: expected private PDF-only 5 MiB documents bucket missing or changed';
  end if;

  if exists (select 1 from public.documents)
    or exists (select 1 from public.esg_extractions)
    or exists (select 1 from public.extracted_esg_fields)
    or exists (select 1 from storage.objects where bucket_id = 'documents') then
    raise exception 'STOP: fresh document/extraction/field/Storage baseline is not zero';
  end if;

  if (select count(*) from auth.users where id = any(personas)) <> 6 then
    raise exception 'STOP: missing Auth parents for the private manifest';
  end if;
  if (select count(*) from public.organizations where id in (org_a, org_b)) <> 2 then
    raise exception 'STOP: missing organization parents';
  end if;
  if exists (
    select 1 from (values (org_a, owner_a, 'owner', 'active'), (org_a, reviewer_a, 'reviewer', 'active'),
      (org_b, owner_b, 'owner', 'active'), (org_a, member_a, 'member', 'active'),
      (org_a, suspended_a, 'member', 'suspended')) as e(org_id, user_id, role_name, status_name)
    where (select count(*) from public.organization_memberships m where m.organization_id = e.org_id
      and m.user_id = e.user_id and m.role::text = e.role_name and m.status::text = e.status_name) <> 1
  ) or (select count(*) from public.organization_memberships
    where organization_id in (org_a, org_b) and user_id = any(personas)) <> 5 then
    raise exception 'STOP: membership matrix differs, including possible outsider or cross-organization membership';
  end if;

  if exists (select 1 from public.documents where id in (a1, b1, u1))
    or exists (select 1 from public.esg_extractions where id in
      ('71170000-0000-4000-8000-000000000001', '71170000-0000-4000-8000-000000000002', '71170000-0000-4000-8000-000000000003'))
    or exists (select 1 from public.extracted_esg_fields where id in
      ('72170000-0000-4000-8000-000000000001', '72170000-0000-4000-8000-000000000002', '72170000-0000-4000-8000-000000000003')) then
    raise exception 'STOP: reserved public fixture ID already exists';
  end if;

  if exists (select 1 from storage.objects where bucket_id = 'documents' and name in (
    org_a::text || '/' || a1::text || '.pdf', org_b::text || '/' || b1::text || '.pdf',
    org_a::text || '/' || u1::text || '.pdf', org_a::text || '/70170000-0000-4000-8000-000000000099.pdf',
    org_b::text || '/' || a1::text || '.pdf', org_a::text || '/' || a1::text || '.pdf/extra',
    'legacy-security-review/' || a1::text || '.pdf', 'malformed-prefix/' || a1::text || '.pdf',
    org_a::text || '/not-a-uuid.pdf', org_a::text || '/' || a1::text || '.txt')) then
    raise exception 'STOP: reserved Storage path already exists';
  end if;
end;
$admission$;

select 'PASS'::text as result,
  (select count(*) from public.documents) as documents,
  (select count(*) from public.esg_extractions) as esg_extractions,
  (select count(*) from public.extracted_esg_fields) as extracted_fields,
  (select count(*) from storage.objects where bucket_id = 'documents') as document_objects,
  6 as verified_personas,
  'MATCH'::text as reviewed_schema,
  'PRIVATE_PDF_ONLY_5_MIB'::text as documents_bucket,
  'CLEAR'::text as reserved_ids_and_paths;
rollback;
