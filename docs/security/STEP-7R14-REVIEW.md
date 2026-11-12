# Step 7R.14 — helper bodies unavailable locally; manual review still required

Project: envario-security-test / gkhrtrakukqdhgvucudv.
Local preparation only. No SQL/project connection, helper invocation, migration,
privilege change, credentials or application change. Reads/writes remain disabled.

## Exact local findings

Repository inspection found references, policy snapshots, structural descriptions
and deliberately NULL expected helper fingerprints. No full original CREATE
FUNCTION definitions or independently reviewed body exports/fingerprints for the
three helpers were found in project SQL, documentation/reference JSON or security
artifacts. Policy expressions calling the functions are not their implementations.
Historical local development on the lost laptop is not recoverable evidence here.

| Helper | Available reviewed description | Exact body comparison |
| --- | --- | --- |
| is_active_organization_member(uuid) | postgres-owned, SECURITY DEFINER, STABLE, empty search_path; any active membership, including member | REVIEW: original/full body absent |
| has_active_organization_role(uuid,text[]) | postgres-owned, SECURITY DEFINER, STABLE, empty search_path; auth.uid(), active membership and allowed roles | REVIEW: original/full body absent |
| document_storage_organization_id(text) | postgres-owned, SECURITY INVOKER, IMMUTABLE, empty search_path; first path UUID | REVIEW: cast guards/NULL/error behavior unknown |

User reports R13 policy, platform, locks, RLS/grants passed with no FAIL. Those
results do not resolve the three helper body REVIEW rows. No exact equality or
semantic PASS can honestly be asserted from a function name, owner or observed hash.

## Prepared read-only export

Run docs/security/STEP-7R14-HELPER-BODY-REVIEW.sql ONLY after separate approval,
in the named isolated project's SQL Editor as the intended inspection role.
It returns one category/object_name/check_name/result/details table. It exports
pg_get_functiondef for only the THREE named functions, body/definition hashes,
owner/security/volatility/type/argument metadata, empty-path checks, effective
EXECUTE ACLs and direct catalog dependencies. No application/user/object rows or
JWT claims are read and none of the target functions is executed.

Keep the CSV private: source definitions themselves might unexpectedly contain
sensitive literals/configuration. Inspect before sharing; redact unexpected secrets
in shared copies while preserving an access-controlled original for review. This
is a targeted schema-code export, not permission to export credentials or arbitrary
other helper bodies. If an unexpected nested helper is found, request targeted
review separately rather than treating the dependency list as complete.

Original definition/hash fields stay NULL and reference_approved stays false.
Observed definitions/hashes cannot populate their own expected values. A future
independently reviewed reference may use exact pg_get_functiondef text/fingerprints
with the same PostgreSQL/deparser context. Do NOT normalize whole function bodies
by stripping whitespace/comments: literals, dollar-quoted code and dynamic SQL
can change meaning. A text mismatch is a review trigger, not proof of unsafe code.
No baseline or migration fingerprint is changed by this preparation.

## Mandatory semantic review — not replaceable by text searches

### Both SECURITY DEFINER membership helpers

- Confirm complete caller binding: membership.user_id = auth.uid() AND the supplied
  organization matches membership.organization_id AND status is active. Do not
  use current_user/session_user as application identity: they are database roles
  and inside a definer helper may identify postgres.
- Check correct parameter/column resolution, qualified relations/functions/types,
  parentheses, NULL/anonymous inputs and absence of broad OR branches, unconditional
  fallback, user-supplied user IDs, dynamic SQL, arbitrary query text or side effects.
- Empty search_path is necessary, not sufficient: qualify dependencies and review
  implicit temporary-schema lookup. Confirm owner trust, body language/attributes,
  EXECUTE reachability and no unintended nested definer calls or credential access.
- Confirm the definer identity can read memberships without re-entering membership
  RLS. Review uniqueness of user/organization records; contradictory duplicate
  memberships conflict with the offline contract's fail-closed handling.
- The broad is_active helper intentionally permits active member. Do not falsely
  certify it as owner/reviewer-only or silently change its contract. The pending
  migration retains that helper AND adds explicit owner/reviewer policy checks.
- The role helper must additionally AND the caller's active membership role with
  the supplied role array. NULL/empty roles must not grant access, and no special
  admin bypass may override the requested list. A caller can request different
  lists when invoking an exposed helper; document policies must retain fixed
  owner/reviewer arrays and must not accept a client-supplied allowlist.

### SECURITY INVOKER Storage parser

- Confirm it only parses text deterministically; IMMUTABLE is incompatible with
  reading document/membership tables, auth.uid(), JWTs, current time or mutable
  configuration. No privilege bridge, metadata lookup or role check should be
  smuggled into this parser while keeping the old declaration.
- Inspect whether the first segment is validated BEFORE ::uuid, and how NULL,
  empty strings, empty segments, malformed UUIDs and legacy dates are handled.
  A raw split_part(..., '/', 1)::uuid can throw; its safety is not established by
  the IMMUTABLE or SECURITY INVOKER labels. No test call is run in this phase.
- The R8 migration's canonical CASE encloses BOTH old and new predicates and
  protects Storage-policy evaluation of malformed names. It does NOT make direct
  RPC/parser calls safe, nor fix other callers using the parser without a guard.
- A parser result is only an organization ID, never proof of document ownership.
  The pending Storage predicate must keep exact object-path/organization/document
  matching and owner/reviewer checks. Preserve private bucket/RLS and deny legacy
  or unowned data; do not change helper bodies or ownership to force a review PASS.

SQL marker flags in the export are navigation aids only. Comments and string
literals can contain auth.uid/active/ANY while actual logic is unsafe; absence of
the marker may simply reflect qualified/quoted names or nested calls. All body
semantic rows remain REVIEW until a human reviews the complete code/dependencies.

## Remaining risks / readiness

Unresolved: exact full helper bodies and provenance, complete caller scoping and
role/status logic, NULL behavior, nested dependencies and direct-parser malformed
input behavior. Existing summaries alone cannot resolve those questions. A verified
current helper implementation can become a NEW explicitly accepted baseline; it
need not be misrepresented as the original lost historical source.

Do not mark the R13 helper-body rows PASS or modify its NULL expected hashes now.
No additional policy review is substituted for the missing helper implementation
review. There is no established new defect in the R8 migration from these missing
bodies, but semantic security clearance remains REVIEW / NOT EXECUTION-APPROVED.

## Final approval checklist

1. Separately approve ONLY the targeted read-only export on the isolated project.
2. Review the complete definitions and listed settings/ACLs/dependencies privately
   against the criteria above. Resolve every structural FAIL and semantic REVIEW;
   unsafe/ambiguous logic requires a new local correction proposal, not live edits.
3. If independent originals become available, compare with those. Otherwise
   explicitly approve the reviewed CURRENT helper definitions as a new baseline,
   record full definitions, owner/mode/path/ACLs, PostgreSQL version and definition
   fingerprints. Do not infer historical equality or auto-approve observed hashes.
4. Prepare a separately reviewed read-only comparison using those accepted values
   and confirm no subsequent drift. Actual function-invocation tests still require
   separately authorized isolated synthetic testing; catalog checks are not execution.
5. Reconfirm the six policy baseline comparisons, current supautils authority,
   locks, privilege baseline and unchanged migration hash before asking for the
   separate ONE-transaction migration approval described in R12/R13. Include stop/
   ROLLBACK on errors and read-only postflight; no fixture creation or app enablement.

Migration remains unchanged:
B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087.
No helper, permission, policy or database changes were made. Keep all application
reads/writes disabled until separately authorized integration and application work.
