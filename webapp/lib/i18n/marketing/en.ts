/**
 * The public site's message catalogue — everything under `app/(marketing)`.
 *
 * Kept SEPARATE from `lib/i18n/en.ts` rather than merged into it: the app catalogue is
 * product copy that mirrors the desktop app word for word, this one is marketing copy
 * that gets rewritten on its own cadence, and one 800-line file with both invites edits
 * to the wrong half. `lib/i18n/index.ts` merges the two into the single flat namespace
 * `t()` reads.
 *
 * Every key is prefixed `site.` so the two catalogues can never collide — both have a
 * `nav.` and a `footer.` family meaning entirely different things.
 *
 * ── The pitch this catalogue carries ──
 * The site used to sell the MECHANISM: "7 skills", "from ticket to merge", slash
 * commands in every headline. It now sells the OUTCOME — you describe what's next, it
 * gets built — on the product you already have. The commands did not go away; they
 * moved from the headline into `site.how.*`, where they belong as the concrete "how",
 * with the reference living in the documentation.
 *
 * The one thing deliberately NOT promised anywhere: that a non-developer can use this.
 * `site.faq.developer.a` says so outright, and it is the first row of `/faq` on purpose.
 * The site is meant to read wide and stay honest — a visitor who converts and then
 * cannot onboard costs more than one who never converted.
 *
 * ── Markup in the values ──
 * Some values carry HTML, because the copy needs a line break in a headline or a bold
 * command name mid-sentence, and splitting those into three keys makes them
 * untranslatable. Only `<br>`, `<strong>` and `<code>` appear, and they are rendered
 * by `RichText` (`components/site/RichText.tsx`) via `dangerouslySetInnerHTML` — safe
 * because this file is the entire input and it is checked into the repo.
 */

