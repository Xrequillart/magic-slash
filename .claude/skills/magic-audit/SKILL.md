---
name: magic:audit
description: "magic-slash - This skill should be used when the user says \"audit\", \"audit docs\", \"auditer la doc\", \"check docs\", \"verifier la doc\", \"docs consistency\", \"coherence docs\", \"pre-release check\", \"verification avant release\", \"are the docs up to date\", \"est-ce que la doc est a jour\", or indicates they want to verify that the documentation pages match the current state of the desktop app and skills."
argument-hint: <optional: specific page or area to audit>
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Agent, AskUserQuestion, mcp__github__create_issue, mcp__github__search_issues
---

# magic-slash - /audit

Tu es un auditeur qui verifie que les pages de documentation statiques (`docs/`) refletent fidelement l'etat actuel de l'application desktop et des skills.

L'objectif est de detecter les divergences entre ce que les docs disent et ce que le code fait reellement, avant qu'elles ne soient publiees dans une release.

Suis chaque etape dans l'ordre.

## References

- `references/messages.md` — Tous les messages bilingues (MSG_*). Lis la section pertinente selon la langue.
- `references/checklist.md` — La checklist detaillee des points d'audit par page.

## Step 0: Configuration

### 0.1: Check config file exists

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
[ ! -f "$CONFIG_FILE" ] && echo "MISSING" || echo "OK"
```

If missing, display `MSG_CONFIG_ERROR` and stop.

### 0.2: Determine language

Read `.repositories.<name>.languages.discussion` from config for the current repo (match by checking `pwd` against repo paths). Default: `"en"`.

```bash
CONFIG_FILE=~/.config/magic-slash/config.json
CURRENT_DIR=$(pwd)
jq -r --arg dir "$CURRENT_DIR" '
  .repositories | to_entries[] |
  select(.value.path == $dir or ($dir | startswith(.value.path)))
  | .value.languages.discussion // "en"
' "$CONFIG_FILE" | head -1
```

If no match, default to `"en"`.

## Step 1: Determine audit scope

### 1.1: Get input

If `$ARGUMENTS` is provided, use it to narrow the audit scope (e.g., "desktop", "skills", "documentation").

If not provided, audit all pages.

Possible scopes:
- **all** (default) — Audit all pages
- **skills** — Only `docs/skills.html` vs `skills/` directory
- **desktop** — Only `docs/desktop.html` vs `desktop/src/`
- **documentation** — Only `docs/documentation.html` vs install scripts, config, and skills
- **landing** — Only `docs/index.html` vs general project state
- **version** — Only version number consistency across all files

Display `MSG_AUDIT_START` with the determined scope.

## Step 2: Collect sources of truth

This step collects the actual state of the codebase that docs should reflect. Use targeted commands — no Explore agents needed here since the data is deterministic.

### 2.1: Collect skills truth

Extract the list of skills and their metadata directly:

```bash
echo "=== Skills ==="
for d in skills/*/; do
  SKILL_NAME=$(grep -E '^name:' "$d/SKILL.md" | head -1 | sed 's/^name: *//')
  echo "  $SKILL_NAME ($d)"
done
echo "=== Count ==="
ls -d skills/*/SKILL.md | wc -l | tr -d ' '
```

For each skill, also extract the step headers (major features) to compare against docs:

```bash
for d in skills/*/; do
  echo "=== $(basename $d) ==="
  grep -E '^## Step [0-9]+' "$d/SKILL.md" || true
