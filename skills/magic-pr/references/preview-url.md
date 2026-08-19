# Preview URL backfill

Specification for the post-creation preview-URL backfill consumed by `/magic:pr` (Step 7.4.2.5).

The gate has already fired by the time this file is read: the watcher (Step 7.4.2) has just
returned a report. Nothing here decides *whether* to run; it only decides whether a usable preview
URL exists for the branch's **current** head commit and, if so, makes the PR body say so.

This is a backfill over a **moving target**. The PR already exists, but its head commit is not
fixed: the caller runs this procedure up to 5 times per PR (Step 7.4.2.5 — 1 initial watcher
conclusion + up to 3 auto-fix rounds + 1 post-resolve re-check), and every round that follows a
push is a *different head commit, with a different deployment and a different preview URL*. So the
question this procedure answers is never "has a URL been written yet" but **"does the one line this
feature owns name the preview of the commit the PR has right now"**.

## Prerequisites

```bash
REPO_SLUG=<from Step 7.4.1>
HEAD_SHA=<from Step 7.4.1, re-resolved on every entry — the branch's current head, never a value carried over from an earlier pass>
PR_NUMBER=<from Step 6.3>
PR_LANGUAGE=<languages.pullRequest from the config loaded at skill start; default 'en'>
DISCUSSION_LANGUAGE=<languages.discussion from the same config; default 'en'>
TESTING_HEADING=<the heading recorded in Step 5, or the default '## How to test' / '## Comment tester'>
DEPLOY_CHECKS=<checks.deploy_checks from the watcher's report; empty when unavailable>
DEPLOY_PATTERN=<lower-case alternation of the provider tokens in $DEPLOY_CHECKS, e.g. 'vercel|amplify'>
```

`$PR_LANGUAGE` is the language of what goes **into the body**; `$DISCUSSION_LANGUAGE` is the
language of what is said **in the chat** — the question of Phase 6 and the messages of Phase 7,
like every other entry of `references/messages.md`. On a repo configured with two different
languages both are used in the same run, and neither substitutes for the other.

`$DEPLOY_CHECKS` is the watcher's list of checks whose name looks like a deployment or preview
provider (`references/ci-watch.md`, Phase 1) — it costs no call, because the watcher already
snapshots every check. It gates Phase 3 and nothing else. When it is **unavailable** rather than
empty (no watcher report at all — e.g. the report was unparseable and Step 7.4.2 fell back to a
direct snapshot), treat it as empty and skip Phase 3: a missing report is not evidence that a
preview exists, and skipping is the safe default here because the only thing lost is a fallback
that almost never fires, while the alternative spends a call on every PR forever.

## The line this feature owns

This feature owns **exactly one bullet** in the located testing section, for the whole life of the
PR — not one bullet per round. Its handle is that bullet's own prefix, *within that section*:

| `$PR_LANGUAGE` | Prefix that identifies the bullet |
| -------------- | --------------------------------- |
| `en` | `- Preview:` |
| `fr` | `- Aperçu :` |

The bullet is found by that prefix and **never by its URL**: the URL is precisely the part that
changes between rounds, so a procedure that looked for its own URL could never recognise its own
previous line. Both prefixes are recognised on **read** (a body written before a language change
stays findable); the prefix of `$PR_LANGUAGE` is what is used on **write**.

Scope rules, absolute:

- Finding, replacing, removing and inserting all happen **inside the located testing section
  only** (Phase 5.2 — the same "either header" logic as Step 6.1.1). A `Preview:` bullet anywhere
  else in the body belongs to someone else: never read it, never move it, never rewrite it.
- **Nothing else in the body is ever touched** — not one other character. The test-account
  fragment Step 6.1.1 may have folded into the same prerequisites line, the prerequisites line's
  own text, the numbered steps, the other sections, a project template's checklists and comments:
  all byte-identical after this feature writes.
- **At most one** such bullet exists after any write. A section found carrying two or more (a body
  damaged by an earlier, append-only version of this procedure) is collapsed to the single current
  one by the same write.

So the invariant is **not** "never write twice". It is:

> At most one preview bullet of this feature exists in the located testing section, and it always
> names the preview of the branch's **current** head commit.

A second write on a later round is not a defect; it is how that invariant is kept when the head
commit moves. What is forbidden is a *second bullet*.

## Phase order

The order below is load-bearing, not editorial. It exists so the user is asked as rarely as
possible even though the caller runs this procedure up to 5 times per PR (Step 7.4.2.5: 1 initial
watcher conclusion + up to 3 auto-fix rounds + 1 post-resolve re-check):

| Phase | What it does |
| ----- | ------------ |
| 0 | Gate on the repo host |
| 1 | Collect deployment candidates (1 call + at most 5 statuses calls) |
| 2 | Never use the commit status's `target_url` (a prohibition, no call) |
| 3 | Bot-comment fallback — collect candidates from bot comments (at most 1 call, gated) |
| 4 | Reject console / build-log / dashboard URLs (a filter over every candidate, no call) |
| 5 | Read the PR body **once**: locate the testing section, then classify this feature's own bullet as `current` / `stale` / `absent` (1 call) |
| 6 | Pick among the candidates — the question, only when the classification does not already settle it (no call) |
| 7 | Write the body back **once**: replace, insert, or remove this feature's bullet (1 call) |

**Phase 5 before Phase 6** is still the whole point, and its reason survives the three-outcome
model unchanged: the body is classified *before* any question is asked, so a round whose bullet
already names one of this round's candidates stops silently instead of re-asking, and a round that
only needs to swap a stale URL for the single candidate available swaps it without asking. Asking
first and classifying after would put the same question in front of the user on every watcher
conclusion.

