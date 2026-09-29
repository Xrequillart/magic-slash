/**
 * The skills Magic Slash ships, in the order the development cycle runs them.
 *
 * The desktop's one copy of the list that code builds on: the updater downloads
 * these folders, and the default workflow (defaultFlow.ts) is derived from them.
 * Other surfaces still keep their own copy (see skills-registry.test.ts, which
 * holds every copy to the folders under `skills/`). Pure, no node import, so a
 * renderer may import it too.
 */
export const SKILLS = ['magic-plan', 'magic-plan-change', 'magic-start', 'magic-continue', 'magic-commit', 'magic-pr', 'magic-review', 'magic-resolve', 'magic-done']

/**
 * Side doors off the cycle rather than steps of it: /magic:plan-change reworks a
 * plan already filed, /magic:continue resumes a ticket already started, and
 * /magic:review reviews a pull request, your own or a colleague's, so what follows
 * it depends on whose PR it is rather than on a flow. None is a node of the default
 * workflow. They are entered by hand, from wherever the user is, and a flow that
 * "suggested" them after every step would be noise.
 */
export const SIDE_SKILLS = ['magic-plan-change', 'magic-continue', 'magic-review']
