# Test accounts

Specification for the test-account resolution consumed by `/magic:pr` (Step 6.1.1)
and `/magic:start` (Step 5.5.1).

The resolution has three actors with strictly separated responsibilities:

| Actor | Role | May read a secret store? |
| ----- | ---- | ------------------------ |
| **`/magic:pr` Step 6.1.1** | Resolves the accounts, applies the guard, injects one line into the PR body's testing section | **No** |
| **`/magic:start` Step 5.5.1** | Resolves the accounts and prefixes `{test_steps}` with the same line | **No** |
| **Project-local skill** (tier 2) | Owns the project's policy: may reach a vault, a seed script or a back-office, and decides what is safe to expose | **Yes** — the only actor allowed to |

A reviewer who cannot log in cannot test. But a PR body on a public repo is
world-readable and permanently archived, so an agent that harvests credentials
into it is mechanically a credential-exfiltration pattern. Everything below
exists to keep the first problem solved without creating the second: the skills
themselves only ever read **declared, intentional** sources, and anything
resembling a secret store is reachable only through a project skill the user
wrote on purpose.

## Prerequisites

Resolve these before running the cascade:

```bash
TA_MODE=<pullRequest.testAccounts from the config loaded at skill start; default 'off'>
TA_SOURCE=<pullRequest.testAccountsSource from the same config; default ''>
REPO_ROOT=$(git rev-parse --show-toplevel)
```

`$REPO_ROOT` matters: every glob and every `git check-ignore` below is relative
to the worktree currently being processed, never to the directory the skill was
launched from.

## Modes

| Mode | What reaches the testing section | What never reaches it |
| ---- | -------------------------------- | --------------------- |
| `off` (default) | **Nothing at all** — no line, no mention, no warning | Everything |
| `reference` | Where the accounts are documented + the role to use — or, when nothing is documented, one line saying exactly that | Any password, token, API key or one-time code |
| `inline` | The identifier and password exactly as the source documents them — or, when nothing is documented, one line saying exactly that | Anything the source did not publish as a test credential |

The two non-`off` modes produce exactly one line, shaped like one of these:

```text
reference: - Test account: documented in `TESTING.md` ("Test accounts") — role: admin
inline:    - Test account: `admin@acme.test` / `Passw0rd!` (role: admin, source: `TESTING.md`)
not found: - No test account documented for this project
```

The third shape carries as much weight as the other two: in `reference` and
`inline`, a cascade that resolves nothing still writes that one line, so the
reviewer learns that no account exists instead of wondering whether one was
withheld. Its FR form is `Aucun compte de test documenté pour ce projet`.

`off` is a **hard invariant**, not a soft default: a run with `off` must produce
a PR body byte-for-byte identical to what the same run produced before this
feature existed. The ordinary prerequisites line still lists env vars, seed data
and services as it always did — but it gains no account fragment, and there is no
"no test account found" note, no placeholder, and no chat message about accounts
either. Phase 0 exists precisely so the cascade is never even entered.

## Phase 0 — Gate on the mode

```bash
[ "$TA_MODE" = "off" ] && echo "skip"
```

If `$TA_MODE` is `off`, absent, or any value other than `reference` / `inline`:
stop here. Do not run the cascade, do not call `gh`, do not display a message.
An unrecognised value is treated as `off` — a typo must never open a wider door
than the one the user asked for.

## Phase 1 — Source guardrails

These apply to **every** tier of the cascade, including a path the user typed
into `testAccountsSource` themselves.

**Never read, and never ask a sub-agent to read:**

- `.env`, `.env.*`, `*.env`, `.envrc`
- `secrets/`, `.secrets/`, or any path with a `secret` / `secrets` segment
- `*.pem`, `*.key`, `*.p12`, `*.keystore`, `id_rsa*`, `*credentials*`
- `~/.netrc`, `~/.ssh/`, `~/.aws/credentials`, `~/.config/gh/hosts.yml`
- The macOS Keychain (`security find-generic-password`), `pass`, `op`,
  `vault`, `gcloud secrets`, `aws secretsmanager` — or any other secret-manager
  CLI. Only a tier-2 project skill may invoke these, on its own authority.
- **Any git-ignored file**, whatever its name

The last rule is the one that generalises: a project can call its secrets file
anything, and the fact that it is git-ignored is the author's own statement that
it must not travel.

