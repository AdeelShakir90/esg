-- Read-only validation for the approved A1/B1/U1 fixture batch.
-- Confirm gkhrtrakukqdhgvucudv and use the same private mappings as setup.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;

with inputs as (
  select false as target_confirmed, false as expect_uploaded_objects,
    null::uuid as org_a, null::uuid as org_b,
    null::uuid as owner_a, null::uuid as owner_b
), manifest as (
  select f.*, folder::text || '/' || doc_id::text || '.pdf' as object_path
  from inputs i
  cross join lateral (values
    ('A1', '70170000-0000-4000-8000-000000000001'::uuid,
      '71170000-0000-4000-8000-000000000001'::uuid, '72170000-0000-4000-8000-000000000001'::uuid,
      i.org_a, i.owner_a, i.org_a),
    ('B1', '70170000-0000-4000-8000-000000000002'::uuid,
      '71170000-0000-4000-8000-000000000002'::uuid, '72170000-0000-4000-8000-000000000002'::uuid,
      i.org_b, i.owner_b, i.org_b),
    ('U1', '70170000-0000-4000-8000-000000000003'::uuid,
      '71170000-0000-4000-8000-000000000003'::uuid, '72170000-0000-4000-8000-000000000003'::uuid,
      null::uuid, null::uuid, i.org_a)
  ) f(label, doc_id, extraction_id, field_id, org_id, uploader, folder)
), counts as (
  select
    (select count(*) from public.documents) as documents,
    (select count(*) from public.esg_extractions) as extractions,
    (select count(*) from public.extracted_esg_fields) as fields,
    (select count(*) from storage.objects where bucket_id = 'documents') as document_objects
), checks as (
  select m.label,
    (d.id is not null and d.organization_id is not distinct from m.org_id
      and d.uploaded_by is not distinct from m.uploader
      and d.file_name = 'security-synthetic-' || m.label || '.pdf'
      and d.storage_path = m.object_path and d.file_type = 'application/pdf'
      and d.file_size = 1638 and d.status = 'uploaded' and d.extraction_status = 'pending') as document_matches,
    (e.id is not null and e.document_id = m.doc_id and e.status = 'completed'
      and e.schema_version = 'security-synthetic-v1' and e.provider = 'synthetic-no-api'
      and e.model = 'synthetic-no-model' and e.prompt_version = 'security-review-v1'
      and e.completed_at is not null and e.error is null) as extraction_matches,
    (f.id is not null and f.extraction_id = m.extraction_id and f.field_key = 'electricity_consumption'
      and f.label = 'Synthetic security fixture only' and f.category = 'environmental'
      and f.status = 'not_found' and f.value is null and f.evidence_quote is null
      and f.evidence_page is null and f.validation_status = 'pending') as field_matches,
    (select count(*) from storage.objects o where o.bucket_id = 'documents' and o.name = m.object_path) as path_count
  from manifest m
  left join public.documents d on d.id = m.doc_id
  left join public.esg_extractions e on e.id = m.extraction_id
  left join public.extracted_esg_fields f on f.id = m.field_id
)
select c.label,
  case when i.target_confirmed is true and current_user = 'postgres'
    and i.org_a is not null and i.org_b is not null and i.org_a <> i.org_b
    and i.owner_a is not null and i.owner_b is not null and i.owner_a <> i.owner_b
    and not exists (
      select 1 from (values ('public.documents'), ('public.esg_extractions'),
        ('public.extracted_esg_fields'), ('storage.objects'), ('storage.buckets')) t(name)
      where pg_catalog.row_security_active(t.name::regclass)
    )
    and exists (select 1 from storage.buckets b where b.id = 'documents' and b.public is false
      and b.file_size_limit = 5242880 and b.allowed_mime_types = array['application/pdf']::text[])
    and c.document_matches is true and c.extraction_matches is true and c.field_matches is true
    and n.documents = 3 and n.extractions = 3 and n.fields = 3
    and c.path_count = case when i.expect_uploaded_objects then 1 else 0 end
    and n.document_objects = case when i.expect_uploaded_objects then 3 else 0 end
    then 'PASS' else 'FAIL' end as result,
  c.document_matches, c.extraction_matches, c.field_matches, c.path_count,
  n.documents, n.extractions, n.fields, n.document_objects
from checks c cross join counts n cross join inputs i
order by c.label;

rollback;
