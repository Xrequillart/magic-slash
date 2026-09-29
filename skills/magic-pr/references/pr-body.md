# PR body rules

Rules for writing the PR body in Step 6.1 of `/magic:pr`, and for placing the test-account line in
Step 6.1.1. Read the sections named by the step you are on.

## Template checkbox modes (Step 6.1)

Applies only when a project PR template exists. Read `pullRequest.templateCheckboxes` from the
config already loaded in Step 0 (default `never`, and any value other than `type` / `all` is read
as `never`) and apply it to every checkbox line the template ships, in either bullet form (`- [ ]`
or `* [ ]`):

- `never`: leave every box in the state the template shipped it, in every section. Almost always that means an empty box stays empty; a template that ships one already ticked keeps it ticked rather than being tidied up
- `type`: at most **one** box may be ticked, and only inside a categorisation group whose heading belongs to the type-of-change family (e.g. `## Type of change`, `### Type of Change:`, `**Change type**`, `## Kind of change`, `## Type de changement`) — matched case-insensitively and ignoring the surrounding markdown noise, so leading `#` marks, bold markers and a trailing `:` never break the match. The family is a closed list, not an open-ended guess: `Type of change`, `Change type`, `Kind of change`, `Type de changement`. Every other group keeps its boxes empty, and a heading that still matches none of them is treated as `never`
- `all`: tick the boxes genuinely verified, and only those
- Every mode wins over the template's own instruction comments (`<!-- Mark the appropriate option with an "x" -->` and the like), and is inert on a repo with no template of its own: **`MSG_PR_TEMPLATE_EN`** / **`MSG_PR_TEMPLATE_FR`** ship no checkboxes of their own, and no mode invents one to have something to tick
- The test-step boxes you write in the testing section (`1. [ ] …`) are outside every mode: they belong to the reviewer and ship empty even at `all`, because nobody has run the scenario yet

## Body length and shape (Step 6.1)

Read on every run, before writing the body.

A reviewer opens a pull request to answer three questions — *what changed*, *why*, *how do I check it*. They answer them in under a minute or they scroll past. Everything else about the change is already on the PR: the commits are a tab, the diff is a tab, the files are a tab. A body that restates any of it asks the reviewer to read the same change twice, and the second telling is always the worse one.

This is the failure mode to design against, because it is the one that arrives on its own. You reach this step holding the whole reasoning behind the branch, and writing it out is the path of least resistance: each paragraph feels earned as you type it, and what lands is a wall of prose whose first reader is also its last. **Length is not thoroughness.** A body the reviewer actually reads beats a complete one they skim.

So the body is **bullets, not paragraphs**, and it is capped. Read `pullRequest.bodyVerbosity` from the config already loaded in Step 0 as `$PR_BODY_VERBOSITY` — default `concise`, and any other value, including an empty one, is read as `concise`.

| `$PR_BODY_VERBOSITY` | Summary | Changes | Testing section | Cap on what you wrote |
| -------------------- | ------- | ------- | --------------- | --------------------- |
| `concise` (default) | 1–2 sentences, ≤ 250 characters | 3–7 bullets, ≤ 200 characters each | prerequisites line + 2–5 numbered steps, ≤ 160 characters each | ≤ 1800 characters |
| `normal` | ≤ 4 sentences, ≤ 500 characters | 3–9 bullets, ≤ 400 characters each | prerequisites line + 2–6 numbered steps, ≤ 250 characters each | ≤ 3500 characters |
| `detailed` | no cap beyond the rules below | no cap beyond the rules below | no cap beyond the rules below | ≤ 8000 characters |

**On a project template, read the rows by role, not by heading.** Its overview section (`## Description`, `## Contexte`, `## What`) takes the Summary row; its list-of-changes section (`## Changes Made`, `## Modifications`) takes the Changes row; its testing section takes the Testing row. Every other section it ships — screenshots, notes, risks — gets one or two lines at most, and the total cap is what binds a template with a dozen headings.

