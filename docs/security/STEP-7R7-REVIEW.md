# Step 7R.7 targeted RLS reconciliation — NOT APPLIED

**Superseded for execution by the Step 7R.8 atomic draft:** confirmed missing
authenticated SELECT grants make this older draft's preconditions fail. Do not
apply it first or commit grants separately. See `STEP-7R8-REVIEW.md` and
`20261109010000_authenticated_read_reconciliation.sql`. This file remains the
historical review of the original four-policy proposal; no SQL has been applied.

Approved historical target: **envario-security-test**, project ref
**gkhrtrakukqdhgvucudv**. No remote state was inspected in this phase. Helper
descriptions/policy names are user-supplied facts; owners, grants and effective
policy composition still require review. The live read gate stays false and
all document writes remain disabled.

## Artifacts and scope

- `docs/security/archived-migrations/20261109000000_reconcile_protected_read_roles.sql.txt`:
  archived byte-for-byte historical proposal for four SELECT policies, outside migration discovery.
- `docs/security/STEP-7R7-PREFLIGHT.sql`: read-only metadata/aggregate inventory.
  No SQL was executed. SQL syntax/behavior has not been database-validated.

The migration changes the policies' TO roles to authenticated and replaces
predicates with the conjunction of the old predicate and active owner/reviewer checks. Existing names are retained to
avoid unnecessary identity changes. It does not change helpers, grants, data,
organizations/membership policies, write policies, bucket configuration, upload
sequencing, application code or created_by. It is NOT a bootstrap migration and
must not be blindly included in a fresh-database run without the missing baseline
and organization schema.

Preconditions abort the whole transaction if required tables/RLS/policies or
helper signatures/configurations differ, authenticated lacks the expected SELECT
or helper execution grants, an extra permissive SELECT/ALL policy could bypass
the restriction, or the bucket is not private. The extra-policy check deliberately
also rejects Storage policies for other buckets: inspect them rather than deleting
them. Existing restrictive policies remain and may further limit access. These
preconditions are not substitutes for the human review below. Four target tables
are locked ACCESS EXCLUSIVE before checks to prevent concurrent policy DDL; a
short, explicitly approved test-project maintenance window is required. Lock
failure aborts rather than continuing without protection. Helper definition/owner
changes must also be excluded during this window.

## Policy design

1. Documents: non-null organization_id and
   `has_active_organization_role(organization_id, ARRAY['owner','reviewer'])`.
2. Extraction runs: authorized parent document; same explicit role predicate.
3. Fields: authorized extraction -> document relationship; same role predicate.
4. Storage: private documents bucket, canonical `<organization UUID>/<document UUID>.pdf`,
   exact documents.storage_path = storage.objects.name, non-null document ownership,
   path organization = metadata organization, filename UUID = documents.id, and
   active owner/reviewer role.

The path must identify both the organization and the actual document primary key.
Canonical-looking paths with an independently generated object UUID are now
quarantined even if storage_path matches. No rename, move or backfill is included.
Review aggregate impact counts before application; do not expose historical data
just to make a path satisfy the policy.

The Storage CASE wraps BOTH the original predicate and the new predicate. Only a
complete UUID/UUID.pdf shape reaches either predicate, preventing unsafe casts in
the old path helper as well as in the new expressions. Both segments are parsed
with split_part followed by UUID casts inside that guarded branch. Exact
storage_path matching is still required. Null-owned documents, wrong document IDs,
foreign prefixes, unmatched objects, malformed names and legacy paths are denied.

Old predicates are obtained via pg_get_expr under a pg_catalog-only search_path,
then combined with the new predicate using AND. Identifiers use format %I and a
catalog-derived regclass; catalog expressions use %s, not caller-supplied SQL.
ALTER POLICY syntax is ALTER POLICY name ON table TO authenticated USING (...).
No FOR SELECT or AS clause is used: command and mode cannot be changed by ALTER
POLICY and are checked beforehand. PostgreSQL transactional DDL rolls back the
whole transaction on error. The script does not GRANT EXECUTE or any table access;
has_function_privilege checks effective rights including inherited/PUBLIC grants.
TO authenticated is allowed only if the old policy already applied to it via
PUBLIC or a currently usable inherited role, so the role change cannot add it.

