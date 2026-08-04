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
 * Nothing in this file knows any user-facing string. Anything it needs to write comes off
 * a `data-` attribute the component put there, which keeps the copy in the catalogues.
 */

/** A single cue: run `fn` at `at` milliseconds from the start of the run. */
type Cue = { at: number; run: () => void }

/** How a phase is paced, in ms. */
type Pace = { type: number; pause: number; step: number; settle: number }

/**
 * `/magic:start` is the phase a visitor actually READS — it is where they work out what
 * the thing does, and it is the one carrying the files landing in the panel beside it.
 * So it gets close to half again the dwell of the rest. By the time `/magic:commit`
 * arrives the pattern is established and a quicker cadence reads as fluency rather than
 * as rushing.
 */
const PACE: Pace = { type: 34, pause: 250, step: 340, settle: 260 }
const PACE_START: Pace = { type: 58, pause: 450, step: 760, settle: 480 }
const paceFor = (index: number): Pace => (index === 0 ? PACE_START : PACE)

const PHASE_GAP = 520 // between one skill finishing and the next being typed
const TAIL = 1000 // before the replay button appears

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
  const ctxBar = one('[data-mk="ctx-bar"]')
  const ctxPct = one('[data-mk="ctx-pct"]')
  const ctxTokens = one('[data-mk="ctx-tokens"]')
  const bars = one('[data-mk="agent-bars"]')
  const check = one('[data-mk="agent-check"]')
  const agentDot = one('[data-mk="agent-dot"]')
  const attention = one('[data-mk="attention-count"]')
  const changesBlock = one('[data-mk="changes"]')
  const commitsBlock = one('[data-mk="commits"]')
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
      one('[data-mk="cmd-caret"]', p)?.classList.remove('is-in')
      one('[data-mk="prompt"]', p)?.classList.add('is-in')
      all('[data-mk="run"]', p).forEach((r) => r.classList.add('is-in', 'is-done'))
    })
    changesBlock?.classList.remove('is-in')
    commitsBlock?.classList.add('is-in')
    if (ahead) ahead.textContent = (ahead.dataset.text ?? '').replace('{n}', '1')
    pr?.classList.add('is-in')
    if (prState) prState.textContent = prState.dataset.merged ?? ''
    statePill?.classList.add('is-done')
    if (statePill) statePill.textContent = statePill.dataset.done ?? ''
    bars?.classList.add('is-out')
    check?.classList.add('is-in')
    agentDot?.classList.add('is-done')
    if (attention) attention.textContent = '1'
    setContext(CONTEXT_BY_PHASE[CONTEXT_BY_PHASE.length - 1])
    convo.scrollTop = convo.scrollHeight
  }

  const reset = () => {
    clear()
    phases.forEach((p) => {
      const cmd = one('[data-mk="cmd"]', p)
      if (cmd) cmd.textContent = ''
      one('[data-mk="cmd-caret"]', p)?.classList.remove('is-in')
      one('[data-mk="prompt"]', p)?.classList.remove('is-in')
      all('[data-mk="run"]', p).forEach((r) => r.classList.remove('is-in', 'is-done'))
    })
    files.forEach((f) => f.classList.remove('is-in'))
    changesBlock?.classList.remove('is-in')
    commitsBlock?.classList.remove('is-in')
    if (ahead) ahead.textContent = ''
    pr?.classList.remove('is-in')
    if (prState) prState.textContent = prState.dataset.review ?? ''
    statePill?.classList.remove('is-done')
    if (statePill) statePill.textContent = statePill.dataset.progress ?? ''
    bars?.classList.remove('is-out')
    check?.classList.remove('is-in')
    agentDot?.classList.remove('is-done')
    if (attention) attention.textContent = '2'
    setContext(CONTEXT_BY_PHASE[0])
    convo.scrollTop = 0
    replayBtn?.classList.remove('is-in')
  }

  /**
   * Side effects, keyed by the phase they belong to. Returns cues placed relative to
   * `start` (the moment the phase's command finishes typing) and `end`.
   */
  const sideEffects = (index: number, start: number, end: number): Cue[] => {
    switch (index) {
      // /magic:start — the worktree fills with uncommitted work.
      case 0: {
        const pace = paceFor(0)
        // The block opens as the worktree is created, then a file lands per beat, in
        // step with the status lines rather than on a cadence of its own.
        return [
          { at: start + pace.pause, run: () => changesBlock?.classList.add('is-in') },
          ...files.map((f, i) => ({
            at: start + pace.pause + pace.step * (1.4 + i * 0.9),
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
            at: end - 60,
            run: () => {
              changesBlock?.classList.remove('is-in')
              files.forEach((f) => f.classList.remove('is-in'))
            },
          },
          {
            at: end + 120,
            run: () => {
              commitsBlock?.classList.add('is-in')
              if (ahead) ahead.textContent = (ahead.dataset.text ?? '').replace('{n}', '1')
            },
          },
        ]
      // /magic:pr — the pull request row arrives.
      case 2:
        return [{ at: end, run: () => pr?.classList.add('is-in') }]
      // /magic:done — the agent settles and the ticket closes.
      case 5:
        return [
          { at: end - 300, run: () => bars?.classList.add('is-out') },
          { at: end - 160, run: () => { check?.classList.add('is-in'); agentDot?.classList.add('is-done') } },
          {
            at: end - 60,
            run: () => {
              if (prState) prState.textContent = prState.dataset.merged ?? ''
              statePill?.classList.add('is-done')
              if (statePill) statePill.textContent = statePill.dataset.done ?? ''
            },
          },
          { at: end, run: () => { if (attention) attention.textContent = '1' } },
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
      const caret = one('[data-mk="cmd-caret"]', phase)
      const runs = all('[data-mk="run"]', phase)
      const text = cmdEl?.dataset.text ?? ''

      // The prompt line appears, then its command types itself in.
      const promptAt = t
      cues.push({
        at: promptAt,
        run: () => {
          prompt?.classList.add('is-in')
          caret?.classList.add('is-in')
          if (prompt) follow(prompt)
        },
      })
      for (let i = 1; i <= text.length; i++) {
        cues.push({
          at: promptAt + i * pace.type,
          run: () => { if (cmdEl) cmdEl.textContent = text.slice(0, i) },
        })
      }
      const typedAt = promptAt + text.length * pace.type
      cues.push({ at: typedAt + 60, run: () => caret?.classList.remove('is-in') })

      // Then the status lines, each spinning briefly before its check lands.
      let r = typedAt + pace.pause
      runs.forEach((runEl) => {
        cues.push({
          at: r,
          run: () => {
            runEl.classList.add('is-in')
            follow(runEl)
          },
        })
        cues.push({ at: r + pace.settle, run: () => runEl.classList.add('is-done') })
        r += pace.step
      })

      const end = r
      cues.push(...sideEffects(index, typedAt, end))
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
