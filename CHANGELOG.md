# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2025-01-28

### Added

- **Natural language invocation**: Invoke commands using natural language instead of slash commands
  - Say "démarre PROJ-123" or "work on PROJ-123" instead of `/start PROJ-123`
  - Say "je suis prêt à committer" or "ready to commit" instead of `/commit`
  - Say "on peut créer la PR" or "create the PR" instead of `/done`
  - Supports both French and English trigger phrases
- **Skills architecture**: Commands are now "skills" installed in `~/.claude/skills/`
  - Each skill contains full instructions + trigger phrases for natural invocation
  - Replaces the old `~/.claude/commands/` structure
- **Multi-repo commit support**: `/commit` now detects and commits across multiple worktrees
  - Automatically finds all worktrees for the same ticket ID
  - Shows summary of changes in each worktree before committing
- **Auto-fix for pre-commit hooks**: `/commit` automatically fixes linting/formatting errors
  - Detects ESLint, Prettier, Black, and other common pre-commit hooks
  - Automatically corrects issues and retries commit (up to 3 attempts)
- **Landing page improvements**:
  - Differentiated terminal animations showing both Jira and GitHub workflows
  - Mix of slash commands and natural language invocations in demo
  - New "Skills / Natural invocation" documentation section
  - New "Troubleshooting" documentation section with common issues and fixes
  - Language-aware examples (FR/EN) throughout documentation

### Changed

- **Simplified installation**: `install.sh` reduced from ~940 to ~490 lines
  - Skills are now the single source of truth (no separate commands)
  - Cleaner installation process with better feedback
- **Updated uninstall**: Now removes skills from `~/.claude/skills/` and cleans up legacy commands

### Performance

- **Optimized intro animation**: Improved performance on low-end devices

## [0.8.0] - 2025-01-28

### Added

- **Commit split evaluation in `/commit`**: New step that evaluates if staged changes should be split
  into multiple atomic commits
  - Detects when changes span multiple distinct features
  - Identifies mixed commit types (e.g., `feat` + `fix` + `chore`)
  - Recognizes independent scopes/modules that should be committed separately
  - Proposes split with description of each commit, asks for user confirmation
  - If accepted: unstages all, then stages and commits each logical group separately
- **Stats section on landing page**: New "Gagnez du temps" / "Save time" section showcasing productivity gains
  - Timeline comparing before/after times for each command (/start: 5min→30s, /commit: 2min→10s, /done: 5min→20s)
  - Detailed comparison table showing manual workflow steps vs Magic Slash automation
  - Bilingual support (FR/EN) consistent with rest of the site
- **Install box in CTA section**: Added curl install command directly in the "Ready to automate?" call-to-action

## [0.7.1] - 2025-01-27

### Changed

- **Landing page scroll animation**: Tripled scroll distance for intro animation (logo → tagline → terminal)
  - Animation now requires 9x viewport height instead of 3x for smoother experience
  - Prevents animation from feeling rushed when scrolling quickly

## [0.7.0] - 2025-01-27

### Added

- **PR template support in `/done`**: Now automatically detects and uses the project's PR template
  - Searches for templates in `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, or `docs/pull_request_template.md`
  - Fills all template sections when a project template is found
  - Falls back to default template if no project template exists

### Fixed

- **Landing page terminal animation**: Animation now properly resets when scrolling back up
  - Added timeout tracking system to cancel pending animations on reset
  - Prevents visual glitches with pre-checked steps when replaying animation
- **Terminal appearance timing**: Increased spacing between secondary terminal appearances (3% → 4% scroll intervals)

## [0.6.1] - 2025-01-26

### Fixed

- Fix markdown linting errors (table formatting, blank lines around lists)
- Fix YAML linting errors (line length in CI workflow and issue template)
- Fix shellcheck warnings (separate declare and assign for local variables)

## [0.6.0] - 2025-01-26

### Added

- **Multi-repository support**: Configure 1 to N repositories instead of hardcoded backend/frontend
  - Each repository now has a `path` and optional `keywords` array for smart detection
  - Keywords default to the repository name if not specified
- **Language settings**: Configure language preferences for each feature via `magic-slash` CLI
  - `Commit language`: Language for commit messages (English/Français)
  - `Pull Request language`: Language for PR title and description (English/Français)
  - `Jira comment language`: Language for Jira comments when PR is created (English/Français)
  - `Discussion language`: Language for Claude Code interactions (English/Français)
- **Language submenu in CLI**: New "Language settings" option in the main menu
  - Interactive language selection with arrow keys
  - Settings persisted in `~/.config/magic-slash/config.json`
- **Smart repository selection in `/start`**: Keyword-based scoring system
  - Labels/Components matching keywords: +10 points
  - Keywords found in title: +5 points
  - Keywords found in description: +2 points
  - Single high-score repo is auto-selected, multiple matches prompt user choice
- **CLI repository management**: New `magic-slash` CLI features
  - Dynamic menu showing all configured repositories
  - Add new repository with name, path, and keywords
  - Remove existing repositories
  - Edit repository path and keywords
- **Backward compatibility**: Automatically reads legacy v1 config format

### Changed

- **Installation flow**: Now asks "How many repositories?" (1-10) instead of hardcoded backend/frontend prompts
- **Configuration schema**: New format with structured repository objects

  ```json
  {
    "repositories": {
      "api": {"path": "/path/to/api", "keywords": ["backend", "api"]},
      "web": {"path": "/path/to/web", "keywords": ["frontend", "ui"]}
    }
  }
  ```

- **`/start` command**: Iterates over N configured repos instead of just backend/frontend
- **Scope detection**: Uses keyword scoring instead of simple BACK/FRONT/BOTH logic

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

[0.8.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.8.0
[0.7.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.7.1
[0.7.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.7.0
[0.6.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.6.1
[0.6.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.6.0
[0.5.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.5.0
[0.4.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.4.0
[0.3.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.3.0
[0.2.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.2.1
[0.2.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.2.0
[0.1.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.1.0
[0.0.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.0.1
