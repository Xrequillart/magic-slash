'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DESKTOP_THEMES, DESKTOP_THEME_IDS, type DesktopTheme, type DesktopThemeId } from '@/lib/desktopTheme'
import { AgentEntry } from './entries/AgentEntry'
import { AvatarEntry } from './entries/AvatarEntry'
import { AvatarPickerEntry } from './entries/AvatarPickerEntry'
import { AccountCardEntry } from './entries/AccountCardEntry'
import { BranchCardEntry } from './entries/BranchCardEntry'
import { ButtonEntry } from './entries/ButtonEntry'
import { ButtonIconEntry } from './entries/ButtonIconEntry'
import { CardEntry } from './entries/CardEntry'
import { KbdEntry } from './entries/KbdEntry'
import { SelectEntry } from './entries/SelectEntry'
import { OrganizationCardEntry } from './entries/OrganizationCardEntry'
import { FactListEntry } from './entries/FactListEntry'
import { LanguageCardEntry } from './entries/LanguageCardEntry'
import { SettingRowEntry } from './entries/SettingRowEntry'
import { SettingsCardEntry } from './entries/SettingsCardEntry'
import { DisclosureCardEntry } from './entries/DisclosureCardEntry'
import { HealthCardEntry } from './entries/HealthCardEntry'
import { RepairListEntry } from './entries/RepairListEntry'
import { NoticeCardEntry } from './entries/NoticeCardEntry'
import { BreakdownListEntry } from './entries/BreakdownListEntry'
import { BudgetMeterEntry } from './entries/BudgetMeterEntry'
import { NoteCardEntry } from './entries/NoteCardEntry'
import { SkillCardEntry } from './entries/SkillCardEntry'
import { SkillsRailEntry } from './entries/SkillsRailEntry'
import { SkillBudgetEntry } from './entries/SkillBudgetEntry'
import { SkillsOverviewEntry } from './entries/SkillsOverviewEntry'
import { TicketCardEntry } from './entries/TicketCardEntry'
import { BoardColumnEntry } from './entries/BoardColumnEntry'
import { TaskBoardEntry } from './entries/TaskBoardEntry'
import { FilterBarEntry } from './entries/FilterBarEntry'
import { TrackerBadgeEntry } from './entries/TrackerBadgeEntry'
import { CopyButtonEntry } from './entries/CopyButtonEntry'
import { CommandChipEntry } from './entries/CommandChipEntry'
import { ChipInputEntry } from './entries/ChipInputEntry'
import { StickyBarEntry } from './entries/StickyBarEntry'
import { MetaBlockEntry } from './entries/MetaBlockEntry'
import { CommentCardEntry } from './entries/CommentCardEntry'
import { EmptyStateEntry } from './entries/EmptyStateEntry'
import { FormFieldEntry } from './entries/FormFieldEntry'
import { ImageFieldEntry } from './entries/ImageFieldEntry'
import { SkillHeaderEntry } from './entries/SkillHeaderEntry'
import { SkillIntroEntry } from './entries/SkillIntroEntry'
import { OutputSampleEntry } from './entries/OutputSampleEntry'
import { RateLimitBarEntry } from './entries/RateLimitBarEntry'
import { UsageTableEntry } from './entries/UsageTableEntry'
import { CommitCardEntry } from './entries/CommitCardEntry'
import { CommitLineEntry } from './entries/CommitLineEntry'
import { TimelineLineEntry } from './entries/TimelineLineEntry'
import { DiffStatEntry } from './entries/DiffStatEntry'
import { FileModifiedLineEntry } from './entries/FileModifiedLineEntry'
import { UnCommittedChangesCardEntry } from './entries/UnCommittedChangesCardEntry'
import { CheckListEntry } from './entries/CheckListEntry'
import { CollapsibleLineEntry } from './entries/CollapsibleLineEntry'
import { DecisionListEntry } from './entries/DecisionListEntry'
import { SizingCardEntry } from './entries/SizingCardEntry'
import { SpecHeaderCardEntry } from './entries/SpecHeaderCardEntry'
import { TabStripEntry } from './entries/TabStripEntry'
import { TallyEntry } from './entries/TallyEntry'
import { ReviewThreadLineEntry } from './entries/ReviewThreadLineEntry'
import { ChecklistCardEntry } from './entries/ChecklistCardEntry'
import { FieldTableEntry } from './entries/FieldTableEntry'
import { SectionHeaderEntry } from './entries/SectionHeaderEntry'
import { ProfileCardEntry } from './entries/ProfileCardEntry'
import { PullRequestCardEntry } from './entries/PullRequestCardEntry'
import { RepositoryCardEntry } from './entries/RepositoryCardEntry'
import { ItemEntry } from './entries/ItemEntry'
import { PlanItemEntry } from './entries/PlanItemEntry'
import { RepositoryItemEntry } from './entries/RepositoryItemEntry'
import { RepositoryListEntry } from './entries/RepositoryListEntry'
import { RepoPageHeaderEntry } from './entries/RepoPageHeaderEntry'
import { ScriptCardEntry } from './entries/ScriptCardEntry'
import { SidebarAgentCoderInfoEntry } from './entries/SidebarAgentCoderInfoEntry'
import { SidebarAgentPlannerInfoEntry } from './entries/SidebarAgentPlannerInfoEntry'
import { SpecCardEntry } from './entries/SpecCardEntry'
import { ModalEntry } from './entries/ModalEntry'
import { RepositorySelectorEntry } from './entries/RepositorySelectorEntry'
import { ColorsEntry } from './entries/ColorsEntry'
import { ContextAgentCardEntry } from './entries/ContextAgentCardEntry'
import { BannerEntry } from './entries/BannerEntry'
import { EditableTextEntry } from './entries/EditableTextEntry'
import { InputEntry } from './entries/InputEntry'
import { HeaderRepoCardEntry } from './entries/HeaderRepoCardEntry'
import { IconEntry } from './entries/IconEntry'
import { LabelEntry } from './entries/LabelEntry'
import { LoaderEntry } from './entries/LoaderEntry'
import { MenuSidebarEntry } from './entries/MenuSidebarEntry'
import { MenuSidebarItemEntry } from './entries/MenuSidebarItemEntry'
import { ProgressBarEntry } from './entries/ProgressBarEntry'
import { MenuEntry } from './entries/MenuEntry'
import { ShareButtonEntry } from './entries/ShareButtonEntry'
import { ModalHeaderEntry } from './entries/ModalHeaderEntry'
import { SelectIconEntry } from './entries/SelectIconEntry'
import { AppTitleBarEntry } from './entries/AppTitleBarEntry'
import { SidebarEntry } from './entries/SidebarEntry'
import { UpdateDialogEntry } from './entries/UpdateDialogEntry'
import { WhatsNewDialogEntry } from './entries/WhatsNewDialogEntry'
import { ToggleButtonEntry } from './entries/ToggleButtonEntry'
import { StepperEntry } from './entries/StepperEntry'
import { ControlCenterEntry } from './entries/ControlCenterEntry'
import { SetupStatusCardEntry } from './entries/SetupStatusCardEntry'
import { ThemeGridEntry } from './entries/ThemeGridEntry'
import { ThemePreviewGridEntry } from './entries/ThemePreviewGridEntry'
import { StatusEntry } from './entries/StatusEntry'
import { SwitchEntry } from './entries/SwitchEntry'
import { TextEntry } from './entries/TextEntry'
import { TitleAgentCardEntry } from './entries/TitleAgentCardEntry'
import { UsageClaudeCodeCardEntry } from './entries/UsageClaudeCodeCardEntry'
import { ENTRY_LABELS, FAMILIES, FOUNDATION_PAGES, type EntryId } from './entries/ids'

