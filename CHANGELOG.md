# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.30.0] - 2026-03-30

### Added

- **Desktop**: New "Warnings" section on the Skills page that detects and displays duplicate skill names across sources (built-in, custom, repo)
- **Desktop**: Long description alert moved to the Warnings section with "Open in VS Code" and "Fix with agent" action buttons
- **Desktop**: "Fix with agent" button launches a new Claude agent with a pre-filled prompt to optimize skill descriptions exceeding 110 words
- **Desktop**: "Open in VS Code" button opens all problematic skill files directly in the editor

## [0.29.4] - 2026-03-29

### Fixed

- **Desktop**: Remove terminal row cap (26 rows) that prevented xterm.js from using full window height
- **Desktop**: Eliminate flash/flicker when switching between agents by using `refresh()` instead of heavy buffer restore (`reset()` + IPC `getBuffer()` + `write()`)
- **Desktop**: Fix inconsistent initial PTY rows between `createTerminal` (26) and `createPtyProcess` (30)

### Changed

- **Desktop**: Replace custom `fitTerminal()` with `fitAddon.fit()` to remove fragile internal xterm.js API usage (`_core._renderService.clear()`)
- **Desktop**: Increase resize debounce from 100ms to 200ms to reduce SIGWINCH churn during continuous window drag

## [0.29.3] - 2026-03-29

### Fixed

- **Desktop**: Cap terminal rows to 26 to reduce excessive empty space in fresh Claude Code sessions
- **Desktop**: Prevent unnecessary SIGWINCH signals when switching agents (guard resize IPC with dimension check)
- **Desktop**: Always re-render terminal from display buffer when agent becomes visible to fix missing status bar info
- **Desktop**: Improve text contrast on transparent background with `minimumContrastRatio: 4.5`

## [0.29.2] - 2026-03-29

### Fixed

- **Desktop**: Fix terminal text formatting (broken line wrapping) when switching between agents after window/container resize
- **Desktop**: Prepend ANSI reset on display buffer truncation to prevent color bleeding on buffer restore

## [0.29.1] - 2026-03-27

### Changed

- **Desktop**: Restyle title bar split view toggle — pill shape, text-only labels (Normal / Split view), slide-in/out animations
- **Desktop**: Restyle sidebar toggle buttons with rounded background matching the split view switch

## [0.29.0] - 2026-03-26

### Added

- **Desktop**: Add split-screen dual view for side-by-side agents
- **Desktop**: Persist split view mode in config.json

## [0.28.4] - 2026-03-26

### Added

- **PR**: Add body formatting verification step (6.2.1) before PR creation — checks for literal `\n`, unfilled placeholders, missing section headers, and empty sections with automatic reconstruction and retry

## [0.28.3] - 2026-03-25

### Changed

- **Landing**: Revamp documentation page — add Hooks & Automation, Security & Permissions, Updates & Auto-Update sections, expand FAQ, fix skill images, remove standalone CLI references

### Fixed

- **Docs**: Fix inconsistencies — Node.js 18+ → 20+ in CLAUDE.md, "3 skills" → "7 skills" in package.json and documentation, remove non-existent logo.png from README, correct lint description

## [0.28.2] - 2026-03-25

### Changed

- **Desktop**: Match terminal font size with sidebar agent list text size (15 → 14px)

## [0.28.1] - 2026-03-25

### Changed

- **Desktop**: Increase terminal font size from 13 to 15 for better readability

## [0.28.0] - 2026-03-25

### Changed

- **Desktop**: Group sidebar agents by workflow status (Backlog, In Progress, In Review, Done) instead of by repository

## [0.27.2] - 2026-03-25

### Changed

- **README**: Add desktop app screenshot
- **Install**: Remove standalone mode and web-ui

### Fixed

- **Desktop**: Add GitHub auth to API calls for release notes and skills updater
- **Desktop**: Reduce terminal line-height to match native Apple Terminal

## [0.27.1] - 2026-03-25

### Added

- **Skills**: Add `/audit` skill — scan documentation files for inconsistencies against sources of truth and fix them interactively

### Changed

- **Release**: Add project prefix to `/release` skill description for clarity
- **Desktop**: Harden terminal robustness — simplify IPC terminal handlers, improve PTY manager error handling, and streamline TerminalView component

## [0.27.0] - 2026-03-24

### Added

- **Desktop**: Add long description warning to skills budget gauge
- **Desktop**: Unify section titles with icons and add shimmer animation to budget bars

