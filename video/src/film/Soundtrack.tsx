import { Audio, staticFile } from 'remotion'

/** The score under the whole film, synthesised by scripts/make-audio.mjs (`npm run audio`). */
export function Soundtrack() {
  return <Audio src={staticFile('audio/music.wav')} volume={0.6} />
}
