'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Lock,
  MessageSquare,
  Settings2,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import { ChipList, ExamplePanel, SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import { Button, Input } from '@/components/ui'
import type { Org } from '@/lib/orgs'
import {
  commitExample,
  DEFAULTS,
  REPO_COLORS,
  type Repository,
  type RepositoryPatch,
} from '@/lib/repositories'

/**
 * Every repository setting the desktop app exposes, minus the ones that need a
 * filesystem: the local path (with its folder picker and git validation), the
 * remote-branch list that path feeds, and the PR template — which is a file in
 * the repo, not a config value. The development branch is a free-text field here
 * for that reason: the webapp cannot enumerate a repo's branches.
 *
 * Changes save immediately, one setting at a time, the way the desktop does.
 */

const LANGUAGE_OPTIONS: DropdownOption<string>[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

const STYLE_OPTIONS: DropdownOption<string>[] = [
  { value: 'single-line', label: 'Single line' },
  { value: 'multi-line', label: 'Multi-line (with body)' },
]

const FORMAT_OPTIONS: DropdownOption<string>[] = [
  { value: 'conventional', label: 'Conventional', description: 'type: description' },
  { value: 'angular', label: 'Angular', description: 'type(scope): description' },
  { value: 'gitmoji', label: 'Gitmoji', description: 'emoji + description' },
  { value: 'none', label: 'None', description: 'Free form' },
]

const COMMIT_MODE_OPTIONS: DropdownOption<string>[] = [
  { value: 'new', label: 'New commit', description: 'Add a commit for the fixes' },
  { value: 'amend', label: 'Amend last commit', description: 'Rewrites history, pushes with force' },
  { value: 'ask', label: 'Ask', description: 'Choose at runtime, on each resolve' },
]

const FORMAT_SOURCE_OPTIONS: DropdownOption<string>[] = [
  { value: 'commit', label: 'Use commit settings' },
  { value: 'custom', label: 'Custom' },
]

/**
 * Text setting that holds a draft until you save it, with Enter as a shortcut.
 * Text fields cannot write on every keystroke the way a toggle or a dropdown
 * does: each character would be its own database write.
 *
 * The draft follows `persisted` whenever *that* changes — after a failed save the
 * page re-reads the row, and the field has to drop the rejected text instead of
 * presenting it as current. Keying the effect on the persisted value rather than
 * on the repo object is what keeps typing safe: typing doesn't change it, so the
 * effect never fires mid-edit.
 */
function DraftField({
  persisted,
  onSave,
  placeholder,
  className = 'w-64',
  required = false,
}: {
  persisted: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  /** Refuses to save an empty value — for settings that must have one. */
  required?: boolean
}) {
  const [draft, setDraft] = useState(persisted)
  useEffect(() => setDraft(persisted), [persisted])

  const savable = draft !== persisted && (!required || draft.trim().length > 0)

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && savable) {
            e.preventDefault()
            onSave(draft)
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      {savable && (
        <Button onClick={() => onSave(draft)} className="shrink-0">
          Save
        </Button>
      )}
    </div>
  )
}

export function RepositoryForm({
  repo,
  orgs,
  onPatch,
  onDelete,
  saveError,
}: {
  repo: Repository
  /** Orgs the current user belongs to — the share targets. */
  orgs: Org[]
  onPatch: (patch: RepositoryPatch) => void
  onDelete: () => void
  saveError: string | null
}) {
  // Resolved values: absent means "use the default", same as the desktop.
  const lang = (key: keyof Repository['languages']) => repo.languages[key] ?? DEFAULTS.language
  const commitStyle = repo.commit.style ?? DEFAULTS.commitStyle
  const commitFormat = repo.commit.format ?? DEFAULTS.commitFormat
  const coAuthor = repo.commit.coAuthor ?? DEFAULTS.coAuthor
  const includeTicketId = repo.commit.includeTicketId ?? DEFAULTS.includeTicketId

  const commitMode = repo.resolve.commitMode ?? DEFAULTS.resolveCommitMode
  const useCommitConfig = repo.resolve.useCommitConfig ?? DEFAULTS.resolveUseCommitConfig
  const resolveStyle = repo.resolve.style ?? DEFAULTS.resolveStyle
  const resolveFormat = repo.resolve.format ?? DEFAULTS.resolveFormat
  const replyToComments = repo.resolve.replyToComments ?? DEFAULTS.replyToComments
  const replyLanguage = repo.resolve.replyLanguage ?? repo.languages.discussion ?? DEFAULTS.language

  const autoLinkTickets = repo.pullRequest.autoLinkTickets ?? DEFAULTS.autoLinkTickets
  const commentOnPR = repo.issues.commentOnPR ?? DEFAULTS.commentOnPR

  // Patch helpers send only the key that changed. The page merges it into the
  // full jsonb block against the freshest row it holds — merging here instead
  // would bake in this render's `repo`, and two settings changed back to back
  // would both write from the same snapshot, the second dropping the first.
  const setLanguage = (key: keyof Repository['languages'], value: string) =>
    onPatch({ languages: { [key]: value } })
  const setCommit = (patch: Repository['commit']) => onPatch({ commit: patch })
  const setResolve = (patch: Repository['resolve']) => onPatch({ resolve: patch })
  const setIssues = (patch: Repository['issues']) => onPatch({ issues: patch })

  const resolvePreview = useCommitConfig
    ? commitExample(commitFormat, commitStyle, includeTicketId)
    : commitExample(resolveFormat, resolveStyle, false)

  const shareOptions: DropdownOption<string>[] = orgs.map((o) => ({ value: o.id, label: o.name }))
  const scopeOrg = repo.orgId ? orgs.find((o) => o.id === repo.orgId) : null

  return (
    <div className="space-y-8">
      {saveError && (
        <p className="rounded-xl border border-red/20 bg-red/[0.04] px-3.5 py-2.5 text-xs text-red">
          {saveError}
        </p>
      )}

      {/* ── Scope ─────────────────────────────────────────────────────────── */}
      <SettingsCard icon={Users} title="Scope">
        <SettingRow
          label={repo.orgId ? `Team${scopeOrg ? ` — ${scopeOrg.name}` : ''}` : 'Personal'}
          description={
            repo.orgId
              ? 'Shared with the organization — every member sees it and binds their own local folder.'
              : 'Only you can see this repository. Share it with an organization to make it a team repo.'
          }
        >
          {repo.orgId ? (
            <Button variant="ghost" onClick={() => onPatch({ orgId: null })} className="border border-black/10">
              <Lock className="h-4 w-4" />
              Make personal
            </Button>
          ) : orgs.length > 0 ? (
            <Dropdown
              value=""
              options={shareOptions}
              onChange={(orgId) => onPatch({ orgId })}
              placeholder="Share with organization…"
              className="w-64"
            />
          ) : (
            <p className="text-xs text-muted">Join an organization to share repos.</p>
          )}
        </SettingRow>
      </SettingsCard>

      {/* ── General ───────────────────────────────────────────────────────── */}
      <SettingsCard icon={Settings2} title="General">
        <SettingRow label="Name" description="Repository display name">
          <DraftField
            persisted={repo.name}
            onSave={(name) => onPatch({ name })}
            required
          />
        </SettingRow>

        <SettingRow label="Keywords" description="Auto-detection keywords (comma-separated)">
          <DraftField
            persisted={repo.keywords.join(', ')}
            onSave={(value) =>
              onPatch({
                keywords: value
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean),
              })
            }
          />
        </SettingRow>

        <SettingRow label="Discussion language" description="Language Claude uses when talking with you">
          <Dropdown
            value={lang('discussion')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('discussion', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label="Color" description="Project color in the app sidebar">
          <div className="flex flex-wrap gap-2">
            {REPO_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onPatch({ color })}
                title={color}
                aria-label={`Set color ${color}`}
                className={`h-6 w-6 rounded-full transition-transform ${
                  repo.color === color
                    ? 'ring-2 ring-ink ring-offset-2'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </SettingRow>
      </SettingsCard>

      {/* ── Branches ──────────────────────────────────────────────────────── */}
      <SettingsCard icon={GitBranch} title="Branches">
        <SettingRow
          label="Development branch"
          description="Base branch for comparing commits. Typed by hand here — the web app can't list the repo's branches."
        >
          <DraftField
            persisted={repo.branches.development ?? ''}
            onSave={(development) => onPatch({ branches: { development } })}
            placeholder="develop"
            className="w-52"
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Worktree ──────────────────────────────────────────────────────── */}
      <SettingsCard icon={GitBranch} title="Worktree">
        <SettingRow
          label="Files to copy"
          description="Files copied from the main repo into new worktrees (e.g. .env, .env.local)"
          stacked
        >
          <ChipList
            items={repo.worktreeFiles}
            onChange={(worktreeFiles) => onPatch({ worktreeFiles })}
            placeholder=".env"
            inputId="worktree-file-input"
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Commit ────────────────────────────────────────────────────────── */}
      <SettingsCard icon={GitCommitHorizontal} title="Commit">
        <SettingRow label="Language" description="Language used for commit messages">
          <Dropdown
            value={lang('commit')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('commit', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label="Style" description="Single line, or multi-line with a body">
          <Dropdown
            value={commitStyle}
            options={STYLE_OPTIONS}
            onChange={(style) => setCommit({ style })}
            width={240}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label="Format" description="Commit message convention">
          <Dropdown
            value={commitFormat}
            options={FORMAT_OPTIONS}
            onChange={(format) => setCommit({ format })}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label="Co-author" description="Add Claude as co-author in commits">
          <Toggle label="Co-author" checked={coAuthor} onChange={(coAuthor) => setCommit({ coAuthor })} />
        </SettingRow>

        <SettingRow label="Include ticket ID" description="Add the ticket ID from the branch name">
          <Toggle
            label="Include ticket ID"
            checked={includeTicketId}
            onChange={(includeTicketId) => setCommit({ includeTicketId })}
          />
        </SettingRow>

        <ExamplePanel title="Example">
          <pre className="whitespace-pre-wrap font-mono text-xs text-ink">
            {commitExample(commitFormat, commitStyle, includeTicketId)}
          </pre>
        </ExamplePanel>
      </SettingsCard>

      {/* ── Resolve ───────────────────────────────────────────────────────── */}
      <SettingsCard icon={MessageSquare} title="Resolve">
        <SettingRow label="Commit mode" description="How review fixes are committed">
          <Dropdown
            value={commitMode}
            options={COMMIT_MODE_OPTIONS}
            onChange={(commitMode) => setResolve({ commitMode })}
            className="w-52"
          />
        </SettingRow>

        {/* Only meaningful when a new commit can happen (new or ask). */}
        {commitMode !== 'amend' && (
          <SettingRow label="Commit format" description="Where resolve commit messages take their format from">
            <Dropdown
              value={useCommitConfig ? 'commit' : 'custom'}
              options={FORMAT_SOURCE_OPTIONS}
              onChange={(v) => setResolve({ useCommitConfig: v === 'commit' })}
              width={240}
              className="w-52"
            />
          </SettingRow>
        )}

        {commitMode !== 'amend' && !useCommitConfig && (
          <>
            <SettingRow label="Style" description="Single line, or multi-line with a body">
              <Dropdown
                value={resolveStyle}
                options={STYLE_OPTIONS}
                onChange={(style) => setResolve({ style })}
                width={240}
                className="w-52"
              />
            </SettingRow>
            <SettingRow label="Format" description="Commit message convention">
              <Dropdown
                value={resolveFormat}
                options={FORMAT_OPTIONS}
                onChange={(format) => setResolve({ format })}
                className="w-52"
              />
            </SettingRow>
          </>
        )}

        <SettingRow label="Reply to comments" description="Reply in-thread on resolved GitHub comments">
          <Toggle
            label="Reply to comments"
            checked={replyToComments}
            onChange={(replyToComments) => setResolve({ replyToComments })}
          />
        </SettingRow>

        {replyToComments && (
          <SettingRow label="Reply language" description="Language for replies posted on GitHub">
            <Dropdown
              value={replyLanguage}
              options={LANGUAGE_OPTIONS}
              onChange={(replyLanguage) => setResolve({ replyLanguage })}
              width={200}
              className="w-52"
            />
          </SettingRow>
        )}

        {commitMode === 'new' && (
          <ExamplePanel title="Example">
            <pre className="whitespace-pre-wrap font-mono text-xs text-ink">{resolvePreview}</pre>
          </ExamplePanel>
        )}
        {commitMode === 'amend' && (
          <ExamplePanel tone="warning">
            <p className="text-xs text-ink">
              Push will use <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono">--force-with-lease</code>.
            </p>
          </ExamplePanel>
        )}
        {commitMode === 'ask' && (
          <ExamplePanel tone="warning">
            <p className="text-xs text-ink">
              You&apos;ll be asked to choose <strong>new commit</strong> or <strong>amend</strong> on each
              resolve. Amending pushes with{' '}
              <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono">--force-with-lease</code>.
            </p>
          </ExamplePanel>
        )}
      </SettingsCard>

      {/* ── Pull request ──────────────────────────────────────────────────── */}
      <SettingsCard icon={GitPullRequest} title="Pull request">
        <SettingRow label="Language" description="Language used for PR titles and descriptions">
          <Dropdown
            value={lang('pullRequest')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('pullRequest', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label="Auto-link tickets" description="Add Jira / GitHub ticket links in the PR description">
          <Toggle
            label="Auto-link tickets"
            checked={autoLinkTickets}
            onChange={(autoLinkTickets) => onPatch({ pullRequest: { autoLinkTickets } })}
          />
        </SettingRow>

        <SettingRow
          label="PR template"
          description="Edited in the desktop app — the template is a file in the repository (.github/pull_request_template.md), not a setting."
        />
      </SettingsCard>

      {/* ── Jira / GitHub issues ──────────────────────────────────────────── */}
      <SettingsCard icon={Ticket} title="Jira / GitHub issues">
        <SettingRow label="Comment language" description="Language used for Jira and GitHub issue comments">
          <Dropdown
            value={lang('jiraComment')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('jiraComment', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label="Comment on PR creation" description="Post a comment with the PR link on the ticket">
          <Toggle
            label="Comment on PR creation"
            checked={commentOnPR}
            onChange={(commentOnPR) => setIssues({ commentOnPR })}
          />
        </SettingRow>

        <SettingRow label="Jira URL" description="Base URL for Jira tickets (e.g. PROJ-123)">
          <DraftField
            persisted={repo.issues.jiraUrl ?? ''}
            onSave={(jiraUrl) => setIssues({ jiraUrl })}
            placeholder="https://company.atlassian.net/browse/"
            className="w-72"
          />
        </SettingRow>

        <SettingRow label="GitHub issues URL" description="Base URL for GitHub issues (e.g. #456)">
          <DraftField
            persisted={repo.issues.githubIssuesUrl ?? ''}
            onSave={(githubIssuesUrl) => setIssues({ githubIssuesUrl })}
            placeholder="https://github.com/org/repo/issues/"
            className="w-72"
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <SettingsCard icon={Trash2} title="Danger zone" tone="danger">
        <SettingRow
          label="Delete this repository"
          description={
            repo.orgId
              ? 'Removes it for every member of the organization.'
              : 'Removes it from your Magic Slash configuration.'
          }
        >
          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-full border border-red/25 px-4 py-2 font-display text-xs font-medium text-red transition-colors hover:bg-red/[0.06]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete repository
          </button>
        </SettingRow>
      </SettingsCard>

      {/* Scope note, so "Team" above is not the only hint about who sees this. */}
      {repo.orgId && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          Changes here apply for every member of {scopeOrg?.name ?? 'the organization'}.
        </p>
      )}
    </div>
  )
}
