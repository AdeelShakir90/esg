# Separate semantic verification report

## Conclusion and evidence scope

**Semantically equivalent for all three exported USING predicates.** No meaningful authorization difference was found between the actual deparsed expressions and the independently derived expected expressions. Differences are right-hand AND grouping plus inter-token whitespace. This is a separate static semantic finding, NOT an exact-comparison PASS, full RLS certification, baseline approval or application enablement.

Reviewed original file: C:\Users\adeel\esg\docs\security\postflight-predicate-diagnostic.csv, 14 rows. File SHA-256: 8b78277a92fcf3be948788f3cb18a86221121bc0cc3d3ee8a1c957e672c93e22. For all three rows, UTF-8 hex reproduces the full expression text, recomputed MD5 agrees with the export and earlier postflight CSV, and expected text agrees with the independent canonical expectation (including its catalog-informed text-column rendering). Metadata remains authenticated-only SELECT/r, PERMISSIVE, NULL WITH CHECK. The overlap inventory contains only the expected policy for each target. Membership role/status are exported as text and both user/organization IDs as uuid.

No SQL execution, remote connection, migration rerun or policy/helper/grant/application change. Canonical checks and source exports are unchanged. All original three FAIL results and six original REVIEW rows remain unchanged; application reads and writes remain disabled.

## Exact difference proof, separate from canonical comparison

Token positions below are one-based under the existing token grammar; quoted literals and identifiers remain intact. Each actual expression has exactly two extra tokens. There is exactly one matched parenthesis pair whose omission produces the expected token sequence. That pair encloses only the newly added AND group; no operator, literal, cast, alias, correlation, regex, CASE boundary or other token changes. This operation is used ONLY to identify the reviewed difference, never as a canonical normalization or automatic acceptance rule.

| Policy | Actual / expected token counts | Extra matched grouping pair | Reported actual MD5 | Separate semantic finding |
| --- | --- | --- | --- | --- |
| documents_select_active_member | 42 / 40 | 16–41 | 41a0c328d5f4283bbb3097581a8fbaa0 | Equivalent AND regrouping |
| memberships_select_same_organization | 69 / 67 | 32–68 | f5d32ebd3eacf67f3ccf686202340990 | Equivalent AND regrouping; same text coercions |
| storage_documents_select_active_member | 163 / 161 | 42–159 | 1523125a757bc5e8bbffd39f7e501d49 | Equivalent THEN conjunction regrouping; CASE/casts/bindings unchanged |

The SQL pretty representation was read only as a navigation aid. Equivalence was assessed from full non-pretty expression text, exact exported bytes, token grouping and manual scope review. Grouping preserves three-valued boolean results for these identical stable checks; it does not imply left-to-right AND evaluation. No cast safety conclusion relies on conjunct order.

## Documents

Let N mean organization_id IS NOT NULL, M the caller/organization-scoped active membership helper, and R the same organization's active owner/reviewer helper. Expected is N AND M AND N AND R. Actual is N AND M AND (N AND R). Both have the same boolean result, including NULL, and require non-null ownership and active owner/reviewer membership. The broad helper still recognizes active member, but R denies that role. Suspended/outsider/foreign-organization callers cannot acquire access from the regrouping. The expression itself uses no caller-supplied organization override or privileged client.

## Membership metadata

Let S be user_id = auth.uid(), A the retained owner/admin helper, T status = 'active', and R role = ANY(['owner','reviewer']). Expected is (S OR A) AND S AND T AND R. Actual is (S OR A) AND (S AND T AND R). The entire new group remains OUTSIDE the old OR. Therefore the retained admin branch cannot bypass self-only, active and owner/reviewer conditions. An owner still cannot list peers; an active member/admin-only role and any suspended membership fail the added restriction. NULL identity/status/role cannot produce a true policy condition.

The export confirms role and status are text. Both compared deparsed expressions contain identical text equality/ANY operations; the migration's redundant text-to-text casts are absent in both. The original expected JSON's enum-capable spelling is rendered using canonical catalog type handling; no new cast-normalization rule is introduced here.

## Storage — independent branch and binding review

Actual shape is CASE WHEN G THEN (B AND M AND (B AND E)) ELSE false END. Expected is CASE WHEN G THEN (B AND M AND B AND E) ELSE false END. G, B, M and the entire E subquery have identical tokens. B is bucket_id = 'documents'; M is the old active-member parser check. E is the same correlated EXISTS restriction.

- **WHEN:** documents bucket AND the full anchored, case-insensitive UUID/UUID.pdf path regex. Exactly two path segments, canonical UUID punctuation/hex and the PDF suffix are required. NULL or rejected names/buckets take ELSE false. The bucket and regex constants are identical; case-insensitive matching permits uppercase hex/PDF as designed.
- **THEN:** both the retained member/parser predicate AND all new restrictions remain inside the CASE branch. The extra parentheses contain the new bucket/EXISTS conjunction only; they do not move anything across WHEN/THEN/ELSE.
- **ELSE:** literal false, unchanged. No OR or fallback broadens access.
- **Organization cast:** split_part(objects.name, '/', 1)::uuid is inside E under THEN. The canonical WHEN grammar validates the segment's UUID syntax first.
- **Document cast:** split_part(split_part(objects.name, '/', 2), '.', 1)::uuid is likewise under THEN. The exact two-segment UUID.pdf grammar validates this filename component. Cast operands, delimiters, indexes and uuid type are identical.
- **Exact object metadata:** d.storage_path = objects.name binds the complete outer object path; a valid organization prefix alone does not suffice.
- **Ownership:** d.organization_id IS NOT NULL AND d.organization_id = parsed first UUID segment. Legacy unowned documents cannot satisfy E.
- **Document identity:** d.id = parsed filename UUID binds the exact document, rather than any document in the same organization.
- **Role:** has_active_organization_role(d.organization_id, ARRAY['owner','reviewer']) scopes permissions to that same parent organization with fixed roles. The old broad active-member test cannot independently grant access.
- **Correlation:** d is public.documents; objects.name is the outer Storage row. FROM, WHERE, aliases, casts and all AND relationships inside EXISTS are unchanged. Existing parent-document RLS is an additional dependency, not a replacement for those bindings.

