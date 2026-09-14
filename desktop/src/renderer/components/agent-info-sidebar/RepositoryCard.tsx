import { BranchCard, Card, CommitCard, HeaderRepoCard, UnCommittedChangesCard } from '@ds/desktop'
import { Github, VSCode } from '@ds/desktop/icons'
import { useRepoColor } from './RepoMark'
import { useScriptsMenu } from './useScriptsMenu'
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
 * How many commits the card draws before it stops counting and starts summarising.
 *
 * IT LIVES HERE AND NOT IN `CommitCard`, which is the point of the split: the panel
 * arranges what it is handed, and how much of a branch is worth showing in a 288px
 * sidebar is this card's judgement rather than the design system's. It is named
 * because two places need it — the slice and the "+N more" line — and those two
 * disagreeing is exactly the bug the literal five used to invite.
 */
const SHOWN_COMMITS = 5
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
  // The two things the header needs that only the app can answer: which of the
  // sixteen hues this repository was given, and where its settings live.
  const repoColor = useRepoColor(repoName)
  const openRepoSettings = useStore(s => s.openRepoSettings)
  const scripts = useScriptsMenu({ repoPath, repoName, agentId, agentName })
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
    <Card className="flex flex-col gap-2">
      {/* The header row. The order, the gaps and every tone are `HeaderRepoCard`'s;
          what stays here is which repository it is and what each control does to it.
          `remote` is simply absent when the repo has no known one — a dead chip would
          be worse than no chip. */}
      <HeaderRepoCard
        name={repoName}
        title={repoPath}
        color={repoColor}
        onNameClick={() => openRepoSettings(repoName)}
        scripts={scripts}
        editor={{
          icon: VSCode,
          title: t('agentInfo.openRepoInEditor'),
          onClick: () => window.electronAPI.shell.openInVSCode(repoPath),
        }}
        remote={
          repoUrl
            ? {
                icon: Github,
                title: t('agentInfo.openRepoOnGitHub'),
                onClick: () => window.electronAPI.shell.openExternal(repoUrl),
              }
            : undefined
        }
        remove={{ title: t('agentInfo.removeRepository'), onClick: onRemove }}
      />

      {/* Straight under the row that launched them, and renders nothing when this
          repo/agent pair has no script running. */}
      <RunningScripts repoPath={repoPath} agentId={agentId} />

      {/* Branch block. `resolvedBaseBranch` is already undefined when the base is this
          very branch, so `BranchCard` never has to decide whether `main -> main` is
          worth a row — it draws what it is handed. */}
      {gitData?.branch && (
        <BranchCard
          branch={gitData.branch}
          base={resolvedBaseBranch}
          copy={{
            label: t('agentInfo.copyBranch'),
            copied: copiedBranch === gitData.branch,
            onCopy: () => onCopyBranchName(gitData.branch!),
          }}
        />
      )}

      {/* The panel, the heading, the gauge and every file row are
          `UnCommittedChangesCard`'s now. What stays here is the three things only the
          app knows: how git counts this tree, how "7 files" pluralises in this
          language, and what clicking a row is supposed to open.

          A click opens the REPOSITORY, anchored on this file — not the file on its
          own. The whole list is handed over so the drawer can freeze it;
          `gitData.stats.files` is replaced wholesale by the poll a few seconds from
          now, and the review must not follow it. */}
      {hasChanges && gitData.stats && (
        <UnCommittedChangesCard
          label={t('agentInfo.uncommittedChanges')}
          summary={t(
            gitData.stats.filesChanged > 1 ? 'agentInfo.files.other' : 'agentInfo.files.one',
            { count: gitData.stats.filesChanged },
          )}
          additions={gitData.stats.additions}
          deletions={gitData.stats.deletions}
          files={(gitData.stats.files ?? []).map(file => ({
            path: file.path,
            name: file.path.split('/').pop() ?? file.path,
            additions: file.additions,
            deletions: file.deletions,
          }))}
          onOpenFile={path =>
            openRepoReview({ repoPath, repoName, files: gitData.stats!.files }, path)
          }
        />
      )}

      {/* Commits block. The panel, the rail, the hash chip and the "+N more" line are
          `CommitCard`'s now. What stays here is the three things only the app knows:
          how many commits there really are, what a relative date reads like in this
          language, and how to open a URL from inside Electron. */}
      {hasCommits && gitData.commits && (
        <CommitCard
          label={t('agentInfo.commits')}
          summary={`${gitData.commits.commits.length} ahead of ${gitData.commits.baseBranch}`}
          commits={gitData.commits.commits.slice(0, SHOWN_COMMITS).map((commit) => ({
            hash: commit.hash,
            shortHash: commit.shortHash,
            subject: commit.subject,
            relativeDate: formatRelativeDate(commit.relativeDate, t),
            copyLabel: `Copy full hash: ${commit.hash}`,
            openable: commit.isPushed && Boolean(gitData.gitHubUrl),
          }))}
          moreLabel={
            gitData.commits.commits.length > SHOWN_COMMITS
              ? `+${gitData.commits.commits.length - SHOWN_COMMITS} more commits`
              : undefined
          }
          copiedHash={copiedCommitHash}
          onCopyHash={onCopyCommitHash}
          open={{
            label: t('agentInfo.viewOnGitHub'),
            icon: Github,
            onOpen: (hash) =>
              window.electronAPI.shell.openExternal(`${gitData.gitHubUrl}/commit/${hash}`),
          }}
        />
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
    </Card>
  )
}
