"use client";

import {
  Activity,
  ArrowDownUp,
  Check,
  Clock,
  FolderGit2,
  ListTodo,
  MessageCircleQuestionMark,
  NotebookPen,
  Plus,
  Sparkles,
  XCircle,
} from "@ds/desktop/icons";
import {
  Loader,
  Sidebar,
  type MenuSidebarEntry,
  type SidebarAgentRow,
} from "@ds/desktop";
import { useT } from "@/lib/i18n/useLanguage";
import { AppGround } from "../AppGround";
import { FeatureLegend, LegendTile } from "./FeatureLegend";

/**
 * The visual under the `Agents` row: the desktop app's left sidebar, with four agents on
 * it — two at work, one asking a question, one done.
 *
 * IT IS THE APP'S OWN `Sidebar`, imported from `@ds/desktop`. This file used to REDRAW
 * it: 394 lines, band for band, every padding copied out of `Sidebar.tsx` with a comment
 * saying which line it came from — and it had fallen behind anyway. It showed a `Team`
 * row with ⌘T, a page the app replaced with `Plans` long enough ago that the shortcut
 * table in the app carries a note explaining why the letters no longer match the order.
 * A drawing that IS the component cannot fall behind it, which is the whole argument for
 * having moved the column into the design system.
 *
 * SO WHAT IS LEFT HERE IS THE PHOTOGRAPHY: the plate, the crop, the magnification, the
 * fixture the column is handed, and the legend underneath. Not one app class.
 *
 * `AppGround` is what makes it possible. The app runs its colours off `--c-*` variables
 * and this site has one light palette; that component writes a theme's variables onto
 * one element and paints the app's own window colour under them, so `bg-surface-sunken`
 * inside resolves here exactly as it does in Electron. The old hand-drawing substituted
 * `bg-black/30` for the column and `yellow` for the app's `orange`, because neither was
 * available to it. Both are now the real values.
 *
 * THE SIDEBAR AND NOTHING ELSE. Sixty pixels of dark ground stand for the rest of the
 * window and the frame cuts even those: this is a ZOOM, and a half-drawn terminal beside
 * a faithful sidebar would invite the reader to compare it with the real thing and find
 * it wanting. What is drawn is drawn properly; what is not is not drawn at all.
 *
 * THE USAGE CARD AND THE VERSION LINE ARE ABSENT rather than merely cropped: no `footer`
 * and no `version` is passed, and the column draws neither. They are its FOOTER — an
 * account's two rate limits and a build number — and this drawing is about the list
 * above them. Left in and cropped, they would have pushed that list up and out of the
 * frame to say nothing.
 *
 * `aria-hidden` AND `inert`, on the plate. The first is what it always was: a drawing,
 * announced to nobody. The second is new and is the price of drawing the real thing —
 * the column's rows are real `<button>`s, and eight controls nobody can see have no
 * business in the tab order.
 */

/** Nothing happens when any of this is pressed. The column cannot tell the difference,
 *  which is what it means for it to be dumb. */
const noop = () => undefined;

/**
 * The four states an agent can be in, and what each one is drawn as.
 *
 * `idle` is the fifth and has no glyph at all — a sidebar that puts a mark beside every
 * agent makes the ones actually doing something invisible — so it is absent here as it
 * is absent from the app's own row.
 *
 * THE MARKS ARE THE APP'S. `Agent` draws its own inside the list above; these are the
 * same glyphs at the same size for the legend, which sits outside the app's ground and
 * cannot borrow them from a row. `orange` is the app's real token now that the palette
 * declares it with a fallback — the old drawing substituted `yellow` and the legend then
 * disagreed with the list it was explaining.
 */
