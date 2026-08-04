/**
 * The hero mockup's run: six skills, played across all three columns.
 *
 * This is the sequence the old `terminalAnimation.ts` played — start, commit, pr, review,
 * resolve, done — rebuilt against the new markup. Same beats, same side effects: files
 * pile up during `/magic:start`, the commit lands and the ahead-count appears on
 * `/magic:commit`, the pull request row arrives on `/magic:pr`, and `/magic:done` flips
 * the sidebar agent to finished.
 *
 * The difference is HOW it is written. The old file spelled every timing out at its call
 * site across 559 lines, so retiming one beat meant reading all of them. Here the run is
 * DATA — a list of `{ at, run }` cues fed to one scheduler — and the phase structure is
 * discovered from the DOM, so adding a status line to a phase needs no change in here.
 *
 * Commands are typed into the COMPOSER at the bottom of the terminal, then submitted —
 * the composer empties and the line lands in the transcript above. That is where a person
 * would actually type, and separating typing from the transcript is what lets the
 * transcript lines settle at their own pace afterwards.
 *
 * Nothing in this file knows any user-facing string. Anything it needs to write comes off
 * a `data-` attribute the component put there, which keeps the copy in the catalogues.
 */

/** A single cue: run `fn` at `at` milliseconds from the start of the run. */
type Cue = { at: number; run: () => void }

/**
 * How a phase is paced, in ms.
 *
 * `type` is per character in the composer, `submit` is the beat between the last
 * character and hitting return, `pause` is the beat before the first status line,
 * `think` is the base dwell of a status line, and `gap` separates one from the next.
 */
type Pace = { type: number; submit: number; pause: number; think: number; gap: number }

/**
 * `/magic:start` is the phase a visitor actually READS — it is where they work out what
 * the thing does, and it is the one carrying the files landing in the panel beside it.
 * So it gets close to half again the dwell of the rest. By the time `/magic:commit`
 * arrives the pattern is established and a quicker cadence reads as fluency rather than
 * as rushing.
 *
 * The whole run is paced for someone READING it, not for someone who already knows what
 * it says: typing lands around 20 characters a second, and a status line holds long
 * enough that its label can be read before the check arrives.
 */
const PACE: Pace = { type: 45, submit: 260, pause: 340, think: 620, gap: 220 }
const PACE_START: Pace = { type: 70, submit: 420, pause: 520, think: 880, gap: 320 }
const paceFor = (index: number): Pace => (index === 0 ? PACE_START : PACE)

const PHASE_GAP = 620 // between one skill finishing and the next being typed
const TAIL = 1200 // before the replay button appears

/**
 * How long one status line spins before its check lands.
 *
 * A single fixed dwell reads as a progress bar. What makes it read as WORK is that the
 * lines take DIFFERENT amounts of time, so two things move it — a fixed cycle of
 * weights, and the length of the label, on the assumption that a line with more to say
 * stands in for more work. Both are deterministic: a replay looks like the first run.
 */
const THINK_WEIGHTS = [1, 1.32, 0.82, 1.16, 0.74, 1.24]
const thinkFor = (pace: Pace, label: string, index: number) =>
  Math.round(
    pace.think * THINK_WEIGHTS[index % THINK_WEIGHTS.length] * (0.9 + label.length / 120),
  )

/** Context window growth across the run, as a percentage at each phase boundary. */
const CONTEXT_BY_PHASE = [14, 22, 29, 35, 43, 47, 51]

