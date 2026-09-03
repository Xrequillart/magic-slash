"use client";

import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  CircleUserRound,
  ListTodo,
  MessageCircleQuestion,
  Minus,
  Plus,
  Sparkles,
  User,
  Users,
  XCircle,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useLanguage";
import { FeatureLegend, LegendTile } from "./FeatureLegend";

/**
 * The visual under the `Agents` row: the desktop app's left sidebar, redrawn, with four
 * agents on it — two at work, one asking a question, one done.
 *
 * THE SIDEBAR AND NOTHING ELSE. Sixty pixels of dark ground stand for the rest of the
 * window and the frame cuts even those: this is a ZOOM, and a half-drawn terminal beside
 * a faithful sidebar would invite the reader to compare it with the real thing and find
 * it wanting. What is drawn is drawn properly; what is not is not drawn at all.
 *
 * DRAWN FROM `desktop/src/renderer/components/Sidebar.tsx`, band for band, at its own
 * declared 230px:
 *
 *   1. THE TOP ACTIONS, `px-2 pt-3` with `gap-1`: Tasks, Team, Skills and the account
 *      row, each a `w-full flex items-center gap-2 px-2 py-2 text-xs font-medium
 *      rounded-lg` with a `w-3.5` glyph and its shortcut pushed right at `opacity-50`.
 *   2. THE AGENTS HEADER, `pl-2 pt-3 pb-2` — padding on the LEFT only, which is what puts
 *      the label on the same 16px line as the buttons above and the rows below while
 *      leaving the `+` flush against the right edge. The label is `text-xs
 *      text-text-secondary/50 uppercase tracking-wider`, then the sort control, then the
 *      button that adds to the list, in that order: the one that CHANGES the list reads
 *      before the one that adds to it.
 *   3. THE ATTENTION BANNER, which is a COUNT and not a group — the agents it counts stay
 *      exactly where they are in the list, and it hides itself at zero so a calm list
 *      stays calm. One agent is waiting here, so it reads 1.
 *   4. THE AGENT ROWS, `px-2 py-2 text-xs rounded-lg` in a `gap-1` column. The active one
 *      wears its own state's tint (`stateBgColors`) with full-strength ink; the rest are
 *      secondary text.
 * THE USAGE CARD AND THE VERSION LINE ARE NOT HERE, and they are absent from the markup
 * rather than merely below the crop. They are the sidebar's FOOTER — an account's two
 * rate limits and a build number — and this drawing is about the list above them. Left in
 * and cropped, they would have pushed that list up and out of the frame to say nothing.
 *
 * THE STATE GLYPHS ARE THE APP'S, AND SO IS THEIR MOTION. `AgentStateBadge` draws waving
 * bars at work, a question bubble when it needs an answer, a check when done, a cross on
 * error — and deliberately NOTHING when idle, so a quiet list stays quiet. The two
 * animations are lifted keyframe for keyframe into `tailwind.config.ts`: the wave's three
 * bars 0.15s apart, and the question bubble ARRIVING rather than gesturing, because that
 * state is the agent asking you something and not the agent being slow.
 *
 * IN DARK, the same trade the other two app reproductions on this page make: the app runs
 * its theme off CSS variables and every theme it ships is dark, while this webapp has one
 * light palette. `bg-ink` plus the declared white-alpha ramp stands in, and the app's
 * `text-orange` — which this palette does not have — becomes `yellow`, the nearest
 * declared warm tone. Everything else is shared.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and a button that cannot be
 * pressed should be announced to nobody.
 */

/** The app's own sidebar width, and the reason it is not resizable: the agent list is a
 *  column of short labels with a known shape, so there was nothing for a drag handle to
 *  reveal. */
const SIDEBAR_WIDTH = 230;

/** A top action, in the geometry every one of them shares. */
function Action({
  icon: Icon,
  label,
  shortcut,
}: {
  icon: typeof ListTodo;
  label: string;
  shortcut: string;
}) {
  return (
    <div className="flex w-full items-center justify-start gap-2 rounded-lg px-2 py-2 text-xs font-medium text-appink">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs opacity-50">{shortcut}</span>
    </div>
  );
}

/**
 * `WaveLoader`: three parallel bars, the middle one tallest, with a wave travelling
 * across them. Colourless on purpose — the bars are `currentColor`, so whatever wraps it
 * decides, which in the sidebar is the agent's own state colour.
 *
 * The stagger is an `animation-delay` per bar rather than three keyframes, exactly as the
 * app does it. `motion-reduce:animate-none` freezes them at their resting heights.
 */