Checking a candidate takes **two** steps, in this order. Containment first,
because `check-ignore` answers a question about a pathname, not about a file:
`../../.aws/credentials` and `/Users/me/.ssh/id_rsa` are not ignored *by this
repo* — nothing outside the worktree ever is — so `check-ignore` returns "not
ignored" and would wave them straight through into a permanently archived PR
body. A symlink is the same hole wearing a disguise: the link itself is tracked
and innocent, its target is not.

```bash
# $CANDIDATE = the one path the cascade is about to open, checked before every
# single read — the override path, a tier-3 hit, anything. Never batch: one
# candidate, one check, one decision.

# Step 1 — containment. Resolve symlinks and `..`, then require the real path to
# sit inside the worktree. Reject before reading, not after.
REAL_ROOT=$(cd "$REPO_ROOT" && pwd -P) || exit 1
REAL_CANDIDATE=$(cd "$(dirname "$REPO_ROOT/$CANDIDATE")" 2>/dev/null && pwd -P)/$(basename "$CANDIDATE")
case "$REAL_CANDIDATE" in
  "$REAL_ROOT"/*) ;;                       # inside the worktree — continue
  *) echo "reject: outside the repo"; ;;   # absolute, ../ traversal, or symlink out
esac

# Step 2 — git's own verdict, on the resolved path.
git -C "$REAL_ROOT" check-ignore -q -- "$REAL_CANDIDATE"
echo "exit=$?"
```

Reject the candidate outright, without reading it, when **any** of these hold:

| Condition | Why |
| --------- | --- |
| `$CANDIDATE` is absolute (starts with `/`) or begins with `~` | It names a file the repo does not own |
| It contains a `..` segment | Traversal out of the worktree |
| `$REAL_CANDIDATE` is not under `$REAL_ROOT` | Same, after symlinks are resolved |
| Step 1 could not resolve the path | **Fail closed** — an unresolvable path is never approved |

Then apply `check-ignore`'s verdict on the **resolved** path:

| Exit | Meaning | Action |
| ---- | ------- | ------ |
| `0` | The path is git-ignored | **Reject the candidate** and move to the next one |
| `1` | The path is tracked or untracked-but-not-ignored | Allowed |
| other | `git` error (not a repo, bad path) | **Reject** — fail closed |

This matters most in `inline` mode, where the consequence of a bypass is a
credential written into a public, permanent record. But apply it in `reference`
mode too: naming the path of a file outside the repo already leaks where the
project keeps its secrets.

Two further rules that hold regardless of source:

- **Never invent an account.** A hallucinated `test@example.com` /
  `password123` in a PR body is worse than nothing: the reviewer spends ten
  minutes failing to log in before concluding the line was fiction. If no tier
  produced a real, documented account, emit nothing but the "not found" line.
- **Never extrapolate.** Do not derive a password from a pattern seen
  elsewhere, do not complete a partially documented account, do not swap a
  documented staging host for a production one.

## Phase 2 — Discovery cascade

Four tiers, evaluated in order. **Stop at the first hit** — a hit is a source
that actually yielded at least one usable account or pointer, not merely a file
that exists.

### Tier 1 — Config override (`testAccountsSource`)

Highest priority: the user typed this value themselves.

```bash
[ -n "$TA_SOURCE" ] && ls -d "$REPO_ROOT/$TA_SOURCE" "$TA_SOURCE" 2>/dev/null
```

- If it resolves to an existing file (relative to `$REPO_ROOT`, or absolute),
  use that file as the documented source — still subject to Phase 1.
- Otherwise treat it as a **project-skill name** and look for
  `$REPO_ROOT/.claude/skills/$TA_SOURCE/SKILL.md`.
