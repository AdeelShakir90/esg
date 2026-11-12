# Step 7R.8 — atomic authenticated SELECT reconciliation (NOT APPLIED)

**Step 7R.10 execution blocker:** supplied R9 results show postgres cannot ALTER
POLICY on managed storage.objects. This artifact is NOT executable as proposed
under that role. See `STEP-7R10-REVIEW.md` for read-only evidence requests and
conditional owner-authorized atomic/Storage-first routes. No workaround or
role-switch capability has been assumed, and the migration remains unchanged.

Target ONLY envario-security-test / gkhrtrakukqdhgvucudv. Supplied live preflight
reports no authenticated/anon privileges on the five application tables, helper
EXECUTE and empty search_path checks passing, private PDF-only 5 MiB bucket,
zero documents/objects, broad protected SELECT predicates and unresolved metadata
policies. These are user-supplied results, not a new remote inspection by this task.

## Exact privilege and policy delta

`20261109010000_authenticated_read_reconciliation.sql` is a NEW superseding draft.
Do NOT execute the previous unapplied `20261109000000` draft as well. Keep it as a
review artifact. No historical migration or applied ledger is rewritten.

The sole new GRANT is SELECT on exactly:

- public.documents
- public.organizations
- public.organization_memberships
- public.esg_extractions
- public.extracted_esg_fields

Recipient: authenticated ONLY. These support protected document/ESG reads, the
verified caller's membership lookup, organization metadata and policy parent
lookups. Table-level SELECT matches the prior R7 preconditions. It permits all
columns of authorized rows, not only application projections: confirm each
table's columns are appropriate for active owners/reviewers before approval.
No SELECT on unrelated tables, no schema/default privileges, and no privileges
on sequences, auth.users or Storage are added. Public-schema USAGE must already
exist; otherwise abort and review separately.

No INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES or TRIGGER permission is granted.
The migration aborts on unexpected existing table/column privileges rather than
silently revoking them. anon remains without effective application table/column
access. Application roles must not own/inherit ownership or bypass RLS.
service_role privileges are untouched; application/test callers must not use it.

Four protected policies retain the R7 correction: active owner/reviewer and
non-null owned document, inherited extraction/field access, and guarded canonical
Storage path bound to BOTH document organization and document ID plus exact
storage_path. All old predicates remain additional AND restrictions.

Two metadata policy corrections resolve the separate contract gap:

- organizations_select_active_member: old predicate AND
  has_active_organization_role(id, ARRAY['owner','reviewer']).
- memberships_select_same_organization: old predicate AND user_id = auth.uid()
  AND status::text = 'active' AND role::text IN ('owner','reviewer').

Active member, suspended owner/reviewer/member and outsider see no organization
metadata or membership rows. Active owners/reviewers see only their own authorized
membership records, not peers. The new membership restriction queries no other
membership row, avoiding a new recursion path. The retained helper must still
have trusted ownership and safe SECURITY DEFINER behavior; do not assume this
solely from its name. No membership-administration interface is introduced.

**MVP limit: owners cannot list other organization members.** Owner status does
not grant peer-directory, invitation or membership-administration access. A later
feature must be separately designed rather than broadening this self-only policy.

## Atomic order: NEVER commit grants first

1. Begin ONE transaction; set lock/statement timeouts; lock the four protected
   relations and both metadata relations against concurrent DDL.
2. Assert the reviewed no-access privilege baseline and public-schema USAGE.
3. Grant only SELECT on the five application tables INSIDE that transaction.
4. Run the carried-forward R7 table/helper/policy preconditions. They now see the
   application SELECT grants. Existing authenticated SELECT on storage.objects
   must independently be verified; if missing, abort, do not add a Storage grant.
5. Narrow all four protected policies, preserving old predicates and guarding
   UUID parsing. Narrow both metadata policies with the same role-applicability
   and extra-permissive-policy checks. Every altered policy targets authenticated.
6. Assert authenticated SELECT-only and anon no-access, then commit everything
   together. Any failure rolls back grants AND policy changes.

Other sessions cannot observe an intermediate committed grant-only state. Locks
briefly block reads; require a short approved test-project maintenance window and
no concurrent helper/role/grant changes. Do not run statement selections or split
the file across commits. Do not disable preconditions to force it through.

