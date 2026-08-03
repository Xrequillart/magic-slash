import type { Metadata } from 'next'
import { DesktopContent } from '@/components/site/desktop/DesktopContent'
import './desktop.css'

/**
 * magic-slash.io/desktop — ported from `docs/desktop.html`.
 *
 * The hero mockup is the SAME component the landing page uses: the two pages carried
 * byte-identical copies of that markup, and `script.js` drove both. One component now.
 */

export const metadata: Metadata = {
  title: 'Desktop App — magic-slash',
  description: 'All your agents, one screen.',
}

export default function DesktopPage() {
  return <DesktopContent />
}
