# Product film

The product film of the desktop app (about 110 s), from an idea to a merged PR, and four
short clips cut from it, rendered with [Remotion](https://www.remotion.dev).

The app on screen is not a recording: it is the desktop's own components, imported from
`design-system/desktop/` through the same `@ds` alias the two apps use, painted with the
`midnight` theme read straight from `desktop/src/themes.ts`, and driven frame by frame.
A component that changes in the design system changes in the film on the next render.

```bash
npm run video:install       # once
npm run video:studio        # preview and scrub in the browser
npm run video:render        # video/out/magic-slash.mp4 (4K, 60 fps)
npm --prefix video run render:clips   # video/out/Clip-*.mp4
```

## The story

A hook in type, then eight chapters, each opened by a title card: describe it
(`/magic:plan`), plan it (the tickets), start it (`/magic:start`), commit it, make it
yours (the repository's workflow), ship it (the workflow chains to the PR), resolve it
(changes requested, `/magic:resolve`), close it (`/magic:done`). Notes dim the window around what matters and say what it is; the
"Meanwhile" cards show what happened in Jira, GitHub and Slack, review comments included.

## Where things are

| File | What it holds |
| --- | --- |
| `src/film/chapters.json` | The chapters and their lengths, read by the film and the score |
| `src/film/timeline.ts` | The film's clock: `at('ship', 40)` is 40 frames into a chapter |
| `src/film/script.ts` | What is said in the chat, beat by beat |
| `src/film/Annotations.tsx` | The notes: spotlight and bubbles, aimed at live DOM elements |
| `src/film/Meanwhile.tsx` | What happened outside the app |
| `src/film/WorkflowScene.tsx` | The workflow canvas, built up in four beats |
| `src/film/panels.tsx` | The info panel: spec, ticket, branch, commits, PR |
| `src/film/Board.tsx` | The Tasks board |
| `src/film/Camera.tsx` | The 3D camera, one shot per keyframe |
| `src/film/Hook.tsx`, `Overlays.tsx`, `Outro.tsx` | Type on white: hook, titles, labels, logo |
| `src/film/clips.ts` | The short clips, as stretches of the film |
| `scripts/make-audio.mjs` | The score, synthesised (no sample, no licence) |

The story is timed in 30ths of a second and rendered at 60 fps in 4K, so a still's
`--frame` is twice the story's. Add `--scale=1` for a quick 1080p check, and
`--props='{"flat":true}'` to see the window face on.
