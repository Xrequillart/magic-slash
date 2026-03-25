---
name: audit
description: magic-slash - Scan documentation files for inconsistencies against sources of truth (package.json, filesystem, .editorconfig, .nvmrc) and fix them one by one with human validation. Triggers on "audit", "check docs", "check consistency", "verify docs", "scan inconsistencies".
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, AskUserQuestion
---

# magic-slash v0.27.0 - /audit

You are an assistant that audits the magic-slash project documentation for inconsistencies against the sources of truth and fixes them interactively.

This skill is only for internal development of the Magic Slash project, not for distribution.

## Overview

Scan all documentation files, detect inconsistencies against the sources of truth, present each one to the user for validation, and apply fixes directly when approved.

## Step 1: Collect sources of truth

Read and store these as the ground truth:

### 1.1: Version

```bash
cat package.json | jq -r '.version'
```

Store as `SOURCE_VERSION`.

### 1.2: Skills list

List the skill directories:

```bash
ls -d skills/magic-*/
```

Store the list of skill names (e.g. `magic-start`, `magic-continue`, ...). This is the authoritative list of skills.

### 1.3: npm scripts

```bash
cat package.json | jq -r '.scripts | keys[]'
```

Store as `SOURCE_SCRIPTS` — the authoritative list of available npm commands.

### 1.4: Node version

```bash
cat .nvmrc
```

Store as `SOURCE_NODE_VERSION`.

### 1.5: Formatting conventions

```bash
cat .editorconfig
```

Store relevant values: `indent_style`, `indent_size`, `end_of_line`, `charset`.

### 1.6: Tech stack versions

Read `package.json` and `desktop/package.json` to extract actual dependency versions:
- Electron version from `desktop/package.json`
- React version from `desktop/package.json`
- Express version from `web-ui/package.json`
- Vitest (from root `package.json`)

### 1.7: Project tree structure

```bash
find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/out/*' | head -500
```

Store as `SOURCE_TREE` — the actual filesystem structure.

## Step 2: Scan documentation files

Scan the following files for inconsistencies against the sources of truth:

### Files to scan

- `README.md`
- `CLAUDE.md`
- `docs/index.html`
- `docs/documentation.html`
- `install/install.sh`
- `.github/` (all markdown files: issue templates, PR templates, workflow comments)
- `web-ui/public/index.html` (if it displays project info)
- `desktop/src/renderer/components/Sidebar.tsx` (version display)

### Types of inconsistencies to detect

For each file, check for ALL of the following inconsistency types:

#### A. Version mismatches

Compare any version string found in doc files against `SOURCE_VERSION`. Look for patterns like:
- `"version": "X.Y.Z"`
- `vX.Y.Z`
- `version X.Y.Z`
- Version numbers in badge URLs, download links, install commands

#### B. Skills list mismatches

Compare any list of skills mentioned in docs against the actual `skills/magic-*/` directories. Check:
- Number of skills mentioned (e.g. "7 skills" vs actual count)
- Skill names listed
- Missing or extra skills in documentation

#### C. npm scripts mismatches

Compare any `npm run` commands documented against `SOURCE_SCRIPTS`. Check:
- Commands that are documented but don't exist
- Commands that exist but are documented with wrong syntax

#### D. Project structure mismatches

Compare any directory tree or file structure shown in docs against `SOURCE_TREE`. Check:
- Directories that are listed but don't exist
- Directories that exist but are missing from documented trees
- Wrong nesting or hierarchy

#### E. Tech stack version mismatches

Compare any technology versions mentioned (Node.js, Electron, React, Express, etc.) against actual versions from package.json files.

#### F. Convention mismatches

Compare any documented conventions (commit types, scopes, formatting rules) against:
- Actual `.editorconfig` values
- Actual `.nvmrc` value
- Actual commit scope usage (check if documented scopes cover existing directories)

#### G. Description/count mismatches

Check for factual inconsistencies like:
- `package.json` description saying "3 skills" when there are 7
- Any hardcoded counts that don't match reality

#### H. Broken internal references

Check for references to files or paths that don't exist in the project.

## Step 3: Collect and deduplicate

After scanning all files, collect all inconsistencies into a list. Each inconsistency should contain:
- **File**: the file path where the inconsistency was found
- **Line**: approximate line number
- **Type**: one of (Version, Skills list, npm scripts, Project structure, Tech stack, Convention, Description, Broken reference)
- **Current value**: what the doc currently says
- **Expected value**: what it should say according to the source of truth
- **Fix description**: a human-readable explanation

Deduplicate: if the same logical inconsistency appears in multiple places in the same file, group them.

Store the total count as `TOTAL_COUNT`.

## Step 4: Interactive fix loop

If no inconsistencies are found, display:

```
No inconsistencies found! All documentation is in sync with sources of truth.
```

And stop.

Otherwise, present each inconsistency one by one using `AskUserQuestion`.

Initialize counters:
- `FIXED = 0`
- `SKIPPED = 0`
- `IGNORED_TYPES = []` (list of types the user chose to ignore)

For each inconsistency (index `i` starting at 1):

### 4.1: Check if type is ignored

If the inconsistency's type is in `IGNORED_TYPES`, increment `SKIPPED` and move to the next one.

### 4.2: Present to the user

Use `AskUserQuestion` with this format:

```
Inconsistency ({i}/{TOTAL_COUNT}) — [{Type}]

File: `{file_path}` (line ~{line_number})
Current: {current_value}
Expected: {expected_value}

-> {Fix description}
```

Options:
1. **"Fix"** — Apply the correction
2. **"Skip"** — Skip this inconsistency
3. **"Ignore all [{Type}]"** — Skip all remaining inconsistencies of this type

### 4.3: Apply action

- If **Fix**: edit the file to apply the correction. Use the `Edit` tool to make the change. Increment `FIXED`.
- If **Skip**: do nothing. Increment `SKIPPED`.
- If **Ignore all [{Type}]**: add the type to `IGNORED_TYPES`. Increment `SKIPPED`. All subsequent inconsistencies of this type will be automatically skipped (step 4.1).

## Step 5: Final summary

After processing all inconsistencies, display a summary:

```
Audit complete!

  {TOTAL_COUNT} inconsistencies detected
  {FIXED} fixed
  {SKIPPED} skipped
  {len(IGNORED_TYPES)} types ignored: {comma-separated list of ignored types, or "none"}

Files modified:
  - {list of files that were actually edited, with number of fixes per file}
```

If any fixes were applied, remind the user:

```
Review the changes:
  git diff

When satisfied, commit them:
  git add -A && git commit -m "docs: fix documentation inconsistencies"
```

## Error handling

### File not found

If a file from the scan list doesn't exist:
- Skip it silently
- Do NOT report it as an inconsistency

### Parse errors

If a file cannot be parsed or a pattern cannot be matched:
- Log a warning: `Warning: Could not parse {file_path} for {check_type}`
- Continue with the next check

### Edit failures

If an edit fails:
- Display the error to the user
- Continue with the next inconsistency
- Mention the failure in the final summary
