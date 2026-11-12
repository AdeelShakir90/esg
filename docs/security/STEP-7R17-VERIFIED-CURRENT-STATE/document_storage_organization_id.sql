CREATE OR REPLACE FUNCTION public.document_storage_organization_id(object_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when split_part(object_name, '/', 1) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then split_part(object_name, '/', 1)::uuid
    else null
  end;
$function$
