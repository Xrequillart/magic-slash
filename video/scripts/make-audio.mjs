/**
 * THE FILM'S SOUND, synthesised from nothing: no sample, no library, no licence.
 *
 * Writes public/audio/music.wav (generated, not committed): the score, timed on the
 * film's chapters (src/film/chapters.json).
 *
 * Run by `npm run audio`, which `npm run render` runs first.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 48000
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio')

// The story's clock (30ths of a second), read from the same chapters.json as the film.
const DATA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'film', 'chapters.json'), 'utf8'))
const STORY_FPS = DATA.fps
const START = {}
let cursor = 0
for (const c of DATA.chapters) {
  START[c.id] = cursor
  cursor += c.length
}
const DURATION_S = cursor / STORY_FPS
const LOGO = START.outro + 50
const t = (frame) => frame / STORY_FPS

// ── Tools ───────────────────────────────────────────────────────────────────────

const TAU = Math.PI * 2
const midi = (n) => 440 * 2 ** ((n - 69) / 12)

function buffer(seconds) {
  const n = Math.ceil(seconds * RATE)
  return [new Float32Array(n), new Float32Array(n)]
}

/** Seeded noise, so every render of the film sounds the same. */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 31 - 1
  }
}

/** A state-variable filter, one sample at a time. */
function svf() {
  let low = 0
  let band = 0
  return (x, cutoff, q = 0.7) => {
    const f = 2 * Math.sin(Math.PI * Math.min(cutoff, RATE / 6) / RATE)
    low += f * band
    const high = x - low - band / q
    band += f * high
    return { low, band, high }
  }
}

const smooth = (x) => x * x * (3 - 2 * x)
const clamp01 = (x) => Math.max(0, Math.min(1, x))
/** 0 → 1 over [a, b] seconds, smoothed. */
const ramp = (time, a, b) => smooth(clamp01((time - a) / (b - a)))

function writeWav(name, [left, right], gain = 1, drive = 1.1) {
  let peak = 0
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
  const scale = peak > 0 ? (0.89 / peak) * gain : 1
  const n = left.length
  const data = Buffer.alloc(44 + n * 4)
  data.write('RIFF', 0)
  data.writeUInt32LE(36 + n * 4, 4)
  data.write('WAVE', 8)
  data.write('fmt ', 12)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(2, 22)
  data.writeUInt32LE(RATE, 24)
  data.writeUInt32LE(RATE * 4, 28)
  data.writeUInt16LE(4, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    // A gentle tanh on the way out keeps the peaks round rather than clipped.
    const l = Math.tanh(left[i] * scale * drive) / Math.tanh(drive)
    const r = Math.tanh(right[i] * scale * drive) / Math.tanh(drive)
    data.writeInt16LE(Math.round(l * 32767), 44 + i * 4)
    data.writeInt16LE(Math.round(r * 32767), 46 + i * 4)
  }
  writeFileSync(join(OUT, name), data)
  console.log(`  ${name}  ${(n / RATE).toFixed(1)} s`)
}

// ── Voices ──────────────────────────────────────────────────────────────────────

/** A warm pad note: three detuned voices of soft harmonics, through a low-pass. */
const padPhase = rng(3)
function pad(out, freq, start, length, amp, cutoff) {
  const filters = [svf(), svf()]
  const detune = [-0.07, 0, 0.06]
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(length * RATE)
  const phases = detune.map(() => (padPhase() + 1) * Math.PI)
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    const env = smooth(clamp01(time / 1.2)) * smooth(clamp01((length - time) / 1.4))
    let l = 0
    let r = 0
    detune.forEach((d, v) => {
      const f = freq * 2 ** (d / 12)
      const p = phases[v] + TAU * f * time
      // A saw's first harmonics, rolled off.
      let s = 0
      for (let h = 1; h <= 7; h++) s += Math.sin(p * h) / (h * 1.15)
      l += s * (v === 0 ? 0.9 : v === 2 ? 0.4 : 0.65)
      r += s * (v === 2 ? 0.9 : v === 0 ? 0.4 : 0.65)
    })
    const wobble = cutoff * (1 + 0.25 * Math.sin(TAU * 0.11 * (start + time)))
    out[0][s0 + i] += filters[0](l, wobble).low * env * amp
    out[1][s0 + i] += filters[1](r, wobble).low * env * amp
  }
}

/** A round sub bass pluck. */
function bass(out, freq, start, length, amp) {
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(length * RATE)
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    const env = clamp01(time / 0.01) * Math.exp(-time * 2.2) * clamp01((length - time) / 0.05)
    const s = (Math.sin(TAU * freq * time) + 0.25 * Math.sin(TAU * 2 * freq * time)) * env * amp
    out[0][s0 + i] += s
    out[1][s0 + i] += s
  }
}

/** A soft kick: a sine falling from 110 Hz to 45 Hz. */
function kick(out, start, amp) {
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(0.4 * RATE)
  let phase = 0
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    const f = 45 + 65 * Math.exp(-time * 28)
    phase += (TAU * f) / RATE
    const s = Math.sin(phase) * Math.exp(-time * 9) * amp
    out[0][s0 + i] += s
    out[1][s0 + i] += s
  }
}