Call budget:

- **No preview at all** — the majority of repos: `$DEPLOY_CHECKS` is empty and the deployments
  list comes back empty, so the procedure stops at Phase 1: exactly **1** call. The body is never
  read.
- **No-op round** — the common repeat case: the feature's bullet already names one of this round's
  candidates. 1 (deployments list) + 1 (that deployment's statuses) + 1 (read the body) = **3**
  calls, then stop at Phase 5.4 — no question, no write, no chat output. Rounds 2 through 5 land
  here whenever the head commit's preview is the one already in the body (the commit did not move,
  or the provider reused the URL).
- **First write, exactly one candidate** — the common case on a repo that does publish previews:
  1 + 1 + 1 (read) + 1 (write) = **4** calls, and no question is asked.
- **Replacement round, exactly one candidate from the deployments API** — the head commit moved
  and its preview is a new URL: 1 + 1 + 1 (read) + 1 (write) = **4** calls, the same shape as a
  first write. A replacement rewrites the bullet in place, so it never costs a second write, and it
  asks nothing.
- **Removal-only round** — a stale bullet and no URL that may be written, because the user answered
  "none" or the question could not be asked: the round's own discovery cost + 1 (read) + 1 (write).
  That is **4** when the only candidate was a lone `bot-comment` one the user declined, and up to
  **9** in the worst discovery shape. The bullet is deleted and nothing is added. It cannot happen
  with a single candidate from the deployments API — that case asks nothing and always writes.
- **Worst case, discovery**: 1 (deployments list) + **5** (statuses, one per inspected deployment,
  capped at 5) + 1 (bot comments — reached only because all five deployments yielded nothing, and
  `$DEPLOY_CHECKS` is non-empty) = **7** calls.
- **Worst case, one round, total**: those 7 + 1 (read the body) + 1 (write) = **9** calls, on the
  one path where five deployments produce no URL and the bot-comment fallback then does. The cap on
  Phase 1 is what keeps this a constant instead of scaling with the number of apps in the monorepo.
