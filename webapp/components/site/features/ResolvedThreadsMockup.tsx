'use client'

import { Check, GitCommitHorizontal, UserRound } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'

/**
 * The visual inside the `/magic:resolve` card: a pull request's conversations AFTER the
 * command has run — two settled and collapsed, one still open with the reply that argues
 * for a compromise.
 *
 * WHAT IT REPLACES, AND WHY. This card used to draw GitHub's green merge button being
 * pressed. It was the prettiest drawing on the page and the least honest one:
 * `/magic:resolve` does not merge anything, and a card whose visual shows an action the
 * command cannot take teaches the reader the wrong thing about it. What the command
 * actually produces is this — a fix commit, a reply in each thread, threads marked
 * resolved (Steps 5 to 7 of `skills/magic-resolve/SKILL.md`) — so this is what the card
 * draws now.
 *
 * IT DRAWS THE SENTENCE ABOVE IT. The card's own copy claims the command "applies the
 * review feedback — and argues back where a suggestion deserves a compromise rather than
 * obedience", and nothing else on this page shows that half. So the expanded thread is
 * the one where the reply pushes back: it says what it did instead, why, and leaves the
 * thread OPEN because the reviewer, not the agent, is the one who closes an argument.
 * That is also why its badge reads "Open" rather than something softer — a card that
 * showed three green ticks would be claiming the agent resolves what it has not settled.
 *
 * TWO COLLAPSED, ONE EXPANDED, and the ratio is doing two jobs. It is what GitHub itself
 * does — a resolved conversation collapses to a one-line bar — and it is the only shape
 * that fits three threads in 224px while leaving one of them readable. The collapsed
 * pair carries the volume and the commit; the expanded one carries the argument.
 *
 * ONE SHA ON BOTH COLLAPSED ROWS, and it is not a copy-paste slip: `resolve.commitMode`
 * defaults to `"new"`, which is ONE commit for the whole run, so every thread it answers
 * cites the same seven characters. `MSG_REPLY_TEMPLATE` in the skill's `messages.md` is
 * the sentence those replies are built from — "Addressed in {COMMIT_SHA} — {summary}" —
 * and the chip here is that substitution, drawn rather than spelled out.
 *
 * THE COMMENTS COME FROM SOMEBODY ELSE, unlike the ones in `ReviewThreadsMockup` next
 * door. That card's author is "you" because `/magic:review` posts through your own `gh`
 * credentials; this one's opening comment is a REVIEWER's, because the threads
 * `/magic:resolve` reads are the ones Step 3 pulls from `CHANGES_REQUESTED` reviews and
 * Step 7.5 re-requests a review from. The reply is yours, for the same `gh` reason as
 * next door — which is why it reuses that card's `author` key rather than declaring a
 * second spelling of the same word.
 *
 * `bg-white`, the same rule the other panels follow: clear your own ground. This card is
 * `tone-indigo` — the darkest ground in the cycle — so white panels on it read as lifted
 * rather than as a tint, and no border is needed to hold them apart from it.
 *
 * ENTRANCE BY `Reveal`, bottom to top, staggered, once on mount. Borrowed from the review
 * card deliberately: the two sit in the same grid row and are two halves of one moment, so
 * they should arrive the same way. `Reveal` also renders the resting state on the server
 * and drops the animation under `prefers-reduced-motion`, which is why it is worth reusing
 * rather than re-keyframing.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and its words paraphrase the card's
 * own description sitting directly above it.
 */

/**
 * Who wrote the opening comment, and who answered. Both are language, so both are keys.
 *
 * `AUTHOR` is the review card's own key rather than a `site.resolveCard.*` twin: it is
 * the same word for the same person, and two keys holding "you" is two things to keep in
 * step for no gain.
 */
const REVIEWER: MessageKey = 'site.resolveCard.reviewer'
const AUTHOR: MessageKey = 'site.reviewCard.author'

/**
 * The commit `/magic:resolve` pushed. A literal, not a catalogue entry — seven hex
 * characters are not language, and the skill's reply template drops the same short SHA
 * into every thread it answers.
 */
const SHA = 'a3f1c2d'

/**
 * The two conversations that are done with. Paths are real files in this repository, and
 * the line numbers point at the code the comment would have been about — `features.ts`
 * around the visuals map, `hostRouting.ts` around the public paths. Code, so literals.
 *
 * `hostRouting.ts:47` IS THE REVIEW CARD'S FIRST THREAD, and it is here on purpose. The
 * two cards sit side by side in the same grid row: the one on the left shows that comment
 * being posted, and this row shows it settled with the commit that answered it. A reader
 * who notices has found the loop the section's caption claims — two skills to read the
 * work back and answer it — without a word of copy spent saying so.
 */
const SETTLED: readonly string[] = [
  'webapp/lib/features.ts:399',
  'webapp/lib/hostRouting.ts:47',
]

/**
 * The one still open. `components/ui.tsx:421` is where `TONE_HEIGHT` is declared, and the
 * reply below is that declaration's own argument — a fixed height clips the French copy,
 * so the cards take a minimum instead. A reader who follows the path finds the reasoning
 * written out there, which is the sort of detail worth spending a mockup on.
 */
const OPEN_THREAD = {
  path: 'webapp/components/ui.tsx:421',
  comment: 'site.resolveCard.comment' as MessageKey,
  reply: 'site.resolveCard.reply' as MessageKey,
}