/**
 * The desktop app's design system: a rail of components on the left, one of them
 * on the right.
 *
 * A rail rather than the single scrolling page `/design-system/webapp` uses, and the
 * difference is not taste. That page documents a SCALE — shadows, radii, edges —
 * where the whole point is seeing twenty cards at once and catching the rung that
 * sags. This one documents COMPONENTS, extracted one at a time into
 * `design-system/desktop/`, and a component wants the page to itself: its
 * variants, its layouts, its props, with nothing else competing.
 *
 * Everything under `/design-system` is the REAL component, imported from the
 * shared folder that the Electron app compiles too. There is no copy of a banner
 * on this site to fall out of date with the one in the app.
 *
 * THE RAIL LISTS ONLY WHAT EXISTS. It carried a second half naming the components
 * still inside the app, as a migration map; that list is gone. A rail is a way
 * around a thing, and half of it leading nowhere made every row look uncertain —
 * the backlog belongs in issues, not in the navigation.
 */

/**
 * Every entry's component. The ids, labels, notes and families live in
 * `entries/ids.ts`, which the entries themselves read too — a `Banner` naming
 * `Icon` in its "built on" chips would otherwise have to import this module and
 * close a cycle.
 */
const ENTRIES: Record<
  EntryId,
  (props: { theme: DesktopTheme; onOpen?: (id: string) => void }) => JSX.Element