- **Per PR, all rounds**: at most 5 rounds × the per-round figure above. On the realistic
  single-preview repo that is 4 for the first round plus 3 or 4 for each later round (3 when it is
  a no-op, 4 when the head commit's preview changed) — **at most 20** calls for the whole PR. What
  dominates is the number of watcher conclusions, not this procedure.

No `--paginate`, no retry loop, no polling — within one round every call happens at most once.

## Phase 0 — Gate on the repo host

```bash
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
case "$REMOTE_URL" in
  *github.com*) ;;
  *) exit 0 ;;  # non-GitHub or GitHub Enterprise remote — no URL, stay silent
esac
```

This feature only ever talks to `api.github.com` through `gh`. A GitHub Enterprise remote or any
non-GitHub host is out of scope — treat it exactly like "no URL found", not like an error worth
surfacing.

## Phase 1 — Collect deployment candidates (1 call + at most 5 more)

```bash
DEPLOYMENTS=$(gh api "repos/$REPO_SLUG/deployments?ref=$HEAD_SHA" \
  --jq '[.[] | select(.production_environment == false)][0:5] | .[] | "\(.id)\t\(.environment)"' \
  2>/dev/null || true)
```

- Empty output, non-zero exit, or a 404 → no deployment for this SHA; go to Phase 3 (fallback),
  which is itself skipped when `$DEPLOY_CHECKS` is empty — on a repo with no preview provider this
  first call is the only one the whole procedure makes.
- One or more entries → **every one of them is a candidate**, not just the first. A monorepo that
  deploys several apps produces one non-production deployment *per project* for a single commit, so
  taking `[0]` would silently hand the reviewer an arbitrary app's preview. GitHub returns
  deployments **newest-first** (verified: consecutive pages descend by `created_at`), which is what
  the `[0:5]` slice relies on.

`$HEAD_SHA` is the branch's current head, re-resolved on this entry (Prerequisites). Every
candidate this phase produces therefore belongs to the commit the PR has *now* — which is what
makes the classification of Phase 5.4 meaningful.

**The `[0:5]` cap is deliberate and must stay.** Each candidate URL costs its own statuses call, so
N deployments would mean N calls; the slice bounds that at 5 (the 5 most recent). Beyond the cap
the older deployments are simply never inspected — their previews are never offered and never
written. That is accepted: a commit with more than five live non-production deployments is already
past the point where a list of options helps, and the 5 most recent are the ones whose
`environment_url` is least likely to have been torn down.

Then one statuses call per inspected deployment, keeping the `environment` name alongside the URL —
the name is what makes Phase 6's question answerable, because Vercel names these
`Preview – <project>`:

```bash
# $CANDIDATES accumulates one "url<TAB>environment" line per candidate. URL first, name second:
# the name is the optional field (Phase 3 has none), and a trailing empty field survives `read`
# where a leading one would not — with IFS=<TAB>, tab is IFS whitespace, so a leading tab is
# swallowed and the URL would land in the wrong variable.
CANDIDATES=""
while IFS="$(printf '\t')" read -r D_ID D_ENV; do
  [ -n "${D_ID:-}" ] || continue
  D_URL=$(gh api "repos/$REPO_SLUG/deployments/$D_ID/statuses" \
    --jq '[.[] | select(.state == "success" and (.environment_url // "") != "")][0].environment_url // empty' \
    2>/dev/null || true)
  [ -n "$D_URL" ] || continue
  # Phase 4's filter applies here, before the candidate is recorded — a rejected URL is dropped
  # and the loop moves on to the next deployment.
  CANDIDATES="${CANDIDATES}${D_URL}$(printf '\t')${D_ENV}
"
done <<<"$DEPLOYMENTS"

# Drop blank lines and keep one entry per distinct URL, first environment seen wins.
CANDIDATES=$(printf '%s' "$CANDIDATES" | awk -F'\t' 'NF && $1 != "" && !seen[$1]++' || true)
```

Statuses are returned newest-first, so `[0]` after the filter is the most recent successful status
carrying a URL **for that deployment**. A deployment whose statuses call fails, 404s, or carries no
successful `environment_url` contributes no candidate and is skipped — it does not abort the loop.

The dedup on the URL matters: a retried or re-triggered build adds a second deployment for the same
project, and both can report the same `environment_url`. That is **one** candidate, not two, and it
must not become a two-option question about a single URL.

Run every candidate through the console-URL filter (Phase 4) before accepting it: a misbehaving
provider could in principle set `environment_url` to its own dashboard.

If `$CANDIDATES` is empty after this phase, go to Phase 3. If it is non-empty, Phase 3 is **not**
run — the deployments API is the definitive source for Vercel/Netlify and the fallback buys nothing.

This phase stays **unconditional**: the deployments list is a single call — the statuses calls only
happen when there were deployments to inspect — and it is the definitive source for
Vercel/Netlify. A stronger gate was deliberately not taken: testing `$DEPLOY_CHECKS` before
Phase 1 as well would drop the feature to **0** calls on repos without previews, but it would also
miss a provider that creates a GitHub deployment without surfacing any check, so that one call is
the accepted price of covering it.

## Phase 2 — Never use the commit status's `target_url`

The commit status API (`repos/.../commits/<sha>/status`) is **never** consulted for this feature.
Its `target_url` points at the CI provider's build-log / console page for that check — verified
against a real Vercel-backed PR, where `target_url` was
`https://vercel.com/<org>/<project>/<id>` while the actual deployed app lived at a completely
different, unrelated-looking hostname. Writing `target_url` into a PR body would send the
reviewer to a build log instead of the running app. If Phase 1 finds nothing, the next step is
the bot-comment fallback (Phase 3), never the commit status.

## Phase 3 — Bot-comment fallback (at most 1 call, and only when `$DEPLOY_CHECKS` is non-empty)

**Skip this phase outright when `$DEPLOY_CHECKS` is empty** (including when it is unavailable —
see Prerequisites). An empty list means no deployment-looking check ran on this PR, so there is no
bot preview comment to find and the call buys nothing — on every PR of every repo without a
preview provider, forever. Stop, silently, as if the phase had found no URL.

Otherwise: some providers (Amplify Console, notably — the case this feature exists for) publish
only a commit status and may create no GitHub deployment at all. Recover the URL from a bot's PR
comment instead.

**Read only the comments of a bot that actually deployed on this PR.** `$DEPLOY_CHECKS` names the
deployment-looking checks that ran; derive the provider tokens from it (`Vercel` → `vercel`,
`AWS Amplify Console` → `amplify`, …) and keep only bot comments whose author login contains one of
them:

```bash
# $DEPLOY_PATTERN is an alternation built from $DEPLOY_CHECKS, e.g. 'vercel|amplify'.
# `gh api` has no --arg flag (it takes exactly one query), so the pattern is applied by a
# separate jq — which does. Still one API call.
gh api "repos/$REPO_SLUG/issues/$PR_NUMBER/comments" \
  --jq '[.[] | select(.user.type == "Bot") | {login: .user.login, body}]' 2>/dev/null \
  | jq -r --arg p "$DEPLOY_PATTERN" \
    '.[] | select(.login | ascii_downcase | test($p)) | .body' 2>/dev/null || true
```

Filtering on the author is what ties a candidate to a real deployment. Reading *every* bot comment
made any `https://` link in the thread eligible — a dependabot advisory, a coverage report, a
review bot's docs link — and one of those would then be written into the body as this PR's deployed
application, which is precisely the wrong-resource failure this file exists to prevent. The
console-URL denylist in Phase 4 cannot save that case: it is a denylist, so it only rejects hosts
it already knows, and an unrelated link is not a known console.

If no bot on this PR matches a provider from `$DEPLOY_CHECKS`, there is no URL: stop, silently.

For each surviving body, extract `https://` URLs and run them through the console-URL filter
(Phase 4):

```bash
grep -oE 'https://[^[:space:])"]+' <<<"$BODY" | sed -E 's/[.,;]+$//' || true
```

**Collect every accepted URL across every bot comment**, then deduplicate — do not keep only the
first one. This call does not guarantee any ordering, so "the first accepted URL" was picking
arbitrarily on a PR carrying two bot preview comments (two providers, or one provider posting per
app). Two distinct accepted URLs are two candidates, and Phase 6 is what resolves them:

```bash
# One accepted URL per line, deduplicated, then tagged with the reserved marker `bot-comment` in
# the environment field — same "url<TAB>environment" shape as Phase 1, so `read` is unchanged.
CANDIDATES=$(printf '%s\n' "$ACCEPTED_URLS" | awk 'NF && !seen[$0]++' \
  | sed "s/\$/$(printf '\t')bot-comment/" || true)
```

Candidates from this phase carry no real environment name — a bot comment is prose, not an API
field, and guessing a project name out of it would be fabrication. They carry the reserved marker
`bot-comment` instead, which is what makes their provenance visible to Phase 6. No real
environment may use that name.

**A `bot-comment` candidate is *inferred*, and must be confirmed before it is written.** Phase 1's
`environment_url` is a typed API field whose meaning is exactly "the URL of this deployment's
environment"; a link picked out of prose is a guess about which link in that prose is the
deployment. So Phase 6 asks the user about a `bot-comment` candidate **even when it is the only
one**, and whether the write would be a first insertion or a replacement — and Phase 7 never
writes one that was not confirmed. Everything the guardrails forbid still applies: no fabrication,
no console URL, no production.

Guard every `grep`/`sed`/`awk` here against the no-match case (exit 1): assign into a variable or
append `|| true` — an unguarded pipeline aborts the whole command under `set -e`/`pipefail`,
which zsh's `-o pipefail`-style scripts and `bash -e` both honor. A shell with no matches must
still fall through to "no URL", not abort.

If nothing survives the filter across all bot comments, there is no URL. Stop — silently.

## Phase 4 — Reject console / build-log / dashboard URLs

Applied to **every** candidate, from either Phase 1 or Phase 3, before it enters `$CANDIDATES`:

```bash
grep -viE 'vercel\.com/[^/]+/[^/]+(/.*)?$|vercel\.link|console\.aws\.amazon\.com|app\.netlify\.com|dash\.cloudflare\.com|github\.com/[^/]+/[^/]+/actions/runs/' || true
```

Verified against a real Vercel bot comment: this rejects the "Ready" build-log link
(`vercel.com/<org>/<project>/<inspect-id>`), the project dashboard link
(`vercel.com/<org>/<project>`), and `vercel.link/github-learn-more`, while keeping the actual
`https://<preview-slug>.vercel.app` deployment link. A candidate that matches any of these
patterns is never the preview URL, no matter which phase produced it — reject it and keep
evaluating the phase's remaining candidates (Phase 1's other deployments, Phase 3's other bot
comments); do not fall back to a rejected candidate for lack of a better one, and never offer one
as an option in Phase 6.

