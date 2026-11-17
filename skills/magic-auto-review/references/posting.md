# Posting the review on GitHub

> Shared, byte for byte, by `magic-auto-review` and `magic-review`. A test holds the two copies
> identical: edit one, copy it to the other.

Post only the comments the user kept (or all of them when `review.mode` is `"post"`).

**Every comment that asks for a change is a thread**, never body text: `/magic:resolve` builds its
work list from review threads, so a request left in the body would reach `findings` and then be
silently dropped by the fix step.

- tied to a line: an inline comment (`subjectType: "LINE"`)
- not tied to a line (a missing requirement, a problem with a whole file): a file comment
  (`subjectType: "FILE"`) on the changed file where the change belongs; for a requirement with no
  file at all, on the changed file closest to it (the entry point, the feature's main component),
  saying so in the comment
- only a `general comment` that asks for **no code change** (about the PR as a whole, its
  description, its scope) goes into the review body

## 1. The calls

A review carrying inline comments is **three calls, in this order**. There is no single call that
posts a body and its inline comments together, and the middle step only works while a pending
review exists, so do not submit before the comments are attached.

1. **Open a pending review**: `mcp__github__pull_request_review_write` with `method: "create"`,
   `owner`, `repo`, `pullNumber`, and **no `event`**. Passing `event` here submits the review
   immediately and there is then no pending review left to attach anything to.
2. **Attach each inline comment**: `mcp__github__add_comment_to_pending_review` with `owner`,
   `repo`, `pullNumber`, `path`, `body`, `subjectType: "LINE"`, `line`, and `side: "RIGHT"` (`LEFT`
   to comment on a removed line). For a range, add `startLine` and `startSide`. To comment on a
   file as a whole, pass `subjectType: "FILE"` and omit `line`.
3. **Submit**: `mcp__github__pull_request_review_write` with `method: "submit_pending"`, `owner`,
   `repo`, `pullNumber`, the `body` from §3, and the `event` from §2.

When the review has **no** inline comment, the three collapse into one call: `method: "create"`
with `body` and `event` together.

A comment can only target a line that is part of the diff. When the line you want is outside it
(the caller of a changed function), attach the comment to the nearest changed line and cite the
other one with `path:line`, or make it a general comment.

If step 2 or 3 fails after one retry, the pending review is still open and invisible to everyone
else: a half-written review nobody can see is worse than none. Either retry the submit, or clear it
with `method: "delete_pending"` and tell the user the review was not posted.

## 2. The event

From the comments actually posted **plus the open findings** (`references/analysis.md` §1.4:
unresolved threads of other reviewers you agree with, which are counted but not reposted):

| Comments posted and open findings | Event |
| --------------------------------- | ----- |
| none, or only `nit` and `general comment` | `APPROVE` |
| at least one `to address` | `REQUEST_CHANGES` |
| otherwise (`minor`, `question`) | `COMMENT` |

The body names each open finding in one line (`Still open: @reviewer's point on path:line`), so
the event is explained by what the reader can see.

On **your own PR** GitHub refuses `APPROVE` and `REQUEST_CHANGES`: always `COMMENT`. That is
every `/magic:auto-review`, and a `/magic:review` that turned out to target your own PR.

## 3. The body

Written in the **review language** (`references/review-config.md` §2), translated from the draft,
never pasted. In this order, dropping what is empty:

1. the confidence score and the reasons for the missing points (only with
   `review.confidenceScore` on)
2. the intent coverage, in one line: `Ticket coverage: 4/5 requirements (R3 missing)`
3. the assessment paragraph
4. the verification table (`references/analysis.md` §6.1), as a markdown table under a heading
   ("What this review verified" / "Ce que cette review a vérifié"), translated to the review
   language
5. every kept general comment, each under its label

No AI attribution, no tool signature, no em dash.
