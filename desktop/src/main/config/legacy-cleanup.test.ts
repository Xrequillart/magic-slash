import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { archiveLegacyConfig } from './legacy-cleanup'

describe('archiveLegacyConfig', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-slash-legacy-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  const config = () => path.join(dir, 'config.json')
  const archive = () => path.join(dir, 'config.json.pre-cloud-migration')

  it('moves the legacy file out of the way, preserving its contents', () => {
    fs.writeFileSync(config(), '{"version":"0.51.0"}')

    const target = archiveLegacyConfig(dir)

    expect(target).toBe(archive())
    expect(fs.existsSync(config())).toBe(false)
    expect(fs.readFileSync(archive(), 'utf-8')).toBe('{"version":"0.51.0"}')
  })

  it('does nothing when there is no legacy file', () => {
    expect(archiveLegacyConfig(dir)).toBeNull()
    expect(fs.existsSync(archive())).toBe(false)
  })

  it('keeps the original archive when a config.json reappears', () => {
    fs.writeFileSync(archive(), '{"version":"0.51.0"}')
    fs.writeFileSync(config(), '{"version":"0.72.2","written":"by something confused"}')

    archiveLegacyConfig(dir)

    expect(fs.existsSync(config())).toBe(false)
    expect(fs.readFileSync(archive(), 'utf-8')).toBe('{"version":"0.51.0"}')
  })

  it('reports nothing rather than throwing when the directory is unwritable', () => {
    fs.writeFileSync(config(), '{}')
    fs.chmodSync(dir, 0o500)

    expect(archiveLegacyConfig(dir)).toBeNull()

    fs.chmodSync(dir, 0o700)
    expect(fs.existsSync(config())).toBe(true)
  })
})
