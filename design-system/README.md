# Design system

The components both builds import, as source. There is no build step and nothing
published: `desktop/` compiles these files with Vite and `webapp/` with Next, each
through its own `@ds` alias. There IS a `package.json` — this folder owns the one
copy of `lucide-react` the repo has left, which is rule 1 below.

```text
design-system/
├── package.json   # the shared dependencies. `npm run ds:install` from the root
├── .npmrc         # no peer installs — React comes from the consuming app
├── desktop/       # the Electron app's scale — dark grounds, eight themes
└── webapp/        # the public site's scale — light canvas, one theme
```

## The two halves share nothing

Different palettes, different type scales, different grounds. A `Banner` from
`desktop/` rendered on the marketing site would be wrong in every particular, and
the reverse is just as true. **Never import across the two folders.** The day
something genuinely belongs to both — a type, a naming rule, a layout primitive
with no colour in it — it gets a `shared/` folder of its own rather than a home
in whichever half happened to write it first.

`webapp/` is empty for now. The site's primitives still live in
`webapp/components/ui.tsx` and move here one at a time, the way the desktop's are.

## Two rules, and both are load-bearing

**1. This folder owns its dependencies — the apps do not.**

`lucide-react` is declared HERE, in `package.json`, and `desktop/icons.ts` is the
only place in the repo that names it. The desktop imports every icon through
`@ds/desktop/icons` and has no lucide dependency of its own any more.

That inversion is the point. The desktop held `^0.563.0` and the webapp `^1.26.0`
— two different libraries wearing one name, with the root install holding neither
— so a shared component could not import either, and the versions could drift
apart again on any `npm install`. One version lives here now and the question is
settled for everyone downstream.

It costs an install step (`npm run ds:install`, chained into `desktop:install`, and
its own step in `release.yml`) and it means bumping lucide changes both apps at
once. Lucide also removes icons between majors — v1 dropped every brand glyph,
which is why the GitHub mark is the app's own `GithubMark` and not `Github` from
the library.

REACT IS THE EXCEPTION, and `.npmrc` is what enforces it: peer dependencies are
not installed here, so React comes from whichever app is compiling these files.
A copy of its own would be a second React in someone's bundle.

**2. Spell every Tailwind class in full.**

`bg-${tone}/10` generates nothing — Tailwind reads source as text. Every class is
a literal in a lookup table, and both apps list `../design-system/**/*.{ts,tsx}`
in their `content` globs so the scanner finds them.

The colour NAMES (`bg-green/10`, `text-ink`) resolve per app. In the desktop they
are the theme registry's CSS variables; in the webapp they are the same variable
names, written onto the preview ground by `/design-system` so a desktop component
can be rendered on the site at all. A component here therefore names a ROLE, never
a value — no hex, ever.

## How each app is wired to it

Both resolve `@ds/*` to this folder, and both add `../design-system/**/*.{ts,tsx}`
to their Tailwind `content`.

| | desktop (Vite) | webapp (Next) |
| --- | --- | --- |
| Alias | `resolve.alias` in `vite.config.ts` | `webpack()` in `next.config.mjs` |
| Outside the root | `server.fs.allow` (dev only) | `experimental.externalDir` |
| React | `resolve.dedupe` | nothing — see below |
| Types | `paths` + `include` in `tsconfig.json`, including a `react` → `@types/react` mapping | the same |

The `react` → `@types/react` mapping is in BOTH: `tsc` resolves a bare specifier
from the importing FILE, so from here it walks into `design-system/node_modules`
and then to the repo root, and neither has React types. Without the mapping every
type in this folder silently becomes `any`.

Point `include` and Tailwind's `content` at `design-system/desktop/` and
`design-system/webapp/` BY NAME rather than at `design-system/**`. The wider glob
swallows this folder's own `node_modules` — four thousand lucide files in the
Tailwind scan and in the TypeScript program. TS's default `exclude` does not help:
it only covers a `node_modules` sitting next to the tsconfig.

**Do not alias `react` in the Next config.** It is the obvious guard against an
out-of-root file finding a second copy, and it breaks the build: Next points
`react` at its own vendored builds per environment, and overriding it takes
`React.cache` away from every server component — `next build` then dies collecting
page data with `n.cache is not a function`. Vite has no such vendoring, which is
why `dedupe` is right there and wrong here.

The webapp additionally declares the desktop's colour tokens (`green`, `blue`,
`orange`, `red`, `ink`, …) as CSS variables with the old hardcoded values as
FALLBACKS, so the public site is unchanged and `/design-system` can paint a real
theme onto a preview ground. The theme values themselves are copied into
`webapp/lib/desktopTheme.ts` and pinned to the desktop registry by a test — the
copy exists only because the theme registry is read by the Electron MAIN process
too, so it cannot move here without dragging `claude-theme.ts` along. It should
still move.
