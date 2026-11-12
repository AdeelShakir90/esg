# Synthetic RLS test phase — review only

## Authorization and current state

On 2026-11-12 the operator reported all six personas verified and the complete A1/B1/U1 fixture batch validated at `3 / 3 / 3 / 3`, with one object at each exact path. The next proposed phase covers user-session reads of those three fixtures. The setup and SQL simulation stages below are reference material. [Live read test procedure](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-LIVE-READ-REVIEW.md)

The user accepts the separate semantic-equivalence finding in POSTFLIGHT-SEMANTIC-VERIFICATION.md for the three reviewed predicates, explicitly without changing the original exact-comparison FAIL results. Record that acceptance as a separate finding; do not rewrite the original CSV, canonical comparator or migration. Storage baseline acceptance, MAINTAIN, full role graph and manual scope REVIEW limitations remain unresolved.

This phase prepares a plan and SQL only. No SQL/network execution, users, fixtures, policies, migrations or credentials are created here. Application reads/writes remain disabled. SQL scripts are review artifacts, not execution permission.

## Stages and approval boundaries

1. **Read-only reconnaissance:** separately approve running RLS-SYNTHETIC-SCHEMA-PREFLIGHT.sql on envario-security-test / gkhrtrakukqdhgvucudv. Review exact columns/defaults/constraints, schema identity, policies, triggers and current aggregate counts. Confirm postgres can SET ROLE anon/authenticated for SQL simulations without acquiring new authority; inspect membership/version-dependent SET behavior separately if needed. Do not grant anything to make tests run.
2. **Private manifest:** independently map existing synthetic organizations A/B and existing synthetic users to owner A, reviewer A, owner B, active member A, suspended member A and outsider. Verify role/status and outsider nonmembership. Historical users/orgs are not proof. Do not create users or change memberships without a new explicit approval; missing personas block the corresponding tests. Keep private UUID mapping out of shared logs. Fill the SQL NULL placeholders only in a reviewed local copy after mapping is confirmed. No credentials are requested in this phase.
3. **Fixture approval:** review/approve exact target, mapped identities/orgs, reserved fixture UUIDs, synthetic metadata, synthetic PDF bytes, paths, count budget, setup and cleanup. Check schema compatibility first. RLS-SYNTHETIC-FIXTURES-REVIEW.sql is a default-ROLLBACK public-table fixture proposal; it must not be run as part of reconnaissance. Successful rollback is a rehearsal, not fixture persistence. Committing fixtures requires separate explicit approval and a reviewed commit variant. No blanket seed/reset, org/user creation or membership changes are included.
4. **Storage setup approval:** through the supported Storage API only, an authorized administrative fixture process uploads bounded synthetic PDF objects into the existing private documents bucket at the exact manifest paths below, upsert=false. It must verify target before any client creation/I/O using the existing offline integration target guard and explicit integration opt-in. Do not INSERT/DELETE storage.objects directly or change managed bucket/policies/grants. Administrative setup is never an isolation test. No customer files, AI calls or production credentials. Invalid-name uploads might be rejected by Storage validation: record that outcome; do not claim an RLS test for a nonexistent object or bypass validation with SQL.
5. **User-scoped checks:** after separate execution approval, run the prepared SQL simulation and actual Auth/PostgREST/Storage API tests. SQL SET ROLE/JWT claim simulations exercise RLS but do not authenticate a real session or prove API behavior. Real user-scoped sessions are required for end-to-end acceptance. No service-role client may perform the asserted user reads. Existing app endpoints stay gated and are not used to bypass their disabled status.
6. **Cleanup approval:** delete only manifest Storage objects through the Storage API, then review RLS-SYNTHETIC-CLEANUP-REVIEW.sql for only manifest ESG fields/extractions/documents in dependency order, guarded by exact IDs and metadata. The cleanup proposal also defaults to ROLLBACK; persistent cleanup needs a separately approved commit variant. Never delete organizations/users/memberships or entire buckets. Record setup/cleanup receipts and verify aggregate counts return to the reviewed starting state. Stop on ownership/metadata drift; do not delete conflicting data. Storage and database operations cannot be one transaction, so reconcile partial failures explicitly.

## Fixture inventory

Reserved document IDs below use a recognizable synthetic version-4 UUID range. They are proposals, not proof that the IDs are unused; setup fails on ANY collision. Replace the entire range together if a collision exists and re-review all expected sets/paths. Use organization IDs from the private manifest, never supplied by a caller under test.

| Short name | Document UUID suffix (full prefix 70170000-0000-4000-8000-) | Parent organization | storage_path |
| --- | --- | --- | --- |
| A1 | 000000000001 | A | A/A1.pdf |
| B1 | 000000000002 | B | B/B1.pdf |
| U1 | 000000000003 | NULL | A/U1.pdf |

One synthetic completed extraction and one valid not_found ESG field per document exercise parent inheritance. This deliberately is not a complete ESG report; no extraction/model calls occur. File metadata is synthetic and file_size must equal the actual proposed PDF byte count before fixture persistence is approved. Do not assume created_by exists.

Storage fixture manifest must include positive A1/B1 objects and negative probes:

- A/U1.pdf (unowned parent), A/70170000-0000-4000-8000-000000000099.pdf (no parent), and B/A1.pdf (wrong organization/path).
- A/A1.pdf/extra, legacy-security-review/A1.pdf, malformed-prefix/A1.pdf, A/not-a-uuid.pdf and A/A1.txt (shape guards).
- A separate explicitly reviewed document/object pair where storage_path exactly matches the object name but the document ID differs from the filename UUID, and a pair with an exact path but mismatched parent organization. These are needed to isolate each metadata condition; B/A1 alone fails multiple predicates and cannot prove which check denied it. Approve their additional IDs and synthetic rows before adding them; the minimal public fixture SQL does not silently create extra records.

Here A/B/A1/B1/U1 mean literal verified organization/document UUIDs, not those short strings. Any noncanonical test rejected by the upload API remains a setup rejection, not an observed policy denial. Dynamic first-segment parsing is case insensitive; full metadata equality must still match the exact object path. Include uppercase canonical positive/negative probes if supported, plus NULL/empty parser checks already covered in the earlier parser suite.

## Expected results

| Principal | Documents / ESG parents / fields | Organization metadata | Membership metadata | Direct Storage SELECT/list/download |
| --- | --- | --- | --- | --- |
| Anonymous | Public privilege denial; no data | No data | No data | No protected rows/files despite SQL grants |
| Active owner A | A1 only | A only | Own active A owner row only | A1 only |
| Active reviewer A | A1 only | A only | Own active A reviewer row only | A1 only; no processing permission inferred |
| Active owner B | B1 only | B only | Own active B owner row only | B1 only |
| Active member A | None | None | None | None |
| Suspended member A | None | None | None | None |
| Outsider | None for A/B | None for A/B | None for A/B | None |

Every principal must be denied U1 and its extraction/field/object. Owners/reviewers must probe foreign UUIDs, not merely list their own organization. Explicitly test peer memberships: owner A cannot list reviewer/member rows. If permitted by constraints and separately seeded, suspended owner/reviewer and active admin/unknown-role personas are additional required hardening cases; do not mutate existing memberships to simulate them without approval.

For raw PostgREST, protected foreign/unowned reads may return 200 with an empty set; missing table privileges may return a privilege error. Do not impose the future application's 404 contract on the database API. Assert no target row/content is returned, and require known-positive controls to detect a broken client/empty fixture set. SQL simulations should assert exact sets, not just counts. Suspended/nonmember rows must not be read even when the UUID is known.

## Direct Storage API tests

Using ordinary public-key plus real user sessions (and no user JWT for anonymous), call bucket-scoped list at A, B and legacy prefixes, then direct download/get-object for every manifest path without relying on list results. Assert exact allowed synthetic bytes for positives and non-success/no protected bytes for negatives. Do not reuse admin sessions, previously signed URLs or cache hits; disable/purge test-client caching and verify identity changes clear in-memory results. Also test the unauthenticated public object route for a private bucket. Status codes can differ by Storage endpoint; record status/body safely, but classify by access to bytes, not an assumed 404.

Signed URL creation, if separately approved, must be tested under ordinary owner/reviewer/member/suspended/outsider identities; do not generate privileged signed URLs for negative tests. Existing signed URLs are not proof of current RLS and may remain valid after suspension. No application upload/process/validation write is enabled by this read phase. Future Storage-write permission testing is separate because anon/authenticated SQL write grants already exist and SELECT policies alone do not determine write isolation.

## Safe SQL simulation and limitations

RLS-SYNTHETIC-ROLE-READS.sql is a SQL review template with NULL private UUID parameters in its manifest DO block. It contains no data writes and uses a READ ONLY transaction ending ROLLBACK. It deliberately requires positive public/Storage fixtures before changing role. It uses SET LOCAL ROLE and transaction-local request claims, resets role between personas, and asserts current_user/uid/bypass context. Those settings simulate claims only; they must never be treated as real Auth verification. The executor needs already-existing SET ROLE authority. No authority is granted by the script. A FAIL result must stop acceptance; result rows do not cause ON_ERROR_STOP to abort automatically. A SQL error aborts the transaction and requires ROLLBACK before any new attempt.

Anonymous application-table reads must be tried separately via PostgREST; an SQL permission error aborts a transaction, so the combined SQL instead verifies no anonymous effective public SELECT and tests direct Storage SELECT. It cannot turn a permission error into an empty-row PASS. The API phase must still attempt the anonymous reads. Private claim inputs must not be echoed into shared transcripts.

Original three exact FAILs remain preserved, with the separate user-accepted semantic finding recorded. The six REVIEW rows (scope/approval, proposed Storage acceptance, graph and MAINTAIN diagnostics) are not silently resolved. Full schema/user-role/fixture prerequisites, positive controls, real sessions, runtime helper/trigger behavior, complete graph/MAINTAIN evidence and API tests are still necessary. No migration rerun or canonical weakening is part of this phase.

## Acceptance before considering any later enablement

Require zero cross-tenant/unowned leakage, every positive read satisfied, every negative row/file denied without UUID cast errors, owner/reviewer self-only metadata, member/suspended/outsider denial, and complete cleanup receipts. Recheck helper/policy/grant drift and all unresolved limitations. Record the exact approved test artifact and private fixture manifest, target evidence and test results. Live-test success alone does not authorize app read/write enablement, deployment or production changes.

Offline preparation checks: four static plan/SQL contract tests PASS. No SQL parser/server execution was performed. Current null parameters, operator confirmation flags, schema/trigger review and missing live identity/fixture receipts deliberately prevent treating these templates as ready-to-run artifacts. Review SQL permissions and every prerequisite before requesting the next separate approval.
