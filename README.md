<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-readme-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset=".github/assets/logo-readme-light.svg">
    <img src=".github/assets/logo-readme-light.svg" alt="Magic Slash" height="80">
  </picture>
</p>

<p align="center">
  Desktop app with 7 Claude Code skills to automate your entire dev cycle — from Jira ticket to merged PR.
</p>

<p align="center">
  <a href="https://github.com/xrequillart/magic-slash/actions/workflows/ci.yml">
    <img src="https://github.com/xrequillart/magic-slash/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://github.com/xrequillart/magic-slash/releases">
    <img src="https://img.shields.io/github/v/release/xrequillart/magic-slash" alt="Release">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/xrequillart/magic-slash" alt="License">
  </a>
  <a href="https://github.com/xrequillart/magic-slash/stargazers">
    <img src="https://img.shields.io/github/stars/xrequillart/magic-slash" alt="Stars">
  </a>
</p>

## Skills

| Skill             | Description                                       |
| ----------------- | ------------------------------------------------- |
| `/magic:start`    | Start a task from a Jira ticket or GitHub issue   |
| `/magic:continue` | Resume work on an existing ticket                 |
| `/magic:commit`   | Create an atomic commit with conventional message |
| `/magic:pr`       | Push, create PR and update Jira                   |
| `/magic:review`   | Review a Pull Request (self or external)          |
| `/magic:resolve`  | Address review comments and force-push fixes      |
| `/magic:done`     | Finalize after PR merge (transition Jira to Done) |

> Type `/magic:` to quickly find all commands.

You can also invoke skills using natural language:

- "démarre PROJ-123" or "work on PROJ-123" → `/magic:start`
- "je reprends PROJ-123" or "continue PROJ-123" → `/magic:continue`
- "je suis prêt à committer" or "ready to commit" → `/magic:commit`
- "on peut créer la PR" or "create the PR" → `/magic:pr`
- "regarde la PR" or "review my PR" → `/magic:review`
- "corriger les commentaires" or "fix review comments" → `/magic:resolve`
- "la PR est mergée" or "the PR is merged" → `/magic:done`

## Installation