Retaining old predicates avoids dropping prior restrictions. It is not a proof
about arbitrary helper/view dependencies: preflight must reject unexpected
volatile, impersonating or non-monotone predicates (for example NOT EXISTS over a
parent whose RLS is changing). Expected predicates are positive membership/parent
checks. No concurrent definition changes are permitted during application.

## Organization and membership metadata

`organizations_select_active_member` and
`memberships_select_same_organization` are deliberately preserved. If their
predicates use is_active_organization_member without role restriction, an active
member may still read their organization metadata and potentially other users'
membership records in that organization. Exact columns/row visibility depend on
their definitions and grants. This is broader than the application's protected
organization selection policy, which denies member. It must not expose document
contents through a view/helper or a membership write path. Verify suspended users
are excluded. Do not claim metadata policies are equivalent to document policies.

**Minimal separate correction recommended before live reads:** narrow organization
SELECT to has_active_organization_role(id, ARRAY['owner','reviewer']); narrow
membership SELECT to user_id = auth.uid(), status = 'active' and role IN
('owner','reviewer'). This permits the caller's own authorized membership lookup
without exposing peer membership rows or introducing helper recursion. It denies
active member metadata consistently with the offline contract. Preserve any old
restrictions as AND conditions and audit every other permissive/ALL policy. If a
future owner administration UI needs peer visibility, design that separately.

This draft DOES NOT apply those two metadata changes: their full predicates and
intended peer-visibility requirements have not been supplied. Until separately
reviewed/reconciled, this four-policy migration addresses protected document/ESG/
Storage reads only and cannot be described as full organization-contract parity.
Keep the live gate closed even after applying it.

Membership provisioning/admin capabilities are not added. Any unexpected ability
to alter membership role/status or document organization is an application blocker
requiring separate reconciliation, not something this SELECT-only patch fixes.

## Required review before ANY application

1. Manually identify the isolated dashboard project by name AND ref. Do not rely
   on SQL database name, a filename, a client-selected organization or environment
   defaults to establish the target. No production project is authorized.
2. Run the preflight only under separate authorization. Save results privately;
   inspection role must have sufficient catalog visibility. Record effective
   role inheritance, PUBLIC grants, column-only grants and schema usage.
3. Confirm supplied helper bodies still match, record definition fingerprints,
   and review any nested helper dependencies. Security-definer owners must be
   trusted and inaccessible to application roles; no writable search_path or
   attacker-replaceable dependencies. Confirm membership lookup cannot recurse.
   Exactly one explicit search_path setting is required. The value after '=' is
   parsed and outer whitespace removed; both empty-list and quoted-empty spellings
   are accepted. Named/list values are rejected, even nonexistent schema names.
   The migration then uses transaction-local set_config and current_schemas(false)
   to verify zero explicit resolved schemas, restoring the prior setting each time.
   No stored helper configuration is changed. Implicit pg_catalog/pg_temp lookup
   is not the same as an explicit empty path; helper bodies must fully qualify
   all relations. Unexpected spellings fail closed for review.
4. Confirm has_active_organization_role always uses auth.uid(), active status and
   the supplied role allowlist; no user-supplied impersonation argument or broad
   fallback. Verify helper EXECUTE rights. PUBLIC/anon helper grants are not
   changed here: assess information exposure/overloads and flag unsafe grants.
5. Review ALL permissive SELECT/ALL policies (OR composition), restrictive policies,
   exposed views, RPCs, function ACLs, table owners/BYPASSRLS roles, default grants
   and triggers. A view/RPC/privileged client can bypass otherwise-correct RLS.
6. Verify unique (organization_id,user_id), recognized role/status constraints,
   user/org FKs, documents organization FK, extraction/field parent FKs and
   deletion actions. Verify unique storage_path or demonstrate unambiguous exact
   object ownership. No automatic constraint repair/data deletion is authorized.
7. Confirm no direct role/status/organization mutation is possible for ordinary
   clients. Inventory every write grant/policy and exposed mutation RPC; this
   patch adds no writes but does not revoke pre-existing unsafe ones. TRUNCATE is
   not controlled by RLS. Confirm authenticated has no superuser/BYPASSRLS path.