### Changed

- **Skill /pr**: Add `AskUserQuestion` to 7 interaction points for better UX and less context usage
- **Skill /pr**: Deduplicate ticket ID extraction (single extraction, reused across steps)
- **Skill /pr**: Default to `git diff --stat` instead of full diff to reduce context consumption
- **Skill /pr**: Merge duplicate config reads into a single step
- **Skill /pr**: Shorten skill description from ~170 to ~95 words
- **Skill /pr**: Replace MUST/CRITICAL language with why-explanations
- **Desktop**: Remove unused snippets feature

### Fixed

- **Skill /pr**: Fix PR description rendering on GitHub — literal `\n` characters replaced with actual line breaks for proper Markdown formatting

## [0.26.0] - 2026-03-23

### Added

- **Desktop**: Add token budget gauge to skills page

### Changed

- **Desktop**: Remove unused workspace terminal feature

## [0.25.1] - 2026-03-23

### Changed

- **Permissions**: Pre-authorize MCP tools (GitHub + Atlassian) and common Bash commands (git, npm, yarn, pnpm, bun, jq, gh) to reduce permission prompts when using magic:* skills

## [0.25.0] - 2026-03-23

### Changed

- **Skill /start**: Reduce context window consumption via sub-agents and reference splitting
- **Skills**: Rename skill names from `magic-*` to `magic:*` for Claude Code native skill invocation
- **Dependencies**: Bump the linters group with 2 updates

### Fixed

- **Desktop**: Use directory name for skill filesystem operations

## [0.24.0] - 2026-03-20

### Added

- **Skill /start**: Add automatic `/simplify` pass after implementation (step 5.4.5) to review changed code for reuse, quality and efficiency

### Changed

- **Skills evals**: Remove trigger evals workspace files (cleanup)

### Fixed

- **Install & Desktop**: Fix invalid permission pattern for localhost curl — use `Bash(*http://127.0.0.1:*)` to comply with Claude Code's `:*` must-be-at-end rule

## [0.23.0] - 2026-03-19

### Added

- **Skills**: Add `skill-creator` skill for creating, improving and benchmarking skills
- **Skills /resolve**: Add multi-repo support and re-request review after pushing fixes
- **Skills evals**: Add eval set (30 queries) and results for magic-skills triggering accuracy
- **Install**: Sync entire skill folders (references, images) instead of only `SKILL.md`

### Changed

- **Skill /start**: Extract bilingual messages, node setup, plan templates, glossary and API into references
- **Skill /continue**: Rewrite SKILL.md with progressive disclosure and why explanations; extract bilingual messages, node setup, glossary and API into references
- **Skill /commit**: Extract bilingual messages, node setup and glossary into references
- **Skill /pr**: Improve skill with structured error handling, PR preview and messages reference
- **Skill /done**: Improve skill with why context, edge cases, robust PR search and dynamic summary
- **Skill /resolve**: Add messages reference file

## [0.22.0] - 2026-03-18

### Changed

- **Desktop**: Replace development branch text input with a select dropdown listing remote branches via `git ls-remote --heads origin` (async, non-blocking)

## [0.21.1] - 2026-03-18

### Fixed

- **Desktop**: Fix terminal scroll issues — smart auto-scroll on incoming data, alternate screen buffer detection, screen clear reset, scroll-to-bottom button, and thin scrollbar

## [0.21.0] - 2026-03-17

### Added

- **Skill /start**: Auto-detect worktree files when config is empty
- **Install (Web UI)**: Add worktree files settings to web-ui configuration
- **Desktop**: Add worktree files settings to desktop configuration

### Fixed

- **Skill /start**: Handle empty response for branch confirmation prompt

## [0.20.2] - 2026-03-17

### Added

- **Skill /done**: Add worktree and branch cleanup after merge
- **Skill /start**: Sync local dev branch before worktree creation

### Fixed

- **Desktop**: Fix terminal scroll — users can now scroll freely while Claude is outputting text, leveraging xterm.js native auto-follow behavior

## [0.20.1] - 2026-03-17

### Fixed

- **Desktop**: Fix linter issue at build

## [0.20.0] - 2026-03-17

### Added

- **Desktop Skills page**: New "Repository Skills" section that scans registered repositories for skills in `.claude/skills/` and `.claude/commands/`, grouped by repo with colored dot and read-only detail view
- **Desktop Skills page**: Subtitle descriptions for Built-in, Custom, and Repository Skills sections

