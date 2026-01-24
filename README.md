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
| `/start`  | Start a task from a Jira ticket                   |
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
3. Configures paths to your BACKEND / FRONTEND repos
4. Installs the 3 slash commands

## Usage

### /start - Start a task

```bash
/start PROJ-1234
```

1. Fetches the Jira ticket (title, description, labels)
2. Analyzes the scope: BACKEND / FRONTEND / BOTH
3. Creates Git worktrees automatically
4. Generates an agent context to start coding

**Example:**

```text
> /start PROJ-42

Ticket: PROJ-42 - Add pagination on /users
Type: Feature
Scope: BOTH

Worktrees created:
✓ /projects/project-back-PROJ-42
✓ /projects/project-front-PROJ-42

Context:
You need to implement pagination on the GET /users endpoint...
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
| `~/.config/magic-slash/config.json` | Repository paths                     |
| `~/.local/bin/magic-slash`          | CLI command to manage configuration  |
| `~/.claude/commands/start.md`       | Slash command /start                 |
| `~/.claude/commands/commit.md`      | Slash command /commit                |
| `~/.claude/commands/done.md`        | Slash command /done                  |

### Modify repositories

Run the `magic-slash` command to modify your repository paths:

```bash
magic-slash
```

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
