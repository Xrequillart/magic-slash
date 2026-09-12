import { GitBranch, Copy, Check, ArrowRight, X } from 'lucide-react'
import { GitHubIcon, VSCodeIcon } from './icons'
import { RepoNameBadge } from './RepoMark'
import { ACTION_CHIP, ACTION_CHIP_SQUARE } from '../actionChip'
import { ScriptsDropdown } from './ScriptsDropdown'
import { PRWatchCard } from './PRWatchCard'
import { RunningScripts } from './RunningScripts'
import { formatRelativeDate } from './utils'
import { useT } from '../../i18n'
import type { RepoGitData } from './types'
import type { RepositoryMetadata } from '../../../types'
import { useStore } from '../../store'

interface RepositoryCardProps {
  repoPath: string
  repoName: string
  agentId: string
  agentName: string
  gitData: RepoGitData | undefined
  baseBranch: string | undefined
  prUrl: string | undefined
  /** GitHub address of the repo — the configured remote URL, or the one read from git. */
  repoUrl: string | undefined
  repoMetadata?: RepositoryMetadata
  copiedCommitHash: string | null
  copiedBranch: string | null
  onCopyCommitHash: (hash: string) => void
  onCopyBranchName: (branch: string) => void
  onRemove: () => void
}

/**
 * One commit's place on the branch: the yellow rail, and the tick on it.
 *
 * A LIST OF COMMITS IS A SEQUENCE, and nothing in the row said so — five subjects
 * stacked in a box read as five unrelated lines, when what they are is one branch in
 * order. The rail says it in the gutter, at no cost to the width the subjects have.
 *
 * Yellow because this is the branch's own work, unpushed or unmerged: the card already
 * spends green on the current branch and red on deletions, and the third colour has to
 * be one neither of those claims. The tick is hollow — a white centre inside a yellow
 * ring — so it reads as a marker ON the line rather than a blob interrupting it.
 *
 * The rail is drawn per ROW, in two halves that meet at the tick, so a row knows only
 * whether it is the first or the last. `tail` is the "+N more" line: rail, no tick.
 */
function CommitTick({ first, last, tail = false }: { first: boolean; last: boolean; tail?: boolean }) {
  return (
    /* `-my-1` CANCELS THE ROW'S OWN `py-1`. `self-stretch` fills the row's CONTENT box,
       which stops short of its padding — so each rail segment ended 4px above the next
       one began, and the trail came out as five dashes with holes between them. The
       negative margin pushes this one column back out over the padding, so consecutive
       rows' segments meet exactly. */
    <div className="relative self-stretch -my-1 w-3 flex-shrink-0 flex items-center justify-center">
      {/* Two segments rather than one box with conditional insets: the top half stops
          at the tick on the first row, the bottom half stops at it on the last, and
          each is simply absent when it would be a stub hanging off the end. */}
      {/* `left-1/2 -translate-x-1/2` and not a bare `absolute`: the static position of an
          abspos child of a FLEX container is resolved from that container's alignment,
          which is not a thing to hang a 3px rail on. Centred explicitly, it lands on the
          tick whatever the gutter does. */}
      {/* SQUARE ENDS. `rounded-full` on a 3px bar rounds all four corners, so where two
          segments met they each tapered to a point and left a pinch in the line — the
          caps were only ever wanted at the two ends of the whole rail, and a per-row
          segment has no way to know it is one of those. Butt ends join cleanly, and
          the tick covers both meeting points anyway. */}
      {!first && <span className="absolute left-1/2 -translate-x-1/2 top-0 bottom-1/2 w-[3px] bg-yellow" />}
      {!last && <span className="absolute left-1/2 -translate-x-1/2 top-1/2 bottom-0 w-[3px] bg-yellow" />}
      {/* The centre is `bg-bg`, the window's own ground, rather than a literal white:
          hardcoded white is the pre-theme habit themes.test.ts scans for, and on a
          light theme a white dot on a near-white card would leave only the ring. The
          window colour reads white on the dark themes — the look asked for — and stays
          a hole punched in the rail on the light ones, which is the point of it. */}
      {!tail && <span className="relative w-3 h-3 rounded-full border-2 border-yellow bg-bg" />}
    </div>
  )
}

