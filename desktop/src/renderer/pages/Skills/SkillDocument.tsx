import { useEffect, useMemo, useState } from 'react'
import { Button, Card, SkillHeader, TabStrip, Text } from '@ds/desktop'
import { Check, Copy } from '@ds/desktop/icons'
import MarkdownView from '../../components/file-preview/MarkdownView'
import type { SkillDetail } from '../../hooks/useSkills'
import { useT } from '../../i18n'

/**
 * A skill nobody can edit here — a built-in, or one that lives in a repository —
 * shown as what it actually is: a document. The editor's disabled form fields
 * said "you may not touch this" far louder than they said what the skill does,
 * and the instructions themselves sat in a greyed-out monospace textarea.
 *
 * So: `SkillHeader` for the frontmatter, then the body rendered as markdown, in
 * the same reading style as the file preview drawer. Raw mode keeps the original
 * SKILL.md within reach for anyone copying it into a prompt or a repo of theirs.
 *
 * THIS FILE DRAWS NOTHING NOW. The masthead is a design-system component, the
 * mode switch is the `TabStrip` every other pill rail in the app is, and the
 * document stands on a `Card`. What is left here is what genuinely belongs to
 * the app: splitting a SKILL.md, resolving where it lives on disk, and the
 * markdown renderer — which is the desktop's own and has no business in a folder
 * the marketing site compiles.
 */

/** A skill's origin, as `Label` wants it: a value, never a class. */
const SOURCE_COLOR = {
  repo: 'rgb(var(--c-blue, 59 130 246))',
  builtIn: 'rgb(var(--c-accent, 99 102 241))',
}

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

  const source = skill.isRepoSkill
    ? { label: t('skills.source.repoNamed', { name: skill.repoName ?? '' }), color: SOURCE_COLOR.repo }
    : { label: t('skills.source.builtIn'), color: SOURCE_COLOR.builtIn }

  return (
    <div className="flex flex-col gap-4 w-full">
      <SkillHeader
        name={skill.name}
        imageUrl={imageUrl}
        source={source}
        readOnlyLabel={t('skills.doc.readOnly')}
        description={skill.description}
        argumentLabel={t('skills.doc.argumentHint')}
        argumentHint={skill.argumentHint}
        toolsLabel={t('skills.editor.allowedTools')}
        tools={tools}
        sourcePath={sourcePath}
      />

      {/* Rendered or raw, and a copy of the file as it is on disk. The switch was a
          hand-built pair of pills with its own `p-0.5` track; it is the app's one
          `TabStrip` now, which measures its pill instead of assuming two equal halves. */}
      <div className="flex items-center justify-end gap-2">
        <TabStrip
          items={[
            { key: 'rendered', label: t('skills.doc.rendered') },
            { key: 'raw', label: t('skills.doc.raw') },
          ]}
          activeKey={mode}
          onSelect={(key) => setMode(key as 'rendered' | 'raw')}
          ariaLabel={t('skills.doc.rendered')}
        />
        {/* The tick is the tone and not an icon swap: `Button` has no `success`, so the
            mark carries it — see `ButtonIcon.success`, which says the same thing about a
            state a control wears for two seconds rather than a kind of control it is. */}
        <Button
          size="sm"
          tone="neutral"
          icon={copied ? Check : Copy}
          onClick={handleCopy}
        >
          {copied ? t('common.copied') : t('common.copy')}
        </Button>
      </div>

      {/* `roomy` — the rung that exists for exactly this: a card you READ. */}
      <Card padding="roomy" className="mb-6">
        {mode === 'raw' ? (
          <pre className="text-xs font-mono leading-relaxed text-ink/80 whitespace-pre-wrap break-words">
            {skill.content}
          </pre>
        ) : body ? (
          <MarkdownView content={body} variant="document" />
        ) : (
          <Text size="sm" tone="secondary" className="block italic opacity-50">
            {t('skills.doc.empty')}
          </Text>
        )}
      </Card>
    </div>
  )
}
