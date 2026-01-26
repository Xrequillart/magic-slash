# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-01-26

### Added

- **Version badge in header**: Dynamic version display in the floating navigation
  - Fetches version from `package.json` via GitHub raw content
  - Links to CHANGELOG.md for release notes

### Changed

- **Landing page code structure**: Extracted inline CSS and JavaScript into separate files
  - `styles.css`: All styling rules (~2300 lines)
  - `script.js`: All JavaScript logic (~1400 lines)
  - Reduces `index.html` from ~3300 to ~1900 lines for better maintainability
- **Install command styling**: Increased font-size from 13px to 17px for better readability

## [0.4.0] - 2025-01-25

### Added

- **Version tracking**: Installation version is now saved in `~/.config/magic-slash/config.json`
- **Smart update detection**: `install.sh` now detects previously installed versions
  - Shows "already up to date" message when same version is installed
  - Shows update prompt when a newer version is available
  - Arrow key navigation menu for update/cancel choices (consistent with CLI UX)

### Changed

- **Installer UX**: Replaced y/N prompts with arrow key selection menus for version choices
- **Config file structure**: Added `version` field to track installed version
- **ASCII logo**: New logo matching the brand identity (magic + /slash) with purple colored slash
  - Updated in `install.sh`, `uninstall.sh`, and `magic-slash` CLI

## [0.3.0] - 2025-01-25

### Added

- **Landing page multi-terminal animation**: Display 7 terminals during scroll to showcase parallel task execution
  - Central terminal with original animation
  - 6 side terminals (left, right, top-left, top-right, bottom-left, bottom-right) appearing sequentially
  - Each terminal displays a different Jira ticket ID (PROJ-42, PROJ-18, PROJ-95, PROJ-7, PROJ-156, PROJ-63, PROJ-204)
  - Terminals slide in from their respective directions with smooth animations

### Changed

- **Landing page scroll behavior**: Terminals now stay in position after zoom animation ends
  and scroll naturally with the page
- **Terminal appearance timing**: Increased spacing between terminal appearances for better visual effect
- **Install box styling**: Updated border-radius to 50px to match floating header, circular copy button

### Fixed

- **Terminal animation targeting**: Fixed animation selectors to target only the central terminal,
  preventing conflicts with cloned terminals

## [0.2.1] - 2025-01-25

### Fixed

- **Landing page**: Fix terminal animation not starting automatically due to race condition
  - `terminalAnimationComplete` variable was declared after the scroll event listener was attached
  - Moved variable declaration before `handleZoomScroll` to prevent "temporal dead zone" errors

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

[0.5.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.5.0
[0.4.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.4.0
[0.3.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.3.0
[0.2.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.2.1
[0.2.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.2.0
[0.1.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.1.0
[0.0.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.0.1
