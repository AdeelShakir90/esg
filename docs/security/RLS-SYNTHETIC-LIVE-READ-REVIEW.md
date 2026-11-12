# Live RLS and Storage read tests for review

## Evidence and approval scope

The operator reported full-batch validation PASS for A1, B1 and U1 on 2026-11-12 in envario-security-test (`gkhrtrakukqdhgvucudv`). Counts are `3 / 3 / 3 / 3`, and every exact path has one object. The three objects were downloaded and verified during administrative setup. This phase proposes one anonymous control and six genuine synthetic user sessions for fixture-scoped PostgREST and Storage reads. Sign-in may create normal Auth session and audit records. The approved read workload would leave application rows, policies and Storage objects unchanged.

The original three canonical predicate FAILs retain their separately accepted semantic-equivalence finding. Preserve the proposed Storage baseline acceptance, Storage MAINTAIN, full role graph and manual scope REVIEW findings. Existing Storage write policies, previously issued signed URLs and service-role access remain outside this read test. Malformed paths, wrong-ID objects, mismatched parent metadata and revocation transitions require their own fixtures and approval. Application reads and writes stay disabled.

## Expected exact sets

The row scope is A1, B1 and U1, their three linked extractions and fields, and the two verified organizations and their memberships. U1 uses A's prefix in Storage and has NULL organization and uploader in the database.

| Caller | Document, extraction and field labels | Organizations | Memberships | Storage list and download |
| --- | --- | --- | --- | --- |
| Anonymous | No rows or privilege denial | None | None | None |
| Owner A | A1 | A | Own active owner row | A1 |
| Reviewer A | A1 | A | Own active reviewer row | A1 |
| Owner B | B1 | B | Own active owner row | B1 |
| Active member A | None | None | None | None |
| Suspended member A | None | None | None | None |
| Outsider | None | None | None | None |

Every caller must be denied U1 across the document, extraction, field and object checks. Owner A and reviewer A must be denied B1. Owner B must be denied A1. Organization owners must not see peer membership rows.

## Procedure after separate approval

1. **Confirm the test target and controls.** Verify envario-security-test (`gkhrtrakukqdhgvucudv`) and URL `https://gkhrtrakukqdhgvucudv.supabase.co`. Use the private, verified mapping of both organizations and the six personas. Require the existing target guard with explicit opt-in before constructing any client. If the fixture evidence is stale, refresh the read-only identity and full-batch validators in a separate administrative session. Require six VERIFIED results and three fixture PASS rows at `3 / 3 / 3 / 3`. Administrative results establish existence only. Keep the administrative setup key out of all persona clients. [Target guard](C:/Users/adeel/esg/src/lib/security/integration-target.ts) · [Fixture validator](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-FIXTURES-VALIDATE.sql)
2. **Establish the correct identity for each run.** Use a fresh private server-side Supabase client configured with the isolated project's **Publishable** key, `persistSession: false`, `autoRefreshToken: false` and `detectSessionInUrl: false`. Reject an administrative key. For anonymous, use the client with no user session. For each persona, obtain a real Auth session with that synthetic account's private credentials through `auth.signInWithPassword`, then call `auth.getUser()` and compare the returned UUID privately to the manifest. Require the expected Auth identity before counting any data result. A missing credential or unsuccessful sign-in blocks that persona's test. A suspended organization membership should still permit Auth sign-in and be denied by application-data and Storage authorization. End each run by discarding the in-memory client and credentials. Keep keys, passwords, user tokens, UUIDs and full paths out of shared output.

   Review the operator transport before execution. Pin the isolated HTTPS origin and reject redirects. Allow only Auth password sign-in and user verification, GETs on the five named PostgREST tables, the read-only Storage list POST for `documents` and GETs of the three exact objects. Send the Publishable key in `apikey`. Strip only the SDK's Publishable-key-as-Bearer fallback and preserve the actual user JWT for authenticated requests. The anonymous data and Storage requests must have no user token. Confirm these header rules offline with fake keys and intercepted fetch before running any live request. The existing administrative upload transport is scoped to setup and cannot serve as the persona test transport.