export function mountMockup(root: HTMLElement): () => void {
  const one = <T extends HTMLElement = HTMLElement>(sel: string, scope: HTMLElement = root) =>
    scope.querySelector<T>(sel)
  const all = (sel: string, scope: HTMLElement = root) =>
    Array.from(scope.querySelectorAll<HTMLElement>(sel))

  const convo = one('[data-mk="convo"]')
  const phases = all('[data-mk="phase"]')
  if (!convo || phases.length === 0) return () => {}

  const replayBtn = one<HTMLButtonElement>('[data-mk="replay"]')
  const composerCmd = one('[data-mk="composer-cmd"]')
  const composerCaret = one('[data-mk="composer-caret"]')
  const ctxBar = one('[data-mk="ctx-bar"]')
  const ctxPct = one('[data-mk="ctx-pct"]')
  const ctxTokens = one('[data-mk="ctx-tokens"]')
  const loader = one('[data-mk="agent-loader"]')
  const check = one('[data-mk="agent-check"]')
  const attention = one('[data-mk="attention-count"]')
  const changesBlock = one('[data-mk="changes"]')
  const commitsBlock = one('[data-mk="commits"]')
  const cards = ['card-session', 'card-ticket', 'card-repo'].map((n) => one(`[data-mk="${n}"]`))
  const [cardSession, cardTicket, cardRepo] = cards
  const files = all('[data-mk="file"]')
  const gaugeSlots = all('.mk-gauge-slot')
  const filesCount = one('[data-mk="files-count"]')
  const ahead = one('[data-mk="ahead"]')
  const pr = one('[data-mk="pr"]')
  const prState = one('[data-mk="pr-state"]')
  const statePill = one('[data-mk="state-pill"]')

  /** Added/removed per file, read off the markup so the two cannot drift apart. */
  const fileStats = files.map((f) => ({
    added: Number(one('.mk-add', f)?.textContent?.replace(/[^\d]/g, '') ?? 0),
    removed: Number(one('.mk-del', f)?.textContent?.replace(/[^\d]/g, '') ?? 0),
  }))

  let timers: ReturnType<typeof setTimeout>[] = []
  let started = false

  const later = (fn: () => void, delay: number) => {
    timers = [...timers, setTimeout(fn, delay)]
  }
  const clear = () => {
    timers.forEach(clearTimeout)
    timers = []
  }

  /** Keep the newest line in view without letting the page itself scroll. */
  const follow = (el: HTMLElement) => {
    const target = el.offsetTop + el.offsetHeight - convo.clientHeight + 20
    if (target > convo.scrollTop) convo.scrollTo({ top: target, behavior: 'smooth' })
  }

  /**
   * The ticket's status pill. One step per beat of the workflow, each carrying its own
   * label and its own colour — the label off a `data-` attribute so the copy stays in the
   * catalogues, the colour off the class so restyling never means touching this file.
   */
  const TICKET_STEPS = ['progress', 'review', 'reviewed', 'done'] as const
  const setTicket = (step: (typeof TICKET_STEPS)[number]) => {
    if (!statePill) return
    statePill.textContent = statePill.dataset[step] ?? ''
    TICKET_STEPS.forEach((s) => statePill.classList.toggle(`is-${s}`, s === step))
  }

  const setContext = (pct: number) => {
    if (ctxBar) ctxBar.style.width = `${pct}%`
    if (ctxPct) ctxPct.textContent = `${pct}%`
    if (ctxTokens) ctxTokens.textContent = `${(pct * 9.98).toFixed(1)}k / 1.00M tokens`
  }

  /** Count text and diff gauge for however many files have landed so far. */
  const setFiles = (n: number) => {
    if (filesCount) {
      const d = filesCount.dataset
      filesCount.textContent = (n === 1 ? (d.one ?? '') : (d.many ?? '')).replace(
        '{n}',
        String(n),
      )
    }
    const added = fileStats.slice(0, n).reduce((s, f) => s + f.added, 0)
    const removed = fileStats.slice(0, n).reduce((s, f) => s + f.removed, 0)
    const total = added + removed
    const green = total > 0 ? Math.round((added / total) * gaugeSlots.length) : 0
    const red = total > 0 ? Math.round((removed / total) * gaugeSlots.length) : 0
    gaugeSlots.forEach((slot, i) => {
      slot.classList.toggle('is-add', total > 0 && i < green)
      slot.classList.toggle('is-del', total > 0 && i >= green && i < green + red)
    })
  }

  const finalState = () => {
    phases.forEach((p) => {
      const cmd = one('[data-mk="cmd"]', p)
      if (cmd) cmd.textContent = cmd.dataset.text ?? ''
      one('[data-mk="prompt"]', p)?.classList.add('is-in')
      all('[data-mk="run"]', p).forEach((r) => r.classList.add('is-in', 'is-done'))
      one('[data-mk="banner"]', p)?.classList.add('is-in')
    })
    if (composerCmd) composerCmd.textContent = ''
    composerCaret?.classList.remove('is-typing')
    cards.forEach((c) => c?.classList.add('is-in'))
    changesBlock?.classList.remove('is-in')
    commitsBlock?.classList.add('is-in')
    if (ahead) ahead.textContent = (ahead.dataset.text ?? '').replace('{n}', '1')
    pr?.classList.add('is-in')
    if (prState) prState.textContent = prState.dataset.merged ?? ''
    setTicket('done')
    loader?.classList.add('is-out')
    check?.classList.add('is-in')
    if (attention) attention.textContent = '1'
    setContext(CONTEXT_BY_PHASE[CONTEXT_BY_PHASE.length - 1])
    convo.scrollTop = convo.scrollHeight
  }

  const reset = () => {
    clear()
    phases.forEach((p) => {
      const cmd = one('[data-mk="cmd"]', p)
      if (cmd) cmd.textContent = ''
      one('[data-mk="prompt"]', p)?.classList.remove('is-in')
      all('[data-mk="run"]', p).forEach((r) => r.classList.remove('is-in', 'is-done'))
      one('[data-mk="banner"]', p)?.classList.remove('is-in')
    })
    if (composerCmd) composerCmd.textContent = ''
    composerCaret?.classList.remove('is-typing')
    cards.forEach((c) => c?.classList.remove('is-in'))
    files.forEach((f) => f.classList.remove('is-in'))
    changesBlock?.classList.remove('is-in')
    commitsBlock?.classList.remove('is-in')
    if (ahead) ahead.textContent = ''
    pr?.classList.remove('is-in')
    if (prState) prState.textContent = prState.dataset.review ?? ''
    setTicket('progress')
    // No status icon at all to begin with: the agent has not been given anything yet,
    // which is `idle` in the app, and `idle` renders nothing.
    loader?.classList.add('is-out')
    check?.classList.remove('is-in')
    if (attention) attention.textContent = '2'
    setContext(CONTEXT_BY_PHASE[0])
    convo.scrollTop = 0
    replayBtn?.classList.remove('is-in')
  }

  /** When each status line of a phase starts spinning and when its check lands. */
  type RunTime = { in: number; done: number }

  /**
   * Side effects, keyed by the phase they belong to. Cues are placed against the status
   * lines they belong to rather than against a cadence of their own, so retiming a phase
   * cannot slide a panel update off the line that is supposed to cause it. `start` is the
   * moment the phase's command lands in the transcript.
   */
  const sideEffects = (index: number, start: number, end: number, runTimes: RunTime[]): Cue[] => {
    const last = runTimes[runTimes.length - 1]
    switch (index) {
      // /magic:start — the info panel is built card by card, then the worktree fills
      // with uncommitted work. This is the phase that takes the panel from empty to full.
      case 0: {
        const repoAt = runTimes[2]?.done ?? end
        return [
          // Handed its first command, the agent goes from idle to working — which is the
          // moment its spinner appears, and the moment it gets a session to show.
          { at: start, run: () => loader?.classList.remove('is-out') },
          { at: start, run: () => cardSession?.classList.add('is-in') },
          { at: runTimes[0]?.done ?? start, run: () => cardTicket?.classList.add('is-in') },
          // The repository lands with the worktree that created it, then its uncommitted
          // list opens and a file arrives per beat while the last line is still spinning.
          { at: repoAt, run: () => cardRepo?.classList.add('is-in') },
          { at: repoAt + 300, run: () => changesBlock?.classList.add('is-in') },
          ...files.map((f, i) => ({
            at: repoAt + 560 + i * 400,
            run: () => {
              f.classList.add('is-in')
              setFiles(i + 1)
            },
          })),
        ]
      }
      // /magic:commit — the work becomes a commit, so the uncommitted list empties.
      case 1:
        return [
          {
            at: last?.done ?? end,
            run: () => {
              changesBlock?.classList.remove('is-in')
              files.forEach((f) => f.classList.remove('is-in'))
            },
          },
          {
            at: (last?.done ?? end) + 260,
            run: () => {
              commitsBlock?.classList.add('is-in')
              if (ahead) ahead.textContent = (ahead.dataset.text ?? '').replace('{n}', '1')
            },
          },
        ]
      // /magic:pr — the pull request row arrives with the line that opened it, and the
      // ticket moves to review with the line that moved it.
      case 2:
        return [
          { at: runTimes[1]?.done ?? end, run: () => pr?.classList.add('is-in') },
          { at: last?.done ?? end, run: () => setTicket('review') },
        ]
      // /magic:review — the review comes back with comments, so the ticket has been read.
      case 3:
        return [{ at: last?.done ?? end, run: () => setTicket('reviewed') }]
      // /magic:done — the agent settles and the ticket closes.
      case 5:
        return [
          // The sidebar row hands its spinner over to the green check, in place.
          { at: last?.in ?? end, run: () => loader?.classList.add('is-out') },
          { at: last?.done ?? end, run: () => check?.classList.add('is-in') },
          {
            at: (last?.done ?? end) + 220,
            run: () => {
              if (prState) prState.textContent = prState.dataset.merged ?? ''
              setTicket('done')
            },
          },
          {
            at: (last?.done ?? end) + 460,
            run: () => { if (attention) attention.textContent = '1' },
          },
        ]
      default:
        return []
    }
  }

  /** Build the whole run as cues, then hand them to the scheduler. */
  const build = (): Cue[] => {
    const cues: Cue[] = []
    let t = 500

    phases.forEach((phase, index) => {
      const pace = paceFor(index)
      const prompt = one('[data-mk="prompt"]', phase)
      const cmdEl = one('[data-mk="cmd"]', phase)
      const runs = all('[data-mk="run"]', phase)
      const text = cmdEl?.dataset.text ?? ''

      // The command is typed where a person would type it: the composer at the bottom of
      // the terminal, with the caret held solid while the keys are landing.
      const typeStart = t
      cues.push({ at: typeStart, run: () => composerCaret?.classList.add('is-typing') })
      for (let i = 1; i <= text.length; i++) {
        cues.push({
          at: typeStart + i * pace.type,
          run: () => { if (composerCmd) composerCmd.textContent = text.slice(0, i) },
        })
      }
      const typedAt = typeStart + text.length * pace.type

      // Then it is submitted — the composer empties and the line lands in the transcript.
      const submitAt = typedAt + pace.submit
      cues.push({
        at: submitAt,
        run: () => {
          if (composerCmd) composerCmd.textContent = ''
          composerCaret?.classList.remove('is-typing')
          if (cmdEl) cmdEl.textContent = text
          prompt?.classList.add('is-in')
          if (prompt) follow(prompt)
        },
      })

      // Then the status lines, each spinning for as long as its own work takes.
      const runTimes: RunTime[] = []
      let r = submitAt + pace.pause
      runs.forEach((runEl, i) => {
        const think = thinkFor(pace, one('em', runEl)?.textContent ?? '', i)
        cues.push({
          at: r,
          run: () => {
            runEl.classList.add('is-in')
            follow(runEl)
          },
        })
        cues.push({ at: r + think, run: () => runEl.classList.add('is-done') })
        runTimes.push({ in: r, done: r + think })
        r += think + pace.gap
      })

      // A phase may close with a banner, placed after the panel has finished settling so
      // it reads as the conclusion of everything above it rather than as one more line.
      const banner = one('[data-mk="banner"]', phase)
      if (banner) {
        const at = r + 560
        cues.push({ at, run: () => { banner.classList.add('is-in'); follow(banner) } })
        r = at + pace.gap
      }

      const end = r
      cues.push(...sideEffects(index, submitAt, end, runTimes))
      cues.push({ at: end, run: () => setContext(CONTEXT_BY_PHASE[index + 1]) })

      t = end + PHASE_GAP
    })

    // `follow` scrolls smoothly, which can be left mid-flight when the last line lands.
    // Snap to the end so the resting state always shows the run finishing.
    cues.push({
      at: t + TAIL,
      run: () => {
        convo.scrollTop = convo.scrollHeight
        replayBtn?.classList.add('is-in')
      },
    })
    return cues
  }

  const play = () => {
    reset()
    build().forEach((cue) => later(cue.run, cue.at))
  }

  // ── Reduced motion: show the finished state, never animate ──
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    finalState()
    return () => clear()
  }

  // Signals to the stylesheet that the script is in control. Until this lands, the CSS
  // paints the FINISHED state — so the served HTML reads correctly before hydration and
  // for anyone without JavaScript, instead of showing an empty terminal.
  root.dataset.ready = 'true'
  reset()

  const onReplay = () => play()
  replayBtn?.addEventListener('click', onReplay)

  // Start once, when the window is actually on screen — same trigger and threshold the
  // old animation used, so it still begins where the visitor can see it.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started) {
          started = true
          play()
        }
      })
    },
    { threshold: 0.3 },
  )
  observer.observe(root)

  return () => {
    observer.disconnect()
    replayBtn?.removeEventListener('click', onReplay)
    clear()
    delete root.dataset.ready
  }
}
