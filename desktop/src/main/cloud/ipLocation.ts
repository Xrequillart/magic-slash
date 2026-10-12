import type { IpLocation } from '../../types'

/**
 * Where an IP address is, roughly: its city and its country, for the sessions on
 * Security & Access.
 *
 * DB-IP's free API (`api.db-ip.com/v2/free`), HTTPS, no key, about a thousand lookups a
 * day per machine, and it asks for a credit line, which the page carries. The country
 * comes back as a CODE on purpose: the renderer names it in the interface's language
 * (`Intl.DisplayNames`), where DB-IP only speaks English.
 *
 * THE ADDRESSES LEAVE FOR A THIRD PARTY, which was a decision and not an accident: they
 * are the account owner's own, looked up only when the owner opens the page.
 *
 * Cached for the life of the process, misses included, so reopening the page is free and
 * a service that is down is asked once. A private or loopback address is never sent: it
 * has no location, and it says something about the network behind it.
 */

const ENDPOINT = 'https://api.db-ip.com/v2/free/'
const TIMEOUT_MS = 4000

const cache = new Map<string, Promise<IpLocation | null>>()

export function lookupIpLocation(ip: string | null | undefined): Promise<IpLocation | null> {
  if (!ip || isPrivateIp(ip)) return Promise.resolve(null)
  let pending = cache.get(ip)
  if (!pending) {
    pending = fetchLocation(ip)
    cache.set(ip, pending)
  }
  return pending
}

async function fetchLocation(ip: string): Promise<IpLocation | null> {
  try {
    const response = await fetch(ENDPOINT + encodeURIComponent(ip), { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) return null
    const body = (await response.json()) as { city?: unknown; countryCode?: unknown; error?: unknown }
    if (body.error) return null
    const city = typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null
    const countryCode =
      typeof body.countryCode === 'string' && /^[A-Z]{2}$/.test(body.countryCode) && body.countryCode !== 'ZZ'
        ? body.countryCode
        : null
    return city || countryCode ? { city, countryCode } : null
  } catch (error) {
    console.warn('[cloud] ip location lookup failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/** Loopback, private, link-local, CGNAT and unique-local ranges, v4 and v6. */
export function isPrivateIp(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/i, '')
  const octets = v4.split('.').map(Number)
  if (octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = octets
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  const v6 = ip.toLowerCase()
  return v6 === '::1' || v6 === '::' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)
}

/** Tests only. */
export function clearIpLocationCache(): void {
  cache.clear()
}
