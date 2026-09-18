import { useCallback, useEffect, useState } from 'react'
import { AvatarPicker, Button, DEFAULT_PORTRAIT_ID, Loader, type AvatarPickerOption } from '@ds/desktop'
import { Check, ImagePlus } from '@ds/desktop/icons'
import { Modal } from './Modal'
import { useT } from '../i18n'
import type { Portrait } from '../avatars/portraits'

/**
 * PICK A FACE: one of the thirty drawn portraits, or the photograph dialog.
 *
 * The one door to "change my avatar". It used to be the file picker itself — the row's
 * Edit button opened a native dialog and there was nothing else to choose — and the
 * upload is now the SECOND offer on this dialog rather than the only one, because most
 * people do not have a square photograph of themselves to hand and were therefore
 * stuck with the generic mark.
 *
 * IT WRITES NOTHING. Confirming reports a `data:` URL and closes; the upload button
 * reports that the user wants the file dialog instead. Both go back to
 * `CloudAccountSection`, which owns the session epoch, the toasts and the store — the
 * same split `AvatarCropModal` already makes, and for the same reason: two components
 * that can both call `setAvatar()` are two places for the sign-out-mid-upload bug to
 * live.
 *
 * ── THE CATALOGUE ARRIVES LATE, ON PURPOSE ────────────────────────────────────────
 *
 * The thirty portraits are a quarter of a megabyte of base64 (see `avatars/portraits.ts`
 * for why they are base64 at all), and most sessions never open this dialog. So the
 * module is reached with `await import()` the first time it opens, which is what lets
 * the bundler put it in a chunk of its own. Static-import it and nothing breaks — the
 * app just starts slower for everyone, silently, which is the kind of regression that
 * does not show up in a review.
 *
 * `loaded` IS MODULE STATE and not a `useState`, because the second open must not flash
 * a spinner at a catalogue that is already in memory: the dynamic import resolves from
 * the bundler's own cache in microseconds, but a promise still resolves a tick later,
 * and a tick is a frame with a loader in it. Holding the resolved list here makes the
 * second open synchronous.
 */
let loaded: readonly Portrait[] | null = null

interface Props {
  isOpen: boolean
  /**
   * The avatar in force, as the `data:` URL every surface is drawing — null when the
   * account has never been given one.
   *
   * Compared STRING TO STRING against the catalogue to decide which tile opens ringed.
   * That comparison holds because a portrait is uploaded byte for byte as it is stored
   * here and comes back down `${AVATAR_DATA_URL_PREFIX}${buffer.toString('base64')}`,
   * which is the same standard base64 the catalogue carries. A photograph matches
   * nothing, so no tile is ringed — which is correct, and is the state the grid's
   * `value={null}` exists for.
   */
  currentSrc: string | null
  /** Something is already being saved: the grid and both buttons go quiet. */
  busy: boolean
  /** A portrait was confirmed, as the payload to upload. */
  onConfirm: (dataUrl: string) => void
  /** "Use a photo instead": this dialog is done, the file picker takes over. */
  onUploadPhoto: () => void
  onClose: () => void
}

export function AvatarPickerModal({ isOpen, currentSrc, busy, onConfirm, onUploadPhoto, onClose }: Props) {
  const t = useT()
  const [portraits, setPortraits] = useState<readonly Portrait[] | null>(loaded)
  const [selected, setSelected] = useState<string | null>(null)

  // Fetch the catalogue the first time the dialog is opened, and never again — see the
  // note on `loaded`. Not gated on `portraits` being null: `loaded` is the shared fact
  // and this state is only a copy of it, so reading the module variable is what keeps a
  // second instance of this dialog from starting a second import.
  useEffect(() => {
    if (!isOpen || loaded) return
    let cancelled = false
    void (async () => {
      const module = await import('../avatars/portraits')
      loaded = module.PORTRAITS
      if (!cancelled) setPortraits(module.PORTRAITS)
    })()
    return () => { cancelled = true }
  }, [isOpen])

  /**
   * Which tile is ringed when the dialog opens.
   *
   * Re-run on every open rather than once, because the account's face can have changed
   * between two openings — an upload, a removal, a different person signing in — and a
   * dialog that reopened on the choice made last time would offer to re-apply a
   * portrait that is no longer anybody's.
   *
   * NO PHOTO SELECTS THE DEFAULT, which is not a guess about what the user wants: the
   * default portrait is the face actually on screen everywhere else in the app, so
   * opening this grid with nothing ringed would say the user has no face when they
   * plainly do. Confirm stays disabled until they move, so the pre-selection cannot
   * cause a write on its own.
   */
  useEffect(() => {
    if (!isOpen) return
    if (currentSrc === null) {
      setSelected(DEFAULT_PORTRAIT_ID)
      return
    }
    setSelected(portraits?.find((p) => p.src === currentSrc)?.id ?? null)
  }, [isOpen, currentSrc, portraits])

  const handleConfirm = useCallback(() => {
    const chosen = portraits?.find((p) => p.id === selected)
    if (!chosen) return
    onConfirm(chosen.src)
  }, [portraits, selected, onConfirm])

  /**
   * Whether confirming would change anything.
   *
   * `currentSrc === null` is NOT the same as "wearing the default": the account has no
   * stored avatar at all, and the default is what every surface draws in its absence.
   * Confirming it therefore DOES do something — it uploads those bytes, so the face the
   * user sees becomes the face their colleagues see too, and survives them later
   * picking a different default. Hence the comparison is against the stored bytes and
   * not against the id.
   */
  const chosenSrc = portraits?.find((p) => p.id === selected)?.src ?? null
  const unchanged = chosenSrc === null || chosenSrc === currentSrc

  const options: AvatarPickerOption[] = (portraits ?? []).map((portrait, index) => ({
    id: portrait.id,
    src: portrait.src,
    // A NUMBER AND NOT A DESCRIPTION. These are anonymous drawings; naming them would
    // mean thirty translated adjectives about thirty faces, which is both a lot of
    // copy and a lot of ways to describe a person badly. An ordinal names the tile,
    // which is all a screen reader needs to say which of thirty is which.
    label: t('cloud.avatar.portrait', { number: String(index + 1) }),
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('cloud.avatar.picker.title')}
      maxWidth="max-w-lg"
      footer={
        <>
          {/* `mr-auto` and not a second row: the footer is one line of `justify-end`,
              and the photo route is an ALTERNATIVE to everything on the right rather
              than a step before it. Pushed to the far side, it reads as the other
              door out of this dialog, which is what it is. */}
          <Button size="md" tone="neutral" icon={ImagePlus} onClick={onUploadPhoto} disabled={busy} className="mr-auto">
            {t('cloud.avatar.picker.upload')}
          </Button>
          <Button size="md" tone="neutral" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="md" tone="accent" icon={Check} onClick={handleConfirm} disabled={busy || unchanged}>
            {t('cloud.avatar.picker.confirm')}
          </Button>
        </>
      }
    >
      <p className="mb-4">{t('cloud.avatar.picker.hint')}</p>

      {portraits ? (
        <AvatarPicker
          options={options}
          value={selected}
          onSelect={setSelected}
          ariaLabel={t('cloud.avatar.picker.group')}
          disabled={busy}
        />
      ) : (
        // Held at the grid's own height — five rows of ~70px tiles and four 8px gaps,
        // which is 384 to the pixel at this dialog's width. A dialog that grew by two
        // hundred pixels the moment the chunk landed would jump under the pointer on
        // its way to the footer.
        <div className="flex h-96 items-center justify-center">
          <Loader label={t('common.loading')} />
        </div>
      )}
    </Modal>
  )
}
