/**
 * The two tracker marks shown next to a ticket ID (agent-info-sidebar/TicketHeader).
 *
 * Both are vectors rather than the source PNGs on purpose. The GitHub mark is a
 * knocked-out disc traced from the brand asset and painted with `currentColor`, so
 * it stays readable on every one of the themes in desktop/src/themes.ts — a flat
 * black bitmap disappeared on the dark ones. The Jira mark keeps its own two blues
 * (#2684FF / #0052CC, sampled straight from the brand asset) because a brand mark
 * recoloured by the theme stops being the brand mark.
 */

interface TrackerIconProps {
  className?: string
}

export function GithubMark({ className }: TrackerIconProps) {
  return (
    <svg viewBox="0 0 512 512" className={className} fill="currentColor" aria-hidden="true">
      <g transform="translate(0,512) scale(0.1,-0.1)">
        <path d="M2360 5049 c-154 -11 -357 -47 -516 -93 -902 -259 -1603 -1017 -1790 -1934 -136 -669 -8 -1355 354 -1908 255 -390 580 -686 968 -886 141 -73 341 -154 403 -164 58 -9 109 19 133 73 18 40 18 60 12 286 l-7 243 -86 -14 c-97 -15 -256 -9 -386 13 -105 19 -211 71 -278 139 -53 53 -67 76 -136 229 -63 139 -135 231 -232 297 -66 46 -121 106 -117 128 6 30 48 43 121 38 141 -10 288 -113 393 -274 72 -110 143 -179 230 -222 62 -31 79 -35 169 -38 103 -4 207 12 291 44 41 16 43 18 58 85 19 86 56 164 106 228 39 49 39 49 -43 60 -264 38 -452 102 -627 215 -229 148 -365 379 -431 731 -20 109 -23 389 -5 492 29 167 98 319 200 445 45 55 45 55 25 117 -52 168 -42 372 28 574 18 50 22 52 103 48 118 -6 371 -108 543 -218 80 -51 59 -51 254 -8 271 58 655 58 926 0 193 -42 170 -44 277 21 226 137 484 230 575 206 26 -7 33 -17 53 -75 43 -125 55 -210 50 -351 -4 -95 -11 -148 -26 -195 -21 -64 -21 -64 23 -118 89 -109 155 -244 192 -389 22 -89 25 -417 4 -544 -32 -198 -114 -406 -210 -532 -165 -217 -464 -366 -843 -418 -87 -12 -87 -12 -48 -61 47 -60 85 -137 106 -221 14 -52 17 -137 20 -503 5 -490 5 -489 72 -521 46 -21 83 -15 229 42 738 284 1320 932 1533 1703 141 513 111 1108 -80 1601 -172 440 -475 842 -848 1122 -405 303 -865 474 -1367 507 -175 12 -192 12 -375 0z" />
      </g>
    </svg>
  )
}

export function JiraMark({ className }: TrackerIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="magic-jira-mark" x1="16.53" y1="7.95" x2="12.78" y2="11.7" gradientUnits="userSpaceOnUse">
          <stop offset=".18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path fill="#2684FF" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84z" />
      <path fill="url(#magic-jira-mark)" d="M6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.8v1.72a4.362 4.362 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.83-.83z" />
      <path fill="#0052CC" d="M2 11.6c0 2.4 1.94 4.34 4.34 4.34h1.8v1.7c.003 2.4 1.95 4.342 4.35 4.35V12.43a.84.84 0 0 0-.84-.83z" />
    </svg>
  )
}
