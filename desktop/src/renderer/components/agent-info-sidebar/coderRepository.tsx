import type { CoderRepository } from '@ds/desktop'
import { Github, VSCode } from '@ds/desktop/icons'
import { PRWatchCard } from './PRWatchCard'
import { RunningScripts } from './RunningScripts'
import { formatRelativeDate } from './utils'
import type { ScriptsMenu } from './useScriptsMenu'
import type { Translate } from '../../i18n'
import type { RepoGitData } from './types'
import type { RepositoryMetadata } from '../../../types'

/**
 * THE DATA PATH for one repository card. The card is `SidebarAgentCoderInfo`'s: the plate,
 * the padding, the air between the blocks and the ORDER they are read in all live there,
 * one rung down in `RepositoryCard`.
 *
 * A FUNCTION AND NOT A COMPONENT, which is the whole point of this file. It used to render
 * the card, which meant the sidebar could only draw repositories by mounting one of these
 * per row — and a component per row is a component the design system cannot see inside. Now
 * it answers the question "what does this repository have to say", and the answer is data:
 * a name, a branch, a diff, some commits. Nothing here decides what any of it looks like.
 *
 * WHAT IS LEFT IS THE HALF THAT IS GENUINELY THIS APP'S: how git counts a tree, how "7
 * files" pluralises in this language, what a relative date reads like, and what clicking a
 * row is supposed to open. Every string arrives translated and every number formatted,
 * because the column has no translator and no locale.
 *
 * TWO SLOTS STAY NODES — the running scripts and the pull-request watcher. Neither is a
 * drawing: one tracks processes, the other polls GitHub and types slash commands into a
 * terminal. They are built here because only the app can build them, and handed over as
 * elements.
 */

/**
 * How many commits the card stands on before the tail takes over.
 *
 * IT LIVES HERE AND NOT IN `CommitCard`, which is the point of the split: the design system
 * arranges what it is handed, and how much of a branch is worth showing in a 288px sidebar
 * is this app's judgement.
 *
 * ONE PLACE NEEDS IT NOW, where two used to. It was read here twice — once to slice the
 * list and once to word the "+N more" line — and the header of `CommitCard` warned that
 * the two could disagree. The card does the slicing now, so this is handed over once and
 * the count in the label is arithmetic on the same number.
 */
const SHOWN_COMMITS = 5

interface CoderRepositoryInput {
  repoPath: string
  repoName: string
  agentId: string
  gitData: RepoGitData | undefined
  baseBranch: string | undefined
  prUrl: string | undefined
  /** GitHub address of the repo — the configured remote URL, or the one read from git. */
  repoUrl: string | undefined
  repoMetadata: RepositoryMetadata | undefined
  copiedCommitHash: string | null
  copiedBranch: string | null
  /** The hue this repository was given in Settings, from the whole-config map. */
  repoColor: string | undefined
  /** This repository's own lazily-fetched script menu. */
  scripts: ScriptsMenu
  onCopyCommitHash: (hash: string) => void
  onCopyBranchName: (branch: string) => void
  onRemove: () => void
  onOpenSettings: (repoName: string) => void
  onOpenReview: (file: string) => void
  t: Translate
}

