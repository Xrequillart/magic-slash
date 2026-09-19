'use client'

import type { FeatureVisual } from '@/lib/features'
import { AgentsSidebarMockup } from './AgentsSidebarMockup'
import { ContextCardMockup } from './ContextCardMockup'
import { LanguagesArt } from './LanguagesArt'
import { LaunchModesGrid } from './LaunchModesGrid'
import { MacNotificationMockup } from './MacNotificationMockup'
import { MenuBarMockup } from './MenuBarMockup'
import { PRCommentsMockup } from './PRCommentsMockup'
import {
  CommitCompleteArt,
  ContinuePencilArt,
  DoneApprovedArt,
  PlanSketchArt,
  PrClimbArt,
  ResolvePuzzleArt,
  ReviewSearchArt,
  StartLiftoffArt,
} from './FeatureArt'
import { ProfileArt } from './ProfileArt'
import { PullRequestCardMockup } from './PullRequestCardMockup'
import { DevServerMockup, RepoCardMockup } from './RepoCardMockup'
import { CommitConfigMockup, PRConfigMockup } from './RepoConfigMockup'
import { ReposSettingsMockup } from './ReposSettingsMockup'
import { ReviewDrawerMockup } from './ReviewDrawerMockup'
import { SkillsModalMockup } from './SkillsModalMockup'
import { SplitViewMockup } from './SplitViewMockup'
import { SpotlightBarMockup } from './SpotlightBarMockup'
import { TasksModalMockup } from './TasksModalMockup'
import { TicketCardMockup } from './TicketCardMockup'
import { UsageCardMockup } from './UsageCardMockup'

/**
 * Visual NAME → the component that draws it, the same split `ICONS` uses and for the
 * same reason: `lib/features.ts` is read by the root vitest suite, which has no React to
 * resolve, so the data names a visual and the resolving happens here.
 *
 * IN ITS OWN FILE because two pages read it: `/features` draws every row, and `/desktop`
 * draws eight of the same rows at the size an argument needs (`components/site/desktop/`).
 * One table, so a row's drawing is the same drawing wherever it is shown.
 *
 * Keyed by the `FeatureVisual` union, so a second visual named over there is a `tsc`
 * error at this map rather than a card that renders nothing. No fallback, unlike
 * `glyphFor`: a missing visual leaves a card that is copy only, which is what seven of
 * the eight are anyway — there is nothing to degrade to and nothing that breaks.
 */
export const VISUALS: Record<FeatureVisual, () => React.ReactElement> = {
  agentsSidebar: AgentsSidebarMockup,
  commitsCard: CommitCompleteArt,
  contextCard: ContextCardMockup,
  macNotification: MacNotificationMockup,
  menuBar: MenuBarMockup,
  continueTask: ContinuePencilArt,
  devServer: DevServerMockup,
  doneChecklist: DoneApprovedArt,
  // ── THE EIGHT DRAWN ROWS ──────────────────────────────────────────────────────
  // One per command. The skill cards show what a command is FOR rather than what it
  // renders; the twenty-two rows under them keep their mockups. `FeatureArt`'s header has
  // the reasoning, and the note on which mockups these replaced, which two are still
  // drawn elsewhere, and which six now have no caller at all.
  planSpec: PlanSketchArt,
  splitView: SplitViewMockup,
  spotlightBar: SpotlightBarMockup,
  prCard: PullRequestCardMockup,
  prComments: PRCommentsMockup,
  prWatchCard: PrClimbArt,
  repoCard: RepoCardMockup,
  reposSettings: ReposSettingsMockup,
  commitConfig: CommitConfigMockup,
  prConfig: PRConfigMockup,
  profileArt: ProfileArt,
  languagesArt: LanguagesArt,
  launchModes: LaunchModesGrid,
  resolvedThreads: ResolvePuzzleArt,
  reviewDrawer: ReviewDrawerMockup,
  reviewThreads: ReviewSearchArt,
  skillsModal: SkillsModalMockup,
  startTerminal: StartLiftoffArt,
  tasksModal: TasksModalMockup,
  ticketCard: TicketCardMockup,
  usageCard: UsageCardMockup,
}
