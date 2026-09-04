"use client";

import { useId } from "react";
import { useT } from "@/lib/i18n/useLanguage";
import type { LanguageId } from "@/lib/i18n/languages";

/**
 * The artwork beside "A language per surface": the round flag of the language the site
 * is being read in, on the palest plate — the French tricolour to a French reader, the
 * Union Flag to an English one. The card is about choosing a language, and the art
 * answers with the one already chosen.
 *
 * DRAWN, NOT LOADED. The two marks were supplied as Icons8's 96px "round flag" PNGs and
 * are redrawn here as SVG: a bitmap at 96px goes soft the moment the card is wider than
 * that, and an inline vector is the same shape at every size. The colours are the PNGs'
 * own — Icons8's indigo `#3F51B5`, its off-white `#ECEFF1` and its red `#FF3D00` — so
 * the drawing matches the file it replaces rather than the real flags' deeper blues.
 * That is deliberate: these are icons of flags, in a flat icon set's palette, and the
 * rectangular flags in `components/Flag.tsx` are the ones that carry the real colours.
 *
 * WHY THE UNION FLAG FOR ENGLISH: the same convention `Flag.tsx` argues for — no flag
 * is right for a language, and the alternatives are worse.
 *
 * `useId` on the clip path, for the reason `UnionFlag` gives: `url(#id)` resolves
 * against the whole document, so a fixed id breaks the moment the flag is drawn twice.
 *
 * `bg-tone-mist`, `rounded-xl`, `min-h-44` — `SplitViewMockup`'s plate exactly, so the
 * showcase cards on this page read as one series.
 *
 * `aria-hidden`: it is a drawing, and the language menu in the footer is where the
 * language is actually named.
 */
function RoundFlag({ lang, className }: { lang: LanguageId; className: string }) {
  const clip = useId();
  const clipPath = `url(#${clip})`;

  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden focusable="false">
      <clipPath id={clip}>
        <circle cx="48" cy="48" r="48" />
      </clipPath>
      {lang === "fr" ? (
        // Three equal bands, cut to the disc.
        <g clipPath={clipPath}>
          <rect width="32" height="96" fill="#3F51B5" />
          <rect x="32" width="32" height="96" fill="#ECEFF1" />
          <rect x="64" width="32" height="96" fill="#FF3D00" />
        </g>
      ) : (
        // The icon's Union Flag: a blue disc, the white saltire and cross, the red
        // saltire and cross narrower on top. Flat and uncounterchanged, as the icon is.
        <g clipPath={clipPath}>
          <rect width="96" height="96" fill="#3F51B5" />
          <path d="M0,0 L96,96 M96,0 L0,96" stroke="#ECEFF1" strokeWidth="16" />
          <path d="M0,0 L96,96 M96,0 L0,96" stroke="#FF3D00" strokeWidth="6" />
          <path d="M48,0 V96 M0,48 H96" stroke="#ECEFF1" strokeWidth="26" />
          <path d="M48,0 V96 M0,48 H96" stroke="#FF3D00" strokeWidth="14" />
        </g>
      )}
    </svg>
  );
}

export function LanguagesArt() {
  const { lang } = useT();

  return (
    <div
      aria-hidden
      className="flex h-full min-h-44 items-center justify-center overflow-hidden rounded-xl bg-tone-mist px-6 py-6"
    >
      <RoundFlag lang={lang} className="h-24 w-24 rounded-full shadow-card" />
    </div>
  );
}