> = {
  colors: ColorsEntry,
  icon: IconEntry,
  text: TextEntry,
  progress: ProgressBarEntry,
  loader: LoaderEntry,
  card: CardEntry,
  button: ButtonEntry,
  buttonicon: ButtonIconEntry,
  menu: MenuEntry,
  sharebutton: ShareButtonEntry,
  modalheader: ModalHeaderEntry,
  selecticon: SelectIconEntry,
  editabletext: EditableTextEntry,
  input: InputEntry,
  contextagentcard: ContextAgentCardEntry,
  headerrepocard: HeaderRepoCardEntry,
  menusidebar: MenuSidebarEntry,
  usageclaudecodecard: UsageClaudeCodeCardEntry,
  titleagentcard: TitleAgentCardEntry,
  menusidebaritem: MenuSidebarItemEntry,
  sidebar: SidebarEntry,
  apptitlebar: AppTitleBarEntry,
  updatedialog: UpdateDialogEntry,
  whatsnewdialog: WhatsNewDialogEntry,
  togglebutton: ToggleButtonEntry,
  stepper: StepperEntry,
  tabstrip: TabStripEntry,
  controlcenter: ControlCenterEntry,
  setupstatuscard: SetupStatusCardEntry,
  themegrid: ThemeGridEntry,
  themepreviewgrid: ThemePreviewGridEntry,
  avatar: AvatarEntry,
  avatarpicker: AvatarPickerEntry,
  accountcard: AccountCardEntry,
  kbd: KbdEntry,
  select: SelectEntry,
  organizationcard: OrganizationCardEntry,
  factlist: FactListEntry,
  languagecard: LanguageCardEntry,
  settingrow: SettingRowEntry,
  settingscard: SettingsCardEntry,
  disclosurecard: DisclosureCardEntry,
  healthcard: HealthCardEntry,
  repairlist: RepairListEntry,
  noticecard: NoticeCardEntry,
  breakdownlist: BreakdownListEntry,
  budgetmeter: BudgetMeterEntry,
  notecard: NoteCardEntry,
  skillcard: SkillCardEntry,
  skillsrail: SkillsRailEntry,
  skillbudget: SkillBudgetEntry,
  skillsoverview: SkillsOverviewEntry,
  ticketcard: TicketCardEntry,
  boardcolumn: BoardColumnEntry,
  taskboard: TaskBoardEntry,
  filterbar: FilterBarEntry,
  trackerbadge: TrackerBadgeEntry,
  copybutton: CopyButtonEntry,
  commandchip: CommandChipEntry,
  chipinput: ChipInputEntry,
  stickybar: StickyBarEntry,
  metablock: MetaBlockEntry,
  commentcard: CommentCardEntry,
  emptystate: EmptyStateEntry,
  formfield: FormFieldEntry,
  imagefield: ImageFieldEntry,
  skillheader: SkillHeaderEntry,
  skillintro: SkillIntroEntry,
  outputsample: OutputSampleEntry,
  ratelimitbar: RateLimitBarEntry,
  usagetable: UsageTableEntry,
  label: LabelEntry,
  status: StatusEntry,
  switch: SwitchEntry,
  branchcard: BranchCardEntry,
  commitline: CommitLineEntry,
  commitcard: CommitCardEntry,
  timelineline: TimelineLineEntry,
  diffstat: DiffStatEntry,
  filemodifiedline: FileModifiedLineEntry,
  uncommittedchangescard: UnCommittedChangesCardEntry,
  checklist: CheckListEntry,
  collapsibleline: CollapsibleLineEntry,
  decisionlist: DecisionListEntry,
  sizingcard: SizingCardEntry,
  specheadercard: SpecHeaderCardEntry,
  tally: TallyEntry,
  reviewthreadline: ReviewThreadLineEntry,
  pullrequestcard: PullRequestCardEntry,
  checklistcard: ChecklistCardEntry,
  fieldtable: FieldTableEntry,
  sectionheader: SectionHeaderEntry,
  profilecard: ProfileCardEntry,
  repositorycard: RepositoryCardEntry,
  item: ItemEntry,
  repositoryitem: RepositoryItemEntry,
  repositorylist: RepositoryListEntry,
  repopageheader: RepoPageHeaderEntry,
  planitem: PlanItemEntry,
  scriptcard: ScriptCardEntry,
  sidebaragentcoderinfo: SidebarAgentCoderInfoEntry,
  sidebaragentplannerinfo: SidebarAgentPlannerInfoEntry,
  speccard: SpecCardEntry,
  modal: ModalEntry,
  repositoryselector: RepositorySelectorEntry,
  banner: BannerEntry,
  agent: AgentEntry,
}

