"use client";

import {
  Activity,
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  KeyRound,
  Languages,
  Link2,
  Lock,
  MessageSquare,
  Settings2,
  Ticket,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n/useLanguage";
import { FeatureLegend, LegendTile } from "./FeatureLegend";

/**
 * The two visuals of the configuration family that draw a REPOSITORY'S SETTINGS PAGE:
 * `CommitConfigMockup` under "The commit format you use", open on the Commit tab, and
 * `PRConfigMockup` under the pull request row, open on the Pull Request tab. One file,
 * because the two are the same page with a different tab lit, and the frame around the
 * tab — the header, the strip, the group boxes, the rows — is what a reader recognises
 * as "the settings" before reading a word of either.
 *
 * DRAWN FROM THE REAL SCREEN, class for class — `desktop/src/renderer/pages/Config/
 * RepoPage.tsx` for everything, `components/TabStrip.tsx` for the strip, `components/
 * Switch.tsx` for the toggles and `theme/controls.ts` for the field recipes:
 *
 *   1. THE HEADER. A `p-1.5` back arrow, the repository's tile at page scale (`w-10 h-10
 *      rounded-xl`, its colour at 12% behind a `w-5` folder), the name at `text-2xl
 *      font-semibold`, and the subtitle at `text-sm` under the row.
 *   2. THE STRIP. `TabStrip`: `inline-flex gap-1 rounded-full p-1` on the subtle ground,
 *      eight pills at `gap-2 px-3.5 py-1.5 text-xs font-medium` with a `w-3.5` glyph each,
 *      the live one on the strong surface. `REPO_TABS`' order and icons, exactly.
 *   3. THE SKILL INTRO. `SkillIntro`: `gap-3 px-4 py-3.5 rounded-xl` on the subtle ground,
 *      the tab's `w-4` glyph, the command as a `text-xs font-mono px-1.5 py-0.5` chip, the
 *      lead at `text-xs`, the numbered steps at `text-[11px]` and the `+` tail under them
 *      at the same size one alpha lower.
 *   4. THE GROUPS. An `h2` at `text-xs uppercase tracking-wider mb-4`, then a `fieldset` at
 *      `rounded-xl px-4` with a border, holding the rows.
 *   5. THE ROWS. `SettingRow`'s geometry — `flex justify-between gap-6 py-4 border-b` and
 *      no border on the last — the label at `text-sm font-medium mb-0.5`, the help at
 *      `text-xs`, and on the right either `SELECT` at `w-52` with its `right-2.5` chevron,
 *      `INPUT` at `w-72`, or the `Switch`: `w-10 h-[22px] rounded-full`, knob `w-4 h-4`
 *      at `top-[3px] left-[3px]`, translated `18px` when on.
 *   6. THE EXAMPLE. Inside the message group: `my-4 p-3 rounded-lg`, a `text-[10px]
 *      uppercase` caption, then the message in a `text-sm` `pre` — built by the app's own
 *      `generateCommitExample`, whose strings are copied verbatim.
 *
 * WHAT IS DRAWN IN EACH. The commit tab shows the settings that decide what a message
 * looks like — Conventional, single line, co-author on, ticket id on — and the one rule
 * about which branch it may land on, with the intro narrating those exact choices, the
 * way the app composes it from `utils/skillSummary`. The PR tab shows the description
 * settings — tickets auto-linked, test accounts by reference with a source file, a
 * template found in the repository — and the two that run once the PR is open. Every
 * value shown is a value the app offers, in the app's own words.
 *
 * THE ONE LIBERTY: the template textarea is `h-64` in the app and a `h-28` here, with
 * four lines of a template in it. A quarter-screen of empty field is a fact about the
 * app that says nothing in a drawing, and the two rows under it — the ticket comment
 * and the CI watch — are half of what this tab is about.
 *
 * IN DARK, on the trade every window on this page makes (see `TasksModalMockup`): the
 * app's `surface`, `surface-subtle` and `surface-strong` are `onink-tint` and
 * `onink-selected`, every `line-*` is `onink-rule`, `text-secondary` is `onink-dim` and
 * its `/50` and `/40` are `onink-faint`. `accent`, `green` and `yellow` are shared.
 *
 * WHAT IS TRANSLATED AND WHAT IS NOT. Labels, help lines and the intro's sentences are
 * the app's own from `desktop/src/i18n/`, so they go through the catalogue. The command,
 * the format names, the example message, the paths and the tab labels French borrows
 * whole — "Repository", "Tickets", "Commit", "Pull Request", "Resolve" — are literals,
 * for the reason `LITERAL_TITLES` gives in `lib/features.ts`: an en/fr pair identical on
 * purpose costs a line in `i18n.test.ts` and buys nothing.
 *
 * `aria-hidden`, and the whole panel: a select that cannot be opened and a switch that
 * cannot be flipped should be announced to nobody.
 */

/**
 * `REPO_TABS`, in the app's order, each with the glyph the app gives it. A label is a
 * catalogue key where the two languages differ and a literal where they do not — see
 * the note above.
 */
const TABS: readonly {
  id: string;
  label: MessageKey | { literal: string };
  icon: typeof Settings2;
}[] = [
  { id: "general", label: "site.repoPage.tabGeneral", icon: Settings2 },
  { id: "repository", label: { literal: "Repository" }, icon: GitBranch },
  { id: "tickets", label: { literal: "Tickets" }, icon: Ticket },
  { id: "languages", label: "site.repoPage.tabLanguages", icon: Languages },
  { id: "plan", label: "site.repoPage.tabPlan", icon: ClipboardList },
  { id: "commit", label: { literal: "Commit" }, icon: GitCommitHorizontal },
  { id: "pr", label: { literal: "Pull Request" }, icon: GitPullRequest },
  { id: "resolve", label: { literal: "Resolve" }, icon: MessageSquare },
];

/** The repository the two drawings are of — the same one the Tasks drawing lists. */
const REPO = { name: "checkout-api", color: "#6366f1" };

/** `SettingRow`'s geometry, verbatim. `items-center` for a switch, `items-start` otherwise. */
const ROW_START =
  "flex items-start justify-between gap-6 border-b border-onink-rule py-4 last:border-b-0";
const ROW_CENTER =
  "flex items-center justify-between gap-6 border-b border-onink-rule py-4 last:border-b-0";

/** `SELECT` from `theme/controls.ts`, at the `w-52` every enum on this page takes. */
const SELECT =
  "w-52 rounded-lg border border-onink-rule bg-onink-tint px-3 py-1.5 pr-9 text-xs text-white";

/** `INPUT`, at the `w-72` the test-accounts source takes. */
const INPUT =
  "w-72 rounded-lg border border-onink-rule bg-onink-tint px-3 py-1.5 text-xs text-white";

/** A group: the app's `h2` and the bordered `fieldset` under it. */
function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h2 className="mb-4 text-xs uppercase tracking-wider text-onink-faint">{title}</h2>
      <div className="w-full min-w-0 rounded-xl border border-onink-rule bg-onink-tint px-4">
        {children}
      </div>
    </div>
  );
}