## Phase 5 — Read the body once: locate the section, classify our own bullet (1 call)

Only reached when Phases 1–4 left at least one accepted candidate in `$CANDIDATES`.

With **no** candidate the procedure has already stopped without reading the body, so an existing
preview bullet is left exactly as it is. That is deliberate: no candidate means no evidence about
the current head (a torn-down deployment, a rate-limited call, a provider removed from the repo
mid-PR), and deleting a line on the strength of a failed lookup would be worse than leaving one
whose URL may still be right. Removal only ever happens on a round that *did* find candidates
(Phase 7, case D).

1. **Read the current body** — exactly once per round, and *before* any question is asked:

   ```bash
   PR_BODY=$(gh pr view "$PR_NUMBER" --repo "$REPO_SLUG" --json body -q .body 2>/dev/null || true)
   printf '%s' "$PR_BODY" > "$TMP_BODY_FILE"
   ```

2. **Locate the testing section** using the same "either header" logic as Step 6.1.1: the default
   headers (`## How to test` / `## Comment tester`) when the default template was used, or the
   project-template heading recorded in Step 5 when one exists. `$TESTING_HEADING` must end up
   holding the exact heading line the body actually carries. If none of those headings is present
   — a project template with no testing section at all — emit nothing into the body, say so in one
   line in the chat, and stop. Do this **before** Phase 6: there is no point asking which URL to
   write when there is nowhere to write it. Never add a heading the template does not have. The
   `section=` line printed by the snippet in 5.3 is the mechanical form of this check: `section=no`
   means stop here.

   The section runs from that heading to the next markdown heading (`^#+ `) or the end of the body.
   Every read and every write below is confined to that range.

3. **Find this feature's own bullet inside that section**, by its prefix (never by its URL — see
   "The line this feature owns"):

   ```bash
   # Prints "section=yes|no" then "bullet=<the line, empty when absent>".
   # `index(t, "…") == 1` is a literal prefix test, so the FR "Aperçu :" needs no regex escaping.
   LOCATE_AWK='
   function is_preview(l,   t) {
     t = l
     sub(/^[[:space:]]*/, "", t)
     if (t !~ /^[-*][[:space:]]+/) return 0
     sub(/^[-*][[:space:]]+/, "", t)
     return (index(t, "Preview:") == 1 || index(t, "Aperçu :") == 1)
   }
   BEGIN { insec = 0; found = 0; bullet = "" }
   {
     line = $0
     trimmed = line
     sub(/^[[:space:]]+/, "", trimmed)
     sub(/[[:space:]]+$/, "", trimmed)
     if (trimmed == h) { insec = 1; found = 1; next }
     if (insec && line ~ /^#+[[:space:]]/) { insec = 0 }
     if (insec && bullet == "" && is_preview(line)) { bullet = line }
   }
   END { print (found ? "section=yes" : "section=no"); print "bullet=" bullet }'

   LOCATED=$(awk -v h="$TESTING_HEADING" "$LOCATE_AWK" "$TMP_BODY_FILE" 2>/dev/null || true)
   # Each field is read from its own prefixed line — never by searching the whole output, which
   # would let the bullet's own text impersonate the section verdict.
   SECTION_FOUND=$(printf '%s\n' "$LOCATED" | sed -n 's/^section=//p' | head -1 || true)
   [ -n "$SECTION_FOUND" ] || SECTION_FOUND=no
   BULLET_LINE=$(printf '%s\n' "$LOCATED" | sed -n 's/^bullet=//p' || true)
   BULLET_URL=$(printf '%s' "$BULLET_LINE" | grep -oE 'https://[^[:space:])"]+' \
     | head -1 | sed -E 's/[.,;]+$//' || true)
   ```

   Every one of those pipelines is guarded (`|| true`, or an assignment) because each can legitimately
   match nothing: no section, no bullet, no URL. An unguarded no-match aborts the whole command under
   `set -e`/`pipefail`, and zsh aborts on an unmatched glob as well — which is why nothing here is
   left unquoted.