done
```

Store results as `$SKILLS_TRUTH`.

### 2.2: Collect desktop app truth

Extract the list of pages, components, and main process modules:

```bash
echo "=== Pages ==="
ls desktop/src/renderer/pages/
echo "=== Components ==="
ls desktop/src/renderer/components/
echo "=== Main process ==="
ls desktop/src/main/
```

Also extract the desktop dependencies for tech stack verification:

```bash
jq '.dependencies, .devDependencies' desktop/package.json
```

Build the desktop feature map. Each user-facing feature in `desktop.html` is a `<section class="dsk-section dsk-{id}">`. Extract them:

```bash
grep -Eo 'dsk-section dsk-[a-z]+' docs/desktop.html | sed 's/dsk-section dsk-//' | sort -u
```

The mapping between `desktop.html` feature sections and their code sources is:

| Feature section | Code source (existence proof) |
|-----------------|-------------------------------|
| `split` | `desktop/src/renderer/pages/Terminals` + split-mode logic |
| `tracking` | `desktop/src/renderer/components/Sidebar.tsx` + agent state |
| `context` | `desktop/src/renderer/components/AgentInfoSidebar.tsx` |
| `keyboard` | keyboard shortcut handling in renderer |
| `budget` | token/budget tracking in components or pages |
| `runner` | script runner logic in renderer or main |
| `notifs` | `desktop/src/main/` notification logic or Toast component |
| `updates` | `desktop/src/main/updater.ts` |
| `config` | `desktop/src/renderer/pages/Config` |

Store results as `$DESKTOP_TRUTH`.

### 2.3: Collect install/config truth

```bash
echo "=== Version ==="
jq -r .version package.json
echo "=== Install prerequisites ==="
grep -E '(check_|require|command -v)' install/install.sh | head -20
```

Store as `$CONFIG_TRUTH`.

Note: Steps 2.1 and 2.2 can run in parallel (multiple Bash calls in the same message).

## Step 3: Audit each page

For each page in scope, compare its claims against the sources of truth collected in Step 2.

Read `references/checklist.md` to get the detailed audit checklist.

**Important — large HTML files**: `desktop.html` (~2300 lines) and `documentation.html` (~2900 lines) exceed the Read tool's default 2000-line limit. For these files, use `Grep` for targeted searches instead of reading the whole file. When you need to read a section, use `Read` with `offset` and `limit` parameters to read specific chunks.

### 3.1: Audit `docs/skills.html`

Skip if scope is not `all` or `skills`.

Use `Grep` to extract the skills listed in the page:

```bash
grep -Eo '/magic:[a-z]+' docs/skills.html | sort -u
```

Compare against the actual skills from Step 2.1. Then use `Grep` to check image references:

```bash
grep -Eo 'src="[^"]*\.(png|jpg|svg|gif)"' docs/skills.html | sed 's/src="//;s/"$//'
```

Verify each image exists in `docs/`.

Check each item from the checklist:
- [ ] All 7 skills are listed (no missing, no extra)
- [ ] Each skill name matches the actual skill name in `skills/*/SKILL.md`
- [ ] Each skill description is consistent with what the SKILL.md says
- [ ] Feature highlights for each skill match the actual steps in the SKILL.md
- [ ] Screenshots/images referenced exist in `docs/` directory
- [ ] EN and FR translations describe the same skills (see Step 3.7)

For each finding, record: `{status, page, check, details, line_number}` where status is `OK`, `WARNING`, or `ERROR`.

### 3.2: Audit `docs/desktop.html`

Skip if scope is not `all` or `desktop`.

This file is ~2300 lines. Do NOT read the whole file. Use targeted commands.

#### 3.2a: Feature-by-feature cross-check (docs -> code)

For each feature section listed in `desktop.html`, verify the corresponding code still exists. This catches features that were removed from the app but are still advertised in the docs.

Extract the feature sections from the HTML:

```bash
grep -Eo 'dsk-section dsk-[a-z]+' docs/desktop.html | sed 's/dsk-section dsk-//' | sort -u
```

Then for each feature, check its code source exists. Use the mapping from Step 2.2. For each feature, run a targeted check:

```bash
# split -> Terminals page must exist
ls desktop/src/renderer/pages/Terminals 2>/dev/null && echo "split: OK" || echo "split: MISSING"

# tracking -> Sidebar with agent state
grep -l 'status\|agent\|tracking' desktop/src/renderer/components/Sidebar.tsx > /dev/null 2>&1 && echo "tracking: OK" || echo "tracking: MISSING"

# context -> AgentInfoSidebar
ls desktop/src/renderer/components/AgentInfoSidebar.tsx 2>/dev/null && echo "context: OK" || echo "context: MISSING"

# keyboard -> keyboard/shortcut handling
grep -rl 'keyboard\|shortcut\|hotkey\|keydown' desktop/src/renderer/ > /dev/null 2>&1 && echo "keyboard: OK" || echo "keyboard: MISSING"

# budget -> token/budget tracking
grep -rl 'budget\|token.*usage\|token.*count' desktop/src/ > /dev/null 2>&1 && echo "budget: OK" || echo "budget: MISSING"

# runner -> script runner
grep -rl 'runner\|runScript\|script.*run' desktop/src/ > /dev/null 2>&1 && echo "runner: OK" || echo "runner: MISSING"

# notifs -> notifications
grep -rl 'notification\|Notification\|toast' desktop/src/ > /dev/null 2>&1 && echo "notifs: OK" || echo "notifs: MISSING"

# updates -> updater
ls desktop/src/main/updater.ts 2>/dev/null && echo "updates: OK" || echo "updates: MISSING"

# config -> Config page
ls desktop/src/renderer/pages/Config 2>/dev/null && echo "config: OK" || echo "config: MISSING"
```

Any "MISSING" result is an **ERROR** — the docs advertise a feature that no longer exists in the code.

#### 3.2b: Reverse cross-check (code -> docs)

Check if there are major desktop features in the code that are NOT mentioned in `desktop.html`. This catches new features that were added to the app but never documented.

Compare the actual pages and key components against what `desktop.html` covers:

```bash
echo "=== Pages in code ==="
ls desktop/src/renderer/pages/
echo "=== Feature sections in docs ==="
grep -Eo 'dsk-section dsk-[a-z]+' docs/desktop.html | sed 's/dsk-section dsk-//' | sort -u
```

Cross-reference manually:
- `Terminals` page -> covered by `split` section? 
- `Config` page -> covered by `config` section?
- `Skills` page -> covered anywhere?
- `QuickLaunch` page -> covered anywhere?
- `TrayPopover` page -> covered anywhere (tray integration)?

Also check for key components that represent user-facing features:
- `UpdateOverlay.tsx` -> covered by `updates` section?
- `AgentInfoSidebar.tsx` -> covered by `context` section?
- `WhatsNewModal.tsx` -> covered anywhere?
- `Toast.tsx` -> covered by `notifs` section?

If a page or major component exists in the code but has no corresponding section in `desktop.html`, flag it as **WARNING** (new feature not yet documented).

#### 3.2c: Other checks

- [ ] Screenshots referenced exist in `docs/` directory
- [ ] Technical details (Electron, React, etc.) match actual dependencies in `desktop/package.json`
- [ ] EN and FR translations describe the same features (see Step 3.7)

### 3.3: Audit `docs/documentation.html`

Skip if scope is not `all` or `documentation`.

This file is ~2900 lines. Do NOT read the whole file. Use `Grep` for targeted checks.

#### 3.3a: Skills reference completeness

```bash
grep -Eo '/magic:[a-z]+' docs/documentation.html | sort -u
```

Compare against the 7 skills from Step 2.1. Flag missing or extra skills as ERROR.

#### 3.3b: Version consistency

```bash
grep -Eo '"version": *"[^"]+"' docs/documentation.html
```

Compare against `package.json`. Flag mismatches as ERROR.

#### 3.3c: Prerequisites check

```bash
# What install.sh actually checks
grep -E 'check_command' install/install.sh | grep -v '^#' | grep -v 'check_command()'
# What docs say is required
grep -Eo '(Claude Code|Node\.js|Git |jq|gh )' docs/documentation.html | sort -u
```

Compare the two lists. Flag discrepancies as ERROR.

#### 3.3d: Desktop section — feature coverage (docs -> code)

The "Desktop App" section (`id="desktop"`) documents desktop features. Extract the features documented there:

```bash
# Extract h3 headings inside the desktop section
awk '/<div class="doc-section" id="desktop">/,/<div class="doc-section"/' docs/documentation.html | grep -Eo '<h3>[^<]+</h3>' | sed 's/<[^>]*>//g'
```

Compare against actual desktop features from Step 2.2. Each major desktop feature should have documentation coverage somewhere in `documentation.html` (either in the "Desktop App" section or another relevant section like "Updates").

The feature-to-documentation mapping:

| Desktop feature | Expected documentation | Where to check |
|----------------|----------------------|----------------|
| Split view / terminals | Documented in desktop section | `id="desktop"` |
| Agent tracking | Documented in desktop section | `id="desktop"` |
| Agent info sidebar / context panel | Documented in desktop section | `id="desktop"` |
| Keyboard shortcuts | Documented anywhere | grep for `keyboard\|shortcut` |
| Token budget | Documented anywhere | grep for `budget\|token` |
| Script runner | Documented anywhere | grep for `runner\|script.*run` |
| Notifications | Documented anywhere | grep for `notification` |
| Auto-updates | Documented in updates section | `id="updates"` |
| Configuration UI | Documented in config section | `id="configuration"` |
| Quick Launch / Cmd+K | Documented anywhere | grep for `quick.*launch\|command.*palette\|cmd.*k\|spotlight` |
| Tray integration / menu bar | Documented anywhere | grep for `tray\|menu.*bar` |
| What's New modal | Documented anywhere | grep for `what.*new\|release.*note` |
| Skills browsing page | Documented anywhere | grep for `skills.*page\|skills.*browse\|skills.*manage` |

Run targeted searches:

```bash
echo "=== Desktop section features ==="
awk '/<div class="doc-section" id="desktop">/,/<div class="doc-section"/' docs/documentation.html | grep -Eo '<h3>[^<]+</h3>' | sed 's/<[^>]*>//g'

echo "=== Feature coverage ==="
grep -qi 'split\|side by side\|two agents' docs/documentation.html && echo "split: OK" || echo "split: MISSING"
grep -qi 'tracking\|agent.*status\|real.time.*status' docs/documentation.html && echo "tracking: OK" || echo "tracking: MISSING"
grep -qi 'context.*panel\|agent.*info\|sidebar.*ticket' docs/documentation.html && echo "context: OK" || echo "context: MISSING"
grep -qi 'keyboard\|shortcut' docs/documentation.html && echo "keyboard: OK" || echo "keyboard: MISSING"
grep -qi 'budget\|token.*usage' docs/documentation.html && echo "budget: OK" || echo "budget: MISSING"
grep -qi 'runner\|script.*run\|package.*json.*script' docs/documentation.html && echo "runner: OK" || echo "runner: MISSING"
grep -qi 'notification' docs/documentation.html && echo "notifications: OK" || echo "notifications: MISSING"
grep -qi 'auto.update\|electron.updater' docs/documentation.html && echo "auto-update: OK" || echo "auto-update: MISSING"
grep -qi 'quick.*launch\|command.*palette\|cmd.*k\|spotlight' docs/documentation.html && echo "quick-launch: OK" || echo "quick-launch: MISSING"
grep -qi 'tray\|menu.*bar' docs/documentation.html && echo "tray: OK" || echo "tray: MISSING"
grep -qi "what.*new\|release.*note.*modal" docs/documentation.html && echo "whats-new: OK" || echo "whats-new: MISSING"
grep -qi 'skills.*page\|skills.*browse\|manage.*skill\|skill.*manager' docs/documentation.html && echo "skills-page: OK" || echo "skills-page: MISSING"
```

Any "MISSING" means a desktop feature exists in the code but has no documentation at all — flag as **WARNING** (undocumented feature).

#### 3.3e: Desktop section — reverse check (code -> docs)

Verify that features documented in the desktop section still exist in the code. This catches documentation about features that were removed.

For each `<h3>` heading in the desktop section, check the corresponding code source:

```bash
# Extract documented desktop features and check each one
awk '/<div class="doc-section" id="desktop">/,/<div class="doc-section"/' docs/documentation.html | grep -Eo '<h3>[^<]+</h3>' | sed 's/<[^>]*>//g' | while read feature; do
  case "$feature" in
    *[Tt]erminal*) ls desktop/src/renderer/pages/Terminals > /dev/null 2>&1 && echo "OK: $feature" || echo "MISSING: $feature" ;;
    *[Tt]racking*) grep -ql 'status\|agent' desktop/src/renderer/components/Sidebar.tsx > /dev/null 2>&1 && echo "OK: $feature" || echo "MISSING: $feature" ;;
    *[Rr]epo*) grep -ql 'repo\|repository' desktop/src/renderer/components/Sidebar.tsx > /dev/null 2>&1 && echo "OK: $feature" || echo "MISSING: $feature" ;;
    *) echo "CHECK: $feature (verify manually)" ;;
  esac
done
```

Any "MISSING" is an **ERROR** — docs describe a feature that no longer exists.

#### 3.3f: Updates section completeness

The updates section (`id="updates"`) should cover the full update lifecycle. Check:

```bash
awk '/<div class="doc-section" id="updates">/,/<div class="doc-section"/' docs/documentation.html | grep -Eo '<h3>[^<]+</h3>' | sed 's/<[^>]*>//g'
```

Expected sub-sections:
- Desktop app updates (electron-updater flow)
- Skills auto-update (skills-updater)
- Manual update check

Verify each maps to actual code:

```bash
ls desktop/src/main/updater.ts > /dev/null 2>&1 && echo "updater.ts: OK" || echo "updater.ts: MISSING"
ls desktop/src/main/skills-updater.ts > /dev/null 2>&1 && echo "skills-updater.ts: OK" || echo "skills-updater.ts: MISSING"
```

#### 3.3g: Other checks

- [ ] Configuration format matches the actual config structure
- [ ] CLI commands documented match actual commands in `install/magic-slash`
- [ ] Troubleshooting section references real error scenarios

### 3.4: Audit `docs/index.html`

Skip if scope is not `all` or `landing`.

Read `docs/index.html` with `Read` (this file is ~920 lines, fits in default limit).

Check each item from the checklist:
- [ ] Number of skills mentioned matches actual count (7)
- [ ] Feature highlights are consistent with actual capabilities
- [ ] Links to other pages (desktop, skills, docs) are valid
- [ ] Screenshots/images referenced exist

### 3.5: Audit version consistency

Skip if scope is not `all` or `version`.

Check version number in all files that should contain it. This script uses macOS-compatible commands (no `grep -P`):

```bash
ROOT_VERSION=$(jq -r .version package.json)
echo "Reference version: $ROOT_VERSION"
echo "---"
echo "desktop/package.json: $(jq -r .version desktop/package.json)"
echo "README.md: $(grep -Eo '"version": *"[^"]+"' README.md | head -1 | sed 's/.*"version": *"//;s/"//')"
echo "docs/documentation.html count: $(grep -c "\"version\": \"$ROOT_VERSION\"" docs/documentation.html)"
echo "install.sh: $(grep -Eo 'v[0-9]+\.[0-9]+\.[0-9]+' install/install.sh | head -1)"
echo "Sidebar.tsx: $(grep -Eo 'v[0-9]+\.[0-9]+\.[0-9]+' desktop/src/renderer/components/Sidebar.tsx | head -1)"
for f in skills/*/SKILL.md; do
  V=$(grep -Eo 'v[0-9]+\.[0-9]+\.[0-9]+' "$f" | head -1)
  echo "$f: $V"
