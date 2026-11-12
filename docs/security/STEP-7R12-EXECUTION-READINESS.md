# Step 7R.12 — local final readiness review; NOT APPLIED

Target: envario-security-test / gkhrtrakukqdhgvucudv ONLY.
Artifact: supabase/migrations/20261109010000_authenticated_read_reconciliation.sql
SHA-256: B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087

No correction to the migration was identified by this review. It is unchanged.
No project connection, SQL execution, credential access or application change.
Read/write gates remain closed. This review does not constitute execution approval.

## Readiness matrix

| Item | Status | Evidence / practical limit |
| --- | --- | --- |
| Exact local migration/hash | PASS | Matches the stated artifact; no rewrite. |
| Existing supautils policy authority | PASS | User confirms current postgres is allowlisted for storage.objects; native ownership/SET ROLE is not required by this configured policy-DDL route. |
| Existing six-table lock privileges | PASS | User reports checks pass. Lock availability/contention is not tested. |
| RLS enabled / private bucket | PASS | Supplied live findings; migration preserves RLS and bucket/grants. |
| Prior app SELECT absence | PASS | Supplied no-access baseline is the expected grant starting point. The migration aborts if it has changed. |
| Six original expressions: semantic review | PASS | Reviewed below as CURRENT state, not recovered historical SQL. Parent-policy descriptions must still correspond to saved exact expressions. |
| Original policy roles/modes | REVIEW | Storage is explicitly permissive SELECT TO authenticated. Earlier core checks reportedly passed; exact other role lists/modes are not reproduced here. Preserve/export and approve all six snapshots. Migration requires permissive SELECT already applicable to authenticated; extra permissive SELECT/ALL policies abort. |
| PostgreSQL statement/API compatibility | PASS | Local grammar/catalog-signature review only; not server-parsed/executed. |
| Atomic grants + all six policy restrictions | PASS | One transaction/commit, no public-grant-only intermediate commit; any error aborts it all. |
| Owner/reviewer and tenant restrictions | PASS | Fixed allowlists, parent joins, null exclusion and self-only memberships; original predicates remain AND conditions. |
| Malformed Storage casts | PASS | One canonical-path CASE guards both original helper and new UUID casts. |
| Recursive RLS prevention | PASS | Under supplied helper definitions, definer reads memberships without entering its policy. Migration checks helper owner/configuration and independent membership read path; drift aborts. |
| Helper/grant/dependency snapshot still current | REVIEW | Retain prior R9/R11 evidence; no new remote inspection was performed. Hidden views/RPCs or unreviewed helper changes must not be assumed safe. |
| First actual policy-DDL execution | REVIEW | Not tested. Configured authority is not an assertion of successful runtime behavior, including nested dynamic ALTER POLICY. |
| Approved baseline + maintenance/rollback record | REVIEW | Requires explicit adoption of reviewed current definitions and exact execution scope. |
| Application read/write gates remain closed | PASS | No application changes or enablement. Production deployment is out of scope; synthetic integration evidence is still required. |

PASS means the stated limited check passes; REVIEW is not silently converted to
approval. No known migration defect remains from supplied facts. It is a candidate
for separately approved TEST-project execution after the checklist, not a claim
of successful PostgreSQL execution or end-to-end security certification.

## Independent original-policy review

The following are supplied current-state expressions/descriptions. Two parent
policies were described semantically rather than supplied verbatim; exact approved
exports are still required. No lost/unpushed SQL is claimed recovered.

1. **documents:** non-null organization_id AND is_active_organization_member.
   Currently admits active member as well as owner/reviewer. New predicate adds
   active owner/reviewer on that SAME document organization; null remains denied.
2. **esg_extractions:** parent document active membership. New explicit
   d.id = esg_extractions.document_id and active owner/reviewer prevents a foreign
   parent or a broad old membership result from authorizing the row.
3. **extracted_esg_fields:** extraction/document active membership. New chain
   e.id = extracted_esg_fields.extraction_id -> d.id = e.document_id applies the
   same non-null ownership and active owner/reviewer restriction. No tenant field
   is accepted from a caller to override those persisted parent relationships.
4. **organizations:** is_active_organization_member(id). New AND role check on
   that id excludes active member/admin, suspended and outsiders. Metadata is
   intentionally narrower than the original active-member policy.
