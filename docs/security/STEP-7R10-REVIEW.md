# Step 7R.10 — BLOCKED: managed Storage ownership and unapproved baselines

Only envario-security-test / gkhrtrakukqdhgvucudv is in scope. Supplied live R9
results say postgres is not superuser and cannot ALTER POLICY on storage.objects,
whose owner is supabase_storage_admin. Authenticated Storage SELECT is available.
Other core structure passed, but original policy fingerprints are not approved.
No remote verification, SQL execution or application change occurred in this task.

## Exact blocker / unchanged artifact

The combined R8 migration attempts to lock and ALTER policies on storage.objects
as the applying role. SELECT privileges, helper ownership by postgres and ordinary
table grants do NOT confer ALTER POLICY authority. Its current execution route
is blocked; do not run it or loosen its checks. An early LOCK may also fail.

R8 migration remains unchanged:
`supabase/migrations/20261109010000_authenticated_read_reconciliation.sql`

SHA-256: `B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087`.

No safe project-supported route has yet been established. PostgreSQL provides
role-scoped DDL when the session is already authorized to assume the owner role;
this is a conditional design, NOT a claim that this Supabase project grants it.
Managed-role support/availability must be confirmed rather than inferred from a
Dashboard button, CLI access or a service-role API key. No network documentation
lookup or provider capability verification was performed.

## First: separately approved read-only evidence

1. Run STEP-7R10-EXECUTION-ROUTE-PREFLIGHT.sql in the approved project's SQL Editor
   using the SAME connection/session/current role proposed for application.
   It inspects session_user AND current_user and the actual Storage owner.
   PostgreSQL SET ROLE permission depends on the session identity, which need not
   equal the SQL Editor's current postgres role. No SET ROLE is attempted.
2. PG16+ checks pg_has_role(..., 'SET'), not merely MEMBER/USAGE. Before PG16,
   membership permits SET ROLE, so the query uses MEMBER. This is version-gated;
   newer pg_auth_members options are read through to_jsonb for compatibility.
   NOLOGIN does not by itself prevent authorized SET ROLE. Positive catalog rights
   are still subject to the platform's approved execution mechanism.
3. Require existing session authority to enter supabase_storage_admin AND explicitly
   restore postgres, plus the Storage owner's required schema access. If absent,
   STOP; do not grant membership or modify managed roles to force a pass.
4. Recheck public-table ownership/grant authority with R9. Role-switch evidence
   does not prove public DDL rights or resolve unapproved policy expressions.

SQL Editor instructions: verify name/ref, select intended role, run each complete
read-only file separately, export all result rows privately. Do not select/run a
migration. The policy export contains actual schema expressions and literals;
inspect unexpected sensitive literals privately instead of posting raw output.
Neither script reads application/user rows, secrets, JWT settings or credentials.

## Original predicate review — required independently of role authority

STEP-7R10-POLICY-BASELINE-REVIEW.sql exports USING/WITH CHECK expressions, command,
mode, sorted policy roles and fingerprints for the SIX expected original policies.
Expected expressions/roles are deliberately NULL and independently_approved=false,
so observation alone always remains REVIEW. No fingerprint is copied into an
approval slot automatically. Compare with independently supplied original reviewed
SQL, not with the desired replacement predicates from R8 (they intentionally differ).

The original reviewed predicates are not available in this checkout. If that SQL
cannot be supplied, explicitly approve a NEW baseline after independently reviewing
the captured current expressions against the security intent. Do not claim this
recovers or matches the lost SQL. Review role/status handling, positive parent
joins, null ownership, malformed Storage paths, any negative/non-monotone clauses,
function/schema qualification, recursion and all overlapping policies from R9.
Record exact approved expressions, sorted roles, command/mode, helper snapshots,
deparser search_path and PostgreSQL version before recording fingerprints. Format/
qualification differences require review; identical hashes do not imply approval.

## Preferred route IF existing authorized role switching is proven

Prepare a NEW reviewed revision, with a NEW SHA-256, only after the checks pass:

