/**
 * Who wrote this, as a letter.
 *
 * NEVER an `<img>`, and that is a hard constraint rather than a stylistic one — though
 * no longer the constraint this note used to claim. It said the CSP forbade it; that
 * stopped being true on 2026-09-02, when `2de10759` widened `desktop/index.html` to
 * `img-src 'self' data: https:` so PR comment bodies could render their inline HTML.
 * This window would now load a `githubusercontent` avatar quite happily. (The two
 * auxiliary windows still stop at `data:` — `popover.html`, `quick-launch.html` — but
 * this panel does not run in either.)
 *
 * The real reason is upstream of the markup: THERE IS NO URL TO PUT IN AN `<img>`. The
 * queries this panel reads from ask for `author{login}` and deliberately never select
 * `avatarUrl`, and `github-graphql.test.ts:532` asserts it never creeps back in. So an
 * `<img>` here would be a request for a second network round trip per author, for a
 * 24 px face, in a panel that already knows who wrote what. The letter is what the data
 * we fetch can draw.
 *
 * The same badge `AccountAvatar` falls back to for the signed-in account — same
 * `bg-accent/20` fill, same `text-accent` mark, same `rounded-full` — one size up from
 * the settings rail footer's, because there it identifies one account in a 2 px-of-air
 * row and here it carries a conversation across a panel 70% of the window wide. What
 * is INSIDE the badge is the one thing the two disagree on, and on purpose: that one
 * falls back to a generic icon because there is only ever one account and it is named
 * in full beside it, while this one has to say which of several people is talking.
 *
 * One letter, not two. A GitHub login is a single token: `xrequillart` has no second
 * word to take an initial from, and `greptile-apps[bot]` splits on punctuation into
 * initials that read as an acronym for nothing. The first character is the whole of
 * what is reliably there.
 */
export default function InitialsAvatar({ login }: { login: string }) {
  // `?` for the author GitHub reports as null — `toComment` already turned those into
  // `ghost`, so this is the belt to that braces, not a case anyone should see.
  const initial = (login.trim()[0] || '?').toUpperCase()

  return (
    <span
      title={login}
      className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent text-[11px] font-semibold shrink-0"
    >
      {initial}
    </span>
  )
}
