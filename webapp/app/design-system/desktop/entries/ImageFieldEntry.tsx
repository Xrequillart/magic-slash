'use client'

import { ImageField } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'src', type: 'string | null', description: 'The picture as it is now, a data: URL — Avatar.src’s contract and for its reason. Wins over filename.' },
  {
    name: 'filename',
    type: 'string | null',
    description:
      'A file CHOSEN BUT NOT YET READ, named rather than shown — the bytes are on disk and nothing has read them. This is the state a hand-built version forgets.',
  },
  { name: 'pickLabel / changeLabel / removeLabel', type: 'string', required: true, description: 'The three words, translated. This folder cannot look one up.' },
  { name: 'onPick / onRemove', type: '() => void', required: true, description: 'Open the file dialog; take the current picture away.' },
]

// A 1x1 sky-blue PNG, so the specimen has something to show without reaching a network.
const SWATCH =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#6366F1"/><circle cx="32" cy="26" r="11" fill="#A5B4FC"/><rect x="10" y="44" width="44" height="14" rx="7" fill="#A5B4FC"/></svg>',
  )

export function ImageFieldEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const labels = { pickLabel: 'Upload', changeLabel: 'Change', removeLabel: 'Remove the picture' }

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ImageField" uses={usesOf('imagefield')} onOpen={onOpen}>
        A picture a thing will wear, and the two gestures around it: choose one, or take
        the one there away.
      </EntryHeader>

      <EntrySection
        title="Three states, and they are not the same shape"
        note="A picture already saved is shown as itself, square. A file just chosen has nothing to show yet, so it is a chip naming the file. Neither, and the button stands alone. AvatarPicker is the other one: thirty drawn faces, a closed set the app ships — the two share nothing but the word “picker”."
      >
        <Stage theme={theme}>
          <Specimen label="saved, chosen-but-unread, and empty">
            <div className="flex w-full flex-col gap-4">
              <ImageField {...labels} src={SWATCH} onPick={() => undefined} onRemove={() => undefined} />
              <ImageField {...labels} filename="brand-designer-cover.png" onPick={() => undefined} onRemove={() => undefined} />
              <ImageField {...labels} onPick={() => undefined} onRemove={() => undefined} />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The cross is a control IN THE ROW and not a badge on the corner of the
          thumbnail. A 20px target floating half off a picture is the smallest thing on
          the form and the only one that destroys anything; beside the button that
          replaces it, the two gestures read as the pair they are.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ImageField } from '@ds/desktop'

<ImageField
  src={imagePreview}
  filename={imagePath?.split('/').pop() ?? null}
  pickLabel={t('skills.editor.upload')}
  changeLabel={t('skills.editor.change')}
  removeLabel={t('common.remove')}
  onPick={handlePickImage}
  onRemove={handleRemoveImage}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