4. **Classify** — this is the decision the rest of the procedure acts on. Three outcomes, not two:

   ```bash
   PREVIEW_STATE=absent
   if [ -n "$BULLET_URL" ]; then
     PREVIEW_STATE=stale
     while IFS="$(printf '\t')" read -r CAND_URL CAND_ENV; do
       [ -n "${CAND_URL:-}" ] || continue
       if [ "$CAND_URL" = "$BULLET_URL" ]; then PREVIEW_STATE=current; fi
     done <<<"$CANDIDATES"
   fi
   if [ "$PREVIEW_STATE" = current ]; then exit 0; fi
   ```

   `if` rather than `[ … ] && …`: an `&&` list whose test is false returns non-zero, which aborts
   the run under `set -e` — the same no-match trap the `grep`s above guard against.

   | Classification | Condition | Phase 6 | Phase 7 |
   | -------------- | --------- | ------- | ------- |
   | `current` | the bullet exists and its URL is **one of this round's candidates** | not run | not run — **stop here**: no question, no write, no chat output, body byte-identical |
   | `stale` | the bullet exists and its URL is **none of this round's candidates** | run only when the candidates do not settle it | **replace in place** (case B), or **remove** (case D) |
   | `absent` | the section carries no bullet of this feature | run as before | **insert** (case C) |

   The comparison is against **this round's whole candidate set**, not against the one candidate
   that would be chosen. Two reasons, and both are load-bearing:

   - The user's earlier answer is *expressed by the URL that landed in the body*. This procedure
     keeps no state of its own, so a bullet whose URL is still among the current head's candidates
     is the record of that answer, and there is nothing to ask and nothing to write.
   - Candidates are re-derived for `$HEAD_SHA` on every round. So "still a candidate" means "still
     a preview of the commit the PR has now" — exactly the invariant. Comparing against a single
     "current pick" instead would rewrite the body every time the discovery order shifted, and
     would re-ask on a monorepo whenever the newest deployment happened to be a different app.

   `stale` is the case the append-only design got wrong: after an auto-fix push, round 1's URL is
   not among the *new* head's deployments, so the correct action is to **replace** the bullet —
   never to add a second one next to a URL that now serves code the PR no longer has.

## Phase 6 — Pick among the candidates (no call)

Reached with `$PREVIEW_STATE` equal to `absent` or `stale` (a `current` classification already
stopped the procedure in Phase 5.4). What happens depends on both the classification and the
candidate set:

| `$PREVIEW_STATE` | Candidates | Behaviour |
| ---------------- | ---------- | --------- |
| `absent` | exactly 1, from Phase 1 (a real `environment` name) | **No question.** It is `$PREVIEW_URL`. |
| `absent` | exactly 1, marked `bot-comment` | **Ask** — a confirmation, one option plus "none". |
| `absent` | 2 or more | **Ask** `MSG_PREVIEW_URL_MULTIPLE`. |
| `stale` | exactly 1, from Phase 1 | **No question.** It is `$PREVIEW_URL`; Phase 7 replaces the line silently. |
| `stale` | exactly 1, marked `bot-comment` | **Ask** — the bot-comment rule is unconditional, replacement included. |
| `stale` | 2 or more | **Ask** `MSG_PREVIEW_URL_MULTIPLE`, at most once for this head commit. |
| `current` | any | Phase 6 is never reached. |

Why `stale` with a single Phase 1 candidate asks **nothing**: there is nothing to choose. That one
candidate is the only preview the current head has, writing it *is* the invariant, and asking "may
I keep this line correct?" would be a question with a single possible answer, repeated on every
push. This is the case that keeps the up-to-5 rounds question-free on a single-preview repo —
which is the overwhelming majority of repos that publish previews at all.

Why `stale` with 2 or more candidates **does** ask again, and how it stays bounded: with several
previews for the new head, which app the user chose in an earlier round is genuinely unknown. The
old URL cannot tell us — deriving a project identity from a hostname (matching slugs, prefixes or
patterns across two Vercel URLs) is a guess about a string, and this file never guesses
(`## Never`). The two alternatives to asking are both failures this feature exists to prevent:
leaving the stale URL points the reviewer at code the PR no longer has, and picking one silently is
the arbitrary choice Phase 6 was created to remove. So the question is asked again — and it is
bounded:

- **At most once per head commit**, therefore at most 5 times over the whole life of the PR, and
  only on a multi-preview repo whose head commit actually moved. Within a round the question is
  asked at most once.
- A round classified `current` never asks. A repo with one preview never asks. So the original
  guarantee holds in the form that matters: *the user is never asked twice about the same state of
  the PR*, and never asked at all when the body is already right.

Question text: **`MSG_PREVIEW_URL_MULTIPLE`**, in `$DISCUSSION_LANGUAGE` — the same key for a first
write and for a replacement; its wording asks which preview the test scenarios should point at,
which is the question in both cases. Options, in the order `$CANDIDATES` holds them (newest
deployment first for Phase 1 candidates):

- **One option per candidate URL.** Label a Phase 1 candidate with its `environment` name
  (`Preview – webapp`). Label a `bot-comment` candidate with its own host, minus the scheme, and say
  where it came from (`x-abc.vercel.app — from a bot comment`), so the user can see it is inferred
  rather than reported by the deployments API. Put the full URL in the option's description so two
  same-named environments can be told apart.
- **One final option to write none of them**, labelled `None` / `Aucun`.

If the user picks a URL, it becomes `$PREVIEW_URL` and Phase 7 runs — case C when the bullet was
`absent`, case B when it was `stale`.

