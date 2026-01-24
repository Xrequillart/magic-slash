# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Community files for open source (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md)
- GitHub issue templates for bug reports and feature requests
- Pull request template
- CI/CD workflows with GitHub Actions
- Linting configuration (markdownlint, yamllint, editorconfig)
- Dependabot configuration for automated dependency updates

### Changed

- Updated README.md with badges and contributing section

## [1.0.0] - 2026-01-23

### Added

- Initial release of Magic Slash
- `/start` command - Start a task from a Jira ticket
  - Fetches ticket details via MCP Atlassian
  - Analyzes scope (BACKEND/FRONTEND/BOTH)
  - Creates Git worktrees automatically
  - Generates contextual agent prompt
- `/commit` command - Create atomic commits
  - Stages all changes
  - Analyzes diff
  - Generates conventional commit message
  - Creates the commit
- `/done` command - Finalize development tasks
  - Pushes branch to origin
  - Creates Pull Request via MCP GitHub
  - Updates Jira ticket status
  - Adds PR link as comment
- Installation script with interactive setup
  - MCP Atlassian configuration (OAuth)
  - MCP GitHub configuration (PAT)
  - Repository paths configuration
- Uninstallation script
- Documentation
  - README with usage examples
  - FLOW.md workflow diagram
  - PLAN.md implementation details
- Landing page with logo and documentation
- Reveal.js presentation slides
- MIT License

[Unreleased]: https://github.com/xrequillart/magic-slash/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/xrequillart/magic-slash/releases/tag/v1.0.0
