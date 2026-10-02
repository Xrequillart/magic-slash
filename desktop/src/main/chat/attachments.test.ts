import * as fs from 'fs'
import { describe, expect, it } from 'vitest'
import { savePastedImage } from './attachments'

describe('savePastedImage', () => {
  it('writes an image and answers its path', () => {
    const path = savePastedImage(new Uint8Array([137, 80, 78, 71]), 'image/png')
    expect(path).toMatch(/magic-slash-chat\/pasted-.+\.png$/)
    expect(fs.readFileSync(path!)).toHaveLength(4)
    fs.rmSync(path!)
  })
  it('refuses what is not an image, or is empty', () => {
    expect(savePastedImage(new Uint8Array([1]), 'application/pdf')).toBeNull()
    expect(savePastedImage(new Uint8Array([]), 'image/png')).toBeNull()
    expect(savePastedImage('nope', 'image/png')).toBeNull()
  })
})