/** The label-plus-help half of a row. The padlock is `SettingRow`'s `icon` slot. */
function Field({
  label,
  help,
  lock,
  warn,
}: {
  label: ReactNode;
  help: ReactNode;
  lock?: boolean;
  warn?: ReactNode;
}) {
  return (
    <div className="flex-1">
      <span className="mb-0.5 flex items-center gap-1.5 text-sm font-medium text-white">
        {lock && <Lock className="h-3.5 w-3.5 shrink-0 text-onink-faint" />}
        {label}
      </span>
      <p className="text-xs text-onink-faint">{help}</p>
      {warn ? <p className="mt-1 text-xs text-yellow">{warn}</p> : null}
    </div>
  );
}

/** `EnumSelect`'s box and chevron, closed on its value. */
function Select({ value }: { value: ReactNode }) {
  return (
    <div className="relative shrink-0">
      <div className={SELECT}>
        <span className="block truncate">{value}</span>
      </div>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-onink-dim" />
    </div>
  );
}

/** The app's `Switch`, in the on position. */
function Toggle({ on = true }: { on?: boolean }) {
  return (
    <span
      className={`relative h-[22px] w-10 shrink-0 rounded-full ${on ? "bg-accent" : "bg-onink-selected"}`}
    >
      <span
        className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white ${
          on ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </span>
  );
}

/** `SkillIntro`: the command, its lead, the numbered steps, the `+` tail. */
function SkillIntro({
  icon: Icon,
  command,
  lead,
  steps,
  tail,
}: {
  icon: typeof Settings2;
  command: string;
  lead: MessageKey;
  steps: readonly MessageKey[];
  tail?: readonly MessageKey[];
}) {
  const { t } = useT();
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-onink-rule bg-onink-tint px-4 py-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-onink-faint" />
      <div className="min-w-0">
        <code className="inline-block rounded bg-onink-selected px-1.5 py-0.5 font-mono text-xs text-white">
          {command}
        </code>
        <p className="mt-1.5 text-xs text-onink-dim">{t(lead)}</p>
        <ol className="mt-2 space-y-1">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2 text-[11px] text-onink-body">
              <span className="shrink-0 tabular-nums text-onink-faint">{index + 1}.</span>
              <span>{t(step)}</span>
            </li>
          ))}
        </ol>
        {tail && tail.length > 0 ? (
          <p className="mt-2 text-[11px] text-onink-faint">
            + {tail.map((flag) => t(flag)).join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The page around a tab: the plate, the window, the header, the strip. `tone` is the
 * plate under it — the two tabs sit on two different grounds so that two drawings of
 * one page a few rows apart do not read as a repeat.
 */
function RepoPageFrame({
  active,
  tone,
  children,
}: {
  active: "commit" | "pr";
  tone: "bg-tone-mist" | "bg-tone-sky";
  children: ReactNode;
}) {
  const { t } = useT();
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  // SCROLLED TO THE LIVE TAB. Eight pills outrun this frame, and a strip that starts at
  // its left edge hides the very tab the drawing is about when that tab is the seventh.
  // The app, having just been clicked there, shows it; so does this — the pill is
  // centred in the box on mount, and again whenever the labels change language. Set
  // on the scroll box rather than through `scrollIntoView`, which would also scroll
  // the PAGE to the drawing.
  useEffect(() => {
    const box = stripRef.current;
    const pill = activeRef.current;
    if (!box || !pill) return;
    box.scrollLeft = pill.offsetLeft - (box.clientWidth - pill.offsetWidth) / 2;
  }, [t]);

  return (
    <div aria-hidden className={`overflow-hidden rounded-2xl ${tone} p-5 sm:p-12`}>
      {/* The settings content pane — `p-6`, the rail and the modal chrome left out of
          frame: this drawing is about the page, and the Repositories drawing above it
          has already shown where the page lives. */}
      <div className="overflow-hidden rounded-2xl border border-onink-rule bg-ink p-6 shadow-lift">
        {/* THE HEADER. */}
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-3">
            <span className="p-1.5 text-onink-dim">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${REPO.color}1f`, color: REPO.color }}
            >
              <FolderGit2 className="h-5 w-5" />
            </span>
            <span className="text-2xl font-semibold text-white">{REPO.name}</span>
          </div>
          <p className="text-sm text-onink-dim">{t("site.repoPage.subtitle")}</p>
        </div>

        {/* THE STRIP. `TabStrip`'s own box, verbatim: the rounded, bordered pill row IS
            the scroll box — `inline-flex max-w-full overflow-x-auto rounded-full p-1` —
            so eight pills survive a narrow frame by sliding inside a frame that stays
            put, exactly as they do in the app. Splitting the two (a plain scroller
            around a bordered row) had the border travelling with the pills, and the
            strip read as a band cut off at both ends. Scrolled to the live pill by the
            effect above. */}
        <div className="mb-6">
          <div
            ref={stripRef}
            className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-onink-rule bg-onink-tint p-1 [scrollbar-width:none]"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === active;
              const label =
                typeof tab.label === "string" ? t(tab.label) : tab.label.literal;
              return (
                <span
                  key={tab.id}
                  ref={isActive ? activeRef : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium ${
                    isActive ? "bg-onink-selected text-white" : "text-onink-dim"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

// ─── Commit ──────────────────────────────────────────────────────────────────────────

/**
 * The four formats, as the table under the drawing lists them. The names are the
 * conventions' own and the same in every language; the shapes and the examples are
 * `generateCommitExample`'s, with its `add user authentication` subject — the table
 * and the example in the drawing above it should agree.
 */
const FORMATS: readonly {
  name: MessageKey | { literal: string };
  shape: MessageKey | { literal: string };
  example: string;
}[] = [
  { name: { literal: "Conventional" }, shape: { literal: "type: description" }, example: "feat: add user authentication" },
  { name: { literal: "Angular" }, shape: { literal: "type(scope): description" }, example: "feat(auth): add user authentication" },
  { name: { literal: "Gitmoji" }, shape: { literal: "emoji description" }, example: "✨ add user authentication" },
  { name: "site.commitCfg.formatNoneName", shape: "site.commitCfg.formatNoneShape", example: "Add user authentication" },
];

export function CommitConfigMockup() {
  const { t } = useT();
  const cell = (value: MessageKey | { literal: string }) =>
    typeof value === "string" ? t(value) : value.literal;

  return (
    <div className="flex flex-col">
      <RepoPageFrame active="commit" tone="bg-tone-mist">
        <SkillIntro
          icon={GitCommitHorizontal}
          command="/magic:commit"
          lead="site.commitCfg.intro"
          steps={[
            "site.commitCfg.stepAtomic",
            "site.commitCfg.stepFormat",
            "site.commitCfg.stepStyle",
            "site.commitCfg.stepProtected",
          ]}
          tail={["site.commitCfg.tailCoAuthor", "site.commitCfg.tailTicketId"]}
        />

        {/* "Message" — the same word in both languages, hence the literal. */}
        <Group title="Message">
          <div className={ROW_START}>
            <Field label="Style" help={t("site.commitCfg.styleHelp")} />
            <Select value={t("site.commitCfg.styleSingle")} />
          </div>
          <div className={ROW_START}>
            <Field label="Format" help={t("site.commitCfg.formatHelp")} />
            <Select value={t("site.commitCfg.formatConventional")} />
          </div>
          <div className={ROW_CENTER}>
            <Field label={t("site.commitCfg.coAuthor")} help={t("site.commitCfg.coAuthorHelp")} />
            <Toggle />
          </div>
          <div className={ROW_CENTER}>
            <Field label={t("site.commitCfg.ticketId")} help={t("site.commitCfg.ticketIdHelp")} />
            <Toggle />
          </div>
          {/* The preview, inside the group it previews. `generateCommitExample` for
              conventional + single-line + ticket id, verbatim. */}
          <div className="my-4 rounded-lg border border-onink-rule bg-onink-tint p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-onink-faint">
              {t("site.commitCfg.example")}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm text-onink-body">
              feat: add user authentication [PROJ-123]
            </pre>
          </div>
        </Group>

        {/* "Branches" — the same word in both languages too. */}
        <Group title="Branches">
          <div className={ROW_CENTER}>
            <Field
              lock
              label={t("site.commitCfg.protectedBranch")}
              help={t("site.commitCfg.protectedBranchHelp")}
            />
            <Toggle on={false} />
          </div>
        </Group>
      </RepoPageFrame>

      {/* ── THE FORMATS, UNDER THE DRAWING ──────────────────────────────────────
          The select in the drawing is closed on one value; this is what the other three
          look like. A table and not a legend, because the four rows share three columns
          — a name, a shape, an example — and a reader comparing shapes wants them under
          one another. Same hairline box as `FeatureLegend`, same `mt-8`. */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-hairline">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs uppercase tracking-wider text-ink/60">
              <th className="px-6 py-4 font-medium">{t("site.commitCfg.tableFormat")}</th>
              <th className="px-6 py-4 font-medium">{t("site.commitCfg.tableShape")}</th>
              <th className="px-6 py-4 font-medium">{t("site.commitCfg.tableExample")}</th>
            </tr>
          </thead>
          <tbody>
            {FORMATS.map((format, index) => (
              <tr key={format.example} className={index > 0 ? "border-t border-hairline" : ""}>
                <td className="px-6 py-4 font-display font-bold text-ink">{cell(format.name)}</td>
                <td className="px-6 py-4 font-mono text-xs text-ink/60">{cell(format.shape)}</td>
                <td className="px-6 py-4 font-mono text-xs text-ink">{format.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pull request ────────────────────────────────────────────────────────────────────

/**
 * What the PR tab configures, as the list under the drawing names it — five things, each
 * a row in the drawing above. Checked against `RepoPage.tsx`'s `pr` tab and against
 * `skills/magic-pr/SKILL.md`, which is what reads these settings.
 */
const PR_FEATURES: readonly {
  id: string;
  icon: typeof Settings2;
  name: MessageKey;
  description: MessageKey;
}[] = [
  { id: "autoLink", icon: Link2, name: "site.prCfg.legendAutoLinkTitle", description: "site.prCfg.legendAutoLinkDesc" },
  { id: "testAccounts", icon: KeyRound, name: "site.prCfg.legendTestAccountsTitle", description: "site.prCfg.legendTestAccountsDesc" },
  { id: "template", icon: FileText, name: "site.prCfg.legendTemplateTitle", description: "site.prCfg.legendTemplateDesc" },
  { id: "watch", icon: Activity, name: "site.prCfg.legendWatchTitle", description: "site.prCfg.legendWatchDesc" },
  { id: "comment", icon: MessageSquare, name: "site.prCfg.legendCommentTitle", description: "site.prCfg.legendCommentDesc" },
];

/** The template shown in the field: the repository's own, four lines of it. */
const TEMPLATE_LINES = ["## Summary", "", "## How to test", "- [ ] "];

export function PRConfigMockup() {
  const { t } = useT();

  return (
    <div className="flex flex-col">
      <RepoPageFrame active="pr" tone="bg-tone-sky">
        <SkillIntro
          icon={GitPullRequest}
          command="/magic:pr"
          lead="site.prCfg.intro"
          steps={[
            "site.prCfg.stepOpen",
            "site.prCfg.stepAutoLink",
            "site.prCfg.stepAccounts",
            "site.prCfg.stepTicketComment",
            "site.prCfg.stepWatch",
          ]}
          tail={["site.prCfg.tailAccountsSource"]}
        />

        {/* "Description" — the same word in both languages. */}
        <Group title="Description">
          <div className={ROW_CENTER}>
            <Field label={t("site.prCfg.autoLink")} help={t("site.prCfg.autoLinkHelp")} />
            <Toggle />
          </div>
          <div className={ROW_START}>
            <Field label={t("site.prCfg.testAccounts")} help={t("site.prCfg.testAccountsHelp")} />
            <Select value={t("site.prCfg.testAccountsReference")} />
          </div>
          {/* Shown because the row above is not "off" — the app hides it otherwise. */}
          <div className={ROW_START}>
            <Field
              label={t("site.prCfg.testAccountsSource")}
              help={t("site.prCfg.testAccountsSourceHelp")}
            />
            <div className={INPUT}>docs/test-accounts.md</div>
          </div>
          {/* The template row: its own `py-4` block, the status on the right, then the
              path chip and the field. */}
          <div className="py-4">
            <div className="mb-3 flex items-start justify-between gap-6">
              <Field label={t("site.prCfg.template")} help={t("site.prCfg.templateHelp")} />
              <span className="flex shrink-0 items-center gap-2 text-xs text-onink-dim">
                <Check className="h-3.5 w-3.5 text-green" /> {t("site.prCfg.templateFound")}
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded bg-onink-tint px-2 py-1 text-[10px] text-onink-faint">
                .github/pull_request_template.md
              </span>
            </div>
            <pre className="h-28 w-full overflow-hidden rounded-lg border border-onink-rule bg-onink-tint p-4 font-mono text-sm leading-relaxed text-onink-body">
              {TEMPLATE_LINES.join("\n")}
            </pre>
          </div>
        </Group>

        <Group title={t("site.prCfg.groupAfter")}>
          <div className={ROW_CENTER}>
            <Field label={t("site.prCfg.commentOnPR")} help={t("site.prCfg.commentOnPRHelp")} />
            <Toggle />
          </div>
          <div className={ROW_CENTER}>
            <Field label={t("site.prCfg.watchCI")} help={t("site.prCfg.watchCIHelp")} />
            <Toggle />
          </div>
        </Group>
      </RepoPageFrame>

      {/* ── THE FIVE SETTINGS, UNDER THE DRAWING ─────────────────────────────────
          Each names a row of the tab above: what goes into the description, and what
          happens once the PR is open. `FeatureLegend`, as under Tasks and Repositories. */}
      <FeatureLegend
        items={PR_FEATURES.map((entry) => ({
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