Malformed UUID/legacy/date prefixes, extra segments and non-PDF names cannot reach the guarded branch. Canonical-looking orphan/wrong-ID/mismatched-path/unowned objects cannot satisfy E. The old parser additionally rejects UUID versions/variants outside its reviewed grammar; that remains fail-closed. The source contains variable-dependent casts rather than unguarded constant casts or aggregates; syntactic CASE guard placement is preserved. This review does NOT execute malformed-path tests or certify every optimizer/function/deployment state. AND order is never assumed to guard a cast.

## Decision and preserved exact failures

All three exact-comparison FAILs are explained by benign deparser grouping/whitespace in the reviewed export. They remain FAIL in the canonical postflight and original CSV. No expected predicate, comparator or policy is changed, and no observed expression is adopted as a replacement baseline. Accepting this separate semantic report is a human decision distinct from any future comparator update, live testing or application enablement. This review is current-state only and makes no historical-equivalence claim.

## Preserved REVIEW limitations and risks

- The Storage baseline is PROPOSED, not automatically adopted; equality remains REVIEW.
- PostgreSQL 17+ Storage MAINTAIN/grant-option rights were not in the pre-migration baseline. Later false observations do not establish unchanged rights.
- The full role-membership graph, SET ROLE paths and all role attributes were not baselined. Effective inherited/PUBLIC checks do not prove graph identity.
- SQL privileges are separate from row-level authorization. Existing Storage write grants/policies, service-role bypass and previously issued signed URLs need separate consideration; this SELECT review does not authorize writes.
- Original postflight manual approval/project-scope REVIEW rows remain. Hashes and CSV claims do not independently attest project identity or provenance.
- Catalog comparisons and synthetic parser cases do not prove end-to-end RLS isolation, Storage API behavior or race-free role suspension. Application gates remain closed pending separately approved live tests.

## Next phase: separately approved synthetic RLS tests

No live tests in this section are executed or authorized by preparing this report. The supplied diagnostic export has now been reviewed and each semantic finding recorded above without changing the three exact FAIL rows. Obtain explicit acceptance of these separate semantic findings and separate approval for isolated fixture setup, user-scoped tests and cleanup. Never rerun the migration to resolve an acceptance comparison.

The existing offline target guard must run before client creation or any network I/O: explicit integration opt-in, exact ref gkhrtrakukqdhgvucudv and matching isolated URL, with no .env.local/application-credential fallback. Do not create/request credentials during this review. Use existing synthetic identities only after independently confirming their roles/status; historical test users/organizations are not proof of current state.

| Principal/scenario | Expected database/Storage read outcome |
| --- | --- |
| Anonymous | No application-table access; Storage SQL privileges alone do not grant rows or downloads |
| Active owner A and reviewer A | Only authorized A documents, parent ESG extractions/fields, organization metadata and own membership row; no peer membership listing |
| Active owner B | Only B data; cross-organization UUID/path probes cannot reveal A data |
| Active member/admin/unknown nonprivileged role (if schema allows) | No protected reads or organization metadata under owner/reviewer restrictions |
| Suspended owner/reviewer/member; outsider | No protected or membership/organization metadata access |
| Foreign/unowned/orphan parent records | No document/child-field/object visibility; no NULL ownership fallback |
| Storage invalid paths/metadata | Deny legacy prefixes, malformed UUIDs, extra segments, non-PDF names, wrong document ID, mismatched organization, wrong exact path and alternate bucket; malformed names must not raise UUID cast errors |

Use synthetic documents/ESG rows and synthetic PDF objects only with separately approved administrative fixture setup. Test direct PostgREST reads with real user-scoped clients and Storage list/download paths; never treat service-role reads as RLS tests. Validate negative results with known-positive controls to distinguish denial from missing fixtures. Raw PostgREST may return an empty set or privilege error; the future application's foreign-ID 404 contract is a separate endpoint test, not a database HTTP-status guarantee.

Application mutation endpoints must remain disabled with their documented response. Public-table write privileges must remain denied. Existing managed Storage write authorization requires a separate explicitly approved test plan; do not upload documents as part of a read-only review. Test revocation/suspension across fresh requests, cleanup only the recorded fixture IDs/paths, and verify aggregate counts return to the pre-fixture baseline. No real customer data, AI calls, production project or broad resets.

Record positive/negative evidence for each principal, known fixture IDs privately, zero cross-tenant leakage, malformed-path exception safety, helper/role context and cleanup results. A semantic report alone grants no permission to enable application reads/writes or deploy.

## Offline verification

Four new evidence-specific tests PASS: original diagnostic text/hex/hash validation and metadata; unique right-hand AND grouping witness for each predicate; preserved Storage CASE/cast/binding structure with rejection of substantive role/path/ownership/ELSE mutations; and original FAIL/REVIEW, migration hash and disabled-gate preservation. The diagnostic SHA-256 binds this report to the reviewed export; project identity remains supplied provenance, not independently contacted/attested here. These local tests never execute SQL or modify canonical comparison logic.