ACCESS EXCLUSIVE locks are intentional blocking effects, not data changes. They
remain held until transaction end; lock_timeout bounds EACH lock acquisition,
not total transaction duration, and statement_timeout bounds EACH statement/DO,
not the entire script. A waiting lock can also queue other traffic. Apply only in
the isolated maintenance window with no concurrent schema/role/helper edits. Lock
or privilege failure aborts the transaction; stop on the first error. The executing
SQL role must be authorized to LOCK/GRANT and own or inherit ownership of each
policy table (or have suitable superuser authority); helper ownership alone does
not establish execution permission on storage.objects.

Only transaction-local search_path settings are changed; they revert on COMMIT
or ROLLBACK. Helper definitions/configuration and stored rows are not changed.
The SQL must not be executed inside another surrounding transaction: its explicit
BEGIN/COMMIT is the one approved transaction boundary.

This is not a fresh-db bootstrap. A db push that discovers the earlier draft
would apply it first and fail: no blanket db push is authorized. Since the test
schema was manually managed, agree an explicit one-file execution/recording
procedure. If the old draft has already been applied or grants changed, STOP:
the confirmed baseline is stale and this draft must be reconciled again.

## Before application / remaining risks

- Verify the exact project, helper fingerprints/owners/EXECUTE ACLs, role
  inheritance, parent/organization FKs and unique membership constraint.
- Confirmed helper owner postgres is now enforced for all three helpers. Application
  roles must not be members of postgres or table-owner roles, even without INHERIT.
  The definer owner must bypass membership-table RLS or own it without FORCE RLS;
  this is checked to avoid recursive evaluation of the retained membership helper.
- Review all six original policies and extra permissive SELECT/ALL policies.
  Unexpected extras abort; other restrictive policies may legitimately deny more.
- Review retained predicates for negative/non-monotone subqueries or mutable/
  impersonating helpers; preserving an expression is not proof its dependencies
  are safe when other RLS predicates change.
- Review exposed views/RPCs, default privileges, triggers and direct write paths.
  SELECT grants activate any callable read behavior in policies; inspect helper
  bodies and dependencies. No new helper definition or function grant is included.
- Verify Storage SELECT/schema grants already suffice; compare existing ACLs and
  private PDF/size configuration before/after. No upload sequencing changes.
- Snapshot all six original policy definitions/roles/modes, grants, helper
  fingerprints, record counts and the reviewed file hash. No credential export.
- Role names/contracts are owner/reviewer/member and active/suspended. Missing
  created_by is NOT repaired or referenced. Null-owned data stays quarantined.
- No SQL was parsed/executed by PostgreSQL here. Static/model tests are not remote
  RLS proof. Obtain separately authorized disposable/synthetic database validation.

## PostgreSQL compatibility review

Locally reviewed catalog calls use real PostgreSQL built-ins: to_regprocedure,
has_schema_privilege, has_table_privilege, has_any_column_privilege,
has_function_privilege, pg_has_role, pg_get_expr, format, set_config,
current_setting, current_schemas, cardinality, unnest, substr, strpos,
split_part and regexp_replace. No fabricated pg_catalog helper is required.
regrole/regclass-to-oid casts resolve existing catalog objects; a missing role or
table intentionally errors. pg_has_role uses USAGE for existing policy applicability
and MEMBER for the stricter ownership-membership rejection. Role OID zero (PUBLIC)
is handled by CASE before attempting pg_has_role on it.

Comma-separated privilege strings mean ANY listed privilege, which is the intended
unexpected-access detector. Table privileges use SELECT/INSERT/UPDATE/DELETE/
TRUNCATE/REFERENCES/TRIGGER; column checks use only SELECT/INSERT/UPDATE/REFERENCES.
SELECT is granted before the old application-table SELECT preconditions, but within
the same transaction as all restrictions. These checks intentionally reject a
different or already-reconciled grant baseline, rather than silently normalizing it.

Dynamic ALTER POLICY uses quoted identifiers (%I), a catalog regclass table name
and catalog-derived predicate expressions (%s). It changes TO/USING only; existing
SELECT command and permissive mode are checked, not specified with invalid ALTER
clauses. pg_get_expr deparsing is explicitly under pg_catalog-only search_path in
BOTH policy blocks. Each original predicate remains parenthesized and AND-combined
with fixed owner/reviewer or self-only restrictions. This narrows predicate truth
under the reviewed positive helper dependencies; arbitrary negative/non-monotone
dependencies still require review. The SELECT grant intentionally adds authorized
owner/reviewer reads relative to the old no-grants state, not member/peer access.

