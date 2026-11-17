# Analysing the change

> Shared, byte for byte, by `magic-auto-review` and `magic-review`. A test holds the two copies
> identical: edit one, copy it to the other.

Four passes, in this order: read the change, confront it with the intent, analyse it, then try to
prove every finding wrong. Then grade, list what was verified and what was not, and score.

## 1. Read the change

### 1.1 Read the code the PR actually contains

Review **the PR's head commit**, not whatever happens to be checked out.

```bash
git fetch origin "pull/{PR_NUMBER}/head" --quiet 2>/dev/null
git rev-parse --verify --quiet "{head_sha}^{commit}" >/dev/null && echo HEAD_AVAILABLE
```

- `HEAD_AVAILABLE`: read each changed file at that commit with `git show '{head_sha}:{path}'`, and
  the diff with `git diff {base_sha}...{head_sha} -- '{path}'`. This works the same whether the PR
  is yours or a colleague's, and never touches the working tree.

**File names come from the PR, so they are untrusted input.** Put one in a shell command only when
it matches `^[A-Za-z0-9._/@+-]+$`, and always inside single quotes as above. A path with any other
character (a space, a quote, `$`, a backtick, `;`) never goes through the shell: read it with
`mcp__github__get_file_contents` (`ref: {head_sha}`) and take its patch from `get_files`. The same
rule holds for `Grep` and `Glob` patterns built from a PR path. `{head_sha}`, `{base_sha}` and
`{PR_NUMBER}` come from the GitHub API and are checked as hexadecimal and numeric before use.
- Otherwise (the PR comes from a fork the remote cannot fetch, or the repository is not checked out
  here): `mcp__github__get_file_contents` with `ref: {head_sha}`, and the patch from `get_files`.

For `/magic:auto-review`, when the local `HEAD` is ahead of `{head_sha}` (commits not pushed yet),
review the PR as GitHub has it and say in the draft that N local commits are not part of it.

Read each changed file **in full**, not only the hunks: a bug often lives in the line the diff did
not touch (the caller, the early return above, the cleanup below).

### 1.2 Read around it

With `Grep` and `Glob` (on the working tree, which is close enough for neighbours):

- the **callers** of every changed exported function, component or endpoint
- the **tests** of the changed code, and whether the PR added or changed any
- the **types, schemas and migrations** the change depends on
- a file that **already solves the same problem** elsewhere in the codebase: the best comment is
  often "`src/x.ts:40` already does this"

### 1.3 Read the house rules

The repository's own conventions beat generic best practice. Read, when they exist: `CLAUDE.md`
(root and the changed folders), `CONTRIBUTING.md`, `.editorconfig`, the lint config, the PR
template. A finding that contradicts a written house rule is wrong, however standard it is
elsewhere.

### 1.4 Read what is already known

- **CI**: `gh pr checks {PR_NUMBER} --json name,state,link 2>/dev/null` (or the check runs of the
  head commit). A red check is evidence; a green one is what the score may rely on instead of
  running the tests yourself. Never run the PR's code, tests or scripts: for a colleague's PR it is
  untrusted code, and for your own the CI already did.
- **Existing threads** (`get_review_comments`, `get_reviews`): a point already raised by a human or
  a bot is not raised again. If you agree with an open thread, say so in the assessment; if you
  disagree, that is a `question` on the same line.

## 2. Confront the change with the intent

Take the intent sheet (`references/intent.md` §2) and fill it in:

| Mark | Meaning | Becomes |
| ---- | ------- | ------- |
| ✅ | Implemented, at `path:line` | nothing, it goes in the coverage line |
| ⚠️ | Partly implemented: say what is missing | a `to address` or `minor` comment, by impact |
| ❌ | Not implemented, and not stated as out of scope | a `to address` file comment, on the file where it belongs (`references/posting.md`, top) |
| ❓ | Cannot be told from the code (UI copy, a manual check) | a `question`, or a line in "not verified" |

Then the other direction:

- **Scope creep**: changes that serve no requirement. Not wrong by itself: flag it as `minor
  (scope)` when it makes the PR harder to review or riskier to revert, ignore it when it is a
  one-line fix on the way.
- **Claims** (C1, C2...): each one verified against the diff or the CI, or listed as not verified.
  A false claim ("no behaviour change" on a PR that changes a default) is `to address`: the
  description is what the next reviewer will trust.
- **Conflicts** between sources: say which one the code followed, as a `question` when it is not
  obviously the latest decision.

## 3. Analyse

For every changed file, go through the axes that apply. Skip an axis that has nothing to say
rather than filling it.

1. **Correctness**: logic, edge cases (empty, null, zero, one, many, concurrent), error paths,
   off-by-one, time zones, async ordering and races, state left behind on failure.
