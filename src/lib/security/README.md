# Offline security contract

Run `npm run test:security`. The authorization and integration-target contracts
do not import Supabase, read environment files, construct clients, or make requests.
Step 7R.6 adds a request-scoped read adapter; its live database gate remains closed.
See `docs/security/READ-AUTHORIZATION.md` for current route/action behavior.

`authorizeOrganization` returns 401 for anonymous callers and 403 for missing,
suspended, unknown, or ambiguous membership. Active owners can read/upload;
active reviewers can only read.

`authorizeDocument` returns 401 before document checks for anonymous callers.
Missing, foreign, unowned, or inaccessible documents return 404. Only after
visibility is established does processing require an owner (403 for reviewers).
Reads require an active owner/reviewer membership. Roles are organization-local.

This is a server-side policy contract, not an identity verifier. Future server
adapters must supply a verified user ID and freshly loaded authoritative
memberships. Never accept these values from caller input or role claims. The
database must eventually enforce the same rules with RLS.

`requireIntegrationTarget` accepts an explicit object containing `optIn: "true"`,
`projectRef: "gkhrtrakukqdhgvucudv"`, and
`supabaseUrl: "https://gkhrtrakukqdhgvucudv.supabase.co"` (optional trailing slash).
All other configuration is rejected without echoing input. It never reads
`.env.local` or falls back to application settings. The operator scripts under
`docs/security/` call the guard before constructing clients or making requests.
Use the reviewed operator procedures and their explicit approval checks.
The guard validates configuration only; it does not verify remote project state
or credential scope.
