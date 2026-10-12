import { describe, expect, it } from 'vitest'
import { parseChangelog } from './changelog'

const RAW = `# Changelog

## [0.106.0] - 2026-10-02

![The workflow editor](https://github.com/user-attachments/assets/0b6c1f0e)

### Added

- **Desktop**: A toolbox

![Not a banner](https://example.com/inline.png)

## [0.105.9] - 2026-10-01

![Relative](./banner.png)

### Fixed

- **Desktop**: A fix
`

describe('parseChangelog', () => {
  it('reads the image line under a version heading as its banner', () => {
    const [latest] = parseChangelog(RAW)
    expect(latest.banner).toEqual({ src: 'https://github.com/user-attachments/assets/0b6c1f0e', alt: 'The workflow editor' })
    expect(latest.categories).toEqual([{ type: 'Added', items: [{ component: 'Desktop', text: 'A toolbox' }] }])
  })

  it('reads the <img> tag GitHub writes for a dropped image too', () => {
    const [version] = parseChangelog(`## [0.105.0] - 2026-09-30

<img width="1280" height="640" alt="Introducing workflows" src="https://github.com/user-attachments/assets/d3095f25" />

### Added

- **Desktop**: Workflows
`)
    expect(version.banner).toEqual({ src: 'https://github.com/user-attachments/assets/d3095f25', alt: 'Introducing workflows' })
  })

  it('takes no banner from an image under a category, nor from a relative path', () => {
    const [, previous] = parseChangelog(RAW)
    expect(previous.banner).toBeUndefined()
    expect(parseChangelog(RAW)[0].categories[0].items).toHaveLength(1)
  })
})