The Storage CASE surrounds both old and new predicates. Only complete UUID/UUID.pdf
paths reach either old path helpers or new UUID casts. No reliance is placed on AND
evaluation order. Both UUIDs and the full storage_path must match the same document.
Malformed/legacy paths fail closed; valid UUID spellings need not be version-4.

The supplied no-SELECT/postgres-helper-owner/RLS/private-bucket facts match these
checks. They do not independently prove public-schema USAGE, existing Storage
SELECT rights, executor ownership, absence of extra policies or helper dependency
safety. If any required fact is missing, the transaction aborts and rolls back the
SELECT grants. Local review is not a claim of successful PostgreSQL execution.

## Exact post-migration queries and acceptance

Run `docs/security/STEP-7R8-POSTFLIGHT.sql` as one read-only script only after
separate approval. It checks each table's effective authenticated SELECT-only,
anon denial, RLS flags, six exact policy identities/role scopes, additional
permissive SELECT/ALL counts, helper fingerprints/grants, Storage ACL/configuration
and aggregate preserved counts. No emails, user IDs, paths or source text output.
Compare to the consolidated R7 preflight. PASS rows are individual checks; REVIEW
rows need interpretation and direct role tests. Zero rows under a restricted
inspection role does not prove the database has no records.

Postflight now reports FAIL for missing helper EXECUTE, unexpected postgres owner,
wrong definer/volatility/return type, or missing/nonempty configured search_path.
Matching helper fingerprints still require comparison with preflight; no expected
fingerprint has been invented. Policy metadata checks use null-safe comparisons.

## Isolated synthetic role test plan (NOT executed)

Only the approved isolated project; fixture creation and credentials require
separate authorization. Use fresh run-scoped fixtures; do not alter existing
memberships to manufacture roles. Include owner A, reviewer A, active member A,
suspended owner A, suspended member A, outsider, owner B and anonymous.

Prepare synthetic documents A/B, extraction runs/fields, matched canonical objects,
an unowned document/children, an orphan object, a wrong-document-ID object and
legacy/malformed paths. Fixture setup is a separate controlled administrative
task; this migration has no data/fixture writes. No AI/provider calls are needed.

| Caller | Own organization metadata / own membership | Own document/ESG/object | Foreign org/resources |
| --- | --- | --- | --- |
| Active owner/reviewer | Read; no peer membership rows | Read | Deny |
| Active member | Deny | Deny | Deny |
| Suspended owner/reviewer/member | Deny | Deny | Deny |
| Outsider/anonymous | Deny | Deny | Deny |

Owner B is symmetric to owner A. Direct SELECT of peer membership IDs must return
no rows for owner/reviewer. Direct member-role helper invocation with arbitrary
allowed_roles does not authorize table reads: policy arrays remain fixed.
Every caller must be denied unowned documents/children, unmatched/wrong-prefix/
wrong-document-ID objects and legacy paths. Malformed paths must not throw casts.
Test direct PostgREST and Storage as the real authenticated users, NOT only SQL
editor/service-role clients. anon may get permission errors; authenticated RLS
denial normally yields zero rows. Verify database write privileges remain absent;
any synthetic write-denial probes need a separately approved disposable fixture
run and cleanup plan. Existing application mutations must remain 503 without
side effects. The live read gate remains false, so application reads remain 503
for authenticated callers and must not be used as evidence of working remote RLS.

Cleanup only tracked synthetic resources under separate authorization; no reset,
truncate, broad delete or customer data. Compare before/after rows and schema.

## Recovery and explicit approval checkpoint

Before COMMIT: any error rolls back all grants and six predicate changes.
After COMMIT: keep the application gate closed and writes disabled. If necessary,
prepare a separately approved forward revocation of the five new SELECT grants
to restore the prior no-read state (verify no intervening grants/dependencies).
Do not restore broad member predicates. No data restoration is needed.

STOP until preflight review, helper/policy snapshots and isolated SQL validation
are accepted. Approval must identify the exact final SHA-256 and say:

> Apply ONLY 20261109010000_authenticated_read_reconciliation.sql, SHA-256
> [reviewed hash], to envario-security-test (gkhrtrakukqdhgvucudv) in ONE transaction.
> Do NOT apply 20261109000000, replay historical migrations, change Storage grants,
> create fixtures, enable application reads/writes or touch production.

Postflight execution and a later synthetic integration run must be explicitly
included in their own authorization scope. Local drafting is not execution approval.
