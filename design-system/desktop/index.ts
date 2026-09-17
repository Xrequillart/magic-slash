/**
 * The desktop half's public surface. Both apps import from `@ds/desktop`, never
 * from a file inside it — the alias is what keeps the folder free to reorganise.
 */
export { Banner, BANNER_VARIANTS, BANNER_LAYOUTS, BANNER_BAND_HEIGHT } from './Banner'
export { AccountCard } from './AccountCard'
export type {
  AccountCardAction,
  AccountCardAlert,
  AccountCardMark,
  AccountCardProps,
  AccountCardRow,
} from './AccountCard'
export { Agent, AGENT_STATES } from './Agent'
export { AppTitleBar, TITLE_BAR_HEIGHT } from './AppTitleBar'
export type {
  AppTitleBarProps,
  TitleBarAccount,
  TitleBarAction,
  TitleBarSwitch,
  TitleBarSwitchOption,
  TitleBarTitle,
  TitleBarToggle,
} from './AppTitleBar'
export type { AgentProps, AgentState } from './Agent'
export { Avatar } from './Avatar'
export { Button, BUTTON_TONES } from './Button'
export type { ButtonProps, ButtonSize, ButtonTone } from './Button'
export { ButtonIcon, BUTTON_ICON_SIZES } from './ButtonIcon'
export type {
  ButtonIconActive,
  ButtonIconProps,
  ButtonIconSize,
  ButtonIconTone,
} from './ButtonIcon'
export { BranchCard } from './BranchCard'
export type { BranchCardProps } from './BranchCard'
export { Card } from './Card'
export { CommitCard } from './CommitCard'
export type { CommitCardCommit, CommitCardProps } from './CommitCard'
// `CommitRail` is deliberately absent: it is `CommitCard`'s and `CommitLine`'s shared
// gutter, not a thing a page has any business drawing on its own.
export { CommitLine } from './CommitLine'
export type { CommitLineProps } from './CommitLine'
export { ContextAgentCard, CONTEXT_THRESHOLDS } from './ContextAgentCard'
export type { ContextAgentCardProps } from './ContextAgentCard'
export { ChecklistCard, CHECKLIST_VERDICT_MARK } from './ChecklistCard'
export type { ChecklistCardProps, ChecklistVerdict } from './ChecklistCard'
export { EmptyLine } from './EmptyLine'
export { FactList } from './FactList'
export type { FactListProps, FactListRow } from './FactList'
export { FieldTable } from './FieldTable'
export type { FieldTableAction, FieldTableProps, FieldTableRow } from './FieldTable'
export { RateLimitBar, LIMIT_THRESHOLDS } from './RateLimitBar'
export type { RateLimitBarProps } from './RateLimitBar'
export { SettingRow } from './SettingRow'
export type { SettingRowControl, SettingRowProps } from './SettingRow'
export { SettingsCard } from './SettingsCard'
export type { SettingsCardProps, SettingsCardRow } from './SettingsCard'
export { UsageTable } from './UsageTable'
export type { UsageTableProps, UsageTableRow } from './UsageTable'
export { SectionHeader } from './SectionHeader'
export type { SectionHeaderAction, SectionHeaderProps } from './SectionHeader'
export { ProfileCard } from './ProfileCard'
export type { ProfileCardProps } from './ProfileCard'
export { CheckList, CHECK_STATE_MARK } from './CheckList'
export type { CheckListEntry, CheckListProps, CheckState } from './CheckList'
export { COMPONENT_SIZES } from './componentSizes'
export type { ComponentSize } from './componentSizes'
export { CollapsibleLine } from './CollapsibleLine'
export type { CollapsibleLineProps } from './CollapsibleLine'
export { DiffStat } from './DiffStat'
export type { DiffStatProps } from './DiffStat'
export { FileModifiedLine } from './FileModifiedLine'
export type { FileModifiedLineProps } from './FileModifiedLine'
export { UnCommittedChangesCard } from './UnCommittedChangesCard'
export type { UnCommittedChangesCardProps, UnCommittedChangesFile } from './UnCommittedChangesCard'
export { PullRequestCard, PR_STATE_MARK } from './PullRequestCard'
export type { PullRequestCardProps, PullRequestState } from './PullRequestCard'
export { PR_BADGE, PR_COLOR, PR_MARK, PR_TONES } from './prTones'
export type { PRTone } from './prTones'
export { Input } from './Input'
export type { InputProps, InputSize, InputTone, InputTrailing } from './Input'
export { Kbd } from './Kbd'
export type { KbdProps, KbdSize } from './Kbd'
export { Item, ItemGroup, ItemNote } from './Item'
export type { ItemAlign, ItemProps } from './Item'
export { PlanItem } from './PlanItem'
export type { PlanItemProps } from './PlanItem'
export { RepositoryCard } from './RepositoryCard'
export type { RepositoryCardProps } from './RepositoryCard'
export { RepositoryItem } from './RepositoryItem'
export type { RepositoryItemProps } from './RepositoryItem'
export { ScriptCard } from './ScriptCard'
export type { ScriptCardProps, ScriptCardUrl } from './ScriptCard'
export { ReviewThreadLine } from './ReviewThreadLine'
export type { ReviewThreadLineProps } from './ReviewThreadLine'
export type { CardGround, CardPadding, CardProps, CardShape } from './Card'
export type { AvatarProps, AvatarFallback } from './Avatar'
export { AVATAR_SIZES } from './avatarSizes'
export type { AvatarSize, AvatarGeometry } from './avatarSizes'
export { HeaderRepoCard } from './HeaderRepoCard'
export type { HeaderRepoAction, HeaderRepoCardProps } from './HeaderRepoCard'
export { EditableText } from './EditableText'
export type { EditableTextProps, EditableTextVariant } from './EditableText'
export { Icon, ICON_SIZES } from './Icon'
export { Label, LABEL_TONES } from './Label'
export { ModalHeader, MODAL_HEADER_HEIGHT } from './ModalHeader'
export type { ModalHeaderProps } from './ModalHeader'
export { OrganizationCard } from './OrganizationCard'
export type {
  OrganizationCardInvitation,
  OrganizationCardMember,
  OrganizationCardProps,
} from './OrganizationCard'
export { PageModal } from './PageModal'
export type { PageModalProps } from './PageModal'
export { Menu } from './Menu'
export type { MenuGroup, MenuHeader, MenuItem, MenuProps } from './Menu'
export { MenuSidebar } from './MenuSidebar'
export type { MenuSidebarEntry, MenuSidebarProps } from './MenuSidebar'
export { MenuSidebarItem } from './MenuSidebarItem'
export type { MenuSidebarItemProps } from './MenuSidebarItem'
export { LanguageCard } from './LanguageCard'
export type { LanguageCardOption, LanguageCardProps } from './LanguageCard'
export { Loader } from './Loader'
export type { LoaderProps, LoaderSize, LoaderTone, LoaderVariant } from './Loader'
export { ProgressBar, PROGRESS_TEXT, progressTone } from './ProgressBar'
export type {
  ProgressBarProps,
  ProgressSize,
  ProgressThresholds,
  ProgressTone,
  ProgressTrack,
} from './ProgressBar'
export type { LabelProps, LabelSize, LabelTone } from './Label'
export { Sidebar, SIDEBAR_WIDTH } from './Sidebar'
export { SidebarAgentCoderInfo } from './SidebarAgentCoderInfo'
export type { CoderRepository, SidebarAgentCoderInfoProps } from './SidebarAgentCoderInfo'
export { SidebarAgentPlannerInfo } from './SidebarAgentPlannerInfo'
export type { SidebarAgentPlannerInfoProps } from './SidebarAgentPlannerInfo'
export { Modal } from './Modal'
export type { ModalProps } from './Modal'
export { RepositorySelector } from './RepositorySelector'
export type { RepositorySelectorProps, RepositorySelectorRepo } from './RepositorySelector'
export { SpecCard } from './SpecCard'
export type { SpecCardProps } from './SpecCard'
export type {
  SidebarAction,
  SidebarAgentRow,
  SidebarList,
  SidebarProps,
  SidebarSelectAction,
} from './Sidebar'
export { Select } from './Select'
export type { SelectMarker, SelectOption, SelectProps, SelectSize } from './Select'
export { useAnchoredPanel } from './useAnchoredPanel'
export { SelectIcon } from './SelectIcon'
export type { SelectIconGroup, SelectIconItem, SelectIconProps, SelectIconTone } from './SelectIcon'
export { Status, STATUS_TONES } from './Status'
export { Switch } from './Switch'
export type { SwitchProps, SwitchSize, SwitchVariant } from './Switch'
export type { StatusOption, StatusProps, StatusSize, StatusStrength, StatusTone } from './Status'
export { UpdateDialog } from './UpdateDialog'
export type { UpdateDialogProps, UpdateStage } from './UpdateDialog'
export { WhatsNewDialog } from './WhatsNewDialog'
export type {
  WhatsNewCategory,
  WhatsNewDialogProps,
  WhatsNewEntry,
  WhatsNewHue,
} from './WhatsNewDialog'
export { UsageClaudeCodeCard } from './UsageClaudeCodeCard'
export type { UsageClaudeCodeCardProps, UsageLimit } from './UsageClaudeCodeCard'
export { TitleAgentCard } from './TitleAgentCard'
export type { TitleAgentCardProps } from './TitleAgentCard'
export { TabStrip } from './TabStrip'
export type { TabStripItem, TabStripProps } from './TabStrip'
export { Tally } from './Tally'
export type { TallyCount, TallyProps } from './Tally'
export { Text, TEXT_FACE, TEXT_SIZES, TEXT_WEIGHTS } from './Text'
export type { TextProps, TextSize, TextTone, TextWeight } from './Text'
export type { IconProps, IconSize, IconTone } from './Icon'
export type { BannerAction, BannerProps, BannerVariant, BannerLayout } from './Banner'
export type { IconComponent } from './types'
export { Flag, RoundFlag } from './Flag'
export { RAISED_PLATE, RAISED_PLATE_HOVER } from './plate'
export { ControlCenter, ControlCenterGroup, CONTROL_CENTER_GRID, CONTROL_CENTER_STACK } from './ControlCenter'
export type { ControlCenterGroupProps, ControlCenterProps } from './ControlCenter'
export { SetupStatusCard } from './SetupStatusCard'
export type { SetupState, SetupStatusCardProps } from './SetupStatusCard'
export { ThemeGrid } from './ThemeGrid'
export type { ThemeGridOption, ThemeGridProps, ThemeSwatchColors } from './ThemeGrid'
export { Stepper } from './Stepper'
export type { StepperProps, StepperSize } from './Stepper'
export { ToggleButton } from './ToggleButton'
export type { ToggleButtonProps, ToggleButtonSize } from './ToggleButton'
// Icons are imported from `@ds/desktop/icons` directly rather than through here: an
// app pulls dozens of them per file, and routing that through the component barrel
// would make every icon import drag the components along behind it.
