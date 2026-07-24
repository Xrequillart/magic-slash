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
npm install
npm run dev                        # http://localhost:3000
```

## Environment variables

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (same as desktop) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key — RLS-protected, browser-safe |

## Routes

- `/` — landing + download CTA
- `/invite/[token]` — invitation funnel: preview org → sign up (or sign in) →
  accept the invitation → download the app
- `/download` — download the desktop app (macOS)

## Supabase surface used

- `rpc('get_invitation_preview', { invitation_token })` — anon-readable preview
  (org name, invited email, role, effective status)
- `auth.signUp({ email, password })` / `auth.signInWithPassword(...)`
- `rpc('accept_invitation', { invitation_token })` — requires an authenticated
  session; the JWT email must match the invited email

## Deploy (Vercel)

- **Root Directory:** `webapp`
- Framework preset: Next.js
- Set the two env vars above (Production + Preview)
- Domain: `app.magic-slash.io`
