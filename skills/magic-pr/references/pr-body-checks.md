# PR body self-check

The checks Step 6.2.1 of `/magic:pr` runs on the `body` string after the user confirms and before
the MCP tool is called. Read on every run. If any check fails, reconstruct the body from scratch
and re-verify (max 2 retries), as Step 6.2.1 says. The caps table that check 7 measures against is in
`references/pr-body.md`, section "Body length and shape".

**Checks to perform on the `body` string:**

1. **No literal escape sequences**: the body must not contain the two-character sequences `\n`, `\t`, or `\r`. These must be actual line break characters. This is the most common failure — it causes GitHub to render the entire PR as a single unreadable paragraph.
2. **No unfilled template placeholders**: the body must not contain instruction text inside square brackets (e.g., `[Concise summary of changes]`, `[List of commits]`). Every `[instruction]` from the template must have been replaced with actual content.
3. **Required section headers present**: the body must contain at least `## Summary` and `## Changes` as distinct lines (or their FR equivalents `## Résumé` and `## Changements` if `languages.pullRequest` is `"fr"`).
4. **Non-empty sections**: each section heading must be followed by at least one non-blank line of actual content before the next heading or end of body.
5. **Testing section is a real manual scenario**: locate the testing section under EITHER the default headers (`## How to test` / `## Comment tester`) OR any testing-related project-template heading (e.g. `## Testing`, `### Test Steps`, `## Vérification`, `## QA`) — whichever is present. The section PASSES if it meets EITHER of these conditions:
   - **Manual scenario**: contains at least one numbered step (a line starting with `- [ ] 1.`), every numbered step you wrote is an **empty** box followed by its number (`- [ ] 1. …`, `- [ ] 2. …` — a missing box, a missing number, a ticked `[x]` or the `1. [ ] …` form, whose numbers GitHub hides, fails; a project template that dictates another step shape is exempt), and does NOT consist solely of a test command (e.g. only "run npm test" / "lancer npm test"). A single automated-test line is acceptable only as an optional last line after the manual steps.
   - **No-surface declaration**: explicitly states there is no manual test surface (docs-only/CI/pure refactor), e.g. "No manual test surface — docs-only change; verify rendering / links". In this case a numbered step is NOT required.

   **Test accounts** — every check below is scoped to the **located testing section only**, never to the whole body. A PR whose own subject is test accounts (this feature, a login page, a seed script) legitimately names accounts and credentials in its Summary or Changes sections, and must not fail its own self-check for doing so.
   - **(a)** If `pullRequest.testAccounts` is not `off`, that section MUST carry the outcome of Step 6.1.1 — either the resolved account line, or the "No test account documented for this project" / "Aucun compte de test documenté pour ce projet" line when the cascade found nothing. Both are valid outcomes; a section that says nothing about accounts at all means the injection failed and this check fails. (Exception: a project template with no testing section, where Step 6.1.1 has nowhere to inject.)
   - **(b)** If `pullRequest.testAccounts` IS `off`, that section must carry **no test-account output of this feature** — no resolved account line, no "no test account documented" note, no "log in with…" placeholder. What it must NOT do is fail a PR whose own subject is test accounts: a manual step like "set `testAccounts` to `reference` and check the body points at `TESTING.md`" is a legitimate test instruction, not a leak. Fail only when the section carries the *output* of Step 6.1.1, which at `off` never ran.
   - **(c)** No invented or placeholder credential ever ships, in any mode: that section must not contain a credential the resolved source did not actually document. Reject on sight anything of the form `test@example.com`, `user@test.com`, `admin/admin`, `password123`, `changeme`, `<your-password>`, or a made-up token — even when it "looks plausible". If Step 6.1.1 found nothing, the correct section carries the "no test account documented" line and no credential at all.
   - **(d)** In `reference` mode (including a `reference` reached by the public-repo downgrade), that section must contain no password, token or API key — only a pointer plus the role to use.
6. **Template checkboxes match the configured mode**, compared state by state and never by total: pair each checkbox line of the body with the template line it came from, **matching first on the enclosing section heading, then on the label text after the marker within that section**. Label alone is not enough — a template that repeats `- [ ] Documentation` under both "Type of Change" and "Checklist" would pair the two at random, and at `type` that binds a box to the wrong group, which either lets a tick through outside the categorisation group or rejects a body that was correct. Matching inside the section rather than by position lets the body reorder or reflow its sections freely. Markers are read case-insensitively, in both the `- [ ]` / `- [x]` and `* [ ]` / `* [x]` forms. If the Step 5 `cat` output is no longer in context, `cat` the template file again; never skip this check for want of the earlier output.
   - At `never`, every pair must hold the same state as the template: one it shipped empty stays empty, one it shipped ticked stays ticked. **An equal total is not a pass** — unticking one box to tick another leaves the count intact and is exactly what this check exists to catch.
   - At `type`, that identity holds everywhere outside the categorisation group. Inside it, at most one pair may differ, and only by having become ticked. A tick that appears in any other group fails, whatever the total says.
   - At `all` the check does not apply: letting the agent decide is the whole point of that mode.
   - A checkbox line that pairs with nothing counts as the agent's own — a task list it wrote in the summary, say — and is outside this check, but **only when its label matches no checkbox anywhere in the template**. A label the template does carry, found under a heading that does not pair, is a box that moved rather than a box that was written: it is judged as a pair against the template line of that label, so renaming a section never launders a tick out of this check.

7. **The body is within the Step 6.1 caps**, measured on the text you wrote — the template's own headings, HTML comments and checkbox lines do not count, and neither does the Linked Issues section. Count, do not estimate: a body that feels short and measures 3000 characters is exactly the case this check exists for.
   - **Per section**: the summary, the `## Changes` bullets and the testing steps each within the row of the table for `$PR_BODY_VERBOSITY`. A single over-long bullet fails the check on its own — the average is not the contract.
   - **Shape**: no paragraph in `## Changes` (a bullet that runs past its cap is a paragraph wearing a dash), no sub-bullets, no section that restates another, no process narration.
   - **Fragments fail too.** A bullet with no verb is not a pass just because it is short. Rewriting one over-long bullet as two short ones is right; shrinking it to `timer in a ref` is not.
   - Over the cap, rebuild by **cutting bullets and clauses**, never by trimming sentences into fragments. If two rebuilds still come out over, post the shortest correct body you have and say in one line in the chat that it is over the cap — a PR that exists beats a self-check loop.

## If any check fails

**If any check fails:**
- Log which check(s) failed
- Reconstruct the body from the commits and diff (re-read if needed)
- Re-verify the reconstructed body
- After 2 failed retries, show the body to the user with `AskUserQuestion` and ask them to fix it manually
