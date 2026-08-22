# Spec template

Read this file in Step 2, before creating the spec, and again whenever a section is due to be
filled. It owns the spec's filename, its section structure, the order things are written in, and
the append that closes it after the tickets exist.

## 0. What this is not

**This is not `/magic:start`'s implementation plan.** The names are close enough to confuse a
reader, so the difference is worth being explicit about:

| | `/magic:plan` — this file | `/magic:start` |
| --- | --- | --- |
| Artefact | `.magic/spec-<slug>-<timestamp>.md` | `.magic/design-brief.md`, plus the plan in `references/plan-template-*.md` |
| Where | the **target repository root**, main checkout | inside the worktree it created |
| Question it answers | what should be built, and as how many tickets | how the ticket already filed gets implemented |
| Exists before | any ticket exists | the ticket exists and a branch is checked out |
| Audience | the human who approves the tickets, then the ticket bodies | the sub-agents that write the code |

So: no file lists to edit, no step-by-step implementation sequence, no branch name. A spec that
starts naming functions to write has drifted into the other skill's job, and it will be wrong by
the time anyone reads it — the codebase moves between planning and implementation.

## 1. Filename and location

```text
{TARGET_REPO_ROOT}/.magic/spec-{slug}-{timestamp}.md
```

- `{TARGET_REPO_ROOT}` is the root of the repository chosen in Step 2, in the **main checkout**.
  `/magic:plan` creates no worktree, so magic-start's per-worktree placement does not apply — and
  the path has to stay a main-checkout path, because `/magic:start` will later work from a worktree
  where an untracked `.magic/spec-*.md` does not appear.
- `{slug}` is derived from the idea: lower-cased, non-alphanumerics collapsed to hyphens, ~5 words
  or 30 characters.
- `{timestamp}` is `date +%Y%m%d-%H%M%S`.