export const AGENT_STATES = [
  {
    id: "working",
    tone: "text-accent",
    tint: "bg-accent/20",
    name: "site.agentsCard.working",
    description: "site.agentsCard.workingDesc",
  },
  {
    id: "waiting",
    tone: "text-orange",
    tint: "bg-orange/20",
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

/** The glyph for a state, at the size the row's badge uses. `Loader` is the app's own
 *  wave — three bars in `currentColor`, so the tile it sits on decides the hue. */
export function AgentStateGlyph({ state }: { state: AgentStateId }) {
  switch (state) {
    case "working":
      return <Loader />;
    case "waiting":
      return <MessageCircleQuestionMark className="h-4 w-4" />;
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
const AGENTS: SidebarAgentRow[] = [
  { id: "1", name: "PAY-318 · invoice VAT", state: "working", active: true },
  { id: "2", name: "#409 · rate limits", state: "working" },
  { id: "3", name: "PAY-311 · card change", state: "waiting" },
  { id: "4", name: "#404 · empty basket", state: "completed" },
];

/**
 * `legend` — the box of definitions under the drawing. On by default, which is what
 * `/features` wants; `/desktop` shows the same drawing beside its own paragraph and
 * turns it off, because that paragraph is the legend there.
 */
export function AgentsSidebarMockup({ legend = true }: { legend?: boolean } = {}) {
  const { t } = useT();

  /** The app's four rows, in the app's order — and the shortcuts deliberately do NOT
   *  follow it: ⌘T opens the first and ⌘J the second. The letters were bound before
   *  Plans took Team's place, and they are what people's hands know. */
  const menu: MenuSidebarEntry[] = [
    { id: "plans", icon: NotebookPen, label: t("site.agentsCard.plans"), shortcut: "⌘T", onClick: noop },
    { id: "tasks", icon: ListTodo, label: t("site.agentsCard.tasks"), shortcut: "⌘J", onClick: noop },
    { id: "skills", icon: Sparkles, label: t("site.agentsCard.skills"), shortcut: "⌘;", onClick: noop },
    // The account row. Signed in, it is the person's own name and it opens Settings —
    // which is why it carries ⌘, rather than a label saying so. No photo, so the
    // column draws the bare glyph, exactly as the app does for anyone who never
    // uploads one.
    { id: "account", avatar: { src: null, alt: "" }, label: "camille", shortcut: "⌘,", onClick: noop },
  ];

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
        // `inert` is a boolean HTML attribute, so its PRESENCE is what counts — and it
        // has to reach the DOM as a STRING: React 18 does not know the attribute, and
        // given `true` it warns and drops it instead of writing it. The types disagree
        // (they declare it boolean, which is React 19's behaviour), hence the double
        // cast. `components/ui.tsx` does the same for its closed panels.
        {...({ inert: "" } as unknown as React.HTMLAttributes<HTMLDivElement>)}
        className="h-[405px] overflow-hidden rounded-2xl bg-tone-sky pl-8 sm:h-[560px] sm:pl-20"
      >
        {/* THE ZOOM, and what makes it one rather than a small picture of a window.

            The sidebar is drawn at the app's own 230px — every padding, every type size,
            every gap is the component's own number, and none of them can be nudged for
            the sake of this page even if someone wanted to. So the magnification is a
            `scale` on the whole thing rather than a set of larger values: the proportions
            survive it exactly, and what changes is only how close the reader is standing.

            `origin-top-left`, so the growth pushes into the two edges on that side rather
            than off the left one — and the left is where the sidebar's own margin is, the
            one part of it that says it is a panel and not a page. */}
        <div className="w-[406px] origin-top-left scale-[1.6] sm:scale-[2.2]">
          {/* THE TOP CROP, in the window's OWN pixels, so it means the same slice of the
              sidebar at either magnification. Spelled outside the scaled element it would
              have been a final-pixel count that cut a different band on a phone than on a
              desktop.

              228 lands part-way through the menu, so the frame opens on a row that is
              visibly cut rather than on a tidy edge — which is the difference between a
              crop and a picture that happens to start there. The plate's own height does
              the same thing at the bottom, through the fourth agent. */}
          <div style={{ marginTop: -228 }}>
            {/* `min-h` in the window's own pixels, and it is not decoration: with the
                usage card gone the column ends after the last agent, so the app was
                shorter than the frame at the narrow scale and the plate showed under it.
                A window that stops inside its own crop is a window with a bottom edge,
                which is the one thing this composition must not have.

                `shadow-edge`, and only its LEFT side is ever seen: the window is cut by
                the frame on the other three, so the one edge with a boundary to sell is
                the app against the plate's blue band. The scale takes the shadow with it,
                which is right rather than a side effect: a magnified screenshot whose
                shadow stayed at 1× would read as a sticker on the page instead of an
                object photographed close up. */}
            <AppGround className="flex min-h-[600px] shadow-edge">
              <Sidebar
                menu={menu}
                lists={[
                  {
                    id: "agents",
                    label: t("site.agentsCard.agents"),
                    // The one that CHANGES the list reads before the one that ADDS to
                    // it, and both act on the list under them.
                    actions: [
                      {
                        id: "sort",
                        icon: ArrowDownUp,
                        title: t("site.agentsCard.sort"),
                        panelWidth: 190,
                        // A REAL MENU, opened by a real chevron: this is the app's own
                        // `SelectIcon`, so the drawing cannot promise a list it does not
                        // have. The check says which order the list below is in.
                        groups: [
                          {
                            label: t("site.agentsCard.sortBy"),
                            items: [
                              { id: "recent", label: t("site.agentsCard.sortRecent"), icon: Clock, selected: true },
                              { id: "status", label: t("site.agentsCard.sortStatus"), icon: Activity },
                              { id: "repository", label: t("site.agentsCard.sortRepository"), icon: FolderGit2 },
                            ],
                          },
                        ],
                        onSelect: noop,
                      },
                      { id: "new", icon: Plus, title: t("site.agentsCard.newAgent"), onClick: noop },
                    ],
                    // A COUNT, NOT A GROUP. One agent is waiting, so it reads 1 — and the
                    // row it counts stays exactly where it is in the list below.
                    attention: { label: t("site.agentsCard.attention"), count: 1 },
                    agents: AGENTS,
                  },
                ]}
              />

              {/* EVERYTHING ELSE, OUT OF FRAME. The rest of the window is a dark ground
                  and nothing more, and most of even that is cut by the right edge. */}
              <div className="min-w-0 flex-1" />
            </AppGround>
          </div>
        </div>
      </div>

      {/* ── THE STATES, UNDER THE DRAWING ──────────────────────────────────────
          A LEGEND, which is why it sits here rather than in the copy above: a reader who
          has just seen three of these on a list wants the fourth explained in the same
          glance, and a paragraph naming four icons is a paragraph nobody maps back onto
          them. `FeatureLegend` is the shape — one closed box rather than four cards,
          because an agent is in one of these states or it is idle, and idle draws
          nothing. */}
      {legend ? (
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
      ) : null}
    </div>
  );
}
