# Authentication foundation (Step 7R.5)

Not deployable pending database verification. Step 7R.6 removed privileged/shared-
token access from document entry points. Writes return 503, and live reads are
gated off until database helpers, grants and RLS are verified.
The authenticated layout renders only a verified-session holding screen, never
the document/dashboard/validation/report components. This is a UX gate, not API
authorization. Routes/actions enforce their own checks; see
`docs/security/READ-AUTHORIZATION.md`.

SSR uses `@supabase/ssr` 0.12.7 with the installed Supabase JS 2.117.2. A fresh
server client reads request cookies. Next.js 16 `src/proxy.ts` refreshes cookies
for auth/workspace routes and forwards changes to both render and response,
including SDK cache prevention headers. Server rendering independently calls
`auth.getUser()`. Server Actions use writable cookies; no global server client,
admin key, database query, Storage operation or demo-login fallback is used.

Configuration names (no values were read or written during implementation):

- `NEXT_PUBLIC_SUPABASE_URL`: restricted to the isolated test project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or legacy
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable key or anon-role JWT only.
- `NEXT_PUBLIC_SITE_URL`: explicit trusted origin, without trailing slash/path;
  HTTPS, or HTTP on localhost/127.0.0.1 for local development.

Secret/service-role keys are rejected. Public configuration never falls back to
the existing server admin variables. Missing configuration fails closed.

Login uses password authentication followed by `getUser()`. Registration requests
email confirmation, stores only a display name as metadata, and signs out any
immediately issued session. It never provisions organization membership.
`/auth/confirm` supports PKCE `code`, or `token_hash` with `signup`/`email` type,
followed by `getUser()`. Success redirects only to a sanitized local path on the
configured origin. Failures omit provider details and tokens. Sign-out calls
Supabase `signOut()` and redirects only on success.

Before eventual live testing, verify the isolated project's email confirmation
setting, site/redirect allowlist and email template. For token-hash confirmation,
the template must target `/auth/confirm` with `token_hash` and supported `type`;
PKCE redirects use the same endpoint. None of that remote configuration has been
inspected or changed. Real email delivery, cookie refresh and logout still need
isolated integration verification. Missing/expired confirmation currently asks
the user to retry; resend and password recovery are outside this phase.

`npm run test:auth` uses only injected Auth mocks and synthetic values. It makes
no Supabase requests. Future API integration must verify memberships and role
permissions at every route/action, remove privileged request clients, reconcile
RLS (including active nonprivileged `member`) and keep writes disabled until the
database and Storage policies are proven.