### Changed

- **Desktop**: Widen content max-width from 42rem to 62rem on Skills and Settings pages
- **Desktop Skills page**: SkillCard now uses a generic `badge` prop instead of hardcoded `isBuiltIn` check

## [0.19.0] - 2026-03-17

### Added

- **Config migration**: Auto-migrate `config.json` at startup (desktop + web-ui) to ensure all repositories have a uniform format with all fields present (color, languages, commit, resolve, pullRequest, issues, branches)
- **Config migration**: Auto-migrate agents to ensure `repositories` array and complete `metadata` structure exist
- **Resolve settings**: Add per-repository resolve settings (commitMode, format, style, useCommitConfig, replyToComments, replyLanguage)

### Changed

- **Config**: `addRepository()` now creates repositories with all default fields instead of only path/keywords/languages

## [0.18.3] - 2026-03-16

### Changed

- **README**: Update for all 7 skills — add `/magic-pr`, `/magic-review`, `/magic-resolve` sections, fix `/magic-done` description, add natural language triggers, update installation modes, config schema (`installationMode`, `branches.development`), and project structure

## [0.18.2] - 2026-03-16

### Changed

- **Desktop**: Display active agent title (from metadata) in the center of the title bar
- **Desktop**: Change sidebar toggle icons active color from blue to white

## [0.18.1] - 2026-03-16

### Changed

- **Skills**: Update skill icons for `/magic-pr`, `/magic-review`, and `/magic-resolve`

## [0.18.0] - 2026-03-16

### Added

- **Skills**: Add `/magic-pr` skill — push commits, create pull request and update Jira ticket
- **Skills**: Add `/magic-review` skill — perform code review on a PR (self-review or external)
- **Skills**: Add `/magic-resolve` skill — address review comments, amend commits and force-push
- **Desktop**: Add review workflow statuses (Reviewing, Changes requested, Approved) to agent status dropdown
- **Docs**: Add `/magic-pr`, `/magic-review`, `/magic-resolve` to landing page, terminal animations and documentation reference

### Changed

- **Skills**: `/magic-done` is now a post-merge finalization skill (verify merge, transition Jira to Done, clean up) — PR creation moved to `/magic-pr`
- **Skills**: `/magic-start` next steps now reference `/magic-pr` instead of `/magic-done`
- **Landing**: Section title updated from "4 skills" to "7 skills" with full workflow presentation
- **Landing**: Desktop mockup animation extended with 3 new phases (review, resolve, done)
- **Landing**: Skills manager mockup shows all 7 built-in skills
- **Install**: Install and uninstall scripts updated to handle 7 skills
- **Desktop**: Simplify close modal

## [0.17.5] - 2026-03-16

### Added

-

### Changed

-

### Fixed

-

## [0.17.4] - 2026-03-16

### Added

- **Desktop**: "No status" default option in the agent status dropdown — new agents now show a neutral "no status" badge that can be changed manually from the sidebar

### Changed

- **Desktop**: Include default metadata when creating a new agent so the status dropdown is visible immediately
- **Desktop**: Status options now use a `label` field decoupled from the stored `value`, with a renamed `getStatusOption` helper

## [0.17.3] - 2026-03-16

### Changed

- **Desktop**: Harmonize sidebar card backgrounds with Settings/Skills pages (`bg-white/[0.06]`, borderless cards, `rounded-xl`)
- **Desktop**: Style PR button with accent color matching the "What's New" button in Settings

## [0.17.2] - 2026-03-15

### Changed

- **Desktop**: Wrap "No uncommitted changes" placeholder in a card container matching the existing sidebar card style

### Fixed

- **Desktop**: Prevent terminal from scrolling up during TUI redraws
- **Skills**: Sync version number in `/magic-continue` and prevent future desync in release skill

## [0.17.1] - 2026-03-15

### Fixed

- **CI**: Pin macOS runner to `macos-14` to fix notarization build failure caused by `macos-latest` upgrading to macOS 15 (Sequoia) with incompatible `xcrun notarytool` output
- **CI**: Add `APPLE_TEAM_ID` guard in notarize script to prevent crashes when the variable is missing

## [0.17.0] - 2026-03-15

### Added

