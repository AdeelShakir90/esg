# Step 7R.6: read authorization, disabled pending database verification

The live adapter uses a fresh public-key SSR client and `auth.getUser()`. No
request path imports the admin client or supplies the shared MVP token. It never
uses `created_by`, which is absent from the confirmed schema.

`src/lib/security/database-verification.ts` deliberately sets
`DATABASE_READS_VERIFIED = false`. This is not configurable by a request, cookie,
environment variable, or server-action argument. With valid Auth configuration,
anonymous reads return 401; authenticated reads return 503 before membership or
document queries. Missing configuration/errors return 503. Offline tests inject
synthetic verified repositories to exercise the future enabled behavior. This is
not evidence that remote RLS is secure. Do not enable the gate based on tests alone.

Once verification is complete, the implemented read policy is:

- Load only the verified user's memberships; check status and exact role.
- Owner/reviewer may read; member, suspended and unknown roles/statuses cannot.
- Verify any selected organization. Without selection, exactly one authorized
  organization is required. Multiple organizations never select an arbitrary one.
- Listing denial is 403. Document visibility denial is 404, including inaccessible
  organization selection, foreign/missing/unowned rows. Anonymous access is 401.
- List queries explicitly filter organization ID and project public metadata.
- Validation first checks the scoped document, then its extraction and fields.
  Returned parent IDs are checked again before constructing a response.
- All HTTP data/error responses are private/no-store. There is no shared server
  cache. Validation actions return a verified user/organization scope key.

The authenticated layout still renders the holding screen, not workspace pages.
No document/dashboard/validation/report state is mounted. ReadScopeBoundary
invalidates/unmounts its subtree on identity changes or an organization-change
event; future workspace integration must key the boundary by the returned
verified user:organization scope, never by a caller-provided organization alone.
Organization switching is not enabled in this phase.

Every document route explicitly disables POST/PUT/PATCH/DELETE with 503 and
`writes_disabled`. The extraction action returns the same status/code without
reading its input or creating a client. Auth signup/login/logout are unchanged.
No persistent validation mutation endpoint exists; temporary review domain code
is retained but not exposed by the holding screen.

Legacy upload/extraction/validation orchestration is preserved as `.ts.txt`
snapshots in `legacy-disabled/`. These are not compiled modules and no route or
action imports them. ESG extraction/parsing/schema/PDF domain modules remain in
place. Do not restore old routes: they use privileged access and need replacement
with separately reviewed authorization and write policies.

## Required database evidence before live read testing

For only the approved isolated project `gkhrtrakukqdhgvucudv`, obtain a read-only
inventory and review:

1. Exact bodies, signatures, owner, security-definer status, fixed search_path and
   EXECUTE grants of `is_active_organization_member(uuid)`,
   `has_active_organization_role(uuid,text[])`,
   `document_storage_organization_id(text)`, plus nested helpers.
2. All effective permissive/restrictive policies, roles, USING and WITH CHECK
   clauses, including broad policies that combine with named policies.
3. Active `member` and suspended callers denied on document/ESG/Storage SELECT,
   not just filtered by the application. Parent access inherited correctly.
4. RLS flags, table/view/function owners, bypass roles, inherited/schema/table/
   column/function/default grants; exposed views/RPCs must not bypass isolation.
5. Membership uniqueness, role/status constraints and organization/user FKs;
   nullable document ownership stays quarantined. No self-promotion or ownership
   reassignment through direct authenticated requests.
6. Membership lookup policies permit the verified caller's authorized records
   without recursive policy evaluation or reliance on client role metadata.
7. Private `documents` bucket; organization path parser safely rejects malformed
   and legacy paths; exact object-to-document matching; no anonymous/public
   access or broad authenticated object policy.
8. No unintended write grants/policies or callable mutation RPCs. API write
   disabling does not revoke any existing direct database/Storage permissions.

No helper definition, policy or grant has been verified remotely in this phase.
No database changes or migrations are included. Retain gate=false until review
and an explicitly authorized isolated integration run prove the matrix using
owner A/B, reviewer, active member, suspended member and outsider fixtures.