function WaveLoader() {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center gap-[2px]">
      {[0, 0.15, 0.3].map((delay, index) => (
        <span
          key={delay}
          className="w-[2px] animate-wave-bar rounded-[1px] bg-current motion-reduce:animate-none"
          style={{ height: index === 1 ? 13 : 6, animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

/**
 * The four states an agent can be in, and what each one is drawn as.
 *
 * `idle` is the fifth and has no glyph at all — see the note above — so it is absent
 * here as it is absent from the app's own badge.
 *
 * `orange` IS THE ONE SUBSTITUTION: the app tints `waiting` in a token this palette does
 * not declare, so it takes `yellow`, the nearest warm tone that is declared. Inventing an
 * orange for one drawing is the unfindable value the config exists to prevent.
 */
export const AGENT_STATES = [
  {
    id: "working",
    /** `text-accent` in the app, and `accent` is shared. */
    tone: "text-accent",
    tint: "bg-accent/20",
    name: "site.agentsCard.working",
    description: "site.agentsCard.workingDesc",
  },
  {
    id: "waiting",
    tone: "text-yellow",
    tint: "bg-yellow/20",
    name: "site.agentsCard.waiting",
    description: "site.agentsCard.waitingDesc",
  },
  {
    id: "completed",
    tone: "text-green",
    tint: "bg-green/20",
    name: "site.agentsCard.completed",
    description: "site.agentsCard.completedDesc",
  },
  {
    id: "error",
    tone: "text-red",
    tint: "bg-red/20",
    name: "site.agentsCard.error",
    description: "site.agentsCard.errorDesc",
  },
] as const;

type AgentStateId = (typeof AGENT_STATES)[number]["id"];

/** The glyph for a state, drawn at the size the sidebar badge uses. */
export function AgentStateGlyph({ state }: { state: AgentStateId }) {
  switch (state) {
    case "working":
      return <WaveLoader />;
    case "waiting":
      return (
        <MessageCircleQuestion className="h-4 w-4 animate-ask-arrive motion-reduce:animate-none" />
      );
    case "completed":
      return <Check className="h-4 w-4" />;
    case "error":
      return <XCircle className="h-4 w-4" />;
  }
}

/**
 * The four agents on the list. Their names are what the app shows — an agent's title, or
 * the ticket it was started on — so they are literals, on the same invented project the
 * Tasks drawing above uses.
 *
 * ONE OF THEM IS ACTIVE, because one always is: the app tints the selected row with its
 * own state's colour rather than a neutral highlight, which is what makes a list of a
 * dozen readable at a glance.
 */
const AGENTS: readonly {
  name: string;
  state: AgentStateId;
  active?: boolean;
}[] = [
  { name: "PAY-318 · invoice VAT", state: "working", active: true },
  { name: "#409 · rate limits", state: "working" },
  { name: "PAY-311 · card change", state: "waiting" },
  { name: "#404 · empty basket", state: "completed" },
];

/** The tint an active row wears, keyed by state — `stateBgColors`, verbatim. */
const STATE_TINT: Record<AgentStateId, string> = {
  working: "bg-accent/20",
  waiting: "bg-yellow/20",
  completed: "bg-green/20",
  error: "bg-red/20",
};

/** The colour a state's glyph is drawn in — `stateColors`, with the one substitution. */
const STATE_TONE: Record<AgentStateId, string> = {
  working: "text-accent",
  waiting: "text-yellow",
  completed: "text-green",
  error: "text-red",
};

export function AgentsSidebarMockup() {
  const { t } = useT();

  return (
    <div className="flex flex-col">
      {/* THE PLATE, AND IT IS ONLY AN EDGE. `pl` and nothing else: the application runs
          off the top, the right and the bottom of it, so the only ground that shows is
          the strip down the left the sidebar's own margin sits against. `tone-sky` and
          not the indigo the Tasks drawing above uses — two full-width panels on the same
          ground, one under the other, read as one long block rather than as two claims.

          A FIXED HEIGHT, for two reasons at once. It is what crops top and bottom, and it
          is what a `scale` makes necessary anyway: a transform does not change the box it
          came from, so the magnified window would otherwise leave this container the
          height of its unscaled self and overflow it in silence. */}
      <div
        aria-hidden
        className="h-[405px] overflow-hidden rounded-2xl bg-tone-sky pl-8 sm:h-[560px] sm:pl-20"
      >
        {/* THE ZOOM, and what makes it one rather than a small picture of a window.
            
            The sidebar is drawn at the app's own 230px — every padding, every type size,
            every gap is the source's number, and none of them may be nudged for the sake
            of this page. So the magnification is a `scale` on the whole thing rather than
            a set of larger values: the proportions survive it exactly, and what changes
            is only how close the reader is standing.
            
            THE OFFSET IS THE TOP CROP, and it is spelled in FINAL pixels rather than the
            window's own: a transform is visual only, so a margin on this element moves it
            by what it says, and 334 of these is 152 of the window's — which is exactly
            the height of the four top actions above the agent list. They are drawn, and
            then they are pushed out of frame, because this drawing is about the agents
            and a nav is not one.
            
            `origin-top-left`, so the growth pushes into the two edges on that side rather
            than off the left one — and the left is where the sidebar's own margin is, the
            one part of it that says it is a panel and not a page. */}
        <div className="w-[406px] origin-top-left scale-[1.6] sm:scale-[2.2]">
          {/* THE OFFSET IS THE TOP CROP, and it is INSIDE the scaled element on purpose:
              228 is a number in the window's own pixels, so it means the same slice of
              the sidebar at either magnification. Spelled outside, it would have been a
              final-pixel count that cut a different band on a phone than on a desktop.
              
              It lands part-way through the top actions, so the frame opens on a row
              that is visibly cut rather than on a tidy edge — which is the difference
              between a crop and a picture that happens to start there. The plate's own
              height does the same thing at the bottom, through the fourth agent. */}
          {/* `min-h` in the window's own pixels, and it is not decoration: with the
              usage card gone the sidebar column ends after the last agent, so the app
              was shorter than the frame at the narrow scale and the plate showed under
              it. A window that stops inside its own crop is a window with a bottom edge,
              which is the one thing this composition must not have. */}
          {/* `shadow-edge`, and only its LEFT side is ever seen: the window is cut by
              the frame on the other three, so the one edge with a boundary to sell is
              the app against the plate's blue band. It is a rung of its own precisely
              because the other four cast DOWNWARD and resolve to nothing on a vertical
              edge — see the note beside it in `tailwind.config.ts`.
              
              The scale takes the shadow with it, which is right rather than a side
              effect: a magnified screenshot whose shadow stayed at 1× would read as a
              sticker on the page instead of an object photographed close up. */}
          <div
            className="flex min-h-[600px] bg-ink shadow-edge"
            style={{ marginTop: -228 }}
          >
            {/* ── THE SIDEBAR ──────────────────────────────────────────────────── */}
            <div
              className="flex shrink-0 flex-col bg-black/30"
              style={{ width: SIDEBAR_WIDTH }}
            >
              <div className="flex flex-col gap-1 px-2 pt-3">
                <Action
                  icon={ListTodo}
                  label={t("site.agentsCard.tasks")}
                  shortcut="⌘J"
                />
                <Action
                  icon={Users}
                  label={t("site.agentsCard.team")}
                  shortcut="⌘T"
                />
                <Action
                  icon={Sparkles}
                  label={t("site.agentsCard.skills")}
                  shortcut="⌘;"
                />
                {/* The account row. Signed in, it is the person's own name and it opens
                  Settings — which is why it carries ⌘, rather than a label saying so. */}
                <Action icon={CircleUserRound} label="camille" shortcut="⌘," />
              </div>

              <div className="flex flex-1 flex-col px-2 pb-2">
                {/* The AGENTS header: `pl-2` only, so the label lines up with everything
                  above it and the `+` stays flush right. */}
                <div className="flex items-center gap-1 pb-2 pl-2 pt-3">
                  <div className="mr-auto text-xs uppercase tracking-wider text-appink/50">
                    {t("site.agentsCard.agents")}
                  </div>
                  <span className="p-1.5 text-appink-icon">
                    <ArrowDownUp className="h-4 w-4" />
                  </span>
                  <span className="p-1.5 text-appink-icon">
                    <Plus className="h-4 w-4" />
                  </span>
                </div>

                {/* A COUNT, NOT A GROUP. One agent is waiting, so it reads 1 — and the
                  row it counts stays exactly where it is in the list below. */}
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-yellow">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {t("site.agentsCard.attention")}
                  </span>
                  <span className="ml-auto">1</span>
                </div>

                <div className="mt-1 flex flex-col gap-1">
                  {AGENTS.map((agent) => (
                    <div
                      key={agent.name}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs ${
                        agent.active
                          ? `${STATE_TINT[agent.state]} text-white`
                          : "text-appink"
                      }`}
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate font-medium">{agent.name}</div>
                      </div>
                      <span
                        className={`flex items-center ${STATE_TONE[agent.state]}`}
                      >
                        <AgentStateGlyph state={agent.state} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── EVERYTHING ELSE, OUT OF FRAME ────────────────────────────
                  The rest of the window is a dark ground and nothing more, and most of
                  even that is cut by the right edge. Drawing a terminal here would
                  invite the reader to compare it with the real one and find it wanting;
                  what is drawn is drawn properly, and the rest is out of frame. */}
            <div className="min-w-0 flex-1" />
          </div>
        </div>
      </div>

      {/* ── THE STATES, UNDER THE DRAWING ──────────────────────────────────────
          A LEGEND, which is why it sits here rather than in the copy above: a reader who
          has just seen three of these on a list wants the fourth explained in the same
          glance, and a paragraph naming four icons is a paragraph nobody maps back onto
          them. `FeatureLegend` is the shape — one closed box rather than four cards,
          because an agent is in one of these states or it is idle, and idle draws
          nothing.

          The marks are the app's OWN badges, animation and all, on a tile in each
          state's own tint, so the reader can match one to the list above without looking
          twice. */}
      <FeatureLegend
        items={AGENT_STATES.map((state) => ({
          id: state.id,
          mark: (
            <LegendTile tone={`${state.tint} ${state.tone}`}>
              <AgentStateGlyph state={state.id} />
            </LegendTile>
          ),
          name: state.name,
          description: state.description,
        }))}
      />
    </div>
  );
}