8. Verify bucket private state, file restrictions and complete Storage policy
   inventory, including other buckets and ALL policies. Review count of objects
   the canonical-path rule will quarantine. Previously issued signed URLs or
   downloaded data are not revoked by this migration; expiry/exposure needs its
   own assessment without exporting tokens.
9. Reconcile manually applied schema: absent schema_migrations is not an empty
   schema. Do not replay October migrations, reset, or insert fake ledger entries.
   Record this forward change through an agreed manual/CLI procedure, with exact
   artifact hash and before/after metadata. Do not run a blanket db push.
10. The SQL grammar and catalog API usage have been reviewed locally, not parsed or
    executed by PostgreSQL. Database-validate syntax and test predicates against synthetic isolated
    fixtures in a separately authorized disposable environment first. Obtain a
    recovery snapshot of the four original policy definitions/roles/modes and
    helper fingerprints. No customer data needed.

## Test matrix (future isolated execution only)

Use synthetic documents A/B, their extraction runs and 12 fields; canonical
matched objects, an orphan canonical object, a prefix/metadata mismatch, unowned
document plus children, a legacy date object and malformed/nested paths. No
fixtures are created by these files. A dedicated active-member fixture is required
in addition to the historical users; do not promote or repurpose real accounts.

| Caller | A document/run/fields/matched object | B resources |
| --- | --- | --- |
| Active owner A | Read | Deny |
| Active reviewer A | Read | Deny |
| Active member A | Deny | Deny |
| Suspended owner A | Deny | Deny |
| Outsider | Deny | Deny |
| Anonymous | Deny | Deny |
| Active owner B | Deny | Read |

For ALL callers, deny null-owned parents and children, unmatched objects,
prefix/metadata mismatches, wrong document UUID filenames and legacy/noncanonical names. Malformed paths must
not raise UUID-cast exceptions. Test list and exact-object download separately.
Authenticated membership in A must never authorize a B row via a guessed UUID.
Test duplicate/ambiguous membership constraints and role/status changes in the
synthetic setup to establish suspension takes effect without trusting stale JWT
role metadata. Check policy performance with organization/parent/path indexes.

Test direct authenticated database SELECT and Storage requests, NOT service-role
clients or a SQL-editor superuser alone. Denial may be empty rows rather than
HTTP 404; future application adapters enforce their documented 401/403/404 matrix.
Every document API mutation and extraction action must still return disabled 503,
with no database write, Storage operation or AI call. No write grant/policy should
appear in the before/after schema diff. Do not open the live read gate as part of
this SQL change; it requires a separately reviewed application step.

Offline SQL contract tests in src/lib/security/sql-reconciliation.test.ts check
artifact structure, empty-path spellings, canonical path cases, role coverage,
old-predicate preservation and absence of data/write/grant changes. These are
static/model checks, NOT a PostgreSQL parser or RLS execution engine.

Run existing offline security/Auth/ESG tests unchanged. They verify application
contracts but do not prove PostgreSQL policy semantics or remote Storage behavior.

## Rollback / incident response

- Before COMMIT, any failure rolls back all four ALTER POLICY operations. Stop
  and inspect; do not remove preconditions just to force a successful run.
- After COMMIT, keep the application gate closed and writes disabled. If reads
  malfunction, use a separately approved forward emergency migration setting the
  four affected SELECT predicates to false (after rechecking extra policies).
  Do not restore the broad active-member predicate as a security rollback.
- Preserve original policy snapshots for forensic comparison, not automatic
  reapplication. A rollback cannot revoke downloaded data or existing signed URLs.
- No rows, objects or functions are deleted/rewritten by this proposal; no data
  restoration or Storage relocation is part of rollback.

## Exact approval checkpoint

STOP before executing the migration. Supply the preflight review, original policy
snapshots, reviewed helper fingerprints, synthetic test results, target identity,
and SHA-256 of the exact migration file. Obtain explicit approval equivalent to:

> Apply ONLY 20261109000000_reconcile_protected_read_roles.sql, SHA-256 [reviewed
> hash], to envario-security-test (gkhrtrakukqdhgvucudv), using the reviewed
> transaction/procedure. Do not run other migrations or enable application reads
> or writes.

Approval to prepare this draft is not approval to execute SQL, access credentials,
connect to Supabase, create fixtures, modify grants or touch production.
