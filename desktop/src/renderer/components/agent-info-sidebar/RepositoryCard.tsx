import {
  BranchCard,
  CommitCard,
  HeaderRepoCard,
  RepositoryCard as RepositoryCardShell,
  UnCommittedChangesCard,
} from '@ds/desktop'
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
    /* The plate, the padding, the air between the blocks and the ORDER they are read in
       are `RepositoryCard`'s now — see that file for why a gap and not a margin, and why
       the order is not a caller's to choose. What stays here is which repository this is
       and what each block is made of. */
    <RepositoryCardShell
      header={
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
      }
      /* Renders nothing when this repo/agent pair has no script running — and the slot
         it sits in is what puts it straight under the row that launched them. */
      activity={<RunningScripts repoPath={repoPath} agentId={agentId} />}
      /* `resolvedBaseBranch` is already undefined when the base is this very branch, so
         `BranchCard` never has to decide whether `main -> main` is worth a row. */
      branch={gitData?.branch && (
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
      /* The panel, the heading, the gauge and every file row are
          `UnCommittedChangesCard`'s now. What stays here is the three things only the
          app knows: how git counts this tree, how "7 files" pluralises in this
          language, and what clicking a row is supposed to open.

          A click opens the REPOSITORY, anchored on this file — not the file on its
          own. The whole list is handed over so the drawer can freeze it;
          `gitData.stats.files` is replaced wholesale by the poll a few seconds from
          now, and the review must not follow it. */
      changes={hasChanges && gitData.stats && (
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
      /* Commits block. The panel, the rail, the hash chip and the "+N more" line are
          `CommitCard`'s now. What stays here is the three things only the app knows:
          how many commits there really are, what a relative date reads like in this
          language, and how to open a URL from inside Electron. */
      commits={hasCommits && gitData.commits && (
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
      /* Shown only when the three above are all absent, and that test is the card's —
         see its `empty` note. What is left here is the one condition only the app can
         answer: a repository whose read FAILED has an error to report, not a quiet
         "nothing to commit". */
      empty={gitData && !gitData.error && gitData.branch && (
        <div className="bg-ink/5 rounded-lg p-2">
          <span className="text-xs text-text-secondary/40 italic">{t('agentInfo.noUncommittedChanges')}</span>
        </div>
      )}
      /* Keyed off `prUrl` alone, deliberately: when the watcher is switched off the card
         still shows the last snapshot, dated, instead of vanishing along with the
         polling.

         It carries the link to GitHub itself — its header is the link — so the accent
         "View pull request" button that used to sit right above it is gone: one PR, one
         card. */
      pullRequest={prUrl && <PRWatchCard prUrl={prUrl} agentId={agentId} metadata={repoMetadata} />}
    />
  )
}
