"use client";

import {
  AlertTriangle,
  ChevronRight,
  FolderInput,
  Gauge,
  GitFork,
  Image as ImageGlyph,
  LayoutGrid,
  PenTool,
  Plus,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useId } from "react";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useLanguage";
import { FeatureLegend, LegendTile } from "./FeatureLegend";

/**
 * The visual under the `Skills` row: the app's own Skills modal, redrawn IN DARK, whole,
 * and shrunk to fit this column rather than reflowed into it.
 *
 * IT REPLACES A THUMBNAIL, and the swap is the point. The row used to be a `showcase` —
 * a sentence with a light drawing of an annotated list beside it — which described this
 * window as "a page that lists skills". It is three things: a rail carrying every skill
 * the machine can reach, a budget gauge scaled to the model that is actually running, and
 * a warnings band that offers to fix what it found. A thumbnail shows none of them, so
 * the row takes the shape `Agents` takes — full width, with a legend under it.
 *
 * DRAWN FROM THE REAL SCREEN, band for band — `desktop/src/renderer/components/
 * PageModal.tsx` for the chrome and `pages/Skills/index.tsx` for everything inside it.
 * Every measurement below is that source's, not an approximation of it:
 *
 *   1. THE MODAL. `rounded-2xl` on `bg-bg-secondary` inside `border border-line`, and a
 *      header that is exactly `px-4 h-12 border-b border-line` with the title at
 *      `text-sm font-semibold` on the left and the close button on the right.
 *   2. THE RAIL. `SkillsRail`, at its declared `w-56` on `bg-surface-sunken-soft` behind
 *      a `border-r border-line-field`. "All skills" sits in its own `px-2 pt-3 pb-1`
 *      band above a `border-b`, wearing the active pill (`bg-accent/15`); the groups
 *      below it are `px-2.5 mb-1.5 mt-7 text-[11px] uppercase tracking-wider` headers —
 *      `mt-3` for the first — over rows at `px-2.5 py-1.5 mt-0.5 text-sm rounded-lg`
 *      with a `w-5 h-5 rounded` avatar.
 *   3. THE BODY. `flex-1 p-6` around a column that is `gap-10` and `max-w-[62rem]`.
 *   4. THE WARNINGS. `SkillsWarnings`: the section line, then `LongDescriptionsAlert` —
 *      `rounded-lg bg-orange/10 border border-orange/20 px-3 py-2.5`, the offending
 *      skills listed `ml-6`, and the two controls right-aligned under them.
 *   5. THE GAUGE. `TokenBudgetGauge`: the section line with `ContextWindowSwitch` pushed
 *      right, two `BudgetBar`s in a `grid-cols-2 gap-3`, and the two collapsed
 *      disclosures under them.
 *   6. THE CARDS. `SkillCard` at `px-2 py-2 rounded-xl bg-surface border
 *      border-line-strong`, a `w-12 h-12 rounded-lg` avatar, the name at `text-base
 *      font-semibold capitalize` and the description at `text-sm` beneath it, three to a
 *      row.
 *
 * THE SWITCH IS ON `Auto · 1M`, WHICH IS THE WHOLE ARGUMENT OF THE GAUGE. The budget is
 * not a number this app chose — it is about 1% of the model's context window, so the same
 * library reads comfortable on a 1M model and tight on a 200K one. Drawing the switch
 * parked on a forced preset would have hidden the one fact worth showing: the window came
 * off the running agent.
 *
 * THE BARS ARE AT 81%, and that is chosen rather than arbitrary. Empty bars say nothing;
 * full ones turn `bg-red` and would make the drawing an error state. Four fifths is a
 * library you would want to look at.
 *
 * WHAT IS TRANSLATED AND WHAT IS NOT. The app translates its own chrome — "All skills",
 * "Built-in", "Skills Budget" — so those go through the catalogue holding the app's own
 * sentences, key for key. A skill's NAME is the string its own `SKILL.md` declares
 * (`magic:start`, `deploy-preview`), so it is a literal, and so are the two window presets:
 * the app's French catalogue spells "200K tokens" and "1M tokens" exactly that way too.
 *
 * IN DARK, the same trade the other app reproductions on this page make: the app runs its
 * theme off CSS variables and every theme it ships is dark, while this webapp has one
 * light palette. `bg-ink` plus the declared white-alpha ramp stands in — `onink-body`,
 * `onink-dim`, `onink-faint`, `onink-rule`, `onink-tint`, `onink-selected` — with the
 * app's `surface-sunken-soft` becoming `bg-black/20`, the value `themes.ts` gives it.
 * `accent` and `orange` are shared, and the two rungs the ramp has no value for — the app's
 * `surface` at 6% and `line-strong` at 15% — are spelled as white alphas at exactly the
 * numbers `themes.ts` declares. See `CARD`.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and a disclosure that cannot be
 * opened or a button that cannot be pressed should be announced to nobody.
 */

