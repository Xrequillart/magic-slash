import type { Metadata } from 'next'
import { StoryContent } from '@/components/site/story/StoryContent'
import './story.css'

/** magic-slash.io/story — ported from `docs/story.html`. */

export const metadata: Metadata = {
  title: 'Our Story — magic-slash',
  description: 'We got tired of the copy-paste.',
}

export default function StoryPage() {
  return <StoryContent />
}