**The timestamp is not cosmetic.** The slug comes from the idea, so planning the same idea twice on
the same repository yields the same filename — and the cloud row for a spec is keyed on a hash of
its path (#194), so the second session would silently overwrite the first, in the file *and* in the
cloud. It also gives `.magic/` a natural chronological sort, which is what makes a directory of
specs browsable.

**Never delete a pre-existing spec.** `/magic:start` deletes a stale `.magic/design-brief.md`
because a brief belongs to the ticket being started and a leftover one would be followed by
mistake. That reasoning does not transfer: an older `spec-*.md` on this repository is **a different
plan**, possibly one whose tickets are open right now. It is not a stale artefact of this session.
Leave every existing spec exactly where it is, and never overwrite one — the timestamp guarantees
this session writes its own file.

## 2. Written progressively

The spec is the live record of the session, not a report composed at the end. Create it in Step 2
with its headings and an empty body, then fill each section the moment its content is settled:

| Filled in | Section |
| --- | --- |
| Step 2 | header, `## Idea` |
| Step 3 | `## Codebase findings`, `## Related tickets` |
| Step 4 | `## Framing decisions` (one row per resolved question, as it is resolved) |
| Step 5 | `## Sizing`, `## Proposed tickets` |
| Step 6 | any edit the user asks for, in place |
| Step 7 | `## Created tickets` (append only) |

Two reasons this is not a preference. Issue #171 renders the spec as it fills, so a file that
appears complete only at the end shows the user nothing for the whole session. And a session that
is interrupted — a crash, a closed terminal, a lost connection — leaves behind everything that was
established up to that point instead of an empty file.

Never rewrite the file wholesale to add a section. Edit in place, keep the heading order below.

## 3. Language and headings

The body is written in the **spec** language from SKILL.md Step 0.2 — `languages.spec`, falling back
to the resolved ticket language. It follows the tickets by default, because this document is the
source text of their bodies and one language for both is what most repositories want.

When it is set differently, the spec wins for this file and Step 7 **translates it** into the ticket
language as it composes each body. What must not happen is the bodies being re-composed from the
conversation because the spec was in the "wrong" language: a translated body still says what the user
approved, a re-remembered one does not.

The **section headings stay verbatim and in English**, exactly as below — same rule as
`/magic:start`'s design brief, for the same reason. Step 7 locates the content it composes each
ticket body from by heading, and #171's renderer keys off them too; headings that shift with a
config value would break both.

## 4. Format — frozen

```text
# Spec — {idea title}

- Repository: {repo name} ({repo path})
- Tracker: {tracker target}
- Created: {ISO date}
- Status: drafting | awaiting approval | tickets created | abandoned

## Idea

{The idea as the user stated it, lightly cleaned up but not reinterpreted. Quote them where the
wording carries intent. This section is written before any exploration and is never revised
afterwards — what the user asked for and what we concluded are two different records.}

## Framing decisions

| Question | Decision | Why |
| --- | --- | --- |
| {the ambiguity} | {what was decided} | {the reason, in one line} |

{One row per question actually resolved with the user in Step 4, plus — on a Jira run — one row per
mandatory custom field answered there, its reason naming the issue type that required it. A decision
with no reason is a decision nobody can revisit six weeks later, and that Jira row is the record of
which value was sent to Jira and why, so the spec explains the created ticket on its own.}

### Non-goals

- {what this deliberately does not cover, and why}

## Codebase findings

- {finding} — `{path}`
- {existing pattern this should follow} — `{path}`
- {constraint discovered in the code, e.g. a schema, a limit, an existing abstraction}

{From Step 3's exploration. Facts with paths, not impressions. Anything that changed the shape of
the plan belongs here — this is what makes the sizing verdict auditable.}

## Related tickets

- {id}: {title} ({state}) — {relation: duplicate / overlaps / prior art / rejected before}

{`None found` when the duplicate check ran and found nothing. `Not checked` when
`plan.duplicateCheck` is off or the search failed — those are different facts and must not read
the same.}

## Sizing

- Verdict: {single story | epic + N stories}
- Deliverables counted: {D}
- Splitting mode: {conservative | balanced | eager}
- Justification: {the criterion that decided it}

## Proposed tickets

### {1}. {title}

- Delivers: {the one thing that ships}
- Surfaces: {api, ui, schema, …}
- Depends on: {an earlier story, or `nothing`}

{Scope: what is in, and explicitly what is out.}

#### Acceptance criteria

{In the `plan.acceptanceCriteria` format — see `references/sizing.md` §4. Omitted entirely when
the format is `none`.}

## Created tickets

| Ticket | Kind | Title | URL |
| --- | --- | --- | --- |
| {id} | epic \| story | {title} | {url} |

{Appended in Step 7, after creation. Absent until then — an empty table implies a failure that did
not happen.}
```

`{id}` is whatever the tracker issues: `#{number}` on GitHub, an issue key like `PROJ-123` on Jira.
The column is `Ticket` rather than `Number` because half the trackers this skill writes to do not
issue one.

On a single-story verdict, `## Proposed tickets` holds exactly one entry and there is no epic. Keep
the section heading plural anyway: the format is frozen, and Step 7 looks for it by name.

Leave a section with an explicit `none` rather than deleting it. A missing `## Related tickets` is
indistinguishable from a duplicate check that never ran.

## 5. The append after creation

Once the tickets exist, fill `## Created tickets` and set `Status: tickets created`. Do this even on
a partial failure — especially then, since the created identifiers are the only thing that cannot be
regenerated from the rest of the file. List what exists; the failures are reported to the user by
`MSG_PARTIAL_CREATION` and belong in the spec only as an absence.

This append is what turns the spec from a working document into a record: months later it is the
only place holding why the epic was cut this way, next to the tickets it produced.

## Usage

Step 2 of `SKILL.md` reads this file, creates the spec per §1 and writes the header and `## Idea`.
Steps 3-6 fill it per §2. Step 7 appends per §5.

**If this file is missing on disk**: still write a spec — the human review in Step 6 has nothing to
review without one. Use the §4 headings from memory, say in one line that the template was
unavailable so the structure may differ from other sessions, and continue.
