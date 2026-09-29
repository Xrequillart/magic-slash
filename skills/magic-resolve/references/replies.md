# Replying to resolved comments

Detail of Step 7 of `/magic:resolve`. Read it before posting any reply, whenever `$RESOLVE_REPLY` is `true`.

That is what keeps these replies short by default. You arrive at this step holding the full reasoning behind every fix you just applied, and writing it out here is the path of least resistance — but it lands as an essay in a thread the reviewer wanted to close, and it says nothing the diff does not already say better.

SHORT IS NOT THE SAME AS TERSE, and this is the half that is easy to get wrong in the other direction. A reply compressed to `timer in a ref, cleared on unmount` has no subject and no verb: it is a note to somebody who already has the file open, which the reviewer does not. Every reply carries a plain sentence saying what changed — see the rules below. Cutting words is right; cutting the sentence is not.

## Why `gh api`

`gh api` (invoked via the Bash tool, which `Bash(*)` allows) is the primary method here because it takes the numeric comment id Step 3 already stored, and one call posts one reply.

`mcp__github__add_reply_to_pull_request_comment` does the same job and is the fallback below — it wants that same numeric id (the `#discussion_r...` one, never the `PRRT_...` thread node id). What does *not* work is `mcp__github__add_issue_comment`: it only creates top-level issue comments, never a threaded reply on a specific review comment.

## Primary: `gh api` (with retry)

Use the comment ID (stored in Step 3) and the commit SHA (from Step 6.2):

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies -f body="{message}"
```

For each `gh api` call, if it fails with a transient error (HTTP 5xx, network timeout, rate limit 429):
- **Retry up to 2 times** with a 2-second pause between attempts
- If all retries fail for a specific comment, log the failure and continue with the next comment
- At the end, if any replies failed, fall back to the consolidated MCP comment (see below)

### Message template

Pick the template from `$RESOLVE_REPLY_VERBOSITY`. Substitute `{COMMIT_SHA}` (short SHA, first 7 characters from `git rev-parse --short HEAD`) and `{fix_summary}`. Render the template and every substitution in `$RESOLVE_REPLY_LANG`.

EVERY LEVEL HAS THE SAME FIRST LINE AND THE SAME BLANK LINE AFTER IT. The commit reference is a pointer, read by somebody checking the thread is closed; the description is what a human reads. They sat on one line separated by a dash, and the description was the half that got skimmed past. What the levels change is what comes *after* the description, never the two lines above it.

| `$RESOLVE_REPLY_VERBOSITY` | Template | Hard cap |
| -------------------------- | -------- | -------- |
| `minimal` (default) | **`MSG_REPLY_MINIMAL`** | The reference line, a blank line, then one or two plain sentences. ≤ 300 characters total. No code block, no list. |
| `normal` | **`MSG_REPLY_NORMAL`** | ≤ 550 characters total. The `minimal` form, plus a `why` paragraph **only** when the fix departs from what the comment asked for. When it does not depart, this level renders exactly like `minimal`. |
| `detailed` | **`MSG_REPLY_DETAILED`** | ≤ 1200 characters, at most 3 short paragraphs. |

Any other value — including an empty one — is read as `minimal`.

Count the characters before posting. If the body is over its cap, cut it rather than posting it: the cap is the contract, not a target to approach. Cut a clause, a qualifier or a whole second sentence — never the verb, and never down to a fragment. A description that no longer parses as a sentence is over budget in the only way that matters.

#### The description has to read like a sentence a person wrote

`{fix_summary}` is the only part of the reply anybody actually reads, and it is on a line of its own for exactly that reason. It is not a changelog entry and not a commit subject. It answers one question — *what did you change, and what does that mean?* — for a reviewer who has not opened the diff yet and may not open it at all.

- **A WHOLE SENTENCE**, with a subject and a verb, ending in a full stop. Not a fragment (`keyed by repo + path`), not a telegram of symbols (`` `arm()` no-ops after `stop()` ``). If it cannot be read out loud, it is not finished.
- **NAME THE EFFECT, NOT ONLY THE MECHANISM.** "The board now keeps the repository you left it on, even after a restart" says what changed for somebody using it; "moved `tasksRepo` onto the account" says where you typed. When both fit, the effect comes first and the mechanism trails it.
- **SPELL THINGS OUT.** An identifier earns its place when it is the thing the reviewer asked about, or when naming it in words would be longer and vaguer. Otherwise prefer the words: a reply made of three backticked symbols is addressed to the compiler.
- **ONE IDEA.** Two changes in one description are two sentences at most, and usually mean the thread deserved two replies.
- **NO JARGON THE COMMENT DID NOT USE.** The reviewer set the register. Matching it is how the reply reads as an answer rather than as a status line.

This is the rule the caps bend around, not the other way up. A description one clause over `minimal` that a person can read beats one under it that they cannot.

#### What never goes in a reply, at any level

- **What the diff shows.** Naming the change is the reply; walking through it is not.
- **How the codebase got this way.** Which other files hold a copy of the pattern, what existed before, why it was spelled that way — none of it is the reviewer's question.
- **Alternatives you rejected**, and deviations you decided were worth flagging on your own initiative. A genuine departure from the comment belongs in `normal` and `detailed`; a tour of the roads not taken belongs nowhere.
- **Test counts.** "7 new tests cover it", "1716 tests green" — CI reports that, and it reports it accurately.
- **The reviewer's comment, quoted back.** They wrote it; it is directly above your reply.

At `minimal` and `normal`, also leave out **acknowledgements** — "good catch", "you were right that…", "thanks, this was a real defect". They are warm and they are noise at those levels. `detailed` is the level that exists for a reply that reads like a person talking, so it may open with one.

## Fallback: reply over MCP, then a consolidated comment

If the `gh` CLI is not available or all `gh api` calls fail, try `mcp__github__add_reply_to_pull_request_comment` (`owner`, `repo`, `pullNumber`, `commentId`, `body`) for each comment. It keeps the replies in-thread, which is the whole point of this step.

Only if that also fails, fall back to a single consolidated top-level comment using `mcp__github__add_issue_comment`.

Use **`MSG_REPLY_FALLBACK`** for the fallback comment body, substituting `{COMMIT_SHA}` and the list of resolved comments (each with `{file}`, `{line}`, `{fix_summary}`). Render it in `$RESOLVE_REPLY_LANG`.

Every entry is one line, whatever `$RESOLVE_REPLY_VERBOSITY` says. This is a list of what was addressed, and the level only ever governed the reply to a *single* comment — a consolidated comment carrying eight `detailed` bodies is the one thing worse than eight verbose threads.

> **Note**: If both `gh api` and the MCP fallback fail, log a warning but do not block the workflow.