3. **Read the five application tables directly.** Use the ordinary session client against PostgREST. Select only the identifiers and link columns below and compare exact returned sets privately. In addition to the scoped lists, make individual `.eq(...)` requests for each known A1/B1/U1 document ID and each matching extraction/field ID. This tests direct foreign and unowned access, even when those IDs are absent from list results.

   | Table | Projection | Filter |
   | --- | --- | --- |
   | `documents` | `id,organization_id` | `.in('id', documentIds)` |
   | `esg_extractions` | `id,document_id` | `.in('document_id', documentIds)` |
   | `extracted_esg_fields` | `id,extraction_id` | `.in('extraction_id', extractionIds)` |
   | `organizations` | `id` | `.in('id', organizationIds)` |
   | `organization_memberships` | `organization_id,user_id,role,status` | `.in('organization_id', organizationIds)` |

   Use all three manifest IDs in the document and descendant filters, and both A and B in the organization filters. Compare membership rows against the persona's exact expected tuple. For the owner/reviewer positive controls, verify parent IDs as well as row IDs. Expected authenticated denials are empty results with the correct session. The anonymous no-grant check may return a privilege denial, such as SQLSTATE `42501`. An authentication error on a named persona, timeout, cast error or unexpected API error is inconclusive or a failure and needs review.

4. **Check Storage list visibility and direct downloads.** Use `client.storage.from('documents')` from the same user session. Call `.list(orgA, { limit: 100, offset: 0 })` and `.list(orgB, { limit: 100, offset: 0 })`, then `.download(path)` separately for each of the three exact manifest paths. Check the complete list results, including any unexpected names. Each download uses the known object path regardless of whether the list returned it. Require successful authorized downloads to be `application/pdf`, exactly **1,638 bytes** and SHA-256 `113DF6E64181DCD497B469848BAC07108645B293734A195487C0D039B87F6E3A`. For known-present denied objects, require no returned bytes and a Storage denial or hidden-object response. Record the status or recognized error code. A network failure, invalid key, wrong identity or missing fixture cannot establish an RLS denial. Use direct Storage API requests and fresh clients to avoid relying on cached responses or existing signed URLs. [Exact paths and payload](C:/Users/adeel/esg/docs/security/RLS-SYNTHETIC-SETUP-RUNBOOK.md)
5. **Run positive controls first and record only labels.** Run owner A and owner B first to prove the credential path and positive fixture reads work in both tenants. Then run reviewer A, active member A, suspended member A, outsider and anonymous. Stop on unexpected data, bytes, failed positive checks or identity mismatches. Report persona, check, fixture label, expected outcome, observed count or HTTP status, and PASS/FAIL/inconclusive. Include size/hash match booleans for authorized downloads. Report no returned content or private identifiers. Stop for review after the batch.

Approval should cover only the isolated project, six real synthetic Auth sessions and anonymous control, the five scoped PostgREST reads and the exact Storage list/download operations. SQL role simulation, signed URLs, write probes, policy changes, additional fixtures, cleanup and application enablement require their own decisions.

## Operator commands

Run this offline check from the repository. It uses the installed SDK with an intercepted fetch and fake inputs. It covers all six persona expectations and the anonymous control, header handling, identity mismatch, elevated token and Secret key rejection, and detection of unexpected protected rows.

```powershell
Set-Location -LiteralPath 'C:\Users\adeel\esg'
node --test docs/security/verify-synthetic-rls-reads.test.mjs
```

For review ahead of separate live execution approval, the first live command below is for **owner A only**. Confirm the isolated project and use the verified private organization and owner A Auth UUIDs. Use the existing Publishable key and that synthetic account's existing login. A separate masked password prompt keeps it out of the command text. The runner verifies the authenticated JWT and the Auth server's user UUID before the first PostgREST or Storage request. Missing approval defaults to a stop in the runner.

