# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-25

### Added

- **GitHub Issues support in `/start`**: Now supports starting tasks from GitHub issues
  - Detects ticket type automatically based on format (Jira: `PROJ-123`, GitHub: `123` or `#123`)
  - Searches for issues across all configured repositories
  - Prompts user to choose when same issue number exists in multiple repos
  - Adapts branch naming for GitHub issues (e.g., `feature/repo-name-123`)

## [0.1.0] - 2026-01-24

### Added

- **CLI `magic-slash`**: Interactive command-line tool for configuration management
  - TUI interface with keyboard navigation (arrow keys, Enter, q to quit)
  - Configure backend and frontend repository paths
  - Path validation with git repository detection
  - Persistent configuration stored in `~/.config/magic-slash/config.json`

## [0.0.1] - 2026-01-24

### Added

- **Slash commands for Claude Code**:
  - `/start <TICKET-ID>`: Start a task from a Jira ticket
    - Fetches ticket details via Atlassian MCP
    - Analyzes scope (backend/frontend/both) from labels and keywords
    - Creates git worktrees for isolated development
  - `/commit`: Create atomic commits with conventional messages
    - Analyzes staged changes
    - Generates conventional commit messages (`type(scope): description`)
    - Supports feat, fix, docs, style, refactor, test, chore types
  - `/done`: Finalize a task
    - Pushes commits to remote
    - Creates Pull Request via GitHub MCP
    - Updates Jira ticket status to "To be reviewed"
    - Adds PR link as comment on Jira ticket
- **Installation scripts**:
  - `install.sh`: One-line installation via curl
  - `uninstall.sh`: Clean removal of all components
- **Documentation website**: Landing page at magic-slash.io
- **CI/CD pipelines**:
  - `ci.yml`: Linting and validation workflow
  - `release.yml`: Automated GitHub releases on version tags
- **Community files**:
  - Issue templates (bug report, feature request)
  - Pull request template with checklist
  - Contributing guidelines
  - Code of conduct
  - Security policy

[0.2.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.2.0
[0.1.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.1.0
[0.0.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.0.1
