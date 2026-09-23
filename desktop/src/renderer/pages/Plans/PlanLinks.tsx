import { useMemo, useState } from 'react'
import { Button, ExternalLinkCard, type ExternalLinkRow, type SelectOption } from '@ds/desktop'
import {
  CLAUDE_CORAL, ClaudeCode, Figma, Github, GoogleDocs, GoogleSheets, GoogleSlides, Link2, Loom, Miro, Notion, Plus,
} from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop'
import { useT } from '../../i18n'
import { usePlanLinks } from '../../hooks/usePlanLinks'
import {
  LINK_KINDS, LINK_KIND_NAMES, detectLinkKind, linkDisplayName, parseLinkUrl, toLinkKind, type LinkKind,
} from '../../utils/externalLinks'
import { planAuthor } from '../../utils/planRows'

/** The mark each tool is drawn with. Brand marks where the design system has one. */
const ICONS: Record<LinkKind, { icon: IconComponent; color?: string }> = {
  figma: { icon: Figma },
  figjam: { icon: Figma },
  notion: { icon: Notion },
  claude_artifact: { icon: ClaudeCode, color: CLAUDE_CORAL },
  google_docs: { icon: GoogleDocs },
  google_sheets: { icon: GoogleSheets },
  google_slides: { icon: GoogleSlides },
  miro: { icon: Miro },
  loom: { icon: Loom },
  github: { icon: Github },
  other: { icon: Link2 },
}

/** "Automatic": the tool read off the address. See `detectLinkKind`. */
const AUTO = 'auto'

/**
 * THE PLAN'S EXTERNAL LINKS — prototypes, mock-ups, notes kept in another tool — drawn under
 * its tickets and in their shape, with the way to add one on the heading's right.
 *
 * ROWS IN `plan_links`, NEVER IN THE SPEC: the spec is the agent's document and the next
 * upload rewrites it, where a link a colleague pinned has to stay. See 20260923110000.
 *
 * WHO MAY REMOVE A LINK is the table's to decide (whoever added it, the plan's owner, an org
 * admin). The bin is offered to the first two, the two this page can recognise without asking;
 * an admin removes a colleague's link from the webapp. Anybody who can read the plan may add.
 */
export function PlanLinks({
  sessionId,
  ownerId,
  viewerId,
  heading,
}: {
  sessionId: string
  ownerId: string
  viewerId?: string
  /** The section heading, drawn by the page so every section shares one. */
  heading: (title: string) => JSX.Element
}) {
  const t = useT()
  const links = usePlanLinks(sessionId)
  const [form, setForm] = useState<{ url: string; title: string; kind: string; busy: boolean; failed: boolean } | null>(null)

  const kindName = (kind: LinkKind) => (kind === 'other' ? t('plans.links.other') : LINK_KIND_NAMES[kind])

  const rows: ExternalLinkRow[] = useMemo(() => (links.read?.links ?? []).map((link) => {
    const kind = toLinkKind(link.kind)
    const author = planAuthor(link.authorId, links.read?.emailByAuthor ?? {})
    const mayRemove = !!viewerId && (link.authorId === viewerId || ownerId === viewerId)
    return {
      id: link.id,
      icon: ICONS[kind].icon,
      iconColor: ICONS[kind].color,
      title: link.title ?? linkDisplayName(link.url),
      subtitle: t('plans.links.addedBy', { kind: kindName(kind), author }),
      href: link.url,
      onOpen: () => { void window.electronAPI.shell.openExternal(link.url) },
      remove: mayRemove ? { label: t('plans.links.remove'), onRemove: () => { void links.remove(link.id) } } : undefined,
    }
  }), [links.read, links.remove, viewerId, ownerId, t])

  const detected = form ? detectLinkKind(form.url) : 'other'
  const kinds: SelectOption[] = [
    {
      value: AUTO,
      label: form?.url && parseLinkUrl(form.url)
        ? t('plans.links.autoDetected', { kind: kindName(detected) })
        : t('plans.links.auto'),
    },
    ...LINK_KINDS.map((kind) => ({ value: kind, label: kindName(kind), icon: ICONS[kind].icon })),
  ]

  const submit = async () => {
    if (!form) return
    const url = parseLinkUrl(form.url)
    if (!url) return
    setForm({ ...form, busy: true, failed: false })
    const ok = await links.add({
      sessionId,
      url: url.href,
      kind: form.kind === AUTO ? detectLinkKind(url.href) : form.kind,
      title: form.title.trim() || undefined,
    })
    setForm(ok ? null : { ...form, busy: false, failed: true })
  }

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        {heading(t('plans.links.title'))}
        {!form && (
          <div className="mb-2">
            <Button size="sm" tone="ghost" icon={Plus} onClick={() => setForm({ url: '', title: '', kind: AUTO, busy: false, failed: false })}>
              {t('plans.links.add')}
            </Button>
          </div>
        )}
      </div>
      {links.read === null ? (
        <p className="py-6 text-center text-sm text-text-secondary bg-surface-subtle rounded-xl">{t('common.loading')}</p>
      ) : (
        <ExternalLinkCard
          links={rows}
          empty={links.read.failed ? t('plans.links.readFailed') : t('plans.links.empty')}
          form={form ? {
            url: form.url,
            onUrl: (url) => setForm({ ...form, url, failed: false }),
            urlPlaceholder: t('plans.links.urlPlaceholder'),
            title: form.title,
            onTitle: (title) => setForm({ ...form, title }),
            titlePlaceholder: t('plans.links.titlePlaceholder'),
            kind: form.kind,
            kinds,
            onKind: (kind) => setForm({ ...form, kind }),
            submitLabel: t('plans.links.submit'),
            cancelLabel: t('common.cancel'),
            onSubmit: () => { void submit() },
            onCancel: () => setForm(null),
            canSubmit: !!parseLinkUrl(form.url),
            busy: form.busy,
            error: form.failed ? t('plans.links.failed') : undefined,
          } : undefined}
        />
      )}
    </>
  )
}