- **Skills**: Configurable base branch per repository — `/magic-start`, `/magic-done`, and `/magic-continue` now read `branches.development` from config and always ask the user to confirm the base branch (showing the configured default if available)
- **Desktop**: Display base branch alongside current branch in the agent sidebar — two side-by-side boxes with an arrow separator (e.g., `develop → feature/PROJ-123`)
- **Desktop**: `baseBranch` field in agent metadata, sent by skills via `/metadata` endpoint and displayed in the sidebar
- **Web UI**: "Branches" settings section in repository detail page with a "Development Branch" text input

### Changed

- **Skills**: `origin/main` is no longer hardcoded — all git commands (`git worktree add`, `git log`, `git diff`) now use `origin/$DEV_BRANCH`
- **Skills**: `/magic-done` Step 5.0 now prioritizes `$DEV_BRANCH` for PR base branch, with fallback to dynamic detection

## [0.16.2] - 2026-03-14

### Added

- **Desktop**: "What's New" button in Settings page (About section) — fetches release notes from GitHub API and opens the modal on demand
- **Desktop**: Hero image banner at the top of the What's New modal with close button overlaid

### Changed

- **Desktop**: What's New modal now filters release notes HTML to only show the "What's Changed" section (removes Installation, Full Changelog, etc.)
- **Desktop**: Removed "Release Notes" label from the modal for a cleaner design

## [0.16.1] - 2026-03-14

### Fixed

- **Desktop**: What's New modal not showing after auto-update — persist release notes from main process (`fs.writeFileSync`) instead of renderer `localStorage` which was destroyed before Chromium flushed LevelDB to disk

## [0.16.0] - 2026-03-14

### Added

- **Desktop**: Clickable status dropdown in the TicketHeader sidebar — click the status badge to open a dropdown and manually change the agent status (in progress, committed, ready for PR, PR created)

## [0.15.1] - 2026-03-14

### Fixed

- **CI**: Bump Node.js to 22 for desktop build jobs — `@electron/rebuild@4.0.3` requires Node >= 22.12.0, causing CI failures on typecheck and release workflows

## [0.15.0] - 2026-03-14

### Added

- **Desktop**: "What's New" modal displayed after an auto-update, showing the release notes from the GitHub Release. The modal appears once on restart after the update, and is dismissed permanently until the next update.
- **Desktop**: "What's New modal" option in the dev debug menu to preview the modal without triggering an update
- **Desktop**: `maxWidth` prop on the `Modal` component for flexible sizing

## [0.14.5] - 2026-03-14

### Fixed

- **Desktop**: Add Vite client type definitions (`vite-env.d.ts`) to fix `import.meta.env` TypeScript error in `UpdateOverlay`

## [0.14.4] - 2026-03-14

### Added

- **Desktop**: Add dev-only debug menu (Bug icon) with "Auto update steps" simulation and "Flood terminal" option for testing scroll behavior

### Changed

- **Desktop**: Restyle `UpdateOverlay` with glassmorphism (backdrop-blur, semi-transparent card, shadow), fixed card size, tada animation and confetti on download completion
- **Desktop**: Replace purple accent color with blue `#393BFF` for all update overlay states (spinner, download icon, check, progress bar, text)

### Fixed

- **Desktop**: Lock terminal scroll to bottom while a command is running — user can only scroll freely once the command finishes

## [0.14.3] - 2026-03-14

### Changed

- **Release**: Add post-release grep verification step in `/release` skill to automatically detect files not updated during a release

### Fixed

- **Release**: Align `magic-continue` (was v0.14.1) and `release` skill (was v0.11.2) versions that were missed during 0.14.2 release

## [0.14.2] - 2026-03-14

### Fixed

- **Desktop**: Prevent scroll from jumping back up during conversation in `TerminalPane` — auto-scroll now only fires when the user is near the bottom, matching the existing `TerminalView` behavior

## [0.14.1] - 2026-03-14

### Fixed

- **Desktop**: Update `BUILT_IN_SKILLS` and `SKILLS` constants to use `magic-*` prefix — skills were no longer recognized as built-in after the rename in v0.14.0, making them editable in the app

## [0.14.0] - 2026-03-14

### Changed

- **Skills**: Rename all commands from `/start`, `/continue`, `/commit`, `/done` to `/magic-start`, `/magic-continue`, `/magic-commit`, `/magic-done` for discoverability (type `/magic-` to find all commands)
- **Install**: Migration script removes old unprefixed skills before installing new `/magic-*` ones
- **Docs**: Updated documentation, landing page and README to reflect the `/magic-*` prefix

## [0.13.0] - 2026-03-13

### Added