/**
 * ONE ROW OF THE RAIL: a name, and nothing else.
 *
 * NO DESCRIPTION, on any row, selected or not. Every row used to carry a sentence under
 * its name — 42 of them in a 256px column, which is a page of prose pretending to be a
 * menu. For one iteration the sentence survived on the active row alone; it is gone from
 * there too, because the entry it described is already open on the right with its own
 * heading and its own paragraph. A rail holds names.
 *
 * THE SELECTED ROW IS THE ONLY COLOUR ON THE RAIL: the brand fill a primary button wears
 * on the marketing site. Everything else is ink, muted and a hairline, so the one thing
 * that has to be findable at a glance is the only thing that is loud.
 */
function Row({
  id,
  active,
  indent = false,
  onSelect,
}: {
  id: EntryId
  active: boolean
  /**
   * Inside a family, so it lines up with the heading it belongs to rather than to the left
   * of it — the chevron pushes the heading in by 18px and nothing used to push the rows.
   */
  indent?: boolean
  onSelect: (id: EntryId) => void
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      aria-current={active ? 'page' : undefined}
      /* `flex` and not `block`: a bare `<span>` in a block button is an inline box that
         inherits the page's line-height, which put 5px of dead space on every one of 42
         rows. A flex item is sized by its own content. */
      className={`flex w-full items-center rounded-button py-1.5 pr-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        indent ? 'pl-[30px]' : 'pl-3'
      } ${active ? 'bg-brand' : 'hover:bg-black/[0.04]'}`}
    >
      <span
        className={`font-display text-[13px] font-medium ${active ? 'text-white' : 'text-ink/80'}`}
      >
        {ENTRY_LABELS[id]}
      </span>
    </button>
  )
}