export const marketingEn = {
  // ── Nav ────────────────────────────────────────────────────────────────────
  'site.nav.howItWorks': 'How it works',
  /** Names the header's mobile disclosure — an icon-only trigger, so this IS its
      accessible name and not a tooltip beside one. Static while the glyph toggles,
      because `aria-expanded` on the button already announces open from closed. */
  'site.nav.menu': 'Site menu',
  /**
   * THE HEADER'S TWO MENUS AND THE EIGHT ROWS UNDER THEM. `product` and `help` are the
   * two triggers; `workflow`, `application`, `cloud`, `allFeatures`, `changelog` and
   * `download` are the first one's rows, in that order, and `bestPractices` with `faq`
   * are the second's. `lib/siteNav.ts` owns the order and the destinations, and
   * `siteNav.test.ts` looks every one of these keys up in BOTH catalogues — a key that
   * does not exist renders as an empty row rather than as an error, `t()` having no
   * per-key fallback.
   *
   * FOUR OF THEM ARE THE SAME WORD IN FRENCH, which is why they are one-word entries
   * with an allow-list line each in `i18n.test.ts`: "Workflow", "Application" and
   * "Cloud" are what the French UI calls them too — the product's own vocabulary, as
   * `site.features.groupCloudTitle` already is — and "Changelog" was listed there long
   * before this menu existed. `download` is NOT one of them ("Télécharger"), and
   * neither is the trigger ("Produit").
   *
   * `allFeatures` moved rather than changed: it was the bar's single link, and it is
   * now a row in the menu pointing at the same `/features`. `faq` moved the same way and
   * one release later — it was the bar's second CONTROL, and it is a row of the Help
   * menu now, pointing at the same `/faq`. Neither key was rewritten, because neither
   * destination was.
   *
   * THERE WAS A `site.nav.skills` ROW HERE, with a `/skills` page behind it, and both
   * were cut for duplicating `/workflow` — one loop, described twice. Its keys are gone
   * rather than parked: an unreferenced key normally costs nothing to keep, but an
   * en/fr pair that is identical also costs a line in `i18n.test.ts`'s EXACT allow-list,
   * and a name in that list with nothing behind it is a fact about the site that is no
   * longer true.
   */
  'site.nav.product': 'Product',
  'site.nav.workflow': 'Workflow',
  'site.nav.application': 'Application',
  'site.nav.cloud': 'Cloud',
  'site.nav.allFeatures': 'All features',
  'site.nav.download': 'Download',
  'site.nav.help': 'Help',
  'site.nav.bestPractices': 'Best practices',
  'site.nav.resources': 'Resources',
  /** The header's account control, signed out. Signed in it shows the email instead. */
  'site.nav.signIn': 'Sign in',
  'site.nav.account': 'Your account',
  'site.nav.documentationCategory': 'Documentation',
  'site.nav.gettingStarted': 'Getting Started',
  'site.nav.skillsReference': 'Commands Reference',
  'site.nav.configuration': 'Configuration',
  'site.nav.viewAllDocs': 'View all docs',
  'site.nav.communityCategory': 'Community',
  'site.nav.faq': 'FAQ',
  'site.nav.updatesCategory': 'Updates',
  'site.nav.changelog': 'Changelog',
  'site.nav.ourStory': 'Our Story',

  // ── The four pages that are not written yet ─────────────────────────────────
  /**
   * `/desktop`, `/cloud`, `/download` and `/best-practices`: the header's four new
   * rows, each a title and one lead, printed by
   * `components/site/PlaceholderContent.tsx`.
   *
   * THEY EXIST BECAUSE THE MENU DOES. A row pointing at a path `PUBLIC_PATHS` does not
   * list 307s the reader to a login form on `app.magic-slash.io`, so the routes had to
   * ship with the menu — see `PLACEHOLDER_PAGES` in `lib/siteNav.ts`. The copy is
   * therefore a PROMISE OF SCOPE and nothing more: what each page will hold, so a
   * reader who followed the row learns something rather than meeting an empty band.
   *
   * THERE WAS A `site.desktopPage.*` PAIR HERE, for `/desktop`. That page is real now —
   * the homepage's app band moved onto it whole — so the promise of scope had nothing
   * left to promise, and the page heads itself with `site.desktop.title` below.
   */
  'site.pageSoon.note': 'Page in preparation',
  'site.cloudPage.title': 'The cloud',
  'site.cloudPage.lead':
    'Your configuration, your team and your usage, on every machine you sign in on — with nothing to copy across by hand. This page is being written.',
  'site.downloadPage.title': 'Download Magic Slash',
  'site.downloadPage.lead':
    'The installer, what it needs on your machine, and what the first launch sets up for you. This page is being written.',
  'site.bestPracticesPage.title': 'Best practices',
  'site.bestPracticesPage.lead':
    'How to shape the work so the agents can carry it — one ticket per branch, a spec before an epic, and when to let an agent run unattended. This page is being written.',

  // ── Hero ───────────────────────────────────────────────────────────────────
  /**
   * THE WHOLE CYCLE NAMED BY ITS TWO ENDS, which is the change worth recording. The
   * headline this replaces — "Your ideas become AI-powered features." — promised an
   * outcome without saying what the product does to reach it, and "AI-powered" is a
   * claim every tool in this market makes. An idea going in and a merged pull request
   * coming out is the one sentence only this product can say.
   *
   * No `<br>` any more: the old line carried one because it ran to two lines at `md`
   * and broke in the wrong place. This one is five words and breaks nowhere.
   */
  'site.hero.title': 'Your Jira ticket becomes a merged PR.',
  /**
   * THE HEADLINE'S SECOND SENTENCE, minus its last word. The drawing closes it with the
   * command itself and a full stop — `<code>/magic:start</code>.` — because a command is
   * a token the product defines (`lib/commands.ts`) and never a string a translator can
   * edit; `lib/skillsBand.test.ts` states that rule for the band below. So the catalogue
   * stops where the token starts.
   */
  'site.hero.titleTail': 'All you said was',
  /**
   * The pill above the headline. It names the three things the reader already knows —
   * Claude Code, Jira, GitHub — beside their marks, so the product is placed in a second
   * before a word of the pitch is read. The count is the PRODUCT's — eight, the same
   * figure the subtitle and the skills band use, and the number of skills you install.
   * The ladder beside it draws seven of them, because `/magic:continue` is a way back
   * INTO the cycle rather than a step of it; nothing in the copy counts the drawing.
   */
  'site.hero.eyebrow': '8 Claude Code skills + a desktop app',
  /**
   * WHAT THE HEADLINE CANNOT SAY: the headline is one run, start to finish, and the
   * product's actual claim is that there are SEVERAL of them going at once. So this
   * line carries the three things the reader has to be told for that to land — the
   * parallelism, the single place it happens in, and what they stop having to do.
   *
   * "AGENTS" AND NOT "TASKS" in the first clause, which is what makes the second one
   * parse. "Who is working on what" over a line about tasks reads as teammates and a
   * standup; over a line about agents it reads as the machine keeping the ledger. The
   * word is already the site's (`site.features.desktopDesc` — "up to twelve agents at
   * once"), and it is the desktop app's own, in the sidebar's AGENTS section.
   *
   * "SO YOU DON'T HAVE TO" is the mental-load half, and it is deliberately the LAST
   * thing said rather than the claim the line opens on. A hero that opens on relief
   * has to describe the burden first, and this page has one line to spend.
   *
   * It replaced two earlier jobs in two passes: "The app for product builders." named
   * the AUDIENCE, then a describe/build/approve line named the MECHANISM. The mechanism
   * went back to the headline's two ends when the "how it works" band was cut — see
   * `app/(marketing)/page.tsx` — which is what freed this line for the argument above.
   */
  'site.hero.subtitle':
    '8 skills that chain the spec, the branch, the commits, the pull request, the review and the closed ticket. An app that shows you the tasks to pick up and the agents at work. You make the calls.',
  'site.hero.cta': 'Start free',
  /**
   * RETIRED WITH THE BAND IT POINTED AT. It scrolled to `#how`, and that section was
   * cut by the product owner — there is no anchor left to reach. Unreferenced, and kept
   * in the catalogues like every other family this rebuild retired.
   */
  'site.hero.howCta': 'See how it works',
  /**
   * The hero's SECOND button — `secondary`, the safe alternative beside the blue
   * primary. It points at `DESKTOP_DOWNLOAD_URL`, which is the build itself rather
   * than a releases page, so the label names the platform: an arm64 .dmg is the only
   * artifact the release workflow publishes.
   */
  'site.hero.downloadCta': 'Download for Mac',
  /**
   * The SECOND button now, beside the download. It opens `/workflow`, which is the page
   * that sets the steps out in full; the ladder on the right of the hero is the short
   * version of it, so the button says where the long one is.
   */
  'site.hero.workflowCta': 'See the workflow',
  /**
   * THE LADDER — the seven cards on the hero's right, and the two lines that frame them.
   * The frame is the whole pitch in four words: what you come in with, what you leave
   * with. Each card is one command (drawn from `lib/commands.ts`, never from here) and
   * the one thing it produces, kept to about five words so seven of them fit beside the
   * copy. The tracker's mark at the card's right end says WHERE that thing lands — Jira
   * for the two ends of the cycle, GitHub for everything between.
   */
  'site.hero.ladderStart': 'An idea?',
  'site.hero.ladderEnd': 'A merged PR',
  'site.hero.skillPlan': 'The spec, the epic, the stories',
  'site.hero.skillStart': 'The ticket, the branch, the plan',
  'site.hero.skillCommit': 'Atomic commits, properly named',
  'site.hero.skillPr': 'Push, PR, ticket updated',
  'site.hero.skillReview': 'The review, yours or theirs',
  'site.hero.skillResolve': 'Feedback addressed and pushed',
  'site.hero.skillDone': 'The ticket closed behind you',

  // ── The two pillars ────────────────────────────────────────────────────────
  /**
   * THE BAND THAT OPENS THE PAGE'S BODY — `components/site/home/PillarsSection.tsx`. Two
   * cards, because the product is two things, and a reader arriving from the hero knows
   * the OUTCOME but not yet what they would be installing.
   *
   * "8" IS A NUMERAL AND NOT A WORD, which is a deliberate reversal: this read "Eight"
   * first, on the ordinary typographic rule that a small number under ten is spelled out
   * in running prose. A card title is not running prose — it is a label, read at a glance
   * and out of the corner of an eye, and a digit is what survives that. It is also the
   * count itself that is doing the selling here.
   *
   * The count is one the whole site is built on (`MAGIC_COMMANDS` in `lib/features.ts`
   * holds it, and `features.test.ts` pins the inventory), so it is stated rather than
   * hedged. The two commands named are the ENDS of the loop and not a sample: `plan` turns
   * an idea into tickets, `done` closes the ticket and cleans up, and naming both is what
   * tells the reader the cycle is closed rather than partial.
   *
   * `site.desktop.highlightCommands` further down still SPELLS IT OUT ("the eight /magic:
   * commands"), and that is not an oversight left behind: it sits in running prose under
   * the window, where the ordinary rule applies again.
   */
  'site.pillars.skillsTitle': '8 Claude Code skills',
  'site.pillars.skillsDesc':
    'From /magic:plan to /magic:done, they run the whole cycle in your terminal: the spec, the branch, the commits, the pull request, the review, the ticket closed behind you.',
  /**
   * WHAT THE APP IS, and deliberately not what it does at scale. The parallel-agents claim
   * belongs to `site.desktop.subtitle` further down, whose whole sentence is built on it;
   * repeating it here would give the page two openings. So this line lists the four things
   * a person actually does in the window, in the order they do them.
   */
  /**
   * The one stop on `SkillsTimeline` that is not a command: what `/magic:plan` produces
   * and what `/magic:start` picks up. The four beside it come from `commandLabel`, which
   * is why they are not here.
   *
   * IT NAMES THE ACT, like the stops around it. The wording has been through three: "The
   * tickets" (an article, which made it the only stop reading as prose), then bare
   * "Tickets" (an object, where every neighbour is something HAPPENING), and now the
   * writing of them — which is what `/magic:plan` actually produces and what the Jira mark
   * beside it is pointing at.
   *
   * That last change took it OUT of `i18n.test.ts`'s `SAME_IN_BOTH.site`: "Tickets" was
   * the same word in French and "Tickets written" is not, and a key listed there and then
   * translated fails that test.
   */
  'site.pillars.timelineTickets': 'Tickets written',
  /**
   * The HUMAN beat on `SkillsTimeline`, between planning and building, and the only stop
   * on the rail that nothing automates: somebody reads the plan and says yes. It is on the
   * rail because a row of five machine steps would say the product runs without you.
   *
   * Its label sits ABOVE the rail rather than under it — see that file's note, where the
   * position turns out to be what makes six stops fit inside the card at all.
   */
  'site.pillars.timelineValidation': 'Plan approved',
  /**
   * Two more stops on `SkillsTimeline`, and both are here rather than coming from
   * `commandLabel` for a reason of their own.
   *
   * `timelinePr` OVERRIDES the command's own label. `COMMAND_LABELS` gives `/magic:pr` the
   * name "PR", which is right in a grid of eight commands where the row is already headed
   * by a slash; on a timeline of a ticket's life the step is the artefact.
   *
   * IT NAMES THE CREATION, not the thing. It read "Pull request" for a round, and beside a
   * later stop called "Pull request approved" that was ambiguous — two stops named after
   * the same object, with nothing saying which one opens it. "Pull request created" is the
   * ACT, which is what a step on a timeline is. It is no longer the same string in French
   * ("Création de la Pull request"), so it came OUT of `i18n.test.ts`'s `SAME_IN_BOTH.site`
   * when the wording changed — a key listed there and then translated fails that test.
   *
   * `timelineMerged` is NOT A COMMAND AT ALL. Nothing runs to make a pull request merged;
   * somebody clicks the button, and `/magic:done` is what follows it. It sits between `pr`
   * and `done` because that is where the wait is, and a row that jumped straight from
   * opening a PR to closing the ticket would be a row claiming the review is ours to skip.
   */
  'site.pillars.timelinePr': 'Pull request created',
  'site.pillars.timelineMerged': 'Merged',
  /**
   * The SECOND human beat on the rail, after `resolve`: a reviewer approves once the
   * comments they left have been answered. It carries GitHub's mark for the same reason
   * the pull-request stop does — that is where the approving happens.
   *
   * It is also the LONGEST label on the row at ~218px, which is what sets the 240px pitch
   * every stop is spaced by. See the geometry note in `SkillsTimeline.tsx` before making
   * it any longer.
   */
  'site.pillars.timelineApproved': 'Pull request approved',
  'site.pillars.desktopTitle': 'A desktop app to drive them',
  'site.pillars.desktopDesc':
    'A native window to launch an agent, see where each one stands, answer the one that is waiting for you, and open the pull request without leaving the screen.',
  /**
   * THE LINE THAT ADDS THE TWO UP, at the foot of the band. It names the reader — product
   * builder — which is where that positioning went when the hero's subtitle gave it up for
   * the parallelism (see `site.hero.subtitle`): the audience is still worth stating once,
   * and a conclusion is a better place for it than a headline.
   */
  'site.pillars.kicker':
    'Between them, they speed up your whole product-builder workflow, from the idea to production.',

  // ── The /desktop page, and the homepage band that points at it ─────────────
  /**
   * THE WHOLE OF `/desktop` — `components/site/desktop/DesktopContent.tsx`, which puts
   * the app's own window on the screen at length.
   *
   * IT WAS A HOMEPAGE BAND under these same keys, directly under the hero and then
   * fourth in the stack. The product owner moved the composition onto a page of its own;
   * the family moved with it, unrenamed, because a key family names the copy and not the
   * surface it happens to be printed on. `site.appBand.*` below is the new band that
   * replaced it up there, and it is a different argument in different words.
   *
   * The title is the PRODUCT'S NAME and is therefore the same string in both catalogues,
   * which is why it has a line in `i18n.test.ts`'s exact `SAME_IN_BOTH.site` allow-list.
   * THE BARE NAME, and it lost a word to get there: it read "Magic Slash desktop" first,
   * on the argument that the band had to say which of the product's surfaces this is. It
   * does not. The window under the heading is unmistakably an application, the subtitle
   * says agents run in it, and "desktop" was a category label doing work the picture had
   * already done — the kind of word a title keeps only until someone reads it aloud.
   */
  'site.desktop.title':
    'You shouldn’t have to <em>remember</em> what your agents are doing.',
  /**
   * The pill above the headline names the reader rather than the product: the page is
   * for the product builder who already has three Claude Code sessions in three
   * terminals. "PRODUCT BUILDER" AND NOT "DEVELOPER", which is the product owner's own
   * word for who this is for and the one the site already uses twice — see
   * `site.pillars.kicker` and the closing band. It is also the wider claim: the person
   * running three agents is shipping a product, not only writing the code.
   */
  'site.desktop.eyebrow': 'For product builders running several agents',
  'site.desktop.howCta': 'How it works',
  /** The line of reassurance under the two buttons, three short facts and no verb. */
  'site.desktop.reassureFree': 'Free',
  'site.desktop.reassureMac': 'macOS',
  'site.desktop.reassureTrackers': 'Your Jira tickets and GitHub PRs, already wired',
  /**
   * THE BEFORE / AFTER under the copy. "Before" is six windows drawn grey and crooked on
   * purpose, with the two questions a developer asks themself at 4pm floating over them;
   * "after" is the app's own window, in colour. The two captions name the two halves.
   */
  'site.desktop.beforeLabel': 'Before · six tabs, no overview',
  'site.desktop.afterLabel': 'With Magic Slash · one window, all of it',
  'site.desktop.bubbleWhich': 'Which one was waiting on me?',
  'site.desktop.bubbleBranch': 'Did I commit on the right branch?',
  /**
   * TWO LINES, and it is a length rather than a break — there is no `<br>` in it, because
   * a hard break at this width becomes four lines on a phone. See the note in
   * `DesktopContent.tsx`.
   *
   * THREE THINGS, IN THIS ORDER, because each one is what makes the next land: several
   * agents at once (the claim only this product can make), each in its own worktree (the
   * mechanism that makes the first one true rather than a slogan — they are not sharing a
   * checkout and stepping on each other), and then the single window you watch and steer
   * them from. The hero's own subtitle states the parallelism; this is where the
   * parallelism gets its explanation and its place.
   *
   * "WORKTREE" IS LEFT AS IT IS in the French, as it is throughout the app and the
   * documentation: it is git's own word, and every French developer who has one calls it
   * that.
   */
  'site.desktop.subtitle':
    'Magic Slash remembers for you. The tasks to pick up show in the app, every agent tells you when it needs you, and you move from one to the next without losing the thread.',
  /**
   * The titlebar's own button in the drawn window, `agentInfo.closeAgent` in the app's
   * catalogues. A key rather than a literal because the APP translates it — the literals
   * in that drawing are the ones the product prints in English whatever the language
   * (branch names, commit subjects, `v0.88.0`, ticket ids).
   */
  'site.desktop.archiveAgent': 'Archive the agent',
  /**
   * THE FOUR HIGHLIGHTS under the window, and every one of them is a fact this site
   * already states somewhere else — see the note on `HIGHLIGHTS` in `DesktopContent.tsx`
   * for where each comes from. Four words or so each, because they are set on two lines
   * under a 48px tile and a fifth word makes a third.
   *
   * "Twelve" is `site.features.desktopDesc`'s own number, spelled out as that line spells
   * it. "Worktree" stays as it is in the French, as it does in the subtitle above and
   * throughout the app. And `/magic:` is typed the way it is typed — the colon belongs to
   * the command, and the eight of them are what `lib/features.ts` holds.
   */
  'site.desktop.highlightParallel': 'Twelve agents in parallel',
  'site.desktop.highlightContext': 'All your context, saved',
  'site.desktop.highlightTrackers': 'Jira and GitHub connected',
  'site.desktop.highlightCommands': 'The eight /magic: commands',

  // ── The homepage's app band ────────────────────────────────────────────────
  /**
   * THE BAND THAT REPLACED THE ONE ABOVE ON THE HOMEPAGE —
   * `components/site/home/AppSection.tsx`: a heading, a paragraph and a button beside the
   * same window at two-fifths the size.
   *
   * ITS OWN FAMILY AND NOT `site.desktop.*`, which is the decision worth stating. The two
   * surfaces are not the same argument at two lengths: that page HEADS ITSELF with the
   * product's name and then describes the window, because a reader who opened it has
   * already decided to look at the app. This band has to earn that click from a reader
   * who is still scrolling, so it names what the window DOES for them — and a landing
   * band whose headline is a product name is a band that says nothing.
   *
   * THE HEADLINE NAMES THE TWO THINGS THE WINDOW HOLDS — your tasks and your agents —
   * and it is the product owner's own line, given in French and translated here.
   *
   * IT ECHOES THE HERO, which is worth recording rather than hiding: `site.hero.subtitle`
   * already says "Several agents in parallel, in a single app", and this headline is two
   * bands below it. The earlier draft avoided the overlap on purpose (it read "One window
   * that knows who is working on what", answering the objection the hero's claim raises
   * rather than restating the claim). The owner chose the restatement; a landing page
   * that says its one differentiator twice is a defensible choice, and it is theirs.
   *
   * THE FRENCH USES "tu", alone on this site. See the note beside it in `fr.ts`.
   *
   * THE PARAGRAPH IS THREE FACTS, in the order that makes each one land: what you see
   * (who is on what), what the app remembers for you (each session's context), and what
   * it talks to on your behalf (Jira and GitHub). It stops short of the eight commands —
   * the skills band directly above is where those live, and a paragraph that lists
   * everything is a paragraph nobody finishes.
   *
   * THE BUTTON'S LABEL NAMES THE PAGE and not the action ("See the app" rather than
   * "Learn more"): a reader deciding whether to spend a click wants to know where it
   * goes. It is also the word the header's own row uses for that page, which is what lets
   * somebody be told "it's under Product → Application" and find the same thing.
   */
  'site.appBand.title': 'Your tasks, your agents, in a single app.',
  'site.appBand.subtitle':
    'Every agent gets its own worktree and its own terminal, and the app keeps the context of each session. It reads your tickets from Jira or GitHub, follows the pull requests it opened, and tells you when something needs you.',
  'site.appBand.cta': 'See the application',

  /**
   * THE THREE CLAIMS UNDER THE PARAGRAPH — the same `FeaturePoints` list the skills band
   * two bands up carries, with the same brand-blue outline glyphs, asked for by the
   * product owner in those words ("une liste avec icon bleu comme le block 8 skills").
   *
   * THEY NAME THE THREE THINGS THE WINDOW BESIDE THEM HOLDS, in the order a reader meets
   * them both in the drawing and in the app itself: the tasks you pick from, the agents
   * you started on them, and what those agents have produced since. The first two are the
   * headline's own two nouns, which is deliberate — the list is the caption to the
   * picture, not a second argument — and the third is the one thing neither the headline
   * nor the drawing says on its own: the window is not only where work STARTS, it is
   * where it is followed.
   *
   * SHORTER THAN THE SKILLS BAND'S ROWS, and they read as labels rather than as claims.
   * That band has no picture of the thing it is selling, so its three rows have to carry
   * the argument in words; here the argument is the window, and a row that restated the
   * paragraph would be read twice and believed once.
   *
   * THE FRENCH SAYS "vos", not "tes", under a headline that says "tes". That is not a
   * slip: the subtitle directly above these rows already vouvoies (see the note beside
   * the title in `fr.ts` — the headline is the one line on this site that tutoies, by the
   * owner's request), so the list follows the paragraph it hangs from rather than
   * reopening a decision the band already made.
   */
  /**
   * THE FIRST ROW CARRIES THE TWO TRACKERS AS CHIPS — `{jira}` and `{github}` are
   * replaced by a mark and a name on a tinted plate, not by words. See `TrackerChip` in
   * `AppSection.tsx` for what they are drawn as.
   *
   * ONE STRING WITH TWO PLACEHOLDERS, and not four fragments concatenated in the
   * component, which is the version this replaced in review. `t()` substitutes `{name}`
   * textually and returns a string, so the component has to split the sentence to put a
   * node in the middle of it — but WHERE it splits is then the translator's decision
   * rather than the developer's. A French row that wanted "Vos issues GitHub et tâches
   * Jira" is one edit to this line; four fragments would have needed the component
   * reordered, in a file no translator opens.
   *
   * THE BRAND NAMES ARE NOT IN HERE. "Jira" and "GitHub" are spelled inside the chip,
   * once, because they are proper nouns identical in both catalogues — and a product
   * name that lives in a translation file is a product name somebody eventually
   * translates. The placeholder says WHERE the chip goes; the chip says what it is.
   */
  'site.appBand.pointTasks': 'Your tasks {jira} and issues {github}',
  /**
   * THE SECOND ROW NAMES WHAT IS ACTUALLY RUNNING — `{claude}` becomes the Claude Code
   * mark and its name, on Anthropic's coral. Same construction as the row above and for
   * the same reason: "your agents" is a category until the reader sees WHOSE, and this
   * product's whole claim is that it drives the agent they already run.
   *
   * IT IS THE ONE PLACE ON THE HOMEPAGE'S BANDS WHERE CLAUDE CODE IS NAMED IN THE COPY
   * rather than drawn. The workflow band's subtitle says "a layer on top of Claude Code"
   * in prose; here it is a chip, which the eye takes without reading. Both stay: one is
   * an argument, the other is an identification.
   */
  'site.appBand.pointAgents': 'Your agents {claude} at work',
  'site.appBand.pointTracking': 'The work your agents deliver, followed',

  // ── The workflow band, and the page it opens ───────────────────────────────
  //
  // ONE FAMILY FOR TWO SURFACES. `lib/workflow.ts` is the list both of them read — the
  // homepage's five cards and `/workflow`'s five sections — so there is no second set of
  // keys for the page. A step reworded here is reworded in both places, which is the
  // whole reason that module exists.
  //
  // WHAT THE COPY DELIBERATELY DOES NOT CONTAIN IS A COMMAND NAME. `/magic:plan` and its
  // seven siblings are printed by the DRAWINGS, spelled from `lib/commands.ts` — whose
  // template-literal type makes `/magic:pln` a compile error. In a catalogue they would be
  // eight strings a translator can edit and nothing can check, and the site would
  // eventually name a command the product does not have.
  //
  // THE TITLES ARE IMPERATIVES — "Make the plan", not "Planning". The band is about what
  // YOU do; the app is the thing doing the typing, and a page of gerunds reads as a
  // feature list rather than as a day of work.
  'site.workflow.title': 'Working with Magic Slash.',
  /**
   * TWO LINES, as a length rather than a break — no `<br>`, because a hard break at this
   * width becomes four lines on a phone. Same call as the hero's and the desktop band's.
   *
   * IT SAYS WHAT MAGIC SLASH *IS* IN RELATION TO CLAUDE CODE, which is the product owner's
   * own framing and replaces a line that never named the relationship: "Magic-slash est une
   * sur couche à Claude code ! il boost votre claude code et vous fait gagner de la charge
   * mentale avec le context sauvegardé dans l'application desktop."
   *
   * WHY THAT IS THE RIGHT LINE HERE and the old one was not. The band draws five steps and
   * eight commands, so a reader who has not placed the product yet reads them as a rival to
   * the tool they already use — and it is the opposite: a LAYER on top of it. The previous
   * copy ("five commands carry one ticket from an idea to a merged pull request… you approve
   * every step") described the mechanism the five cards below already describe, card by
   * card, in more detail. Saying it twice bought nothing; saying what the thing IS buys the
   * only sentence on this screen the cards cannot draw.
   *
   * THREE CLAUSES, IN THIS ORDER: it is a layer (so nothing you know is thrown away), it
   * makes the agent you already run better, and the context lives in the app — which is
   * where the mental-load claim comes from and is worth being precise about. What the app
   * holds is one agent per ticket, each in its own worktree with its own session, so
   * "keeping the context" is a fact about the product and not a slogan.
   */
  'site.workflow.subtitle':
    'Magic Slash is a layer on top of Claude Code: it boosts the agent you already run and keeps every ticket’s context in the desktop app — that much less to hold in your head.',
  'site.workflow.cta': 'See the whole workflow',
  /**
   * The last line of the plan card's drawing: the tracker's mark, this, and a green tick.
   *
   * A KEY AND NOT A LITERAL, unlike the commit subjects and the branch names in those same
   * drawings. The rule `WorkflowArt.tsx` states is that a literal stays English when it is a
   * string the TOOL or the platform prints — and this is neither. It is the drawing's own
   * caption, written by us, saying what just happened. "Issues" stays as it is inside the
   * French because it is what GitHub calls them there too.
   */
  'site.workflow.planIssuesCreated': 'Issues created',
  /** The line that closes `/workflow`, pointing at the full inventory. */
  'site.workflow.more': 'Every command, panel and switch the app ships with is on the features page.',
  /**
   * ① `/magic:plan`. "Reviewable" is the load-bearing word: the skill writes a spec and
   * STOPS, and nothing is opened on the tracker until you say so — which is also what the
   * drawing beside this shows (`approved`, then the epic and its three stories).
   */
  'site.workflow.planTitle': 'Make the plan',
  'site.workflow.planDesc':
    'Describe the idea in your own words. The spec comes back for review, and once you have approved it the epic and its stories are opened on Jira or GitHub.',
  /**
   * ② `/magic:start`. "A ticket id is the whole command" is literally true — the skill
   * takes `PROJ-123` or `#142` and derives the rest — and it is the concrete detail that
   * makes the card believable where "gets you started" would not.
   */
  'site.workflow.startTitle': 'Start with Claude Code',
  'site.workflow.startDesc':
    'A ticket id is the whole command. The worktree, the branch and the agent are ready, with the ticket read and a plan drafted before you type anything else.',
  /**
   * ③ `/magic:commit` and `/magic:pr`. "Atomic" and "conventional" are the two words the
   * skill's own contract uses (one commit, one logical change; `type(scope): subject`,
   * enforced by commitlint), and a developer reading them knows exactly what they are
   * being promised.
   */
  'site.workflow.commitTitle': 'Commit and open the PR',
  'site.workflow.commitDesc':
    'The working tree is split into atomic commits with conventional messages, pushed, and the pull request writes itself with the ticket linked.',
  /**
   * ④ `/magic:review` and `/magic:resolve`. "In its own thread" is the half people do not
   * expect: the fix is one thing, the REPLY on the conversation that asked for it is what
   * makes a review actually close.
   */
  'site.workflow.reviewTitle': 'Resolve the review',
  'site.workflow.reviewDesc':
    'The diff gets read the way a reviewer reads it, then every comment gets a fix, a commit and an answer in its own thread.',
  /**
   * ⑤ `/magic:done`. "Once the merge is confirmed" is not a flourish — the skill verifies
   * the merge first and does nothing at all if it cannot, and this card is the one on the
   * page that could most easily promise a cleanup the tool does not perform. The three
   * items are `site.doneCard.*`'s three, which were audited against
   * `skills/magic-done/SKILL.md` line by line.
   */
  'site.workflow.doneTitle': 'Merge and clean up',
  'site.workflow.doneDesc':
    'Once the merge is confirmed: the ticket closed, the branch deleted on both ends, the worktree removed. Your machine back where it started.',

  // ── The skills band, between the workflow and the app window ───────────────
  //
  // A HEADING, A PARAGRAPH, THREE CLAIMS AND A BUTTON, beside a terminal running seven of
  // the eight commands. `lib/skillsBand.ts` is the module that names every key below and
  // `skillsBand.test.ts` looks each one up here and in the French — which is the whole
  // reason that module exists, since `t()` has no per-key fallback and a renamed entry
  // would ship as a heading with a hole under it.
  //
  // NO COMMAND NAME APPEARS IN ANY OF IT, the same division the workflow band's own note
  // above describes: the commands are printed by the DRAWING, spelled from
  // `lib/commands.ts`, whose template-literal type makes `/magic:pln` a compile error. In
  // a catalogue they would be eight strings a translator can edit and nothing can check.
  //
  // EIGHT IN THE COPY, SEVEN IN THE DRAWING, and neither is wrong. Eight is what ships;
  // seven is the path one ticket takes through them, because `/magic:continue` is not a
  // stage of a ticket's life but how you re-enter one you left. `lib/workflow.ts` sets that
  // out at length and `workflow.test.ts` pins it.
  /**
   * The band's `h2`. It names a COUNT and a SPAN — how many there are, and that between
   * them they cover the lot — because those are the two things a reader cannot get from
   * the drawing beside it, which shows a sequence without ever saying how long it is or
   * whether anything comes after.
   *
   * A NUMERAL AND NOT THE WORD, by the product owner's call ("peux-tu remplacer les
   * 'Huit' par '8'"), here and on the first claim below. It reads as a spec rather than
   * as prose, which is what a count of commands is, and it is the same shape as the
   * `/magic:` tokens in the drawing beside it. `skillsBand.test.ts` pins the digit in
   * both catalogues against `MAGIC_COMMANDS.length`, so it cannot drift from the eight
   * the product actually ships.
   */
  'site.skillsBand.title': '8 skills do the whole cycle.',
  /**
   * ONE PARAGRAPH, and what it adds to the title is the DIVISION OF LABOUR: what the agent
   * does, and what is left for you. The three verbs are the three artefacts the terminal
   * beside it prints — the tracker read, the code written, the pull request opened and its
   * review answered — so the copy and the drawing are making one argument rather than two.
   *
   * IT ENDS ON WHAT YOU KEEP rather than on what you are spared. "Almost no human
   * interaction" was the brief and it would be the wrong sentence: the product stops for
   * approval twice on purpose, and a band that claimed otherwise would promise something
   * `skills/magic-plan/SKILL.md` explicitly does not do. See the note on the third claim.
   *
   * TWO SENTENCES AND NOT ONE WITH AN EM DASH IN IT, by the owner's call ("retire le
   * grand — entre à sa review et ce qu'il vous reste"). The dash was doing a full stop's
   * job in a paragraph that already has a comma-separated list of three verbs in front of
   * it, and at this width it landed mid-line where it read as a hyphen between two
   * clauses rather than as the turn it was meant to be. The hero and the desktop band
   * still use one; this paragraph is longer than either.
   */
  'site.skillsBand.subtitle':
    'One command per moment of a ticket’s life. The agent reads the tracker, writes the code, opens the pull request and answers its review. What is left for you is reading it and saying yes.',
  /** The button, out to the inventory of all eight on `/features`. */
  'site.skillsBand.cta': 'See the workflow',
  /** ① The count, which is the one claim a reader can check against the page. */
  'site.skillsBand.pointSkills': '8 skills, one per step of the cycle',
  /** ② The span, named by its two ENDS — the same shape as the page's own headline. */
  'site.skillsBand.pointCycle': 'From the first idea to the merged pull request',
  /**
   * ③ What is left for you. It names the ONE approval that gates everything downstream
   * rather than counting them, because the number depends on how you run it and the claim
   * should not: nothing is opened on the tracker and no code is written until you have
   * said yes to a plan.
   */
  'site.skillsBand.pointHands': 'You approve the plan, the rest runs itself',

  // ── The band after the eight skills: what stops being yours alone ───────
  //
  // FOUR CARDS AND A HEADING, and no button — the owner asked for a band with a title and
  // a description and nothing to click ("avec titre, description sans CTA"), which
  // `OrgSection`'s header explains the placement reason for.
  //
  // THE FAMILY IS `site.orgBand.*`, matching `site.skillsBand.*` above it: a BAND's own
  // copy, as against the `site.*Card.*` families further down, which hold the LABELS
  // INSIDE a drawing. This band's four drawings read their labels from `site.repoCfg.*`
  // and `site.tasksCard.*` rather than minting a family of their own — both are drawings
  // of screens those families already describe — so `site.orgBand.*` is the heading and
  // the four cards, and nothing else.
  //
  // THE HEADING IS TWO SENTENCES BECAUSE THE SECOND IS THE PAYOFF OF THE FIRST. A single
  // clause ("shared configuration for teams") names a category; this one makes a promise
  // and then says who collects on it. It is also the first line on the page whose subject
  // is plural — everything above is addressed to one person — which is the seam this band
  // was put at.
  'site.orgBand.title': 'Set it up once. Your team inherits it.',
  'site.orgBand.subtitle':
    'Repository configuration, plans and the backlog belong to your organization rather than to one laptop. Someone joins, opens the app, and finds the project already set up — the same branch, the same commit format, the same tickets.',
  // THE CARD TITLES ARE NOUNS and not the imperatives the workflow band uses: that band is
  // about what YOU do, this one about what the product HOLDS on your behalf.
  'site.orgBand.configTitle': 'The configuration your team shares',
  // NAMED IN THE ORDER THE SETTINGS PAGE LISTS THEM, so a reader who opens the drawing
  // beside this sentence finds the four things it promises in the tabs it shows.
  'site.orgBand.configDesc':
    'Share a repository with your organization and every setting on it goes too: the development branch, the commit format, the pull request template, the language of each surface. Set once, by whoever knows the project best.',
  'site.orgBand.orgTitle': 'Your organization',
  // "BINDS THEIR OWN LOCAL FOLDER" IS THE APP'S OWN SENTENCE, lifted from the help line
  // under the Scope row (`site.repoCfg.teamHelp`, itself the desktop's `repo.scope.teamHelp`).
  // It is the one detail that stops the claim being read as "we sync your checkout": what
  // travels is the configuration, and where the code lives stays each member's own answer.
  'site.orgBand.orgDesc':
    'Invite the people you work with and the repositories follow them, configuration included. Each member binds their own local folder and starts working — nobody sets up the same project twice.',
  'site.orgBand.planTitle': 'Plans that circulate',
  // THE COMMAND IS NAMED, and it is the only card here that names one: a plan is the one
  // thing in this band a reader has no prior picture of, and `/magic:plan` is what the
  // skills band directly above has just introduced it as.
  'site.orgBand.planDesc':
    '/magic:plan turns an idea into a spec, an epic and its stories. Share it and anyone free can pick a story up, with the reasoning behind it already written down.',
  'site.orgBand.tasksTitle': 'One backlog, everyone’s tickets',
  // "WHAT IS LEFT TO TAKE" AND NOT "WHAT IS LEFT TO DO", which is the distinction the
  // drawing makes with its marked row and the reason this card is not a second Tasks
  // card: a shared list is only useful if it says which rows are already gone.
  'site.orgBand.tasksDesc':
    'Filter the shared list down to one repository and see what is left to take. A ticket an agent is already working is marked as such, so two people never start on the same one.',
  // The pill on the organisation drawing's second rail. "Configuration" is the same word
  // in French, so it is listed in `i18n.test.ts`'s allow-list; the repository slug on the
  // rail above it is a literal in the component, as every repository name on this site is.
  'site.orgTeam.config': 'Configuration',

  // ── The band under the app window: who it is built for ─────────────────────
  //
  // FIVE CARDS AND A HEADING, and the family is `site.builtFor.*` rather than
  // `site.desktop.*` on purpose: that family belongs to the band ABOVE this one, which
  // shows the window itself. These are five claims about living in it, and keeping them
  // apart is what lets either band be reworded without the other's copy moving.
  //
  // THE CARD TITLES ARE NOUNS, not the imperatives the workflow band uses. That band is
  // about what YOU do — "Make the plan", "Commit and open the PR" — and this one is about
  // what the APP IS, so a verb here would be the page telling the reader to go and use a
  // feature rather than saying the feature exists.
  //
  // WHAT IS NOT IN THE CATALOGUE: the shortcuts themselves. ⌘N, ⌘↓, ⌘/ and ⌃Space are
  // printed by the drawing in `BuiltForArt.tsx`, spelled from what the app actually
  // registers, for the same reason the workflow band keeps the command names out of here
  // — a keystroke is not prose, and a translator editing one would have the site teaching
  // a shortcut the product does not have.
  /**
   * TWO SENTENCES AND THE SECOND IS THE POINT. "Built for developers" on its own is what
   * every developer tool says; the second half is the product owner's own brief ("build
   * pour le developer mais pas que") and it is the half that does work — a lead, a
   * designer or a PM reading the page has just been shown a terminal and needs telling
   * that the window is for them too.
   */
  'site.builtFor.title': 'Built for developers. Not only for developers.',
  /**
   * ONE LINE THAT NAMES THE FIVE CARDS WITHOUT LISTING THEM: the backlog, the keyboard,
   * the Mac, the settings, the shortcut that summons it. A subtitle that enumerated them
   * would be read instead of the grid rather than into it.
   *
   * IT ENDED "rather than the way we do" AND NO LONGER DOES, at the product owner's
   * request. The clause set the reader against us to make its point, and the sentence does
   * not need an adversary: "set up the way you work" already says the whole thing, and
   * saying only that is the more confident line.
   *
   * NO EM DASH EITHER, and it went in the same pass — the owner asked for it out. The list
   * of three places was hinged to the closing clause with one, which is a punctuation mark
   * this catalogue reaches for rather a lot; a comma carries the same join here, and the
   * sentence reads faster without the pause.
   */
  'site.builtFor.subtitle':
    'The window your tickets, your agents and your terminals live in: on your Mac, on your keyboard, one shortcut away from wherever you already were, and set up the way you work.',
  /**
   * The Tasks card, and its title is the app's own name for the screen — the same call
   * `/features` makes for its Tasks row. The line under it says the whole claim rather
   * than half of it: not only that the backlog is in the window, but that a ticket in it
   * is one click from an agent running on it.
   */
  'site.builtFor.tasksTitle': 'Tasks',
  'site.builtFor.tasksDesc':
    'Every open issue and every backlog ticket, from GitHub and from Jira, grouped by repository in one window. Click one and an agent starts on it — no id to copy, no tab to go and find.',
  /**
   * The keyboard card. "Your hands never leave it" is the promise; the drawing beside
   * this prints three real chords, so the sentence is free to make the claim rather than
   * spend itself listing keys.
   *
   * IT WAS "Keyboard shortcuts" AND THE OWNER RENAMED IT to "Keyboard navigation", which
   * is the narrower and the better word. A shortcut is any key that saves a click; what
   * the three rows below actually show is MOVING — a new agent, the next one, the split
   * view — and "navigation" is the claim a reader can check against the drawing. It also
   * stops the card from reading as a duplicate of the app's own Settings section, which
   * is called Keyboard Shortcuts and lists eight of them.
   */
  'site.builtFor.shortcutsTitle': 'Keyboard navigation',
  'site.builtFor.shortcutsDesc':
    'A new agent, the next one, the split view: every move in the app has a chord. Your hands never leave the keyboard.',
  // The seven rows of the shortcut sheet, in the order they are drawn. They MIRROR the
  // app's own `settings.shortcuts.*` labels rather than paraphrasing them, so the site and
  // the Settings pane call the same key the same thing. "Split View" is the app's own name
  // for the mode and is capitalised as the app capitalises it.
  //
  // IT WAS THREE ROWS AND THE OWNER ASKED FOR MORE, to fill a card that grew taller when
  // the Tasks window beside it went full width. These seven are every chord in the app
  // that MOVES you; ⌘D, which duplicates an agent, is the one left out because duplicating
  // is not navigating.
  //
  // TWO OF THEM ARE SHORTER THAN THE APP'S OWN, and it is the only place this family bends
  // that rule. The app says "Toggle agents list" and "Toggle agent info"; in French those
  // are "Afficher/masquer la liste des agents" and its twin, which against a pair of
  // keycaps on a third-width card wrap to three lines and stop being a sheet. The nouns
  // alone name the same thing and are what anyone says out loud.
  'site.builtFor.shortcutNew': 'New agent',
  'site.builtFor.shortcutNext': 'Next agent',
  'site.builtFor.shortcutPrev': 'Previous agent',
  'site.builtFor.shortcutSplit': 'Split View',
  'site.builtFor.shortcutAgents': 'Agents list',
  'site.builtFor.shortcutInfo': 'Agent info',
  'site.builtFor.shortcutClose': 'Archive agent',
  /**
   * The Mac card. The product owner supplied this one nearly word for word with the
   * reference — speed, memory, battery — and the three of them together are what "native"
   * means to somebody who has been handed a browser in a frame before and noticed.
   */
  'site.builtFor.macTitle': 'Truly Mac-native',
  // "Not a web page in a window" IS THE LINE THIS CARD NEEDS, and it went away for a round.
  // While the drawing was a capture of the macOS menu bar, the sentence named the menu bar
  // too — picture and copy agreeing. The drawing is Apple's own mark now, which says the
  // platform in one glyph and leaves the sentence free to say the thing the glyph cannot:
  // that this is not Electron chrome wearing a Mac's clothes. The menu bar has its own row
  // on `/features` (`site.features.menuBar*`), which is where that fact belongs.
  'site.builtFor.macDesc':
    'Built specifically for Mac, with speed, low memory use and battery life in mind. Not a web page in a window.',
  /**
   * The settings card. The reference was a screenshot from another product; the wording is
   * ours, and every item named is something the app really exposes.
   *
   * REWRITTEN AT THE OWNER'S REQUEST, and the two changes pull in the same direction. The
   * THEME went in — "j'aimerais qu'on ajoute à la description le fait qu'on puisse changer
   * le theme de l'application" — and it belongs at the FRONT, because it is the one item
   * on the list a non-developer recognises as theirs to change; a sentence that opened on
   * commit formats was a sentence that told half the readers of this band that this card
   * was not for them.
   *
   * "Set once, per repository" CAME OUT, and it was doing real damage for one line of
   * precision. It is true of the middle of the list and false of the theme and the
   * shortcuts, which are per-machine; and its job was to reassure a developer that the
   * configuration does not have to be repeated, which is a worry you only have once you
   * have decided to configure something. The sentence it was crowding out is the card's
   * actual claim, and the owner asked for it in as many words: the app bends to how you
   * work. That is what closes the line now.
   */
  'site.builtFor.yoursTitle': 'Make it yours',
  'site.builtFor.yoursDesc':
    'The app’s theme, the keyboard shortcuts, the commit format, the pull request template, the language each surface speaks and how far an agent may go on its own. Bend it until it works the way you do.',
  /**
   * The Spotlight card. "Wherever you are" is literal and is the whole feature: the
   * shortcut is global, so the bar comes up over the editor, the browser or nothing at
   * all. "Quick Launch" is the window's own name inside the app, which is why it appears
   * in the sentence — the reader will meet it there.
   */
  'site.builtFor.spotlightTitle': 'Spotlight',
  'site.builtFor.spotlightDesc':
    'One global shortcut opens Quick Launch wherever you are. Type a ticket, press enter, and the agent is already running by the time you switch back.',

  // ── The cloud band ────────────────────────────────────────────────────────
  /**
   * THE BAND THE PRODUCT OWNER PLACED "juste après « Fait pour les développeurs. Pas
   * seulement pour eux. »" — `components/site/home/CloudSection.tsx`: the half of the
   * product that opens in a browser, argued in a heading, a paragraph and three rows
   * beside a drawing of the dashboard loading.
   *
   * THE HEADLINE NAMES THE CONFIGURATION AND NOT THE CLOUD, which is the decision worth
   * defending because "Cloud" is what the band is called everywhere else — the nav row,
   * the page title, the brief itself. A headline reading "The cloud" would be a category
   * label, and every product in this market claims the category. "Your configuration is
   * not on one machine" is a FACT about this one, and it is the fact the project's own
   * CLAUDE.md is emphatic about: Supabase is the single source of truth and there is no
   * local config file at all. It is also the objection the band above raises — five cards
   * about living in one window, and nothing yet about the second Mac or the colleague's.
   *
   * THE PARAGRAPH IS THE THREE ROWS IN PROSE, then the payoff. It names what the
   * organization holds (plans, repositories, invitations) and closes on signing in
   * somewhere else, because that last clause is the only sentence in the band a reader
   * can check against their own week. `site.cloudPage.lead` makes the same promise for
   * the page; that one is a promise of SCOPE for a page still being written, this is an
   * argument on a landing page, and they are allowed to overlap in subject without
   * sharing a string.
   *
   * THE BUTTON'S LABEL NAMES THE PAGE and not the action — `site.appBand.cta`'s call,
   * two bands up, and the same word the header's own Product row uses for that route, so
   * somebody told "it's under Product → Cloud" finds the same thing.
   */
  'site.cloudBand.title': 'Your configuration is not on one machine.',
  'site.cloudBand.subtitle':
    'It lives in your organization, and the dashboard in your browser is where you look at it: the plans your team has written, the repositories and invitations the organization shares, and your own account. Sign in on another Mac and everything is already there.',
  'site.cloudBand.cta': 'See the cloud',

  /**
   * THE THREE ROWS UNDER THE PARAGRAPH — the same `FeaturePoints` list with the same
   * brand-blue outline glyphs the two splits above carry, asked for in those words ("un
   * titre description + 3 points avec icon bleu").
   *
   * THEY ARE THE DASHBOARD'S OWN THREE PAGES, in the order its navigation bar puts them:
   * `/plans`, `/organization`, `/account`. The brief named them as such — "Liste des plan
   * / Organisation settings / Your Account management" — and the rows keep that order
   * rather than reordering by importance, because a reader who follows the button meets
   * the three in this order at the top of the product. `CloudSection.tsx` takes their
   * icons from `TopNav.tsx` for the same reason.
   *
   * "THE PLANS YOUR TEAM HAS WRITTEN" AND NOT "THE LIST OF PLANS", which is the one row
   * that was rewritten rather than translated. A list is a screen; a plan somebody wrote
   * is a thing. And "plan" is this product's own noun — a `/magic:plan` session, its spec
   * and the tickets it filed (`plans.subtitle`) — not a subscription tier, which is the
   * reading the second half of the row rules out. If pricing tiers ever need a row here,
   * they need a different word.
   *
   * SHORT, LIKE `site.appBand.point*` AND UNLIKE THE SKILLS BAND'S: there is a picture of
   * the thing beside them, so the rows are the caption to it. A row that restated the
   * paragraph would be read twice and believed once.
   */
  'site.cloudBand.pointPlans': 'The plans your team has written',
  'site.cloudBand.pointOrg': 'Your organization, its team and its repositories',
  'site.cloudBand.pointAccount': 'Your account, managed from the browser',

  // ── Security and privacy, two bands under "who the app is for" ────────────
  //
  // THE ONE FAMILY ON THIS PAGE WHERE A WRONG SENTENCE IS A LIE ABOUT SECURITY, so every
  // string below was written against the source and `lib/security.ts` records, card by
  // card, which file each claim was checked in. Two things are deliberately NOT said —
  // "your code never leaves your machine", which is false because Claude Code sends it to
  // Anthropic, and any statement of compliance, hosting or certification, which is the
  // company's to make and not a landing page's. That module's header holds both arguments.
  //
  // NO PATH, NO FLAG AND NO FILE NAME IS SPELLED HERE except the branch names, which are
  // git's own words in both languages and are what the reader has to recognise for the
  // claim to land. Everything else a translator could get wrong — the glob patterns the
  // commit skill resets, the name of the switch — stays out of the catalogue and is
  // described rather than quoted.
  //
  // NO EM DASH IN THIS BLOCK, on the owner's instruction — the four card descriptions
  // first, then the subtitle in a second pass. The only one left is in the retired
  // `injection` pair, which nothing renders; it takes the rule the day the card comes back.
  //
  // EVERY DASH BECAME WHATEVER THAT DASH WAS DOING, and no word moved — the constraint that
  // matters in a family where the sentences were each checked against a source file:
  //
  //   • `gdprDesc` and `guardDesc` had a dash standing in for a sentence break, so they got
  //     the full stop it was standing in for;
  //   • `secretsDesc` had a MATCHED PAIR around a parenthetical, so it got commas;
  //   • the SUBTITLE also had a matched pair, and commas were wrong there. The pair scoped
  //     three items to the word "configuration" and left the skill name outside it, which
  //     is the whole distinction the sentence exists to draw: the three ARE your config,
  //     the skill name is telemetry. Flattened to commas, all four read as one list and the
  //     sentence quietly starts calling telemetry configuration. So the colon takes the
  //     scoping the opening dash was doing and a full stop takes the closing one, which
  //     gives the skill name its own sentence — where it is more exposed than it was, not
  //     less. See the note on the subtitle itself for why that is the right direction.
  //
  // IT IS A HOUSE-STYLE RULE AND NOT A TYPOGRAPHIC ONE, so nothing tests for it: the rest
  // of this catalogue — and these very comments — use the em dash freely, and a guard here
  // would either be wrong everywhere else or would have to carve out this one block, which
  // is more machinery than a preference is worth. If it ever becomes the page's rule rather
  // than this block's, that is the point to write the test.
  /**
   * The band's `h2`. A CLAIM rather than the category label the product owner named the
   * block with ("Security & Privacy"): every other headline on this page is a sentence,
   * and a heading that only names a topic reads as a section divider in a document.
   *
   * IT IS ALSO THE STRONGEST TRUE THING THE BAND CAN SAY. "Your code never leaves your
   * machine" is stronger and false; this one is exactly what
   * `desktop/src/main/usage/skill-invocations.ts` states of itself.
   */
  'site.security.title': 'Magic Slash never sees your code.',
  /**
   * WHAT THE CLOUD HOLDS, ITEMISED, because a privacy claim a reader cannot check is worth
   * nothing. Three items and then three denials, in that order: the list is short enough to
   * print, which is the whole argument, and the denials are what a developer actually wants
   * ruled out.
   *
   * "The name of the skill you ran" is precise and deliberately unflattering — it would
   * have been easy to leave the telemetry out of a paragraph about privacy, and a reader
   * who later found it would be right to conclude the page had been drafted around it.
   *
   * THE COLON IS LOAD-BEARING and replaced a pair of em dashes when the owner asked for the
   * dashes out of this block. It scopes the three items to the word "configuration" and
   * leaves the skill name outside that scope, which is the sentence's whole point: those
   * three ARE your config, and the skill name is telemetry sitting beside it. A comma in
   * the colon's place would have made one flat list of four and quietly filed telemetry
   * under configuration — a small slip, in the one family on this page where a small slip
   * is a false statement about privacy.
   *
   * WHICH IS WHY THE SKILL NAME NOW HAS ITS OWN SENTENCE rather than a subordinate clause.
   * That is MORE prominence than the dash gave it, not less, and it is the right direction
   * for the reason the paragraph above gives: the telemetry is the one item here a reader
   * would be annoyed to discover later, so the punctuation should never be what makes it
   * easy to skim past.
   */
  'site.security.subtitle':
    'The skills run in your own terminal, on your own clone. What the cloud holds is your configuration: your repositories, your languages, your commit format. And the name of the skill you ran. Not a prompt, not an argument, not a line of code.',
  /**
   * The acronym inside the European emblem on the GDPR card. The regulation has a French
   * name, and a French reader does not recognise the English one — which is why this is a
   * catalogue key and not a literal in the drawing. See `SECURITY_CHROME.gdprMark`.
   */
  'site.security.gdprMark': 'GDPR',
  /** ① The repository. "The machine you are sitting at" rather than "locally", because the
   * abstraction is the thing a reader is trying to see through. */
  'site.security.repoTitle': 'Your repository stays yours',
  'site.security.repoDesc':
    'Nothing is cloned to a server. The agent works in a worktree on the machine you are sitting at, and the only thing about your code that ever reaches us is which repositories you told the app about.',
  /**
   * ② GDPR. IT SAYS WHAT IS STORED AND STOPS THERE. Naming the three things is a fact about
   * the code and can be checked; "we are GDPR compliant" is a legal position, and a card
   * cannot hold one. The badge beside it carries the signal.
   */
  'site.security.gdprTitle': 'The data we hold, in one line',
  'site.security.gdprDesc':
    'Your account, your repository settings, and how many hours each skill ran. That is the list. No source, no prompts, no diffs. And one switch stops the hours being counted at all.',
  /**
   * ③ The commit guard rail. THE BRANCH NAMES ARE SPELLED OUT because they are what makes
   * the claim concrete: a reader recognises their own default branch in that list, and
   * "protected branches" is a phrase that could mean anything.
   */
  'site.security.guardTitle': 'A guard rail on every commit',
  'site.security.guardDesc':
    'It will not write on main, master, develop or staging without stopping to ask you. It offers to cut a branch instead. One setting turns that question into a permanent no.',
  /**
   * ④ Secrets. "Even when your gitignore let them through" IS THE CARD. Everyone believes
   * their gitignore is right; the claim is only worth making because it holds when it is
   * not, and that is precisely what the skill's own comment says the patterns are for.
   */
  'site.security.secretsTitle': 'Secrets never make it into a commit',
  'site.security.secretsDesc':
    'Environment files, credentials, private keys and certificates are pulled back out of the staging area before a commit is written, even when your gitignore let them through, and you are told which ones.',
  /**
   * RETIRED, AND KEPT. This pair dressed a fifth card — "a ticket cannot give the agent
   * orders" — cut when the band went to two rows of two. It stays in the catalogue for the
   * reason every other retired family on this page does (`app/(marketing)/page.tsx` keeps
   * that list): nothing tests for an unused key, and bringing the card back should cost one
   * row in `lib/security.ts` rather than a rewrite.
   *
   * IT IS WORTH BRINGING BACK. The last sentence is the part nobody else advertises: an
   * agent that silently ignored an injected instruction would be safe and useless to you,
   * because you would never learn somebody had put one in your pull request. Reporting it
   * is what all eight skills actually require.
   */
  'site.security.injectionTitle': 'A ticket cannot give the agent orders',
  'site.security.injectionDesc':
    'Tickets, review comments and pull request descriptions are read as data about a change, never as instructions. An instruction hidden in one is quoted back to you rather than followed — so you find out it was there.',

  // ── ② How it works ─────────────────────────────────────────────────────────
  'site.how.title': 'How it actually works.',
  'site.how.subtitle': 'You describe. It builds. You approve.',
  'site.how.step1Title': 'You describe',
  'site.how.step1Desc':
    'Say what you want built: a feature, a fix, a cleanup. In your words, not a spec.',
  'site.how.step2Title': 'It builds',
  'site.how.step2Desc':
    "An agent takes the job and works it start to finish, following your project's conventions.",
  'site.how.step3Title': 'You approve',
  'site.how.step3Desc':
    'You get finished work to review, not a pile of code to sort out.',
  // The commands, kept on the page on purpose: they are the actual surface a user
  // types, so hiding them entirely would leave "it gets built" unexplained.
  'site.how.commandsTitle': 'The eight commands',
  'site.how.commandsIntro': 'Type <strong>/magic:</strong> to find them all at once.',
  'site.how.planDesc': '<strong>/magic:plan</strong> turns an idea into tickets, ready to build.',
  'site.how.startDesc': '<strong>/magic:start</strong> picks up a task and starts building it.',
  'site.how.continueDesc': '<strong>/magic:continue</strong> resumes a job you left open.',
  'site.how.commitDesc': '<strong>/magic:commit</strong> saves the work with a clear message.',
  'site.how.prDesc': '<strong>/magic:pr</strong> opens the pull request, ready to review.',
  'site.how.reviewDesc': '<strong>/magic:review</strong> reviews it against your conventions.',
  'site.how.resolveDesc': '<strong>/magic:resolve</strong> applies the review feedback.',
  'site.how.doneDesc': '<strong>/magic:done</strong> closes it out and cleans up.',
  'site.how.seeDocs': 'See the docs',

  // ── The eight commands ─────────────────────────────────────────────────────
  // One line each, and deliberately NOT the `site.how.*Desc` family above: those open
  // with the command's own name in `<strong>`, which the card already prints as its
  // title. These say what the command DOES and nothing else.
  //
  // The list itself — the ids, the order, the icons — is `lib/commands.ts`, which has
  // no imports so the root test suite can read it. Only the prose lives here, keyed by
  // the same ids, so adding a command is one entry in each of three files rather than a
  // renumbering.
  'site.commands.subtitle':
    'One for each step of the cycle. Type <strong>/magic:</strong> and Claude Code lists them all.',
  'site.commands.plan':
    'Turns a rough idea into a spec you can review, then into an epic and the stories under it.',
  'site.commands.start': 'Reads the ticket, prepares the branch, and starts building.',
  'site.commands.continue':
    'Picks a job back up exactly where you — or a colleague — left it.',
  'site.commands.commit': 'Cuts the work into atomic commits, each with a clear message.',
  'site.commands.pr': 'Pushes, opens the pull request, updates the ticket.',
  'site.commands.review':
    'Reads the diff back against your project’s conventions, and leaves its findings on the lines they belong to.',
  'site.commands.resolve':
    'Applies the review feedback — and argues back where a suggestion deserves a compromise rather than obedience.',
  'site.commands.done':
    'Closes the ticket once the PR is merged, then removes the worktree and every local file in it, and deletes the branch.',

  // ── The features grid ──────────────────────────────────────────────────────
  // Nine cards, each a title, one line, and a link to where the thing is written up.
  // Every destination is a section that EXISTS — eight anchors in the documentation
  // and one on this page — because a tile that 404s is worse than a tile that is not
  // there. `commands` is the on-page one: it opens `#commands` above rather than a
  // detail page nobody has written.
  'site.features.title': 'All features',
  'site.features.subtitle': 'Nine things the product does — and where each one is written up.',
  /** Shared by all nine cards: the link is the card, this is only its wording. */
  'site.features.learnMore': 'Learn more',
  'site.features.commandsTitle': 'Eight commands',
  'site.features.commandsDesc': 'One per step, from the first idea to the merge.',
  'site.features.workflowsTitle': 'Workflows',
  'site.features.workflowsDesc': 'The chains of commands that carry a whole task.',
  'site.features.desktopTitle': 'Features',
  'site.features.desktopDesc': 'Up to twelve agents at once, each in its own worktree.',
  'site.features.multiRepoTitle': 'Several repositories',
  // The row is drawn (`ReposSettingsMockup`), so the line under it carries the whole
  // claim: one repository is one configuration, the organization's admin owns it, a
  // member inherits it, and the skills follow it.
  'site.features.multiRepoDesc':
    'One GitHub repository, one Magic Slash configuration. The organization’s administrator sets it — commit format, languages, pull requests, tickets, code conventions — and every member who joins the team inherits it at once. It can be changed at any time, and the /magic: skills use it and follow it to the letter.',
  'site.features.configurationTitle': 'Your conventions',
  'site.features.configurationDesc':
    'Commit format, languages, templates, pull requests, code conventions, tickets… One organization, one repository, one configuration for the whole team.',
  'site.features.integrationsTitle': 'GitHub and Jira',
  'site.features.integrationsDesc':
    'Tickets, issues and pull requests, read and written in place.',
  // Just "Notifications". It was "Hooks and notifications", which named the mechanism
  // and the outcome in one breath — and the hooks are how it works, not what you get.
  // The same word in both languages, hence its line in `i18n.test.ts`.
  'site.features.hooksTitle': 'Notifications',
  'site.features.hooksDesc': 'Your Mac tells you the moment a job needs you.',
  'site.features.securityTitle': 'Security',
  'site.features.securityDesc':
    'What runs where, what leaves your machine, and what never does.',
  'site.features.troubleshootingTitle': 'Troubleshooting',
  'site.features.troubleshootingDesc':
    'The fixes for what goes wrong, written down rather than remembered.',

  // ── The /features page ─────────────────────────────────────────────────────
  // The page's own chrome, then two family headings and the rows of the four
  // hand-written families. The LIST — which families, in what order, holding which
  // features, under which icon — is `lib/features.ts`, which imports nothing but
  // `lib/commands.ts` so the root test suite can read it. Only the prose lives here.
  //
  // WHAT IS NOT HERE, and it is most of the page: the eight commands reuse
  // `site.commands.<id>` above, and eight more rows reuse pairs the homepage rebuild
  // retired (`site.features.{desktop,configuration,multiRepo,hooks,commands,integrations}*`,
  // `site.how.commandsTitle`, `site.whereItStands.{subtitle,p1}`). Those were already
  // written, already translated and already say the right thing; retyping them would
  // have doubled the catalogue and given the two copies room to disagree.
  //
  // Six titles are absent for a different reason — "Jira", "GitHub", "VS Code",
  // "Claude Code", "Split View" and "Spotlight" are product names, spelled the same in
  // every language, and they live in `LITERAL_TITLES` in `lib/features.ts` instead. An
  // entry here would be an en/fr pair identical on purpose, and therefore a row in
  // `i18n.test.ts`'s exact `SAME_IN_BOTH.site` allow-list. So would the eight commands,
  // which print as `/magic:<id>` for the same reason.
  /** The page's headline reuses `site.features.title` — this is the line under it. */
  'site.features.pageLead': 'Every command, every panel, every switch.',
  /** Heads the sticky sidebar. Names what the list is, not what it does. */
  'site.features.onThisPage': 'On this page',
  /**
   * The integrations family's heading. NOT the retired grid's "GitHub and Jira": this
   * family also holds VS Code, Claude Code, the machine setup and the Tasks list, and a
   * heading naming two of its six rows reads as a promise the rest of them break.
   */
  // "Skills" in both catalogues, on purpose: it is the product's own word for them,
  // the app's own menu says it and so does the documentation. Listed in
  // `i18n.test.ts`'s `SAME_IN_BOTH.site` because of that.
  'site.features.groupSkillsTitle': 'Skills',
  // ── The five group captions on /features ───────────────────────────────────
  // Full-width lines of type between the rows of skill cards. They name the shape of
  // the loop — one to organise, two to get moving, two to propose, two to read back,
  // one to finish — which eight cards of equal weight could not say on their own.
  // The closing note under the skills grid. The grid draws a pipeline; this is the
  // line that stops a reader taking it for a rule. Both examples are real:
  // `/magic:review` handles an external pull request as well as your own, and
  // `/magic:commit` works on whatever is in the tree, however it got there.
  'site.features.sidebarSelfUpdating':
    'The sidebar keeps itself up to date: the skills and Claude Code write the status, the branch, the commits and the pull request into it as the work goes. And everything stays editable by hand, with a click in the desktop app.',
  'site.features.skillsIndependent':
    'The grid reads as a pipeline because a whole ticket usually is one — but every skill stands on its own. Run the eight in order, or reach for a single one: /magic:commit on work you wrote by hand, /magic:review on somebody else’s pull request.',
  'site.features.groupPlan': 'One skill to get organised: an epic, and the stories under it.',
  'site.features.groupBuild': 'Two skills to get the work moving.',
  'site.features.groupPropose': 'Two skills to put it up for review.',
  'site.features.groupReview': 'Two skills to read it back, and answer what comes back.',
  'site.features.groupFinish': 'One skill to finish, and clear the agent that did the work.',
  // ── The /features start card ───────────────────────────────────────────────
  // The four lines the terminal in the `/magic:start` card reports, in the order
  // the skill actually does them. Checked against `skills/magic-start/SKILL.md`
  // rather than invented: read the ticket and resolve the repo (steps 2-3), create
  // the worktree on a new branch (4.1), install dependencies (4.3), write the plan
  // and have it reviewed (5.2).
  // ── The /features plan card ────────────────────────────────────────────────
  // The spec drawn in the `/magic:plan` card. Only these two strings are language:
  // the headings and field names around them stay English in both catalogues,
  // because `skills/magic-plan/references/spec-template.md` §3 freezes them that way.
  // A generic idea on purpose — a real roadmap item here would read as a promise.
  // The label on the button drawn in the `/magic:continue` card. "magic-slash" is
  // the product's name and stays put; the verb around it is language.
  // ── The /features PR card ──────────────────────────────────────────────────
  // Lifted VERBATIM from `desktop/src/i18n/en.ts` — `agentInfo.pr.commentsLabel`,
  // `checksLabel`, `checksPassed`, `mergeable`, `lastChecked`, `refreshAction`,
  // `state.open`. A mockup of a screen that paraphrases its copy is a mockup of a
  // different screen. The job names, the PR number and the repo slug stay literal in
  // the component: they are identifiers, the same in every locale.
  'site.prCard.comments': 'Comments',
  'site.prCard.commentsCount': '3 comments',
  'site.prCard.checks': 'CI checks',
  'site.prCard.checksPending': '1/3 passed',
  'site.prCard.checksDone': '3/3 passed',
  'site.prCard.noConflicts': 'No conflicts',
  'site.prCard.stateOpen': 'Open',
  'site.continueCard.button': 'Continue with magic-slash',
  'site.continueCard.ticketDescription':
    'Lists every feature, grouped, with a sidebar whose entries anchor to their section.',
  // ── The /features done card ───────────────────────────────────────────────
  // The five things `/magic:done` closes out, all checked against its SKILL.md.
  // The last one says MARKED DONE and not "deleted": the skill POSTs
  // `status=PR merged` to the app and leaves the agent in place with its history.
  'site.doneCard.merged': 'Pull request merged',
  'site.doneCard.branch': 'Branch deleted, locally and on the remote',
  'site.doneCard.worktree': 'Local worktree removed',
  'site.doneCard.ticket': 'Ticket commented and closed',
  'site.doneCard.agent': 'Agent marked done in magic-slash',
  'site.planCard.specTitle': 'Offline mode for the editor',
  'site.planCard.specIdea':
    'Let someone keep working through a dropped connection, then reconcile when it comes back. They should never lose a keystroke, and never be told to refresh.',
  // ── The /features review card ──────────────────────────────────────────────
  // The two review comments drawn in the `/magic:review` card. Only the sentences
  // are language: the file paths and the diff lines are code.
  // ── The /features resolve card ─────────────────────────────────────────────
  // A pull request's conversations after `/magic:resolve` has run: two settled, one
  // still open because the reply argued for a compromise instead of obeying. Only the
  // sentences are language — the file paths and the commit SHA are code.
  //
  // The reviewer is somebody else here, unlike next door: the threads this command
  // reads are the ones a `CHANGES_REQUESTED` review left behind.
  'site.resolveCard.reviewer': 'reviewer',
  'site.resolveCard.resolved': 'Resolved',
  'site.resolveCard.open': 'Open',
  // KEPT SHORT ON PURPOSE, both of them. The card clips the last 24px of its panel, and
  // French runs a line longer than English at this measure — so a sentence that fits in
  // English and wraps in French is a sentence whose point is missing from the French
  // page. One line for the ask, two for the answer, in either language.
  'site.resolveCard.comment': 'Give these cards a fixed height.',
  'site.resolveCard.reply':
    'Kept the minimum: a fixed height clips the French copy, which runs longer. Your call.',
  'site.reviewCard.author': 'you',
  'site.reviewCard.comment1':
    'Any marketing page missing from this set is 307-redirected to the app host, so the new route has to be added here as well as created.',
  'site.reviewCard.comment2':
    'This measures on every scroll event, several times per frame. Coalesce it with requestAnimationFrame, and mark the listener passive.',
  // ── The /features Spotlight and notification drawings ──────────────────────
  // Both borrow the app's own strings rather than paraphrasing them. The placeholder is
  // `quickLaunch.placeholder`, identical in both catalogues because it is a ticket id
  // followed by a command; the banner is `notification.waiting.*`, whose body takes the
  // ticket as its subject.
  'site.spotlightCard.placeholder': 'PROJ-123 /start',
  'site.notificationCard.title': 'An agent is waiting for you',
  'site.notificationCard.body': 'PAY-311 needs your answer to continue',
  'site.notificationCard.when': 'now',
  // ── The /features Agents sidebar ───────────────────────────────────────────
  // The app's own left sidebar, redrawn. Its labels are the app's own — from
  // `desktop/src/i18n/` rather than paraphrased — for `site.tasksCard.*`'s reason: a
  // mockup of a screen that rewords it is a mockup of a different screen. "Agents",
  // "Skills" and "Tasks" are the same string in French, which is why `i18n.test.ts`
  // lists them.
  'site.agentsCard.tasks': 'Tasks',
  'site.agentsCard.team': 'Team',
  'site.agentsCard.skills': 'Skills',
  'site.agentsCard.agents': 'Agents',
  'site.agentsCard.attention': 'Needs attention',
  'site.agentsCard.usageSession': 'Session (5h)',
  'site.agentsCard.usageWeek': 'Weekly (7d)',
  // The four states, and why each one is on screen. The names are the app's own words
  // for them; the sentences are this page's, because the app never has to explain a
  // glyph the person is watching change in front of them.
  'site.agentsCard.working': 'At work',
  'site.agentsCard.workingDesc':
    'The agent is running — reading, writing or waiting on a command. Nothing is asked of you.',
  'site.agentsCard.waiting': 'Asking you something',
  'site.agentsCard.waitingDesc':
    'It has hit a decision only you can make: an approval, a choice between two routes, a permission. It stops rather than guesses.',
  'site.agentsCard.completed': 'Done',
  'site.agentsCard.completedDesc':
    'The skill it was running finished. The worktree, the branch and the history are still there for you to read.',
  'site.agentsCard.error': 'Stopped on an error',
  'site.agentsCard.errorDesc':
    'A command failed, or the session ended badly. The transcript is kept, so you can see what happened before it stopped.',
  // ── The /features Tasks modal ──────────────────────────────────────────────
  // The app's Tasks screen, redrawn. Its CHROME is translated because the app
  // translates it, and these are the app's own sentences from `desktop/src/i18n/` rather
  // than paraphrases — a mockup of a screen that reworded it is a mockup of a different
  // screen. What a TRACKER sends is not here at all: statuses, priorities, labels, repo
  // names and logins are printed as they arrive, so they are literals in the component.
  'site.tasksCard.title': 'Tasks',
  'site.tasksCard.section': 'To do',
  'site.tasksCard.reload': 'Reload',
  'site.tasksCard.total': '17 to do',
  'site.tasksCard.countGithub': '9 to do',
  'site.tasksCard.countJira': '8 to do',
  'site.tasksCard.search': 'Search by ticket ID or title…',
  'site.tasksCard.allRepos': 'All repositories',
  'site.tasksCard.sortRecent': 'Newest',
  'site.tasksCard.openGithub': 'Open on GitHub',
  'site.tasksCard.openJira': 'Open in Jira',
  // "agent", the word the row wears beside its dot — the same in both languages, which
  // is why `i18n.test.ts` lists it.
  'site.tasksCard.agent': 'agent',
  // Six invented tickets on an invented project. Prose, so they are copy; the numbers,
  // the keys and the logins beside them are not.
  //
  // SHORT ON PURPOSE, and shorter than a real backlog's would be. The app truncates a
  // title that outruns its row and so does the drawing — faithfully — but a marketing
  // page that shows six tickets and cuts three of them mid-word has spent the drawing on
  // nothing. The two rows carrying an agent marker have the least room of all, which is
  // why their titles are the shortest here.
  // The legend under the Tasks drawing. Four things the screen does that a still image
  // cannot show — each checked against `TaskFilters.tsx`, `TasksRepoSection.tsx` and
  // `renderer/utils/taskRows.ts` rather than written from the feature's reputation.
  'site.tasksCard.legendFiltersTitle': 'Filter it down, then order it',
  'site.tasksCard.legendFiltersDesc':
    'Search on a ticket id or a title, narrow to one repository or one Jira epic, and read the result newest first or by priority.',
  'site.tasksCard.legendFieldsTitle': 'Your board’s own words',
  'site.tasksCard.legendFieldsDesc':
    'A Jira row carries its status, its priority and the epic it hangs off — printed as your site sends them, never translated or re-tiered.',
  'site.tasksCard.legendAvailableTitle': 'Only what is free to take',
  'site.tasksCard.legendAvailableDesc':
    'The sprint’s To Do column, plus the tickets an agent is already on — those marked as taken. Work in flight elsewhere is not offered: the page will not propose to duplicate it.',
  'site.tasksCard.legendTrackersTitle': 'Both trackers, by repository',
  'site.tasksCard.legendTrackersDesc':
    'A GitHub repository’s open issues and a Jira project’s active sprint, each a card of its own — and one card for two services that share a project.',
  'site.tasksCard.gh1': 'Webhook retries drop the idempotency key',
  'site.tasksCard.gh2': 'Rate-limit the public search',
  'site.tasksCard.gh3': 'Checkout returns a 500 when the basket is empty',
  // ── The /features Repositories settings ────────────────────────────────────
  // The app's Settings modal open on Repositories, redrawn (`ReposSettingsMockup`). Same
  // rule as the Tasks drawing above: the chrome is the app's own sentences from
  // `desktop/src/i18n/`, and what the app reads from its config — repo names, an
  // organization's name, a path — is a literal in the component. Three of the eleven tab
  // labels and the agent count are the same string in French, hence their lines in
  // `i18n.test.ts`.
  'site.reposCard.title': 'Settings',
  'site.reposCard.tabAccount': 'Account',
  'site.reposCard.tabConnections': 'Connections',
  'site.reposCard.tabOrganization': 'Organization',
  'site.reposCard.tabRepositories': 'Repositories',
  'site.reposCard.tabApplication': 'Application',
  'site.reposCard.tabClaudeCode': 'Claude Code',
  'site.reposCard.tabNotifications': 'Notifications',
  'site.reposCard.tabAppearance': 'Appearance',
  'site.reposCard.tabLanguage': 'Language & Region',
  'site.reposCard.tabShortcuts': 'Shortcuts',
  'site.reposCard.tabAbout': 'About',
  'site.reposCard.signOut': 'Sign out',
  'site.reposCard.section': 'Repositories',
  'site.reposCard.add': 'Add repository',
  'site.reposCard.personal': 'Personal',
  'site.reposCard.connected': 'Connected',
  'site.reposCard.noLocalFolder': 'No local folder — click to set it',
  'site.reposCard.agents.one': '1 agent',
  'site.reposCard.agents.other': '2 agents',
  // The legend under the drawing: the four claims the row makes, each pointing at a part
  // of the screen. Checked against `pages/Config/index.tsx` and `RepoPage.tsx`.
  'site.reposCard.legendOneConfigTitle': 'One repository, one configuration',
  'site.reposCard.legendOneConfigDesc':
    'Every GitHub repository gets its own settings in Magic Slash — commit format, languages, pull request template, tracker, code conventions — and nothing is shared by accident between two projects.',
  'site.reposCard.legendAdminTitle': 'The organization’s admin owns it',
  'site.reposCard.legendAdminDesc':
    'A shared repository’s configuration is set by an administrator of the organization, once. Members read it; only an admin changes it — and can, at any time.',
  'site.reposCard.legendInheritTitle': 'Whoever joins inherits it',
  'site.reposCard.legendInheritDesc':
    'A new member sees the team’s repositories the moment they sign in, conventions included — before they have cloned a single one. They only point each at a local folder.',
  'site.reposCard.legendSkillsTitle': 'The skills follow it',
  'site.reposCard.legendSkillsDesc':
    'Every /magic: skill reads the repository’s configuration before it acts: the commit it writes, the pull request it opens and the ticket it moves all take that repository’s rules.',
  // ── The /features repository settings page ──────────────────────────────────
  // The repository page redrawn on two tabs (`RepoConfigMockup`). Same rule as every
  // drawing: the chrome, the labels, the help lines and the intro's steps are the app's
  // own sentences from `desktop/src/i18n/`; the command, the format names, the example
  // message, the paths and the tab labels French borrows whole are literals.
  'site.repoPage.subtitle': 'Configure repository settings',
  'site.repoPage.tabGeneral': 'General',
  'site.repoPage.tabLanguages': 'Languages',
  'site.repoPage.tabPlan': 'Planning',
  // The Commit tab.
  'site.commitCfg.intro': 'Turns your working tree into commits. On this repository:',
  'site.commitCfg.stepAtomic':
    'Splits what changed into atomic commits — one logical change each, without asking.',
  'site.commitCfg.stepFormat':
    'Every message is Conventional: the type, then the subject (feat: add login).',
  'site.commitCfg.stepStyle': 'One line per commit, with no body.',
  'site.commitCfg.stepProtected':
    'Never commits onto main, master or develop: it moves the work to a new branch first.',
  'site.commitCfg.tailCoAuthor': 'Claude added as co-author',
  'site.commitCfg.tailTicketId': 'ticket id added to the message',
  'site.commitCfg.styleHelp': 'Single line or multi-line with body',
  'site.commitCfg.styleSingle': 'Single line',
  'site.commitCfg.formatHelp': 'Commit message format/convention',
  'site.commitCfg.formatConventional': 'Conventional (type: description)',
  'site.commitCfg.coAuthor': 'Co-Author',
  'site.commitCfg.coAuthorHelp': 'Add Claude as co-author in commits',
  'site.commitCfg.ticketId': 'Include Ticket ID',
  'site.commitCfg.ticketIdHelp': 'Add ticket ID from branch name in commit message',
  'site.commitCfg.example': 'Example',
  'site.commitCfg.protectedBranch': 'Commits on main branches',
  'site.commitCfg.protectedBranchHelp':
    'Blocked on main, master, develop and this repository’s dev branch — /magic:commit moves the work to a new branch',
  // The table of formats under the drawing.
  'site.commitCfg.tableFormat': 'Format',
  'site.commitCfg.tableShape': 'Shape',
  'site.commitCfg.tableExample': 'Example',
  'site.commitCfg.formatNoneName': 'None',
  'site.commitCfg.formatNoneShape': 'free form',
  // The Pull Request tab.
  'site.prCfg.intro': 'Turns your commits into a pull request. On this repository:',
  'site.prCfg.stepOpen':
    'Runs the project’s checks, pushes the branch, then opens the pull request with its title and description.',
  'site.prCfg.stepAutoLink': 'The description links the GitHub ticket.',
  'site.prCfg.stepAccounts':
    'Tells the reviewer where the test accounts live, without any credentials.',
  'site.prCfg.stepTicketComment':
    'Updates the linked GitHub ticket and comments the pull request link on it.',
  'site.prCfg.stepWatch':
    'Then stays on the pull request: waits for the checks, fixes what fails, handles review feedback, and adds the preview URL to the test scenarios when the project publishes one.',
  'site.prCfg.tailAccountsSource': 'accounts read from docs/test-accounts.md',
  'site.prCfg.autoLink': 'Auto-link Tickets',
  'site.prCfg.autoLinkHelp': 'Add Jira/GitHub ticket links in PR description',
  'site.prCfg.testAccounts': 'Test Accounts',
  'site.prCfg.testAccountsHelp':
    'Whether the PR description mentions the test accounts reviewers can use. Reference is safe on any repository; inline pastes the credentials in the PR body',
  'site.prCfg.testAccountsReference': 'Reference (say where they live)',
  'site.prCfg.testAccountsSource': 'Test Accounts Source',
  'site.prCfg.testAccountsSourceHelp':
    'Optional file path or project skill name holding the accounts (auto-detected when empty)',
  'site.prCfg.template': 'PR Template',
  'site.prCfg.templateHelp': 'Template used when creating pull requests',
  'site.prCfg.templateFound': 'Template found',
  'site.prCfg.groupAfter': 'Once open',
  'site.prCfg.commentOnPR': 'Comment the Ticket',
  'site.prCfg.commentOnPRHelp':
    'Post a comment carrying the pull request link on the ticket, when the PR is created',
  'site.prCfg.watchCI': 'Watch CI & Review',
  'site.prCfg.watchCIHelp':
    'After creating the PR, wait for the checks, fix failures automatically, address review feedback, and add the PR preview URL to the test scenarios when the project publishes one',
  // The list under the drawing: the five things the tab configures, one per row above.
  'site.prCfg.legendAutoLinkTitle': 'Auto-link the issue or the Jira ticket',
  'site.prCfg.legendAutoLinkDesc':
    'The description carries the link to the GitHub issue or the Jira ticket the branch was started from, so a reviewer lands on the why before the diff.',
  'site.prCfg.legendTestAccountsTitle': 'Test accounts',
  'site.prCfg.legendTestAccountsDesc':
    'Tell reviewers which account to log in with — by pointing at the file that holds them, or by pasting the credentials into the PR. Never pasted on a public repository.',
  'site.prCfg.legendTemplateTitle': 'PR template',
  'site.prCfg.legendTemplateDesc':
    'The repository’s own pull request template is found and filled; if there is none, the app generates one for you.',
  'site.prCfg.legendWatchTitle': 'Watch CI & review',
  'site.prCfg.legendWatchDesc':
    'Once open, the agent stays on the PR: waits for the checks, fixes what fails, handles the review feedback, and adds the preview URL to the test scenarios.',
  'site.prCfg.legendCommentTitle': 'Comment the ticket',
  'site.prCfg.legendCommentDesc':
    'When the PR is created, a comment carrying its link is posted on the issue or the Jira ticket — and the ticket moves along its board.',
  // ── The /features launch modes ──────────────────────────────────────────────
  // The five permission modes of the Claude Code tab (`LaunchModesGrid`), each with
  // the app's own help line. Four of the five names are the same word in French, hence
  // their lines in `i18n.test.ts`.
  'site.launchModes.plan': 'Plan',
  'site.launchModes.planHelp': 'Read-only — Claude explores and analyzes but never modifies anything',
  'site.launchModes.default': 'Standard',
  'site.launchModes.defaultHelp': 'Claude asks permission for every sensitive action',
  'site.launchModes.acceptEdits': 'Accept Edits',
  'site.launchModes.acceptEditsHelp': 'Auto-accepts file edits, still asks for bash commands',
  'site.launchModes.auto': 'Auto',
  'site.launchModes.autoHelp': 'Auto-approves most actions based on configured allowlists',
  'site.launchModes.bypass': 'Bypass',
  'site.launchModes.bypassHelp': 'No permission checks — for sandboxed environments only',
  'site.tasksCard.jira1': 'VAT is rounded twice on the invoice PDF',
  'site.tasksCard.jira2': 'Change the card on a live subscription',
  'site.tasksCard.jira3': 'Credit notes are missing from the monthly export',
  'site.startCard.ticket': 'Ticket read, repository resolved',
  'site.startCard.worktree': 'Worktree created on a new branch',
  'site.startCard.deps': 'Dependencies installed',
  'site.startCard.plan': 'Implementation plan written and reviewed',
  'site.startCard.implementing': 'Implementation under way',
  /**
   * The cloud family, and the one heading that is a NOUN. Identical in French — the word
   * is the same in both, which is why it is listed in `i18n.test.ts`'s `SAME_IN_BOTH`,
   * exactly as `site.features.groupSkillsTitle` is.
   */
  'site.features.groupCloudTitle': 'Cloud',
  'site.features.groupIntegrationsTitle': 'Connected to your tools',
  /** The last family: what the app tells you back. Its intro is the homepage band. */
  'site.features.groupInsightsTitle': 'The info sidebar',

  // The desktop family. "Split View" and "Spotlight" are named by the app, so only
  // their descriptions are here; the notifications row reuses the grid's `hooks*` pair.
  'site.features.worktreesTitle': 'One worktree per job',
  'site.features.worktreesDesc':
    'Every agent works in its own checkout of your project, so a feature and a hotfix never touch the same files.',
  'site.features.splitViewDesc':
    'Two agents side by side on a wide screen — the one you are answering, and the one you are watching.',
  'site.features.spotlightDesc':
    'A global shortcut opens Quick Launch from any app: name the ticket, and the agent starts.',
  'site.features.menuBarTitle': 'Always there',
  'site.features.menuBarDesc':
    'It starts at login and keeps going from the menu bar, where the icon says how many agents are waiting on you. The agents work in the background while you twiddle your thumbs.',
  // The review drawer under `Review the changes` — `ReviewDrawerMockup`.
  'site.reviewDrawer.filesChanged': '3 files changed',
  'site.reviewDrawer.line': 'Line 11',
  'site.reviewDrawer.placeholder': 'What should the agent know about these lines?',
  'site.reviewDrawer.comment': 'Round the VAT to the cent before adding it to the total.',
  'site.reviewDrawer.cancel': 'Cancel',
  'site.reviewDrawer.save': 'Save',
  'site.reviewDrawer.delete': 'Delete',
  'site.reviewDrawer.edit': 'Edit',
  'site.reviewDrawer.noComments': 'No comments',
  'site.reviewDrawer.oneComment': '1 comment',
  'site.reviewDrawer.sendToAgent': 'Send to the agent',
  'site.features.filePreviewTitle': 'Review the changes',
  'site.features.filePreviewDesc':
    'A spec still being written or a file changed in the code: open it, walk through the diff, and comment on the line that bothers you. Everything is reviewed and commented from the app, and the agent gets your notes.',

  // The integrations family.
  // ── The cloud family ───────────────────────────────────────────────────────
  // Every line here was checked against what `webapp/app/` actually renders. The roles
  // are the app's own two and their descriptions are `org.role.member.help` and
  // `org.role.admin.help` verbatim; the board's statuses are the `team.status.*` ladder;
  // the plans line is `plans.subtitle`. A page that is read as an inventory does not get
  // to describe a surface it has not opened.
  // The family INTRO carries what a row used to: the cloud is not a second product, it
  // is the same account seen from a browser. A line above all four says it once.
  'site.features.cloudDesc':
    'The same account at app.magic-slash.io, from any machine — your team, your repositories, your plans and your settings. The agents still run on yours.',
  'site.features.teamTitle': 'Your organization, and who is in it',
  'site.features.teamDesc':
    'Create one, or join with the invitation a colleague sent you. Invite by email or by link: a member sees the team and works on shared repositories, an admin invites, changes roles and archives.',
  'site.features.appSettingsTitle': 'Settings that follow you, not the machine',
  'site.features.appSettingsDesc':
    'Appearance, language, notifications, Claude Code — set in the app or here, kept on your account. There is no local config file, so a second machine is configured by signing in.',

  // THE FOUR TITLES NAME AN ACTION, NOT A PRODUCT. The mark on the plate beside each of
  // these says "Jira" or "VS Code" faster than a word can, so the headline is free to
  // say what you actually get out of the connection.
  'site.features.jiraTitle': 'Drive Jira from the app',
  'site.features.jiraDesc':
    'Read the ticket, move it across the board, comment on it — without opening a browser tab.',
  'site.features.githubTitle': 'Ship through GitHub',
  'site.features.githubDesc':
    'Issues, pull requests, review threads and CI checks, read and written where they already live.',
  'site.features.vscodeTitle': 'Open in VS Code',
  'site.features.vscodeDesc':
    'Open a worktree, or the one file an agent mentioned, in the editor you already use.',
  'site.features.claudeCodeTitle': 'Runs on your Claude Code',
  'site.features.claudeCodeDesc':
    'It runs on your own subscription, on your own machine. Nothing is re-hosted in between.',
  'site.features.machineSetupTitle': 'Set up on launch',
  'site.features.machineSetupDesc':
    'The eight skills, the MCP servers, the hooks and the permissions are checked — and installed — every time the app starts.',
  // The row is headed "Tasks", the app's own name for the screen, so the line under it
  // does the describing — and it says the whole claim rather than half of it: not only
  // that the backlog is in the window, but that a ticket in it is one click from an
  // agent running `/magic:start` on it.
  'site.features.tasksDesc':
    'Every open issue and every backlog ticket, from GitHub and from Jira, grouped by repository in your own window — and one click on any of them starts an agent on it with /magic:start.',

  // The configuration family. Its heading and intro are the retired grid's
  // "Your conventions" pair, and the first row is that grid's "Several repositories".
  'site.features.commitFormatTitle': 'The commit format you use',
  'site.features.commitFormatDesc':
    'Conventional, Angular, Gitmoji or free form, one line or with a body, Claude as co-author or not, the ticket id in the message or not — and the rule that decides whether a commit may land on main. Set once per repository, then /magic:commit keeps to it.',
  'site.features.pullRequestsTitle': 'The pull request, your way',
  'site.features.pullRequestsDesc':
    'The ticket linked from the description, the test accounts reviewers need, the repository’s own PR template, a comment posted on the ticket when it opens, and the CI and the review watched until green. Set once per repository, then /magic:pr keeps to it.',
  'site.features.languagesTitle': 'A language per surface',
  'site.features.languagesDesc':
    'One language for the commits, one for the pull requests, one for the comments posted on tickets, one for the spec and the tickets /magic:plan writes — and the one you talk to Claude in, which nobody else reads. Each is chosen on its own, per repository.',
  'site.features.permissionModesTitle': 'How far an agent may go',
  'site.features.permissionModesDesc':
    'Plan, standard, accept edits, auto or bypass — how much an agent does before it asks you.',
  'site.features.profileTitle': 'How it talks to you',
  'site.features.profileDesc':
    'Right after you sign up, a short onboarding form teaches Claude Code who you are: your first name, your role, your technical level, the tone you want and your languages. Every skill reads it before answering, so an answer arrives at the depth you read at. Editable any time from the settings.',
  'site.features.teamReposTitle': 'Repositories the whole team shares',
  'site.features.teamReposDesc':
    'Share a repository with your organization and its conventions travel with it — read-only for members, so only admins change them. The board lists every one, with the agents on it and how far each has got. Your own clone stays on your machine.',

  // The insights family. The agent-panel row's description is the homepage band's own
  // paragraph, which already names the panel's contents one by one.
  // The info sidebar drawing — `InfoSidebarMockup`, the app's own labels.
  'site.features.ticketInfoTitle': 'The ticket, and where it stands',
  'site.features.ticketInfoDesc': 'Id, title, description and status — the agent’s own words for what it is doing, kept up to date at every step. The id is a link: it opens the GitHub issue or the Jira ticket in your browser. No more remembering which Claude Code is on which task: it is all here, and that is one less thing to hold in your head.',
  'site.features.repositoryTitle': 'The branch, the files, the commits',
  'site.features.repositoryDesc': 'The branch, the files the agent touched with their added and removed lines, and the commits already made — read from Git as it happens. Two buttons open the project in VS Code and the repository on GitHub.',
  'site.features.devServerTitle': 'Start a local test server',
  'site.features.devServerDesc': 'The scripts of your package.json are one click away. A server that starts prints its address under the card, and the address opens in your browser.',
  'site.features.pullRequestTitle': 'The pull request, watched live',
  'site.features.pullRequestDesc': 'CI checks, comments and the review’s verdict land in the card as they happen — without opening GitHub.',
  'site.infoSidebar.uncommitted': 'Uncommitted changes',
  'site.infoSidebar.fileOne': '{count} file',
  'site.infoSidebar.files': '{count} files',
  'site.infoSidebar.commits': 'Commits',
  'site.infoSidebar.open': 'Open',
  'site.infoSidebar.scripts': 'Scripts',
  'site.infoSidebar.scriptsDev': 'Dev',
  'site.infoSidebar.scriptsBuild': 'Build',
  'site.infoSidebar.scriptsTest': 'Test',
  'site.infoSidebar.stop': 'Stop',
  'site.agentPanel.stateOpen': 'Open',
  'site.agentPanel.reviewCommented': 'Commented',
  'site.agentPanel.reviewApproved': 'Approved',
  'site.agentPanel.commentOne': '{count} comment',
  'site.agentPanel.commentsCount': '{count} comments',
  // The left sidebar's usage card — `UsageCardMockup`, the app's own labels.
  'site.usageCard.session': 'Session (5h)',
  'site.usageCard.weekly': 'Weekly (7d)',
  'site.usageCard.resetSession': '2h14',
  'site.usageCard.resetWeekly': '3d',
  // The PR comments drawer — `PRCommentsMockup`.
  'site.features.prCommentsTitle': 'The PR comments, read in place',
  'site.features.prCommentsDesc': 'A click on the Comments line opens every thread in a panel: the lines it points at, who wrote it, the verdict, the replies. And any thread can be handed straight to the agent.',
  'site.prComments.threads': '3 threads',
  'site.prComments.oneReply': '1 reply',
  'site.prComments.resolved': 'Resolved',
  'site.prComments.previous': 'Previous',
  'site.prComments.next': 'Next',
  'site.prComments.counter': '1 / 2 code comments',
  'site.prComments.age1': '1h',
  'site.prComments.age2': '32min',
  'site.prComments.age3': '3min',
  'site.prComments.root1': 'The VAT is rounded after being added to the total: on a two-line invoice that is a one-cent gap with the PDF.',
  'site.prComments.reply1': 'Good catch. Fixed in a3f1c92: the rounding happens once, on the total.',
  'site.prComments.summary': 'Approved — thanks for the test that covers the two-line case.',
  // The status table under the ticket card — `StatusPill.tsx`'s options, one sentence each.
  'site.status.planning': 'planning',
  'site.status.planningDesc': '/magic:plan is writing the spec with you.',
  'site.status.planned': 'planned',
  'site.status.plannedDesc': 'The spec is written; nothing has been coded yet.',
  'site.status.inProgress': 'in progress',
  'site.status.inProgressDesc': 'The agent is working on the code.',
  'site.status.committed': 'committed',
  'site.status.committedDesc': 'The work is in commits on the branch, not yet pushed.',
  'site.status.readyForPR': 'ready for PR',
  'site.status.readyForPRDesc': 'Everything is committed; the pull request can be opened.',
  'site.status.prCreated': 'PR created',
  'site.status.prCreatedDesc': 'The pull request is open on GitHub.',
  'site.status.ciGreen': 'CI green',
  'site.status.ciGreenDesc': 'Every check on the pull request has passed.',
  'site.status.inReview': 'in review',
  'site.status.inReviewDesc': 'A reviewer has the pull request in hand.',
  'site.status.changesRequested': 'changes requested',
  'site.status.changesRequestedDesc': 'The review asked for changes; /magic:resolve picks them up.',
  'site.status.reviewAddressed': 'review addressed',
  'site.status.reviewAddressedDesc': 'The requested changes are pushed; the review can resume.',
  'site.status.prMerged': 'PR merged',
  'site.status.prMergedDesc': 'The pull request is merged; /magic:done closes the ticket.',
  // ── The Skills window — `SkillsModalMockup` ─────────────────────────────
  //
  // The row's own copy first, then the drawing's. The heading is not here: the row is
  // titled "Skills", the word on the window's own title bar, which is a `LiteralTitle`
  // in `lib/features.ts` rather than a catalogue entry — see the note there.
  'site.features.skillsPageDesc':
    'Every skill Claude Code can reach, in one window: the ones Magic Slash ships, the ones you wrote, and the ones your repositories carry. Beside them, what their descriptions cost in every single message, and a warning the moment a duplicate or an over-long one starts eating that budget.',
  // WHAT THE APP ITSELF SAYS, key for key. The window's own chrome is translated by the
  // desktop catalogues, so these are those sentences rather than new ones: a reader who
  // opens the app after this page should meet the same words. `desktop/src/i18n/*.ts` is
  // where each of them lives.
  'site.skillsCard.allSkills': 'All skills',
  'site.skillsCard.builtIn': 'Built-in',
  'site.skillsCard.builtInHelp': 'Magic Slash core skills, powering the development workflow',
  'site.skillsCard.custom': 'Custom',
  'site.skillsCard.customHelp': 'User-level skills, available across all projects',
  'site.skillsCard.repos': 'Repository Skills',
  'site.skillsCard.reposHelp':
    'Skills defined in your registered repositories (.claude/skills/ and .claude/commands/)',
  // The three invented skills the cards below the built-in ones are headed with — two of
  // the reader's own and one a repository carries. Their NAMES are directories on disk, so
  // they are literals in the component; these are the descriptions a person wrote.
  'site.skillsCard.deployPreview': 'Ships the branch to a preview environment and posts the URL.',
  'site.skillsCard.releaseNotes': 'Turns the merged pull requests since the last tag into release notes.',
  'site.skillsCard.dbMigrate': 'Writes the migration, runs it against a scratch database, and checks it back.',
  'site.skillsCard.import': 'Import',
  'site.skillsCard.new': 'New skill',
  'site.skillsCard.sourceBuiltIn': 'built-in',
  // The warnings band, and the two controls it offers on the long descriptions.
  'site.skillsCard.warnings': 'Warnings',
  'site.skillsCard.longDesc':
    '2 skills with descriptions longer than 110 words. Consider optimizing them for better performance.',
  'site.skillsCard.words': '{count} words',
  'site.skillsCard.openInVSCode': 'Open in VS Code',
  'site.skillsCard.fixWithAgent': 'Fix with agent',
  // The budget gauge. The two figures are drawn as the app draws them — grouped for the
  // reader's own locale — so they are copy here rather than a number formatted in the
  // component.
  'site.skillsCard.budgetSection': 'Skills Budget',
  'site.skillsCard.budgetHelp': 'What your skill descriptions cost in every single message.',
  'site.skillsCard.windowLabel': 'Context window',
  'site.skillsCard.windowHint': 'Detected from the running agent.',
  'site.skillsCard.chars': 'Characters (enforced)',
  'site.skillsCard.charsValue': '32,400 / 40,000',
  'site.skillsCard.unitChars': 'chars',
  'site.skillsCard.tokens': 'Tokens (estimate)',
  'site.skillsCard.tokensValue': '8,100 / 10,000',
  'site.skillsCard.unitTokens': 'tokens',
  'site.skillsCard.how': 'How this is computed',
  'site.skillsCard.details': 'Details by skill',
  // ── The legend under the drawing ───────────────────────────────────────
  'site.skillsCard.legendRailTitle': 'Every skill on the machine',
  'site.skillsCard.legendRailDesc':
    'The rail lists all three origins at once: the eight Magic Slash ships, the ones you wrote for yourself, and the ones each registered repository carries in .claude/. Click one and it opens beside the list.',
  'site.skillsCard.legendBudgetTitle': 'A budget that follows the model',
  'site.skillsCard.legendBudgetDesc':
    'Claude Code spends about 1% of the context window listing your skills. The gauges are scaled to the window the running agent reports, so the same library reads comfortable on a 1M model and tight on a 200K one.',
  'site.skillsCard.legendWarningsTitle': 'It tells you what is wrong',
  'site.skillsCard.legendWarningsDesc':
    'A name defined twice, a description past 110 words, anything cut before Claude sees it — each one is named, with the file to open and an agent that will rewrite it for you.',
  'site.skillsCard.legendEditTitle': 'Write, import, share',
  'site.skillsCard.legendEditDesc':
    'A skill is a markdown file. This window creates one, imports a folder somebody sent you, edits the instructions in place and exports the whole thing back out.',
  'site.infoSidebar.justNow': 'just now',
  'site.infoSidebar.session': 'Session',
  'site.infoSidebar.context': 'Context',
  'site.infoSidebar.status': 'in review',
  'site.infoSidebar.ticketTitle': 'VAT rounded twice on the PDF invoice',
  'site.infoSidebar.ticketDescription':
    'Line totals are rounded before the VAT is applied, then the VAT is rounded again. Round once, on the total.',
  'site.features.usageTitle': 'Your Claude Code limits',
  'site.features.usageDesc':
    'What is left of your five-hour session and of your rolling week, on every screen of the app.',
  'site.features.agentContextTitle': 'The context the running agent has spent',
  'site.features.agentContextDesc':
    'How much of its window this run has filled, in tokens and as a share — the agent you are looking at, not the account.',
  'site.features.planSessionsTitle': 'Plans, yours and your team’s',
  'site.features.planSessionsDesc':
    'Every /magic:plan session on a repository you can see — the spec it wrote and the tickets it filed. Kept on your account, so a plan outlives the window it was written in.',

  // ── ③ On the product you already have ──────────────────────────────────────
  'site.yourProduct.title': 'On the product you already have.',
  'site.yourProduct.subtitle': 'Not a blank page, not a sandbox.',
  'site.yourProduct.p1':
    'Connect a repository and it picks up your structure, your conventions, and your history.',
  'site.yourProduct.p2':
    'GitHub for pull requests and issues. Jira for tickets. VS Code to jump into any file. Nothing to migrate.',
  'site.yourProduct.seeDocs': 'See the docs',

  // ── ④ Several jobs at once ─────────────────────────────────────────────────
  'site.parallel.title': 'Build several things at once.',
  'site.parallel.subtitle':
    'Up to 12 jobs in parallel, each in its own isolated copy of your project. Nothing collides.',
  'site.parallel.p1':
    'Start a feature, fix a bug, clean up an old module — at the same time, without them stepping on each other.',
  'site.parallel.p2':
    'One screen shows every job and where it stands. Your Mac tells you when something needs you.',
  'site.parallel.cta': 'More about the app',

  // ── ⑤ It works your way ────────────────────────────────────────────────────
  'site.yourWay.title': 'It works your way.',
  'site.yourWay.subtitle':
    'Every project has its habits. Magic Slash learns yours and sticks to them.',
  'site.yourWay.p1':
    'Set the conventions once per project — how commits read, which language, which templates. Ten projects, ten sets of habits.',
  'site.yourWay.p2':
    'Work arrives finished: nothing half-done, nothing to clean up behind it.',
  'site.yourWay.seeDocs': 'See the docs',

  // ── ⑥ You always know where it stands ──────────────────────────────────────
  // The section ④ raises the question for: twelve jobs in flight only works if each one
  // says where it is. The copy names the states out loud — in review, changes requested,
  // CI — because that is the vocabulary the reader already has for "where is it", and the
  // panel beside it is showing those exact words.
  'site.whereItStands.title': 'You always know where it stands.',
  'site.whereItStands.subtitle':
    'Every job has its own panel: what it is working on, and how far it has got.',
  'site.whereItStands.p1':
    'The ticket, the branch, the commits, the pull request — read from GitHub and Jira as it happens, never typed in by hand.',
  'site.whereItStands.p2':
    'Waiting on a review? Changes requested? A red check? You see it without opening a single tab.',
  'site.whereItStands.cta': 'See the full workflow',

  // ── ⑦ Why we built this (teaser for /story) ────────────────────────────────
  'site.why.title': 'Why we built this.',
  'site.why.p1':
    'We were using Claude Code every day on real projects. And every time, the same routine: read the ticket, rewrite it as a prompt, set up the branch by hand, write the commit, describe the PR. It worked. It was just slow and boring.',
  'site.why.p2':
    'So we automated the boring parts — and kept going until the whole thing built itself.',
  'site.why.cta': 'Read our story',

  // ── FAQ (`/faq`) ───────────────────────────────────────────────────────────
  //
  // A PAGE NOW, and it used to be band ⑧ of the homepage. Five of these questions were
  // written for that band and outlived it: the band was cut in the rebuild and the keys
  // sat here unread, which is why `site.faq.viewAll` — the row that pointed at a FAQ
  // that did not exist yet — is gone rather than renumbered.
  //
  // KEYED BY SUBJECT (`site.faq.<subject>.{q,a}`) rather than by position. The doc
  // catalogue this replaces was `site.doc.<section>.<n>`, positional because 675
  // paragraphs of prose have no stable identity but their place in the document. Eleven
  // questions do: each one is ABOUT something, the page's order is `QUESTIONS` in
  // `lib/faq.ts` rather than the numbering here, and a question that gets reordered or
  // dropped should not renumber the ten around it.
  //
  // ANSWERS ARE ONE PARAGRAPH, three sentences at the outside. A collapsed row is a
  // promise that opening it is cheap; an answer that turns out to be a page of prose
  // breaks it, and the reader who needed that much detail was never going to find it
  // inside an accordion.
  // ── The FAQ band on the homepage ───────────────────────────────────────────
  //
  // BAND ⑧ IS BACK, and it is not the one that was cut. That band WAS the FAQ — five
  // questions and nothing else, on a page with no FAQ to send anyone to. This one is a
  // WINDOW onto `/faq`: the five questions that stop a reader pressing the download
  // button, beside a title, a line and a button out to the other six. `HOME_QUESTION_IDS`
  // in `lib/faq.ts` says which five and why.
  //
  // ITS OWN THREE KEYS, not `site.faq.title` and `site.faq.lead` — the band and the page
  // are two surfaces, and sharing copy between two surfaces is the mistake
  // `site.finalCta.*` exists to have fixed. "Frequently asked questions" is an `h1` over
  // eleven rows; a band arriving after five screens of product can be warmer than that,
  // and its line has to account for showing five of the eleven.
  'site.homeFaq.title': 'Still wondering.',
  'site.homeFaq.subtitle':
    'The five we get asked before anyone installs it. Commit formats, credentials, updates, uninstalling — the rest is on the FAQ.',
  'site.homeFaq.cta': 'Read the FAQ',

  'site.faq.title': 'Frequently asked questions',
  'site.faq.lead':
    'Everything about installing Magic Slash, configuring it, and living with it day to day.',
  'site.faq.stillStuck': 'Still stuck? Ask us directly.',
  'site.faq.openIssue': 'Open an issue on GitHub',

  // First on purpose. The site reads wide; this is where it stays honest about who the
  // product actually serves today — see the note at the top of this file.
  'site.faq.developer.q': 'Do I need to be a developer?',
  'site.faq.developer.a':
    "You need a codebase and a little comfort with Git. You don't need to write the code — that's the point — but this isn't a no-code tool: it works on real projects.",

  'site.faq.price.q': 'Is Magic Slash free?',
  'site.faq.price.a':
    'Yes. Magic Slash is open source and free to use. The one thing it assumes you already have is <strong>Claude Code</strong>, since every command runs inside it.',

  'site.faq.prerequisites.q': 'What do I need before installing it?',
  'site.faq.prerequisites.a':
    'Three things: <strong>Claude Code</strong>, installed and authenticated; <strong>Node.js 20</strong> or newer, which the Jira and GitHub MCP servers run on; and <strong>Git 2.20</strong> or newer, for worktree support. The first launch checks all three, installs the eight skills into <code>~/.claude/skills/</code> and configures the MCP servers — there is no script to run.',

  'site.faq.platforms.q': 'Which operating systems are supported?',
  'site.faq.platforms.a':
    'The desktop app is a native macOS build, universal for Intel and Apple Silicon. The commands themselves are Claude Code skills, so they run wherever Claude Code does — macOS, Linux, and Windows through WSL 2.',

  'site.faq.trackers.q': 'Does it work with GitHub Issues, or only Jira?',
  'site.faq.trackers.a':
    'Both, natively, and you pick which one per repository. A Jira key like <code>PROJ-123</code> goes through the Atlassian MCP server; a number like <code>#456</code> is looked up as a GitHub issue across the repositories you configured.',

  'site.faq.languages.q': 'Does it work with any language or framework?',
  'site.faq.languages.a':
    'Yes — Magic Slash is language-agnostic, and works on any codebase Claude Code can read. It detects your package manager from the lockfile (npm, pnpm, yarn, bun, pip, poetry, cargo, go, bundler, composer) so a fresh worktree comes up with its dependencies installed.',

  'site.faq.commitFormat.q': 'Can I change the commit and pull request format?',
  'site.faq.commitFormat.a':
    'Yes, per repository. Pick <strong>Conventional Commits</strong>, <strong>Angular</strong> or <strong>Gitmoji</strong> for the message, set your own branch prefixes, and choose the language of your commits, pull requests and ticket comments independently.',

  'site.faq.terminal.q': 'Do I have to use the desktop app?',
  'site.faq.terminal.a':
    'No. The eight commands work in any terminal, in VS Code and in the JetBrains IDEs — anywhere Claude Code runs. The app is what adds the parts a terminal cannot: several agents side by side, live tracking of what each one is doing, the ticket beside the code, and a notification when one of them needs you.',

  'site.faq.credentials.q': 'Where are my credentials stored?',
  'site.faq.credentials.a':
    'Magic Slash holds no tokens of its own. Jira authenticates through the Atlassian MCP server over OAuth in your browser, and GitHub uses a personal access token kept in <code>~/.claude/settings.json</code>, which the skills never read directly. The bridge between Claude Code and the app binds to <code>127.0.0.1</code> on a random port per session, so nothing of it is reachable from your network.',

  'site.faq.updates.q': 'How do updates work?',
  'site.faq.updates.a':
    'The app checks GitHub Releases at launch, downloads a new version in the background, then offers <strong>Restart</strong> or <strong>Later</strong> in the sidebar — nothing takes over your screen. The eight built-in skills are re-synced at the same time; skills you wrote yourself are never touched.',

  'site.faq.uninstall.q': 'How do I uninstall it?',
  'site.faq.uninstall.a':
    'One script: <code>install/uninstall.sh</code>. It removes the eight skills, the Jira and GitHub MCP servers, every permission the setup added to <code>~/.claude/settings.json</code>, the app itself and <code>~/.config/magic-slash/</code>. Your repositories and your Claude Code install are left exactly as they were.',

  // ── Closing CTA ────────────────────────────────────────────────────────────
  // ── Closing CTA (homepage) ─────────────────────────────────────────────────
  //
  // SEPARATE FROM `site.cta.*`, which `/story` renders in its own closing block. The two
  // pages ended on the same three keys, so retuning one rewrote the other; these belong
  // to the homepage's dark closing sheet and nothing else reads them.
  'site.finalCta.title': 'Upgrade your product builder workflow today.',
  'site.finalCta.subtitle': 'Try Magic Slash.',
  'site.finalCta.button': 'Get Magic Slash for Mac',

  'site.cta.title': 'Start building.',
  'site.cta.subtitle': 'Free, and about a minute to set up.',
  'site.cta.button': 'Start free',

  // ── Hero mockup ────────────────────────────────────────────────────────────
  // The window CHROME of the animated app mockup, and only that. The terminal's own
  // lines are not here: they are the log the real product prints, and it prints English,
  // so they lived as literals in `AppMockup.tsx` beside the run they belonged to — that
  // component is deleted, and `home/AppWindowMockup.tsx` holds its own the same way.
  // `{n}` is
  // substituted by the animation, which reads these off `data-` attributes so it never
  // has to know a user-facing string itself.
  'site.mockup.menuNewAgent': 'New agent',
  'site.mockup.menuSkills': 'Skills',
  'site.mockup.menuTeam': 'Team',
  'site.mockup.agentsLabel': 'AGENTS',
  'site.mockup.needsAttention': 'Needs attention',
  'site.mockup.usageSession': 'Session (5h)',
  'site.mockup.usageWeekly': 'Weekly (7d)',
  // The scripted run: an earlier job that finished, then the one being built now.
  'site.mockup.autoMode': 'auto mode on (shift+tab to cycle)',
  'site.mockup.replay': 'Replay',
  'site.mockup.session': 'SESSION',
  'site.mockup.context': 'Context',
  'site.mockup.commits': 'Commits',
  'site.mockup.aheadOfMain': '{n} ahead of main',
  'site.mockup.addRepo': 'Add a repository',
  'site.mockup.scripts': 'Scripts',
  'site.mockup.open': 'Open',

  // The ticket's status pill, one label per step the run takes it through. These follow
  // the app's own status vocabulary (`statusPill.*` in the desktop catalogues), because
  // this is the same pill showing the same workflow.
  'site.mockup.inProgress': 'in progress',
  'site.mockup.ticketInReview': 'in review',
  'site.mockup.ticketReviewed': 'reviewed',
  'site.mockup.ticketDone': 'done',
  'site.mockup.uncommitted': 'Uncommitted',
  'site.mockup.oneFile': '{n} file changed',
  'site.mockup.manyFiles': '{n} files changed',
  'site.mockup.inReview': 'in review',
  'site.mockup.merged': 'merged',

  // ── Repository settings illustration (section ⑤) ────────────────────────────
  // Every label here is copied from the app's own `repo.*` catalogue rather than
  // rewritten, so the illustration says what the screen it is drawing says. The VALUES
  // beside them (main, magic-slash, PROJ-142…) are literals in `RepoSettings.tsx`, the
  // way the terminal's log lines are.
  'site.repoCfg.subtitle': 'Configure repository settings',
  'site.repoCfg.scope': 'Scope',
  'site.repoCfg.personal': 'Personal',
  'site.repoCfg.personalHelp':
    'Only you can see this repository. Share it with an organization to make it a team repo.',
  // THE TEAM HALF OF THE SCOPE ROW, added when `SharedConfigArt` gave this family a
  // consumer again. The row has two states and the catalogue only held one: `personal`
  // above, and now the state a shared repository is actually in. All three mirror the
  // desktop's own `repo.scope.*` word for word rather than paraphrasing them — the drawing
  // is a reproduction of that row, so the site and the app say the same sentence.
  'site.repoCfg.teamNamed': 'Team — {name}',
  'site.repoCfg.teamHelp':
    'Shared with the organization — every member sees it and binds their own local folder.',
  'site.repoCfg.makePersonal': 'Make personal',
  'site.repoCfg.general': 'General',
  'site.repoCfg.name': 'Name',
  'site.repoCfg.nameHelp': 'Repository display name',
  'site.repoCfg.keywords': 'Keywords',
  'site.repoCfg.keywordsHelp': 'Auto-detection keywords (comma-separated)',
  'site.repoCfg.discussionLang': 'Discussion Language',
  'site.repoCfg.discussionLangHelp': 'Language used by Claude when discussing with you',
  'site.repoCfg.color': 'Color',
  'site.repoCfg.colorHelp': 'Project color in sidebar',
  'site.repoCfg.branches': 'Branches',
  'site.repoCfg.development': 'Development Branch',
  'site.repoCfg.developmentHelp': 'Base branch for comparing commits',
  'site.repoCfg.worktree': 'Worktree',
  'site.repoCfg.files': 'Files to copy',
  'site.repoCfg.filesHelp':
    'Files copied from the main repo to new worktrees (e.g., .env, .env.local)',
  'site.repoCfg.add': 'Add',
  'site.repoCfg.commit': 'Commit',
  'site.repoCfg.language': 'Language',
  'site.repoCfg.commitLangHelp': 'Language used for commit messages',
  'site.repoCfg.style': 'Style',
  'site.repoCfg.styleHelp': 'Single line or multi-line with body',
  'site.repoCfg.styleSingle': 'Single line',
  'site.repoCfg.format': 'Format',
  'site.repoCfg.formatHelp': 'Commit message format/convention',
  'site.repoCfg.formatAngular': 'Angular (type(scope): description)',
  'site.repoCfg.coAuthor': 'Co-Author',
  'site.repoCfg.coAuthorHelp': 'Add Claude as co-author in commits',
  'site.repoCfg.ticketId': 'Include Ticket ID',
  'site.repoCfg.ticketIdHelp': 'Add ticket ID from branch name in commit message',
  'site.repoCfg.example': 'Example',
  'site.repoCfg.resolve': 'Resolve',
  'site.repoCfg.commitMode': 'Commit Mode',
  'site.repoCfg.commitModeHelp': 'How to commit resolve changes',
  'site.repoCfg.modeNew': 'New commit',
  'site.repoCfg.commitFormat': 'Commit Format',
  'site.repoCfg.commitFormatHelp': 'Format source for resolve commit messages',
  'site.repoCfg.useCommitConfig': 'Use commit settings',
  'site.repoCfg.pr': 'Pull Request',
  'site.repoCfg.prLangHelp': 'Language used for pull request titles and descriptions',
  'site.repoCfg.autoLink': 'Auto-link Tickets',
  'site.repoCfg.autoLinkHelp': 'Add Jira/GitHub ticket links in PR description',
  'site.repoCfg.watchCI': 'Watch CI & Review',
  'site.repoCfg.watchCIHelp':
    'After creating the PR, wait for the checks, fix failures automatically, address review feedback, and add the PR preview URL to the test scenarios',
  'site.repoCfg.issues': 'Jira / GitHub Issues',
  'site.repoCfg.commentLang': 'Comment Language',
  'site.repoCfg.commentLangHelp': 'Language used for Jira and GitHub issue comments',
  'site.repoCfg.commentOnPR': 'Comment on PR Creation',
  'site.repoCfg.commentOnPRHelp': 'Add a comment with PR link when creating a pull request',
  'site.repoCfg.jiraUrl': 'Jira URL',
  'site.repoCfg.jiraUrlHelp': 'Base URL for Jira tickets (e.g., PROJ-123)',
  'site.repoCfg.danger': 'Danger Zone',
  'site.repoCfg.delete': 'Delete this repository',
  'site.repoCfg.deleteHelp': 'Remove this repository from Magic Slash configuration',
  'site.repoCfg.deleteAction': 'Delete repository',

  // ── Agent panel illustration (section ⑥) ────────────────────────────────────
  // The app's right sidebar, label for label: every entry here is copied from the
  // desktop catalogue's `agentInfo.*`, `prReview.*` and `statusPill.*` families rather
  // than rewritten, so the illustration says what the panel it is drawing says. The
  // VALUES beside them (PROJ-142, stellar-api, the commit subjects, the figures) are
  // literals in `AgentPanel.tsx`, the way the terminal's log lines are.
  'site.agentPanel.title': '{name} Info',
  'site.agentPanel.closeAgent': 'Close agent',
  'site.agentPanel.ago': '{time} ago',
  'site.agentPanel.justNow': 'just now',
  'site.agentPanel.tokens': '{used} tokens',
  // The ticket's status pill, one label per step the panel walks through.
  'site.agentPanel.statusPrCreated': 'PR created',
  'site.agentPanel.statusCiGreen': 'CI green',
  'site.agentPanel.statusChangesRequested': 'changes requested',
  'site.agentPanel.statusReviewAddressed': 'review addressed',
  'site.agentPanel.statusPrMerged': 'PR merged',
  // The pull request card: its verdict badge, then its checklist.
  'site.agentPanel.prNumber': 'Pull request #{number}',
  'site.agentPanel.reviewPending': 'Awaiting review',
  'site.agentPanel.reviewChanges': 'Changes requested',
  'site.agentPanel.merged': 'Merged',
  'site.agentPanel.comments': 'Comments',
  'site.agentPanel.checks': 'CI checks',
  'site.agentPanel.checksPassed': '{passed}/{total} passed',
  'site.agentPanel.noConflicts': 'No conflicts',
  'site.agentPanel.launchDone': 'Launch magic-done',
  'site.agentPanel.lastChecked': 'checked {time}',
  'site.agentPanel.refresh': 'Refresh',

  // ── Story page ─────────────────────────────────────────────────────────────
  'site.story.label': 'Our Story',
  'site.story.heroTitle': 'We got tired of<br>the copy-paste.',
  'site.story.heroIntro':
    'We were using Claude Code every day, on real projects, with real Jira tickets. And every single time, we were doing the same thing: reading the ticket, rephrasing it into a prompt, creating worktrees by hand, committing manually, writing PR descriptions from scratch. It worked. But it was slow, repetitive, and boring.',
  'site.story.painTitle': 'What it looked like before.',
  'site.story.painSubtitle':
    'Every task meant the same tedious routine. Here’s what we were doing 5 to 10 times a day.',
  'site.story.pain1Title': 'Read and understand the ticket',
  'site.story.pain1Desc':
    'Open Jira, read the title, the description, the acceptance criteria. Understand what needs to be done, then switch to the terminal and rephrase it all as a prompt for Claude Code.',
  'site.story.pain2Title': 'Create the worktree manually',
  'site.story.pain2Desc':
    'Figure out the branch name from the ticket ID, run git worktree add, cd into it, make sure you’re on the right base branch. Every. Single. Time.',
  'site.story.pain3Title': 'Write the perfect prompt',
  'site.story.pain3Desc':
    'Translate the Jira spec into the best possible prompt. Copy-paste the acceptance criteria, add context about the codebase, hope you didn’t forget anything important.',
  'site.story.pain4Title': 'Commit, PR, describe',
  'site.story.pain4Desc':
    'Stage changes, write a conventional commit message, push, open the PR, write the description, link the Jira ticket, update the status. All by hand.',
  'site.story.pain5Title': 'Review comments on your own',
  'site.story.pain5Desc':
    'Read each review comment, understand the feedback, fix the code, force-push, resolve the threads. No help, no automation.',
  'site.story.pain6Title': 'Clean up (if you remember)',
  'site.story.pain6Desc':
    'Once merged, delete the worktree, the local branch, the remote branch. One time out of five, you forget, and stale branches pile up.',
  'site.story.timelineTitle': 'How we got here.',
  'site.story.timelineSubtitle':
    'From a brainstorm to a product used daily by the team.',
  'site.story.tl1Date': 'Early January 2026',
  'site.story.tl1Title': 'The first brainstorm',
  'site.story.tl1Desc':
    'Initial idea: a Chrome extension that adds a button to Jira tickets to copy the spec and paste it into a manually launched Claude Code. Simple, but not enough.',
  'site.story.tl2Date': 'January 2026',
  'site.story.tl2Title': 'Pivot to slash commands',
  'site.story.tl2Desc':
    'After the brainstorm, the decision is clear: forget the extension, let’s build Claude Code slash commands powered by the GitHub and Atlassian MCP servers — pulling in Jira tickets and GitHub Issues natively. Direct, fast, no context-switching.',
  'site.story.tl3Date': 'Mid-January 2026',
  'site.story.tl3Title': 'First version of magic-slash',
  'site.story.tl3Desc':
    'magic-slash ships with a landing page, a <code>/start</code> command to kick off tasks from Jira tickets, and a polished install CLI for a top-notch developer experience. Fetch the spec, create the branch, start coding — one command.',
  'site.story.tl4Date': 'Late January 2026',
  'site.story.tl4Title': '/commit and /done arrive',
  'site.story.tl4Desc':
    '<code>/commit</code> for fast conventional commits and <code>/done</code> to push, open the PR, and update Jira. The full cycle starts to take shape. Slash commands evolve into Claude Code skills for a smoother experience.',
  'site.story.tl5Date': 'February 2026',
  'site.story.tl5Title': 'Battle-tested by the team',
  'site.story.tl5Desc':
    'magic-slash goes into heavy daily use across the dev team. Real tickets, real PRs, real feedback. Every pain point surfaces and gets fixed.',
  'site.story.tl6Date': 'Early March 2026',
  'site.story.tl6Title': 'Magic-slash desktop is born',
  'site.story.tl6Desc':
    'New problem: with 7-8 Claude instances running in terminals, nobody knew which agent was working on what. Way too much time wasted on context recovery. So we built a desktop app to see everything at a glance — up to 12 agents in parallel, each on its own ticket.',
  'site.story.tl7Date': 'March 2026',
  'site.story.tl7Title': 'From 3 skills to 7 — the full dev flow',
  'site.story.tl7Desc':
    'The skill set grows from 3 to 7 with a complete development cycle. <code>/done</code> becomes <code>/pr</code> for creating pull requests, and a new <code>/done</code> handles ticket closure after merge. <code>/review</code> and <code>/resolve</code> land to automate code reviews and address feedback. Plus a full month of desktop app testing, bug fixes, and UI refinements.',
  'site.story.tl8Date': 'April 2026',
  'site.story.tl8Title': 'Rebranding & the Ninja Rabbit',
  'site.story.tl8Desc':
    'New identity drops with a mascot: the Ninja Rabbit. A sword for the Slash, a white rabbit as a symbol of magic. Fresh landing page, new visual direction.',
  'site.story.tl9Date': 'Coming soon',
  'site.story.tl9Title': 'What’s next?',
  'site.story.tl9Desc':
    'More integrations, smarter reviews, and a lot more. Stay tuned.',
  'site.story.ctaTitle': 'Ready to try?',
  'site.story.ctaDesc': 'Install magic-slash and see the difference.',
  'site.story.ctaBtn': 'Start free',

  // ── Changelog page ─────────────────────────────────────────────────────────
  // The chrome of `/changelog`, and ONLY the chrome. The releases themselves are
  // parsed out of `CHANGELOG.md` at build time and rendered as written — they come
  // from commit messages at release time and have no French source, which is why the
  // three category names below are the only words on that page a translator touches.
  // The keys are declared in `lib/changelogPage.ts` so `changelogPage.test.ts` looks
  // every one of them up here for real.
  'site.changelog.title': 'Changelog',
  'site.changelog.lead':
    'Every release of magic-slash, newest first — what was added, what changed, what was fixed.',
  'site.changelog.readOnGithub': 'Read CHANGELOG.md on GitHub',
  'site.changelog.showMore': 'Show older versions',
  'site.changelog.unavailable': 'The changelog could not be read when this page was built.',
  // The three headings `parseChangelog` recognises. Nouns rather than the past
  // participles the file itself uses ("Added"): these label a GROUP of entries, and a
  // group is a thing rather than an action.
  'site.changelog.added': 'Added',
  'site.changelog.changed': 'Changed',
  'site.changelog.fixed': 'Fixed',

  // ── Footer ─────────────────────────────────────────────────────────────────
  'site.footer.tagline': 'Your product, built.',
  'site.footer.product': 'Product',
  'site.footer.features': 'Features',
  'site.footer.commands': 'The commands',
  'site.footer.download': 'Download',
  'site.footer.howItWorks': 'How it works',
  'site.footer.gettingStarted': 'Getting Started',
  'site.footer.updates': 'Updates',
  'site.footer.configuration': 'Configuration',
  'site.footer.changelog': 'Changelog',
  'site.footer.resources': 'Resources',
  'site.footer.documentation': 'Documentation',
  'site.footer.faq': 'FAQ',
  'site.footer.ourStory': 'Our Story',
  /**
   * The third column. It is LEGAL rather than the `company` heading above it because
   * every entry in it is a document, and every one of those documents lives on GitHub:
   * there is no `/terms` and no `/privacy` route on this site (story #273 adds them),
   * and `hostRouting.ts` would 307 a link to either straight to the app host. So the
   * column points off-site on purpose — `site.footer.termsLink` and
   * `site.footer.privacyLink` stay unused below until there is somewhere to send them.
   */
  'site.footer.legal': 'Legal',
  'site.footer.security': 'Security policy',
  'site.footer.company': 'Company',
  'site.footer.license': 'License',
  'site.footer.reportIssue': 'Report an issue',
  'site.footer.termsLink': 'Terms',
  'site.footer.privacyLink': 'Privacy',
} as const
