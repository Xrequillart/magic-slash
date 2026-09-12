/**
 * The entries, their families, and nothing else.
 *
 * A module of its own because both directions need it: `Shell` builds the rail and
 * the router from it, and each entry names the components it is BUILT ON so the
 * chips under its title can be clicked through to. Putting the labels in `Shell`
 * beside the components would make that second import a cycle.
 */
export type EntryId =
  | 'colors'
  | 'icon'
  | 'text'
  | 'progress'
  | 'card'
  | 'avatar'
  | 'buttonicon'
  | 'label'
  | 'banner'
  | 'contextagentcard'

export const ENTRY_LABELS: Record<EntryId, string> = {
  colors: 'Colours',
  icon: 'Icon',
  progress: 'ProgressBar',
  card: 'Card',
  buttonicon: 'ButtonIcon',
  contextagentcard: 'ContextAgentCard',
  text: 'Text',
  avatar: 'Avatar',
  label: 'Label',
  banner: 'Banner',
}

/**
 * The tiers, in the order a component is built up through them.
 *
 * Composition is the ONLY rule: a tier may use the tiers above it and never its own
 * or the ones below. `Banner` draws an `Icon` and a `Text` and is therefore secondary.
 * A tier is not a size or an importance ranking — it is a position in the dependency
 * graph, which is what makes it checkable rather than a matter of taste.
 *
 * `Label` MOVED for exactly that reason. It was primary while it drew an `Icon` and a
 * `Text`; giving it an `avatar` made it draw an `Avatar` too, which is itself primary,
 * and a component cannot be the same tier as something it is built from. Nobody
 * argued about it — the graph said so.
 *
 * This is atomic design with different words: foundation / primary / secondary /
 * tertiary against Brad Frost's atoms / molecules / organisms. Worth knowing the
 * other vocabulary exists, since every design system article uses it — but these
 * names say the same thing and read better in French, so they stay until someone
 * prefers the originals.
 *
 * EMPTY TIERS ARE NOT SHOWN. Three components are extracted and the rail says so;
 * a `Primary` heading over nothing would be a promise the folder has not kept.
 */
export interface Family {
  label: string
  /** One line, under the heading, saying what belongs in it. */
  note: string
  entries: EntryId[]
}

/**
 * The one entry that is not a component and sits above the families.
 *
 * A palette is not something you compose with — it is what everything below is made
 * OF — so filing it under a tier would put it in a sequence it has no place in.
 */
export const FOUNDATION_PAGES: EntryId[] = ['colors']

export const FAMILIES: Family[] = [
  {
    label: 'Foundation',
    note: 'Draws itself. Depends on nothing.',
    entries: ['icon', 'text', 'progress', 'card'],
  },
  {
    label: 'Primary',
    note: 'One control, built from foundations.',
    entries: ['avatar', 'buttonicon'],
  },
  {
    label: 'Secondary',
    note: 'Several pieces saying one thing.',
    entries: ['label', 'banner'],
  },
  {
    label: 'Tertiary',
    note: 'A whole region of a page.',
    entries: ['contextagentcard'],
  },
]

/** What each entry's row says under its name. */
export const ENTRY_NOTES: Record<EntryId, string> = {
  colors: 'The hexes and the roles, kept apart',
  progress: 'A filled track, green until told otherwise',
  card: 'A raised panel, and nothing else',
  buttonicon: 'A control that is only a mark',
  contextagentcard: 'What an agent is spending',
  icon: 'Every glyph, five sizes, three tones',
  text: 'Cera Pro, six sizes, four weights',
  avatar: 'A face, or the icon when there is none',
  label: 'Names a thing, on a tinted plate',
  banner: 'States a fact about a surface',
}