5. **organization_memberships:** user_id = auth.uid() OR
   has_active_organization_role(organization_id, ARRAY['owner','admin']). The old
   self branch exposes a caller's suspended/member row, and the manager branch
   can expose peers. The entire old OR expression is parenthesized then ANDed
   with user_id = auth.uid(), status = active, role IN (owner,reviewer). Therefore
   the owner/admin branch cannot leak peer rows; active reviewer can see their
   own row via the old self branch. Active admin/member own rows are denied.
   Owners cannot list other members in this MVP. No invitation/admin privilege
   follows from a role string appearing in the retained predicate.
6. **storage.objects:** permissive SELECT TO authenticated; bucket=documents AND
   broad active membership of parsed path organization. The migration retains
   that expression and adds bucket, exact storage_path, document organization and
   document UUID matching plus active owner/reviewer. The CASE rejects legacy,
   malformed, extra-segment or noncanonical names before any old/new parser runs.
   Orphan objects and null-owned parent documents are inaccessible.

Under these reviewed positive dependencies, combining old and new predicates
cannot admit rows outside the new restrictions. The new five-table SELECT grant
intentionally enables authorized reads relative to the old no-grants state. It
does not grant writes or authorize member/admin/suspended/foreign reads. This
reasoning does not certify arbitrary unseen function bodies or exposed RPCs.

## Recursion, authority and compatibility

- docs -> role/membership helper -> memberships (definer owner bypass path).
- runs -> authorized document; fields -> authorized run/document.
- organization -> role helper; membership -> old role helper plus self restriction.
- Storage -> old helpers and authorized document; document policy never queries
  Storage, so the new graph has no Storage/document cycle.

Helpers remain postgres-owned; no ownership or role privilege is changed. The
existing postgres execution identity must be able to read memberships without
its policy: BYPASSRLS/superuser or table owner without FORCE RLS. Otherwise the
migration aborts rather than introducing recursive evaluation. Definer bodies
must use auth.uid(), qualify dependencies, and retain the reviewed empty path.
Membership uniqueness must remain established; duplicate contradictory rows would
not match the offline contract's fail-closed duplicate handling.

ALTER POLICY has the correct TO/USING form. Policy identity, SELECT command and
permissive mode remain unchanged. The old predicates are deparsed under an
explicit pg_catalog-only search_path in both alteration blocks. %I quotes policy
identifiers; the table comes from regclass and expressions from catalogs/fixed
local strings. No client SQL is interpolated. regrole/oid casts and effective
table/column/helper privilege probes use PostgreSQL's supported overloads.
Comma-separated privileges intentionally detect ANY unexpected privilege.

The observed existing supautils policy_grants authorizes policy DDL as postgres,
not table ownership, arbitrary managed-table DDL or row-RLS bypass. Public docs:
https://github.com/supabase/supautils#manage-policies
https://supabase.com/kb/troubleshooting/revoking-privileges-on-storage-pg_cron-vault-and-extension-objects-has-no-effect-916576
No SET ROLE attempt, new capability/configuration grant, helper rewrite or
SECURITY DEFINER escalation is part of the migration. Actual runtime behavior is
still REVIEW until the separately approved first transaction is attempted.

## Exact execution checklist — requires separate approval

1. Identify name/ref manually. Current applying role must be postgres in the same
   session whose R11 policy-grant/lock checks passed. Do not substitute service_role.
2. Recompute the local SHA-256 above and verify the file is the complete combined
   artifact. Do NOT execute the older 20261109000000 draft or a blanket db push.
3. Adopt the six saved exact CURRENT expressions, command/mode and sorted roles
   as the approved starting baseline. They are not historical fingerprints.
   Save helper bodies/fingerprints/owners/ACLs privately and record the R9/R11
   results. Observed hashes alone do not establish semantic approval.
4. Confirm no drift in the no-app-grants baseline, RLS, helper definitions/owner,
   EXECUTE/schema permissions, membership uniqueness, parent FKs, extra policies,
   private PDF/5MiB bucket or Storage ACL. No unexpected direct mutation RPCs or
   role inheritance paths. A changed baseline requires a new review, not a retry
   with weakened checks. Confirm no app writes or concurrent schema/grant/helper
   changes. Record counts; never assume an earlier empty bucket stays empty.
5. Save the original ACLs and all six policy snapshots plus a recovery owner and
   emergency deny-read plan. Do not export credentials or customer contents.
6. Approve a short maintenance window. ACCESS EXCLUSIVE locks block table reads
   and writes until transaction end; they are not privilege changes. The 5-second
   lock timeout is per acquisition and 30-second statement timeout is per command/
   DO, not a global transaction deadline. Monitor/stop abandoned transactions.