**If the user picks "none"**: nothing is *added* and nothing further is said — no
`MSG_PREVIEW_URL_ADDED`, no `MSG_PREVIEW_URL_UPDATED`, no note about having asked.

- Bullet `absent` → no body change at all. Nothing lands in the body, so a later round classifies
  `absent` again and **will ask again** (up to the 5 rounds). That is intended, not a bug: the
  alternative is recording a refusal somewhere in the PR, and this feature owns exactly one line of
  the body and no state of its own. The question is cheap and the repeat only happens on PRs whose
  CI keeps concluding.
- Bullet `stale` → Phase 7 case D: the bullet is **removed**. Refusing to name a preview is not the
  same as agreeing to keep pointing at the wrong commit, and the invariant forbids a bullet that
  names a URL none of the current head's candidates match.

**If the question cannot be asked at all** — a non-interactive or headless run, `AskUserQuestion`
unavailable or failing — no URL may be written: do **not** fall back to "pick the most recent" or
"pick the first", which is exactly the silent arbitrary choice this phase replaces. Treat it like
"none": with an `absent` bullet, write nothing and stay silent; with a `stale` bullet, apply
Phase 7 case D and remove it. Removing writes no URL and invents nothing — it deletes a statement
this round has positive evidence against — whereas leaving it would hand the reviewer a link to
code the PR no longer has. This is the same fail-closed rule the rest of this file uses (Phase 0's
non-GitHub remote, Phase 3's empty gate, the failed-write path): when the procedure cannot
establish the right answer, it produces no answer — never a guessed one. The single-candidate cases
are unaffected: they need no question, so they still write.

## Phase 7 — Write the body back once (1 call)

Exactly one write per round, and never an append. Which case applies is already decided by
Phase 5.4's classification and Phase 6's answer:

| Case | Classification | `$PREVIEW_URL` | Action on the bullet | Chat |
| ---- | -------------- | -------------- | -------------------- | ---- |
| A | `current` | — | none — Phase 5.4 already stopped the procedure | silent |
| B | `stale` | set | **replace in place** — same slot, same indentation, new URL | `MSG_PREVIEW_URL_UPDATED` |
| C | `absent` | set | **insert** it under the prerequisites line | `MSG_PREVIEW_URL_ADDED` |
| D | `stale` | not set ("none", or the question could not be asked) | **remove** it | silent |

1. **Compose the bullet** in `$PR_LANGUAGE` — one line, the same nested-bullet slot the
   test-account line occupies when present, under the testing section's prerequisites line (the
   single setup line Step 6.1.1 uses for env vars, seed data, a service to run):

   EN: `- Preview: {url} — this PR's actual deployed code; migrations, deletions and seeding still need local.`
   FR: `- Aperçu : {url} — le code réellement déployé de cette PR ; migrations, suppressions et seed restent en local.`

   The indentation is not part of the composed text: case B reuses the indentation of the line it
   replaces, and case C uses the indentation of the nested bullets already under the prerequisites
   line (two spaces when there are none).

2. **Apply it to the located section only.** The body may come from an arbitrary
   `.github/PULL_REQUEST_TEMPLATE.md`, so the edit is confined to the range Phase 5.2 located and
   touches no line but this feature's own bullet — in particular not the test-account fragment that
   Step 6.1.1 may have folded into the same prerequisites line:

   ```bash
   # mode=replace (case B) | insert (case C) | prune (case D)
   # bullet=<the composed line, without indentation; empty for prune>
   FOLD_AWK='
   function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
   function indent_of(s) { match(s, /^[[:space:]]*/); return substr(s, 1, RLENGTH) }
   function is_preview(l,   t) {
     t = l
     sub(/^[[:space:]]*/, "", t)
     if (t !~ /^[-*][[:space:]]+/) return 0
     sub(/^[-*][[:space:]]+/, "", t)
     return (index(t, "Preview:") == 1 || index(t, "Aperçu :") == 1)
   }
   { L[NR] = $0 }
   END {
     n = NR
     hs = 0
     for (i = 1; i <= n; i++) if (trim(L[i]) == h) { hs = i; break }
     if (hs == 0) { for (i = 1; i <= n; i++) print L[i]; exit }   # no section: body untouched
     he = n
     for (i = hs + 1; i <= n; i++) if (L[i] ~ /^#+[[:space:]]/) { he = i - 1; break }

     ins = 0; instext = ""
     if (mode == "replace" || mode == "prune") {
       done = 0
       for (i = hs + 1; i <= he; i++) if (is_preview(L[i])) {
         if (mode == "replace" && !done) { L[i] = indent_of(L[i]) bullet; done = 1 }
         else DEL[i] = 1                                           # collapse any extra bullet
       }
     } else {                                                      # mode == "insert"
       p = 0
       for (i = hs + 1; i <= he; i++) if (trim(L[i]) != "") { p = i; break }
       if (p == 0) { ins = hs; instext = "\n" bullet }              # empty section
       else if (trim(L[p]) ~ /^[0-9]+[.)][[:space:]]/) { ins = p - 1; instext = bullet "\n" }
       else {                                                       # prerequisites line at p
         k = p; pad = "  "
         while (k + 1 <= he && L[k + 1] ~ /^[[:space:]]+[-*][[:space:]]/) { k++; pad = indent_of(L[k]) }
         ins = k; instext = pad bullet
       }
     }

     for (i = 1; i <= n; i++) {
       if (!(i in DEL)) print L[i]
       if (ins == i) print instext
     }
     if (ins == 0 && instext != "") print instext
   }'

   awk -v h="$TESTING_HEADING" -v mode="$FOLD_MODE" -v bullet="$PREVIEW_BULLET" \
     "$FOLD_AWK" "$TMP_BODY_FILE" > "$TMP_NEW_BODY" || true
   ```

   Properties this relies on, all of them verified in `bash` and `zsh`, on default-template and
   project-template bodies:

   - The heading is matched on the whole trimmed line, so `## Testing` never matches
     `### Test Steps` and a `Preview:` bullet in another section is out of range.
   - `replace` keeps the bullet's position and indentation; only the line's text changes.
   - `replace` and `prune` collapse a section that carries several preview bullets down to one (or
     zero) — that is how a body damaged by the older append-only behaviour gets repaired.
   - `insert` places the bullet after the prerequisites line **and after any bullets already nested
     under it**, so the test-account bullet stays first and untouched. When the section has no
     prerequisites line (its first non-blank line is a numbered step), the bullet becomes that line
     itself, unindented, before the steps. When the section is empty, it is the section's first
     line. Never a new heading.
   - A body whose heading cannot be found is reprinted **unchanged** — the procedure cannot reach
     this point with no section (Phase 5.2 stops first), and if it somehow did, it would write
     nothing rather than something arbitrary.