2. **Security**: input validation at trust boundaries, injection (SQL, shell, HTML), authn/authz on
   new endpoints and policies, secrets in code or logs, data exposed to the wrong user.
3. **Data and compatibility**: migrations (reversible, safe on a full table, never an edit of one
   already applied), API and schema changes, persisted formats, feature flags, older clients.
4. **Performance**: work inside loops (N+1), unbounded queries or lists, missing timeouts on network
   calls, re-renders, memory kept alive, work done on the hot path that could be done once.
5. **Tests**: is the new behaviour tested, are the edge cases from (1) covered, would the tests fail
   if the fix were reverted, are they testing the code or the mocks.
6. **Readability and conventions**: naming, dead code, duplication of an existing helper, comments
   that lie, and the house rules read in §1.3.

## 4. Try to prove each finding wrong

Before keeping a finding, look for the reason it might be wrong: climb the nested `beforeEach`,
read the helper whose name suggests the bug, check the caller that already validates the input,
check the house rule that asks for exactly this. A finding you would have to retract costs more
than one you never raised.

Keep a finding only when you can say **what input or state** makes it fail. "This might be null"
is not a finding; "`user.org` is null for invited users (`src/auth.ts:88`), and this line
dereferences it" is.

## 5. Grade each finding

Every finding becomes a comment that could be posted as is, with one label (written in the
discussion language in the draft, in the review language on GitHub):

| Label | Meaning | Counts as |
| ----- | ------- | --------- |
| **to address** | Must change before merging: a bug, a security issue, a breaking change, a missing requirement, a false claim | blocking |
| **minor** | Worth doing, not blocking. Say what kind: `minor (perf)`, `minor (tests)`, `minor (scope)` | suggestion |
| **nit** | Wording, a comment, naming. Say what kind: `nit (comment)` | cosmetic |
| **question** | You are not sure it is wrong: ask rather than assert. Can be combined: `question / nit` | suggestion |
| **general comment** | About the PR as a whole or its description, not a line | suggestion |

Each comment says what the code does, why it matters (the failing input), and a concrete way out:
a snippet, an option, the file that already does it right. Cite the other places you checked with
`path:line`, so the author can verify rather than trust.

What is done well does **not** become a comment. It goes in the assessment, stated as something
you checked ("the refactor does not change behaviour: I compared the old closure to the new helper
line by line"), never as generic praise.

Order: `to address` first, then by impact. More than about ten comments usually means the nits
should be grouped into one general comment.

## 6. What was verified, and what was not

### 6.1 The verification table

Build it for every review, whatever `review.confidenceScore` says: it is shown in the draft
(`MSG_REVIEW_DRAFT`) and posted in the review body (`references/posting.md` §3). It tells the
author and the next reviewer exactly what they can rely on, and what is still theirs to check.

One row per item, in this order:

1. each **requirement** of the intent sheet (R1..Rn), with its ✅ ⚠️ ❌ ❓ from §2 (❓ is
   "❌ not verified": say why)
2. each **claim** (C1..Cn): verified against the diff or the CI, or not
3. each **test scenario** the PR lists (its testing section): covered by an automated test you
   read, by a green CI job, or not verified (a manual scenario is never "verified" by reading code)
4. the **CI**: one row per relevant check, or one row "all N checks green"
5. the **edge cases** you checked in §3 that matter for this change (the empty list, the
   read-only user), and the ones you could not

| Status | When |
| ------ | ---- |
| ✅ verified | You saw the evidence: the code at `path:line`, a test that would fail without the change, a green CI job |
| ⚠️ partly | Part of it holds, part is missing or unclear: say which part |
| ❌ not verified | You could not check it from here: say why (needs a browser, a real account, production data, running the code) |

Rules:

- "How" is concrete: `read src/export.ts:40-72`, `CI job "e2e" green`, `test export.test.ts:88`.
  Never "looks fine".
- Never mark ✅ what you only inferred. Running nothing (§1.4) means anything that needs
  execution is ✅ only through a test or a CI job that actually covers it.
- Five to fifteen rows. Group the trivial ones ("R4 to R6, copy changes: read, ✅").

## 7. Score your confidence

Skip this section entirely when `review.confidenceScore` is `false`.

A **confidence score out of 10**: how confident you are that this PR can be merged as is, not how
much you like it. Then what is missing to reach 10, in one or two concrete reasons (an unbounded
timeout on a new network call, requirement R3 not implemented, a manual test not done yet). A score
with no reasons is not a score.

Calibration:

- any `to address` left: 6 at most
- a requirement ❌ or a false claim: 5 at most
- red CI on a check related to the change: 4 at most
- 10 only when every requirement is ✅, every claim is verified and the CI is green

Be honest about what you did not verify: the ❌ rows of the table (§6.1) are what keeps the score
below 10 when no comment does.
