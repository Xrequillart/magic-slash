# Magic Slash

7 skills for Claude Code that automate the entire development cycle with Jira and GitHub: `/magic:start`, `/magic:continue`, `/magic:commit`, `/magic:pr`, `/magic:review`, `/magic:resolve`, `/magic:done`.

## Project Structure

```text
magic-slash/
├── skills/            # Claude Code skills (7 skills) - SKILL.md files
│   ├── magic-start/   #   Start a task from a Jira ticket or GitHub issue
│   ├── magic-continue/#   Resume work on an existing ticket
│   ├── magic-commit/  #   Create atomic commits with conventional messages
│   ├── magic-pr/      #   Push, create PR and update Jira
│   ├── magic-review/  #   Review a Pull Request (self or external)
│   ├── magic-resolve/ #   Address review comments and force-push fixes
│   ├── magic-done/    #   Finalize after PR merge (transition Jira to Done)
│   └── evals/         #   Trigger evals: eval_set.json (30 queries) + results.json
├── desktop/           # Native desktop app (Electron + React + TypeScript)
│   ├── src/main/      #   Electron main process (config, IPC, PTY, hooks, updater)
│   ├── src/preload/   #   Secure bridge main <-> renderer
│   └── src/renderer/  #   React UI (pages, components, hooks, Zustand store)
├── docs/              # Static landing page (GitHub Pages)
├── install/           # Installation scripts and CLI (bash)
│   ├── install.sh     #   Setup Atlassian/GitHub MCP, repos, skills, CLI
│   ├── uninstall.sh   #   Full uninstallation
│   └── magic-slash    #   CLI wrapper
└── .github/           # CI/CD workflows and issue templates
```

## Tech Stack

| Component | Technologies |
|-----------|-------------|
| Root | Node.js 20+, ESLint, commitlint, Vitest |
| Desktop | Electron 28, React 18, TypeScript, Tailwind CSS, Zustand, xterm.js + node-pty, Vite, electron-builder |
| Skills | Markdown (SKILL.md) |
| Docs | Static HTML/CSS/JS, GitHub Pages |
| Install | Bash |

## Useful Commands

```bash
# Linting
npm run lint          # All linters (yaml + js)
npm run lint:js       # ESLint only (desktop/src/)

# Tests
npm test              # Vitest (run)
npm run test:watch    # Vitest (watch)

# Desktop
npm run desktop:install  # Install desktop dependencies
npm run desktop          # Start in dev mode
npm run desktop:build    # Production build
npm run desktop:package  # Package for macOS (.dmg, .zip)
```

## Conventions

- **Commits**: conventional commits (commitlint), format `type(scope): subject`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`
  - Scopes: `start`, `continue`, `commit`, `pr`, `review`, `resolve`, `done`, `install`, `docs`, `deps`, `ci`, `readme`, `landing`, `slides`, `community`, `desktop`
  - Subject: lower-case, no trailing period, max 100 characters
- **Node**: v20 (see `.nvmrc`)
- **Formatting**: UTF-8, LF, 2-space indentation (see `.editorconfig`)

## User Configuration

Config file: `~/.config/magic-slash/config.json`

Contains configured repositories, each with: path, keywords, languages (commit/PR/Jira), commit format (angular), and PR/issues options.