/**
 * VS Code's mark, traced from `desktop/src/renderer/components/agent-info-sidebar/
 * icons.tsx` — the same file the app's own button reads it from.
 *
 * KEPT AS A VECTOR IN ITS OWN THREE BLUES rather than pointed at `/img/vscode-logo.png`,
 * for `JiraMark`'s reason next door: it is a brand mark, so it does not take the orange
 * ink of the button around it.
 *
 * `useId` for the mask, and it is load-bearing rather than tidy: `url(#id)` resolves
 * against the WHOLE document, so the app's fixed `vscode-mask0` is safe only because it is
 * drawn once. On a page that may draw it twice, a fixed id knocks the second copy out.
 */
function VSCodeMark({ className }: { className?: string }) {
  const maskId = useId();

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="100"
        height="100"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M70.9119 99.3171C72.4869 99.9307 74.2828 99.8914 75.8725 99.1264L96.4608 89.2197C98.6242 88.1787 100 85.9892 100 83.5872V16.4133C100 14.0113 98.6243 11.8218 96.4609 10.7808L75.8725 0.873756C73.7862 -0.130129 71.3446 0.11576 69.5135 1.44695C69.252 1.63711 69.0028 1.84943 68.769 2.08341L29.3551 38.0415L12.1872 25.0096C10.589 23.7965 8.35363 23.8959 6.86933 25.2461L1.36303 30.2549C-0.452552 31.9064 -0.454633 34.7627 1.35853 36.417L16.2471 50.0001L1.35853 63.5832C-0.454633 65.2374 -0.452552 68.0938 1.36303 69.7453L6.86933 74.7541C8.35363 76.1043 10.589 76.2037 12.1872 74.9905L29.3551 61.9587L68.769 97.9167C69.3925 98.5406 70.1246 99.0104 70.9119 99.3171ZM75.0152 27.2989L45.1091 50.0001L75.0152 72.7012V27.2989Z"
          fill="white"
        />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path
          d="M96.4614 10.7962L75.8569 0.875542C73.4719 -0.272773 70.6217 0.211611 68.75 2.08333L1.29858 63.5832C-0.515693 65.2373 -0.513607 68.0937 1.30308 69.7452L6.81272 74.754C8.29793 76.1042 10.5347 76.2036 12.1338 74.9905L93.3609 13.3699C96.086 11.3026 100 13.2462 100 16.6667V16.4275C100 14.0265 98.6246 11.8378 96.4614 10.7962Z"
          fill="#0065A9"
        />
        <path
          d="M96.4614 89.2038L75.8569 99.1245C73.4719 100.273 70.6217 99.7884 68.75 97.9167L1.29858 36.4169C-0.515693 34.7627 -0.513607 31.9063 1.30308 30.2548L6.81272 25.246C8.29793 23.8958 10.5347 23.7964 12.1338 25.0095L93.3609 86.6301C96.086 88.6974 100 86.7538 100 83.3334V83.5726C100 85.9735 98.6246 88.1622 96.4614 89.2038Z"
          fill="#007ACC"
        />
        <path
          d="M75.8578 99.1263C73.4721 100.274 70.6219 99.7885 68.75 97.9166C71.0564 100.223 75 98.5895 75 95.3278V4.67213C75 1.41039 71.0564 -0.223106 68.75 2.08329C70.6219 0.211402 73.4721 -0.273666 75.8578 0.873633L96.4587 10.7807C98.6234 11.8217 100 14.0112 100 16.4132V83.5871C100 85.9891 98.6234 88.1786 96.4586 89.2196L75.8578 99.1263Z"
          fill="#1F9CF0"
        />
      </g>
    </svg>
  );
}