done
```

Flag any file where the version differs from `package.json`.

### 3.6: Audit images and links

Check that all images referenced in HTML files exist. Uses macOS-compatible `grep -Eo`:

```bash
for page in docs/index.html docs/skills.html docs/desktop.html docs/documentation.html docs/story.html; do
  echo "=== $page ==="
  grep -Eo 'src="[^"]+\.(png|jpg|svg|gif)"' "$page" | sed 's/src="//;s/"$//' | while read img; do
    if [ -f "docs/$img" ] || [ -f "$img" ]; then
      echo "  OK  $img"
    else
      echo "  MISSING  $img"
    fi
  done
done
```

### 3.7: Audit i18n consistency

Skip if scope is `version`.

The translations live in `docs/script.js` — a single JavaScript file containing an `i18n` object with `en` (lines ~4-279) and `fr` (lines ~280+) blocks. Each key maps to a translated string.

Compare the set of keys present in the EN block vs the FR block to find missing translations:

```bash
# Extract EN keys
grep -Eo "'[a-zA-Z0-9._]+'" docs/script.js | sort -u > /tmp/audit_all_keys.txt

# More targeted: extract keys from EN and FR blocks separately
awk '/^    en: \{/,/^    fr: \{/' docs/script.js | grep -Eo "'[a-zA-Z0-9._]+'" | sort -u > /tmp/audit_en_keys.txt
awk '/^    fr: \{/,/^    \}/' docs/script.js | grep -Eo "'[a-zA-Z0-9._]+'" | sort -u > /tmp/audit_fr_keys.txt

