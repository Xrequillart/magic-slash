import { memo } from 'react'
import { Check, Clock, XCircle } from 'lucide-react'
import { WaveLoader } from './WaveLoader'
import { stateColors } from '../utils/stateColors'
import type { TerminalState } from '../../types'

/**
 * What an agent is doing, as one glyph: waving bars at work, a clock waiting on
 * you, a check when done, a cross on error — and deliberately NOTHING when idle,
 * so a quiet list stays quiet.
 *
 * Shared by the sidebar and the menu bar panel: both are lists of the same agents,
 * and a state that reads one way in the app and another in the menu bar is worse
 * than either. The colour comes from `stateColors`, and WaveLoader inherits it
 * through `currentColor`.
 */
export const AgentStateBadge = memo(function AgentStateBadge({ state }: { state: TerminalState }) {
  if (state === 'idle') return null

  const icon = () => {
    switch (state) {
      case 'working':
        return <WaveLoader className="flex-shrink-0" />
      case 'completed':
        return <Check className="w-4 h-4" />
      case 'waiting':
        return <Clock className="w-4 h-4" />
      case 'error':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  return <span className={`flex items-center ${stateColors[state]}`}>{icon()}</span>
})
