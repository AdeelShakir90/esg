-- Private operator review for envario-security-test / gkhrtrakukqdhgvucudv.
-- Use existing Auth UUIDs only after confirming each account's synthetic provenance.
-- Export only the result grid. Keep the populated query and identity mapping private.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;

with scope as (
  select false as target_confirmed, null::uuid as org_a, null::uuid as org_b
),
manifest(persona, user_id, org_slot, expected_role, expected_status) as (
  values
    ('owner_a', null::uuid, 'A', 'owner', 'active'),
    ('reviewer_a', null::uuid, 'A', 'reviewer', 'active'),
    ('owner_b', null::uuid, 'B', 'owner', 'active'),
    ('member_a', null::uuid, 'A', 'member', 'active'),
    ('suspended_a', null::uuid, 'A', 'member', 'suspended'),
    ('outsider', null::uuid, null, null, null)
),
context as (
  select s.*,
    s.org_a is distinct from s.org_b and
    (select count(*) from public.organizations where id in (s.org_a, s.org_b)) = 2 as organizations_verified
  from scope s
)
select m.persona,
  case
    when c.target_confirmed is distinct from true then 'TARGET_UNCONFIRMED'
    when m.user_id is null then 'UNMAPPED'
    when (select count(*) from manifest d where d.user_id = m.user_id) <> 1 then 'DUPLICATE_MAPPING'
    when not exists (select 1 from auth.users u where u.id = m.user_id) then 'AUTH_PARENT_MISSING'
    when c.organizations_verified is distinct from true then 'ORGANIZATION_MAPPING_UNVERIFIED'
    when (select count(*) from public.organization_memberships mm
      where mm.user_id = m.user_id and mm.organization_id in (c.org_a, c.org_b))
      <> case when m.org_slot is null then 0 else 1 end then 'MEMBERSHIP_COUNT_MISMATCH'
    when m.org_slot is not null and not exists (
      select 1 from public.organization_memberships mm
      where mm.user_id = m.user_id
        and mm.organization_id = case m.org_slot when 'A' then c.org_a else c.org_b end
        and mm.role::text = m.expected_role and mm.status::text = m.expected_status
    ) then 'ROLE_OR_STATUS_MISMATCH'
    else 'VERIFIED'
  end as result
from manifest m cross join context c
order by m.persona;

rollback;