/**
 * THE WINDOW IS LAID OUT AT A FIXED WIDTH AND SHRUNK WHOLE, and that technique is what the
 * rest of this file rests on: it is what lets every measurement below be the source's own
 * number instead of a proportion of whatever column the drawing lands in.
 *
 * The alternative is what this drew first, and it does not survive a two-pane screen. Let
 * the window take the column's width and the 224px rail goes from a fifth of the real thing
 * to a third of the drawing, while the card grid the app fixes at three tracks comes out at
 * 145px a card — narrower than the avatar and the badge together, so the skill's own NAME is
 * the thing that truncates away. Reflowing a reproduction reflows the proportions that make
 * it one.
 *
 * 1152 IS `PageModal`'s OWN `max-w-6xl` — the width the window opens at on any display wide
 * enough to give it one, and therefore the only width at which the rest of the screen is
 * the shape a reader would recognise. A narrower real window (the modal is `w-full max-w-6xl`,
 * so it is 976 on a 1024-wide display) buys larger type here and costs the card grid: at 976
 * a card is 229px, and the badge beside the name leaves 67px for a name that wants 85. The
 * window is drawn at the width where it does not truncate itself.
 *
 * `zoom` AND NOT `transform: scale`, and the difference is load-bearing: `zoom` REFLOWS —
 * the element's box shrinks with it, so the plate sizes itself to the scaled drawing. A
 * transform leaves the box at its unscaled height, which would mean pinning a pixel height
 * here that nothing keeps in step with the content above it.
 */
const WINDOW_WIDTH = 1152;

/**
 * What the window is shrunk BY, and the one number in this file that knows about the page
 * around it: 1152 × 0.652 is 751px, the exact inner width of the plate in the features column
 * (`max-w-site` 1100, less the 220px rail and the 64px gap, less this plate's own `p-8`).
 *
 * It buys the type it costs: the app's 16px card headings land at 10.4px here, its 14px body
 * at 9.1. That is the trade the paragraph above makes deliberately — a whole screen at a
 * readable-but-small size, rather than half a screen at full size.
 *
 * Narrower than that — a tablet, a phone — and the window runs off the right of the plate
 * and is cropped there, which is what the Agents drawing two rows down does with its own
 * fixed scale rather than shrinking the type past reading.
 */
const WINDOW_ZOOM = 0.652;

/** The app's own rail width — `w-56`, 224px, the same one Settings uses. */
const RAIL_WIDTH = 224;

/**
 * ALL EIGHT SKILLS MAGIC SLASH SHIPS, and all eight because the group header counts them:
 * a rail reading "BUILT-IN 8" over six rows is a drawing contradicting itself.
 *
 * NAMED THE WAY THE APP NAMES THEM — `magic:plan`, not `magic-plan` and not `/magic:plan`.
 * `skills-handlers.ts` reads `frontmatter.name || entry.name`, and every `SKILL.md` in
 * `skills/` declares the colon form, so that is the string on the card and in the rail. It
 * is a value the app prints, so it is a literal here.
 *
 * Their marks are the `skill-*.png` this repo already ships and the documentation already
 * draws; their descriptions are the site's own bilingual one-liners for the eight commands,
 * which is the same sentence the skill's own frontmatter opens with.
 */
const BUILT_IN = [
  {
    name: "magic:plan",
    picto: "/img/skill-plan.png",
    description: "site.commands.plan",
  },
  {
    name: "magic:start",
    picto: "/img/skill-start.png",
    description: "site.commands.start",
  },
  {
    name: "magic:continue",
    picto: "/img/skill-continue.png",
    description: "site.commands.continue",
  },
  {
    name: "magic:commit",
    picto: "/img/skill-commit.png",
    description: "site.commands.commit",
  },
  {
    name: "magic:pr",
    picto: "/img/skill-pr.png",
    description: "site.commands.pr",
  },
  {
    name: "magic:review",
    picto: "/img/skill-review.png",
    description: "site.commands.review",
  },
  {
    name: "magic:resolve",
    picto: "/img/skill-resolve.png",
    description: "site.commands.resolve",
  },
  {
    name: "magic:done",
    picto: "/img/skill-done.png",
    description: "site.commands.done",
  },
] as const satisfies readonly {
  name: string;
  picto: string;
  description: MessageKey;
}[];

