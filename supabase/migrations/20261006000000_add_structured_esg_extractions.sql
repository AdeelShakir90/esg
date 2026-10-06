begin;

create table if not exists public.esg_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null check (status in ('processing', 'completed', 'failed')),
  schema_version text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  source_parser_version text,
  source_extracted_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  constraint esg_extractions_completion_check check (
    (status = 'processing' and completed_at is null and error is null)
    or (status = 'completed' and completed_at is not null and error is null)
    or (status = 'failed' and completed_at is not null and error is not null)
  )
);

create index if not exists esg_extractions_document_created_idx
  on public.esg_extractions (document_id, created_at desc);

create table if not exists public.extracted_esg_fields (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references public.esg_extractions(id) on delete cascade,
  field_key text not null check (field_key in (
    'electricity_consumption',
    'renewable_electricity_share',
    'natural_gas_consumption',
    'scope_1_emissions',
    'scope_2_emissions',
    'water_consumption',
    'waste_generated',
    'recycling_recovery_rate',
    'employee_count',
    'employee_training_hours_total',
    'supplier_code_of_conduct',
    'anti_corruption_policy'
  )),
  label text not null,
  category text not null check (category in ('environmental', 'social', 'governance')),
  status text not null check (status in ('found', 'not_found')),
  value jsonb,
  unit text,
  reporting_period_label text,
  reporting_period_start date,
  reporting_period_end date,
  confidence numeric,
  evidence_quote text,
  evidence_page integer,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'approved', 'rejected', 'edited')),
  validated_value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (extraction_id, field_key),
  constraint extracted_esg_fields_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint extracted_esg_fields_page_check check (evidence_page is null),
  constraint extracted_esg_fields_status_data_check check (
    (
      status = 'found'
      and value is not null
      and confidence is not null
      and evidence_quote is not null
    )
    or (
      status = 'not_found'
      and value is null
      and unit is null
      and reporting_period_label is null
      and reporting_period_start is null
      and reporting_period_end is null
      and confidence is null
      and evidence_quote is null
    )
  )
);

create index if not exists extracted_esg_fields_extraction_idx
  on public.extracted_esg_fields (extraction_id);

alter table public.esg_extractions enable row level security;
alter table public.extracted_esg_fields enable row level security;

commit;