export function RepositoryCard({
  repoPath,
  repoName,
  agentId,
  agentName,
  gitData,
  baseBranch,
  prUrl,
  repoUrl,
  repoMetadata,
  copiedCommitHash,
  copiedBranch,
  onCopyCommitHash,
  onCopyBranchName,
  onRemove,
}: RepositoryCardProps) {
  const t = useT()
  const openRepoReview = useStore(s => s.openRepoReview)
  const hasChanges = gitData?.stats?.isGitRepo && gitData.stats.filesChanged > 0
  const hasCommits = gitData?.commits && gitData.commits.commits.length > 0
  /* The parent branch is only worth a card of its own when it is somewhere else:
     on the base branch itself, `base -> current` would just say the same name
     twice, so both the card and the arrow drop out. */
  const rawBaseBranch = baseBranch || gitData?.commits?.baseBranch
  const resolvedBaseBranch = rawBaseBranch === gitData?.branch ? undefined : rawBaseBranch

  return (
    /* `flex flex-col gap-2` and NOT a `mb-2` per block, which is what this was: the
       bottom margin of whichever block happened to be last stacked on top of the card's
       own padding, so the card had 12px of padding above its header and 20px under its
       last row. A gap sits BETWEEN children only — and it also skips the blocks that
       render nothing (no branch, no changes, no scripts), which margins could not.

       `p-4` is the sidebar column's card padding, not this card's own choice: the usage
       card, the ticket card and the spec panel all state it, and at `p-3` this one sat
       4px narrower than the cards above it — a stepped left edge running down the
       column, the kind of thing that reads as sloppiness without the reader being able
       to name it. */
    <div className="bg-surface rounded-xl p-4 flex flex-col gap-2">
      {/* Repo header */}
      <div className="flex items-center gap-2">
        {/* Mark and name as ONE chip, in the ticket badge's shape — see `RepoNameBadge`. */}
        <RepoNameBadge repoName={repoName} title={repoPath} />
        {/* `flex-shrink-0`: on a narrow sidebar it is the NAME that gives way, never the
            four controls — half a chip is not a button. */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <ScriptsDropdown repoPath={repoPath} repoName={repoName} agentId={agentId} agentName={agentName} />
          {/* Open in VS Code */}
          <button
            onClick={() => window.electronAPI.shell.openInVSCode(repoPath)}
            className={`${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-[#007ACC]/15 hover:text-[#007ACC]`}
            title={t('agentInfo.openRepoInEditor')}
            aria-label={t('agentInfo.openRepoInEditor')}
          >
            <VSCodeIcon className="w-3.5 h-3.5" />
          </button>
          {/* Open on GitHub — hidden when the repo has no known remote */}
          {repoUrl && (
            <button
              onClick={() => window.electronAPI.shell.openExternal(repoUrl)}
              className={`${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-ink/10 hover:text-ink`}
              title={t('agentInfo.openRepoOnGitHub')}
              aria-label={t('agentInfo.openRepoOnGitHub')}
            >
              <GitHubIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Removing wears the same chip as the three beside it — the row is one set of
              controls — and says what it does through its hover alone, which is red where
              theirs are their own brand's colour. */}
          <button
            onClick={onRemove}
            className={`${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-red/15 hover:text-red`}
            title={t('agentInfo.removeRepository')}
            aria-label={t('agentInfo.removeRepository')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Straight under the row that launched them, and renders nothing when this
          repo/agent pair has no script running. */}
      <RunningScripts repoPath={repoPath} agentId={agentId} />

      {/* Branch block */}
      {gitData?.branch && (
        <div className="flex items-center gap-1.5">
          {/* Base branch (left) */}
          {resolvedBaseBranch && (
            <>
              <div className="self-stretch flex items-center gap-1.5 px-2 py-1.5 bg-ink/5 rounded-lg min-w-0">
                <GitBranch className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                <span
                  className="text-text-secondary text-xs font-medium truncate"
                  title={resolvedBaseBranch}
                >
                  {resolvedBaseBranch}
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-icon-muted flex-shrink-0" />
            </>
          )}
          {/* Current branch (right) */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 bg-ink/5 rounded-lg">
            <GitBranch className="w-3.5 h-3.5 text-green flex-shrink-0" />
            <span
              className="text-green text-xs font-medium truncate"
              title={gitData.branch}
            >
              {gitData.branch}
            </span>
            <button
              onClick={() => onCopyBranchName(gitData.branch!)}
              /* `rounded-lg`, the card's one radius — it was the last 4px corner left in
                 here. Kept at 20px rather than grown to the 24px action square: it is
                 nested INSIDE the branch chip, and a full-size control there would all
                 but fill the row it sits in. */
              className="p-1 ml-auto rounded-lg hover:bg-ink/10 transition-colors group flex-shrink-0"
              title={t('agentInfo.copyBranch')}
            >
              {copiedBranch === gitData.branch ? (
                <Check className="w-3 h-3 text-green" />
              ) : (
                <Copy className="w-3 h-3 text-icon group-hover:text-ink transition-colors" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* EVERY BLOCK IN THIS CARD IS THE HEADER CHIP, GROWN. `bg-ink/5` and `rounded-lg`
         are `ACTION_CHIP`'s own two values, so the branch chips, the two blocks
         below, the empty state and the PR card are all one material at one radius —
         the row of buttons at the top states the vocabulary, and the card repeats it
         at every size.

         `bg-ink/5` rather than the `bg-surface` these were: both land near 5% on every
         theme, but ink is an OVERLAY — it composes with the `bg-surface` card beneath
         to a visible step up, where surface-on-surface painted the same value twice
         and needed a rule around it to be seen at all. That rule is what is gone. */}
      {hasChanges && gitData.stats && (
        <div className="bg-ink/5 rounded-lg p-3">
          {/* Header with title, stats and gauge */}
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="text-text-secondary/70 font-medium">{t('agentInfo.uncommittedChanges')}</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-text-secondary/50">
                {t(gitData.stats.filesChanged > 1 ? 'agentInfo.files.other' : 'agentInfo.files.one', { count: gitData.stats.filesChanged })}
              </span>
              {(gitData.stats.additions > 0 || gitData.stats.deletions > 0) && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="text-green">+{gitData.stats.additions}</span>
                    <span className="text-red">-{gitData.stats.deletions}</span>
                  </span>
                  {/* Gauge bar - 6 squares */}
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const ratio = gitData.stats!.additions / (gitData.stats!.additions + gitData.stats!.deletions)
                      const threshold = (i + 1) / 6
                      const isGreen = ratio >= threshold
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-sm ${isGreen ? 'bg-green' : 'bg-red'}`}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Files list */}
          {gitData.stats.files && gitData.stats.files.length > 0 && (
            <div className="space-y-0.5">
              {gitData.stats.files.map((file, index) => (
                <div
                  key={index}
                  /* `rounded-lg` and a real hit area. These rows OPEN something, and they
                     were 4px-radius strips one pixel taller than their own text — the
                     hover ground came up as a hairline sliver, at a radius nothing else
                     in the card uses. `-mx-2` against the block's `p-3` lets that ground
                     run wider than the text without touching the plate's edge. */
                  className="flex items-center gap-1.5 text-xs px-2 py-1 -mx-2 cursor-pointer hover:bg-ink/10 rounded-lg transition-colors"
                  /* A click opens the REPOSITORY, anchored on this file — not this file
                     on its own. The whole list is handed over so the drawer can freeze
                     it; `gitData.stats.files` is replaced wholesale by the poll a few
                     seconds from now, and the review must not follow it. */
                  onClick={() => openRepoReview(
                    { repoPath, repoName, files: gitData.stats!.files },
                    file.path,
                  )}
                >
                  <span className="flex-1 text-text-secondary/60 truncate" title={file.path}>
                    {file.path.split('/').pop()}
                  </span>
                  {(file.additions > 0 || file.deletions > 0) && (
                    <span className="flex-shrink-0 text-[10px] text-text-secondary/40">
                      {file.additions > 0 && <span className="text-green">+{file.additions}</span>}
                      {file.additions > 0 && file.deletions > 0 && ' '}
                      {file.deletions > 0 && <span className="text-red">-{file.deletions}</span>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Commits block */}
      {hasCommits && gitData.commits && (
        <div className="bg-ink/5 rounded-lg p-3">
          <div className="flex items-center text-xs mb-1.5">
            <span className="text-text-secondary/70 font-medium">{t('agentInfo.commits')}</span>
            <span className="text-text-secondary/50 ml-auto">
              {gitData.commits.commits.length} ahead of {gitData.commits.baseBranch}
            </span>
          </div>
          {/* A TIMELINE, and therefore NO `space-y`: the rail is drawn per row, top edge
              to bottom edge, so the segments only join into one line while the rows
              actually touch. Any gap between them would show as a broken trail — the
              rows carry their own `py-1` instead.

              The first row's segment starts at its own dot and the last one's stops
              there, so the line spans the commits rather than overshooting into the
              padding. Unless commits are hidden: then the last row keeps its full
              segment and the "+N more" line continues it, which is the trail saying
              there is more of this branch than the card is showing. */}
          <div>
            {gitData.commits.commits.slice(0, 5).map((commit, index, shown) => (
              <div
                key={commit.hash}
                className="flex items-center gap-2 text-xs py-1"
              >
                <CommitTick
                  first={index === 0}
                  last={index === shown.length - 1 && gitData.commits!.commits.length <= 5}
                />
                <span className="text-text-secondary/60 truncate flex-1" title={commit.subject}>
                  {commit.subject}
                </span>
                <span className="text-text-secondary/40 text-xs flex-shrink-0" title={commit.relativeDate}>
                  {formatRelativeDate(commit.relativeDate, t)}
                </span>
                {/* The header's chips, at the header's size: `h-6`, `rounded-lg`, one
                    ground. They were 20px boxes at a 4px radius, which is what made a
                    commit row look like a different card from the one above it. */}
                <button
                  onClick={() => onCopyCommitHash(commit.hash)}
                  className={`${ACTION_CHIP} px-2 gap-1 font-mono text-xs hover:bg-ink/10 hover:text-ink`}
                  title={`Copy full hash: ${commit.hash}`}
                >
                  {commit.shortHash}
                  {copiedCommitHash === commit.hash ? (
                    <Check className="w-3 h-3 text-green" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                {commit.isPushed && gitData.gitHubUrl && (
                  <button
                    onClick={() => window.electronAPI.shell.openExternal(`${gitData.gitHubUrl}/commit/${commit.hash}`)}
                    className={`${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-ink/10 hover:text-ink`}
                    title={t('agentInfo.viewOnGitHub')}
                  >
                    <GitHubIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {gitData.commits.commits.length > 5 && (
              <div className="flex items-center gap-2 text-xs py-1">
                {/* Rail, no dot: these commits are real but not drawn, and a tick for
                    each of five of them would be a lie about how many there are. */}
                <CommitTick first={false} last tail />
                <span className="text-text-secondary/40">
                  +{gitData.commits.commits.length - 5} more commits
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No changes state */}
      {gitData && !gitData.error && !hasChanges && !hasCommits && gitData.branch && (
        <div className="bg-ink/5 rounded-lg p-2">
          <span className="text-xs text-text-secondary/40 italic">{t('agentInfo.noUncommittedChanges')}</span>
        </div>
      )}

      {/* Dedicated PR card. Keyed off `prUrl` alone, deliberately: when the watcher
          is switched off the card still shows the last snapshot, dated, instead of
          vanishing along with the polling.

          It carries the link to GitHub itself — its header is the link — so the
          accent "View pull request" button that used to sit right above it is
          gone: one PR, one card. */}
      {prUrl && <PRWatchCard prUrl={prUrl} agentId={agentId} metadata={repoMetadata} />}
    </div>
  )
}
