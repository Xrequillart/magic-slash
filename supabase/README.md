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
| `skill_invocations` | One row per skill RUN: opened when it starts, closed when it ends. |
| `settings_events` | Append-only audit of settings changes, written only by a trigger.   |
| `repositories`    | Shared repo identity; `org_id` NULL = personal, set = team repo.    |

User-scoped tables (own-rows-only RLS, independent of any org):

| Table               | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `repository_paths`  | The caller's own local path binding for a repo — never shared.     |
| `profiles`          | Who the human is (name, role, level, style) for the skills.        |
| `user_settings`     | App preferences: Settings → Features, launch mode, Atlassian flag. |
| `app_installations` | One row per (user, device): the app version that device runs.      |

Neither org-scoped nor own-rows — a category of one:

| Table              | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `platform_admins`  | Who operates the product. **Deny-all**: unreachable from the API.   |

`platform_admins` is the only table with RLS enabled and **no policy at all**, on
top of `revoke all … from anon, authenticated`. Both layers are deliberate: the
revoke is what actually holds (Supabase grants `all` on new `public` tables to
both roles by default, so RLS alone would leave `authenticated` holding `INSERT`),
and the missing policy means adding one back cannot re-open it. Consequence,
accepted rather than worked around: the **first platform admin cannot be created
from within the application** — a human inserts the row from the Supabase
dashboard, which runs as the table owner. There is no bootstrap RPC, because a
self-service one is a "first caller becomes admin" hole. The identity is usable
only through the read-only `admin_*` functions listed under Security model below.

`user_settings` deliberately holds one **nullable** column per option. NULL means
"the user never chose", which the desktop app distinguishes from `false` — e.g.
history and the sidebar usage card are both ON when unset, while
`auto_start_at_login` only touches the macOS login item once explicitly set.
Defaults live in the app, not the schema.

`skill_invocations` and `activity_events` answer different questions and are both
needed. `activity_events` is a log of **states**: it records status transitions, so
re-running the same skill logs nothing the second time — which is correct for a state
and wrong for an action. `skill_invocations` is the log of **actions**: three
`/magic:commit` runs are three rows.

A run has two halves, because no single signal can give both. The `PreToolUse` hook
opens the row and is guaranteed, but fires BEFORE the skill body — on its own it
counts intentions, so an interrupted run looked identical to a finished one. The last
step of each `SKILL.md` closes the row with an outcome, which is the only thing that
knows the workflow finished, and is therefore voluntary. `close_skill_run` is the
single permitted mutation on this otherwise append-only table.

A row left open past four hours reads as **abandoned** — but only if its author has
closed a run at some point. That condition is the whole point: a client that cannot
report endings (an older copy of the skills, or history from before the columns
existed) emits starts and never ends, and judging it by a rule it cannot satisfy
would have reclassified every run ever recorded as given-up work the day the feature
shipped. Without that evidence the outcome is *unknown*, counted in `total` and in
neither `completed` nor `abandoned`. It corrects itself per user the moment they
update.

Neither half calls the app. The hook appends to `~/.config/magic-slash/pending-skills.ndjson`
and the app drains it at launch and on every connectivity tick, so a run with the app
closed — the normal way many people use Claude Code — is still counted, where it used
to be discarded silently. The hook filters to `magic-*` as it writes: it fires on every
skill Claude Code runs, and the names of unrelated or employer-internal skills have no
business on disk or in a table the user's org can read. The skill's `args` are not
collected either.

Sessions the app did not spawn have no `MAGIC_SLASH_TERMINAL_ID`, so they have no
agent — hence the nullable `agent_id`, and a NULL `org_id` that attributes the run to
its author rather than guessing at a team.