export function Shell() {
  // `midnight` and not `dark`: the app's default is `dark`, but a near-black ground
  // flatters a tint — every one of the four reads on it. Midnight is the harder
  // ground and the one most people actually run, so it is the honest thing to open
  // on. The eight are one click away regardless.
  const [theme, setTheme] = useState<DesktopThemeId>('midnight')
  const [entry, setEntry] = useState<EntryId>('colors')

  /**
   * Which families are folded. Open is the default and this holds the exceptions,
   * so a family added to `FAMILIES` shows up rather than hiding until someone
   * clicks it.
   */
  const [folded, setFolded] = useState<string[]>([])
  const toggle = (label: string) =>
    setFolded((f) => (f.includes(label) ? f.filter((l) => l !== label) : [...f, label]))

  const shown = FAMILIES.filter((family) => family.entries.length > 0)

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        {/* The rail. Sticky on a wide screen, a plain block above the content on a
            narrow one — a 256px column beside a props table does not survive being
            squeezed, and this page is read on a laptop anyway. */}
        {/* THE RAIL IS A MENU, NOT A DOCUMENT, and that is the whole of this redesign.
            Every row used to carry its NAME and a SENTENCE at close to the same weight:
            42 entries over 2 598px of scroll in a 1 000px window, so eleven of them were
            visible at a time and none of them scanned. The sentences are still here — on
            the row you are standing on, which is the one you are reading.

            THE FACE AND THE SHAPE ARE THE MARKETING SITE'S. `font-display` at 13px is what
            `NAV_ITEM_BASE` gives the header's pills; the selected row wears the brand fill
            a primary button wears. Nothing here invents a colour or a corner.

            NO CAPITALS. The family names were tracked-out 11px uppercase grey, which made a
            heading quieter than its own children — and the site has no capitals anywhere in
            its navigation. */}
        <nav className="flex w-full flex-shrink-0 flex-col border-b border-hairline px-4 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-0.5 px-3 pb-5">
            <span className="font-display text-base font-semibold text-ink">Design system</span>
            <span className="text-xs text-muted">Magic Slash Desktop</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
            {/* ABOVE the families and outside them: a palette is not something you compose
                with, it is what everything below is made of. */}
            <ul className="flex flex-col gap-px">
              {FOUNDATION_PAGES.map((id) => (
                <li key={id}>
                  <Row id={id} active={id === entry} onSelect={setEntry} />
                </li>
              ))}
            </ul>

            {shown.map((family) => {
              const open = !folded.includes(family.label)

              return (
                /* A rule per family, so the ladder reads as five bands rather than one
                   long list. `first:border-t-0`: the top band sits under the title block,
                   which already has air under it. */
                <div key={family.label} className="mt-4 border-t border-hairline pt-4 first:mt-3 first:border-t-0 first:pt-0">
                  <button
                    onClick={() => toggle(family.label)}
                    /* The family's own note lives here rather than under the heading: it is
                       taxonomy prose, and four lines of it between a heading and its rows
                       is what a rail cannot afford. */
                    title={family.note}
                    className="flex w-full items-center gap-1.5 rounded-button px-3 py-1.5 text-left transition-colors hover:bg-black/[0.04]"
                  >
                    {/* Rotated rather than swapped for a second glyph: one element that
                        turns reads as the same control in two states, where two glyphs read
                        as two controls. */}
                    <ChevronRight
                      className={`h-3 w-3 flex-shrink-0 text-muted transition-transform ${
                        open ? 'rotate-90' : ''
                      }`}
                    />
                    <span className="font-display text-[13px] font-semibold text-ink">
                      {family.label}
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-muted">
                      {family.entries.length}
                    </span>
                  </button>

                  {open && (
                    <ul className="flex flex-col gap-px pt-0.5">
                      {family.entries.map((id) => (
                        <li key={id}>
                          <Row id={id} active={id === entry} indent onSelect={setEntry} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          {/* THE THEME, at the foot of the rail and not above each page. It is one setting
              for the whole workbench — every preview on every entry reads it — so repeating
              it per page made it look like a property of the component being documented.
              A select rather than eight pills, because eight pills wrap to three rows in a
              256px column and would take more of the rail than the components do.

              The three-line note under it became the select's `title`: it explains a choice
              nobody has to understand before making it. */}
          <div className="mt-5 flex flex-col gap-1.5 border-t border-hairline px-3 pt-4">
            <label htmlFor="ds-theme" className="text-[11px] text-muted">
              Theme
            </label>
            <select
              id="ds-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as DesktopThemeId)}
              title="Eight of them, and a tint that reads on one can vanish on another. Every preview on the right follows this."
              className="w-full rounded-button border border-hairline bg-white px-3 py-2 font-display text-[13px] font-medium text-ink transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {DESKTOP_THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {DESKTOP_THEMES[id].label}
                </option>
              ))}
            </select>
          </div>
        </nav>

        <main className="min-w-0 flex-1 px-6 py-10 lg:px-12">
          {(() => {
            const Entry = ENTRIES[entry]
            // `onOpen` is what makes a "built on" chip a link: an entry names the
            // components it draws with, and clicking one opens it.
            return <Entry theme={DESKTOP_THEMES[theme]} onOpen={(id) => setEntry(id as EntryId)} />
          })()}
        </main>
      </div>
    </div>
  )
}