/** A closed hat: a short burst of high-passed noise. */
function hat(out, start, amp, pan, noise) {
  const filter = svf()
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(0.07 * RATE)
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    const s = filter(noise(), 8000, 0.8).high * Math.exp(-time * 70) * amp
    out[0][s0 + i] += s * (1 - pan)
    out[1][s0 + i] += s * (1 + pan)
  }
}

/** A bell: a sine and its inharmonic partials, decaying. */
function bell(out, freq, start, amp, pan, decay = 2.4) {
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(decay * 1.6 * RATE)
  const partials = [
    [1, 1, 1],
    [2.01, 0.35, 1.8],
    [3.0, 0.12, 2.6],
    [4.2, 0.05, 3.5],
  ]
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    let s = 0
    for (const [ratio, a, speed] of partials) s += Math.sin(TAU * freq * ratio * time) * a * Math.exp((-time * speed) / decay)
    s *= clamp01(time / 0.004) * amp
    out[0][s0 + i] += s * (1 - pan)
    out[1][s0 + i] += s * (1 + pan)
  }
}

/** A short feedback delay, for air around the bells. */
function echo(out, seconds, feedback, mix) {
  const d = Math.floor(seconds * RATE)
  for (const [ch, other] of [[0, 1], [1, 0]]) {
    const line = out[ch]
    const cross = out[other]
    for (let i = d; i < line.length; i++) line[i] += (line[i - d] * feedback + cross[i - d] * feedback * 0.3) * mix
  }
}

// ── The score ───────────────────────────────────────────────────────────────────

/** A clap: three quick bursts of band-passed noise, then a short tail. */
function clap(out, start, amp, noise) {
  const fl = svf()
  const fr = svf()
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(0.25 * RATE)
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    const burst = [0, 0.011, 0.022].reduce((e, at) => e + (time >= at ? Math.exp(-(time - at) * 180) : 0), 0)
    const env = (burst + Math.exp(-time * 22) * 0.6) * amp
    out[0][s0 + i] += fl(noise(), 1300, 1.4).band * env
    out[1][s0 + i] += fr(noise(), 1500, 1.4).band * env
  }
}

/** An open hat: longer, brighter noise. */
function openHat(out, start, amp, noise) {
  const f = svf()
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(0.22 * RATE)
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    const v = f(noise(), 9500, 0.7).high * Math.exp(-time * 16) * amp
    out[0][s0 + i] += v * 0.9
    out[1][s0 + i] += v
  }
}

/** A driving bass note: a saw through a plucked low-pass, plus a sine underneath. */
function pluckBass(out, freq, start, length, amp) {
  const f = svf()
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(length * RATE)
  let phase = 0
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    phase = (phase + freq / RATE) % 1
    const saw = 2 * phase - 1
    const env = clamp01(time / 0.004) * clamp01((length - time) / 0.02)
    const cutoff = 180 + 1400 * Math.exp(-time * 18)
    const v = (f(saw, cutoff, 1.8).low * 0.8 + Math.sin(TAU * freq * time) * 0.6) * env * amp
    out[0][s0 + i] += v
    out[1][s0 + i] += v
  }
}

/** A synth stab or arp note: detuned saws through a fast filter envelope. */
function stab(out, freq, start, length, amp, pan, bright = 1) {
  const fl = svf()
  const fr = svf()
  const s0 = Math.floor(start * RATE)
  const n = Math.floor((length + 0.15) * RATE)
  const ph = [0, 0.33, 0.66]
  const det = [-0.12, 0, 0.11]
  for (let i = 0; i < n && s0 + i < out[0].length; i++) {
    const time = i / RATE
    let l = 0
    let r = 0
    det.forEach((d, k) => {
      ph[k] = (ph[k] + (freq * 2 ** (d / 12)) / RATE) % 1
      const saw = 2 * ph[k] - 1
      l += saw * (k === 2 ? 0.5 : 1)
      r += saw * (k === 0 ? 0.5 : 1)
    })
    const env = clamp01(time / 0.003) * (time < length ? Math.exp(-time * 5) : Math.exp(-length * 5) * Math.exp(-(time - length) * 40))
    const cutoff = (700 + 5000 * Math.exp(-time * 14)) * bright
    out[0][s0 + i] += fl(l, cutoff, 1.2).low * env * amp * (1 - pan)
    out[1][s0 + i] += fr(r, cutoff, 1.2).low * env * amp * (1 + pan)
  }
}

/** A riser: noise swept up and swelling into a chapter. */
function riser(out, end, length, amp, noise) {
  const fl = svf()
  const fr = svf()
  const s0 = Math.floor((end - length) * RATE)
  const n = Math.floor(length * RATE)
  for (let i = 0; i < n; i++) {
    const idx = s0 + i
    if (idx < 0 || idx >= out[0].length) continue
    const x = i / n
    const cutoff = 400 * (9000 / 400) ** x
    const env = x ** 2.2 * amp
    out[0][idx] += fl(noise(), cutoff, 2).band * env
    out[1][idx] += fr(noise(), cutoff * 1.05, 2).band * env
  }
}

