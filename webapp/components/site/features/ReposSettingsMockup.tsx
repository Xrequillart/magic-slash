"use client";

import {
  AlertTriangle,
  AppWindow,
  Bell,
  Building2,
  ChevronRight,
  CircleUserRound,
  FolderGit2,
  Info,
  Keyboard,
  Languages,
  Lock,
  LogOut,
  Palette,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  SquareTerminal,
  Users,
  X,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useLanguage";
import { FeatureLegend, LegendTile } from "./FeatureLegend";
import { GithubMark } from "./TasksModalMockup";

/**
 * The visual under the `multiRepo` row: the app's Settings modal open on its
 * Repositories tab, redrawn IN DARK — the same treatment `TasksModalMockup` gives the
 * Tasks screen, and for the same row shape: a heading, a paragraph, the screen under it.
 *
 * DRAWN FROM THE REAL SCREEN, class for class — `desktop/src/renderer/components/
 * PageModal.tsx` for the chrome, `pages/Config/index.tsx` for the rail, the account
 * footer and the list, `pages/Config/SectionHeader.tsx` for the section line. Every
 * measurement below is that source's:
 *
 *   1. THE MODAL. `rounded-2xl` inside `border`, a header at exactly `px-4 h-12 border-b`
 *      with the title at `text-sm font-semibold` and the close button at `p-1.5`.
 *   2. THE RAIL. `w-56 shrink-0 flex flex-col border-r` on the sunken ground, a nav at
 *      `px-2 pt-3 space-y-0.5` of eleven tabs — `SETTINGS_TABS`, in its order, each
 *      `gap-2.5 px-3 py-2 text-sm font-medium rounded-lg` with a `w-4` glyph; the live one
 *      on `bg-accent/15`. Under Repositories, `RepoRailItems` unfolds: `ml-[19px] pl-3
 *      border-l`, one `text-[13px]` row per repo with a `w-3` folder in the repo's colour.
 *      The footer is `SettingsAccountFooter`: `mt-auto border-t p-2`, the initial on a
 *      `w-5 h-5` accent disc, then Sign out.
 *   3. THE CONTENT. `p-6`, a `max-w-4xl` column at `gap-6`; `SectionHeader` is a `h-5` line
 *      — `w-4` glyph, `text-sm` title — with the Add button in the row-button recipe
 *      (`gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg`) on its right.
 *   4. THE GROUPS. One heading per owner at `text-[11px] uppercase tracking-wider`, a `w-3`
 *      Lock for Personal and a `w-3` Building2 for each organization, the count after it
 *      at a lower alpha; rows at `space-y-2`.
 *   5. THE ROWS. `renderRepoRow` verbatim — `gap-3 px-4 py-3 border rounded-xl`, the
 *      `w-8 h-8 rounded-lg` tile tinted with the repo's own colour at 12%, the name at
 *      `font-medium`, the GitHub badge at `text-[10px]` with a `w-2.5` mark, the path at
 *      `text-xs` under it, the agent count as an accent pill and a `w-4` chevron.
 *
 * WHAT THE DRAWING ARGUES is the row's own sentence: one GitHub repository is one
 * configuration, and the organization owns it. So the list is drawn with BOTH sections
 * the app shows — a personal repository under a lock, and the organization's three under
 * its name — and one of the three is a colleague's repository this machine has not bound
 * to a folder yet, in the app's own yellow. That row is the inheritance made visible:
 * the configuration arrived with the team before the clone did.
 *
 * IN DARK, on the same trade every window on this page makes: the app runs its theme off
 * CSS variables and every theme it ships is dark, the site has one light palette. So the
 * app's `bg-secondary` is `bg-ink`, its `surface` and `surface-sunken-soft` are
 * `onink-tint`, every `line-*` is `onink-rule`, `text-secondary` is `onink-dim` and its
 * `/50` is `onink-faint`. `accent`, `green` and `yellow` are shared tokens and keep their
 * meaning.
 *
 * WHAT IS TRANSLATED AND WHAT IS NOT. The app translates its own chrome — the tab
 * labels, "Personal", "Connected", "Add repository" — so those go through the catalogue
 * with the app's own sentences from `desktop/src/i18n/`. Repository names, an
 * organization's name, a path and a first name are data the app prints as it finds
 * them, so they are literals here.
 *
 * NOT CROPPED, unlike the Tasks window beside it. A backlog runs off the bottom of its
 * frame because it is longer than any frame; a list of four repositories is not, and the
 * rail's footer — the account the settings belong to — is part of what the drawing says.
 *
 * `aria-hidden`, and the whole panel: a tab that cannot be clicked should be announced
 * to nobody.
 */

/** `SETTINGS_TABS`, in the app's order, each with the glyph the app gives it. */
const TABS: readonly { id: string; label: MessageKey; icon: typeof Plug }[] = [
  { id: "account", label: "site.reposCard.tabAccount", icon: CircleUserRound },
  { id: "connections", label: "site.reposCard.tabConnections", icon: Plug },
  { id: "organization", label: "site.reposCard.tabOrganization", icon: Building2 },
  { id: "repositories", label: "site.reposCard.tabRepositories", icon: FolderGit2 },
  { id: "application", label: "site.reposCard.tabApplication", icon: AppWindow },
  { id: "claude-code", label: "site.reposCard.tabClaudeCode", icon: SquareTerminal },
  { id: "notifications", label: "site.reposCard.tabNotifications", icon: Bell },
  { id: "appearance", label: "site.reposCard.tabAppearance", icon: Palette },
  { id: "language", label: "site.reposCard.tabLanguage", icon: Languages },
  { id: "shortcuts", label: "site.reposCard.tabShortcuts", icon: Keyboard },
  { id: "about", label: "site.reposCard.tabAbout", icon: Info },
];

/**
 * The four repositories, on an invented organization. Names, paths and colours are what
 * the app reads from its config and prints as they are, so they are literals; the colour
 * is the project colour `getProjectColorMap` assigns, used everywhere the repo appears.
 *
 * `agents` and `unbound` are the two facts a row can carry beyond its name: how many
 * agents are on it right now, and whether this machine has a folder for it at all.
 */
type Repo = {
  name: string;
  path?: string;
  color: string;
  agents?: number;
};

const PERSONAL_REPOS: readonly Repo[] = [
  { name: "side-project", path: "~/Code/side-project", color: "#ec4899" },
];

const ORG_REPOS: readonly Repo[] = [
  { name: "checkout-api", path: "~/Code/acme/checkout-api", color: "#6366f1", agents: 2 },
  { name: "billing-web", path: "~/Code/acme/billing-web", color: "#22c55e", agents: 1 },
  // A colleague's repository, shared with the organization and not yet cloned here:
  // the configuration is already on this machine, the folder is not.
  { name: "mobile-app", color: "#f59e0b" },
];

/** `renderRepoRow`'s geometry, verbatim, minus the hover states a drawing cannot have. */
const ROW =
  "flex items-center gap-3 rounded-xl border border-onink-rule bg-onink-tint px-4 py-3";

/** The group heading: `text-[11px] uppercase tracking-wider`, a `w-3` glyph, the count. */
const GROUP_HEADING =
  "mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-onink-dim";

/**
 * The four things the screen says that a still image of it cannot.
 *
 * A LEGEND AND NOT A FEATURE LIST, as under the Tasks drawing: every one of these points
 * at something visible above — the organization heading, the row with no folder, the
 * Add button, the settings behind each row. Checked against `pages/Config/index.tsx` and
 * `RepoPage.tsx` rather than written from the feature's reputation.
 */
const LEGEND: readonly {
  id: string;
  icon: typeof Plug;
  name: MessageKey;
  description: MessageKey;
}[] = [
  {
    id: "oneConfig",
    icon: FolderGit2,
    name: "site.reposCard.legendOneConfigTitle",
    description: "site.reposCard.legendOneConfigDesc",
  },
  {
    id: "admin",
    icon: ShieldCheck,
    name: "site.reposCard.legendAdminTitle",
    description: "site.reposCard.legendAdminDesc",
  },
  {
    id: "inherit",
    icon: Users,
    name: "site.reposCard.legendInheritTitle",
    description: "site.reposCard.legendInheritDesc",
  },
  {
    id: "skills",
    icon: RefreshCw,
    name: "site.reposCard.legendSkillsTitle",
    description: "site.reposCard.legendSkillsDesc",
  },
];

function RepoRow({ repo }: { repo: Repo }) {
  const { t } = useT();
  const unbound = !repo.path;

  return (
    <div className={ROW}>
      {/* The repository tile: the repo's colour tints both the glyph and its backdrop,
          `1f` being the app's own 12% alpha suffix. */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${repo.color}1f`, color: repo.color }}
      >
        <FolderGit2 className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{repo.name}</span>
          {/* The GitHub badge — only meaningful once a local folder is bound, so the
              unbound row has none, exactly as in the app. */}
          {!unbound && (
            <span className="flex items-center gap-1 rounded bg-green/10 px-1.5 py-0.5 text-[10px] font-medium text-green">
              <GithubMark className="h-2.5 w-2.5" />
              {t("site.reposCard.connected")}
            </span>
          )}
        </div>
        {unbound ? (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-yellow">
            <AlertTriangle className="h-3 w-3" />
            {t("site.reposCard.noLocalFolder")}
          </span>
        ) : (
          <div className="mt-0.5 truncate text-xs text-onink-faint">{repo.path}</div>
        )}
      </div>

      {repo.agents ? (
        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
          {t(repo.agents > 1 ? "site.reposCard.agents.other" : "site.reposCard.agents.one")}
        </span>
      ) : null}

      <ChevronRight className="h-4 w-4 shrink-0 text-onink-faint" />
    </div>
  );
}

export function ReposSettingsMockup() {
  const { t } = useT();
  const railRepos = [...PERSONAL_REPOS, ...ORG_REPOS];

  return (
    <div className="flex flex-col">
      {/* THE PLATE THE WINDOW SITS ON — see `TasksModalMockup` for why a dark window
          wants a coloured ground rather than the white page. `tone-sky` rather than that
          drawing's `tone-indigo`, so two windows a few screens apart do not read as the
          same photograph. */}
      <div
        aria-hidden
        className="overflow-hidden rounded-2xl bg-tone-sky p-5 sm:p-12"
      >
        <div className="overflow-hidden rounded-2xl border border-onink-rule bg-ink shadow-lift">
          {/* THE CHROME: `px-4 h-12 border-b`, title left, close right. */}
          <div className="flex h-12 items-center justify-between border-b border-onink-rule px-4">
            <span className="text-sm font-semibold text-white">
              {t("site.reposCard.title")}
            </span>
            <span className="p-1.5 text-onink-dim">
              <X className="h-4 w-4" />
            </span>
          </div>

          <div className="flex">
            {/* THE RAIL. Hidden below `md`: at a phone's width the 224px column would
                take more than half the frame and leave the list — the thing the row is
                about — set in a strip. */}
            <div className="hidden w-56 shrink-0 flex-col border-r border-onink-rule bg-onink-tint md:flex">
              <nav className="flex-1 space-y-0.5 px-2 pt-3">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.id === "repositories";
                  return (
                    <div key={tab.id}>
                      <div
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                          isActive ? "bg-accent/15 text-white" : "text-onink-dim"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t(tab.label)}</span>
                      </div>
                      {/* `RepoRailItems`, unfolded under the live tab: personal first,
                          then the organization's, in the order the page reads. */}
                      {isActive && (
                        <div className="ml-[19px] space-y-0.5 border-l border-onink-rule py-0.5 pl-3">
                          {railRepos.map((repo) => (
                            <div
                              key={repo.name}
                              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-onink-dim"
                            >
                              <FolderGit2
                                className="h-3 w-3 shrink-0"
                                style={{ color: repo.color }}
                              />
                              <span className="truncate">{repo.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* `SettingsAccountFooter`: whose settings these are. */}
              <div className="mt-auto space-y-1 border-t border-onink-rule p-2">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-onink-dim">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-semibold text-accent">
                    C
                  </span>
                  <span className="truncate">Camille</span>
                </div>
                <div className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-onink-dim">
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t("site.reposCard.signOut")}</span>
                </div>
              </div>
            </div>

            {/* THE CONTENT. */}
            <div className="min-w-0 flex-1 p-6">
              <div className="flex max-w-4xl flex-col gap-6">
                <div>
                  {/* `SectionHeader`: pinned to `h-5`, the action overflowing the line. */}
                  <div className="mb-4 flex h-5 items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-onink-body">
                      <FolderGit2 className="h-4 w-4" />
                      <span>{t("site.reposCard.section")}</span>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-lg border border-onink-rule bg-onink-tint px-2.5 py-1.5 text-xs font-medium text-onink-dim">
                      <Plus className="h-3 w-3" />
                      <span>{t("site.reposCard.add")}</span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Personal */}
                    <div>
                      <div className={GROUP_HEADING}>
                        <Lock className="h-3 w-3" />
                        <span>{t("site.reposCard.personal")}</span>
                        <span className="text-onink-faint">{PERSONAL_REPOS.length}</span>
                      </div>
                      <div className="space-y-2">
                        {PERSONAL_REPOS.map((repo) => (
                          <RepoRow key={repo.name} repo={repo} />
                        ))}
                      </div>
                    </div>

                    {/* One section per organization — the name is the organization's
                        own, printed as the app finds it. */}
                    <div>
                      <div className={GROUP_HEADING}>
                        <Building2 className="h-3 w-3" />
                        <span>Acme</span>
                        <span className="text-onink-faint">{ORG_REPOS.length}</span>
                      </div>
                      <div className="space-y-2">
                        {ORG_REPOS.map((repo) => (
                          <RepoRow key={repo.name} repo={repo} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── THE LEGEND, UNDER THE DRAWING ──────────────────────────────────────
          The four claims the row makes, each pointing at a part of the screen above:
          one configuration per repository, owned by the organization's admin, inherited
          by whoever joins, and followed by every skill. */}
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
