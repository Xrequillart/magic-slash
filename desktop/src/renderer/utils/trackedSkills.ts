/**
 * The skills the desktop declares as the development cycle, in the order they run —
 * plan, start, pick back up, commit, ship, review, fix the review, close.
 *
 * A FIXED list, though the RPCs that count runs return every skill that has ever run:
 * the point is that the cycle has a known shape, so a hole in it ("plenty of commits,
 * no PRs") is visible as a shape rather than as a number to compare by hand.
 *
 * `skill` is what the PreToolUse hook logs; `label` is what a human calls it. Not
 * translated, and it must not be: these are command names the user types.
 *
 * WHY THIS FILE HAS NO IMPORTER TODAY. It was the private constant of the Team page's
 * skill-tiles row, which went out with that page. It survives on its own because it is
 * one of the eight copies of the shipped skill list that `main/skills-registry.test.ts`
 * holds together — the webapp keeps the same list in `webapp/lib/skills.ts`, and the
 * two builds have no code path between them, so the only thing stopping them drifting
 * is that test reading both as text. Deleting this would take the desktop side of that
 * guard with it. Keep it in step with `skills/` and with the webapp; a new skill is a
 * new line here.
 */
export const TRACKED_SKILLS: { skill: string; label: string }[] = [
  { skill: 'magic-plan', label: 'plan' },
  { skill: 'magic-start', label: 'start' },
  { skill: 'magic-continue', label: 'continue' },
  { skill: 'magic-commit', label: 'commit' },
  { skill: 'magic-pr', label: 'pr' },
  { skill: 'magic-review', label: 'review' },
  { skill: 'magic-resolve', label: 'resolve' },
  { skill: 'magic-done', label: 'done' },
]