3. **Write the body back** — once:

   ```bash
   gh pr edit "$PR_NUMBER" --repo "$REPO_SLUG" --body-file "$TMP_NEW_BODY"
   ```

   (`mcp__github__update_pull_request` is an equally valid way to perform this write.) If the new
   body is byte-identical to the one read in Phase 5.1, skip the call entirely and say nothing —
   by construction that cannot happen in cases B, C and D, so it means the edit did not apply, and
   a no-op write plus a chat message claiming a change would be a lie. If the write fails, retry
   once; if it still fails, treat it like "no URL" for the user — stay silent, display neither
   `MSG_PREVIEW_URL_ADDED` nor `MSG_PREVIEW_URL_UPDATED`, and do not block or retry further.

4. **Say it once**, in `$DISCUSSION_LANGUAGE`, substituting `{url}`:

   - case C (first write) → **`MSG_PREVIEW_URL_ADDED`**
   - case B (replacement) → **`MSG_PREVIEW_URL_UPDATED`** — a different event, and the reviewer may
     already have clicked the previous link, so it is not reported as a fresh discovery
   - case D (removal) → nothing at all

## Never

- Never use the commit status's `target_url` — it is a build-log link, not the deployed app
  (Phase 2).
- Never accept a URL matching the console/dashboard/build-log patterns in Phase 4, from any
  source — and never offer one as an option in Phase 6.
- Never fabricate, guess, or complete a URL. Only a URL a probe actually returned is eligible.
  This extends to option labels: a `bot-comment` candidate has no environment name, so it is
  labelled by its own host, never by a project name inferred from the comment's prose. It also
  extends to the stale bullet: never infer which project an old URL belonged to by comparing
  hostnames, slugs or patterns with the current candidates (Phase 6).
- Never read the comments of a bot that did not deploy on this PR: Phase 3 keeps only authors whose
  login matches a provider named in `$DEPLOY_CHECKS`. Any bot's link would otherwise be eligible,
  and Phase 4 is a denylist that cannot recognise an unrelated host as wrong.
- Never write a `bot-comment` candidate that the user did not confirm — not even when it is the
  only candidate, and not even when the write would only be replacing a stale URL.
- Never target a production deployment (`production_environment == true` is excluded outright in
  Phase 1).
- Never inspect more than 5 deployments for one SHA (the `[0:5]` cap in Phase 1).
- Never add a heading the PR body's template does not already have.
- Never **append** a preview bullet next to an existing one. A URL that changed is a *replacement*
  (Phase 7 case B): at most one preview bullet of this feature exists in the section at any time,
  and a section found with more than one is collapsed to one by the same write.
- Never look for this feature's own previous bullet by its URL — the URL is the part that changes.
  The handle is the `Preview:` / `Aperçu :` prefix **within the located testing section**.
- Never touch anything outside that section, and never modify anything inside it but this feature's
  own bullet — the prerequisites line's own text and the test-account fragment Step 6.1.1 folded
  into it stay byte-identical.
- Never leave a bullet whose URL is none of the current head's candidates on a round that found
  candidates: replace it, or remove it when no URL may be written (Phase 7 cases B and D).
- Never remove a bullet on a round that found **no** candidate — Phase 5 is not even reached, and a
  failed or empty lookup is not evidence that the URL in the body is wrong.
- Never write more than once per round, and never write at all when the classification is `current`
  (Phase 5.4) — that round leaves the body byte-identical and says nothing.
- Never ask the question before the body has been read and classified: Phase 5 runs before Phase 6,
  always. That ordering is what keeps the up-to-5 rounds per PR from producing up-to-5 questions.
- Never ask when the classification is `current`; never ask when a single Phase 1 candidate settles
  it, `absent` or `stale` alike; never ask more than once for the same head commit. A lone
  `bot-comment` candidate is the deliberate exception — it is always confirmed.
- Never pick a candidate on the user's behalf when the question cannot be asked — write no URL
  (Phase 6).
- Never say anything in the chat when no URL is found, when the classification is `current`, or
  when the outcome is a removal — silence is the invariant for every case that does not put a new
  URL in the body.
- Never run Phase 3 when `$DEPLOY_CHECKS` is empty or unavailable, and never run it at all when
  Phase 1 already produced a candidate.

## Usage

The caller (Step 7.4.2.5) invokes this procedure with the prerequisite values already resolved, on
every watcher conclusion. The procedure returns one of:

