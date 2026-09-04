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
  /** The header's Product dropdown: its trigger, then the entry that opens the
      homepage's own features grid. Its five other entries reuse the documentation
      keys below — `skillsReference`, `gettingStarted`, `configuration`,
      `documentationCategory` and `changelog` were orphaned when the Resources menu
      lost its columns, and are back rather than retyped under new names. */
  'site.nav.product': 'Product',
  'site.nav.allFeatures': 'All features',
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
  'site.hero.title': 'From idea to merged PR.',
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
    'Several agents in parallel, in a single app. It tracks who is working on what, so you don’t have to.',
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

  // ── The desktop band ───────────────────────────────────────────────────────
  /**
   * THE BAND DIRECTLY UNDER THE HERO — `components/site/home/DesktopSection.tsx`, which
   * puts the app's own window on the page for the first time.
   *
   * The title is the PRODUCT'S NAME and is therefore the same string in both catalogues,
   * which is why it has a line in `i18n.test.ts`'s exact `SAME_IN_BOTH.site` allow-list.
   * THE BARE NAME, and it lost a word to get there: it read "Magic Slash desktop" first,
   * on the argument that the band had to say which of the product's surfaces this is. It
   * does not. The window under the heading is unmistakably an application, the subtitle
   * says agents run in it, and "desktop" was a category label doing work the picture had
   * already done — the kind of word a title keeps only until someone reads it aloud.
   */
  'site.desktop.title': 'Magic Slash',
  /**
   * TWO LINES, and it is a length rather than a break — there is no `<br>` in it, because
   * a hard break at this width becomes four lines on a phone. See the note in
   * `DesktopSection.tsx`.
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
    'Several Claude agents at work at once, each in its own worktree. Watch, steer and answer them from one window.',
  /**
   * The titlebar's own button in the drawn window, `agentInfo.closeAgent` in the app's
   * catalogues. A key rather than a literal because the APP translates it — the literals
   * in that drawing are the ones the product prints in English whatever the language
   * (branch names, commit subjects, `v0.88.0`, ticket ids).
   */
  'site.desktop.archiveAgent': 'Archive the agent',
  /**
   * THE FOUR HIGHLIGHTS under the window, and every one of them is a fact this site
   * already states somewhere else — see the note on `HIGHLIGHTS` in `DesktopSection.tsx`
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
