CREATE OR REPLACE FUNCTION public.has_active_organization_role(target_organization_id uuid, allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  );
$function$
