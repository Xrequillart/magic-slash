import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, FileText, Image as ImageIcon, Lock } from 'lucide-react'
import MarkdownView from '../../components/file-preview/MarkdownView'
import type { SkillDetail } from '../../hooks/useSkills'
import { useT } from '../../i18n'

/**
 * A skill nobody can edit here — a built-in, or one that lives in a repository —
 * shown as what it actually is: a document. The editor's disabled form fields
 * said "you may not touch this" far louder than they said what the skill does,
 * and the instructions themselves sat in a greyed-out monospace textarea.
 *
 * So: a header card for the frontmatter, then the body rendered as markdown, in
 * the same reading style as the file preview drawer. Raw mode keeps the original
 * SKILL.md within reach for anyone copying it into a prompt or a repo of theirs.
 */

/** Split a SKILL.md into its YAML frontmatter and the markdown that follows. */
function splitFrontmatter(content: string): { frontmatter: string | null; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { frontmatter: null, body: content.trim() }
  return { frontmatter: match[1].trim(), body: match[2].trim() }
}

/** `Bash(*), Read, Edit` → one chip each. A skill with none gets no row at all. */
function parseTools(allowedTools: string): string[] {
  return allowedTools.split(',').map((tool) => tool.trim()).filter(Boolean)
}

export default function SkillDocument({ skill }: { skill: SkillDetail }) {
  const t = useT()
  const [mode, setMode] = useState<'rendered' | 'raw'>('rendered')
  const [copied, setCopied] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const { body } = useMemo(() => splitFrontmatter(skill.content), [skill.content])
  const tools = useMemo(() => parseTools(skill.allowedTools), [skill.allowedTools])

  // Repo skills are a bare .md file — there is no directory of theirs to hold an
  // image, and skills.getImage only knows about ~/.claude/skills.
  useEffect(() => {
    setImageUrl(null)
    if (!skill.hasImage || !skill.dirName || skill.isRepoSkill) return
    let cancelled = false
    window.electronAPI.skills.getImage(skill.dirName).then((url) => {
      if (!cancelled) setImageUrl(url)
    })
    return () => { cancelled = true }
  }, [skill.dirName, skill.hasImage, skill.isRepoSkill])

  // A fresh skill resets the toggle: the mode is a way of reading this document,
  // not a preference that should follow you down the rail.
  useEffect(() => {
    setMode('rendered')
    setCopied(false)
  }, [skill.content])

  const handleCopy = () => {
    navigator.clipboard.writeText(skill.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sourcePath = skill.isRepoSkill
    ? skill.filePath
    : `~/.claude/skills/${skill.dirName}/SKILL.md`

  const badge = skill.isRepoSkill
    ? { label: t('skills.source.repoNamed', { name: skill.repoName ?? '' }), className: 'bg-blue/10 text-blue' }
    : { label: t('skills.source.builtIn'), className: 'bg-accent/10 text-accent' }

  return (
    <div className="flex flex-col gap-4 max-w-[62rem] w-full">
      {/* Header — the frontmatter, read as a card rather than as dead inputs */}
      <div className="px-5 py-4 rounded-2xl bg-surface-subtle border border-line-field">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center overflow-hidden shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={skill.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-text-secondary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-ink capitalize">{skill.name}</h2>
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${badge.className}`}>
                {badge.label}
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-surface text-text-secondary/70 border border-line-field">
                <Lock className="w-3 h-3" />
                {t('skills.doc.readOnly')}
              </span>
            </div>

            {skill.description && (
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{skill.description}</p>
            )}

            {skill.argumentHint && (
              <p className="mt-2 text-xs text-text-secondary/60">
                <span className="font-medium">{t('skills.doc.argumentHint')}</span>{' '}
                <code className="font-mono text-text-secondary">{skill.argumentHint}</code>
              </p>
            )}
          </div>
        </div>

        {tools.length > 0 && (
          <div className="mt-3.5 pt-3.5 border-t border-line-field flex items-baseline gap-2 flex-wrap">
            <span className="text-xs text-text-secondary/60 mr-1">{t('skills.editor.allowedTools')}</span>
            {tools.map((tool) => (
              <span
                key={tool}
                className="px-1.5 py-0.5 rounded bg-surface border border-line-field text-xs font-mono text-text-secondary"
              >
                {tool}
              </span>
            ))}
          </div>
        )}

        {sourcePath && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-text-secondary/40 min-w-0">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono truncate" title={sourcePath}>{sourcePath}</span>
          </div>
        )}
      </div>

      {/* Toolbar — rendered or raw, and a copy of the file as it is on disk */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-line-field">
          {(['rendered', 'raw'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                mode === option
                  ? 'bg-surface-strong text-ink'
                  : 'text-text-secondary hover:text-ink'
              }`}
            >
              {t(option === 'rendered' ? 'skills.doc.rendered' : 'skills.doc.raw')}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface hover:text-ink transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>

      {/* The document */}
      <div className="px-8 py-7 mb-6 rounded-2xl bg-surface border border-line-field">
        {mode === 'raw' ? (
          <pre className="text-xs font-mono leading-relaxed text-ink/80 whitespace-pre-wrap break-words">
            {skill.content}
          </pre>
        ) : body ? (
          <MarkdownView content={body} variant="document" />
        ) : (
          <p className="text-sm text-text-secondary/50 italic">{t('skills.doc.empty')}</p>
        )}
      </div>
    </div>
  )
}
