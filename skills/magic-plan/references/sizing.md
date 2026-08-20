# Sizing — single story or epic

Read this file in Step 5, once the brainstorm and the framing dialogue have produced enough to
know what the work actually is. It owns the story-vs-epic decision, the rules a breakdown must
obey, how `plan.splitting` moves the threshold, and the acceptance-criteria format for each
`plan.acceptanceCriteria` value.

Sizing before the exploration is guesswork: the same idea is one story in a codebase that already
has the plumbing and four in one that does not. So this file assumes Step 3's findings are in hand.

## 1. The unit — a deliverable, not a task

Count **deliverables**, not tasks. A deliverable is something that can be merged on its own and
leaves the product in a working, useful state. Two tasks that only make sense merged together are
one deliverable.

Write the list of deliverables down before counting them. `D` below is the length of that list.

For each deliverable, also settle two things, because §3 needs them:

- **Surface** — which part of the product it changes (an API, a screen, a CLI, a schema, a job, the
  docs). Used to detect horizontal slicing, never as a reason to split.
- **Size** against the reviewable-PR ceiling below.

### The reviewable-PR ceiling

A deliverable exceeds the ceiling when it plausibly needs **more than ~15 changed files or ~400
changed lines** of hand-written code, generated files and lockfiles excluded.

These numbers are a calibration aid, not a measurement — nothing has been written yet, so they are
an estimate from the Step 3 findings (how many call sites, how many components, whether a migration
is involved). Their job is to make "too big for one PR" a judgement two people would make the same
way, instead of a feeling.

## 2. The threshold, per `plan.splitting`

`D` is the deliverable count from §1. `plan.splitting` defaults to `balanced`.

| Mode | Epic when | Single story when |
| --- | --- | --- |
| `conservative` | `D ≥ 3`, **or** `D = 2` and at least one of the two exceeds the ceiling | `D = 1`, or `D = 2` with both under the ceiling |
| `balanced` | `D ≥ 2` | `D = 1` |
| `eager` | `D ≥ 2`, **or** `D = 1` and that deliverable exceeds the ceiling — split it into staged stories (§3.4) | `D = 1` and under the ceiling |

Read the table across one row and the modes stop being vague: with two deliverables of normal size,
`conservative` files one ticket, `balanced` and `eager` file an epic with two. With one oversized
deliverable, only `eager` splits it.

**Ties go to fewer tickets.** When you cannot decide between `D = 1` and `D = 2`, it is 1 in every
mode. An epic that should have been a story wastes a review cycle; a story that should have been an
epic gets split by whoever picks it up, which is cheap and happens naturally.

**Upper bound: 7 stories.** Past that, the idea is not one epic. Propose either two epics along the
seam that is most obvious in the breakdown, or a phase-1 epic with the rest named in the spec as
out of scope for now. Say which of the two you are proposing and why — a 12-story epic is a backlog
nobody reads, and silently truncating one is worse.

**Lower bound.** A story that is a single-line change with no test is not a story: fold it into its
neighbour. A backlog of trivia costs more to triage than to do.

## 3. Breakdown rules

### 3.1 Independently shippable

Every story must be mergeable and useful on its own. The test: if only this story ships and the
rest of the epic is cancelled tomorrow, is the product still coherent? If the answer is no, the
story is a slice, not a story.

### 3.2 Never horizontal slices

**"The backend" and "the frontend" are not stories.** Neither are "the tests", "the types", "the
migration", "the API layer" or "the refactor first". Each of them ships something that does
nothing on its own, and each forces its sibling to be merged before anyone can see the feature.

Slice **vertically** instead: each story crosses whatever layers it needs and delivers one
capability end to end. A story is allowed to touch a schema, an endpoint and a screen — that is
normal, and it is what makes it independently reviewable.

| Horizontal — reject | Vertical — accept |
| --- | --- |
| Add the invitations table and the API | Invite a member by email — persisted, sent, visible in the list |
| Build the invitations UI | Revoke a pending invitation |
| Write the invitation tests | Resend an expired invitation |