/**
 * Two skills of the reader's own, and one a repository carries — an invented project, so
 * the names belong to nothing real. Their descriptions are the reader's own prose, which
 * is why they are catalogue keys where the names beside them are literals.
 */
const CUSTOM = [
  { name: "deploy-preview", description: "site.skillsCard.deployPreview" },
  { name: "release-notes", description: "site.skillsCard.releaseNotes" },
] as const satisfies readonly { name: string; description: MessageKey }[];

const REPO = {
  name: "acme/checkout-api",
  color: "#6366f1",
  skills: [{ name: "db-migrate", description: "site.skillsCard.dbMigrate" }],
} as const satisfies {
  name: string;
  color: string;
  skills: readonly { name: string; description: MessageKey }[];
};

/**
 * The two skills the warnings band is complaining about, with the word counts the app
 * prints beside them. Both are the reader's own — a built-in one over the line would be
 * a bug in this repository rather than in their library.
 */
const LONG_DESCRIPTIONS = [
  { name: "deploy-preview", words: 184 },
  { name: "release-notes", words: 126 },
] as const;

/**
 * `SkillCard`'s box, minus the parts a drawing cannot have.
 *
 * `white/[0.06]` and `white/[0.15]` are the app's `surface` and `line-strong` at the exact
 * alphas `themes.ts` declares for the dark theme. They are spelled out rather than taken
 * from the `onink` ramp because that ramp has no rung at either value — it was cut for the
 * footer plate, not for reproducing this app — and rounding a card's fill from 6% to 5% is
 * how a drawing stops being a reproduction one nudge at a time.
 */
const CARD =
  "flex items-center gap-3 rounded-xl border border-white/[0.15] bg-white/[0.06] px-2 py-2";

/** The row-button recipe the Import / New pair shares. */
const PILL =
  "flex items-center gap-1.5 rounded-lg border border-white/[0.15] bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-appink";

/**
 * The card grid — `grid grid-cols-3 gap-2`, the app's own, and three tracks at every width
 * of this page because the window it sits in is a fixed 1152px. See `WINDOW_WIDTH`: that
 * fixed width is exactly what lets this be the source's class rather than a responsive
 * approximation of it.
 */
function SkillGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}

/**
 * `SkillCard`: a 48px avatar, the name at `text-base font-semibold capitalize` with its
 * source badge beside it, and the description truncated to one line under them.
 *
 * `capitalize` IS THE APP'S OWN, and it is why the rail and the cards both read
 * "Magic-Plan" rather than "magic-plan": the class capitalises every word, and a hyphen
 * starts one. That is what the window shows, so it is what this shows.
 *
 * A skill with no image of its own falls back to the app's tile — a `w-12 h-12` ground
 * with the picture glyph in it — which is what a skill you wrote this morning looks like.
 */
