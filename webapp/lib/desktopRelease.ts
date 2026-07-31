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
export const LATEST_DESKTOP_VERSION = '0.62.0'
