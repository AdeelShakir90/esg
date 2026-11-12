-- STEP 7R.8 REVIEW DRAFT. NOT APPLIED.
-- ONLY envario-security-test / gkhrtrakukqdhgvucudv, after separate approval.
-- Supersedes the UNAPPLIED 20261109000000 draft: do NOT execute both.
-- One atomic transaction: SELECT grants + four protected policies + two metadata
-- policies. No write, anon, Storage grant, data, helper, or application changes.
-- Local preparation is not permission to connect or execute. See STEP-7R8-REVIEW.md.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Prevent concurrent policy DDL between the checks and ALTER operations.
-- Test-project maintenance window only: these locks briefly block table reads.
lock table public.documents, public.esg_extractions,
  public.extracted_esg_fields, public.organizations,
  public.organization_memberships, storage.objects in access exclusive mode;

-- Privilege baseline must match the reviewed no-access state. Unexpected grants
-- abort rather than being silently revoked or normalized by this migration.
do $grant_baseline$
declare
  relation_oid oid;
  role_oid oid;
begin
  if not pg_catalog.has_schema_privilege('authenticated', 'public', 'USAGE') then
    raise exception 'public schema USAGE missing; separate review required';
  end if;
  foreach role_oid in array array['authenticated'::regrole::oid, 'anon'::regrole::oid] loop
    if exists (select 1 from pg_catalog.pg_roles where oid = role_oid and (rolsuper or rolbypassrls)) then
      raise exception 'Application role has RLS bypass attributes';
    end if;
    foreach relation_oid in array array[
      'public.documents'::regclass::oid, 'public.organizations'::regclass::oid,
      'public.organization_memberships'::regclass::oid,
      'public.esg_extractions'::regclass::oid, 'public.extracted_esg_fields'::regclass::oid
    ] loop
      if pg_catalog.pg_has_role(role_oid, (select relowner from pg_catalog.pg_class where oid = relation_oid), 'MEMBER') then
        raise exception 'Application role owns or is a member of an application table owner role';
      end if;
      if pg_catalog.has_table_privilege(role_oid, relation_oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         or pg_catalog.has_any_column_privilege(role_oid, relation_oid, 'INSERT,UPDATE,REFERENCES') then
        raise exception 'Unexpected effective non-SELECT privilege on %', relation_oid::regclass;
      end if;
      if pg_catalog.has_table_privilege(role_oid, relation_oid, 'SELECT')
         or pg_catalog.has_any_column_privilege(role_oid, relation_oid, 'SELECT') then
        raise exception 'Expected no prior application SELECT grants; reconcile changed state first';
      end if;
    end loop;
  end loop;
end;
$grant_baseline$;

-- These are the ONLY new privileges. No ALL TABLES/default/schema/Storage grants.
-- The following R7 preconditions now see the required SELECT rights. Nothing is
-- visible to other sessions until COMMIT; every later failure rolls grants back.
grant select on table public.documents, public.organizations,
  public.organization_memberships, public.esg_extractions,
  public.extracted_esg_fields to authenticated;

-- Abort on known structural hazards instead of silently creating missing state.
do $preconditions$
declare
  target record;
  relation_oid oid;
  predicate_oid oid;
  path_setting_count integer;
  configured_path text;
  original_path text := pg_catalog.current_setting('search_path');
begin
  foreach relation_oid in array array[
    'public.documents'::regclass::oid,
    'public.esg_extractions'::regclass::oid,
    'public.extracted_esg_fields'::regclass::oid,
    'public.organization_memberships'::regclass::oid,
    'public.organizations'::regclass::oid,
    'storage.objects'::regclass::oid
  ] loop
    if not (select relrowsecurity from pg_catalog.pg_class where oid = relation_oid) then
      raise exception 'Required RLS flag missing on %', relation_oid::regclass;
    end if;
  end loop;

  -- Definer ownership alone does not establish a nonrecursive membership read.
  -- The reviewed helpers query this table; their postgres execution identity
  -- must bypass its RLS (or own it without FORCE RLS). No bypass is granted here.
  if not exists (
    select 1 from pg_catalog.pg_roles r
    join pg_catalog.pg_class c on c.oid = 'public.organization_memberships'::regclass
    where r.oid = 'postgres'::regrole
      and (r.rolsuper or r.rolbypassrls
        or (c.relowner = r.oid and not c.relforcerowsecurity))
  ) then
    raise exception 'Reviewed helper owner cannot safely read memberships independently of recursive RLS';
  end if;

  -- The retained predicates may still call the broad membership helper.
  predicate_oid := pg_catalog.to_regprocedure('public.is_active_organization_member(uuid)');
  if predicate_oid is null or not exists (
    select 1 from pg_catalog.pg_proc
    where oid = predicate_oid and prosecdef and provolatile = 's'
      and prorettype = 'boolean'::regtype
  ) then
    raise exception 'Membership helper signature/security configuration differs from reviewed state';
  end if;
  if not pg_catalog.has_function_privilege('authenticated', predicate_oid, 'EXECUTE') then
    raise exception 'authenticated cannot execute the retained membership helper';
  end if;

  predicate_oid := pg_catalog.to_regprocedure('public.has_active_organization_role(uuid,text[])');
  if predicate_oid is null or not exists (
    select 1 from pg_catalog.pg_proc
    where oid = predicate_oid and prosecdef and provolatile = 's'
      and prorettype = 'boolean'::regtype
  ) then
    raise exception 'Role helper signature/security configuration differs from reviewed state';
  end if;
  if not pg_catalog.has_function_privilege('authenticated', predicate_oid, 'EXECUTE') then
    raise exception 'authenticated cannot execute the role helper';
  end if;

  predicate_oid := pg_catalog.to_regprocedure('public.document_storage_organization_id(text)');
  if predicate_oid is null or not exists (
    select 1 from pg_catalog.pg_proc
    where oid = predicate_oid and not prosecdef and provolatile = 'i'
      and prorettype = 'uuid'::regtype
  ) then
    raise exception 'Storage path helper differs from reviewed state';
  end if;
  if not pg_catalog.has_function_privilege('authenticated', predicate_oid, 'EXECUTE') then
    raise exception 'authenticated cannot execute the Storage path helper';
  end if;

  -- Parse the value after '=' instead of matching a whole proconfig string.
  -- Accept both empty list and quoted-empty spelling, with outer whitespace.
  -- Reject named lists even if their schemas do not exist (current_schemas alone
  -- would incorrectly treat an unresolved schema name as an empty path).
  foreach predicate_oid in array array[
    pg_catalog.to_regprocedure('public.is_active_organization_member(uuid)')::oid,
    pg_catalog.to_regprocedure('public.has_active_organization_role(uuid,text[])')::oid,
    pg_catalog.to_regprocedure('public.document_storage_organization_id(text)')::oid
  ] loop
    -- Confirmed preflight owner. This role name is not a credential.
    if not exists (select 1 from pg_catalog.pg_proc
      where oid = predicate_oid and proowner = 'postgres'::regrole::oid) then
      raise exception 'Helper % owner differs from reviewed postgres ownership', predicate_oid::regprocedure;
    end if;
    if pg_catalog.pg_has_role('authenticated'::regrole, 'postgres'::regrole, 'MEMBER')
       or pg_catalog.pg_has_role('anon'::regrole, 'postgres'::regrole, 'MEMBER') then
      raise exception 'Application role is a member of the trusted helper owner role';
    end if;
    select count(*), min(pg_catalog.substr(setting, pg_catalog.strpos(setting, '=') + 1))
      into path_setting_count, configured_path
    from pg_catalog.pg_proc p
    cross join lateral pg_catalog.unnest(p.proconfig) as settings(setting)
    where p.oid = predicate_oid
      and pg_catalog.split_part(setting, '=', 1) = 'search_path';
    if path_setting_count <> 1 or configured_path is null
       or pg_catalog.regexp_replace(configured_path, '^[[:space:]]+|[[:space:]]+$', '', 'g')
          not in ('', '""') then
      raise exception 'Helper % must explicitly configure an empty search_path', predicate_oid::regprocedure;
    end if;
    -- Verify PostgreSQL resolves that configured value to zero explicit schemas.
    -- This changes only this transaction's GUC, never the stored helper setting.
    perform pg_catalog.set_config('search_path', configured_path, true);
    if pg_catalog.cardinality(pg_catalog.current_schemas(false)) <> 0 then
      raise exception 'Helper % has a nonempty effective search_path', predicate_oid::regprocedure;
    end if;
    perform pg_catalog.set_config('search_path', original_path, true);
  end loop;

  for target in
    select * from (values
      ('public.documents', 'documents_select_active_member'),
      ('public.esg_extractions', 'esg_extractions_select_active_member'),
      ('public.extracted_esg_fields', 'extracted_esg_fields_select_active_member'),
      ('storage.objects', 'storage_documents_select_active_member')
    ) as targets(relation_name, policy_name)
  loop
    relation_oid := target.relation_name::regclass::oid;
    if not exists (
      select 1 from pg_catalog.pg_policy
      where polrelid = relation_oid and polname = target.policy_name
        and polcmd = 'r' and polpermissive
    ) then
      raise exception 'Expected permissive SELECT policy missing or changed: %', target.policy_name;
    end if;
    -- TO authenticated must only narrow the old policy's role applicability.
    if not exists (
      select 1 from pg_catalog.pg_policy p
      cross join lateral pg_catalog.unnest(p.polroles) as roles(role_oid)
      where p.polrelid = relation_oid and p.polname = target.policy_name
        and case when role_oid = 0 then true
                 else pg_catalog.pg_has_role('authenticated'::regrole, role_oid, 'USAGE') end
    ) then
      raise exception 'Changing policy % TO authenticated could broaden role coverage', target.policy_name;
    end if;
    -- Intentionally conservative: even other-bucket SELECT policies need review.
    if exists (
      select 1 from pg_catalog.pg_policy
      where polrelid = relation_oid and polcmd in ('r', '*')
        and polpermissive and polname <> target.policy_name
    ) then
      raise exception 'Additional permissive SELECT/ALL policy needs review on %', target.relation_name;
    end if;
    if not pg_catalog.has_table_privilege('authenticated', relation_oid, 'SELECT') then
      raise exception 'Expected table-level SELECT grant absent on %; review column grants manually', target.relation_name;
    end if;
  end loop;

  if not exists (select 1 from storage.buckets where id = 'documents' and public = false) then
    raise exception 'Private documents bucket missing or public';
  end if;
end;
$preconditions$;

-- Preserve old predicates as AND conditions; do not discard prior conditions.
-- ALTER POLICY changes only TO/USING; command and policy mode stay unchanged.
do $restrict_policies$
declare
  target record;
  relation_oid oid;
  old_predicate text;
  combined_predicate text;
begin
  -- Keep deparsed names schema-qualified wherever an application schema matters.
  perform pg_catalog.set_config('search_path', 'pg_catalog', true);
  for target in
    select * from (values
      ('public.documents', 'documents_select_active_member', $document$
        organization_id is not null
        and public.has_active_organization_role(organization_id, array['owner', 'reviewer']::text[])
      $document$),
      ('public.esg_extractions', 'esg_extractions_select_active_member', $extraction$
        exists (
          select 1 from public.documents as d
          where d.id = esg_extractions.document_id and d.organization_id is not null
            and public.has_active_organization_role(d.organization_id, array['owner', 'reviewer']::text[])
        )
      $extraction$),
      ('public.extracted_esg_fields', 'extracted_esg_fields_select_active_member', $field$
        exists (
          select 1 from public.esg_extractions as e
          join public.documents as d on d.id = e.document_id
          where e.id = extracted_esg_fields.extraction_id and d.organization_id is not null
            and public.has_active_organization_role(d.organization_id, array['owner', 'reviewer']::text[])
        )
      $field$),
      ('storage.objects', 'storage_documents_select_active_member', $storage$
        bucket_id = 'documents'
        and exists (
          select 1 from public.documents as d
          where d.storage_path = storage.objects.name
            and d.organization_id is not null
            and d.organization_id = pg_catalog.split_part(storage.objects.name, '/', 1)::uuid
            and d.id = pg_catalog.split_part(pg_catalog.split_part(storage.objects.name, '/', 2), '.', 1)::uuid
            and public.has_active_organization_role(d.organization_id, array['owner', 'reviewer']::text[])
        )
      $storage$)
    ) as targets(relation_name, policy_name, new_predicate)
  loop
    relation_oid := target.relation_name::regclass::oid;
    select coalesce(pg_catalog.pg_get_expr(p.polqual, p.polrelid), 'true')
      into strict old_predicate
    from pg_catalog.pg_policy p
    where p.polrelid = relation_oid and p.polname = target.policy_name;
    combined_predicate := pg_catalog.format('(%s) AND (%s)', old_predicate, target.new_predicate);
    if target.relation_name = 'storage.objects' then
      -- Guard BOTH old predicate and new casts. AND does not guarantee evaluation
      -- order; malformed/legacy names must not reach even the old path helper.
      combined_predicate := pg_catalog.format(
        'CASE WHEN bucket_id = %L AND name ~* %L THEN (%s) ELSE false END',
        'documents', '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]pdf$', combined_predicate
      );
    end if;
    execute pg_catalog.format(
      'ALTER POLICY %I ON %s TO authenticated USING (%s)',
      target.policy_name, relation_oid::regclass, combined_predicate
    );
  end loop;
end;
$restrict_policies$;

-- Metadata policies must match the same role contract before grants can commit.
do $metadata_reconciliation$
declare
  target record;
  relation_oid oid;
  old_predicate text;
begin
  -- Do not rely on the preceding DO block's session configuration for deparsing.
  perform pg_catalog.set_config('search_path', 'pg_catalog', true);
  for target in
    select * from (values
      ('public.organizations', 'organizations_select_active_member', $organization$
        public.has_active_organization_role(id, array['owner', 'reviewer']::text[])
      $organization$),
      ('public.organization_memberships', 'memberships_select_same_organization', $membership$
        user_id = auth.uid() and status::text = 'active'
        and role::text in ('owner', 'reviewer')
      $membership$)
    ) as targets(relation_name, policy_name, new_predicate)
  loop
    relation_oid := target.relation_name::regclass::oid;
    if not exists (select 1 from pg_catalog.pg_policy
      where polrelid = relation_oid and polname = target.policy_name
        and polcmd = 'r' and polpermissive) then
      raise exception 'Expected metadata SELECT policy missing or changed: %', target.policy_name;
    end if;
    if exists (select 1 from pg_catalog.pg_policy
      where polrelid = relation_oid and polcmd in ('r', '*') and polpermissive
        and polname <> target.policy_name) then
      raise exception 'Additional permissive metadata SELECT/ALL policy needs review';
    end if;
    if not exists (
      select 1 from pg_catalog.pg_policy p
      cross join lateral pg_catalog.unnest(p.polroles) as roles(role_oid)
      where p.polrelid = relation_oid and p.polname = target.policy_name
        and case when role_oid = 0 then true
          else pg_catalog.pg_has_role('authenticated'::regrole, role_oid, 'USAGE') end
    ) then
      raise exception 'Metadata role change could broaden policy coverage';
    end if;
    select coalesce(pg_catalog.pg_get_expr(p.polqual, p.polrelid), 'true')
      into strict old_predicate from pg_catalog.pg_policy p
    where p.polrelid = relation_oid and p.polname = target.policy_name;
    execute pg_catalog.format(
      'ALTER POLICY %I ON %s TO authenticated USING ((%s) AND (%s))',
      target.policy_name, relation_oid::regclass, old_predicate, target.new_predicate
    );
  end loop;
end;
$metadata_reconciliation$;

-- Enforce the final privilege delta before this transaction can commit.
do $grant_postconditions$
declare relation_oid oid;
begin
  foreach relation_oid in array array[
    'public.documents'::regclass::oid, 'public.organizations'::regclass::oid,
    'public.organization_memberships'::regclass::oid,
    'public.esg_extractions'::regclass::oid, 'public.extracted_esg_fields'::regclass::oid
  ] loop
    if not pg_catalog.has_table_privilege('authenticated', relation_oid, 'SELECT') then
      raise exception 'Required authenticated SELECT absent';
    end if;
    if pg_catalog.has_table_privilege('anon', relation_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('anon', relation_oid, 'SELECT,INSERT,UPDATE,REFERENCES')
      or pg_catalog.has_table_privilege('authenticated', relation_oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('authenticated', relation_oid, 'INSERT,UPDATE,REFERENCES') then
      raise exception 'Unexpected effective privileges in final state';
    end if;
  end loop;
end;
$grant_postconditions$;

-- No created_by assumption. No Storage grants or write policies are changed.
commit;