echo "=== Keys in EN but missing from FR ==="
comm -23 /tmp/audit_en_keys.txt /tmp/audit_fr_keys.txt
echo "=== Keys in FR but missing from EN ==="
comm -13 /tmp/audit_en_keys.txt /tmp/audit_fr_keys.txt
```

Also spot-check that skill-related keys in EN and FR refer to the same skills (e.g., both mention the same 7 skill names).

For pages in scope, verify that `data-i18n` attributes used in the HTML have corresponding keys in both EN and FR:

```bash
# Extract data-i18n keys from a page
grep -Eo 'data-i18n="[^"]+"' docs/skills.html | sed 's/data-i18n="//;s/"$//' | sort -u > /tmp/audit_page_keys.txt

# Check each key exists in both translations
while read key; do
  EN=$(grep -c "'$key'" /tmp/audit_en_keys.txt)
  FR=$(grep -c "'$key'" /tmp/audit_fr_keys.txt)
  if [ "$EN" -eq 0 ]; then echo "MISSING EN: $key"; fi
  if [ "$FR" -eq 0 ]; then echo "MISSING FR: $key"; fi
done < /tmp/audit_page_keys.txt
```

## Step 4: Generate audit report

Compile all findings from Step 3 into a structured report.

### 4.1: Count findings

Count the findings by status:
- **ERRORS**: Things that are definitely wrong (missing skill, removed feature still listed, wrong version)
- **WARNINGS**: Things that might be wrong or could be improved (vague description, slightly different wording)
- **OK**: Things that check out

### 4.2: Compute health score

Health score formula:
- Each OK counts as 1 point
- Each WARNING counts as 0.5 point
- Each ERROR counts as 0 points
- Score = (total points / number of checks) * 100, rounded to nearest integer

### 4.3: Display report

Display `MSG_AUDIT_REPORT` with:

1. **Summary line**: X errors, Y warnings, Z OK out of N total checks
2. **Health score**: Percentage from Step 4.2
3. **Findings by page**: Group findings by page, showing only ERRORS and WARNINGS (OK items are collapsed into a count)
4. **Version consistency**: Table showing all version numbers found

Format each finding as:
```
{STATUS_ICON} [{page}:{line}] {check_description}
   -> {details_and_suggestion}
