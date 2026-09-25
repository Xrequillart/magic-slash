'use client'

import { useState } from 'react'
import { Select, type SelectOption } from '@ds/desktop'
import { ArrowDownWideNarrow, FolderGit2, Shield, User } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const REPOS: SelectOption[] = [
  { value: 'magic-slash', label: 'magic-slash', color: '#A855F7' },
  { value: 'poppins-pex', label: 'poppins-pex', color: '#3B82F6' },
  { value: 'fluency-test', label: 'fluency-test', color: '#64748B' },
]

const EPICS: SelectOption[] = [
  { value: 'PER-12', label: 'Onboarding parcours parent', color: '#22C55E' },
  { value: 'PER-48', label: 'Refonte du tableau de bord', color: '#F43F5E' },
  { value: 'PER-91', label: 'Facturation', color: '#06B6D4' },
]

const SORTS: SelectOption[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'priority', label: 'By priority' },
]

const ROLES: SelectOption[] = [
  { value: 'user', label: 'User', icon: User },
  { value: 'admin', label: 'Admin', icon: Shield },
]

/** A hint is for a list with the room for one. The org's roles are two words wide. */
const AGENTS: SelectOption[] = [
  { value: 'coder', label: 'Coder', hint: 'Writes the code and opens the pull request', icon: User },
  { value: 'planner', label: 'Planner', hint: 'Turns an idea into a spec and its tickets', icon: Shield },
]

const LANGUAGES: SelectOption[] = [
  { value: 'en', label: 'English', flag: 'en' },
  { value: 'fr', label: 'Français', flag: 'fr' },
]

const FORMATS: SelectOption[] = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'angular', label: 'Angular' },
  { value: 'gitmoji', label: 'Gitmoji' },
  { value: 'none', label: 'Free form' },
]

const PROPS: PropRow[] = [
  {
    name: 'value · onChange',
    type: 'string · (value: string) => void',
    required: true,
    description:
      'Controlled, with no internal state of its own: a picker that remembered its own value could disagree with the setting it is drawing. The empty string is nothing picked, which is what the clear entry sets and where a value that has left the list lands.',
  },
  {
    name: 'options',
    type: 'SelectOption[]',
    required: true,
    description:
      '{ value, label, hint?, color?, icon?, flag?, disabled? }. The mark is DATA and never a node — pass a node per option and one list can draw two different kinds of mark, which is the bug this shape makes impossible. A hint grows the ROW and never the trigger: a control two lines tall in a table of members is a control that no longer lines up with the rows above it.',
  },
  {
    name: 'placeholder',
    type: 'string',
    description:
      'What the trigger says when the value matches no option. Not a default and not an entry: it is reachable when a picker with a clearLabel has been cleared, and when the value has LEFT the list under it — a repository dropped from the config, a branch deleted on the remote. A control naming something no longer on offer would narrow a page to nothing with no way to see why.',
  },
  {
    name: 'clearLabel',
    type: 'string',
    description:
      'The panel’s “no filter” entry, and the whole difference between a picker that can be switched off and one that cannot. It leads the list, because it is the entry people reach for after having picked wrongly. A sort passes none — a list is always in SOME order.',
  },
  {
    name: 'width',
    type: 'number',
    description:
      'A fixed width in pixels, for a control that must not resize with its own value: a table column of pickers, a filter bar whose widths are decided across the row. Omitted is the settings case and the better default — the control fills what it is in and the panel measures it, so the two agree without a number anybody has to keep in step with a class.',
  },
  {
    name: 'marker',
    type: "'dot' | 'repo'",
    fallback: "'dot'",
    description:
      'How an option’s colour is drawn: a plain dot, or the repository tile the rest of the app draws a repository with. A property of the LIST and not of any entry in it, because every option of the repository picker is a repository.',
  },
  {
    name: 'active',
    type: 'boolean',
    fallback: 'false',
    description:
      'The control is away from its default, and tinted for it — so a page showing a fraction of its rows says so from the control rather than only from the gap where the other rows were. The caller’s and not inferred: what counts as a default is the page’s question, and the Tasks repository picker has none to be away from.',
  },
  {
    name: 'icon · size · disabled · ariaLabel · className',
    type: 'IconComponent · SelectSize · boolean · string · string',
    description:
      'A glyph on the trigger, for a picker whose values do not name their own subject. The heights are Input’s ladder — sm/md/lg — because a picker and a box in one row are the same object. ariaLabel is for a control with no visible label beside it.',
  },
]