function music() {
  const out = buffer(DURATION_S)
  const noise = rng(7)

  const BPM = 124
  const beat = 60 / BPM
  const bar = beat * 4
  const six = beat / 4

  // Am · F · C · G, a bar each: bright and moving.
  const CHORDS = [
    { root: 45, notes: [57, 60, 64, 69] },
    { root: 41, notes: [57, 60, 65, 69] },
    { root: 48, notes: [55, 60, 64, 67] },
    { root: 43, notes: [55, 59, 62, 67] },
  ]
  const chordAt = (time) => CHORDS[Math.floor(time / bar) % CHORDS.length]

  const plan = t(START.plan)
  const outro = t(START.outro)
  const logo = t(LOGO)
  const workflow = t(START.workflow)
  const ship = t(START.ship)
  // The workflow chapter thins out (no kick, filtered stabs), then everything slams back.
  const inBreak = (time) => time >= workflow && time < ship - bar
  const hookEnd = plan

  const beats = Math.floor(outro / beat)
  for (let i = 0; i < beats; i++) {
    const time = i * beat
    const inBar = i % 4
    const chord = chordAt(time)
    const full = time >= plan && !inBreak(time)

    // The hook builds: hats and the bass from the first bar, kick at the halfway.
    if (time >= hookEnd * 0.5 && !inBreak(time)) kick(out, time, 0.85)
    if (full && (inBar === 1 || inBar === 3)) clap(out, time, 0.55, noise)
    // Hats on every sixteenth, an open hat on each off-beat.
    for (let k = 0; k < 4; k++) hat(out, time + k * six, k === 2 ? 0.07 : 0.035, k % 2 ? 0.3 : -0.3, noise)
    if (time >= plan * 0.25) openHat(out, time + beat / 2, inBreak(time) ? 0.05 : 0.09, noise)

    // Rolling off-beat bass: three notes per beat, the downbeat left to the kick.
    if (time >= hookEnd * 0.25) {
      for (const k of [1, 2, 3]) pluckBass(out, midi(chord.root - 12 + (k === 3 && inBar === 3 ? 7 : 0)), time + k * six, six * 0.9, inBreak(time) ? 0.18 : 0.3)
    }

    // Stabs on the off-beats of beats 2 and 4, through the chapters.
    if (time >= plan && (inBar === 1 || inBar === 3)) {
      for (const n of chord.notes) stab(out, midi(n), time + beat / 2, six * 1.2, 0.06, 0, inBreak(time) ? 0.35 : 1)
    }

    // A sixteenth arp from /magic:start on, an octave up.
    if (time >= t(START.start)) {
      for (let k = 0; k < 4; k++) {
        const note = chord.notes[[0, 2, 1, 3, 2, 0, 3, 1][(inBar * 4 + k) % 8]] + 12
        stab(out, midi(note), time + k * six, six * 0.6, inBreak(time) ? 0.05 : 0.035, k % 2 ? 0.4 : -0.4, 0.8)
      }
    }
  }

  // A riser and a crash-like hit into every chapter.
  for (const c of DATA.chapters) {
    const at = START[c.id] / STORY_FPS
    if (at <= 0) continue
    riser(out, at, c.id === 'ship' ? bar * 2 : bar, c.id === 'ship' ? 0.6 : 0.35, noise)
    openHat(out, at, 0.25, noise)
  }

  // The logo: one big chord and a last kick, let ring.
  kick(out, logo, 1)
  for (const n of [45, 57, 60, 64, 69, 76]) stab(out, midi(n), logo, 2.5, 0.07, 0, 0.7)
  pluckBass(out, midi(33), logo, 2.2, 0.35)

  // Sidechain: everything but the kick ducks on each beat, the pump of the genre.
  const duck = new Float32Array(out[0].length).fill(1)
  for (let i = 0; i < beats; i++) {
    const time = i * beat
    if (time < hookEnd * 0.5 || inBreak(time)) continue
    const s0 = Math.floor(time * RATE)
    for (let j = 0; j < beat * RATE && s0 + j < duck.length; j++) duck[s0 + j] = 0.45 + 0.55 * smooth(clamp01(j / RATE / 0.16))
  }
  // Re-adding the kicks after the duck would need a second buffer; the duck is gentle
  // enough at 0.45 that the kick still punches through.
  for (let i = 0; i < duck.length; i++) {
    out[0][i] *= 0.6 + 0.4 * duck[i]
    out[1][i] *= 0.6 + 0.4 * duck[i]
  }

  echo(out, beat * 0.75, 0.25, 0.35)

  // In and out.
  for (let i = 0; i < out[0].length; i++) {
    const time = i / RATE
    const g = ramp(time, 0, 0.4) * (1 - ramp(time, DURATION_S - 2.5, DURATION_S))
    out[0][i] *= g
    out[1][i] *= g
  }
  return out
}

mkdirSync(OUT, { recursive: true })
console.log('Synthesising the film sound into public/audio/')
// Driven into the soft limiter: a dance track sits loud and even, its peaks rounded.
writeWav('music.wav', music(), 1, 3)
