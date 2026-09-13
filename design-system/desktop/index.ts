/**
 * The desktop half's public surface. Both apps import from `@ds/desktop`, never
 * from a file inside it — the alias is what keeps the folder free to reorganise.
 */
export { Banner, BANNER_VARIANTS, BANNER_LAYOUTS } from './Banner'
export { Agent, AGENT_STATES } from './Agent'
export { AppTitleBar, TITLE_BAR_HEIGHT } from './AppTitleBar'
export type {
  AppTitleBarProps,
  TitleBarAction,
  TitleBarSwitch,
  TitleBarSwitchOption,
  TitleBarTitle,
  TitleBarToggle,
} from './AppTitleBar'
export type { AgentProps, AgentState } from './Agent'
export { Avatar } from './Avatar'
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
export { ContextAgentCard, CONTEXT_THRESHOLDS } from './ContextAgentCard'
export type { ContextAgentCardProps } from './ContextAgentCard'
export type { CardPadding, CardProps } from './Card'
export type { AvatarProps, AvatarFallback } from './Avatar'
export { AVATAR_SIZES } from './avatarSizes'
export type { AvatarSize, AvatarGeometry } from './avatarSizes'
export { HeaderRepoCard } from './HeaderRepoCard'
export type { HeaderRepoAction, HeaderRepoCardProps } from './HeaderRepoCard'
export { EditableText } from './EditableText'
export type { EditableTextProps, EditableTextVariant } from './EditableText'
export { Icon, ICON_SIZES } from './Icon'
export { Label, LABEL_TONES } from './Label'
export { MenuSidebar } from './MenuSidebar'
export type { MenuSidebarEntry, MenuSidebarProps } from './MenuSidebar'
export { MenuSidebarItem } from './MenuSidebarItem'
export type { MenuSidebarItemProps } from './MenuSidebarItem'
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
export type {
  SidebarAction,
  SidebarAgentRow,
  SidebarList,
  SidebarProps,
} from './Sidebar'
export { SelectIcon } from './SelectIcon'
export type { SelectIconGroup, SelectIconItem, SelectIconProps, SelectIconTone } from './SelectIcon'
export { Status, STATUS_TONES } from './Status'
export { Switch } from './Switch'
export type { SwitchProps, SwitchSize } from './Switch'
export type { StatusOption, StatusProps, StatusSize, StatusStrength, StatusTone } from './Status'
export { UsageClaudeCodeCard } from './UsageClaudeCodeCard'
export type { UsageClaudeCodeCardProps, UsageLimit } from './UsageClaudeCodeCard'
export { TitleAgentCard } from './TitleAgentCard'
export type { TitleAgentCardProps } from './TitleAgentCard'
export { Text, TEXT_SIZES, TEXT_WEIGHTS } from './Text'
export type { TextProps, TextSize, TextTone, TextWeight } from './Text'
export type { IconProps, IconSize, IconTone } from './Icon'
export type { BannerProps, BannerVariant, BannerLayout } from './Banner'
export type { IconComponent } from './types'
// Icons are imported from `@ds/desktop/icons` directly rather than through here: an
// app pulls dozens of them per file, and routing that through the component barrel
// would make every icon import drag the components along behind it.