export function SelectEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [repo, setRepo] = useState('magic-slash')
  const [epic, setEpic] = useState('')
  const [sort, setSort] = useState('recent')
  const [role, setRole] = useState('user')
  const [agent, setAgent] = useState('coder')
  const [language, setLanguage] = useState('fr')
  const [format, setFormat] = useState('angular')

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Select" uses={usesOf('select')} onOpen={onOpen}>
        The app’s one picker: a control that names what it is set to, and a list under it.
      </EntryHeader>

      <EntrySection
        title="It replaces a native select, and it had to"
        note="Two reasons, both worked out independently at four call sites. An <option> can hold TEXT and nothing else, so the colour dot that identifies a repository everywhere else on a page is not a styling problem inside a native select but an impossibility. And macOS draws that popup itself, in its own colours, ignoring the theme the rest of the window is painted in — on six of the app’s eight themes the list that opens is a different product."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-3">
          <Specimen label="the board’s repository picker — a tile for a mark">
            <Select
              value={repo}
              options={REPOS}
              onChange={setRepo}
              placeholder="Pick a repository"
              width={208}
              marker="repo"
            />
          </Specimen>
          <Specimen label="an epic — a dot, and a way back out">
            <Select
              value={epic}
              options={EPICS}
              onChange={setEpic}
              placeholder="All epics"
              clearLabel="All epics"
              width={192}
              active={!!epic}
            />
          </Specimen>
          <Specimen label="a sort — a glyph, because its values name no subject">
            <Select
              value={sort}
              options={SORTS}
              onChange={setSort}
              width={152}
              icon={ArrowDownWideNarrow}
              active={sort !== SORTS[0].value}
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          So four files grew their own — the Tasks bar’s <code>FilterSelect</code>, the
          Plans bar’s copy of it, <code>LanguageSelect</code>, <code>RoleSelect</code> —
          and between them they held four spellings of the same trigger and four of the
          same panel. The copy on Plans carried a docblock naming the fix and asking
          whoever came next to do it rather than grow a fifth. Eighteen native selects
          stood in Settings beside those four; a picker the design system owns is the only
          way the two stop being different objects.
        </p>
      </EntrySection>

      <EntrySection
        title="The mark is data"
        note="An option can carry a COLOUR, a GLYPH or a FLAG, and never a node. That is the rule Banner and AccountCard already made, and it is what keeps a list coherent: pass a node per option and one list can draw two different kinds of mark. How a colour is drawn — a plain dot, or the repository tile — is the list’s and not the entry’s, because every option of the repository picker is a repository."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-3">
          <Specimen label="a glyph per entry — the org's two roles, two words wide">
            <Select value={role} options={ROLES} onChange={setRole} width={112} />
          </Specimen>
          <Specimen label="a hint under each label, where the panel has the room">
            <Select value={agent} options={AGENTS} onChange={setAgent} width={240} />
          </Specimen>
          <Specimen label="a flag — impossible inside an option">
            <Select value={language} options={LANGUAGES} onChange={setLanguage} width={208} />
          </Specimen>
          <Specimen label="a repository, as a tile">
            <Select value={repo} options={REPOS} onChange={setRepo} width={208} marker="repo" />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The hint grows the <em>row</em> and never the trigger. What the trigger shows is
          the label alone, which is the answer; the hint is the explanation, and an
          explanation belongs where you are choosing rather than where you have chosen —
          which is also what keeps a column of pickers in a members table lined up.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It needs the width to pay for it, though. A sentence of prose in a control 112
          pixels wide wraps to three lines and turns a list of two choices into a
          paragraph to read, which is why the org’s roles carry none: <code>User</code>{' '}
          and <code>Admin</code> say what they are.
        </p>
      </EntrySection>

      <EntrySection
        title="A width, or the room it is given"
        note="A fixed width is for a control that must not resize with its own value: a table column of pickers, a filter bar whose widths are decided across the row. Omitted is the settings case and the better default — the control fills whatever it is in, and the panel measures the trigger, so the two agree without a number anybody has to keep in step with a class."
      >
        <Stage theme={theme}>
          <Specimen label="no width — the row decides, and the panel follows">
            <div className="flex items-center justify-between gap-6">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">Commit format</div>
                <p className="mt-0.5 text-xs text-text-secondary/50">
                  How a commit message is shaped on this repository
                </p>
              </div>
              <div className="w-52 shrink-0">
                <Select value={format} options={FORMATS} onChange={setFormat} />
              </div>
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Select } from '@ds/desktop'

<Select
  value={value.configKey}
  options={repos.map((repo) => ({ value: repo.configKey, label: repo.name, color: repo.color }))}
  onChange={(configKey) => onChange({ ...value, configKey })}
  placeholder={t('tasks.filter.pickRepo')}
  width={REPO_WIDTH}
  marker="repo"
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>SelectIcon</code> is the same idea with an icon-only trigger, for a
          toolbar where there is no room for a word. <code>Menu</code> is a list of{' '}
          <em>commands</em> — things that happen when you press them — where every row
          here is a <em>value</em> the control is about to hold. <code>Status</code> opens
          a list too, and it is a state changing rather than a setting being chosen.
        </p>
      </EntrySection>
    </article>
  )
}