```powershell
& {
    Set-Location -LiteralPath 'C:\Users\adeel\esg'
    $publishable = $null
    $password = $null
    try {
        $env:ENVARIO_RLS_LIVE_APPROVED = 'true'
        $env:ENVARIO_FIXTURE_OPT_IN = 'true'
        $env:ENVARIO_FIXTURE_PROJECT_REF = 'gkhrtrakukqdhgvucudv'
        $env:ENVARIO_FIXTURE_PROJECT_URL = 'https://gkhrtrakukqdhgvucudv.supabase.co'
        $env:ENVARIO_FIXTURE_ORG_A = Read-Host 'Verified organization A UUID'
        $env:ENVARIO_FIXTURE_ORG_B = Read-Host 'Verified organization B UUID'
        $env:ENVARIO_RLS_USER_ID = Read-Host 'Verified owner A Auth UUID'
        $env:ENVARIO_RLS_EMAIL = Read-Host 'Synthetic owner A email'
        $publishable = Read-Host 'Isolated project Publishable key' -AsSecureString
        $password = Read-Host 'Synthetic owner A password' -AsSecureString
        $env:ENVARIO_RLS_PUBLISHABLE_KEY = [System.Net.NetworkCredential]::new('', $publishable).Password
        $env:ENVARIO_RLS_PASSWORD = [System.Net.NetworkCredential]::new('', $password).Password
        & .\node_modules\.bin\tsx.cmd docs/security/verify-synthetic-rls-reads.mjs owner_a
    } finally {
        Remove-Item Env:ENVARIO_RLS_LIVE_APPROVED, Env:ENVARIO_FIXTURE_OPT_IN,
            Env:ENVARIO_FIXTURE_PROJECT_REF, Env:ENVARIO_FIXTURE_PROJECT_URL,
            Env:ENVARIO_FIXTURE_ORG_A, Env:ENVARIO_FIXTURE_ORG_B, Env:ENVARIO_RLS_USER_ID,
            Env:ENVARIO_RLS_EMAIL, Env:ENVARIO_RLS_PUBLISHABLE_KEY, Env:ENVARIO_RLS_PASSWORD -ErrorAction SilentlyContinue
        if ($null -ne $publishable) { $publishable.Dispose() }
        if ($null -ne $password) { $password.Dispose() }
    }
}
```

Review `owner_a | Auth identity | VERIFIED`, all scoped result lines and `owner_a READ CHECKS COMPLETE`. Share only those status lines or the sanitized STOP line. Stop after owner A for review before proceeding to owner B. The live block is prepared for review and awaits separate execution confirmation.

## Owner A B1 diagnostic checkpoint

The operator reported verified Owner A identity, passing table and Storage list checks, and a valid A1 download. The B1 download stopped at `INCONCLUSIVE | unrecognized denial`. The normal runner still requires its reviewed denial combinations. U1's direct download and the rest of the persona batch remain pending.

After separate approval for this diagnostic, use the same private Owner A PowerShell block above with only the runner invocation changed to:

```powershell
& .\node_modules\.bin\tsx.cmd docs/security/verify-synthetic-rls-reads.mjs owner_a --diagnose-b1
```

The mode verifies Owner A through Auth and sends one B1 Storage GET. Share only the HTTP status, recognized SDK code and safe reason. The diagnostic result is evidence for review and never a test PASS. A known-present B1 object with a verified Owner A session and an explicit access-denied or hidden-object response supports the intended denial. An invalid token, unknown response, wrong bucket, malformed request or transport error remains inconclusive. A successful response returning object data is a failure and must be reviewed immediately. A legacy response can carry a numeric body status that differs from its HTTP status. Keep both values distinct during review.

