<p align="center">
  <img src="docs/logo.svg" alt="Magic Slash" height="80">
</p>

<p align="center">
  3 slash commands for Claude Code that automate the entire development cycle.
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

## Commands

| Command   | Description                                       |
| --------- | ------------------------------------------------- |
| `/start`  | Start a task from a Jira ticket or GitHub issue   |
| `/commit` | Create an atomic commit with conventional message |
| `/done`   | Push, create PR and update Jira                   |

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
4. Installs the 3 slash commands

## Usage

### /start - Start a task

```bash
/start PROJ-1234    # Jira ticket
/start 42           # GitHub issue
/start #42          # GitHub issue (with #)
```

1. Detects the ticket type (Jira or GitHub) based on format
2. Fetches ticket/issue details (title, description, labels)
3. Analyzes the scope using keyword-based scoring to select relevant repositories
4. Creates Git worktrees automatically for selected repos
5. Generates an agent context to start coding

**Jira example (single repo detected):**

```text
> /start PROJ-42

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
> /start PROJ-42

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

**GitHub example:**

```text
> /start 123

Source: GitHub (owner/my-api)
Issue: #123 - Fix authentication bug
Labels: bug, backend
Scope: api (found in this repo)

Worktree created:
✓ /projects/my-api-123

Context:
You need to fix the authentication bug in the login flow...
```

**Multiple issues with same ID:**

If the same issue number exists in multiple configured repositories, you'll be prompted to choose:

```text
> /start 42

Multiple issues #42 found:

1. owner/my-api : "Add caching layer"
2. owner/my-web : "Add loading spinner"

Which one do you want to use? (or 'all')
```

### /commit - Create a commit

```bash
/commit
```

1. Stage all changes
2. Analyze the diff
3. Generate a conventional message
4. Create the commit

**Format:** `type(scope): description`

**Examples:**

- `feat(auth): add JWT token refresh mechanism`
- `fix(api): handle null response from payment gateway`
- `refactor(user-service): extract validation logic`

### /done - Finalize the task

```bash
/done
```

1. Push the branch to origin
2. Create a Pull Request (via GitHub MCP)
   - **Uses your project's PR template** if one exists (`.github/PULL_REQUEST_TEMPLATE.md`)
   - Falls back to a default template otherwise
3. Extract ticket ID from branch name
4. Update Jira ticket → "To be reviewed"

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

### Files

| File                                | Description                          |
| ----------------------------------- | ------------------------------------ |
| `~/.claude/settings.json`           | Atlassian & GitHub MCP configuration |
| `~/.config/magic-slash/config.json` | Repository paths and keywords        |
| `~/.local/bin/magic-slash`          | CLI command to manage configuration  |
| `~/.claude/commands/start.md`       | Slash command /start                 |
| `~/.claude/commands/commit.md`      | Slash command /commit                |
| `~/.claude/commands/done.md`        | Slash command /done                  |

### Configuration schema

```json
{
  "version": "0.8.0",
  "repositories": {
    "api": {
      "path": "/Users/dev/projects/my-api",
      "keywords": ["backend", "api", "server"]
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

**Keywords** are used for smart repository selection:

- When a Jira ticket has labels/components matching keywords → +10 points
- When keywords are found in the ticket title → +5 points
- When keywords are found in the description → +2 points
- If no keywords are specified, the repository name is used as default

**Languages** configure the output language for each feature:

- `commit`: Language for commit messages (`"en"` or `"fr"`)
- `pullRequest`: Language for PR title and description (`"en"` or `"fr"`)
- `jiraComment`: Language for Jira comments (`"en"` or `"fr"`)
- `discussion`: Language for Claude Code interactions (`"en"` or `"fr"`)

### Manage configuration

Run the `magic-slash` command to manage your configuration:

```bash
magic-slash
```

The interactive menu allows you to:

- **Edit** existing repositories (path and keywords)
- **Add** new repositories
- **Remove** existing repositories
- **Language settings** - Configure language for commits, PRs, and discussions

Use the arrow keys to navigate and Enter to select. You can also edit the config file directly:

```bash
nano ~/.config/magic-slash/config.json
```

## Project structure

```text
magic-slash/
├── .github/
│   ├── ISSUE_TEMPLATE/   # Bug report & feature request templates
│   ├── workflows/        # CI and release workflows
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── commands/
│   ├── start.md          # Slash command /start
│   ├── commit.md         # Slash command /commit
│   └── done.md           # Slash command /done
├── docs/                 # Landing page (GitHub Pages)
│   ├── index.html        # Main page
│   ├── logo.svg          # Logo (vector)
│   ├── logo.png          # Logo (raster)
│   ├── fonts/            # Custom fonts (Avenir)
│   └── CNAME             # Custom domain config
├── install/
│   ├── install.sh        # Installation script
│   ├── uninstall.sh      # Uninstallation script
│   └── magic-slash       # CLI script
├── CHANGELOG.md          # Version history
├── CODE_OF_CONDUCT.md    # Community guidelines
├── CONTRIBUTING.md       # Contribution guide
├── LICENSE               # MIT License
├── README.md             # This file
├── SECURITY.md           # Security policy
├── commitlint.config.js  # Commit message linting
└── package.json          # Dev dependencies (linters)
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
```

## Acknowledgments

Magic Slash is built with and for:

- [Claude Code](https://claude.ai/download) - AI-powered coding assistant
- [Atlassian MCP](https://mcp.atlassian.com) - Jira and Confluence integration
- [GitHub MCP](https://github.com/modelcontextprotocol/server-github) - GitHub integration
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message standard

## License

MIT - See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with love by <a href="https://github.com/xrequillart">Xrequillart</a>
</p>
