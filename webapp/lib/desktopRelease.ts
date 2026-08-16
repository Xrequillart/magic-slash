/**
 * The desktop version that has SHIPPED — the reference every "à jour" badge in this
 * app is measured against.
 *
 * A CONSTANT, not a lookup. The obvious alternative is GitHub's releases API, and
 * `docs/` already tried it: it drifted out of sync often enough that the landing page
 * went back to a value written at release time (see `nav.changelog` in
 * docs/script.js). A number that is wrong for a few minutes after a release beats a
 * number that is sometimes missing, sometimes rate-limited, and always a network
 * round trip on page load.
 *
 * UPDATED BY /magic:release, together with package.json, the docs badges and the
 * skill headers — see step 5.3 of .claude/skills/magic-release/SKILL.md, which also
 * verifies it landed.
 *
 * Its being right is not left to that skill though: `desktopRelease.test.ts` asserts
 * this equals `desktop/package.json`, so a release that skips the bump fails CI
 * rather than shipping a console that quietly calls an old build current. That test
 * is the whole reason a hardcoded value is safe here.
 *
 * What it CANNOT catch: the webapp not being redeployed after a release. The const
 * would be right in git and stale in the browser. Nothing in the app can see that —
 * only a deploy can fix it.
 */
export const LATEST_DESKTOP_VERSION = '0.72.1'

/**
 * The build itself — a URL that DOWNLOADS the app, not one that lands on GitHub.
 *
 * Every download button used to point at `/releases/latest`, which is a PAGE: the
 * click left the product, and whoever followed it had to scroll past release notes and
 * pick the right file out of five assets — two blockmaps and a YAML manifest among
 * them. Pointing at the asset makes the button do the one thing it says: GitHub answers
 * it with `Content-Disposition: attachment`, so the browser saves the file and the page
 * the visitor was on never changes.
 *
 * The filename is a CONTRACT with electron-builder, which is why `artifactName` is
 * pinned in desktop/package.json rather than left to its default: the default
 * interpolates `productName` — "Magic Slash" — and that space is sanitised on upload,
 * to a hyphen for the dmg but to a dot in its own blockmap's name. Relying on which
 * one applies is how this URL becomes a 404 nobody notices. `desktopRelease.test.ts`
 * asserts the two still agree.
 *
 * arm64 only, because that is the only build the release workflow publishes. No
 * regression for Intel Macs: the releases page had nothing else to offer them either.
 */
export const DESKTOP_DOWNLOAD_URL = `https://github.com/xrequillart/magic-slash/releases/download/v${LATEST_DESKTOP_VERSION}/Magic-Slash-${LATEST_DESKTOP_VERSION}-arm64.dmg`
