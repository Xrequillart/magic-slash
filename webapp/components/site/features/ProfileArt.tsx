"use client";

import { MessageCircleHeart } from "lucide-react";

/**
 * The artwork beside "How it talks to you": one mark on the palest plate, drawn exactly
 * as `LanguagesArt` next door is drawn.
 *
 * THE SAME CARD AS THE LANGUAGES ROW, DELIBERATELY, and that is the whole brief for this
 * file. The two rows are a pair — who the app is talking to, and which language it says
 * it in — and they sit one above the other in the `configuration` family. A pair reads as
 * one only if both halves are built the same way, so this takes `ShowcaseCard` like its
 * neighbour and fills the `art` slot with the same shape: `bg-tone-mist`, `rounded-xl`,
 * `min-h-44`, and a 96px object centred on it.
 *
 * THE PROFILE HAS NO SCREEN TO DRAW. It is collected by a six-step wizard and read back
 * as a markdown file — neither of which is a picture — which is why this row spent a long
 * time as a bare heading with nothing under it. A mark is the honest answer: not a
 * reproduction of a surface, but a sign for what the setting changes.
 *
 * `MessageCircleHeart` IS THE SIGN, and it is the right one rather than a decoration: the
 * profile does not change what the app DOES, it changes how it speaks to you — the
 * vocabulary, the depth, the length of an answer, the language it opens in. A speech
 * bubble says "this is about the talking"; the heart in it says "and about who it is
 * talking to". `UserRound` — the row's own icon in the data, and what the fallback tile
 * would draw — names the person and misses the conversation.
 *
 * ON A WHITE DISC WITH `shadow-card`, which is the flag's own treatment beside it: the
 * plate is a ground and the mark is an object ON it, not a glyph printed into it. Stroked
 * in `accent`, the token this site reserves for a tint that means something and never for
 * something you press.
 *
 * `aria-hidden`: it is a drawing, and the heading beside it already names the row.
 */
export function ProfileArt() {
  return (
    <div
      aria-hidden
      className="flex h-full min-h-44 items-center justify-center overflow-hidden rounded-xl bg-tone-mist px-6 py-6"
    >
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-card">
        <MessageCircleHeart
          className="h-12 w-12 text-accent"
          strokeWidth={1.5}
        />
      </span>
    </div>
  );
}
