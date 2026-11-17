/**
 * The skills Magic Slash ships, in the order the development cycle runs them.
 *
 * The desktop's one copy of the list that code builds on: the updater downloads
 * these folders, and the default workflow (defaultFlow.ts) is derived from them.
 * Other surfaces still keep their own copy (see skills-registry.test.ts, which
 * holds every copy to the folders under `skills/`). Pure, no node import, so a
 * renderer may import it too.
 */
export const SKILLS = ['magic-plan', 'magic-plan-change', 'magic-start', 'magic-continue', 'magic-commit', 'magic-pr', 'magic-auto-review', 'magic-review', 'magic-resolve', 'magic-done', 'magic-action']

/**
 * Side doors off the cycle rather than steps of it: /magic:plan-change reworks a
 * plan already filed, /magic:continue resumes a ticket already started, and
 * /magic:review reviews a colleague's pull request, so what follows it is theirs to
 * decide rather than a flow's (reviewing your own PR is /magic:auto-review, a step of
 * the cycle). None is a node of the default
 * workflow. They are entered by hand, from wherever the user is, and a flow that
 * "suggested" them after every step would be noise.
 */
export const SIDE_SKILLS = ['magic-plan-change', 'magic-continue', 'magic-review']

/**
 * Shipped, but never typed by the user nor offered as a step: `magic-action` carries out a
 * workflow's actions (workflow/actions.ts), invoked by the skill that reached one. Its
 * SKILL.md says `user-invocable: false`, so it stays out of the `/` menu, and it is no node
 * of any flow: an action is a card of its own.
 */
export const HIDDEN_SKILLS = ['magic-action']
