# magic-slash webapp (`app.magic-slash.io`)

Next.js (App Router) web app hosted on Vercel. Today it handles the
organization **invitation funnel** and the app **download** page; later it will
grow into the web dashboard (settings, stats).

## Stack

- Next.js 14 (App Router) + React 18
- Tailwind CSS 3 — magic-slash dark theme (mirrors `desktop/tailwind.config.cjs`)
- `@supabase/supabase-js` — same Supabase project as the desktop app

## Local development

```bash
cd webapp
cp .env.local.example .env.local   # fill NEXT_PUBLIC_SUPABASE_ANON_KEY
                                   # (and the ATLASSIAN_* pair to work on /api/atlassian/*)
npm install
npm run dev                        # http://localhost:3000
```

## Environment variables

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (same as desktop) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key — RLS-protected, browser-safe |
| `ATLASSIAN_CLIENT_ID` | Atlassian OAuth 2.0 (3LO) app id, from the [developer console](https://developer.atlassian.com/console). Public value, but kept server-side alongside the secret |
| `ATLASSIAN_CLIENT_SECRET` | Its client secret. **Server-only — never `NEXT_PUBLIC_*`**, which would inline it into the browser bundle |

`/api/atlassian/token` hard-requires the two Atlassian variables: without both it
answers `500 { "error": "server_not_configured" }` and the desktop app can never
complete a connection. They live here rather than in the desktop app because an
Electron binary on a laptop cannot hold a secret — see `lib/atlassianState.ts`.

## Routes

- `/` — login (redirects to `/dashboard` when already signed in)
- `/dashboard` — signed-in home: stats, or the getting-started checklist
- `/application` — the desktop app: whether it is in use and on what version,
  then its preferences (appearance, language, features, Claude Code launch mode)
- `/organization` — org detail: members (via `list_org_members`), role, org switcher
- `/account` — identity, Claude profile, and the machines you signed in from
- `/repository/[id]` — per-repository settings
- `/admin` — platform back-office (read-only). Redirects to `/admin/users`; it has
  no content of its own, so that all three sections are addressable in the same
  shape and the tab bar has a URL to match per section. Reachable only by a
  platform admin — the nav entry is not rendered for anyone else, and
  `app/admin/layout.tsx` guards the whole subtree and redirects to `/dashboard`.
  That layout also owns the chrome, which is what makes the tab bar's entrance
  animation play on arrival rather than on every tab change
- `/admin/users` — every account with its resolved app version, device/org/agent
  counts and last-seen
- `/admin/users/[userId]` — one user, read-only: profile, their whole
  `user_settings` row, devices, orgs, agents (archived included) and repositories
- `/admin/organizations` — every tenant with member/admin/repo/agent and
  pending-invitation counts, archived ones included. Invitation tokens are never
  displayed, only counted
- `/admin/stats` — the fleet: version distribution, devices behind the rest, the
  platform/arch breakdown, and devices gone quiet
- `/invite/[token]` — public invitation funnel: preview org → sign up (or sign in)
  → accept the invitation (then a link to download the desktop app)
- `/api/atlassian/callback` — the redirect URI registered with Atlassian. Validates
  the desktop's `state` (`<nonce>.<port>`) and bounces the browser to that machine's
  loopback server. Never exchanges anything; reflects no request parameter
- `/api/atlassian/token` — the token exchange (`authorization_code` and
  `refresh_token`), the one place the Atlassian client secret is used. Returns the
  tokens to the desktop and stores nothing — no Supabase, no log line

## Supabase surface used

- `rpc('get_invitation_preview', { invitation_token })` — anon-readable preview
  (org name, invited email, role, effective status)
- `auth.signUp({ email, password })` / `auth.signInWithPassword(...)`
- `rpc('accept_invitation', { invitation_token })` — requires an authenticated
  session; the JWT email must match the invited email
- `user_settings` — one own-row of application preferences, upserted by
  `/application`. Every column is nullable and NULL means "never chosen", so the
  desktop applies its own default; the webapp mirrors those defaults in
  `lib/settings.ts` for display and only writes a column the user touched.
- `app_installations` — read-only here; the desktop upserts one row per machine
  on every launch, which is what `/application` and `/account` report on.
- `rpc('is_platform_admin')` — whether the caller operates the platform. Used to
  decide whether the `Admin` nav entry is drawn; the gate itself is re-checked in
  the database by each RPC below, so this only governs discovery.
- `rpc('admin_list_users')`, `rpc('admin_list_installations', { p_user_id })`,
  `rpc('admin_get_user', { p_user_id })`, `rpc('admin_list_user_orgs', { p_user_id })`,
  `rpc('admin_list_user_agents', { p_user_id })`,
  `rpc('admin_list_user_repositories', { p_user_id })`,
  `rpc('admin_list_orgs')` — the `/admin` pages. `admin_list_orgs` is the only one
  that is neither fleet-wide-by-user nor scoped to a `p_user_id`: it drives off
  `organizations`, so a tenant with no members still appears. All
  `SECURITY DEFINER`, all read-only, each raising unless the caller has a
  `platform_admins` row, and each returning an explicit column allowlist rather
  than a table. `profiles.free_text` is returned by none of them. No RLS policy was
  widened to make these work — see `supabase/README.md` → Security model.

## Deploy (Vercel)

- **Root Directory:** `webapp`
- Framework preset: Next.js
- Set the env vars above (Production + Preview). The two Supabase ones are
  required; the two `ATLASSIAN_*` ones are required only for the desktop app's
  Atlassian account connection, and `/api/atlassian/token` answers
  `500 server_not_configured` until both are set
- Domain: `app.magic-slash.io`