Eight offline tests passed, including diagnostic routing, identity gating and sanitized legacy, invalid-token, transport and returned-data cases. The diagnostic awaits live approval. Existing FAIL and REVIEW findings are preserved.

The operator subsequently reported `HTTP 400 | SDK code NoSuchKey | Object missing or hidden` for the B1 diagnostic under verified Owner A identity. Prior fixture validation and the B1 integrity download establish a known-present control. This response qualifies as the hidden-object denial for the scoped test. The runner now accepts HTTP 400 with exact code `NoSuchKey` in the expected-denial branch. Other HTTP 400 errors and HTTP 500 with `NoSuchKey` remain inconclusive. The ten offline tests passed. Existing FAIL and REVIEW findings are preserved.

## Owner A, Reviewer A, Owner B and Active Member A complete

On 2026-11-12 the operator reported `owner_a READ CHECKS COMPLETE` for the normal live run in the isolated project. The completion marker follows genuine Auth UUID verification, all scoped table and metadata checks, the A1 integrity download and B1/U1 direct denials. Record Owner A as complete. The original canonical FAILs and outstanding REVIEW items remain preserved.

The operator reported `reviewer_a READ CHECKS COMPLETE` in the isolated project. The normal run requires genuine Reviewer A Auth UUID verification, A1-only table and Storage visibility, Reviewer A's own active membership, a verified A1 PDF download and direct B1/U1 denials. Record Reviewer A as complete.

The operator reported `owner_b READ CHECKS COMPLETE`. The normal run requires verified Owner B identity, B1 and its descendants, organization B, Owner B's own active membership, B1-only Storage visibility and a verified B1 PDF, and direct A1/U1 denials. Record Owner B as complete.

The operator reported `member_a READ CHECKS COMPLETE`. The run verified Active Member A's Auth identity, returned empty scoped database and Storage lists, and denied direct downloads of A1, B1 and U1. Record Active Member A as complete.

The operator reported `suspended_a READ CHECKS COMPLETE`. The run verified the older account mapped to suspended member A, returned empty scoped database and Storage lists, and denied direct A1/B1/U1 downloads. Record Suspended Member A as complete.

The operator reported `outsider READ CHECKS COMPLETE`. The run verified the newly created outsider identity, returned empty scoped database and Storage lists, and denied direct A1/B1/U1 downloads. All six authenticated personas are complete.

The operator reported `anonymous READ CHECKS COMPLETE`. This control used the isolated Publishable key with no Auth session or Authorization header. The scoped database reads returned no protected rows, Storage lists were empty and direct A1/B1/U1 downloads were denied.

## Completed live read matrix

All seven completion markers were reported by the operator in envario-security-test (`gkhrtrakukqdhgvucudv`). The full fixture validator established three documents, three extractions, three fields and three objects before the user-scoped tests.

| Persona | Live read result | Visible fixture and metadata | Direct Storage denials |
| --- | --- | --- | --- |
| `owner_a` | PASS | A1 and its descendants, organization A, own active owner row, verified A1 PDF | B1, U1 |
| `reviewer_a` | PASS | A1 and its descendants, organization A, own active reviewer row, verified A1 PDF | B1, U1 |
| `owner_b` | PASS | B1 and its descendants, organization B, own active owner row, verified B1 PDF | A1, U1 |
| `member_a` | PASS | Empty scoped database and Storage lists under verified Auth identity | A1, B1, U1 |
| `suspended_a` | PASS | Empty scoped database and Storage lists under verified Auth identity | A1, B1, U1 |
| `outsider` | PASS | Empty scoped database and Storage lists under verified Auth identity | A1, B1, U1 |
| `anonymous` | PASS | No protected rows, empty Storage lists | A1, B1, U1 |

This completes the scoped direct read matrix for the three existing fixtures. Application access stays disabled. The canonical FAIL and REVIEW rows retain their original status. [Readiness and commit review](C:/Users/adeel/esg/docs/security/SECURITY-CHECKPOINT-REVIEW.md)
