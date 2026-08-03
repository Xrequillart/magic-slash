/**
 * The public site's message catalogue — everything under `app/(marketing)`.
 *
 * Lifted from the `i18n` object in `docs/script.js`, which is the wording that has
 * been live on magic-slash.io. Kept SEPARATE from `lib/i18n/en.ts` rather than
 * merged into it: the app catalogue is product copy that mirrors the desktop app
 * word for word, this one is marketing copy that gets rewritten on its own cadence,
 * and one 800-line file with both invites edits to the wrong half. `lib/i18n/index.ts`
 * merges the two into the single flat namespace `t()` reads.
 *
 * Every key is prefixed `site.` so the two catalogues can never collide — both have a
 * `nav.` and a `footer.` family meaning entirely different things.
 *
 * ── Markup in the values ──
 * Some values carry HTML, because the copy needs a line break in a headline or a bold
 * command name mid-sentence, and splitting those into three keys makes them
 * untranslatable. Only `<br>`, `<strong>` and `<code>` appear, and they are rendered
 * by `RichText` (`components/site/RichText.tsx`) via `dangerouslySetInnerHTML` — safe
 * because this file is the entire input and it is checked into the repo.
 *
 * Two things from the original are deliberately NOT here:
 *   - `<i data-feather="…">` icons. The original ran `feather.replace()` over the
 *     rendered DOM; here the icon is a `lucide-react` element next to the text, so it
 *     is typed, tree-shaken, and cannot be broken by a translator moving a tag.
 *   - The version badge that was inlined in `nav.changelog`. It is a number that
 *     changes every release, not copy — it lives in `lib/siteVersion.ts`.
 */

