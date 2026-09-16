/**
 * What a handle is allowed to look like, in one place.
 *
 * WHY A MODULE, and it is `avatar.ts`'s reason next door: a handle is judged in three
 * places that cannot import each other's code — the RENDERER, which greys out the save
 * button and says why while the user is still typing; the MAIN process, which is the
 * end of the preload bridge and therefore the boundary renderer input actually crosses;
 * and POSTGRES, where `profiles_username_format` (migration 20260916090000) states the
 * same rule in SQL. Three spellings of one rule is three chances for a handle the form
 * accepted to be refused by the column, with nothing on screen able to explain it.
 *
 * The SQL copy is the one that cannot be imported, so it is the one that has to be kept
 * in step by hand — `USERNAME_PATTERN` below and the check constraint are deliberately
 * the same regex, character for character, and each names the other.
 *
 * DELIBERATELY PURE, and with NO i18n: a refusal comes back as a REASON CODE and never
 * as a sentence, because the renderer owns the catalogue and this module has no idea
 * what language anyone is reading in. Same contract as `AvatarRejection`.
 */

/** The shortest handle. Two characters is an initialism, not a name someone is known by. */
export const USERNAME_MIN_LENGTH = 3

/**
 * The longest. The account card TRUNCATES, so this is a drawing decision before it is a
 * storage one: past thirty characters the card shows an ellipsis instead of a handle, and
 * a limit the column does not state is a limit the user meets after pressing save.
 */
export const USERNAME_MAX_LENGTH = 30

/**
 * The shape, and the twin of `profiles_username_format` in
 * `supabase/migrations/20260916090000_profiles_username.sql`. Edit one, edit the other.
 *
 * The character class is about the handle once it is DRAWN: no spaces to collapse, no
 * punctuation that reads as syntax in a URL or a mention, nothing outside ASCII that
 * renders as a box on someone else's machine. The first character is constrained
 * separately so a handle cannot open with the separators — `.config` and `-f` read as a
 * hidden file and a flag rather than as people.
 *
 * The bounds are spelled as literals rather than interpolated from the two constants
 * above, so this string stays something you can read against the SQL side by side.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/

/**
 * Why a handle was refused, as a code the renderer translates.
 *
 * `taken` is NOT in this union and that is the point of the split: everything here is
 * decidable from the string alone, offline, on every keystroke. Whether somebody else
 * already holds it is a question for the server, it has a different answer every second,
 * and it is the one refusal a form cannot pre-empt — see `username_available`'s note on
 * why the unique index and not the check is what ultimately decides.
 */
export type UsernameRejection = 'too_short' | 'too_long' | 'bad_characters'

export type UsernameVerdict = { ok: true; username: string } | { ok: false; reason: UsernameRejection }

/**
 * Judge a typed handle, and hand back the exact string to store.
 *
 * IT TRIMS AND THE CALLER STORES WHAT COMES BACK, rather than trimming at each call
 * site: a trailing space survives a paste, is invisible in the field, and would fail the
 * pattern with `bad_characters` — a message about characters, for a character the user
 * cannot see. Trimmed first, the same paste simply works.
 *
 * It does NOT lower-case. Uniqueness is case-insensitive (the index is on
 * `lower(username)`) but the column stores the capitalisation its owner chose, because
 * that is what gets drawn.
 *
 * The two length codes are separate from `bad_characters` although the pattern would
 * catch all three, because "too short" and "that character is not allowed" send a person
 * to two different edits.
 */
export function validateUsername(raw: string): UsernameVerdict {
  const username = raw.trim()
  if (username.length < USERNAME_MIN_LENGTH) return { ok: false, reason: 'too_short' }
  if (username.length > USERNAME_MAX_LENGTH) return { ok: false, reason: 'too_long' }
  if (!USERNAME_PATTERN.test(username)) return { ok: false, reason: 'bad_characters' }
  return { ok: true, username }
}

/**
 * Do these two strings name the same handle?
 *
 * The comparison the UNIQUE INDEX makes, so the renderer can tell "I re-typed my own
 * handle" from "somebody else has this" without asking the server — and so the store can
 * skip a write that would change nothing. `toLowerCase` and not `localeCompare`: the
 * index is `lower()` in the database's collation and this has to agree with THAT, not
 * with the user's locale.
 */
export function sameUsername(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * What asking "is this one free?" comes back as, across the preload bridge.
 *
 * TWO LAYERS IN ONE UNION, because the caller does the same thing with both: a shape
 * the string never had (`ok: false`) and a shape the server judged (`available`). Only
 * the second one costs a round trip, and main answers the first without making one.
 */
export type UsernameCheckResult =
  | { ok: true; available: boolean }
  | { ok: false; reason: UsernameRejection }

/**
 * What claiming one comes back as.
 *
 * `username` on success is the string that was actually STORED — trimmed — so the card
 * draws what the row holds rather than what the field contained.
 *
 * `taken` joins the shape codes here and nowhere else: it is the one refusal that is
 * not decidable from the string, and the only place it can be established is the write
 * itself. `offline` means there was no session to write through; `error` is a transport
 * failure, reported rather than thrown so the modal can stay open on a message instead
 * of an unhandled IPC rejection.
 */
export type UsernameSaveResult =
  | { ok: true; username: string }
  | { ok: false; reason: UsernameRejection | 'taken' | 'offline' | 'error' }
