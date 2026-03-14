<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-readme-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/logo-readme-light.svg">
    <img src="docs/logo-readme-light.svg" alt="Magic Slash" height="80">
  </picture>
</p>

<p align="center">
  3 skills for Claude Code that automate the entire development cycle.
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

| Skill              | Description                                       |
| ------------------ | ------------------------------------------------- |
| `/magic-start`     | Start a task from a Jira ticket or GitHub issue   |
| `/magic-continue`  | Resume work on an existing ticket                 |
| `/magic-commit`    | Create an atomic commit with conventional message |
| `/magic-done`      | Push, create PR and update Jira                   |

> Type `/magic-` to quickly find all commands.

You can also invoke skills using natural language:

- "démarre PROJ-123" or "work on PROJ-123" → `/magic-start`
- "je suis prêt à committer" or "ready to commit" → `/magic-commit`
- "on peut créer la PR" or "create the PR" → `/magic-done`

## Installation

```bash
curl -fsSL https://magic-slash.io/install.sh | bash
```

### Prerequisites

- [Claude Code](https://claude.ai/download)
- Node.js
- Git
- jq

### What the script does

1. Configures Atlassian MCP (prompts for OAuth authentication)
2. Configures GitHub MCP (prompts for your token)
3. Configures your repositories (1 to N repos with optional keywords for smart detection)
4. Installs the 3 skills

## Usage

### /magic-start - Start a task

```bash
/magic-start PROJ-1234    # Jira ticket
/magic-start 42           # GitHub issue
/magic-start #42          # GitHub issue (with #)
```

1. Detects the ticket type (Jira or GitHub) based on format
2. Fetches ticket/issue details (title, description, labels)
3. Analyzes the scope using keyword-based scoring to select relevant repositories
4. Creates Git worktrees automatically for selected repos
5. Generates an agent context to start coding

**Jira example (single repo detected):**

```text
> /magic-start PROJ-42

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
> /magic-start PROJ-42

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

### /magic-commit - Create a commit

```bash
/magic-commit
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
| gitmoji      | `✨ add JWT token refresh mechanism`          |

**With ticket ID (if enabled):**

```text
[PROJ-123] feat(auth): add JWT token refresh mechanism
```

**Multi-repo support:** If you're in a worktree associated with a ticket that spans multiple repos,
`/magic-commit` will detect all related worktrees and commit changes in each one.

### /magic-done - Finalize the task

```bash
/magic-done
```

1. Push the branch to origin
2. Create a Pull Request (via GitHub MCP)
   - Uses your project's PR template if one exists
   - Auto-links Jira/GitHub tickets in description (by default)
3. Extract ticket ID from branch name
4. Update Jira ticket → "To be reviewed"
5. Add comment with PR link on Jira (by default)

**Example:**

```text
✅ Task completed!

📌 Branch   : feature/PROJ-42
🔗 PR       : https://github.com/org/repo/pull/42
🎫 Ticket   : PROJ-42 → To be reviewed

Next steps:
1. Request a review from your colleagues
2. Wait for approval and CI checks
3. Merge the PR once approved
```

## Configuration

### Web UI

Run `magic-slash` to open the configuration web interface:

```bash
magic-slash
```

This launches a local web server and opens your browser to configure:

- **Repositories**: Add, edit, or remove repositories with their paths and keywords
- **Per-repository settings**: Customize commit format, PR behavior, and languages for each repo
- **Global defaults**: Set default languages for all repositories

<p align="center">
  <img src="docs/web-ui-preview.png" alt="Magic Slash Web UI" width="600">
</p>

### Desktop App

Magic Slash also ships a native desktop application built with Electron, featuring integrated Claude Code terminals and project management.

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

### Files

| File                                | Description                            |
| ----------------------------------- | -------------------------------------- |
| `~/.claude/settings.json`           | Atlassian & GitHub MCP configuration   |
| `~/.config/magic-slash/config.json` | Repository paths, keywords, settings   |
| `~/.local/bin/magic-slash`          | CLI command to launch web UI           |
| `~/.claude/skills/magic-slash/`     | Installed skills (start, commit, done) |

### Configuration schema

```json
{
  "version": "0.14.2",
  "repositories": {
    "api": {
      "path": "/Users/dev/projects/my-api",
      "keywords": ["backend", "api", "server"],
      "languages": {
        "commit": "en",
        "pullRequest": "fr"
      },
      "commit": {
        "style": "single-line",
        "format": "angular",
        "coAuthor": false,
        "includeTicketId": true
      },
      "pullRequest": {
        "autoLinkTickets": true
      },
      "issues": {
        "commentOnPR": true
      }
    },
    "web": {
      "path": "/Users/dev/projects/my-web",
      "keywords": ["frontend", "ui", "react"]
    }
  },
  "languages": {
    "commit": "en",
    "pullRequest": "en",
    "jiraComment": "en",
    "discussion": "en"
  }
}
```

### Repository settings

Each repository can have its own settings that override global defaults:

#### Languages

| Setting       | Description                           | Default |
| ------------- | ------------------------------------- | ------- |
| `commit`      | Language for commit messages          | `en`    |
| `pullRequest` | Language for PR title and description | `en`    |
| `jiraComment` | Language for Jira comments            | `en`    |
| `discussion`  | Language for Claude Code interactions | `en`    |

#### Commit settings

| Setting           | Description                                      | Default       |
| ----------------- | ------------------------------------------------ | ------------- |
| `style`           | `single-line` or `multi-line` (with body)        | `single-line` |
| `format`          | `conventional`, `angular`, `gitmoji`, or `none`  | `angular`     |
| `coAuthor`        | Add Claude as co-author in commits               | `false`       |
| `includeTicketId` | Add ticket ID from branch name in commit message | `false`       |

#### Pull Request settings

| Setting           | Description                                    | Default |
| ----------------- | ---------------------------------------------- | ------- |
| `autoLinkTickets` | Add Jira/GitHub ticket links in PR description | `true`  |

#### Issues settings

| Setting       | Description                                   | Default |
| ------------- | --------------------------------------------- | ------- |
| `commentOnPR` | Add comment with PR link when creating the PR | `true`  |

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
│   ├── ISSUE_TEMPLATE/   # Bug report & feature request templates
│   ├── workflows/        # CI and release workflows
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── desktop/               # Electron desktop app
│   ├── src/
│   │   ├── main/          # Main process (config, PTY, IPC)
│   │   ├── preload/       # Secure bridge
│   │   └── renderer/      # React UI (pages, components, hooks)
│   ├── resources/         # App icons & logo
│   └── package.json
├── skills/
│   ├── magic-start/SKILL.md      # Skill /magic-start
│   ├── magic-continue/SKILL.md   # Skill /magic-continue
│   ├── magic-commit/SKILL.md     # Skill /magic-commit
│   └── magic-done/SKILL.md       # Skill /magic-done
├── web-ui/               # Configuration web interface
│   ├── server.js         # Express server
│   ├── package.json      # Dependencies
│   ├── lib/              # Backend utilities
│   └── public/           # Frontend (HTML, CSS, JS)
├── docs/                 # Landing page (GitHub Pages)
│   ├── index.html        # Main page
│   ├── logo.svg          # Logo (vector)
│   ├── logo.png          # Logo (raster)
│   ├── fonts/            # Custom fonts (Avenir)
│   └── CNAME             # Custom domain config
├── install/
│   ├── install.sh        # Installation script
│   ├── uninstall.sh      # Uninstallation script
│   └── magic-slash       # CLI script (launches web UI)
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
pip install yamllint

# Run linters
npm run lint

# Run tests
npm test

# Test the web UI locally
cd web-ui && npm install && npm start

# Run the desktop app in dev mode
cd desktop && npm install && npm run dev
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

## License

MIT - See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with love by <a href="https://github.com/xrequillart">Xrequillart</a>
</p>