- **Skill**: New `/continue` skill — resume work on an existing Jira ticket or GitHub issue (worktree detection, branch fallback, PR status)
- **Install**: `/continue` skill added to install and uninstall scripts
- **Desktop**: `/continue` added to built-in skills list and skills updater
- **Docs**: `/continue` skill card, usage example, i18n (EN/FR), and multi-repo section in landing page and documentation

### Changed

-

### Fixed

-

## [0.12.14] - 2026-03-13

### Added

- **Desktop**: Auto-detect Node.js version for script execution — injects nvm/fnm activation prefix when `.nvmrc` or `.node-version` is present

### Fixed

- **Desktop**: Remove job control noise (`[1] PID` / `[1] + done`) in script terminals by using a plain shell instead of login shell
- **Desktop**: Fix NVM version sort in `getShellPath()` — use semver comparison instead of alphabetical sort
- **Desktop**: Add Volta shims path (`~/.volta/bin`) to shell PATH resolution

## [0.12.13] - 2026-03-13

### Fixed

- **Desktop notifications**: Remove duplicate icon in macOS notifications — the `icon` parameter was adding a second image (right side) alongside the app bundle icon (left side), causing the old cached icon and the new icon to both appear

## [0.12.12] - 2026-03-13

### Fixed

- **Install**: Replace automatic DMG install (crash) with manual drag-and-drop flow — opens the DMG in Finder and asks the user to drag the app to Applications

## [0.12.11] - 2026-03-13

### Fixed

- **Install**: Strip quarantine attribute from downloaded DMG before mounting to fix silent `hdiutil attach` failure on macOS

## [0.12.10] - 2026-03-13

### Fixed

- **Install**: Auto-install app to `/Applications` without manual drag-and-drop from DMG

## [0.12.9] - 2026-03-13

### Fixed

- **Install**: Fix DMG filename mismatch — use hyphen (`Magic-Slash`) instead of space to match electron-builder output (`curl: (56) 404`)

## [0.12.8] - 2026-03-13

### Fixed

- **Install**: URL-encode space in DMG filename to fix desktop app download (`curl: (3) URL rejected: Malformed input`)

## [0.12.7] - 2026-03-13

### Fixed

- **Auto-update**: Remove safety net relaunch to prevent infinite update loop on unsigned-to-signed upgrade

## [0.12.6] - 2026-03-13

### Fixed

- **Auto-update**: Add macOS code signing and notarization to fix Squirrel.Mac update installation

## [0.12.5] - 2026-03-13

### Fixed

- **Auto-update**: Fix restart failure on macOS by force-closing windows before `quitAndInstall` and adding safety net relaunch

## [0.12.4] - 2026-03-13

### Changed

- **Languages configuration**: Remove global languages, move all language settings to repo-level only
  - Each repository now has its own `languages` object (`commit`, `pullRequest`, `jiraComment`, `discussion`)
  - New repositories are created with default languages (`en` for all)
  - Remove global "Default Languages" settings page from Web UI
  - Remove `PUT /api/languages` endpoint from Web UI server
  - Remove "Default (English/Francais)" option from repo language selects
  - Update `/start`, `/commit`, `/done` skills to read languages from repo config only

## [0.12.3] - 2026-03-13

### Added

- **Landing page**: Mobile/tablet blocker overlay displayed below 776px with pink background

### Fixed

- **Desktop notifications**: Use app icon instead of default Electron icon on macOS

## [0.12.2] - 2026-03-12

### Fixed

- **Desktop auto-update**: Clean up PTY terminals and status server before calling `quitAndInstall()` to prevent restart errors

## [0.12.1] - 2026-03-12

### Fixed

- **Desktop auto-update**: Add desktop build job to CI release workflow so `electron-updater` can find release assets (`.dmg`, `.zip`, `latest-mac.yml`)

## [0.12.0] - 2026-03-12

### Added

- **Desktop application**: Native Electron app for Magic Slash with integrated Claude Code terminals
  - Multiple concurrent Claude Code agents (up to 12) with state tracking (idle, working, waiting, completed, error)
  - Integrated xterm.js terminal emulation with terminal persistence across app restarts
  - Agent naming, metadata editing (title, description, ticket info), and resizable info sidebar
  - Multi-repository support with visual color coding per project
  - Built-in and custom skills management with creation, import/export, and sharing
  - Package manager auto-detection (npm, yarn, pnpm, bun) with one-click script execution
  - Automatic background app updates with progress tracking and auto-restart
  - Automatic skills synchronization between Claude Code and desktop app
  - Claude Code hooks integration for real-time terminal state and metadata tracking
  - Keyboard shortcuts for agent management (Cmd+N, Cmd+W, Cmd+B)
  - Multi-page UI (Terminals, Settings, Skills) with dark theme