[**Download Magic Slash for macOS**](https://github.com/xrequillart/magic-slash/releases/latest) — drag it into
Applications and open it. There is no install script: the app sets the machine up itself.

Magic Slash is an account-based product. Your settings, repositories, agents and history live in
a Supabase database rather than on your disk, so the app needs an account and a reachable backend
to start — see [Accounts, sync and teams](#accounts-sync-and-teams).

### Prerequisites

- [Claude Code](https://claude.ai/download)
- Node.js 20+ (see `.nvmrc`)
- Git
- jq
- GitHub CLI (`gh`) — optional; without it `/magic:resolve` replies without threading

The app checks all of these on first launch and offers to install the ones Homebrew can
provide. Settings → Application → Machine setup reports the same thing at any time.

### What the app does on first launch

1. Asks you to sign in — the app renders nothing until it has a session
2. Asks where your tickets live (Jira + GitHub, or GitHub only)
3. Configures the MCP servers for that choice — both over OAuth, so there is no token to
   paste or store
4. Installs the 7 skills into `~/.claude/skills/`
5. Configures Claude Code's hooks, statusline and permission allowlist
6. Checks your prerequisites and reports what is missing

Repositories are configured afterwards, in Settings → Repositories, or from the web app —
they sync either way.

## Accounts, sync and teams

### Signing in is mandatory

The whole app sits behind a cloud gate. It renders only when the backend is reachable **and**
you are authenticated; every other state is a hard block, with no offline mode and no grace
period:

| State          | What you see                                                     |
| -------------- | ---------------------------------------------------------------- |
| authenticated  | the app                                                          |
| signed out     | a sign-in wall that cannot be dismissed                          |
| offline        | a "connection lost" screen with a retry button                   |
| cloud disabled | a "cloud not configured" screen (a build with no Supabase keys)  |

Sign-in is email + password. Forgotten passwords are reset with a 6-digit code sent by email.
**Account creation is not offered in the app** — the only in-app path to a new account is the
invitation wizard, which opens when you arrive through an invite link.

### What lives where

The Supabase database is the single source of truth. There is deliberately no local JSON
mirror of your settings: the app keeps an in-memory cache, hydrates it on launch, and writes
through on every change.

| Stored in the cloud                                     | Kept on disk                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| Settings (theme, language, integrations, split, …)      | `cloud-session.enc` — your session, encrypted via the keychain |
| Repositories, their identity and per-user local paths   | `appearance.json` — theme and language, read before the first paint |
| Agents and their state                                  | `command-history.json` — the terminal's command history      |
| Activity, usage and skill-invocation history            | `outbox.ndjson` — telemetry queued while offline             |
| Your profile                                            | `port` — the port the Claude Code hooks report into          |
| Organizations, members and invitations                  | `profile.md` — a mirror of the cloud profile, for the skills |

Local files live in `~/.config/magic-slash/` (a dev build gets its own `-dev` copy, so the two
never share a session or an agent roster).

A change made on another machine, or on the web app, arrives over Realtime and is applied
live — no restart, no reload.

### Teams

An account can belong to organizations, each with `admin` and `user` members. Within one:

- **Repositories can be shared** with the team. Their identity (name, keywords, settings) is
  org-wide, while the local folder path stays per-user — everyone binds the repo to wherever
  they cloned it.
- **Members are invited by email**, or with a link anyone can open. New teammates land in the
  invitation wizard, which only asks for their repository paths — the rest is inherited.
- **The team dashboard** reports activity, agents and skill hours across the org.

### The web app

One Next.js deployment on Vercel answers on three hosts:

| Host                    | Serves                                                  |
| ----------------------- | -------------------------------------------------------- |
| `magic-slash.io`        | the public site, the story and the documentation        |
| `app.magic-slash.io`    | the product — dashboard, team, and `/admin` back-office |
| `invite.magic-slash.io` | the invitation funnel                                   |

## Usage

### /magic:start - Start a task

```bash
/magic:start PROJ-1234    # Jira ticket
/magic:start 42           # GitHub issue
/magic:start #42          # GitHub issue (with #)
```

1. Detects the ticket type (Jira or GitHub) based on format
2. Fetches ticket/issue details (title, description, labels)
3. Analyzes the scope using keyword-based scoring to select relevant repositories
4. Creates Git worktrees automatically for selected repos
5. Generates an agent context to start coding

**Jira example (single repo detected):**

```text
> /magic:start PROJ-42

Source: Jira
Ticket: PROJ-42 - Add API endpoint for users
Type: Feature
Scope: api (score: 15) - matched keywords: "backend", "api"

Worktree created:
✓ /projects/my-api-PROJ-42

Context:
You need to implement the new API endpoint for users...
```

**Jira example (multiple repos detected):**

```text
> /magic:start PROJ-42

Source: Jira
Ticket: PROJ-42 - Add pagination on /users
Type: Feature

This ticket seems to concern multiple repositories:
1. api (score: 15) - matched keywords: "backend", "api"
2. web (score: 10) - matched keywords: "frontend"

Which one do you want to use? (1, 2, or 'all')
> all

Worktrees created:
✓ /projects/my-api-PROJ-42
✓ /projects/my-web-PROJ-42
```

### /magic:commit - Create a commit

```bash
/magic:commit
```

1. Stage all changes
2. Analyze the diff
3. Evaluate if changes should be split into multiple commits
4. Generate a conventional message (respects per-repo settings)
5. Auto-fix pre-commit hook errors (lint, format, etc.)
6. Create the commit

**Format examples:**

| Format       | Example                                       |
| ------------ | --------------------------------------------- |
| conventional | `feat: add JWT token refresh mechanism`       |
| angular      | `feat(auth): add JWT token refresh mechanism` |
| gitmoji      | `:sparkles: add JWT token refresh mechanism`  |

**With ticket ID (if enabled):**

```text
[PROJ-123] feat(auth): add JWT token refresh mechanism
```

**Multi-repo support:** If you're in a worktree associated with a ticket that spans multiple repos,
`/magic:commit` will detect all related worktrees and commit changes in each one.

### /magic:pr - Push and create a Pull Request

```bash
/magic:pr
```

1. Push the branch to origin
2. Create a Pull Request (via GitHub MCP)
   - Uses your project's PR template if one exists
   - Auto-links Jira/GitHub tickets in description (by default)
3. Extract ticket ID from branch name
4. Update Jira ticket → "To be reviewed"
5. Add comment with PR link on Jira (by default)

**Multi-repo support:** If you're in a worktree associated with a ticket that spans multiple repos,
`/magic:pr` will push and create PRs for each one.

**Example:**

```text
📌 Branch   : feature/PROJ-42
🔗 PR       : https://github.com/org/repo/pull/42
🎫 Ticket   : PROJ-42 → To be reviewed

Next steps:
1. Request a review from your colleagues
2. Wait for approval and CI checks
3. Merge the PR once approved
```

### /magic:review - Review a Pull Request

```bash
/magic:review          # Review the PR for the current branch
/magic:review PROJ-42  # Review a specific ticket's PR
```

1. Detect the PR associated with the current branch (or a given ticket)
2. Determine if this is a self-review or an external review
3. Fetch the PR diff and changed files
4. Analyze each file for issues, suggestions, and good practices
5. Submit the review on GitHub with categorized inline comments (Blocking / Suggestion / Praise)

> **Note:** This skill is read-only — it does not modify any files.

### /magic:resolve - Address review feedback

```bash
/magic:resolve          # Fix comments on the current branch's PR
/magic:resolve PROJ-42  # Fix comments for a specific ticket's PR
```

1. Retrieve unresolved review comments from the PR
2. Analyze each comment and determine required changes
3. Apply fixes to the codebase
4. Amend or create fixup commits as appropriate
5. Force-push with `--force-with-lease`

### /magic:done - Finalize after merge

```bash
/magic:done
```

1. Verify the PR has been merged
2. Transition the Jira ticket to "Done"
3. Add a final comment on Jira with a summary
4. Update task status in the Desktop app

**Example:**

```text
✅ Task finalized!

🎫 Ticket   : PROJ-42 → Done
🔗 PR       : https://github.com/org/repo/pull/42 (merged)
```

## Desktop App

Magic Slash ships a native desktop application built with Electron, featuring integrated Claude Code terminals, a project management sidebar, and agent tracking. Everything it holds — settings, repositories, agents, history — is synced to your account, so a second machine picks up where the first left off. The app checks for updates automatically on launch.

```bash
# Install desktop dependencies
npm run desktop:install

# Run in development mode
npm run desktop

# Build for production
npm run desktop:build

# Package for macOS
npm run desktop:package
```

## Configuration

### Files

| File                                       | Description                                            |
| ------------------------------------------ | ------------------------------------------------------ |
| `~/.claude/settings.json`                  | MCP servers, hooks, statusline and permission allowlist |
| `~/.claude/skills/magic-start/` (…and 6 more) | The installed skills, one directory each            |
| `~/.config/magic-slash/profile.md`         | User profile — a local mirror of the cloud profile, read by the skills |
| `~/.config/magic-slash/appearance.json`    | Theme and language, so a cold start paints correctly   |
| `~/.config/magic-slash/cloud-session.enc`  | Your session, encrypted with the OS keychain           |
| `~/.local/bin/magic-slash`                 | CLI command to launch the desktop app                  |

> Settings and repositories are **not** in this list: there is no `config.json` any more.
> They live in the database and are edited from Settings in the app, or from the web app.

### Settings schema

This is the shape of the settings the app syncs — useful for reading the code, not a file you
edit by hand:

```json
{
  "version": "0.71.3",
  "repositories": {
    "api": {
      "path": "/Users/dev/projects/my-api",
      "keywords": ["backend", "api", "server"],
      "color": "#3B82F6",
      "languages": {
        "commit": "en",
        "pullRequest": "fr",
        "jiraComment": "en",
        "discussion": "en"
      },
      "commit": {
        "style": "single-line",
        "format": "angular",
        "coAuthor": true,
        "includeTicketId": true
      },
      "resolve": {
        "commitMode": "new",
        "useCommitConfig": true,
        "replyToComments": true,
        "replyLanguage": "en"
      },
      "pullRequest": {
        "autoLinkTickets": true,
        "watchCI": true,
        "testAccounts": "off",
        "testAccountsSource": ""
      },
      "issues": {
        "commentOnPR": true,
        "jiraUrl": "",
        "githubIssuesUrl": ""
      },
      "branches": {
        "development": "develop"
      },
      "worktreeFiles": [".env", ".env.local"]
    },
    "web": {
      "path": "/Users/dev/projects/my-web",
      "keywords": ["frontend", "ui", "react"]
    }
  }
}
```

> The `version` field is stamped by the app itself.

### Repository settings

Each repository can be independently configured, from Settings → Repositories or from the web
app. A repository shared with an organization keeps these settings org-wide, while its local
folder path stays yours:

#### Languages

| Setting       | Description                           | Default |
| ------------- | ------------------------------------- | ------- |
| `commit`      | Language for commit messages          | `en`    |
| `pullRequest` | Language for PR title and description | `en`    |
| `jiraComment` | Language for Jira comments            | `en`    |
| `discussion`  | Language for Claude Code interactions | `en`    |

> Supported languages: `en` (English) and `fr` (French).

#### Commit settings

| Setting           | Description                                      | Default       |
| ----------------- | ------------------------------------------------ | ------------- |
| `style`           | `single-line` or `multi-line` (with body)        | `single-line` |
| `format`          | `conventional`, `angular`, `gitmoji`, or `none`  | `angular`     |
| `coAuthor`        | Add Claude as co-author in commits               | `true`        |
| `includeTicketId` | Add ticket ID from branch name in commit message | `true`        |

#### Resolve settings

| Setting           | Description                                               | Default |
| ----------------- | --------------------------------------------------------- | ------- |
| `commitMode`      | `new` (new commit + push) or `amend` (amend + force-push) | `new`   |
| `useCommitConfig` | Inherit format/style from commit settings                 | `true`  |
| `replyToComments` | Reply in-thread on GitHub for each resolved comment       | `true`  |
| `replyLanguage`   | Language for comment replies (`en`, `fr`)                 | `en`    |

#### Pull Request settings

| Setting              | Description                                                                                             | Default |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| `autoLinkTickets`    | Add Jira/GitHub ticket links in PR description                                                          | `true`  |
| `watchCI`            | After creating the PR, watch the checks, auto-fix failures, address review feedback                     | `true`  |
| `testAccounts`       | `off` (never mention), `reference` (state where the accounts live), or `inline` (paste the credentials) | `off`   |
| `testAccountsSource` | Explicit file path or project skill name holding the accounts (auto-detected when empty)                | `""`    |

When `testAccounts` is not `off`, `/magic:pr` adds the account a reviewer should log in with to the "How to test" prerequisites of the PR body, and `/magic:start` reports it in its final summary. The accounts are looked up in this order, stopping at the first hit: `testAccountsSource`, a project-local skill under the project's `.claude/skills/`, then documented files (`TESTING.md`, `docs/test*account*`, the test section of `CONTRIBUTING.md`). If nothing is found, the PR says so — no account is ever invented.

> A PR description is readable by anyone with access to the repository, and by everyone on a public one. `reference` is therefore safe everywhere, while `inline` is ignored on public repos and falls back to `reference`. No mode ever reads `.env*` files, `secrets/`, keychains, or git-ignored files as a source.

#### Issues settings

| Setting           | Description                                   | Default |
| ----------------- | --------------------------------------------- | ------- |
| `commentOnPR`     | Add comment with PR link when creating the PR | `true`  |
| `jiraUrl`         | Base URL for Jira instance                    | `""`    |
| `githubIssuesUrl` | URL for GitHub Issues                         | `""`    |

#### Branches settings

| Setting       | Description                                                | Default |
| ------------- | ---------------------------------------------------------- | ------- |
| `development` | Base branch for worktrees and PRs (e.g. `develop`, `main`) | `""`    |

> If `development` is empty, the skill prompts the user to specify the base branch.

#### Worktree files

| Setting         | Description                                                   | Default |
| --------------- | ------------------------------------------------------------- | ------- |
| `worktreeFiles` | Files to auto-copy from main repo to worktrees (e.g., `.env`) | `[]`    |

> When creating a worktree, Magic Slash copies these files from the main repository. If not configured, it auto-detects common untracked files and offers to save them for future use.

### User profile

On first launch, the Desktop app presents an onboarding wizard to create a user profile. The profile is stored in the cloud and mirrored to `~/.config/magic-slash/profile.md`, because the `/magic:*` skills read it from disk. It contains:

| Field                | Type         | Required | Description                                           |
| -------------------- | ------------ | -------- | ----------------------------------------------------- |
| `name`               | text         | yes      | First name, used to personalize responses             |
| `role`               | select       | yes      | Product / Dev / Design / QA / Ops / Manager / Other   |
| `technical_level`    | select       | yes      | Beginner / Intermediate / Expert                      |
| `communication_style`| select       | no       | Simple / Technical / Detailed                         |
| `languages`          | multi-select | no       | Preferred languages (English, Français)               |
| Free text            | textarea     | no       | Anything else Claude should know                      |

All `/magic:*` skills read this profile to adapt their communication — vocabulary, detail level, and language — based on the user's role and technical level. The profile can be edited anytime from **Settings > Profile** in the Desktop app, or from the web app; either way the local mirror is refreshed.

### Keywords

Keywords are used for smart repository selection when starting a task:

- When a Jira ticket has labels/components matching keywords → +10 points
- When keywords are found in the ticket title → +5 points
- When keywords are found in the description → +2 points
- If no keywords are specified, the repository name is used as default

## Project structure

```text
magic-slash/
├── .github/
│   ├── assets/           # Images this README renders
│   ├── ISSUE_TEMPLATE/   # Bug report, feature request templates & config
│   ├── workflows/        # CI and release workflows
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── desktop/               # Electron desktop app
│   ├── src/
│   │   ├── main/          # Main process (config, PTY, IPC, hooks, updater)
│   │   │   ├── cloud/     #   Supabase session, encrypted at rest
│   │   │   ├── config/    #   In-memory caches and their defaults
│   │   │   ├── setup/     #   Machine setup: prerequisites, MCP servers
│   │   │   └── store/     #   The persistence contract + telemetry outbox
│   │   ├── preload/       # Secure bridge
│   │   └── renderer/      # React UI (pages, components, hooks)
│   ├── resources/         # App icons & logo
│   └── package.json
├── skills/                        # Claude Code skills (7 skills)
│   ├── magic-start/              # Start a task
│   │   ├── SKILL.md
│   │   └── references/           # Messages, glossary, API docs, templates
│   ├── magic-continue/           # Resume work on a ticket
│   │   ├── SKILL.md
│   │   └── references/
│   ├── magic-commit/             # Create atomic commits
│   │   ├── SKILL.md
│   │   └── references/
│   ├── magic-pr/                 # Push and create PR
│   │   ├── SKILL.md
│   │   └── references/
│   ├── magic-review/SKILL.md     # Review a Pull Request
│   ├── magic-resolve/            # Address review feedback
│   │   ├── SKILL.md
│   │   └── references/
│   ├── magic-done/SKILL.md       # Finalize after merge
│   └── evals/                    # Eval set and results
├── webapp/                # Next.js app — public site + web product (Vercel)
│   ├── app/(marketing)/   # magic-slash.io — landing page, story
│   ├── app/(docs)/        # /documentation — linked from the desktop app only
│   ├── app/dashboard/     # app.magic-slash.io
│   ├── app/admin/         # app.magic-slash.io/admin — back-office
│   ├── app/invite/        # invite.magic-slash.io — invitation funnel
│   ├── middleware.ts      # Maps each host to its front door (lib/hostRouting.ts)
│   ├── components/        # Shared UI and the public site's sections
│   └── lib/               # Supabase client, i18n catalogues, helpers
├── install/
│   ├── uninstall.sh      # Uninstallation script
│   └── magic-slash       # CLI script (launches Desktop app)
├── CHANGELOG.md          # Version history
├── CODE_OF_CONDUCT.md    # Community guidelines
├── CONTRIBUTING.md       # Contribution guide
├── LICENSE               # MIT License
├── README.md             # This file
├── SECURITY.md           # Security policy
├── commitlint.config.js  # Commit message linting
├── eslint.config.mjs     # ESLint configuration
├── vitest.config.ts      # Test configuration
└── package.json          # Dev dependencies (linters, tests)
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before getting started.

- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project
- [Code of Conduct](CODE_OF_CONDUCT.md) - Our community standards
- [Security Policy](SECURITY.md) - How to report security vulnerabilities

### Quick Start for Contributors

```bash
# Clone the repository
git clone https://github.com/xrequillart/magic-slash.git
cd magic-slash

# Install dev dependencies
npm install

# Install yamllint (required for YAML linting)
pip install yamllint    # or: brew install yamllint

# Run linters
npm run lint

# Run tests
npm test

# Install desktop dependencies and run in dev mode
npm run desktop:install
npm run desktop
```

## Acknowledgments

Magic Slash is built with and for:

- [Claude Code](https://claude.ai/download) - AI-powered coding assistant
- [Atlassian MCP](https://mcp.atlassian.com) - Jira and Confluence integration
- [GitHub MCP](https://github.com/modelcontextprotocol/server-github) - GitHub integration
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message standard
- [Electron](https://www.electronjs.org/) - Desktop application framework
- [React](https://react.dev/) - UI library for desktop app
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Auth, database and Realtime sync
- [Next.js](https://nextjs.org/) - Public site and web product
- [Vercel](https://vercel.com/) - Hosting for the web app

## License

MIT - See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with love by <a href="https://github.com/xrequillart">Xrequillart</a>
</p>