The one legitimate exception is a **foundation story** that is itself independently valuable — a
dependency upgrade, an extraction that simplifies the current code, a migration that ships behind
no feature. Justify it in one line in the spec. "The other stories need it" is not the
justification; "this is worth merging even if the rest is cancelled" is.

### 3.3 Ordering and dependencies

Order the stories in the sequence they should be picked up, and say which ones genuinely depend on
an earlier one. Dependencies are allowed — a chain of five where each story blocks the next is not,
because that epic is a single deliverable wearing five hats, and §1 should have counted it as one.

### 3.4 Staged stories (`eager` only)

Splitting one oversized deliverable produces stories that are stages of the same capability. Each
stage must still satisfy §3.1, which for a not-yet-usable capability means shipping **behind a flag
or an unreferenced route**: merged, not yet reachable, and harmless. State the mechanism in the
story, otherwise the first stage ships a half-feature to production.

The last stage is the one that removes the flag. Never leave that step implicit — it is the step
that gets forgotten, and dead flags accumulate.

### 3.5 The epic itself

The epic is a container and a statement of intent. Its body carries the idea, the framing decisions,
the non-goals and the story list. It carries **no acceptance criteria of its own**: the epic is done
when its stories are, and criteria on both levels means the same requirement is checked twice and
drifts in one of the two places.

## 4. Acceptance criteria

Format follows `plan.acceptanceCriteria`. Default: `checklist`.

Criteria are written in `languages.ticket`, per story, and every one of them must be checkable by
someone who was not in the planning conversation. "Works correctly" is not a criterion.

### 4.1 `checklist`

```text
## Acceptance criteria

- [ ] {observable outcome, in the present tense, from the user's or caller's point of view}
- [ ] {the error or empty case, stated as what happens rather than what is prevented}
- [ ] {the boundary the framing dialogue settled — a limit, a permission, a format}
```

Aim for 3-6 items. One item is a story that has not been thought about; ten is a story that should
have been two. No item may depend on another story being merged first.

### 4.2 `gherkin`

```text
## Acceptance criteria

### Scenario: {what this scenario proves}
Given {the state that makes the scenario meaningful}
When {the single action under test}
Then {the observable outcome}
And {any further observable outcome}
```

One scenario per behaviour, 2-4 scenarios per story, including at least one non-happy path. Keep
one action in the `When` — two means two scenarios. Never write UI mechanics into the steps
("clicks the third button"): the scenario has to survive a redesign.

### 4.3 `none`

Write no criteria section at all. Do not degrade into a prose paragraph that is criteria in
disguise, and do not compensate elsewhere in the body — `none` is a deliberate choice by a team
whose definition of done lives somewhere else.

The **scope** section still states what the story delivers and what it does not. That is not
acceptance criteria; it is the story, and it is never optional.

## Usage

Step 5 of `SKILL.md` reads this file and applies §1, then §2, then §3, and returns:

| Returned | Shape | Consumer |
| --- | --- | --- |
| `verdict` | `single` / `epic` | `MSG_SIZING_VERDICT`, Step 6, Step 7 |
| `justification` | the §2 row that decided it, plus `D` and the mode in force | `MSG_SIZING_VERDICT`, the spec |
| `breakdown` | ordered list of `{title, deliverable, surfaces, depends_on}` | `MSG_SIZING_VERDICT`, the spec, Step 7 |
| `criteria_format` | the resolved `plan.acceptanceCriteria` value | §4, Step 7 |

§4 is applied later than the rest: the criteria are written per story as the spec's breakdown
section is filled in, and again by Step 7 when the ticket bodies are composed from it. Step 7 must
never re-derive criteria — it copies what the spec holds, so the tickets say what the user approved.

**If this file is missing on disk**: do not skip sizing. Fall back to the single question that
carries most of it — "how many independently mergeable deliverables is this?" — treat 1 as a single
story and 2 or more as an epic (the `balanced` row), say in one line that the sizing heuristic was
unavailable, and put the criteria in `checklist` form.
