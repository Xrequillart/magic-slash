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
 * gets built — on the product you already have. The seven commands did not go away;
 * they moved from the headline into `site.how.*`, where they belong as the concrete
 * "how", with the reference living in the documentation.
 *
 * The one thing deliberately NOT promised anywhere: that a non-developer can use this.
 * `site.faq.q1` says so outright. The page is meant to read wide and stay honest — a
 * visitor who converts and then cannot onboard costs more than one who never converted.
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
  'site.hero.title': "Describe what's next.<br>It gets built.",
  'site.hero.subtitle':
    'Magic Slash works on the product you already have — and takes each job start to finish.',
  'site.hero.cta': 'Start free',
  /** Scrolls to the "how it works" section rather than leaving for the docs. */
  'site.hero.howCta': 'See how it works',

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
  'site.how.commandsTitle': 'The seven commands',
  'site.how.commandsIntro': 'Type <strong>/magic:</strong> to find them all at once.',
  'site.how.startDesc': '<strong>/magic:start</strong> picks up a task and starts building it.',
  'site.how.continueDesc': '<strong>/magic:continue</strong> resumes a job you left open.',
  'site.how.commitDesc': '<strong>/magic:commit</strong> saves the work with a clear message.',
  'site.how.prDesc': '<strong>/magic:pr</strong> opens the pull request, ready to review.',
  'site.how.reviewDesc': '<strong>/magic:review</strong> reviews it against your conventions.',
  'site.how.resolveDesc': '<strong>/magic:resolve</strong> applies the review feedback.',
  'site.how.doneDesc': '<strong>/magic:done</strong> closes it out and cleans up.',
  'site.how.seeDocs': 'See the docs',

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

  // ── ⑧ FAQ ──────────────────────────────────────────────────────────────────
  'site.faq.title': 'FAQ & Troubleshooting',
  // First on purpose. The page reads wide; this is where it stays honest about who
  // the product actually serves today.
  'site.faq.q1': 'Do I need to be a developer?',
  'site.faq.a1':
    "You need a codebase and a little comfort with Git. You don't need to write the code — that's the point — but this isn't a no-code tool: it works on real projects.",
  'site.faq.q2': 'Is Magic Slash free?',
  'site.faq.a2':
    'Yes. Magic Slash is open-source and free to use. You just need a Claude Code subscription.',
  'site.faq.q3': 'Does it work with GitHub Issues?',
  'site.faq.a3':
    'Absolutely. Magic Slash supports both Jira and GitHub Issues out of the box.',
  'site.faq.q4': 'Can I customize the commit format?',
  'site.faq.a4':
    'Yes. Choose between Conventional Commits, Angular, Gitmoji, or define your own format per project.',
  'site.faq.q5': 'Does it work with any language or framework?',
  'site.faq.a5':
    'Yes. Magic Slash is language-agnostic — it works with any codebase Claude Code can handle.',
  'site.faq.viewAll': 'View all FAQ',

  // ── Closing CTA ────────────────────────────────────────────────────────────
  'site.cta.title': 'Start building.',
  'site.cta.subtitle': 'Free, and about a minute to set up.',
  'site.cta.button': 'Start free',

  // ── Hero mockup ────────────────────────────────────────────────────────────
  // The window CHROME of the animated app mockup, and only that. The terminal's own
  // lines are not here: they are the log the real product prints, and it prints English,
  // so they live as literals in `AppMockup.tsx` beside the run they belong to. `{n}` is
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

  // ── Footer ─────────────────────────────────────────────────────────────────
  'site.footer.tagline': 'Your product, built.',
  'site.footer.product': 'Product',
  'site.footer.howItWorks': 'How it works',
  'site.footer.gettingStarted': 'Getting Started',
  'site.footer.updates': 'Updates',
  'site.footer.configuration': 'Configuration',
  'site.footer.changelog': 'Changelog',
  'site.footer.resources': 'Resources',
  'site.footer.documentation': 'Documentation',
  'site.footer.faq': 'FAQ',
  'site.footer.ourStory': 'Our Story',
  'site.footer.company': 'Company',
  'site.footer.license': 'License',
  'site.footer.reportIssue': 'Report an issue',
  'site.footer.termsLink': 'Terms',
  'site.footer.privacyLink': 'Privacy',
} as const
