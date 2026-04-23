# Vision: From Ideas to Production

> Status: **Explored & Shelved** — This document captures a brainstorming session about a potential v2 evolution. The scope was deemed too large to pursue at this time.

## Context

magic-slash currently provides **7 CLI skills** covering the cycle from ticket to merged PR:

```
Jira/GitHub Issue → start → continue → commit → pr → review → resolve → done
```

The idea was to expand coverage to the **full development lifecycle**:

```
Idea → create → start → continue → commit → pr → review → resolve → done → release → deploy
```

## Proposed Features

### Upstream (before `start`)

- **`/magic:plan`** — Analyze an idea, explore feasibility, produce an action plan
- **`/magic:create`** — Turn a plan into a structured GitHub issue or Jira ticket (acceptance criteria, labels, estimation)

### Downstream (after `done`)

- **`/magic:release`** — Changelog generation, version bump, Git tag, GitHub release
- **`/magic:deploy`** — Deploy to production (configurable per user stack)

### GitHub App Integration

- Sign in to the desktop app with a GitHub account
- Authorize a GitHub App to connect repos and clone them directly to the user's machine
- Dashboard page listing GitHub issues and Jira tickets
- Launch an agent on any issue directly from the dashboard
- Auto-start option: automatically assign an agent when a new issue or ticket is created

### Supabase Backend

Replace the fully local storage (`~/.config/magic-slash/`) with a cloud database:

| Table | Replaces |
|-------|----------|
| `profiles` | `profile.md` |
| `repositories` | `config.json` |
| `history` | Local task/commit/PR logs |
| `scheduled_agents` | New — auto-start configs |
| `settings` | Local preferences |
| `app_versions` | New — app and skill versions |

Key architectural benefits:
- **Supabase Auth** with GitHub OAuth provider (no custom auth needed)
- **Edge Functions** to receive GitHub/Jira webhooks for real-time auto-start
- **Realtime** subscriptions for live dashboard updates
- Multi-device sync out of the box

### Target Architecture

```
┌─────────────────────────────────────────────┐
│              Desktop App (Electron)          │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Login   │  │Dashboard │  │  Terminal  │  │
│  │  GitHub  │  │ Issues   │  │  Agents   │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       └──────────┬───┘──────────────┘         │
│          ┌───────▼────────┐                   │
│          │  Supabase SDK  │                   │
│          └───────┬────────┘                   │
└──────────────────┼─────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │     Supabase      │
         │  Auth / PostgreSQL │
         │  Edge Functions    │
         │  Realtime          │
         └─────────┬─────────┘
                   ▲ webhooks
         ┌─────────┴─────────┐
         │  GitHub App       │
         │  Jira Webhooks    │
         └───────────────────┘
```

### Suggested Milestones

| # | Milestone | Scope |
|---|-----------|-------|
| M1 | Supabase + Auth | Setup Supabase, GitHub OAuth, login page, profile migration |
| M2 | GitHub App + Repos | GitHub App, repo connection, clone from app |
| M3 | Dashboard Issues | List GitHub issues + Jira tickets, launch agents |
| M4 | Auto-start | Webhooks, Edge Functions, auto-start settings |
| M5 | New Skills | `/magic:create`, `/magic:release`, `/magic:deploy` |
| M6 | Full DB Migration | History, settings, versions → Supabase |

## Why It Was Shelved

The scope is significant — it transforms magic-slash from a local CLI tool into a hybrid cloud platform. Key concerns:

- **Complexity**: adds a cloud dependency, offline fallback requirements, and a GitHub App to maintain
- **Infra variance**: `/magic:deploy` is highly dependent on each user's stack
- **Effort**: 6 milestones touching every layer (skills, desktop, backend, docs)

Individual pieces (like `/magic:create` or `/magic:release`) could be revisited independently without committing to the full platform vision.