- **The URL was written for the first time** — the bullet was inserted (Phase 7 case C) and
  `MSG_PREVIEW_URL_ADDED` was displayed exactly once. The URL was either the only candidate or the
  one the user chose.
- **The URL was replaced** — the bullet existed with a URL that is not one of this head commit's
  candidates, and was rewritten in place (case B); `MSG_PREVIEW_URL_UPDATED` was displayed exactly
  once. This is the normal outcome of the round that follows an auto-fix or post-resolve push, and
  it involves no question when the repo publishes a single preview.
- **The line was already correct** — the bullet names one of this round's candidates
  (classification `current`): nothing written, nothing said, no question asked. This is the normal
  outcome of a round whose head commit did not move, or whose preview URL did not change.
- **The stale line was removed** — a bullet existed, none of this round's candidates matched it,
  and no URL could be written (the user answered "none", or the question could not be asked): the
  bullet was deleted, nothing was added, nothing was said (case D).
- **No URL** — nothing was written, nothing was said in the chat. This covers no candidate at all
  (in which case an existing bullet is left untouched, the body is not even read), every candidate
  rejected by Phase 4, and a user answering "none" with no bullet in the body. This is silent by
  design and is not a failure to report.
- **No testing section to fold into** — a one-line note in the chat only (no body change), used
  only when at least one candidate was found but the template has nowhere to put it. Detected in
  Phase 5.2, before any question.

The caller never branches on which phase produced the URL, on which of the three classifications
applied, nor on whether the user was asked. The contract is just: **after this procedure returns,
the body either carries exactly one preview bullet naming the current head's preview, or this
procedure said nothing.**

## Degradation

| Situation | Behaviour |
| --------- | --------- |
| `gh` unavailable or unauthenticated | No URL, stay silent |
| Any `gh api` call exits non-zero (rate limit, network, deleted PR) | Treat as "no URL" for that phase, fall through to the next phase (Phase 1 → 3, gated on `$DEPLOY_CHECKS`) or stop if it was the last one |
| Repo remote is not `github.com` (GitHub Enterprise or another host) | No URL, stay silent (Phase 0) |
| `$HEAD_SHA` is empty or unresolvable | No URL, stay silent |
| A 404 from deployments, statuses, or comments | Same as any non-zero exit — no URL for that phase |
| Deployments list is empty for this SHA | Fall through to the bot-comment fallback (Phase 3), or stop at 1 call when `$DEPLOY_CHECKS` is empty |
| One deployment's statuses call fails or has no `success` + non-empty `environment_url` | That deployment yields no candidate; keep inspecting the others, then fall through to Phase 3 only if none yielded anything |
| More than 5 non-production deployments for this SHA | Only the 5 most recent are inspected (Phase 1 cap); the rest are never offered |
| Two deployments report the same `environment_url` | Deduplicated to one candidate — no question is asked for a single URL |
| `$DEPLOY_CHECKS` is empty (no deployment-looking check on this PR) | Phase 3 skipped entirely — no URL, stay silent |
| `$DEPLOY_CHECKS` is unavailable (no parseable watcher report) | Treated as empty — Phase 3 skipped rather than spending the call blindly |
| Every candidate URL is rejected by the console-URL filter | No URL, stay silent |
| No candidate at all on this round, while a preview bullet exists in the body | The bullet is left untouched and the body is not even read — a failed lookup is not evidence against it (Phase 5) |
| The feature's bullet already names one of this round's candidates | No-op — no question, no write, no chat message, body byte-identical (classification `current`) |
| Exactly one candidate survives, no bullet in the section | No question — inserted directly (Phase 7 case C, `MSG_PREVIEW_URL_ADDED`) |
| Exactly one candidate survives, bullet holds a different URL | No question — **replaced in place**, never appended (Phase 7 case B, `MSG_PREVIEW_URL_UPDATED`) |
| Two or more distinct candidates, no bullet in the section | `AskUserQuestion` (Phase 6), one option per URL plus a "none" option |
| Two or more distinct candidates, bullet holds a different URL | Ask again, at most once for this head commit; the answer replaces the line in place |
| A lone `bot-comment` candidate, bullet absent or stale | Always confirmed before it is written — no exception for a replacement |
| The section carries two or more preview bullets (body damaged by an older append-only version) | Collapsed to the single current bullet by the same write |
| The user picks "none" | Nothing is added; a `stale` bullet is removed (case D), an absent one stays absent; silence either way, and a later round asks again |
| The question cannot be asked (non-interactive/headless run), with 2+ candidates or a lone `bot-comment` one | **Fail closed** — no URL is written; a `stale` bullet is removed (case D), nothing is added, stay silent. Never pick one |
| PR body has no testing section at all | One line in chat, nothing in the body — detected in Phase 5.2, before the question |
| The write (`gh pr edit`) fails after one retry | Treat as "no URL" for the user — stay silent, display no message |
| The rewritten body comes out byte-identical to the one read | Skip the write call and say nothing — the edit did not apply, and a message would misreport it |
| This reference file is missing on disk | Skip the backfill entirely for this run, say so in one line, and continue the workflow |

## Multi-repo

Re-run this whole procedure once per worktree cycle, using that worktree's own `$REPO_SLUG`,
`$HEAD_SHA` and `$PR_NUMBER` — each repository has its own PR, its own head commit, its own
deployments, and its own single preview bullet to keep current. Nothing here is resolved once and
reused across worktrees.

A question asked for one worktree says nothing about the next: the candidates are different URLs
from a different deployments list, so the answer is never carried over. The asking guarantee is
per PR — never asked when the body is already right, never asked when a single Phase 1 candidate
settles it, at most once per head commit otherwise — and each worktree has its own PR, so it
applies independently in each.
