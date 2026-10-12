import { at } from './timeline'

/**
 * THE SHORT CLIPS: windows onto the film, one feature each, for the site and social.
 * Each opens on its first chapter's title card and closes on the logo.
 */
export const CLIPS = [
  { id: 'Clip-Plan', from: at('plan'), to: at('start') },
  { id: 'Clip-Build', from: at('start'), to: at('workflow') },
  { id: 'Clip-Workflow', from: at('workflow'), to: at('close') },
  { id: 'Clip-Ship', from: at('ship'), to: at('resolve') },
  { id: 'Clip-Review', from: at('resolve'), to: at('outro') },
] as const

/** How long the logo holds at the end of a clip, in story frames. */
export const CLIP_END = 80