/** The disc a name sits behind. A glyph and not an initial, for the reason next door:
 *  "you" and "vous" start with different letters, and an initial would be the one part of
 *  this drawing that changed shape with the language. */
function Avatar({ tone }: { tone: 'reviewer' | 'you' }) {
  return (
    <span
      className={[
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
        tone === 'you' ? 'bg-accent/15 text-accent' : 'bg-ink/10 text-ink/50',
      ].join(' ')}
    >
      <UserRound className="h-2.5 w-2.5" />
    </span>
  )
}

export function ResolvedThreadsMockup() {
  const { t } = useT()

  return (
    // CROPPED ON TWO EDGES, and drawn a size up — which is a different bargain from the
    // one the other panels strike, so it is worth writing down.
    //
    // Those panels are cropped at the BOTTOM ONLY, because their meaning runs left to
    // right and cutting a side would take words. This one is not asking to be read. What
    // it has to carry is three facts a reader takes in at a glance — there are ticks,
    // they say RESOLVED, and one conversation is still open with messages in it — and at
    // the size that fits a whole thread inside the card, none of the three was legible.
    // So the drawing is scaled up until they are, and the width it then needs is taken
    // from OUTSIDE the card: `-mr-8` runs it 32px past the right edge, where the card's
    // own `overflow-hidden` cuts it.
    //
    // That crop is the point rather than the price. A panel that ends inside its card
    // reads as a diagram of a UI; one that runs off two edges reads as a window onto a
    // real screen, and the eye stops looking for the parts it cannot see. It is also why
    // nothing here truncates with an ellipsis any more: an ellipsis is a thing a UI does
    // on purpose, and it would say the file paths were shortened rather than merely out
    // of frame.
    //
    // `pl-7` alone, since there is no right inset left to match it.
    <div aria-hidden className="-mb-6 -mr-8 pl-7 pt-1">
      {/* `h-56` still, so the panel's box lines up with its neighbours' — but the card
          clips the `-mb-6`, so ~200 of those pixels are what a reader ever sees, and
          everything below is laid out against that number rather than against 224.
          
          It comes to a little more than 200 in both languages, and the overshoot is
          TUNED rather than tolerated: `pt-1` and `gap-1` are what put the crop through
          the middle of the reply's second line instead of shaving its ascenders, which
          is the difference between a line that is cut off and a line that looks like a
          rendering fault. */}
      <div className="flex h-56 flex-col gap-1 overflow-hidden">
        {SETTLED.map((path, index) => (
          <Reveal key={path} order={index}>
            {/* A settled conversation, collapsed the way GitHub collapses one.
                
                LEFT-ANCHORED, WHICH IS THE WHOLE ORDERING RULE HERE. This row used to
                push its state to the right with `ml-auto`, and under a right crop that
                is precisely where it would have gone missing. What must survive the cut
                goes first — the tick, the word, the commit — and the file path, the one
                part a reader can afford to lose, is what runs off the edge. */}
            <div className="flex items-center gap-2.5 rounded-lg bg-white px-3.5 py-2">
              <Check className="h-4 w-4 shrink-0 text-green" />
              <span className="shrink-0 text-[13px] font-semibold text-ink">
                {t('site.resolveCard.resolved')}
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[11px] text-ink/60">
                <GitCommitHorizontal className="h-3 w-3" />
                {SHA}
              </span>
              {/* `whitespace-nowrap`, so the path leaves the frame instead of wrapping
                  into a second line the row has no height for. */}
              <span className="whitespace-nowrap font-mono text-[11px] text-ink/45">{path}</span>
            </div>
          </Reveal>
        ))}

        <Reveal order={SETTLED.length}>
          <div className="overflow-hidden rounded-lg bg-white">
            {/* The state first, the anchor after it — same rule as the rows above.
                "Open" is grey rather than red: the thread is waiting on a person, which
                is not a failure. */}
            <div className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-2">
              <span className="shrink-0 rounded bg-ink/5 px-2 py-0.5 text-[13px] font-semibold text-ink/60">
                {t('site.resolveCard.open')}
              </span>
              <span className="whitespace-nowrap font-mono text-[11px] text-ink/45">
                {OPEN_THREAD.path}
              </span>
            </div>

            {/* What the reviewer asked for. */}
            <div className="flex gap-2 px-3.5 py-2">
              <Avatar tone="reviewer" />
              <p className="whitespace-nowrap text-[13px] leading-relaxed text-ink/60">
                <span className="font-semibold text-ink">{t(REVIEWER)}</span>{' '}
                {t(OPEN_THREAD.comment)}
              </p>
            </div>

            {/* The answer, indented and on the page's own off-white so it reads as a
                reply rather than a second comment. It is the block the bottom crop lands
                in, which is the right one to lose the end of: a reader has already been
                told there is an argument here by the badge above. */}
            <div className="flex gap-2 border-t border-hairline bg-canvas py-2 pl-7 pr-3.5">
              <Avatar tone="you" />
              {/* THE ONE PARAGRAPH THAT WRAPS. Everything above it is `whitespace-nowrap`
                  and leaves the frame sideways; this one runs to a second line on
                  purpose, because that second line is what the BOTTOM crop cuts. Without
                  it the last block ended flush with the card's edge and the panel read as
                  a thing that happened to fit rather than a window onto something
                  larger. */}
              <p className="text-[13px] leading-relaxed text-ink/60">
                <span className="font-semibold text-ink">{t(AUTHOR)}</span>{' '}
                {t(OPEN_THREAD.reply)}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