## [0.11.2] - 2025-01-29

### Added

- **languages.discussion support**: `/commit` and `/done` now respect the `languages.discussion` setting
  - Configures the language Claude uses for interactions during commit and PR workflows
  - Supports both global and per-repository configuration

## [0.11.1] - 2025-01-29

### Changed

- **Commit settings enforcement**: `/commit` now strictly respects `coAuthor` and `includeTicketId` configuration
  - Co-author line only added when `coAuthor: true` is set
  - Ticket ID only included in commit message when `includeTicketId: true` is set

## [0.11.0] - 2025-01-29

### Added

- **Auto-permissions for /start**: Automatically adds required Bash permissions when starting a task
  - Permissions for creating worktrees, switching branches, and other git operations
  - Jira ticket status is now automatically updated to "In Progress" when starting a task
- **Local /release skill**: New internal skill for preparing Magic Slash releases
  - Updates version in all project files (package.json, README, docs, install script)
  - Manages CHANGELOG.md with proper formatting
  - Provides step-by-step release workflow guidance
- **Commit message preview in Web UI**: Shows a preview of the commit message format
  - Displays example commit message based on current settings (format, style, co-author, ticket ID)
  - Updates dynamically when settings change

## [0.10.0] - 2025-01-29

### Added

- **Web UI for configuration**: `magic-slash` now launches a local web interface instead of CLI menu
  - Modern dark theme with animated background orbs
  - Add, edit, and delete repositories with live path validation
  - Per-repository settings for commit, PR, and issues behavior
  - PR template detection and inline editing
  - Global language defaults configuration
- **Per-repository commit settings**:
  - `style`: Single-line or multi-line with body
  - `format`: Conventional, Angular, Gitmoji, or none
  - `coAuthor`: Add Claude as co-author in commits
  - `includeTicketId`: Add ticket ID from branch name in commit message
- **Per-repository PR settings**:
  - `autoLinkTickets`: Auto-link Jira/GitHub tickets in PR description (default: true)
- **Per-repository issues settings**:
  - `commentOnPR`: Add comment with PR link on Jira when creating PR (default: true)
- **PR template management**: View, edit, and generate PR templates directly from web UI

### Changed

- **`magic-slash` command**: Now launches web UI by default (use `--cli` for legacy terminal menu)
- **Skills updated**: `/commit` and `/done` now respect all per-repository settings
- **Default behaviors**: Auto-link tickets and comment on PR are now enabled by default

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

[0.30.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.30.0
[0.29.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.4
[0.29.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.3
[0.29.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.2
[0.29.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.1
[0.29.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.0
[0.28.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.4
[0.28.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.3
[0.28.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.2
[0.28.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.1
[0.28.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.0
[0.27.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.27.2
[0.27.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.27.1
[0.27.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.27.0
[0.26.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.26.0
[0.25.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.25.1
[0.25.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.25.0
[0.24.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.24.0
[0.23.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.23.0
[0.22.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.22.0
[0.21.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.21.1
[0.21.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.21.0
[0.20.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.20.2
[0.20.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.20.1
[0.20.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.20.0
[0.19.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.19.0
[0.18.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.3
[0.18.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.2
[0.18.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.1
[0.18.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.0
[0.17.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.5
[0.17.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.4
[0.17.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.3
[0.17.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.2
[0.17.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.1
[0.17.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.0
[0.16.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.16.2
[0.16.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.16.1
[0.16.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.16.0
[0.15.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.15.1
[0.15.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.15.0
[0.14.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.5
[0.14.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.4
[0.14.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.3
[0.14.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.2
[0.14.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.1
[0.14.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.0
[0.13.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.13.0
[0.12.14]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.14
[0.12.13]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.13
[0.12.12]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.12
[0.12.11]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.11
[0.12.10]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.10
[0.12.9]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.9
[0.12.8]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.8
[0.12.7]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.7
[0.12.6]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.6
[0.12.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.5
[0.12.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.4
[0.12.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.3
[0.12.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.2
[0.12.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.1
[0.12.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.0
[0.11.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.11.2
[0.11.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.11.1
[0.11.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.11.0
[0.10.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.10.0
[0.9.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.9.0
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
