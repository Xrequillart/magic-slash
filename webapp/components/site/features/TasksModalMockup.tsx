"use client";

import { useId } from "react";
import {
  ChevronDown,
  ChevronsUp,
  ExternalLink,
  Hand,
  Layers,
  Link2,
  ListTodo,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useLanguage";
import { FeatureLegend, LegendTile } from "./FeatureLegend";

/**
 * The visual under the `Tasks` row: the app's own Tasks modal, redrawn IN DARK and
 * cropped at the bottom.
 *
 * DRAWN FROM THE REAL SCREEN, band for band — `desktop/src/renderer/components/
 * PageModal.tsx` for the chrome, `pages/Tasks/index.tsx` for the body, and
 * `pages/Tasks/TasksRepoSection.tsx` for the cards and their rows. Every measurement
 * below is that source's, not an approximation of it:
 *
 *   1. THE MODAL. `rounded-2xl` on `bg-bg-secondary` inside `border border-line`, and a
 *      header that is exactly `px-4 h-12 border-b border-line` with the title at
 *      `text-sm font-semibold` on the left and the close button on the right.
 *   2. THE SECTION LINE. `flex items-center gap-2 text-sm text-text-secondary` — a `w-4`
 *      `ListTodo`, the word "To do", then `ml-auto` carrying the page total at
 *      `text-xs text-text-secondary/50` and the Reload button in the row-button recipe
 *      (`px-2 py-1 text-xs font-medium border border-line rounded-lg`).
 *   3. THE FILTER BAR. `TaskFilters`: a search box that takes the width — `INPUT` plus
 *      `pl-9`, with a `w-3.5` `Search` absolutely placed at `left-3` — then the pickers
 *      at their declared widths, 176px for the repository and 152px for the sort.
 *   4. THE CARDS. `rounded-lg bg-surface-subtle border border-line-field overflow-hidden`,
 *      a header at `px-4 py-3` carrying the chevron, the repository's own colour as a
 *      `w-2 h-2` dot, its name at `text-sm font-medium`, and the count on the right.
 *   5. THE ROWS. `rowActivation`'s geometry verbatim —
 *      `flex items-center gap-3 pl-4 pr-4 py-2.5 border-t border-line-subtle` — with the
 *      `TrackerTile` at `sm` (`w-8 h-8 rounded-lg`), a `TicketBadge`, the title at
 *      `text-sm`, and a second line of what is known about the ticket.
 *
 * THE TWO TRACKERS ARE THE POINT, which is why both cards are here. A GitHub row carries
 * `#number`, an `@login` and its labels; a Jira row carries a `PROJ-123` key, a status
 * pill coloured by CATEGORY and labelled by NAME, the epic it hangs off and its priority
 * as an arrow. Those are two different second lines, and a drawing that showed one of
 * them would be a drawing of half the screen.
 *
 * IN DARK, WHICH IS THE ONE THING THAT IS NOT A REPRODUCTION, and it is the same trade
 * `PRWatchCardMockup` makes next door: the app runs its theme off CSS variables and every
 * theme it ships is dark, while this webapp has one light palette. So the dark is built
 * from `bg-ink` and the declared white-alpha ramp — `onink-body`, `onink-dim`,
 * `onink-faint`, `onink-rule`, `onink-tint` — and the app's own `surface`/`surface-subtle`
 * white alphas map onto `onink-tint` and `onink-selected`. `accent` is shared, and Jira's
 * blue stays Jira's.
 *
 * WHAT IS TRANSLATED AND WHAT IS NOT, which is not a style question here but a fidelity
 * one. The app translates its own chrome — "To do", "Reload", "Open on GitHub" — so those
 * go through the catalogue with the app's own sentences. It does NOT translate what a
 * tracker sends it: a Jira status is the word a site's own board column is called, a
 * priority is the site's own tier, a GitHub label is a string the repository chose. Those
 * are printed as they arrive, so they are literals here too, and a French reader sees
 * exactly what the French app would show them.
 *
 * Ticket titles ARE prose, so they are catalogue entries — invented ones, on an invented
 * project, which is why the numbers and keys below belong to no real repository.
 *
 * ON A GRADIENT PLATE, AND CROPPED AT THE BOTTOM BY IT. The window sits on `tone-sky`
 * rather than on the white page — a near-black panel dropped straight onto white reads as
 * a hole cut in the section — and it runs off the bottom of that plate rather than ending
 * inside it. A backlog runs down the page and the meaning of a row runs across it, so
 * cutting a side would take words while cutting the bottom takes the sixth ticket, which
 * is exactly the right thing to lose: the list is longer than the frame, and saying so
 * costs no frame.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and a chevron that cannot fold or a
 * search box that cannot be typed in should be announced to nobody.
 */

/**
 * Jira's mark, traced from `desktop/src/renderer/components/icons/TrackerIcons.tsx`.
 *
 * KEPT AS A VECTOR AND IN ITS OWN TWO BLUES rather than pointed at `/img/jira-logo.png`,
 * for that file's own reason: this is a brand mark, so it does not take the surrounding
 * ink, and the tile it sits on is Jira's blue at 14%. The PNG carries its own pale square
 * and would have drawn a tile inside a tile.
 *
 * `useId` for the gradient, and it is load-bearing rather than tidy: `url(#id)` resolves
 * against the WHOLE document, so a fixed id breaks the moment the mark is drawn twice and
 * the first copy unmounts.
 */
function JiraMark({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          x1="16.53"
          y1="7.95"
          x2="12.78"
          y2="11.7"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path
        fill="#2684FF"
        d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84z"
      />
      <path
        fill={`url(#${gradientId})`}
        d="M6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.8v1.72a4.362 4.362 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.83-.83z"
      />
      <path
        fill="#0052CC"
        d="M2 11.6c0 2.4 1.94 4.34 4.34 4.34h1.8v1.7c.003 2.4 1.95 4.342 4.35 4.35V12.43a.84.84 0 0 0-.84-.83z"
      />
    </svg>
  );
}

/** GitHub's mark, the knocked-out disc the app paints with `currentColor`. */
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.64-5.48 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.83.58A12 12 0 0 0 12 .3z" />
    </svg>
  );
}

