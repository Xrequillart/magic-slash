import type { TerminalState } from '../../types'

// Text colors per terminal state — sidebar variant uses muted idle color
export const stateColors: Record<TerminalState, string> = {
  idle: 'text-text-secondary',
  working: 'text-accent',
  waiting: 'text-yellow',
  completed: 'text-green',
  error: 'text-red',
}

// Text colors for icon sidebar — idle is white for contrast on dark bg
export const stateColorsIcon: Record<TerminalState, string> = {
  idle: 'text-white',
  working: 'text-accent',
  waiting: 'text-yellow',
  completed: 'text-green',
  error: 'text-red',
}

export const stateBgColors: Record<TerminalState, string> = {
  idle: 'bg-text-secondary/20',
  working: 'bg-accent/20',
  waiting: 'bg-yellow/20',
  completed: 'bg-green/20',
  error: 'bg-red/20',
}

// Background colors for icon sidebar — idle uses white for contrast
export const stateBgColorsIcon: Record<TerminalState, string> = {
  idle: 'bg-white/20',
  working: 'bg-accent/20',
  waiting: 'bg-yellow/20',
  completed: 'bg-green/20',
  error: 'bg-red/20',
}

export const stateHoverBgColors: Record<TerminalState, string> = {
  idle: 'hover:bg-text-secondary/10',
  working: 'hover:bg-accent/10',
  waiting: 'hover:bg-yellow/10',
  completed: 'hover:bg-green/10',
  error: 'hover:bg-red/10',
}