**The cap counts only the text you wrote.** A project template's own boilerplate — its headings, its HTML comments, the checkbox lines it ships — and the Linked Issues section are outside it, so a repo with a twelve-section template is not punished for having one.

These rules hold at every level, `detailed` included:

- **One bullet, one idea, one line.** A bullet may carry a short *why* clause when the change does not explain itself — `**Guard.** Step 6.2.1 rejects a body over the caps, because a rule nothing enforces drifts back` — and that stays a clause. Never a second sentence bolted on, never a paragraph nested under it, never sub-bullets.
- **Lead with what it is.** A bold two-or-three-word lead-in (`**The setting.**`, `**Both front ends.**`) lets a reviewer find the bullet that concerns them without reading the others.
- **`## Changes` is grouped by intent, never a commit dump.** Seven commits that build one thing are one bullet. The commit list is already a tab on this PR, and pasting it here says nothing that tab does not say better.
- **No section restates another.** A summary, then bullets re-explaining the summary, then notes re-explaining the bullets, is one idea billed three times.
- **No process narration.** What you tried first, what you rejected, what took the afternoon — none of it is the change. Reasoning that genuinely matters is one clause on the bullet it belongs to.
- **Short is not terse.** Cutting words is right; cutting the sentence is not. `keyed by repo + path` has no subject and no verb: it is a note to somebody who already has the diff open, which the reviewer does not. Every bullet has to read out loud as a sentence.
- **Every claim is one the diff shows.** No benefits, no adjectives, no "significantly improves".
- **An optional section with nothing to say gets one line, or nothing.** `Not applicable: no visual change` is an answer. Three paragraphs explaining why there is no screenshot is not.

When a body comes out over its cap, drop a bullet or a clause. Never compress a sentence into a fragment to fit — a bullet that no longer parses is over budget in the only way that matters. Step 6.2.1 checks the caps before the PR is created.

## Linked Issues format (Step 6.1)

For **Jira** tickets (when Atlassian is enabled), adapt the Jira URL based on the user's domain (retrieved via `mcp__atlassian__getAccessibleAtlassianResources`):

```markdown
## Linked Issues

- Jira: [PROJ-123](https://your-domain.atlassian.net/browse/PROJ-123)
```

For **GitHub** issues, use the `closes` keyword for automatic linking:

```markdown
## Linked Issues

- Closes #123
```

## Where the test-account line goes (Step 6.1.1)

Read only when `pullRequest.testAccounts` is `reference` or `inline`.

**Where the line goes** — the injection target is *whichever testing section the PR body actually has*, using the same "either header" logic as self-check item 5:

1. Locate the testing section under EITHER the default headers (`## How to test` / `## Comment tester`) when `MSG_PR_TEMPLATE_EN`/`MSG_PR_TEMPLATE_FR` was used, OR the project-template heading recorded in Step 5 (any testing-related heading such as `## Testing`, `### Test Steps`, `## Vérification`, `## QA`) when a project template was used.
2. Fold the resolved account into that section's prerequisites line — the single setup line that already carries env vars, seed data and services. Create that line if the section has none.
3. **If the cascade resolved nothing** (tier 4), the section still gets exactly one line stating that — `No test account documented for this project` in EN, `Aucun compte de test documenté pour ce projet` in FR, written in `languages.pullRequest`. This is what the ticket requires: the reviewer must be told that no account exists rather than left guessing whether one was omitted. Display **`MSG_TEST_ACCOUNTS_NOT_FOUND`** in the chat as well, and never add a credential — an empty section is not an acceptable substitute, and neither is an invented account.
4. If neither header form is present (a project template with no testing section at all), emit nothing into the body and say so in one line. Never add a heading the template does not have.

This step **must not** be implemented by editing the two default templates only: a repo with its own `.github/PULL_REQUEST_TEMPLATE.md` never renders `MSG_PR_TEMPLATE_EN`/`MSG_PR_TEMPLATE_FR` at all (Step 6.1), so template-only injection would make `reference` and `inline` silently no-ops on exactly the repos most likely to use them.
