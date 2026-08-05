/**
 * Derive a friendly display name from an email address. Until GitHub OAuth
 * carries a real name (user_metadata.full_name), the local-part of the email is
 * the best we have: "xavier@poppins.io" → "Xavier", "jean.dupont@x" → "Jean".
 *
 * `fallback` is passed in rather than translated here: the function is pure and
 * module-scope, so reading a translator would freeze it at the boot language.
 *
 * Shared by the sidebar's account button and the menu bar panel — the same person
 * must not be called two different things in two places.
 */
export function displayNameFromEmail(email: string | undefined, fallback: string): string {
  if (!email) return fallback
  const local = email.split('@')[0]
  const first = local.split(/[._+-]/)[0]
  if (!first) return fallback
  return first.charAt(0).toUpperCase() + first.slice(1)
}
