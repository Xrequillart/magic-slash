import type { Metadata } from 'next'
import { PrivacyContent } from '@/components/site/privacy/PrivacyContent'

/**
 * magic-slash.io/privacy — what the product collects, and what it does not.
 *
 * A SERVER COMPONENT whose only job is the `metadata`, with the page in a client
 * component next door: the copy comes from the catalogues through `useT()`, and
 * `metadata` cannot be exported from a `'use client'` module. The same split every other
 * page in this group makes.
 *
 * `/privacy` HAD TO BE ADDED TO `PUBLIC_PATHS` (`lib/hostRouting.ts`), and this is the
 * one page on the site where forgetting it would be worst: a reader pressing "Privacy"
 * in the footer to find out what we collect, and being handed a login form on
 * `app.magic-slash.io` instead, has been answered in the least reassuring way available.
 * `hostRouting.test.ts` pins the entry.
 *
 * THE METADATA IS ENGLISH ONLY, like every other page here. Nothing in `app/(marketing)`
 * localises its `<title>`: the language is a client-side choice (`useLanguage`), and the
 * page is statically generated once. See `faq/page.tsx`.
 *
 * NO `FinalCtaSection`, which is the one deliberate difference from `/faq`. That page
 * closes on a download button because its last row is the reader's last objection,
 * answered. This one closes on what happens when you delete your account, and selling to
 * somebody who has just read the retention section would undo the tone of the page.
 *
 * WHAT THE COPY MAY SAY is decided in `lib/i18n/marketing/{en,fr}.ts`, and the rule it
 * was written under is worth restating where somebody will edit it: every claim on this
 * page must be sourced from code in this repository. No retention period we do not
 * enforce, no legal entity we do not have, no certification we have not been given.
 * Where the code does not settle a question, the copy says less rather than more.
 *
 * THAT IS A RULE, NOT A GUARANTEE THIS FILE CAN GIVE. Nothing here verifies it, and the
 * first version of the copy broke it in five places: a second token on disk it did not
 * mention, a fourth append-only table it counted as three, an unbounded jsonb blob it
 * enumerated as a closed list, two sentences about a "path" a reader could not tell
 * apart, and an account deletion narrower than the page implied. They are corrected,
 * and the note above each key in `en.ts` names the file to re-read. Check against the
 * code before changing a sentence; do not take this comment as the check.
 */

export const metadata: Metadata = {
  title: 'Privacy — magic-slash',
  description:
    'What Magic Slash stores, what stays on your machine, and how to get rid of all of it.',
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