export const marketingEn = {
  // ── Nav ────────────────────────────────────────────────────────────────────
  'site.nav.product': 'Product',
  'site.nav.productCategory': 'Product',
  // Shortened for the nav row; the footer still says "Desktop App" in full.
  'site.nav.desktopApp': 'App',
  'site.nav.skills': 'Skills',
  'site.nav.resources': 'Resources',
  'site.nav.getStarted': 'Get started',
  /** The header's account control, signed out. Signed in it shows the email instead. */
  'site.nav.signIn': 'Sign in',
  'site.nav.account': 'Your account',
  'site.nav.documentationCategory': 'Documentation',
  'site.nav.gettingStarted': 'Getting Started',
  'site.nav.skillsReference': 'Skills Reference',
  'site.nav.configuration': 'Configuration',
  'site.nav.viewAllDocs': 'View all docs',
  'site.nav.communityCategory': 'Community',
  'site.nav.faq': 'FAQ',
  'site.nav.updatesCategory': 'Updates',
  'site.nav.changelog': 'Changelog',
  'site.nav.ourStory': 'Our Story',

  // ── Hero ───────────────────────────────────────────────────────────────────
  'site.hero.title': 'The boring parts,<br>automated.',
  'site.hero.subtitle': 'From ticket to merge — without the busywork.',
  'site.hero.cta': 'Get started',
  /** The hero's secondary action, beside the primary one that opens the app. */
  'site.hero.docsCta': 'See docs',

  // ── Desktop mockup (the fake app window in the hero) ───────────────────────
  'site.desktop.newAgent': 'New agent',
  'site.desktop.skills': 'Skills',
  'site.desktop.settings': 'Settings',
  'site.desktop.agents': 'Agents',
  'site.desktop.inProgress': 'In Progress',
  'site.desktop.ticketTitle': 'Add JWT auth middleware',
  'site.desktop.ticketDesc':
    'Implement token validation and refresh logic for the API gateway.',
  'site.desktop.repositories': 'Repositories',
  'site.desktop.filesChanged': '3 files changed',
  'site.desktop.aheadOfMain': '2 ahead of main',
  'site.desktop.heroLabel': 'Desktop App',
  'site.desktop.heroTitle': 'All your agents,<br>one screen.',
  'site.desktop.heroIntro':
    'Track every agent in real time. See tasks, diffs, and Jira context side by side — without juggling terminals. Built for developers who run multiple tasks at once.',

  // ── Section 1 — Seven skills ───────────────────────────────────────────────
  'site.section1.title': '7 skills.<br>Entire workflow.',
  'site.section1.subtitle': 'From ticket to merge in seven slash commands.',
  'site.section1.startDesc':
    '<strong>/magic:start</strong> grabs your ticket and creates the branch.',
  'site.section1.continueDesc':
    '<strong>/magic:continue</strong> resumes work on an existing ticket.',
  'site.section1.commitDesc':
    '<strong>/magic:commit</strong> stages, splits, and writes your commit message.',
  'site.section1.prDesc': '<strong>/magic:pr</strong> pushes and creates the pull request.',
  'site.section1.reviewDesc':
    '<strong>/magic:review</strong> reviews a PR with your team conventions.',
  'site.section1.resolveDesc':
    '<strong>/magic:resolve</strong> addresses review comments and pushes fixes.',
  'site.section1.doneDesc':
    '<strong>/magic:done</strong> finalizes after merge — cleans up and updates Jira.',
  'site.section1.prefixHint': 'Type <strong>/magic:</strong> to find all commands at once.',
  'site.section1.noContext':
    'No context switching. No copy-pasting ticket IDs. Just flow.',
  'site.section1.seeDocs': 'See docs',

  // ── Section 2 — Skills manager ─────────────────────────────────────────────
  'site.section2.skillsTitle': 'Skills',
  'site.section2.newSkill': 'New skill',
  'site.section2.startDesc': 'Fetch ticket and create branch',
  'site.section2.continueDesc': 'Resume work on existing ticket',
  'site.section2.commitDesc': 'Smart commit with context',
  'site.section2.prDesc': 'Push and create pull request',
  'site.section2.reviewDesc': 'Review PR with team conventions',
  'site.section2.resolveDesc': 'Address review comments',
  'site.section2.doneDesc': 'Finalize after merge',
  'site.section2.deployDesc': 'Build, test and deploy to staging',
  'site.section2.title': 'Manage Claude Code skills.',
  'site.section2.p1':
    'Add, edit and organize your Claude Code skills directly from the desktop app. Each skill is a simple markdown file — no config files to hunt down.',
  'site.section2.p2':
    "Built-in skills get you started instantly. Create custom ones for your team's workflows, deploy pipelines, or code standards.",
  'site.section2.seeDocs': 'See docs',

  // ── Section 3 — Configuration ──────────────────────────────────────────────
  'site.section3.title': 'One config.<br>Every repo.',
  'site.section3.p1':
    'Tailor commit style, PR templates, and language per repository. Choose between Conventional Commits, Angular, Gitmoji, or free-form formats.',
  'site.section3.p2':
    'Write commits in English or French. Auto-sync Jira tickets and use your own PR templates with AI-powered summaries.',
  'site.section3.seeDocs': 'See docs',
  'site.section3.commitFormat': 'Commit format',
  'site.section3.language': 'Language',
  'site.section3.jiraSync': 'Jira sync',
  'site.section3.prTemplate': 'PR template',

  // ── Section 4 — Multi-agent ────────────────────────────────────────────────
  'site.section4.agents': 'Agents',
  'site.section4.title': '12 agents.<br>One window.',
  'site.section4.p1':
    'Launch parallel Claude Code instances and see everything at a glance. Visual status per agent, macOS native notifications, and drag-and-drop to reorder.',
  'site.section4.p2':
    'Info sidebar with full agent context. Color-coded projects for instant recognition.',
  'site.section4.seeDocs': 'See docs',

  // ── Section 5 — Integrations ───────────────────────────────────────────────
  'site.section5.title': 'Plugs into your stack.',
  'site.section5.p1':
    'Native integrations with GitHub for PRs, issues, and reviews. Jira for tickets and status sync. VS Code to open files and projects.',
  'site.section5.p2':
    'Full Git support with worktrees and branches. Everything connected, nothing manual.',
  'site.section5.seeDocs': 'See docs',

  // ── Skills banner ──────────────────────────────────────────────────────────
  'site.skillsBanner.title': '7 skills.<br>Entire workflow.',
  'site.skillsBanner.subtitle':
    'From ticket to merge in seven slash commands. Each skill handles one step of your development cycle — grab a ticket, code, commit, open a PR, review, resolve comments, and close. Run multiple tasks in parallel using Git worktrees — each agent works in its own isolated branch, so nothing conflicts. No context switching, no copy-pasting. Just flow.',
  'site.skillsBanner.cta': 'Discover the skills',

  // ── Section 6 — Ticket context ─────────────────────────────────────────────
  'site.section6.agentInfo': 'Agent info',
  'site.section6.inProgress': 'In Progress',
  'site.section6.ticketTitle': 'Add user authentication flow',
  'site.section6.ticketDesc':
    'Implement OAuth 2.0 login with Google and GitHub providers. Add session management and token refresh logic.',
  'site.section6.filesChanged': '3 files changed',
  'site.section6.noCommits': 'No committed changes',
  'site.section6.title': 'Your ticket, always in context.',
  'site.section6.p1':
    "When you <strong>/magic:start</strong> a ticket, magic-slash fetches the title, description, and metadata from Jira or GitHub Issues. Every command you run knows what you're working on.",
  'site.section6.p2':
    'Commit messages reference the right ticket. PRs include the full context. No more tab-switching to copy-paste issue details.',
  'site.section6.seeDocs': 'See docs',

  // ── Desktop app ────────────────────────────────────────────────────────────
  'site.desktopApp.title': 'All your agents, one screen.',
  'site.desktopApp.p1':
    'Track every agent in real time. See tasks, diffs, and Jira context side by side — without terminals.',
  'site.desktopApp.p2':
    'Jira tickets, Git status, and PR tracking — always visible, always in sync.',
  'site.desktopApp.cta': 'Explore the app',
  'site.desktopApp.feat1Title': 'Split view',
  'site.desktopApp.feat1Desc':
    'Run two agents side by side. Drag and drop between panes, each scrolling independently.',
  'site.desktopApp.feat2Title': 'Live agent tracking',
  'site.desktopApp.feat2Desc':
    'Real-time status for every agent, grouped by workflow stage. Native notifications when something needs your attention.',
  'site.desktopApp.feat3Title': 'Context panel',
  'site.desktopApp.feat3Desc':
    'A sidebar showing the linked ticket, Git branch, uncommitted changes, commits, and PR status — all updating in real time.',
  // feat3Desc2/feat3Desc3 and the whole feat13 family were referenced by
  // `docs/desktop.html` but missing from its catalogue, so they never translated —
  // the same gap as `site.footer.desktopApp`. English lifted from the page's own
  // fallback text; the French is new.
  'site.desktopApp.feat3Desc2':
    'Below that, the Git state in real time: current branch, uncommitted file changes with per-file addition/deletion counts, and a visual gauge that shows the diff ratio at a glance. You can see exactly what the agent has touched before it even commits.',
  'site.desktopApp.feat3Desc3':
    'Further down, the commit history with short hashes and relative timestamps, plus a count of how many commits are ahead of the base branch. And when a PR exists, it appears at the bottom with its review status — open, approved, or changes requested — linked directly to GitHub.',
  'site.desktopApp.feat4Title': 'Keyboard-first',
  'site.desktopApp.feat4Desc':
    'Every action mapped to a shortcut. Navigate, split, toggle sidebars — all without the mouse.',
  'site.desktopApp.feat5Title': 'Skills budget',
  'site.desktopApp.feat5Desc':
    'Token and character usage per skill with weight categories. Create and manage skills with per-repo scoping.',
  'site.desktopApp.feat6Title': 'Script runner',
  'site.desktopApp.feat6Desc':
    'Run your package.json scripts directly from the context panel — dev, build, test, lint — without typing a single command. No more switching to a separate terminal window just to kick off a build or run your test suite.',
  'site.desktopApp.feat6Desc2':
    'Test results from Vitest, Jest, and Mocha are automatically parsed and surfaced as toast notifications with pass/fail counts. If a test fails, the agent is flagged immediately so you can jump in and fix it.',
  'site.desktopApp.feat6Desc3':
    'Scripts run in the background while your agents keep working. You get real-time output streaming, exit code tracking, and a full log you can scroll through at any time. One click to start, one click to stop — your entire toolchain lives right next to your code.',
  'site.desktopApp.feat7Title': 'Auto-updates',
  'site.desktopApp.feat7Desc':
    'Silent background updates with release notes on restart. Always up to date, zero effort.',
  'site.desktopApp.feat8Title': 'Per-repo configuration',
  'site.desktopApp.feat8Desc':
    'Per-repo commit style, language, PR templates, and worktree config. One team, ten repos, ten conventions.',
  'site.desktopApp.feat9Title': 'Real-time notifications',
  'site.desktopApp.feat9Desc':
    'When an agent finishes a task, hits an error, or needs your input, you get a native macOS notification instantly. No need to watch the screen or poll for updates — just keep working and let the app tell you when something needs your attention.',
  'site.desktopApp.feat10Title': 'Quick Launch',
  'site.desktopApp.feat10Desc':
    "Hit ⌃Space to open a Spotlight-style command palette. Search agents, dispatch skills, or jump to any repository — all without leaving the keyboard. The input resets on each open so you're always starting fresh.",
  'site.desktopApp.feat11Title': 'Menu bar integration',
  'site.desktopApp.feat11Desc':
    'magic-slash lives in your macOS menu bar. A lightweight popover gives you a quick overview of running agents and their status without bringing the full window to the foreground. Click to expand, or let it stay quietly in the tray.',
  'site.desktopApp.feat13Title': 'Activity history',
  'site.desktopApp.feat13Desc':
    'Every action is logged in a chronological timeline: task started, commit created, PR opened, review completed, ticket closed. Entries are grouped by day and color-coded by action type, so you can scan your week at a glance.',
  'site.desktopApp.feat13Desc2':
    'Expand any group to drill into individual events, or clear the history when you want a fresh start. It’s your development diary — without writing a word.',

  // ── Parallel agents ────────────────────────────────────────────────────────
  'site.parallel.title': '12 agents. 12 tasks. Zero wait.',
  'site.parallel.p1':
    'Run up to 12 agents in parallel, each working on its own ticket in its own worktree. Start a feature, fix a bug, and refactor an endpoint — all at the same time.',
  'site.parallel.p2':
    'No queuing, no context-switching. Every agent runs independently with full access to your stack.',
  'site.parallel.seeDocs': 'See docs',

  // ── Why ────────────────────────────────────────────────────────────────────
  'site.why.title': "Why we're building this.",
  'site.why.point1Title': 'Jira meets Claude Code.',
  'site.why.point1Desc':
    "Your tickets live in Jira, your code lives in Claude Code. magic-slash bridges the two so every command knows what you're working on, why, and for whom.",
  'site.why.point2Title': 'Zero context loss.',
  'site.why.point2Desc':
    'No more rephrasing ticket specs into prompts. magic-slash feeds the full Jira description, acceptance criteria, and metadata straight to Claude Code. Human prompt meets well-defined specs — nothing gets lost in translation.',
  'site.why.point3Title': 'One command instead of ten.',
  'site.why.point3Desc':
    "We kept typing the same prompts to start a task, create a branch, commit, push, and open a PR. Now it's just /magic:start PROJ-123 — fast, consistent, and done.",
  'site.why.cta': 'Read our story',

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
  'site.story.ctaBtn': 'Get started',

  // ── Skills page ────────────────────────────────────────────────────────────
  'site.skills.label': 'Skills',
  'site.skills.heroTitle': '7 skills.<br>Entire workflow.',
  'site.skills.heroSubtitle':
    'From ticket to merge in seven slash commands. Each skill handles one step of your development cycle. No context switching, no copy-pasting. Just flow.',
  'site.skills.startTitle': 'Grab your ticket.',
  'site.skills.startDesc':
    'Fetches the Jira or GitHub ticket, analyzes the spec, creates a worktree with the right branch name, and launches an agent that codes and implements the ticket spec — all from a single command.',
  'site.skills.continueTitle': 'Resume where you left off.',
  'site.skills.continueDesc':
    "Switches back to an existing worktree and reloads the full ticket context. Pick up where you left off — or take over a colleague's work. No lost threads, no re-reading the spec.",
  'site.skills.commitTitle': 'Commit with context.',
  'site.skills.commitDesc':
    'Stages your changes, generates a conventional commit message from the diff and ticket context, and commits. No more copy-pasting ticket IDs or writing commit messages from scratch.',
  'site.skills.prTitle': 'Ship the PR.',
  'site.skills.prDesc':
    'Pushes to remote, creates the pull request with a complete description, and transitions the Jira ticket to review. One command, zero tab-switching.',
  'site.skills.reviewTitle': 'Review with standards.',
  'site.skills.reviewDesc':
    "Fetches the PR diff and reviews it against your team's conventions. Inline comments, approval — all automated. Works for self-review or external PRs.",
  'site.skills.resolveTitle': 'Fix review feedback.',
  'site.skills.resolveDesc':
    'Reads every review comment, applies the fixes, and force-pushes. All threads resolved, no manual back-and-forth. From feedback to fixed in seconds.',
  'site.skills.doneTitle': 'Close the loop.',
  'site.skills.doneDesc':
    'Merges the PR, deletes the branch and worktree, and transitions the Jira ticket to Done. Clean slate, ready for the next task.',
  'site.skills.seeDocs': 'See docs',
  'site.skills.overviewTitle': 'At a glance.',
  'site.skills.overviewSubtitle': 'Seven commands. One complete development cycle.',
  'site.skills.overviewStartTitle': 'Start',
  'site.skills.overviewStartDesc': 'Fetch ticket, create worktree, start coding.',
  'site.skills.overviewContinueTitle': 'Continue',
  'site.skills.overviewContinueDesc': 'Resume work on an existing ticket.',
  'site.skills.overviewCommitTitle': 'Commit',
  'site.skills.overviewCommitDesc': 'Stage, message, commit — with context.',
  'site.skills.overviewPrTitle': 'Pull Request',
  'site.skills.overviewPrDesc': 'Push, create PR, update Jira.',
  'site.skills.overviewReviewTitle': 'Review',
  'site.skills.overviewReviewDesc': 'Automated code review with inline comments.',
  'site.skills.overviewResolveTitle': 'Resolve',
  'site.skills.overviewResolveDesc': 'Fix review comments, force-push.',
  'site.skills.overviewDoneTitle': 'Done',
  'site.skills.overviewDoneDesc':
    'Merge, clean up, transition Jira to Done. Full circle.',

  // ── FAQ ────────────────────────────────────────────────────────────────────
  'site.faq.title': 'FAQ & Troubleshooting',
  'site.faq.q1': 'Is magic-slash free?',
  'site.faq.a1':
    'Yes. magic-slash is fully open-source and free to use. You just need a Claude Code subscription.',
  'site.faq.q2': 'Does it work with GitHub Issues?',
  'site.faq.a2':
    'Absolutely. magic-slash supports both Jira and GitHub Issues out of the box.',
  'site.faq.q3': 'Can I customize the commit format?',
  'site.faq.a3':
    'Yes. Choose between Conventional Commits, Angular, Gitmoji, or define your own format per repo.',
  'site.faq.q4': 'Does it work with any language or framework?',
  'site.faq.a4':
    'Yes. magic-slash is language-agnostic — it works with any codebase Claude Code can handle.',
  'site.faq.viewAll': 'View all FAQ',

  // ── Flow section ───────────────────────────────────────────────────────────
  'site.flow.title': 'The complete flow.',
  'site.flow.subtitle': 'Seven steps from ticket to merge. Scroll to see each one in action.',
  'site.flow.step1Title': 'Grab your ticket.',
  'site.flow.step1Desc':
    'Fetches the Jira or GitHub ticket, analyzes the spec, creates a worktree with the right branch name, and launches an agent that codes and implements the ticket spec — all from a single command.',
  'site.flow.step2Title': 'Resume where you left off.',
  'site.flow.step2Desc':
    "Switches back to an existing worktree and reloads the full ticket context. Pick up where you left off — or take over a colleague's work. No lost threads, no re-reading the spec.",
  'site.flow.step3Title': 'Commit with context.',
  'site.flow.step3Desc':
    'Stages your changes, generates a conventional commit message from the diff and ticket context, and commits. No more copy-pasting ticket IDs.',
  'site.flow.step4Title': 'Ship the PR.',
  'site.flow.step4Desc':
    'Pushes to remote, creates the pull request with a complete description, and transitions the Jira ticket to review.',
  'site.flow.step5Title': 'Review with standards.',
  'site.flow.step5Desc':
    "Fetches the PR diff and reviews it against your team's conventions. Inline comments, approval — all automated.",
  'site.flow.step6Title': 'Fix review feedback.',
  'site.flow.step6Desc':
    'Reads every review comment, applies the fixes, and force-pushes. All threads resolved, no manual back-and-forth.',
  'site.flow.step7Title': 'Close the loop.',
  'site.flow.step7Desc':
    'Merges the PR, deletes the branch and worktree, and transitions the Jira ticket to Done. Clean slate.',
  'site.flow.cta': 'Get started',

  // ── Closing CTA ────────────────────────────────────────────────────────────
  'site.cta.title': 'Start in 30 seconds.',
  'site.cta.button': 'Get started',
  'site.cta.subtitle': 'Install magic-slash and transform your workflow.',

  // ── Footer ─────────────────────────────────────────────────────────────────
  'site.footer.tagline': 'Your workflow, on autopilot.',
  'site.footer.product': 'Product',
  'site.footer.gettingStarted': 'Getting Started',
  // The footer markup in docs/index.html referenced `footer.desktopApp` and
  // `footer.updates`, but neither key existed in the catalogue — so those two links
  // stayed English on the French site. Added here rather than carried over broken.
  'site.footer.desktopApp': 'Desktop App',
  'site.footer.updates': 'Updates',
  'site.footer.skills': 'Skills',
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
