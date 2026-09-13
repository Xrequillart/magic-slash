/**
 * The desktop half's public surface. Both apps import from `@ds/desktop`, never
 * from a file inside it — the alias is what keeps the folder free to reorganise.
 */
export { Banner, BANNER_VARIANTS, BANNER_LAYOUTS } from './Banner'
export { Avatar } from './Avatar'
export { ButtonIcon, BUTTON_ICON_SIZES } from './ButtonIcon'
export type { ButtonIconProps, ButtonIconSize, ButtonIconTone } from './ButtonIcon'
export { BranchCard } from './BranchCard'
export type { BranchCardProps } from './BranchCard'
export { Card } from './Card'
export { ContextAgentCard, CONTEXT_THRESHOLDS } from './ContextAgentCard'
export type { ContextAgentCardProps } from './ContextAgentCard'
export type { CardPadding, CardProps } from './Card'
export type { AvatarProps, AvatarFallback } from './Avatar'
export { AVATAR_SIZES } from './avatarSizes'
export type { AvatarSize, AvatarGeometry } from './avatarSizes'
export { Icon, ICON_SIZES } from './Icon'
export { Label, LABEL_TONES } from './Label'
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
export { SelectIcon } from './SelectIcon'
export type { SelectIconGroup, SelectIconItem, SelectIconProps, SelectIconTone } from './SelectIcon'
export { Status, STATUS_TONES } from './Status'
export type { StatusOption, StatusProps, StatusSize, StatusStrength, StatusTone } from './Status'
export { Text, TEXT_SIZES, TEXT_WEIGHTS } from './Text'
export type { TextProps, TextSize, TextTone, TextWeight } from './Text'
export type { IconProps, IconSize, IconTone } from './Icon'
export type { BannerProps, BannerVariant, BannerLayout } from './Banner'
export type { IconComponent } from './types'
// Icons are imported from `@ds/desktop/icons` directly rather than through here: an
// app pulls dozens of them per file, and routing that through the component barrel
// would make every icon import drag the components along behind it.
