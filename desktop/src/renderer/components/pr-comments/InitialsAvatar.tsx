/**
 * Who wrote this, as a letter.
 *
 * NEVER an `<img>`, and that is a hard constraint rather than a stylistic one: the
 * renderer's CSP is `img-src 'self' data:` (see `index.html`), so a `githubusercontent`
 * avatar is blocked before it is fetched — silently, with a broken box where a face was
 * meant to be. The queries this panel reads from therefore ask for `login` and nothing
 * else, and a `github-graphql.test.ts` case asserts no `avatarUrl` ever creeps back in.
 *
 * The same badge `SettingsAccountFooter` draws for the signed-in account — same
 * `bg-accent/20` fill, same `text-accent` letter, same `rounded-full` — one size up,
 * because there it identifies one account in a 2 px-of-air sidebar row and here it
 * carries a conversation across a panel 70% of the window wide.
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