7. Only after explicit approval, execute ONE complete file in ONE connection with
   no surrounding transaction, manual statement selection, role changes or added
   commits. Do not treat the attempt as a read-only preflight. It is real DDL even
   if later rolled back. Stop on the first error. No try-and-fix escalation.
8. A denied/unsupported ALTER POLICY or lock operation must abort the transaction;
   all five SELECT grants and policy edits roll back together. Capture the error
   without secrets; ROLLBACK any open failed transaction. Ask for reviewed provider
   resolution instead of changing managed ownership, grants, RLS or using a key.
9. After successful COMMIT, run the approved read-only postflight below. Keep all
   application read/write gates CLOSED regardless of catalog PASS results.

## Postflight checks — ready scripts; no execution here

First run docs/security/STEP-7R8-POSTFLIGHT.sql in full, read-only, and export its
single result grid. It checks:

- Five public tables: authenticated SELECT, no effective application write/other
  listed rights, anon no table/column access, RLS still enabled.
- Six named policies: SELECT, permissive, TO authenticated only; no extra
  permissive SELECT/ALL path; private comparison of changed predicate fingerprints.
- Helpers unchanged: postgres owner, modes/types/volatility, empty configured path,
  EXECUTE and nonrecursive membership read eligibility. Compare stored snapshots.
- Storage ACL unchanged, documents bucket still private/PDF-only/5MiB; aggregate
  document/object counts unchanged. No data/fixture writes are part of migration.

Then use docs/security/STEP-7R10-POLICY-BASELINE-REVIEW.sql only as a private
definition export, NOT as an unchanged-baseline PASS check: after migration the
six predicates SHOULD differ. Keep its independent approval fields false unless
they have been explicitly updated through a reviewed evidence process. For each
export confirm old AND new, fixed owner/reviewer arrays, self-only active
membership, canonical Storage CASE, exact organization/document/path matching and
unchanged WITH CHECK/roles as intended. R9's native-ownership-only Storage FAIL
must not be used to negate the verified supautils route. No test DDL is needed
to obtain metadata, and no script is executed by this preparation.

Catalog success with zero documents does NOT test row-level isolation. In a later
explicitly approved synthetic integration phase, test owner A/B, reviewer, active
member, active admin/unknown role if allowed by constraints, suspended owner/member,
outsider and anonymous; own vs foreign/null parents; peer memberships; wrong-ID,
orphan, malformed and legacy objects. Use user-scoped clients, never service-role
reads as an isolation test. No AI calls or production data. Writes stay disabled
in the app; fixture setup/cleanup is a separate administrative approval.

## Rollback and recovery

Before COMMIT, any error aborts all changes. Explicit ROLLBACK releases transaction
locks; do not continue editing an aborted transaction. If connection status is
uncertain, inspect it read-only before assuming an error left partial changes.

After COMMIT, do not replay the migration (its no-grants baseline now deliberately
fails). Keep gates closed. Obtain explicit approval for a forward recovery artifact
that revokes ONLY the five SELECT grants introduced by this migration, after
checking no intervening grant/dependency changes. This restores the former public
no-read privilege state and leaves restrictive policy edits in place. Ordinary
authenticated Storage reads should also fail closed because the new policy must
SELECT the public document metadata; verify no other grant/policy path remains.
Existing service_role access and previously issued signed URLs are not revoked.
If explicit authenticated Storage denial is required, a separately approved
supported policy-DDL transaction can AND false into its existing SELECT predicate;
retain unrelated restrictive policies and first recheck extra permissive policies.
Never revert to broad member predicates or change Storage ACL/ownership as recovery.

No data restore/move is needed because this migration changes no rows or objects.
Downloaded data and previously issued signed URLs cannot be recalled by this
policy rollback; keep real file use disabled until integration testing is approved.

## Exact remaining approval scope

Adopt the saved six current-state policy/role/mode snapshots and helper/grant
evidence as the baseline; confirm maintenance/recovery ownership. The first actual
policy-DDL attempt remains untested and must be explicitly authorized as such.
No independent historical-match claim is needed or made.

Suggested approval:

> Approve the reviewed CURRENT-state baseline and apply ONLY
> 20261109010000_authenticated_read_reconciliation.sql, SHA-256
> B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087,
> to envario-security-test (gkhrtrakukqdhgvucudv) as postgres in ONE transaction
> using its existing supautils policy authorization and verified lock rights.
> Stop/rollback on any error. Run only the agreed read-only postflight afterward.
> Do not change ownership/roles/Storage grants, run other migrations, create
> fixtures, deploy, or enable application reads/writes.

This document asks for no execution now. A separate explicit user approval is
required before any project connection, first DDL attempt or postflight execution.
