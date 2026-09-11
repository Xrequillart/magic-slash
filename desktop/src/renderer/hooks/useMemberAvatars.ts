import { useEffect, useState } from 'react'

/**
 * Every member's photo, across every org given, keyed by user id.
 *
 * KEYED BY USER, NOT BY ORG, and the two orgs a colleague belongs to therefore
 * collapse onto one entry — which is right: a photo belongs to a person, not to a
 * membership. The settings page renders a card per org and a person can appear on
 * several of them; one flat map means the same face is fetched once and drawn
 * wherever it is needed.
 *
 * A HOOK OF ITS OWN rather than another field on `useOrg`, for the reason
 * `listMemberAvatars` spells out on the main-process side: `useOrg` is mounted by
 * five views and pulls the roster of every org each time, and only this one draws
 * faces. Nothing else pays for them.
 *
 * Never throws and never reports an error state. A roster whose faces did not load
 * is a roster with generic icons in it — the same thing a team where nobody has
 * uploaded a photo looks like — and a failure banner over a members list would be
 * louder than what it is reporting.
 */
export function useMemberAvatars(orgIds: string[]): Record<string, string> {
  const [avatars, setAvatars] = useState<Record<string, string>>({})

  // The ids are joined into a string rather than listed as a dependency directly:
  // `orgIds` is rebuilt by the caller on every render (it is mapped out of the org
  // list), so an array dependency compares unequal every time and would re-fetch in
  // a loop. The joined string changes only when the orgs actually do.
  const key = orgIds.join(',')

  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (ids.length === 0) {
      setAvatars({})
      return
    }
    let cancelled = false
    void (async () => {
      const perOrg = await Promise.all(
        ids.map((id) => window.electronAPI.org.memberAvatars(id).catch(() => ({}))),
      )
      if (cancelled) return
      setAvatars(Object.assign({}, ...perOrg))
    })()
    return () => { cancelled = true }
  }, [key])

  return avatars
}