export function toCoderRepository({
  repoPath,
  repoName,
  agentId,
  gitData,
  baseBranch,
  prUrl,
  repoUrl,
  repoMetadata,
  copiedCommitHash,
  copiedBranch,
  repoColor,
  scripts,
  onCopyCommitHash,
  onCopyBranchName,
  onRemove,
  onOpenSettings,
  onOpenReview,
  t,
}: CoderRepositoryInput): CoderRepository {
  const hasChanges = Boolean(gitData?.stats?.isGitRepo && gitData.stats.filesChanged > 0)
  const hasCommits = Boolean(gitData?.commits && gitData.commits.commits.length > 0)
  /* WHEN THE WORKING-TREE PANEL IS DRAWN AT ALL, and it is not simply "when there are
     changes" any more.

     With files to list, it lists them. With none, it stays only to say that NOTHING is
     in flight — no file being modified, none waiting for a commit — and that sentence is
     only true when the branch is not ahead either. So a clean tree with commits on it
     drops the panel entirely rather than showing a placeholder that would contradict the
     commit card two rows below it.

     A folder that is not a git repository has no working tree to report on at all, and
     keeps no panel in any case. */
  const showChanges = Boolean(gitData?.stats?.isGitRepo) && (hasChanges || !hasCommits)
  /* The parent branch is only worth a card of its own when it is somewhere else: on the
     base branch itself, `base -> current` would just say the same name twice, so both the
     card and the arrow drop out. */
  const rawBaseBranch = baseBranch || gitData?.commits?.baseBranch
  const resolvedBaseBranch = rawBaseBranch === gitData?.branch ? undefined : rawBaseBranch

  return {
    // The checkout PATH and not the name: the same repository can be attached twice from
    // two clones, and two rows sharing a React key is a rendering bug waiting for the day
    // somebody does it.
    id: repoPath,
    header: {
      name: repoName,
      title: repoPath,
      color: repoColor,
      onNameClick: () => onOpenSettings(repoName),
      scripts,
      editor: {
        icon: VSCode,
        title: t('agentInfo.openRepoInEditor'),
        onClick: () => window.electronAPI.shell.openInVSCode(repoPath),
      },
      remote: repoUrl
        ? {
            icon: Github,
            title: t('agentInfo.openRepoOnGitHub'),
            onClick: () => window.electronAPI.shell.openExternal(repoUrl),
          }
        : undefined,
      remove: { title: t('agentInfo.removeRepository'), onClick: onRemove },
    },
    /* Renders nothing when this repo/agent pair has no script running — and the slot it
       sits in is what puts it straight under the row that launched them. */
    activity: <RunningScripts repoPath={repoPath} agentId={agentId} />,
    /* `resolvedBaseBranch` is already undefined when the base is this very branch, so
       `BranchCard` never has to decide whether `main -> main` is worth a row. */
    branch: gitData?.branch
      ? {
          branch: gitData.branch,
          base: resolvedBaseBranch,
          copy: {
            label: t('agentInfo.copyBranch'),
            copied: copiedBranch === gitData.branch,
            onCopy: () => onCopyBranchName(gitData.branch!),
          },
        }
      : undefined,
    /* A click opens the REPOSITORY, anchored on this file — not the file on its own. The
       whole list is handed over so the drawer can freeze it; `gitData.stats.files` is
       replaced wholesale by the poll a few seconds from now, and the review must not
       follow it. */
    changes:
      showChanges && gitData?.stats
        ? {
            label: t('agentInfo.uncommittedChanges'),
            /* The count is dropped on a clean tree rather than sent as "0 files": the
               panel hides it in that state anyway, and composing a plural for a list
               that is not there is the kind of string that outlives the reason for it. */
            summary: hasChanges
              ? t(
                  gitData.stats.filesChanged > 1 ? 'agentInfo.files.other' : 'agentInfo.files.one',
                  { count: gitData.stats.filesChanged },
                )
              : undefined,
            additions: gitData.stats.additions,
            deletions: gitData.stats.deletions,
            files: (gitData.stats.files ?? []).map(file => ({
              path: file.path,
              name: file.path.split('/').pop() ?? file.path,
              additions: file.additions,
              deletions: file.deletions,
            })),
            /* Passed whether or not the tree is clean: the panel works that out from the
               three numbers itself, and a second copy of that test here is a second
               place for it to go wrong. */
            emptyLabel: t('agentInfo.noUncommittedChanges'),
            onOpenFile: onOpenReview,
          }
        : undefined,
    commits:
      hasCommits && gitData?.commits
        ? {
            label: t('agentInfo.commits'),
            summary: `${gitData.commits.commits.length} ahead of ${gitData.commits.baseBranch}`,
            // EVERY commit, unsliced: the card holds the ones it hides so the tail can
            // open onto them, and `more.shown` is where it cuts.
            commits: gitData.commits.commits.map(commit => ({
              hash: commit.hash,
              shortHash: commit.shortHash,
              subject: commit.subject,
              relativeDate: formatRelativeDate(commit.relativeDate, t),
              copyLabel: `Copy full hash: ${commit.hash}`,
              openable: commit.isPushed && Boolean(gitData.gitHubUrl),
            })),
            more:
              gitData.commits.commits.length > SHOWN_COMMITS
                ? {
                    shown: SHOWN_COMMITS,
                    label: t('agentInfo.commitsMore', {
                      count: gitData.commits.commits.length - SHOWN_COMMITS,
                    }),
                    lessLabel: t('agentInfo.commitsLess'),
                  }
                : undefined,
            copiedHash: copiedCommitHash,
            onCopyHash: onCopyCommitHash,
            open: {
              label: t('agentInfo.viewOnGitHub'),
              icon: Github,
              onOpen: hash =>
                window.electronAPI.shell.openExternal(`${gitData.gitHubUrl}/commit/${hash}`),
            },
          }
        : undefined,
    /* Keyed off `prUrl` alone, deliberately: when the watcher is switched off the card still
       shows the last snapshot, dated, instead of vanishing along with the polling.

       It carries the link to GitHub itself — its header is the link — so the accent "View
       pull request" button that used to sit right above it is gone: one PR, one card. */
    pullRequest: prUrl ? (
      <PRWatchCard prUrl={prUrl} agentId={agentId} metadata={repoMetadata} />
    ) : undefined,
  }
}
