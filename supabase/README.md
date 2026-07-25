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

Org-scoped tables (isolation keyed on `org_id`):

| Table             | Purpose                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `organizations`   | Tenant boundary; every other table is scoped to an org.             |
| `memberships`     | Which users belong to which org, with a `user`/`admin` role.        |
| `invitations`     | Pending invites to join an org (token + status lifecycle).          |
| `agents`          | Units of work (ticket/branch/repos): org-readable, owner-writable.  |
| `skills`          | Org-level custom skills (unique name per org).                      |
| `configs`         | Per-user configuration blob, scoped to a single org.                |
| `usage_events`    | Append-only usage/billing telemetry (cost, tokens, lines, timing).  |
| `activity_events` | Append-only audit/activity feed of actions taken in the org.        |
| `repositories`    | Shared repo identity; `org_id` NULL = personal, set = team repo.    |

User-scoped tables (own-rows-only RLS, independent of any org):

| Table               | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `repository_paths`  | The caller's own local path binding for a repo — never shared.     |
| `profiles`          | Who the human is (name, role, level, style) for the skills.        |
| `user_settings`     | App preferences: Settings → Features, launch mode, Atlassian flag. |
| `app_installations` | One row per (user, device): the app version that device runs.      |

`user_settings` deliberately holds one **nullable** column per option. NULL means
"the user never chose", which the desktop app distinguishes from `false` — e.g.
history is ON when unset, and `auto_start_at_login` only touches the macOS login
item once explicitly set. Defaults live in the app, not the schema.

`app_installations` is upserted by the desktop app on every launch (from the
connectivity gate, once authed), so the version is refreshed at each start and
after every auto-update. `app_version_updated_at` is trigger-maintained and moves
only on a genuine version change. Fleet-wide "who runs which version" reporting
goes through the service role, since RLS keeps each row private to its user.

## Security model

- **RLS is enabled on every table.** Org-scoped tables enforce strict per-org
  isolation keyed on `org_id`: a user only ever sees rows for orgs they are a
  member of. User-scoped tables (`repository_paths`, `profiles`, `user_settings`,
  `app_installations`) are own-rows-only on every verb — not even org admins get
  a read path.
- Membership checks go through `is_org_member(uuid)` / `is_org_admin(uuid)`,
  `SECURITY DEFINER` functions with a locked `search_path`. This avoids RLS
  recursion on `memberships` and is the single source of truth for access.
- Every `INSERT`/`UPDATE` policy uses `WITH CHECK`, so a user can never write a
  row tagged with another org's `id`.
- **Admin-gated** writes: `memberships`, `invitations`, and `skills` mutations
  require the `admin` role. `configs` are private to their owning user.
  `usage_events` and `activity_events` are append-only (select + insert, no
  update/delete).
- `agents` are **org-readable but owner-writable**: any member may `SELECT` every
  agent of the org (the team dashboard's "who is working on what" and the
  Realtime feed depend on it), while `INSERT`/`UPDATE`/`DELETE` are gated to
  `owner_id = auth.uid()` via `can_write_agent()`. Org admins additionally get
  writes on owner-*less* rows only — the state the
  `(org_id, owner_id) → memberships` FK leaves behind when a member is removed —
  so an ex-member's agents stay cleanable and adoptable. The desktop app mirrors
  this on read: `loadAgents()` (local terminal restoration) filters on
  `owner_id`, and only `loadOrgAgents()` spans members.
- Both user-scoped tables added for settings reference `auth.users` with
  `ON DELETE CASCADE`, so `delete_account()` removes them with the user row — no
  change to that RPC was needed.
- Organizations are created **only** through the `create_organization(text)`
  RPC, which atomically inserts the org and the creator's admin membership.
  There is intentionally no direct `INSERT` policy on `organizations`.
