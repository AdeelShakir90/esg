-- READ ONLY, before migration. Confirm envario-security-test / gkhrtrakukqdhgvucudv manually.
-- Effective privileges include inherited and PUBLIC rights; no role changes or data rows.
-- grantable_table array order: SELECT INSERT UPDATE DELETE TRUNCATE REFERENCES TRIGGER.
-- Export the complete single result row as CSV; independently review before acceptance.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local search_path = pg_catalog;
with roles as (
  select e.role_name, r.oid from (values ('anon'), ('authenticated')) e(role_name)
  left join pg_catalog.pg_roles r on r.rolname = e.role_name
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
)
select case when oid is null or (snapshot->'effective'->'anon'->>'role_exists')::boolean is distinct from true
  or (snapshot->'effective'->'authenticated'->>'role_exists')::boolean is distinct from true then 'FAIL' else 'REVIEW' end as result,
  'gkhrtrakukqdhgvucudv'::text as operator_must_confirm_project_ref,
  snapshot,
  'Review table/column ACLs and effective privileges BEFORE migration; no automatic approval. Snapshot captures effective rights but not a complete role-membership graph.'::text as review_requirement
from storage_snapshot;
rollback;
