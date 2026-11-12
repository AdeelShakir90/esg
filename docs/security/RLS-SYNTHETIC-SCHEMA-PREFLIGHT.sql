-- REVIEW ONLY: do not run without separate read-only execution approval.
-- Confirm envario-security-test / gkhrtrakukqdhgvucudv manually. No individual rows output.
-- Aggregate counts depend on executor visibility; an empty count is not fixture proof.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
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
  union all
  select 'aggregate_count', 'public.documents', jsonb_build_object('count', count(*)) from public.documents
  union all
  select 'aggregate_count', 'public.esg_extractions', jsonb_build_object('count', count(*)) from public.esg_extractions
  union all
  select 'aggregate_count', 'public.extracted_esg_fields', jsonb_build_object('count', count(*)) from public.extracted_esg_fields
  union all
  select 'aggregate_count', 'storage.objects.documents', jsonb_build_object('count', count(*)) from storage.objects where bucket_id = 'documents'
)
select category, object_name, 'REVIEW'::text as result, details from report order by category, object_name;
rollback;
