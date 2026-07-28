import { redirect } from 'next/navigation'

/**
 * /admin has no content of its own — the back-office is its tabs, and Users is the
 * one you almost always want. Kept as a redirect rather than making Users live at
 * /admin, so all three sections are addressable in the same shape and the tab bar
 * has a URL to match against for each.
 *
 * A server redirect, so nothing paints first. It reveals nothing to a non-admin:
 * /admin/users is guarded by the layout, and every admin_* RPC re-checks in the
 * database regardless.
 */
export default function Admin() {
  redirect('/admin/users')
}
