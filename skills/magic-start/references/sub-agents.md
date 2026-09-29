# Sub-agents for Step 5

Read by `SKILL.md` at the step that needs each section: Step 5.1 (exploration), Step 5.2.3 (plan review), Step 5.4B (multi-agent implementation) and Step 5.4.5 (simplify pass).

## 5.1: Codebase exploration

Evaluate whether codebase exploration is needed before launching a sub-agent.

**Skip exploration when ALL of these are true:**
- The ticket specifies exact files or components to modify
- The acceptance criteria are precise and self-contained (no ambiguity about what to change)
- The change is localized (e.g., update a string, add a field, tweak a config)

**Require exploration when ANY of these is true:**
- The ticket is high-level or vague (e.g., "improve performance", "add a new feature for X")
- You need to discover existing patterns, conventions, or architecture before implementing
- The ticket references components whose location or structure you don't know
- The change spans multiple modules or layers
- It's a full-stack task (multi-repo)
- A design brief exists (step 5.0 wrote `.magic/design-brief.md`) — the mockup's markup and classes must be located in the codebase

**If exploration is needed**: Launch an `Agent` (subagent_type=`Explore`) to explore the codebase. Request a structured summary: (1) project structure & framework, (2) config & stack, (3) existing patterns with file paths, (4) impacted files with current state, (5) cross-repo interactions if full-stack. Target 5-15 files, return summary only — not raw file contents. Use the sub-agent's returned summary to create the implementation plan in step 5.2.

If `.magic/design-brief.md` exists, add to the prompt: read it first (give the absolute path) and report which existing components, styles or tokens match the referenced design.

## 5.2.3: Plan review

Launch an `Agent` to review the implementation plan. Provide: ticket summary (ID, title, description, acceptance criteria), codebase exploration summary (from step 5.1), and the full proposed plan. When `.magic/design-brief.md` exists, give its absolute path and instruct the agent to read it.

The agent reviews the plan on these axes:
- **Completeness**: Does the plan cover all acceptance criteria?
- **Step ordering**: Are dependencies between steps respected?
- **Missing files**: Are there impacted files forgotten (tests, types, migrations, configs)?
- **Over-engineering**: Does the plan do more than what the ticket asks for?
- **Design fidelity** (only when a brief exists): Does the plan reference each resolved design reference explicitly, and does it reuse the mockup's markup and classes instead of inventing a layout?

The agent returns a short list of actionable suggestions, or explicitly states the plan looks good.

## 5.2.5: Dispatcher decision rules

**Decision rules** (in order of priority):

1. **Multi-agent if**: Multiple repos are involved (strong signal — each repo gets its own agent)
2. **Multi-agent if**: Single repo with > 8 files to modify/create AND steps are parallelizable (no dependency between them)
3. **Solo otherwise**: Steps are sequential, few files, or tightly coupled changes

## 5.4B: Multi-agent implementation

Each subagent prompt includes (keep it concise — summary, not the full ticket dump):
- Ticket summary: ID, title, and a 2-3 sentence description of what to achieve
- Acceptance criteria (if any)
- Assigned plan steps (copy the relevant steps verbatim from the plan)
- Worktree path to work in
- If `.magic/design-brief.md` exists: its absolute path in that worktree, with the instruction to read it before writing any UI code and to follow its `Mandatory rule` section
- Constraints: no commits, follow project patterns, use `Edit`/`Write`
- Note: subagents have access to Bash, Read, Write, Edit, Glob, Grep only (no MCP tools)

After all subagents complete:
1. Review changes from each subagent
2. Check for conflicts/inconsistencies
3. Fix integration issues if needed

## 5.4.5: Simplify pass

1. Collect the list of changed files:

```bash
cd {WORKTREE_PATH}
git diff --name-only HEAD
git ls-files --others --exclude-standard
```

2. If no files changed, skip this step silently.
3. Display `MSG_SIMPLIFY`.
4. Launch an `Agent` with: worktree path, changed files list (only these modifiable), instruction to invoke `/simplify` (may explore full codebase but modify only changed files). If `.magic/design-brief.md` exists, give its absolute path as read-only context: simplification must not drop markup or classes required by the mockup.
5. If no issues found, continue silently.
