'use client'

import { CommentCard, Text } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'author', type: 'string', description: 'Who wrote it, ALREADY DECORATED — @ada on a tracker whose people are handles, Ada Lovelace on one whose people are names. The @ is the caller’s: a login is a handle everywhere in that product, while @Ada Lovelace reads as a mention of an account that does not exist.' },
  { name: 'verb', type: 'string', description: 'The word after the name — “commented”. Only ever drawn beside an author.' },
  { name: 'title', type: 'string', description: 'What the strip says when there is no author: “Description”, “Comment”. For the first turn, and for the turns neither tracker attributes — an app posting through an API, an account since deleted.' },
  { name: 'date', type: 'string', description: 'When, already formatted. At the far end of the strip.' },
  { name: 'edited', type: '{ label, title }', description: 'That it was changed after it was posted. In the tooltip and not on the strip, which has one line and a name already on it.' },
  { name: 'empty', type: 'string', description: 'What the body says when there is none. A turn with no text is still a turn — an attachment, a reaction, a transition a tracker recorded as a comment — so it keeps its card and says so.' },
  { name: 'children', type: 'ReactNode', description: 'The body. The one node this file takes, and it has to be: a comment body is rendered markdown, and the renderer lives in the app.' },
]

export function CommentCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="CommentCard" uses={usesOf('commentcard')} onOpen={onOpen}>
        One turn in a conversation: who said it and when, then what they said.
      </EntryHeader>

      <EntrySection
        title="The description is one of these too"
        note="That is the decision the component is built on. A ticket page is a description followed by a thread, and giving the replies a different card would say they are a different kind of thing — they are not; the description is simply the first turn. What separates them is the strip: the description’s names the field, a comment’s names a person."
      >
        <Stage theme={theme}>
          <Specimen label="a description, a reply, an edited one, and a turn that carried no text">
            <div className="flex w-full flex-col gap-3">
              <CommentCard title="Description" date="24 Aug 2026">
                <Text size="sm" tone="secondary">
                  The board should keep the repository it was left on, across a restart.
                </Text>
              </CommentCard>
              <CommentCard author="@xrequillart" verb="commented" date="24 Aug 2026, 14:32">
                <Text size="sm" tone="secondary">
                  Storing it on the account rather than in page state — there is no config
                  file left to write it to.
                </Text>
              </CommentCard>
              <CommentCard
                author="Ada Lovelace"
                verb="commented"
                edited={{ label: 'edited', title: 'Edited on 25 Aug 2026, 09:04' }}
                date="24 Aug 2026, 18:02"
              >
                <Text size="sm" tone="secondary">Agreed. The fallback ladder is the part worth testing.</Text>
              </CommentCard>
              <CommentCard author="Ada Lovelace" verb="commented" date="25 Aug 2026, 09:10" empty="No text" />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="No border, and no plate under the strip either"
        note="It was border border-line-field around the card and bg-surface-subtle border-b border-line-subtle under the strip — a box, ruled off from a second box, on a page whose every other edge has gone."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The card is the plate now and the strip is just its first line: quiet ink, then
          the body under it. A reader loses nothing, because the strip was never
          distinguished by its ground — it was distinguished by being a name and a date
          where the rest is prose.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { CommentCard } from '@ds/desktop'

<CommentCard
  author={tracker === 'github' ? \`@\${comment.author}\` : comment.author}
  verb={t('tasks.detail.commented')}
  date={formatCommentDate(comment.createdAt, locale)}
  empty={t('tasks.detail.emptyComment')}
>
  {comment.body ? <MarkdownView content={comment.body} variant="document" /> : undefined}
</CommentCard>`}</Snippet>
      </EntrySection>
    </article>
  )
}
