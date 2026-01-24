# Contributing to Magic Slash

Thank you for considering contributing to Magic Slash!
It's people like you that make Magic Slash such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How Can I Contribute?](#how-can-i-contribute)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.
Please report unacceptable behavior to the maintainers.

## Getting Started

Magic Slash is a set of slash commands for Claude Code that automate the development cycle.
Before contributing, make sure you understand:

- The project structure (see [README.md](README.md#project-structure))
- How slash commands work with Claude Code
- The workflow described in [FLOW.md](FLOW.md)

## Development Setup

### Prerequisites

- [Claude Code](https://claude.ai/download)
- Node.js (for linting tools)
- Git
- jq (for JSON processing)
- ShellCheck (for shell script linting)

### Installation for Development

1. Fork the repository on GitHub

2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/magic-slash.git
   cd magic-slash
   ```

3. Add the upstream repository:

   ```bash
   git remote add upstream https://github.com/xrequillart/magic-slash.git
   ```

4. Install development dependencies:

   ```bash
   npm install
   ```

5. Test the installation script locally:

   ```bash
   # Run in dry-run mode or test in a sandbox environment
   bash install/install.sh
   ```

### Testing Your Changes

- **Shell scripts**: Run ShellCheck on all `.sh` files

  ```bash
  shellcheck install/*.sh
  ```

- **Markdown files**: Run markdownlint

  ```bash
  npm run lint:md
  ```

- **YAML files**: Run yamllint

  ```bash
  npm run lint:yaml
  ```

- **All linters**:

  ```bash
  npm run lint
  ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.
When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (command outputs, screenshots)
- **Describe the behavior you observed and what you expected**
- **Include your environment** (OS, Claude Code version, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. **Create an issue first** - For significant changes, discuss them in an issue before starting work
2. **One feature per PR** - Keep pull requests focused on a single feature or fix
3. **Update documentation** - If your changes affect usage, update the relevant docs
4. **Add tests if applicable** - Ensure your changes don't break existing functionality

## Style Guidelines

### Shell Scripts

- Use `#!/bin/bash` shebang
- Always use `set -e` for error handling
- Quote variables: `"$VAR"` not `$VAR`
- Use lowercase for local variables, UPPERCASE for environment variables
- Add comments for complex logic
- Follow [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html)

### Markdown Files

- Use ATX-style headers (`#` not underlines)
- One sentence per line for easier diffs
- Use fenced code blocks with language identifiers
- Keep lines under 120 characters when possible
- Use reference-style links for repeated URLs

### Slash Commands (.md files in commands/)

- Include frontmatter with `description` and `allowed-tools`
- Use clear step-by-step instructions
- Include example commands and expected outputs
- Document any prerequisites or assumptions

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting (no code change)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance, dependencies

### Examples

```text
feat(start): add support for Confluence pages

fix(install): handle spaces in repository paths

docs(readme): add troubleshooting section

chore(deps): update shellcheck action to v2
```

## Pull Request Process

1. **Update your fork**:

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit them following the commit message guidelines

4. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** against the `develop` branch

6. **Fill out the PR template** completely

7. **Wait for review** - Maintainers will review your PR and may request changes

8. **Address feedback** - Make any requested changes and push new commits

9. **Merge** - Once approved, a maintainer will merge your PR

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code follows the style guidelines
- [ ] All linters pass (`npm run lint`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventional commits
- [ ] PR description clearly explains the changes
- [ ] Related issues are linked

## Questions?

Feel free to open an issue with the "question" label if you have any questions about contributing.

Thank you for contributing to Magic Slash!