```

Where STATUS_ICON is:
- `ERROR` -> red cross
- `WARNING` -> warning sign
- `OK` -> green check

### 4.4: Display recommendation

Based on the health score:
- **100%**: Display `MSG_ALL_CLEAR`
- **80-99%**: Display `MSG_MINOR_ISSUES` — Some warnings to review, but nothing blocking
- **50-79%**: Display `MSG_NEEDS_ATTENTION` — Several issues should be fixed before release
- **< 50%**: Display `MSG_CRITICAL` — Docs are significantly out of sync, fix before release

## Step 5: Ask for next steps

Use `AskUserQuestion` to display `MSG_NEXT_STEPS`, offering:

1. **Fix automatically** — Apply corrections to HTML files where possible (version numbers, missing skills, removed features)
2. **Create issues** — Create one GitHub issue per ERROR finding
3. **Export report** — Save the report to a file for manual review
4. **Done** — Acknowledge and move on

### 5.1: If the user wants automatic fixes

For each ERROR and WARNING that has a clear fix:
- Version mismatches: Update the HTML file with the correct version using `Edit`
- Missing skill in docs: Flag as "needs manual content addition" (cannot auto-generate HTML content)
- Removed feature still listed: Flag as "needs manual removal"
- Missing images: Flag as "image file not found"
- Missing i18n keys: Flag as "needs translation added to docs/script.js"

Use `Edit` tool to apply fixable changes. For each change, show what was modified.

After applying fixes, re-run the version consistency check (Step 3.5) to verify.

Display `MSG_FIXES_APPLIED` with the count of fixes.

### 5.2: If the user wants to create issues

For each ERROR finding, use `mcp__github__create_issue` to create a GitHub issue with:
- Title: `docs: {brief description of the issue}`
- Body: Finding details, affected file and line, suggested fix
- Labels: `docs`, `bug`

If the MCP GitHub tools fail, display the issues as a list the user can create manually.

### 5.3: If the user wants to export

Save the full report to `audit-report.md` at the project root using `Write`.

Display the file path.

### 5.4: If the user is done

Display `MSG_DONE` and stop.

## Error handling

### Large HTML files

The docs HTML files can be large (2000+ lines). When reading them:
- Use `Grep` for targeted searches within HTML files instead of reading entire files
- When you need surrounding context, use `Read` with `offset` and `limit` to read specific sections
- Focus on extractable text content and structural elements, not styling

### Parsing limitations

HTML content mixed with inline i18n JavaScript can be hard to parse. When in doubt:
- Flag as WARNING rather than ERROR
- Include the relevant HTML snippet so the user can verify manually
