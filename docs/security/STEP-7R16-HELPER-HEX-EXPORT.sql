-- READ ONLY: catalog export only; no helper invocation or application data.
-- Manually confirm envario-security-test / gkhrtrakukqdhgvucudv in SQL Editor.
-- Export ALL three rows as CSV; do not copy truncated grid cells or use Excel.
-- MD5 is computed over the same UTF-8 bytes exported as hex.
with expected(signature) as (
  values ('public.document_storage_organization_id(text)'),
         ('public.has_active_organization_role(uuid,text[])'),
         ('public.is_active_organization_member(uuid)')
)
select e.signature,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.provolatile::text as volatility,
  p.proconfig as configuration,
  (select pg_catalog.json_agg(pg_catalog.substr(c.setting, pg_catalog.strpos(c.setting, '=') + 1)
           order by c.setting)
   from pg_catalog.unnest(p.proconfig) c(setting)
   where pg_catalog.split_part(c.setting, '=', 1) = 'search_path') as search_path_settings,
  (select pg_catalog.json_agg(a.entry::text order by a.entry::text collate "C")
   from pg_catalog.unnest(p.proacl) a(entry)) as acl,
  pg_catalog.encode(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8'), 'hex') as definition_hex,
  pg_catalog.md5(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8')) as definition_md5
from expected e
left join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(e.signature)
order by e.signature;