- If neither resolves, say so in one line ("configured
  `testAccountsSource` did not resolve: <value>") and continue with tier 2.
  An unresolved override is not a hit, and it is not a reason to stop the PR.

### Tier 2 — Project-local skill (the ideal path)

```bash
ls -1 "$REPO_ROOT"/.claude/skills/*/SKILL.md 2>/dev/null
```

Read only the YAML frontmatter (`name`, `description`) of each match and keep
those whose name or description is about test accounts — matching, case
insensitively, any of: `test account`, `test-account`, `compte de test`,
`test user`, `seed user`, `fixture user`, `login`, `credentials`, `demo
account`.

Invoke the winner through the `Skill` tool when it is registered under that
name; otherwise read its `SKILL.md` and follow its instructions. Then use what
it returns, verbatim and unfiltered by us.

This tier is the ideal path and the reason the whole design works: such a skill
can pull from a vault, a seed script or a back-office, and it — not us — decides
what is safe to expose. Our job is to relay its answer, not to second-guess it.

### Tier 3 — Documented files

```bash
find "$REPO_ROOT" -maxdepth 1 -iname 'testing.md' 2>/dev/null
find "$REPO_ROOT/docs" -maxdepth 2 \( -iname 'testing.md' -o -iname 'test*account*' \) 2>/dev/null
grep -n -i -E '^#{1,4} .*(test|account|compte)' "$REPO_ROOT/CONTRIBUTING.md" 2>/dev/null
```

For `CONTRIBUTING.md`, read **only** the matched section, not the whole file.
Matching is case-insensitive everywhere — hence `-iname` rather than a literal
`ls`, which would miss a root-level `testing.md` on a case-sensitive
filesystem. `TESTING.md`, `testing.md`, `docs/test-accounts.md` and
`docs/Test_Accounts.md` all qualify.

### Tier 4 — Nothing found

Two things happen, and both are required:

- **In the testing section**: write exactly one line — `No test account
  documented for this project` (FR: `Aucun compte de test documenté pour ce
  projet`). Silence is not an option once the mode is non-`off`: the reviewer
  must be told that no account exists rather than left to guess whether one was
  omitted on purpose.
- **In the chat**: display **`MSG_TEST_ACCOUNTS_NOT_FOUND`**, which lists the
  sources that were checked.

Then carry on. No invention, no placeholder, no blocking, no `AskUserQuestion`.

## Phase 3 — Public-repo guard (`inline` only)

Before putting any credential into a PR body or a summary, establish that the
repository is private:

```bash
gh repo view --json isPrivate -q .isPrivate
```

| Output | Interpretation | Action |
| ------ | -------------- | ------ |
| `true` | Private repo | `inline` is allowed |
| `false` | Public repo | **Downgrade to `reference`** |
| empty, non-zero exit, `gh` missing, not authenticated, anything else | Visibility unknown | **Downgrade to `reference`** |

The guard is **fail-closed**: unknown visibility is treated exactly like a
public repo. A repo can also be flipped from private to public months after the
PR is merged, and the body stays — which is why `inline` should stay reserved
for repos whose whole lifetime is internal.

On any downgrade, display **`MSG_TEST_ACCOUNTS_PUBLIC_REPO_GUARD`** so the user
sees that a mode they configured was overridden, and continue in `reference`
mode. Never silently drop the line, and never abort the PR over this.

## Phase 4 — Emit the prerequisites line

The result is **one** line, placed as (or folded into) the prerequisites line
that already opens the testing section — the same "if setup is needed, start
with a single prerequisites line" slot that env vars, seed data and services
use. Never a new heading, never a table, never a `<details>` block.

- When the cascade resolved nothing (tier 4), that one line is the "no test
  account documented" statement instead of an account — same slot, same single
  line, still no credential. Only `off` produces no line at all.
- At most **two** accounts. If the source documents more, name the two roles a
  reviewer actually needs (typically one admin, one standard user) and point at
  the source for the rest.
- Keep the source path in the line even in `inline` mode: it is what lets the
  reviewer self-serve when the credential has rotated.
- Write the line in `languages.pullRequest` (magic-pr) or
  `languages.discussion` (magic-start), matching the surrounding section.

## Multi-repo: resolve once per worktree

Resolution is **per worktree**, performed at the top of each Steps 1→7 cycle
(`/magic:pr` Step 0.4 loops those steps for every worktree with commits) — never
once globally in Step 0. Two repos sharing a ticket rarely share a login, and a
back-end account pasted into a front-end PR is both wrong and a leak.

Re-run Phase 0 through Phase 4 after every `cd {WORKTREE_PATH}`: the mode itself
is per-repo config, so a repo configured `off` must stay silent even when the
previous worktree in the same run inlined an account.

## Degradation — identical in both skills

Both skills must degrade the same way, so that they never contradict each other
for the same repo. There must be no state where `/magic:pr` inlines an account
while `/magic:start` stays silent.

| Situation | Behaviour |
| --------- | --------- |
| This reference file is missing on disk | Treat the mode as `off`; say so in one line and continue |
| `gh` unavailable or unauthenticated, in `inline` mode | Downgrade to `reference` (Phase 3), display the guard message |
| `gh` unavailable or unauthenticated, in `reference` mode | No impact — `gh` is not needed to point at a file |
| The resolved source exists but documents no account | Treat as tier 4: the "no test account documented" line + `MSG_TEST_ACCOUNTS_NOT_FOUND` |
| A tier-2 skill fails or returns nothing | Continue to tier 3; do not retry it |
| The mode is `off` | Absolute silence — see Phase 0 |