1. Begin one transaction as the approved public-table executor postgres. Verify
   session role-switch authority, current role, all original approved policy/helper
   definitions, grants, RLS, owner roles and the unchanged no-read baseline.
2. Lock public application/metadata tables under postgres. Enter the existing
   Storage owner using transaction-local role switching, lock storage.objects,
   then explicitly restore postgres. Locks belong to the transaction and remain
   held across role changes; all relevant locks precede granting application SELECT.
3. Apply the five public SELECT grants and public protected/metadata restrictions
   as postgres within the same transaction. Switch only for Storage policy DDL
   to the actual authorized owner, preserve the old predicate AND the canonical
   owner/reviewer/org/document-ID restriction, then explicitly restore postgres.
4. Recheck grants/policies/role, commit once. Any failure aborts/rolls back the
   WHOLE transaction, including SELECT grants. No intermediate committed grant-only
   state is permitted. No role membership, helper or Storage grant changes.

Transaction-local role changes must be top-level authorized session operations,
not placed in a SECURITY DEFINER workaround. RESET ROLE can restore a more
privileged session identity instead of the intended postgres context; explicit
restoration must be verified. Verify client/editor supports one uninterrupted
transaction and does not execute fragments in separate sessions. Ownership grants
must not be introduced to enable the route. Catalog checks alone are not a test
of the platform's actual execution restrictions.

No executable role-switch migration is generated now: privileges and baseline
approval are still missing, and the unchanged migration cannot be wrapped with
one SET ROLE statement (public grants and managed Storage DDL need different
authority). Do not run it with either role for the entire file.

## If switching is unavailable: provider-supported options requiring approval

Ask the project administrator/Supabase support to confirm a supported execution
mechanism for managed Storage policy DDL. This task does not send a support request.
Prefer a supported authorized connection that can perform the scoped owner change
inside the SAME transaction; prepare a new artifact only after capability is proven.

If the provider can only perform a separate Storage operation, global atomicity
cannot be claimed. A separately approved STORAGE-FIRST split can remain fail closed:

- Stage A: authorized managed-owner executor applies ONLY the reviewed narrowing
  Storage policy. No public SELECT grants. Verify exact resulting predicate/roles,
  RLS/private bucket and unchanged ACLs. Retain original fingerprints for audit.
- Stage B: after Stage A verification, a newly prepared public-only migration as
  postgres asserts that exact approved Storage state, then grants SELECT/narrows
  the five public policies atomically. It must not ALTER storage.objects or blindly
  reuse the current R8 draft, which still contains Storage DDL.
- If Stage A fails, stop. If Stage B fails, its grants roll back while Storage stays
  narrowed. Do not restore broad Storage access as rollback. Storage may temporarily
  deny more requests between stages (especially before parent-table SELECT exists).

This split is NOT currently prepared/approved and would need separately hashed
artifacts, per-stage approvals, immutable approved baselines, before/after checks,
no concurrent schema changes and a maintenance/availability plan. No automatic
compensation that broadens policies. Do not commit PUBLIC GRANTS FIRST.

## Forbidden workarounds / continuing blockers

No table ownership transfer; superuser/BYPASSRLS grants; RLS disablement; managed
role membership grants; service-role fallback; SECURITY DEFINER privilege bridge;
or weakened predicates. Do not assume Dashboard/CLI bypasses PostgreSQL ownership.
Existing broad service_role privileges remain outside application/test reads.

Application gate remains false; all document writes remain disabled. No data or
credentials were touched. Owner/reviewer self-only membership visibility remains
the intended MVP policy; owner does not imply permission to list peer memberships.

## Approval checkpoints

Current status: BLOCKED. Next approval may authorize ONLY the two read-only
inspection scripts on the isolated project and private baseline review, not DDL.
Then obtain provider/project authorization for the proven execution mechanism.
Before any mutation, approve a NEW exact migration hash and owner context, either
one atomic session or explicitly ordered/verified Storage-first split. Reconfirm
target identity and that reads/writes remain disabled. Current R8 hash approval
alone cannot resolve its known ownership blocker. No SQL has been executed here.
