# Design Context Resolution

Read this file only when Step 5.0 has detected a UI signal on the ticket.
It explains how to find the ticket's design references, resolve them, write `.magic/design-brief.md`,
and degrade explicitly when a reference cannot be resolved.

## 1. UI signal detection

Detection is owned by Step 5.0 of `SKILL.md`, which is loaded on every run and decides whether to read this file
at all: it holds the Tier 1/2/3 rules and the backend-only non-trigger, and is the only place they are evaluated.
Reaching this file means a signal already fired — do not re-run the detection.

## 2. Extracting and ranking references

### 2.1 Where to look

| Source | How to read it |
| --- | --- |
| Jira description | `fields.description` from Step 2A |
| Jira attachments | `fields.attachment[]` from Step 2A — use `filename`, `mimeType`, `content` |
| Jira remote links | `getJiraIssueRemoteIssueLinks`, called in Step 2A — extract `object.url` and `object.title` |
| Jira comments | fetch now: `mcp__atlassian__getJiraIssue` with `fields: ["comment"]` → `fields.comment.comments` |
| GitHub issue body | `mcp__github__get_issue` from Step 2B |
| GitHub issue comments | fetch now: `gh issue view {number} --repo {owner}/{repo} --comments` (no MCP tool exists) |

Full comment threads are fetched here rather than in Step 2A/2B precisely because this file is reached only on a ticket
with a UI signal: a backend ticket therefore consumes no comment thread at all.
A `gh` failure is non-blocking — if `gh` fails or is unavailable, continue with the issue body alone.

**Known limitation, Jira only.** Step 2B.5 shell-filters GitHub comments, so a GitHub reference living *only* in a
comment still fires Tier 2. There is no equivalent for Jira: an MCP response cannot be filtered before it enters the
context, so Jira comments are read only after a signal has fired. A design reference that exists *solely* in a Jira
comment, on a ticket with no Tier 1 label and no Tier 3 keyword, is therefore missed. Say so rather than guessing.

Scan each source **only** to extract design references.
Never inline a whole comment thread into your context: keep the references, drop everything else.

### 2.2 Rank ladder

Rank every extracted reference from the strongest source of truth to the weakest:

1. **HTML/CSS mockup in the repo** — the HTML+CSS *is* the spec; read the source, never render it in a browser
2. **Versioned design spec** — a spec `.md` or a `*.styles.ts` cited as the visual model, as a repo-relative path
3. **Figma** — a `figma.com` URL, found in the description, in a comment, or as a remote link
4. **Screenshot / image** — a Jira attachment, an inline `blob:` image, or a local image file
5. **Prose** — last resort, when no artefact exists

When two references disagree, the higher rank wins, and note the conflict in the brief.

### 2.3 Inline `blob:` URLs

An image pasted directly into a Jira description shows up in the markdown as:

```text
![](blob:https://media.staging.atl-paas.net/?type=file&localId=b25a39f748ad&id=3788fc50-…&width=1381&height=804)
```

This is a client-side reference and is not fetchable.
Never attempt to fetch a `blob:` URL with any tool.
Correlate it with `attachment[]` (by order, by count, or by filename) and treat it as an inaccessible screenshot (§3).

Once the reference list is established, display `MSG_DESIGN_REFS_FOUND` from `references/messages.md`,
filling `{ref_list}` with one line per reference, in the shape documented next to that message — the only place
that carries both the EN and FR status wording.

## 3. Resolution by type

| Reference type | Tool | Action |
| --- | --- | --- |
| HTML/CSS mockup in the repo | `Read` | Read the HTML **and** its CSS in full; markup and classes are the spec |
| Versioned spec `.md` or `*.styles.ts` | `Read` | Read the file and extract the tokens it defines |
| Local image file in the repo | `Read` | `Read` renders local images, so the image is genuinely seen |
| Public URL (Figma, hosted mockup, design doc) | `WebFetch` | Fetch it; on auth wall or 404, unresolved (§5) |
| Jira image attachment or inline `blob:` image | none | **NOT RESOLVABLE** — go straight to §5.1 (report + record) |

Locate the mockup's CSS from its own `<link rel="stylesheet">` and `<style>` tags rather than guessing the path.
For a large mockup (or a large stylesheet), do not retain the whole file: extract the design tokens and the markup
subtree of the components the ticket actually touches.

Before declaring a repo-relative path unresolved, `Glob` its basename — the path is often just stale or mistyped.
In a multi-repo task, glob the sibling worktrees too: a full-stack ticket routinely cites a mockup that lives in the
other repo.
Only when the basename matches nowhere is the reference unresolved with reason `path not found` (§5.1).

Never open a mockup in a browser and never screenshot it: the source is the specification.
For a Figma URL, expect most files to be private — a `WebFetch` failure is the normal outcome, not an error to retry.

### 3.1 A Jira image attachment cannot be seen — verified

There is **no path** by which a Jira image can be downloaded so that `Read` sees it: `curl` on the attachment
`content` URL returns **HTTP 403**, no Atlassian credential is reachable from the shell (the OAuth session lives
inside the MCP server), and `mcp__atlassian__fetch` accepts **only ARIs** (`ari:cloud:jira:…:issue/…`).

Do not attempt `curl`, `WebFetch`, or `mcp__atlassian__fetch` on an attachment URL, and never tell the user a
download path exists.
Every Jira image attachment goes to the reporting branch of §5: its inaccessibility is reported to the user,
and the reference is recorded as unresolved in the brief.

## 4. Writing the brief

### 4.1 Exclude `.magic/` from git first

