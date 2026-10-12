import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { checkSpecReplaceable, MAX_SPEC_BYTES, writeSpecFile } from './spec-file'

/**
 * The write half of the spec guard: an edit made in the app replaces the author's
 * `.magic/spec-*.md` only when that file is really a spec, really there, and holds nothing
 * the cloud has not seen.
 *
 * Real files in a temp directory, because every rule below is a rule about the
 * filesystem — a symlink, an mtime, bytes on disk — and a mocked `fs` would only prove
 * the mock agrees with the code.
 */
const TMP = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'magic-slash-spec-file-')))
const MAGIC = path.join(TMP, '.magic')
const SPEC = path.join(MAGIC, 'spec-edit-20260922-101500.md')
const LOADED = '# Spec\n\n## Idea\n\nThe version the editor opened on.\n'
const EDITED = '# Spec\n\n## Idea\n\nThe edited version.\n'

beforeEach(() => {
  fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(MAGIC, { recursive: true })
})

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true })
})

describe('writeSpecFile', () => {
  it('replaces a spec that still holds exactly what the editor loaded', () => {
    fs.writeFileSync(SPEC, LOADED)
    expect(writeSpecFile(SPEC, EDITED, { expectedContent: LOADED })).toEqual({ written: true, path: SPEC })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(EDITED)
  })

  it('replaces the spec by rename, leaving no temp file and keeping its mode', () => {
    fs.writeFileSync(SPEC, LOADED, { mode: 0o640 })
    fs.chmodSync(SPEC, 0o640)
    writeSpecFile(SPEC, EDITED, { expectedContent: LOADED })
    expect(fs.readdirSync(MAGIC)).toEqual([path.basename(SPEC)])
    expect(fs.statSync(SPEC).mode & 0o777).toBe(0o640)
  })

  it('leaves the old spec whole when the new text cannot be written', () => {
    fs.writeFileSync(SPEC, LOADED)
    // A read-only directory refuses the temp file, the way a full disk would refuse its bytes.
    fs.chmodSync(MAGIC, 0o555)
    try {
      expect(writeSpecFile(SPEC, EDITED, { expectedContent: LOADED })).toEqual({ written: false, reason: 'error' })
      expect(fs.readFileSync(SPEC, 'utf-8')).toBe(LOADED)
    } finally {
      fs.chmodSync(MAGIC, 0o755)
    }
  })

  it('keeps a spec that holds local work the cloud has not seen', () => {
    fs.writeFileSync(SPEC, `${LOADED}\n## A section the agent just wrote\n`)
    expect(writeSpecFile(SPEC, EDITED, { expectedContent: LOADED })).toEqual({ written: false, reason: 'diverged' })
    expect(fs.readFileSync(SPEC, 'utf-8')).toContain('A section the agent just wrote')
  })

  it('replaces a differing spec that has not been touched since the last sync', () => {
    // The author's file is their last upload; a colleague has edited the cloud copy since.
    // Different content, no local work: safe to replace.
    fs.writeFileSync(SPEC, 'what was last uploaded')
    const mtime = fs.statSync(SPEC).mtimeMs
    expect(writeSpecFile(SPEC, EDITED, { expectedContent: LOADED, unchangedSince: mtime + 1000 }))
      .toEqual({ written: true, path: SPEC })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(EDITED)
  })

  it('keeps a differing spec modified AFTER the last sync', () => {
    fs.writeFileSync(SPEC, 'written offline')
    const mtime = fs.statSync(SPEC).mtimeMs
    expect(writeSpecFile(SPEC, EDITED, { expectedContent: LOADED, unchangedSince: mtime - 1000 }))
      .toEqual({ written: false, reason: 'diverged' })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe('written offline')
  })

  it('never creates a spec file that is not there', () => {
    expect(writeSpecFile(SPEC, EDITED, { expectedContent: '' })).toEqual({ written: false, reason: 'missing' })
    expect(fs.existsSync(SPEC)).toBe(false)
  })

  it('refuses a path that is not shaped like a spec', () => {
    const notes = path.join(MAGIC, 'notes.md')
    fs.writeFileSync(notes, LOADED)
    expect(writeSpecFile(notes, EDITED, { expectedContent: LOADED })).toEqual({ written: false, reason: 'not_spec' })
    expect(fs.readFileSync(notes, 'utf-8')).toBe(LOADED)
  })

  it('refuses a spec-shaped symlink that resolves to something else', () => {
    // The attack `readSpecFile` defends against, in the write direction: a link named
    // like a spec, pointing at a file that is not one.
    const target = path.join(TMP, 'dotfile')
    fs.writeFileSync(target, LOADED)
    fs.symlinkSync(target, SPEC)
    expect(writeSpecFile(SPEC, EDITED, { expectedContent: LOADED })).toEqual({ written: false, reason: 'not_spec' })
    expect(fs.readFileSync(target, 'utf-8')).toBe(LOADED)
  })

  it('writes through a symlink to another spec, at the real path', () => {
    const real = path.join(MAGIC, 'spec-real-20260922-101500.md')
    fs.writeFileSync(real, LOADED)
    fs.symlinkSync(real, SPEC)
    expect(writeSpecFile(SPEC, EDITED, { expectedContent: LOADED })).toEqual({ written: true, path: real })
    expect(fs.readFileSync(real, 'utf-8')).toBe(EDITED)
  })

  it('calls a spec past the ceiling diverged without reading it', () => {
    fs.writeFileSync(SPEC, 'x'.repeat(MAX_SPEC_BYTES + 1))
    expect(checkSpecReplaceable(SPEC, { expectedContent: LOADED })).toEqual({ ok: false, reason: 'diverged' })
  })
})
