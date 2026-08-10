import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// What the menu bar was told, in order. Everything else about Tray is stubbed: the
// point of these tests is the two things that change on a beat, the mark and the text.
const bar = vi.hoisted(() => ({ images: [] as string[], titles: [] as string[] }))

vi.mock('electron', () => ({
  Tray: class {
    setToolTip(): void {}
    setImage(image: string): void {
      bar.images.push(image)
    }
    setTitle(title: string): void {
      bar.titles.push(title)
    }
    on(): void {}
    getBounds(): { x: number; y: number; width: number; height: number } {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    destroy(): void {}
  },
}))

// The aggregate state stands in for its own icon, so an assertion reads as the state
// the bar is showing rather than as a file name.
vi.mock('./tray-icons', () => ({ getIconForState: (state: string) => state }))

vi.mock('../windows/popover-window', () => ({
  createPopoverWindow: vi.fn(),
  togglePopover: vi.fn(),
  hidePopover: vi.fn(),
}))

import { TrayManager } from './tray-manager'
import type { AgentStateAggregator } from './agent-state-aggregator'

class FakeAggregator extends EventEmitter {
  state = 'none'
  active = 0
  questions = 0

  getState(): string {
    return this.state
  }
  getActiveCount(): number {
    return this.active
  }
  getQuestionCount(): number {
    return this.questions
  }
  update(): void {
    this.emit('change', { state: this.state, count: this.active, questions: this.questions })
  }
}

/** The frame currently on screen: everything before it has been painted over. */
function frame() {
  return { icon: bar.images.at(-1), title: bar.titles.at(-1) }
}

function started(aggregator: FakeAggregator): TrayManager {
  const manager = new TrayManager(aggregator as unknown as AgentStateAggregator)
  manager.init()
  return manager
}

beforeEach(() => {
  bar.images = []
  bar.titles = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TrayManager pulse', () => {
  it('alternates the agent total with ?N on the same beat as the colour', () => {
    const aggregator = new FakeAggregator()
    aggregator.state = 'question'
    aggregator.active = 3
    aggregator.questions = 2
    const manager = started(aggregator)

    // The loud beat: orange, and the count of agents that are asking rather than of
    // agents that exist.
    expect(frame()).toEqual({ icon: 'question', title: '?2' })

    vi.advanceTimersByTime(1000)
    expect(frame()).toEqual({ icon: 'none', title: '3' })

    vi.advanceTimersByTime(1000)
    expect(frame()).toEqual({ icon: 'question', title: '?2' })

    manager.destroy()
  })

  it('never shows a ? while nobody is asking', () => {
    const aggregator = new FakeAggregator()
    aggregator.state = 'running'
    aggregator.active = 2
    const manager = started(aggregator)

    vi.advanceTimersByTime(4000)

    expect(bar.titles.every(title => title === '2')).toBe(true)
    expect(bar.images).toContain('running')
    expect(bar.images).toContain('none')

    manager.destroy()
  })

  // A question arriving on an agent that was already `waiting` does not restart the
  // timer — it is the same pulse — so without the snap it could land on the quiet beat
  // and stay black, and untitled, for up to a second.
  it('shows the question on its loud beat as soon as it lands', () => {
    const aggregator = new FakeAggregator()
    aggregator.state = 'waiting'
    aggregator.active = 1
    const manager = started(aggregator)

    vi.advanceTimersByTime(1000)
    expect(frame()).toEqual({ icon: 'none', title: '1' })

    aggregator.state = 'question'
    aggregator.questions = 1
    aggregator.update()

    expect(frame()).toEqual({ icon: 'question', title: '?1' })

    manager.destroy()
  })

  it('stops pulsing and clears the title once every agent is gone', () => {
    const aggregator = new FakeAggregator()
    aggregator.state = 'running'
    aggregator.active = 1
    const manager = started(aggregator)

    aggregator.state = 'none'
    aggregator.active = 0
    aggregator.update()
    expect(frame()).toEqual({ icon: 'none', title: '' })

    const painted = bar.images.length
    vi.advanceTimersByTime(5000)
    expect(bar.images.length).toBe(painted)

    manager.destroy()
  })
})
