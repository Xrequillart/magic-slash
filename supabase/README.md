# Supabase backend

Multi-tenant cloud foundations for magic-slash. This is **Cloud PR 1** of the
epic that migrates local JSON storage to Supabase (see issue #123 / epic #121).
It ships the Postgres schema, strict Row Level Security (RLS), versioned
migrations, and an isolation test. There is **zero UI impact** in this PR — the
desktop app starts consuming this schema in PR 2.

## Layout

```text
supabase/
├── config.toml                                   # Supabase CLI config (local dev)
├── migrations/
│   ├── 20260723090000_initial_schema.sql         # enums, tables, indexes, triggers
│   └── 20260723090100_rls_policies.sql           # RLS + helper functions + RPC
├── tests/
│   └── rls_isolation.test.sql                    # pgTAP: proves per-org isolation
└── README.md
```

## 1. Create the Supabase project (manual, one-time)

This step is not automated and must be done in the Supabase dashboard:

1. In [app.supabase.com](https://app.supabase.com) create a new project.
2. Capture, from **Project Settings → API**:
   - the **Project URL** (`https://<ref>.supabase.co`)
   - the **anon** public key
   - the **service_role** secret key
   - the project **ref** (the `<ref>` slug)

> **Do NOT commit these secrets.** The anon key is public-ish but the
> `service_role` key is a full-access secret. Store them outside the repo — for
> local dev use an untracked `.env`, and in a later PR the desktop app will keep
> them in the OS keychain. Nothing in this directory should ever contain a live
> key.

## 2. Apply migrations to a fresh project

```bash
supabase link --project-ref <ref>   # one-time, links this dir to the remote project
supabase db push                    # applies migrations/ in timestamp order
```

`supabase db push` runs both migrations and must apply cleanly on a fresh
project (an acceptance criterion of #123).

## 3. Local development

```bash
supabase start        # spins up local Postgres + Auth + Studio (Docker)
supabase db reset     # drops and re-applies all migrations against the local db
```

`supabase db reset` is the fastest way to iterate on the schema locally.

## 4. Run the RLS isolation test

```bash
supabase test db      # runs supabase/tests/*.test.sql via pgTAP
```

The test harness provides pgTAP (`create extension pgtap`). The test proves that
one org can never read or write another org's data.

> **Why the test impersonates users:** pgTAP runs as the table owner, which
> BYPASSES RLS. Each assertion therefore sets `role authenticated` and a
> `request.jwt.claims` `sub` so that `auth.uid()` returns a specific user and the
> policies are actually exercised. See the comments in the test file.

## Tables

| Table             | Purpose                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `organizations`   | Tenant boundary; every other table is scoped to an org.             |
| `memberships`     | Which users belong to which org, with a `user`/`admin` role.        |
| `invitations`     | Pending invites to join an org (token + status lifecycle).          |
| `agents`          | Units of work (ticket/branch/repos), shareable across the org.      |
| `skills`          | Org-level custom skills (unique name per org).                      |
| `configs`         | Per-user configuration blob, scoped to a single org.                |
| `usage_events`    | Append-only usage/billing telemetry (cost, tokens, lines, timing).  |
| `activity_events` | Append-only audit/activity feed of actions taken in the org.        |

## Security model

- **RLS is enabled on all 8 tables** and enforces strict per-org isolation keyed
  on `org_id`. A user only ever sees rows for orgs they are a member of.
- Membership checks go through `is_org_member(uuid)` / `is_org_admin(uuid)`,
  `SECURITY DEFINER` functions with a locked `search_path`. This avoids RLS
  recursion on `memberships` and is the single source of truth for access.
- Every `INSERT`/`UPDATE` policy uses `WITH CHECK`, so a user can never write a
  row tagged with another org's `id`.
- **Admin-gated** writes: `memberships`, `invitations`, and `skills` mutations
  require the `admin` role. `agents` are writable by any org member. `configs`
  are private to their owning user. `usage_events` and `activity_events` are
  append-only (select + insert, no update/delete).
- Organizations are created **only** through the `create_organization(text)`
  RPC, which atomically inserts the org and the creator's admin membership.
  There is intentionally no direct `INSERT` policy on `organizations`.