function SkillCard({
  name,
  picto,
  badge,
  description,
}: {
  name: string;
  picto?: string;
  badge?: string;
  description: string;
}) {
  return (
    <div className={CARD}>
      {picto ? (
        <img
          src={picto}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <ImageGlyph className="h-5 w-5 text-appink" />
        </span>
      )}
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-semibold capitalize text-white">
            {name}
          </span>
          {badge && (
            <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent-hover">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-appink/60">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-appink-muted" />
    </div>
  );
}

/** A section line: a `w-4` glyph, the section's name, at `text-sm text-text-secondary`. */
function SectionLine({
  icon: Icon,
  label,
}: {
  icon: typeof Gauge;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-appink">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}

/**
 * A rail group header — `px-2.5 mb-1.5 text-[11px] uppercase tracking-wider` with the
 * count trailing the label. `first` is the app's own flag: the top group opens at `mt-3`
 * and every one after it at `mt-7`.
 */
function RailGroup({
  mark,
  label,
  count,
  first,
  action,
}: {
  mark: React.ReactNode;
  label: string;
  count: number;
  first?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] uppercase tracking-wider text-appink/50 ${
        first ? "pt-3" : "pt-7"
      }`}
    >
      {mark}
      <span className="truncate">{label}</span>
      <span className="text-appink/30">{count}</span>
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}

/** A rail row. The avatar is the app's fallback tile unless the skill ships a mark. */
function RailRow({ name, picto }: { name: string; picto?: string }) {
  return (
    <div className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-appink">
      {picto ? (
        <img
          src={picto}
          alt=""
          className="h-5 w-5 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-onink-selected">
          <ImageGlyph className="h-3 w-3 text-appink-icon" />
        </span>
      )}
      <span className="truncate capitalize">{name}</span>
    </div>
  );
}

/**
 * `BudgetBar`, verbatim: the label and the reading on one line, a `h-2` track under them,
 * and the percentage right-aligned beneath.
 *
 * The shimmer the real bar sweeps across its fill is left out, and deliberately: it is a
 * five-second loop announcing that the figure is live, which is true in the app and a
 * distraction in a still.
 */
function BudgetBar({
  label,
  value,
  unit,
  fill,
  percent,
}: {
  label: string;
  value: string;
  unit: string;
  fill: string;
  percent: number;
}) {
  return (
    <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-appink/60">{label}</span>
        <span className="text-right text-xs font-medium text-appink">
          {value} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1.5 text-right text-xs text-appink/40">{percent}%</div>
    </div>
  );
}

/** A collapsed disclosure: the chevron at rest, and the question it answers. */
function Disclosure({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-appink-icon">
      <ChevronRight className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}

/**
 * The four things this window does that a still image of it cannot show.
 *
 * A LEGEND AND NOT A FEATURE LIST, the same rule the Tasks and Agents drawings are under:
 * every one of them annotates something visible above. The rail is drawn but its three
 * origins are not labelled as such; the gauges are drawn but nothing says the budget moves
 * with the model; the warnings band is drawn but its two buttons cannot be pressed; and
 * the one thing the overview genuinely cannot show is what happens when you open a skill.
 */
const LEGEND: readonly {
  id: string;
  icon: typeof Gauge;
  tone: string;
  name: MessageKey;
  description: MessageKey;
}[] = [
  {
    id: "rail",
    icon: LayoutGrid,
    tone: "bg-accent/15 text-accent",
    name: "site.skillsCard.legendRailTitle",
    description: "site.skillsCard.legendRailDesc",
  },
  {
    id: "budget",
    icon: Gauge,
    tone: "bg-accent/15 text-accent",
    name: "site.skillsCard.legendBudgetTitle",
    description: "site.skillsCard.legendBudgetDesc",
  },
  {
    id: "warnings",
    icon: AlertTriangle,
    tone: "bg-orange/15 text-orange",
    name: "site.skillsCard.legendWarningsTitle",
    description: "site.skillsCard.legendWarningsDesc",
  },
  {
    id: "edit",
    icon: PenTool,
    tone: "bg-accent/15 text-accent",
    name: "site.skillsCard.legendEditTitle",
    description: "site.skillsCard.legendEditDesc",
  },
];

export function SkillsModalMockup() {
  const { t } = useT();

  return (
    <div className="flex flex-col">
      {/* THE PLATE THE WINDOW SITS ON. `tone-sky` and not the indigo the Tasks drawing
          uses further up the same family — two saturated full-width panels in one column
          read as one long block rather than as two claims.

          SURROUNDED RATHER THAN CROPPED, which is the one composition choice here that
          differs from the Tasks drawing above. A backlog is longer than any frame, so
          cutting it at the bottom says something true about it. This overview is not: the
          three sections below the gauge — built-in, yours, your repositories' — ARE the
          whole page, and a crop would invent a fourth. So the window is complete and the
          plate closes around it on all four sides. */}
      <div
        aria-hidden
        className="overflow-hidden rounded-2xl bg-tone-sky p-5 sm:p-8"
      >
        <div
          className="overflow-hidden rounded-2xl border border-onink-rule bg-ink shadow-lift"
          style={{ width: WINDOW_WIDTH, zoom: WINDOW_ZOOM }}
        >
          {/* THE CHROME: `px-4 h-12 border-b`, title left, close right. */}
          <div className="flex h-12 items-center justify-between border-b border-onink-rule px-4">
            <span className="text-sm font-semibold text-white">
              {t("site.agentsCard.skills")}
            </span>
            <span className="p-1.5 text-onink-dim">
              <X className="h-4 w-4" />
            </span>
          </div>

          <div className="flex">
            {/* ── THE RAIL ──────────────────────────────────────────────────── */}
            <div
              className="flex shrink-0 flex-col border-r border-onink-rule bg-black/20"
              style={{ width: RAIL_WIDTH }}
            >
              <div className="border-b border-onink-rule px-2 pb-1 pt-3">
                {/* The overview is where the window opens, so its pill is the active one. */}
                <div className="mb-2 flex w-full items-center gap-2 rounded-lg bg-accent/15 px-2.5 py-1.5 text-sm font-medium text-white">
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {t("site.skillsCard.allSkills")}
                  </span>
                </div>
              </div>

              <div className="px-2 pb-3">
                <RailGroup
                  mark={<Sparkles className="h-3 w-3" />}
                  label={t("site.skillsCard.builtIn")}
                  count={8}
                  first
                />
                {BUILT_IN.map((skill) => (
                  <RailRow
                    key={skill.name}
                    name={skill.name}
                    picto={skill.picto}
                  />
                ))}

                <RailGroup
                  mark={<PenTool className="h-3 w-3" />}
                  label={t("site.skillsCard.custom")}
                  count={CUSTOM.length}
                  action={<Plus className="h-3 w-3 text-appink-icon" />}
                />
                {CUSTOM.map((skill) => (
                  <RailRow key={skill.name} name={skill.name} />
                ))}

                {/* A repository group is headed by its own colour, the one the app gives
                    it everywhere else — the Tasks card, the agent list, the settings. */}
                <RailGroup
                  mark={
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: REPO.color }}
                    />
                  }
                  label={REPO.name}
                  count={REPO.skills.length}
                />
                {REPO.skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-appink"
                  >
                    <GitFork className="h-4 w-4 shrink-0 text-appink-muted" />
                    <span className="truncate capitalize">{skill.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── THE OVERVIEW ──────────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col gap-10 p-6">
              {/* ── Warnings ─────────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <SectionLine
                  icon={AlertTriangle}
                  label={t("site.skillsCard.warnings")}
                />
                <div className="rounded-lg border border-orange/20 bg-orange/10 px-3 py-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-orange" />
                    <p className="text-xs text-orange">
                      {t("site.skillsCard.longDesc")}
                    </p>
                  </div>
                  <div className="ml-6 flex flex-col gap-1.5">
                    {LONG_DESCRIPTIONS.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs capitalize text-white">
                          {entry.name}
                        </span>
                        <span className="shrink-0 text-xs text-orange/70">
                          {t("site.skillsCard.words", { count: entry.words })}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* The two controls the alert offers, in the app's own order: read it
                      yourself, or hand it to an agent. */}
                  <div className="ml-6 mt-2.5 flex justify-end gap-2">
                    <span className="flex items-center gap-1.5 rounded-lg border border-orange/20 px-2.5 py-1.5 text-xs font-medium text-orange">
                      <VSCodeMark className="h-3.5 w-3.5" />
                      {t("site.skillsCard.openInVSCode")}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg border border-orange/20 px-2.5 py-1.5 text-xs font-medium text-orange">
                      <Wand2 className="h-3.5 w-3.5" />
                      {t("site.skillsCard.fixWithAgent")}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── The budget gauge ─────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                {/* `flex-wrap`, AND THAT IS THE ONE REFLOW IN THE DRAWING. The app sets
                    this header on one line because it has 880px to do it in; this column
                    has half that, and a squeezed switch would have set the help sentence
                    four words wide beside it. Wrapping drops the switch to a line of its
                    own, still right-aligned, which is what the app itself does at a
                    narrow window. */}
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0">
                    <SectionLine
                      icon={Gauge}
                      label={t("site.skillsCard.budgetSection")}
                    />
                    <p className="mt-0.5 text-xs text-appink/30">
                      {t("site.skillsCard.budgetHelp")}
                    </p>
                  </div>

                  {/* `ContextWindowSwitch`: three segments in a `rounded-full p-px`
                      track, the active one carrying the highlight. Parked on Auto,
                      which is the state that says the budget follows the model. */}
                  <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-[11px] text-appink/50">
                        {t("site.skillsCard.windowLabel")}
                      </span>
                      <div className="flex items-center rounded-full border border-onink-rule bg-onink-tint p-px">
                        <span className="rounded-full bg-onink-selected px-3 py-1 text-[11px] font-medium text-white">
                          Auto · 1M
                        </span>
                        <span className="px-3 py-1 text-[11px] font-medium text-appink/50">
                          200K tokens
                        </span>
                        <span className="px-3 py-1 text-[11px] font-medium text-appink/50">
                          1M tokens
                        </span>
                      </div>
                    </div>
                    <p className="text-right text-[10px] text-appink/40">
                      {t("site.skillsCard.windowHint")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <BudgetBar
                    label={t("site.skillsCard.chars")}
                    value={t("site.skillsCard.charsValue")}
                    unit={t("site.skillsCard.unitChars")}
                    fill="bg-accent"
                    percent={81}
                  />
                  <BudgetBar
                    label={t("site.skillsCard.tokens")}
                    value={t("site.skillsCard.tokensValue")}
                    unit={t("site.skillsCard.unitTokens")}
                    fill="bg-orange"
                    percent={81}
                  />
                </div>

                <Disclosure label={t("site.skillsCard.how")} />
                <Disclosure label={t("site.skillsCard.details")} />
              </div>

              {/* ── The built-in cards ───────────────────────────────────────── */}
              <div>
                <SectionLine
                  icon={Sparkles}
                  label={t("site.skillsCard.builtIn")}
                />
                <p className="mb-3 mt-0.5 text-xs text-appink/30">
                  {t("site.skillsCard.builtInHelp")}
                </p>
                <SkillGrid>
                  {BUILT_IN.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      name={skill.name}
                      picto={skill.picto}
                      badge={t("site.skillsCard.sourceBuiltIn")}
                      description={t(skill.description)}
                    />
                  ))}
                </SkillGrid>
              </div>

              {/* ── Your own ─────────────────────────────────────────────────── */}
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SectionLine
                      icon={PenTool}
                      label={t("site.skillsCard.custom")}
                    />
                    <p className="mt-0.5 text-xs text-appink/30">
                      {t("site.skillsCard.customHelp")}
                    </p>
                  </div>
                  {/* The two controls the section header carries once you have a skill of
                      your own: bring a folder in, or start one from nothing. */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={PILL}>
                      <FolderInput className="h-3 w-3" />
                      {t("site.skillsCard.import")}
                    </span>
                    <span className={PILL}>
                      <Plus className="h-3 w-3" />
                      {t("site.skillsCard.new")}
                    </span>
                  </div>
                </div>
                <SkillGrid>
                  {CUSTOM.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      name={skill.name}
                      description={t(skill.description)}
                    />
                  ))}
                </SkillGrid>
              </div>

              {/* ── And what the repositories carry ──────────────────────────── */}
              <div>
                <SectionLine
                  icon={GitFork}
                  label={t("site.skillsCard.repos")}
                />
                <p className="mb-3 mt-0.5 text-xs text-appink/30">
                  {t("site.skillsCard.reposHelp")}
                </p>
                {/* One block per repository, headed by its own colour, its name and the
                    count — `mb-2` over the grid, exactly as the overview draws it. */}
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: REPO.color }}
                  />
                  <span className="text-sm font-medium text-appink">
                    {REPO.name}
                  </span>
                  <span className="text-xs text-appink/40">
                    {REPO.skills.length}
                  </span>
                </div>
                <SkillGrid>
                  {REPO.skills.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      name={skill.name}
                      description={t(skill.description)}
                    />
                  ))}
                </SkillGrid>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeatureLegend
        items={LEGEND.map((item) => ({
          id: item.id,
          mark: (
            <LegendTile tone={item.tone}>
              <item.icon className="h-4 w-4" />
            </LegendTile>
          ),
          name: item.name,
          description: item.description,
        }))}
      />
    </div>
  );
}