/**
 * The tracker's mark on a tile of its own, at the app's `sm` size — `w-8 h-8 rounded-lg`
 * with a `w-4 h-4` mark inside it. Jira's ground is its brand blue at 14%, spelled as an
 * inline style there and here for the same reason: it is the BRAND's blue, not a token.
 * GitHub's mark is `currentColor`, so it takes the white this panel is drawn in.
 */
function TrackerTile({ tracker }: { tracker: "github" | "jira" }) {
  const jira = tracker === "jira";

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        jira ? "" : "bg-onink-selected text-white"
      }`}
      style={jira ? { backgroundColor: "rgba(38, 132, 255, 0.14)" } : undefined}
    >
      {jira ? (
        <JiraMark className="h-4 w-4" />
      ) : (
        <GithubMark className="h-4 w-4" />
      )}
    </span>
  );
}

/** The ticket's id, in `TicketBadge`'s accent tokens. */
function TicketBadge({ id }: { id: string }) {
  return (
    <span className="shrink-0 rounded bg-accent/20 px-2 py-0.5 text-xs text-accent-hover">
      {id}
    </span>
  );
}

/**
 * A label as the app draws one: `StatusPill`'s NEUTRAL branch.
 *
 * That component looks a label up in `STATUS_CONFIG` — the `/magic:*` workflow's own
 * statuses — and a repository's labels miss it, so every one of them renders in the
 * neutral tokens. Faithful, and worth the note: a "bug" label drawn in red here would be
 * a colour the app never gives it.
 */
function LabelPill({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-onink-tint px-2 py-0.5 text-xs text-onink-dim">
      {label}
    </span>
  );
}

/** The marker that says somebody is already on this ticket: a 8px accent dot and a word. */
function AgentMarker({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-onink-dim">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
      {label}
    </span>
  );
}

/** The row's two controls, in `RowLinks`' shared geometry — one height, one border. */
function RowLinks({ openLabel }: { openLabel: string }) {
  return (
    <>
      <span className="flex shrink-0 items-center rounded-lg border border-onink-rule px-2 py-1 text-onink-dim">
        <Link2 className="h-3.5 w-3.5" />
      </span>
      <span className="flex shrink-0 items-center gap-1 rounded-lg border border-onink-rule px-2 py-1 text-xs font-medium text-onink-dim">
        <ExternalLink className="h-3.5 w-3.5" />
        {openLabel}
      </span>
    </>
  );
}

/**
 * The three GitHub issues. An invented repository on an invented project, so the numbers
 * belong to nothing real.
 *
 * The numbers, the logins and the labels are LITERALS: a label is a string the repository
 * chose and a login is an account, and the app prints both exactly as GitHub sends them.
 * Only the titles are prose, so only the titles are catalogue keys.
 */
const GITHUB_ISSUES: readonly {
  number: string;
  title: MessageKey;
  author: string;
  labels: readonly string[];
  agent?: boolean;
}[] = [
  {
    number: "#412",
    title: "site.tasksCard.gh1",
    author: "lmartel",
    labels: ["bug", "payments"],
  },
  {
    number: "#409",
    title: "site.tasksCard.gh2",
    author: "nadia-b",
    labels: ["enhancement"],
    agent: true,
  },
  {
    number: "#404",
    title: "site.tasksCard.gh3",
    author: "lmartel",
    labels: ["bug"],
  },
];

/**
 * The three sprint tickets, with Jira's own three facts on each second line: where it is
 * up to, what it is part of, and how urgent it is — in the order a sprint row is scanned.
 *
 * `status`, `epic`, `priority` and `reporter` are LITERALS, and that is the faithful
 * choice rather than a shortcut. A Jira status is the word a site's own board column is
 * called, a priority is that site's own tier, an epic has a title somebody typed, and a
 * reporter is a person — the app prints all four as they arrive and translates none of
 * them, so a French reader sees exactly what the French app would show them.
 */
const JIRA_ISSUES: readonly {
  key: string;
  title: MessageKey;
  status: string;
  statusTone: string;
  epic: string;
  epicColor: string;
  priority?: string;
  reporter: string;
  agent?: boolean;
}[] = [
  {
    key: "PAY-318",
    title: "site.tasksCard.jira1",
    status: "In Progress",
    statusTone: "bg-accent/20 text-accent-hover",
    epic: "Checkout",
    epicColor: "#a855f7",
    priority: "Highest",
    reporter: "Camille Roux",
    agent: true,
  },
  {
    key: "PAY-311",
    title: "site.tasksCard.jira2",
    status: "To Do",
    statusTone: "bg-onink-tint text-onink-dim",
    epic: "Checkout",
    epicColor: "#a855f7",
    reporter: "Théo Vasseur",
  },
  {
    key: "PAY-307",
    title: "site.tasksCard.jira3",
    status: "To Do",
    statusTone: "bg-onink-tint text-onink-dim",
    epic: "Invoicing",
    epicColor: "#22c55e",
    priority: "Highest",
    reporter: "Camille Roux",
  },
];

/** `rowActivation`'s geometry, verbatim, minus the parts a drawing cannot have. */
const ROW =
  "flex items-center gap-3 border-t border-onink-rule py-2.5 pl-4 pr-4";

/** The card a tracker target's rows sit in. */
const CARD =
  "overflow-hidden rounded-lg border border-onink-rule bg-onink-tint";

/** The card header, and the two row buttons, share this box. */
const PILL =
  "rounded-lg border border-onink-rule px-2 py-1 text-xs font-medium";

/**
 * The four things this screen does that a still image of it cannot show.
 *
 * A LEGEND AND NOT A FEATURE LIST: every one of them annotates something visible in the
 * drawing above. The filter bar is drawn but its pickers cannot be opened; the priority
 * and the epic are on the rows but nothing says whose words they are; the list looks
 * complete and is in fact filtered; and the two cards look like one screen when they are
 * two different reads.
 *
 * Every claim is checked against the source rather than written from the feature's
 * reputation — `TaskFilters.tsx` for the four controls, `TasksRepoSection.tsx` for what a
 * row carries, and `renderer/utils/taskRows.ts` for the rule about what is listed at all.
 */
const LEGEND: readonly {
  id: string;
  icon: typeof Search;
  name: MessageKey;
  description: MessageKey;
}[] = [
  {
    id: "filters",
    icon: SlidersHorizontal,
    name: "site.tasksCard.legendFiltersTitle",
    description: "site.tasksCard.legendFiltersDesc",
  },
  {
    id: "fields",
    icon: ChevronsUp,
    name: "site.tasksCard.legendFieldsTitle",
    description: "site.tasksCard.legendFieldsDesc",
  },
  {
    // THE ONE WORTH READING TWICE, and the reason it is here at all: the list is not the
    // sprint. `taskRows.ts` says it outright — "listing all of it on a page whose one
    // affirmative action is start an agent would offer to duplicate work already under
    // way" — so an In Progress ticket appears only when an agent is on it, marked.
    id: "available",
    icon: Hand,
    name: "site.tasksCard.legendAvailableTitle",
    description: "site.tasksCard.legendAvailableDesc",
  },
  {
    id: "trackers",
    icon: Layers,
    name: "site.tasksCard.legendTrackersTitle",
    description: "site.tasksCard.legendTrackersDesc",
  },
];

export function TasksModalMockup() {
  const { t } = useT();

  return (
    <div className="flex flex-col">
      {/* THE PLATE THE WINDOW SITS ON. A declared tone rather than the white page,
          because a near-black window dropped straight onto white reads as a hole cut in
          the section; on a coloured ground it reads as a screen photographed on a desk,
          which is what it is.

          `pb-0` AND A NEGATIVE MARGIN BELOW: the window runs 48px past the bottom of the
          plate and the plate's `overflow-hidden` cuts it. That is the same bottom crop
          the panels in the skills grid take, moved out to the frame — a list that ends
          inside its own picture is a list you have seen all of, and a backlog is never
          that. */}
      <div
        aria-hidden
        className="overflow-hidden rounded-2xl bg-tone-indigo p-5 pb-0 sm:p-12 sm:pb-0"
      >
        {/* The modal. `bg-ink` is this site's stand-in for the app's darkest ground, and
          `shadow-lift` — the scale's loudest rung — is what lifts it off the plate. */}
        <div className="-mb-12 overflow-hidden rounded-2xl border border-onink-rule bg-ink shadow-lift">
          {/* THE CHROME: `px-4 h-12 border-b`, title left, close right. */}
          <div className="flex h-12 items-center justify-between border-b border-onink-rule px-4">
            <span className="text-sm font-semibold text-white">
              {t("site.tasksCard.title")}
            </span>
            <span className="p-1.5 text-onink-dim">
              <X className="h-4 w-4" />
            </span>
          </div>

          <div className="flex flex-col gap-3 px-6 pb-6 pt-6">
            {/* THE SECTION LINE. */}
            <div className="flex items-center gap-2 text-sm text-onink-body">
              <ListTodo className="h-4 w-4" />
              <span>{t("site.tasksCard.section")}</span>
              <span className="ml-auto flex items-center gap-3">
                <span className="text-xs text-onink-faint">
                  {t("site.tasksCard.total")}
                </span>
                <span
                  className={`flex items-center gap-1 text-onink-dim ${PILL}`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("site.tasksCard.reload")}
                </span>
              </span>
            </div>

            {/* THE FILTER BAR: the box takes the width, the pickers keep their declared
              176px and 152px. */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-onink-faint" />
                <div className="w-full rounded-lg border border-onink-rule bg-onink-tint py-1.5 pl-9 pr-3 text-xs text-onink-faint">
                  {t("site.tasksCard.search")}
                </div>
              </div>
              <div className="flex w-[176px] shrink-0 items-center gap-2 rounded-lg border border-onink-rule bg-onink-tint px-3 py-1.5 text-xs text-white">
                <span className="truncate">{t("site.tasksCard.allRepos")}</span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-onink-dim" />
              </div>
              <div className="flex w-[152px] shrink-0 items-center gap-2 rounded-lg border border-onink-rule bg-onink-tint px-3 py-1.5 text-xs text-white">
                <span className="truncate">
                  {t("site.tasksCard.sortRecent")}
                </span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-onink-dim" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {/* ── The GitHub card ─────────────────────────────────────────────── */}
              <div className={CARD}>
                <div className="flex w-full items-center gap-3 px-4 py-3">
                  <ChevronDown className="h-4 w-4 shrink-0 text-onink-dim" />
                  <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: "#6366f1" }}
                      />
                      <span className="truncate text-sm font-medium text-white">
                        acme/checkout-api
                      </span>
                    </span>
                    {/* The tracker's name, only ever printed when a repository has a card
                      for each — untranslated in the app on purpose, because "GitHub" and
                      "Jira" are product names. */}
                    <span className="shrink-0 text-xs text-onink-faint">
                      · GitHub
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-onink-dim">
                    {t("site.tasksCard.countGithub")}
                  </span>
                </div>

                {GITHUB_ISSUES.map((issue) => (
                  <div key={issue.number} className={ROW}>
                    <TrackerTile tracker="github" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <TicketBadge id={issue.number} />
                        <span className="truncate text-sm text-white">
                          {t(issue.title)}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-xs text-onink-dim">
                          @{issue.author}
                        </span>
                        {issue.labels.map((label) => (
                          <LabelPill key={label} label={label} />
                        ))}
                      </div>
                    </div>
                    {issue.agent && (
                      <AgentMarker label={t("site.tasksCard.agent")} />
                    )}
                    <RowLinks openLabel={t("site.tasksCard.openGithub")} />
                  </div>
                ))}
              </div>

              {/* ── The Jira card ───────────────────────────────────────────────── */}
              <div className={CARD}>
                <div className="flex w-full items-center gap-3 px-4 py-3">
                  <ChevronDown className="h-4 w-4 shrink-0 text-onink-dim" />
                  <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: "#22c55e" }}
                      />
                      <span className="truncate text-sm font-medium text-white">
                        acme/billing-web
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-onink-faint">
                      · Jira
                    </span>
                    {/* WHICH sprint these rows are — the other half of a Jira card's
                      title, and only ever the name Jira itself gave the sprint. */}
                    <span className="truncate text-xs text-onink-faint">
                      · PAY Sprint 24
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-onink-dim">
                    {t("site.tasksCard.countJira")}
                  </span>
                </div>

                {JIRA_ISSUES.map((issue) => (
                  <div key={issue.key} className={ROW}>
                    <TrackerTile tracker="jira" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <TicketBadge id={issue.key} />
                        <span className="truncate text-sm text-white">
                          {t(issue.title)}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${issue.statusTone}`}
                        >
                          {issue.status}
                        </span>
                        {/* The epic: a neutral pill with the colour spent entirely on the
                          dot, because the status and the priority either side of it are
                          coloured to be read as a scale and an epic is neither a state
                          nor a degree. */}
                        <span className="inline-flex max-w-[14rem] shrink-0 items-center gap-1.5 rounded-full bg-onink-tint px-2 py-0.5 text-xs text-onink-dim">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: issue.epicColor }}
                          />
                          <span className="truncate">{issue.epic}</span>
                        </span>
                        {/* The priority leads with an ARROW, which is Jira's own vocabulary
                          and not an invention: a direction survives being skimmed down a
                          column in a way a word never does. */}
                        {issue.priority && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red/20 py-0.5 pl-1 pr-2 text-xs text-red">
                            <ChevronsUp className="h-3.5 w-3.5 shrink-0" />
                            {issue.priority}
                          </span>
                        )}
                        {/* The display name bare, where the GitHub row prefixes a login
                          with `@`: "Camille Roux" is a name and not a handle. */}
                        <span className="max-w-[16rem] truncate text-xs text-onink-dim">
                          {issue.reporter}
                        </span>
                      </div>
                    </div>
                    {issue.agent && (
                      <AgentMarker label={t("site.tasksCard.agent")} />
                    )}
                    <RowLinks openLabel={t("site.tasksCard.openJira")} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── THE LEGEND, UNDER THE DRAWING ──────────────────────────────────────
          Four things this screen does that a still image of it cannot: the pickers open,
          the fields on a row belong to your board rather than to us, the list is filtered
          before you see it, and the two cards are two different reads. `FeatureLegend` is
          the same one the Agents drawing uses further down — one closed box, no gutters,
          because these annotate the picture rather than standing on their own. */}
      <FeatureLegend
        items={LEGEND.map((entry) => ({
          id: entry.id,
          mark: (
            <LegendTile tone="bg-accent/10 text-accent">
              <entry.icon className="h-4 w-4" />
            </LegendTile>
          ),
          name: entry.name,
          description: entry.description,
        }))}
      />
    </div>
  );
}