`app_installations` is upserted by the desktop app on every launch (from the
connectivity gate, once authed), so the version is refreshed at each start and
after every auto-update. `app_version_updated_at` is trigger-maintained and moves
only on a genuine version change. RLS keeps each row private to its user, so
fleet-wide "who runs which version" reporting goes through
`admin_list_installations(uuid)` — a `SECURITY DEFINER` function gated on
`is_platform_admin()` that returns an explicit column allowlist. No service-role
key, and no widening of this table's policies. (The `--` comments inside
`20260725100000_user_settings.sql` still say "service role": they predate
`platform_admins` and are left as written, since a migration records the state of
the world when it ran.)

## Security model

- **RLS is enabled on every table.** Org-scoped tables enforce strict per-org
  isolation keyed on `org_id`: a user only ever sees rows for orgs they are a
  member of. User-scoped tables (`repository_paths`, `profiles`, `user_settings`,
  `app_installations`) are own-rows-only on every verb — not even org admins get
  a read path. The single exception is a **platform admin** (a row in
  `platform_admins`), and it is not an exception in the policies: no policy was
  widened and none contains `or is_platform_admin()`. Access is instead six
  read-only `SECURITY DEFINER` functions — `admin_list_users()`,
  `admin_list_installations(uuid)`, `admin_get_user(uuid)`,
  `admin_list_user_orgs(uuid)`, `admin_list_user_agents(uuid)`,
  `admin_list_user_repositories(uuid)` — each of which raises unless
  `is_platform_admin()`, and each of whose `returns table` **is** the column
  allowlist. `profiles.free_text`, `technical_level`, `communication_style` and
  `languages` are returned by none of them. The reason for functions rather than a
  wider policy: a policy grants every column of a table forever, including ones
  added later, whereas an allowlist has to be edited — and shows up in the diff —
  to grow. There are no admin writes, no impersonation and no audit log; the whole
  surface is `select`-shaped, which is what makes the missing audit log
  acceptable.
- Membership checks go through `is_org_member(uuid)` / `is_org_admin(uuid)`,
  `SECURITY DEFINER` functions with a locked `search_path`. This avoids RLS
  recursion on `memberships` and is the single source of truth for access.
- Every `INSERT`/`UPDATE` policy uses `WITH CHECK`, so a user can never write a
  row tagged with another org's `id`.
- **Admin-gated** writes: `memberships`, `invitations`, and `skills` mutations
  require the `admin` role. `configs` are private to their owning user.
  `usage_events`, `activity_events` and `skill_invocations` are append-only
  (select + insert, no update/delete). The one exception is `close_skill_run`, a
  `SECURITY DEFINER` function guarded on `auth.uid()`: it can only ever set an end on
  a run that has none, which is why it exists instead of a blanket `UPDATE` grant.
  `settings_events` is stricter still — `select` only, written exclusively by the
  `log_settings_change` trigger, so the audit trail is not forgeable by the clients
  it audits.
- `agents` are **org-readable but owner-writable**: any member may `SELECT` every
  agent of the org (the team dashboard's "who is working on what" and the
  Realtime feed depend on it), while `INSERT`/`UPDATE`/`DELETE` are gated to
  `owner_id = auth.uid()` via `can_write_agent()`. Org admins additionally get
  writes on owner-*less* rows only — the state the
  `(org_id, owner_id) → memberships` FK leaves behind when a member is removed —
  so an ex-member's agents stay cleanable and adoptable. The desktop app mirrors
  this on read: `loadAgents()` (local terminal restoration) filters on
  `owner_id`, and only `loadOrgAgents()` spans members. An agent's identity is
  `app_agent_id` — the desktop's own `claude-<epoch>` id, unique per owner and the
  key every agent upsert conflicts on, so a second app instance cannot mint a
  second row for one agent. Archiving releases it (the column goes null with
  `archived_at`), which is what lets a reused app id start a new row instead of
  resurrecting a closed one.
- Both user-scoped tables added for settings reference `auth.users` with
  `ON DELETE CASCADE`, so `delete_account()` removes them with the user row — no
  change to that RPC was needed.
- Organizations are created **only** through the `create_organization(text)`
  RPC, which atomically inserts the org and the creator's admin membership.
  There is intentionally no direct `INSERT` policy on `organizations`.
