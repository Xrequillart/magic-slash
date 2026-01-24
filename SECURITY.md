# Security Policy

## Supported Versions

We release patches for security vulnerabilities.
Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Magic Slash seriously.
If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the maintainers. You can find contact information in the repository.

Please include the following information in your report:

- **Type of vulnerability** (e.g., command injection, path traversal, credential exposure)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** and how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Communication**: We will keep you informed about our progress in addressing the vulnerability.
- **Timeline**: We aim to confirm the vulnerability and release a fix within 90 days.
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous).

### Safe Harbor

We consider security research conducted in accordance with this policy to be:

- Authorized concerning any applicable anti-hacking laws
- Authorized concerning any relevant anti-circumvention laws
- Exempt from restrictions in our Terms of Service that would interfere with conducting security research

We will not pursue legal action against researchers who:

- Engage in testing of systems/research without harming Magic Slash or its users
- Test on systems without affecting customers
- Test on systems without accessing, modifying, or deleting data belonging to others
- Contact us before publicly disclosing any vulnerabilities

## Security Considerations

### Credentials and Tokens

Magic Slash handles sensitive credentials:

- **GitHub Personal Access Token** - Stored in `~/.claude.json`
- **Atlassian OAuth** - Managed by MCP Atlassian server

**Best Practices:**

- Never commit credentials to version control
- Use tokens with minimal required permissions
- Rotate tokens regularly
- Review the permissions requested by the installation script

### File Permissions

The installation script creates configuration files. Ensure appropriate permissions:

```bash
# Configuration files should be readable only by the owner
chmod 600 ~/.config/magic-slash/config.json
chmod 600 ~/.claude.json
```

### Code Execution

Slash commands execute shell commands. Be cautious when:

- Modifying command files in `~/.claude/commands/`
- Running the installation script from untrusted sources
- Using custom forks of this repository

### Verification

Always verify you're installing from the official repository:

```bash
# Verify the install script before running
curl -fsSL https://magic-slash.io/install.sh | less

# Or clone and inspect first
git clone https://github.com/xrequillart/magic-slash.git
less magic-slash/install/install.sh
```

## Known Security Limitations

1. **Local Storage**: Configuration is stored in plain text files.
   Anyone with access to your home directory can read these files.

2. **Command Execution**: Slash commands execute shell commands in your environment.
   Malicious modifications to command files could execute arbitrary code.

3. **MCP Servers**: The GitHub and Atlassian MCP servers have access to your credentials
   and can make API calls on your behalf.

## Security Updates

Security updates will be announced through:

- GitHub Security Advisories
- Release notes in CHANGELOG.md
- GitHub releases

We recommend watching this repository for security notifications.