Run this once per repo, before writing the brief (so once per worktree in a multi-repo task):

```bash
EX="$(git rev-parse --git-path info/exclude)"; mkdir -p "$(dirname "$EX")"; touch "$EX"
grep -qxF '.magic/' "$EX" || { [ -s "$EX" ] && [ -n "$(tail -c1 "$EX")" ] && printf '\n' >> "$EX"; printf '.magic/\n' >> "$EX"; }
```

The command is idempotent: `grep -qxF` makes any later run a no-op.
The newline guard is not cosmetic: if `info/exclude` does not end with a newline, a plain append produces
`node_modules.magic/`, `.magic/` is then **not** ignored, and the `git add -A` of `/magic:commit` commits the brief.
`git rev-parse --git-path info/exclude` resolves to the common dir's `info/exclude` inside a linked worktree,
which is the correct target — git does not read a per-worktree `info/exclude`.

The brief is a working artefact: it must never be committed.

### 4.2 Format — frozen

Write `.magic/design-brief.md` at the root of the worktree, with exactly these sections.
Overwrite it wholesale rather than appending: a worktree reused via Step 4.0 may still hold a brief from an earlier
ticket, and a merged brief would mix two mockups.

```text
# Design brief — {TICKET_ID}

## Source of truth

| Rank | Type | Reference | Status |
| --- | --- | --- | --- |
| 1 | HTML mockup | `path/to/mockup.html` | ✅ read |
| 3 | Figma | https://figma.com/… | ⚠️ unresolved (auth) |

## Extracted tokens

colors, spacing, typography, radii, shadows

## Component structure

markup tree + reusable classes

## Mandatory rule

Reuse the mockup's markup and classes. Do not invent an alternative layout.

## Allowed deviations

adapting to the repo's existing design system

## Unresolved references

- `reference` — reason (auth, 404, binary format, blob URL, path not found)
```

The only allowed statuses are `✅ read` and `⚠️ unresolved (<reason>)`.
Keep the section headings verbatim and in English — downstream sub-agents and the critic look for them,
and they must not shift with `languages.discussion`.
Fill each section with content extracted from the resolved references, in the repo's discussion language.
Leave a section with an explicit `none` rather than deleting it.

### 4.3 One brief per worktree

In a multi-repo task, write the brief into **every** worktree, exactly like `CLAUDE.local.md` in Step 4.6
("in each worktree").
A sub-agent only sees the worktree it was handed, so a brief that lives in one worktree is invisible to the others.

### 4.4 Cite an absolute path in sub-agent prompts

Sub-agent prompts must reference the brief by **absolute** path, for example
`/Users/me/code/repo-PROJ-123/.magic/design-brief.md`.
A relative path is unreliable because a sub-agent does not inherit the current working directory.
The brief is git-excluded, so it never shows up in `git ls-files --others --exclude-standard`:
when a prompt hands a sub-agent a list of modifiable or readable files, add the brief path explicitly.

## 5. Explicit degradation

### 5.1 A reference exists but cannot be resolved

1. Display `MSG_DESIGN_REF_UNRESOLVED` from `references/messages.md`, filling `{reference}` and `{reason}`.
2. Record the reference under `## Unresolved references` in the brief, with the same reason.
3. Continue with the remaining references, in the rank order of §2.2.

Allowed reasons: `auth` (403 / private URL), `404`, `binary format` (image that cannot be read), `blob URL`,
`path not found` (repo-relative path that resolves nowhere, after the `Glob` check of §3).

Never implement blind and never degrade silently: an unresolved reference is always surfaced to the user
**and** always written into the brief.
When every reference is unresolved, still write the brief with an empty `Source of truth` table and the full
unresolved list — the critic needs that record to explain why nothing could be checked.
An empty table also tells the critic to keep the `Design fidelity` axis at `N/A` (see Step 5.5.2's guards): there is
nothing to be faithful to. This is the common case for a bug ticket carrying a stack-trace screenshot, which fires
Tier 2 on the attachment without being a UI task at all — it must not cost a point.

### 5.2 A UI signal but zero references

Use `AskUserQuestion` with `MSG_DESIGN_NO_REF` (placeholder `{ticket_id}`) as the question text, and exactly the
three options that message lists — same convention as `MSG_WORKTREE_EXISTS`, whose labels live only in
`references/messages.md`:

- Option 1 → the user supplies a path or a URL; resolve it via §3, then write the brief.
- Option 2 → write no brief, and `rm -f .magic/design-brief.md` in each worktree so a brief left by an earlier
  ticket in a reused worktree cannot stay active; the `Design fidelity` critic axis stays `N/A`.
- Option 3 → stop the skill.

The deletion in option 2 is the same guard as the no-signal path of Step 5.0, for the same reason: every downstream
prompt keys off "when `.magic/design-brief.md` exists", so *not writing* a brief is not the same as there being none.
Only option 1 and §4 ever create one; every other outcome must leave no brief behind.

Never start a UI task silently when no design reference was found.

## Usage

Step 5.0 of `SKILL.md` runs the Tier 1/2/3 detection inline, and reads this file **only** when a signal fires.
Once read, execute §2, then §3, then §4 in order, applying §5 whenever a reference resists resolution.
The brief must exist **before** the implementation plan is written in Step 5.2: the plan has to reference the mockup
explicitly, and the plan-review agent of Step 5.2.3 checks exactly that.
Every downstream prompt then receives the absolute path to the brief — Step 5.1 exploration, Step 5.2.3 plan review,
Step 5.4A/5.4B implementation, Step 5.4.5 simplify, the Step 5.5.2 critic, and the auto-fix agent.
