feather.replace();

// ── i18n translations ──
var i18n = {
    en: {
        // Nav
        'nav.product': 'Product',
        'nav.productCategory': '<i data-feather="package"></i> Product',
        'nav.desktopApp': 'Desktop App',
        'nav.skills': 'Skills',
        'nav.resources': 'Resources',
        'nav.getStarted': 'Get started',
        'nav.documentationCategory': '<i data-feather="book"></i> Documentation',
        'nav.gettingStarted': 'Getting Started',
        'nav.skillsReference': 'Skills Reference',
        'nav.configuration': 'Configuration',
        'nav.viewAllDocs': 'View all docs <i data-feather="arrow-right"></i>',
        'nav.communityCategory': '<i data-feather="users"></i> Community',
        'nav.faq': 'FAQ',
        'nav.updatesCategory': '<i data-feather="zap"></i> Updates',
        'nav.changelog': 'Changelog <span class="version-badge" id="latestVersion"></span>',
        // Hero
        'hero.title': 'The boring parts,<br>automated.',
        'hero.subtitle': 'From ticket to merge — without the busywork.',
        'hero.cta': 'Get started',
        // Desktop mockup
        'desktop.newAgent': 'New agent',
        'desktop.skills': 'Skills',
        'desktop.settings': 'Settings',
        'desktop.agents': 'Agents',
        'desktop.inProgress': 'In Progress',
        'desktop.ticketTitle': 'Add JWT auth middleware',
        'desktop.ticketDesc': 'Implement token validation and refresh logic for the API gateway.',
        'desktop.repositories': 'Repositories',
        'desktop.filesChanged': '3 files changed',
        'desktop.aheadOfMain': '2 ahead of main',
        // Section 1 — Seven Skills
        'section1.title': '7 skills.<br>Entire workflow.',
        'section1.subtitle': 'From ticket to merge in seven slash commands.',
        'section1.startDesc': '<b style="color:#000">/magic:start</b> grabs your ticket and creates the branch.',
        'section1.continueDesc': '<b style="color:#000">/magic:continue</b> resumes work on an existing ticket.',
        'section1.commitDesc': '<b style="color:#000">/magic:commit</b> stages, splits, and writes your commit message.',
        'section1.prDesc': '<b style="color:#000">/magic:pr</b> pushes and creates the pull request.',
        'section1.reviewDesc': '<b style="color:#000">/magic:review</b> reviews a PR with your team conventions.',
        'section1.resolveDesc': '<b style="color:#000">/magic:resolve</b> addresses review comments and pushes fixes.',
        'section1.doneDesc': '<b style="color:#000">/magic:done</b> finalizes after merge — cleans up and updates Jira.',
        'section1.prefixHint': 'Type <b style="color:#000">/magic:</b> to find all commands at once.',
        'section1.noContext': 'No context switching. No copy-pasting ticket IDs. Just flow.',
        'section1.seeDocs': 'See docs',
        // Section 2 — Skills Manager
        'section2.skillsTitle': 'Skills',
        'section2.newSkill': 'New skill',
        'section2.startDesc': 'Fetch ticket and create branch',
        'section2.continueDesc': 'Resume work on existing ticket',
        'section2.commitDesc': 'Smart commit with context',
        'section2.prDesc': 'Push and create pull request',
        'section2.reviewDesc': 'Review PR with team conventions',
        'section2.resolveDesc': 'Address review comments',
        'section2.doneDesc': 'Finalize after merge',
        'section2.deployDesc': 'Build, test and deploy to staging',
        'section2.title': 'Manage Claude Code skills.',
        'section2.p1': 'Add, edit and organize your Claude Code skills directly from the desktop app. Each skill is a simple markdown file — no config files to hunt down.',
        'section2.p2': 'Built-in skills get you started instantly. Create custom ones for your team\'s workflows, deploy pipelines, or code standards.',
        'section2.seeDocs': 'See docs',
        // Section 3 — Configuration
        'section3.title': 'One config.<br>Every repo.',
        'section3.p1': 'Tailor commit style, PR templates, and language per repository. Choose between Conventional Commits, Angular, Gitmoji, or free-form formats.',
        'section3.p2': 'Write commits in English or French. Auto-sync Jira tickets and use your own PR templates with AI-powered summaries.',
        'section3.seeDocs': 'See docs',
        'section3.commitFormat': 'Commit format',
        'section3.language': 'Language',
        'section3.jiraSync': 'Jira sync',
        'section3.prTemplate': 'PR template',
        // Section 4 — Multi-Agent
        'section4.agents': 'Agents',
        'section4.title': '12 agents.<br>One window.',
        'section4.p1': 'Launch parallel Claude Code instances and see everything at a glance. Visual status per agent, macOS native notifications, and drag-and-drop to reorder.',
        'section4.p2': 'Info sidebar with full agent context. Color-coded projects for instant recognition.',
        'section4.seeDocs': 'See docs',
        // Section 5 — Integrations
        'section5.title': 'Plugs into your stack.',
        'section5.p1': 'Native integrations with GitHub for PRs, issues, and reviews. Jira for tickets and status sync. VS Code to open files and projects.',
        'section5.p2': 'Full Git support with worktrees and branches. Everything connected, nothing manual.',
        'section5.seeDocs': 'See docs <i data-feather="arrow-right"></i>',
        // Skills Banner
        'skillsBanner.title': '7 skills.<br>Entire workflow.',
        'skillsBanner.subtitle': 'From ticket to merge in seven slash commands. Each skill handles one step of your development cycle — grab a ticket, code, commit, open a PR, review, resolve comments, and close. Run multiple tasks in parallel using Git worktrees — each agent works in its own isolated branch, so nothing conflicts. No context switching, no copy-pasting. Just flow.',
        'skillsBanner.cta': 'Discover the skills <i data-feather="arrow-right"></i>',
        // Section 6 — Ticket Context
        'section6.agentInfo': 'Agent info',
        'section6.inProgress': 'In Progress',
        'section6.ticketTitle': 'Add user authentication flow',
        'section6.ticketDesc': 'Implement OAuth 2.0 login with Google and GitHub providers. Add session management and token refresh logic.',
        'section6.filesChanged': '3 files changed',
        'section6.noCommits': 'No committed changes',
        'section6.title': 'Your ticket, always in context.',
        'section6.p1': 'When you <b style="color:#000">/magic:start</b> a ticket, magic-slash fetches the title, description, and metadata from Jira or GitHub Issues. Every command you run knows what you\'re working on.',
        'section6.p2': 'Commit messages reference the right ticket. PRs include the full context. No more tab-switching to copy-paste issue details.',
        'section6.seeDocs': 'See docs',
        // Desktop App
        'desktop.heroLabel': 'Desktop App',
        'desktop.heroTitle': 'All your agents,<br>one screen.',
        'desktop.heroIntro': 'Track every agent in real time. See tasks, diffs, and Jira context side by side — without juggling terminals. Built for developers who run multiple tasks at once.',
        'desktopApp.title': 'All your agents, one screen.',
        'desktopApp.p1': 'Track every agent in real time. See tasks, diffs, and Jira context side by side — without terminals.',
        'desktopApp.p2': 'Jira tickets, Git status, and PR tracking — always visible, always in sync.',
        'desktopApp.cta': 'Explore the app <i data-feather="arrow-right"></i>',
        'desktopApp.feat1Title': 'Split view',
        'desktopApp.feat1Desc': 'Run two agents side by side. Drag and drop between panes, each scrolling independently.',
        'desktopApp.feat2Title': 'Live agent tracking',
        'desktopApp.feat2Desc': 'Real-time status for every agent, grouped by workflow stage. Native notifications when something needs your attention.',
        'desktopApp.feat3Title': 'Context panel',
        'desktopApp.feat3Desc': 'A sidebar showing the linked ticket, Git branch, uncommitted changes, commits, and PR status — all updating in real time.',
        'desktopApp.feat4Title': 'Keyboard-first',
        'desktopApp.feat4Desc': 'Every action mapped to a shortcut. Navigate, split, toggle sidebars — all without the mouse.',
        'desktopApp.feat5Title': 'Skills budget',
        'desktopApp.feat5Desc': 'Token and character usage per skill with weight categories. Create and manage skills with per-repo scoping.',
        'desktopApp.feat6Title': 'Script runner',
        'desktopApp.feat6Desc': 'Run your package.json scripts directly from the context panel — dev, build, test, lint — without typing a single command. No more switching to a separate terminal window just to kick off a build or run your test suite.',
        'desktopApp.feat6Desc2': 'Test results from Vitest, Jest, and Mocha are automatically parsed and surfaced as toast notifications with pass/fail counts. If a test fails, the agent is flagged immediately so you can jump in and fix it.',
        'desktopApp.feat6Desc3': 'Scripts run in the background while your agents keep working. You get real-time output streaming, exit code tracking, and a full log you can scroll through at any time. One click to start, one click to stop — your entire toolchain lives right next to your code.',
        'desktopApp.feat7Title': 'Auto-updates',
        'desktopApp.feat7Desc': 'Silent background updates with release notes on restart. Always up to date, zero effort.',
        'desktopApp.feat8Title': 'Per-repo configuration',
        'desktopApp.feat8Desc': 'Per-repo commit style, language, PR templates, and worktree config. One team, ten repos, ten conventions.',
        'desktopApp.feat9Title': 'Real-time notifications',
        'desktopApp.feat9Desc': 'When an agent finishes a task, hits an error, or needs your input, you get a native macOS notification instantly. No need to watch the screen or poll for updates — just keep working and let the app tell you when something needs your attention.',
        'desktopApp.feat10Title': 'Quick Launch',
        'desktopApp.feat10Desc': 'Hit ⌃Space to open a Spotlight-style command palette. Search agents, dispatch skills, or jump to any repository — all without leaving the keyboard. The input resets on each open so you\'re always starting fresh.',
        'desktopApp.feat11Title': 'Menu bar integration',
        'desktopApp.feat11Desc': 'magic-slash lives in your macOS menu bar. A lightweight popover gives you a quick overview of running agents and their status without bringing the full window to the foreground. Click to expand, or let it stay quietly in the tray.',
        // Parallel Agents
        'parallel.title': '12 agents. 12 tasks. Zero wait.',
        'parallel.p1': 'Run up to 12 agents in parallel, each working on its own ticket in its own worktree. Start a feature, fix a bug, and refactor an endpoint — all at the same time.',
        'parallel.p2': 'No queuing, no context-switching. Every agent runs independently with full access to your stack.',
        'parallel.seeDocs': 'See docs <i data-feather="arrow-right"></i>',
        // Why
        'why.title': 'Why we\'re building this.',
        'why.point1Title': 'Jira meets Claude Code.',
        'why.point1Desc': 'Your tickets live in Jira, your code lives in Claude Code. magic-slash bridges the two so every command knows what you\'re working on, why, and for whom.',
        'why.point2Title': 'Zero context loss.',
        'why.point2Desc': 'No more rephrasing ticket specs into prompts. magic-slash feeds the full Jira description, acceptance criteria, and metadata straight to Claude Code. Human prompt meets well-defined specs — nothing gets lost in translation.',
        'why.point3Title': 'One command instead of ten.',
        'why.point3Desc': 'We kept typing the same prompts to start a task, create a branch, commit, push, and open a PR. Now it\'s just /magic:start PROJ-123 — fast, consistent, and done.',
        'why.cta': 'Read our story <i data-feather="arrow-right"></i>',
        // Nav & Footer
        'nav.ourStory': 'Our Story',
        'footer.ourStory': 'Our Story',
        // Story page
        'story.label': 'Our Story',
        'story.heroTitle': 'We got tired of<br>the copy-paste.',
        'story.heroIntro': 'We were using Claude Code every day, on real projects, with real Jira tickets. And every single time, we were doing the same thing: reading the ticket, rephrasing it into a prompt, creating worktrees by hand, committing manually, writing PR descriptions from scratch. It worked. But it was slow, repetitive, and boring.',
        // Pain points
        'story.painTitle': 'What it looked like before.',
        'story.painSubtitle': 'Every task meant the same tedious routine. Here\u2019s what we were doing 5 to 10 times a day.',
        'story.pain1Title': 'Read and understand the ticket',
        'story.pain1Desc': 'Open Jira, read the title, the description, the acceptance criteria. Understand what needs to be done, then switch to the terminal and rephrase it all as a prompt for Claude Code.',
        'story.pain2Title': 'Create the worktree manually',
        'story.pain2Desc': 'Figure out the branch name from the ticket ID, run git worktree add, cd into it, make sure you\u2019re on the right base branch. Every. Single. Time.',
        'story.pain3Title': 'Write the perfect prompt',
        'story.pain3Desc': 'Translate the Jira spec into the best possible prompt. Copy-paste the acceptance criteria, add context about the codebase, hope you didn\u2019t forget anything important.',
        'story.pain4Title': 'Commit, PR, describe',
        'story.pain4Desc': 'Stage changes, write a conventional commit message, push, open the PR, write the description, link the Jira ticket, update the status. All by hand.',
        'story.pain5Title': 'Review comments on your own',
        'story.pain5Desc': 'Read each review comment, understand the feedback, fix the code, force-push, resolve the threads. No help, no automation.',
        'story.pain6Title': 'Clean up (if you remember)',
        'story.pain6Desc': 'Once merged, delete the worktree, the local branch, the remote branch. One time out of five, you forget, and stale branches pile up.',
        // Timeline
        'story.timelineTitle': 'How we got here.',
        'story.timelineSubtitle': 'From a brainstorm to a product used daily by the team.',
        'story.tl1Date': 'Early January 2026',
        'story.tl1Title': 'The first brainstorm',
        'story.tl1Desc': 'Initial idea: a Chrome extension that adds a button to Jira tickets to copy the spec and paste it into a manually launched Claude Code. Simple, but not enough.',
        'story.tl2Date': 'January 2026',
        'story.tl2Title': 'Pivot to slash commands',
        'story.tl2Desc': 'After the brainstorm, the decision is clear: forget the extension, let\u2019s build Claude Code slash commands powered by the GitHub and Atlassian MCP servers \u2014 pulling in Jira tickets and GitHub Issues natively. Direct, fast, no context-switching.',
        'story.tl3Date': 'Mid-January 2026',
        'story.tl3Title': 'First version of magic-slash',
        'story.tl3Desc': 'magic-slash ships with a landing page, a <code>/start</code> command to kick off tasks from Jira tickets, and a polished install CLI for a top-notch developer experience. Fetch the spec, create the branch, start coding \u2014 one command.',
        'story.tl4Date': 'Late January 2026',
        'story.tl4Title': '/commit and /done arrive',
        'story.tl4Desc': '<code>/commit</code> for fast conventional commits and <code>/done</code> to push, open the PR, and update Jira. The full cycle starts to take shape. Slash commands evolve into Claude Code skills for a smoother experience.',
        'story.tl5Date': 'February 2026',
        'story.tl5Title': 'Battle-tested by the team',
        'story.tl5Desc': 'magic-slash goes into heavy daily use across the dev team. Real tickets, real PRs, real feedback. Every pain point surfaces and gets fixed.',
        'story.tl6Date': 'Early March 2026',
        'story.tl6Title': 'Magic-slash desktop is born',
        'story.tl6Desc': 'New problem: with 7-8 Claude instances running in terminals, nobody knew which agent was working on what. Way too much time wasted on context recovery. So we built a desktop app to see everything at a glance \u2014 up to 12 agents in parallel, each on its own ticket.',
        'story.tl7Date': 'March 2026',
        'story.tl7Title': 'From 3 skills to 7 \u2014 the full dev flow',
        'story.tl7Desc': 'The skill set grows from 3 to 7 with a complete development cycle. <code>/done</code> becomes <code>/pr</code> for creating pull requests, and a new <code>/done</code> handles ticket closure after merge. <code>/review</code> and <code>/resolve</code> land to automate code reviews and address feedback. Plus a full month of desktop app testing, bug fixes, and UI refinements.',
        'story.tl8Date': 'April 2026',
        'story.tl8Title': 'Rebranding & the Ninja Rabbit',
        'story.tl8Desc': 'New identity drops with a mascot: the Ninja Rabbit. A sword for the Slash, a white rabbit as a symbol of magic. Fresh landing page, new visual direction.',
        'story.tl9Date': 'Coming soon',
        'story.tl9Title': 'What\u2019s next?',
        'story.tl9Desc': 'More integrations, smarter reviews, and a lot more. Stay tuned.',
        'story.ctaTitle': 'Ready to try?',
        'story.ctaDesc': 'Install magic-slash and see the difference.',
        'story.ctaBtn': 'Get started <i data-feather="arrow-right"></i>',
        // Skills page
        'skills.label': 'Skills',
        'skills.heroTitle': '7 skills.<br>Entire workflow.',
        'skills.heroSubtitle': 'From ticket to merge in seven slash commands. Each skill handles one step of your development cycle. No context switching, no copy-pasting. Just flow.',
        'skills.startTitle': 'Grab your ticket.',
        'skills.startDesc': 'Fetches the Jira or GitHub ticket, analyzes the spec, creates a worktree with the right branch name, and launches an agent that codes and implements the ticket spec \u2014 all from a single command.',
        'skills.continueTitle': 'Resume where you left off.',
        'skills.continueDesc': 'Switches back to an existing worktree and reloads the full ticket context. Pick up where you left off \u2014 or take over a colleague\'s work. No lost threads, no re-reading the spec.',
        'skills.commitTitle': 'Commit with context.',
        'skills.commitDesc': 'Stages your changes, generates a conventional commit message from the diff and ticket context, and commits. No more copy-pasting ticket IDs or writing commit messages from scratch.',
        'skills.prTitle': 'Ship the PR.',
        'skills.prDesc': 'Pushes to remote, creates the pull request with a complete description, and transitions the Jira ticket to review. One command, zero tab-switching.',
        'skills.reviewTitle': 'Review with standards.',
        'skills.reviewDesc': 'Fetches the PR diff and reviews it against your team\'s conventions. Inline comments, approval \u2014 all automated. Works for self-review or external PRs.',
        'skills.resolveTitle': 'Fix review feedback.',
        'skills.resolveDesc': 'Reads every review comment, applies the fixes, and force-pushes. All threads resolved, no manual back-and-forth. From feedback to fixed in seconds.',
        'skills.doneTitle': 'Close the loop.',
        'skills.doneDesc': 'Merges the PR, deletes the branch and worktree, and transitions the Jira ticket to Done. Clean slate, ready for the next task.',
        'skills.seeDocs': 'See docs <i data-feather="arrow-right"></i>',
        'skills.overviewTitle': 'At a glance.',
        'skills.overviewSubtitle': 'Seven commands. One complete development cycle.',
        'skills.overviewStartTitle': 'Start',
        'skills.overviewStartDesc': 'Fetch ticket, create worktree, start coding.',
        'skills.overviewContinueTitle': 'Continue',
        'skills.overviewContinueDesc': 'Resume work on an existing ticket.',
        'skills.overviewCommitTitle': 'Commit',
        'skills.overviewCommitDesc': 'Stage, message, commit \u2014 with context.',
        'skills.overviewPrTitle': 'Pull Request',
        'skills.overviewPrDesc': 'Push, create PR, update Jira.',
        'skills.overviewReviewTitle': 'Review',
        'skills.overviewReviewDesc': 'Automated code review with inline comments.',
        'skills.overviewResolveTitle': 'Resolve',
        'skills.overviewResolveDesc': 'Fix review comments, force-push.',
        'skills.overviewDoneTitle': 'Done',
        'skills.overviewDoneDesc': 'Merge, clean up, transition Jira to Done. Full circle.',
        // FAQ
        'faq.title': 'FAQ & Troubleshooting',
        'faq.q1': 'Is magic-slash free?',
        'faq.a1': 'Yes. magic-slash is fully open-source and free to use. You just need a Claude Code subscription.',
        'faq.q2': 'Does it work with GitHub Issues?',
        'faq.a2': 'Absolutely. magic-slash supports both Jira and GitHub Issues out of the box.',
        'faq.q3': 'Can I customize the commit format?',
        'faq.a3': 'Yes. Choose between Conventional Commits, Angular, Gitmoji, or define your own format per repo.',
        'faq.q4': 'Does it work with any language or framework?',
        'faq.a4': 'Yes. magic-slash is language-agnostic — it works with any codebase Claude Code can handle.',
        'faq.viewAll': 'View all FAQ <i data-feather="arrow-right"></i>',
        // Flow Section
        'flow.title': 'The complete flow.',
        'flow.subtitle': 'Seven steps from ticket to merge. Scroll to see each one in action.',
        'flow.step1Title': 'Grab your ticket.',
        'flow.step1Desc': 'Fetches the Jira or GitHub ticket, analyzes the spec, creates a worktree with the right branch name, and launches an agent that codes and implements the ticket spec \u2014 all from a single command.',
        'flow.step2Title': 'Resume where you left off.',
        'flow.step2Desc': 'Switches back to an existing worktree and reloads the full ticket context. Pick up where you left off \u2014 or take over a colleague\'s work. No lost threads, no re-reading the spec.',
        'flow.step3Title': 'Commit with context.',
        'flow.step3Desc': 'Stages your changes, generates a conventional commit message from the diff and ticket context, and commits. No more copy-pasting ticket IDs.',
        'flow.step4Title': 'Ship the PR.',
        'flow.step4Desc': 'Pushes to remote, creates the pull request with a complete description, and transitions the Jira ticket to review.',
        'flow.step5Title': 'Review with standards.',
        'flow.step5Desc': 'Fetches the PR diff and reviews it against your team\'s conventions. Inline comments, approval \u2014 all automated.',
        'flow.step6Title': 'Fix review feedback.',
        'flow.step6Desc': 'Reads every review comment, applies the fixes, and force-pushes. All threads resolved, no manual back-and-forth.',
        'flow.step7Title': 'Close the loop.',
        'flow.step7Desc': 'Merges the PR, deletes the branch and worktree, and transitions the Jira ticket to Done. Clean slate.',
        'flow.cta': 'Get started <i data-feather="arrow-right"></i>',
        // CTA
        'cta.title': 'Start in 30 seconds.',
        'cta.subtitle': 'Install magic-slash and transform your workflow.',
        // Footer
        'footer.tagline': 'Your workflow, on autopilot.',
        'footer.product': 'Product',
        'footer.gettingStarted': 'Getting Started',
        'footer.skills': 'Skills',
        'footer.configuration': 'Configuration',
        'footer.changelog': 'Changelog',
        'footer.resources': 'Resources',
        'footer.documentation': 'Documentation',
        'footer.faq': 'FAQ',
        'footer.company': 'Company',
        'footer.license': 'License',
        'footer.reportIssue': 'Report an issue',
        'footer.termsLink': 'Terms',
        'footer.privacyLink': 'Privacy'
    },
    fr: {
        // Nav
        'nav.product': 'Produit',
        'nav.productCategory': '<i data-feather="package"></i> Produit',
        'nav.desktopApp': 'Application Desktop',
        'nav.skills': 'Skills',
        'nav.resources': 'Ressources',
        'nav.getStarted': 'Commencer',
        'nav.documentationCategory': '<i data-feather="book"></i> Documentation',
        'nav.gettingStarted': 'Démarrage rapide',
        'nav.skillsReference': 'Référence des skills',
        'nav.configuration': 'Configuration',
        'nav.viewAllDocs': 'Voir toute la doc <i data-feather="arrow-right"></i>',
        'nav.communityCategory': '<i data-feather="users"></i> Communauté',
        'nav.faq': 'FAQ',
        'nav.updatesCategory': '<i data-feather="zap"></i> Mises à jour',
        'nav.changelog': 'Changelog <span class="version-badge" id="latestVersion"></span>',
        // Hero
        'hero.title': 'Les tâches ingrates,<br>automatisées.',
        'hero.subtitle': 'Du ticket au merge — sans la corvée.',
        'hero.cta': 'Commencer',
        // Desktop mockup
        'desktop.newAgent': 'Nouvel agent',
        'desktop.skills': 'Skills',
        'desktop.settings': 'Paramètres',
        'desktop.agents': 'Agents',
        'desktop.inProgress': 'En cours',
        'desktop.ticketTitle': 'Ajouter le middleware d\'auth JWT',
        'desktop.ticketDesc': 'Implémenter la validation des tokens et la logique de rafraîchissement pour la passerelle API.',
        'desktop.repositories': 'Dépôts',
        'desktop.filesChanged': '3 fichiers modifiés',
        'desktop.aheadOfMain': '2 en avance sur main',
        // Section 1 — Seven Skills
        'section1.title': '7 skills.<br>Tout le workflow.',
        'section1.subtitle': 'Du ticket au merge en sept commandes slash.',
        'section1.startDesc': '<b style="color:#000">/magic:start</b> récupère votre ticket et crée la branche.',
        'section1.continueDesc': '<b style="color:#000">/magic:continue</b> reprend le travail sur un ticket existant.',
        'section1.commitDesc': '<b style="color:#000">/magic:commit</b> indexe, découpe et rédige votre message de commit.',
        'section1.prDesc': '<b style="color:#000">/magic:pr</b> pousse et crée la pull request.',
        'section1.reviewDesc': '<b style="color:#000">/magic:review</b> review une PR selon les conventions d\'équipe.',
        'section1.resolveDesc': '<b style="color:#000">/magic:resolve</b> traite les commentaires de review et pousse les corrections.',
        'section1.doneDesc': '<b style="color:#000">/magic:done</b> finalise après le merge — nettoie et met à jour Jira.',
        'section1.prefixHint': 'Tapez <b style="color:#000">/magic:</b> pour retrouver toutes les commandes.',
        'section1.noContext': 'Pas de changement de contexte. Pas de copier-coller d\'identifiants. Juste du flow.',
        'section1.seeDocs': 'Voir la doc',
        // Section 2 — Skills Manager
        'section2.skillsTitle': 'Skills',
        'section2.newSkill': 'Nouveau skill',
        'section2.startDesc': 'Récupérer le ticket et créer la branche',
        'section2.continueDesc': 'Reprendre le travail sur un ticket existant',
        'section2.commitDesc': 'Commit intelligent avec contexte',
        'section2.prDesc': 'Pousser et créer la pull request',
        'section2.reviewDesc': 'Revue de PR selon les conventions d\'équipe',
        'section2.resolveDesc': 'Traiter les commentaires de review',
        'section2.doneDesc': 'Finaliser après le merge',
        'section2.deployDesc': 'Builder, tester et déployer en staging',
        'section2.title': 'Gérez les skills Claude Code.',
        'section2.p1': 'Ajoutez, éditez et organisez vos skills Claude Code directement depuis l\'application desktop. Chaque skill est un simple fichier markdown — pas de fichiers de config à chercher.',
        'section2.p2': 'Les skills intégrés vous lancent immédiatement. Créez-en sur mesure pour les workflows de votre équipe, vos pipelines de déploiement ou vos standards de code.',
        'section2.seeDocs': 'Voir la doc',
        // Section 3 — Configuration
        'section3.title': 'Une config.<br>Chaque repo.',
        'section3.p1': 'Adaptez le style de commit, les templates de PR et la langue par dépôt. Choisissez entre Conventional Commits, Angular, Gitmoji ou format libre.',
        'section3.p2': 'Rédigez vos commits en anglais ou en français. Synchronisez automatiquement les tickets Jira et utilisez vos propres templates de PR avec des résumés générés par IA.',
        'section3.seeDocs': 'Voir la doc',
        'section3.commitFormat': 'Format de commit',
        'section3.language': 'Langue',
        'section3.jiraSync': 'Sync Jira',
        'section3.prTemplate': 'Template de PR',
        // Section 4 — Multi-Agent
        'section4.agents': 'Agents',
        'section4.title': '12 agents.<br>Une fenêtre.',
        'section4.p1': 'Lancez des instances Claude Code en parallèle et voyez tout d\'un coup d\'œil. Statut visuel par agent, notifications natives macOS et glisser-déposer pour réorganiser.',
        'section4.p2': 'Barre latérale d\'info avec le contexte complet de l\'agent. Projets colorés pour une reconnaissance instantanée.',
        'section4.seeDocs': 'Voir la doc',
        // Section 5 — Integrations
        'section5.title': 'Se branche sur votre stack.',
        'section5.p1': 'Intégrations natives avec GitHub pour les PRs, issues et revues. Jira pour les tickets et la synchronisation de statut. VS Code pour ouvrir fichiers et projets.',
        'section5.p2': 'Support complet de Git avec worktrees et branches. Tout est connecté, rien n\'est manuel.',
        'section5.seeDocs': 'Voir la doc <i data-feather="arrow-right"></i>',
        // Skills Banner
        'skillsBanner.title': '7 skills.<br>Tout le workflow.',
        'skillsBanner.subtitle': 'Du ticket au merge en sept commandes slash. Chaque skill gère une étape de votre cycle de développement — récupérer un ticket, coder, committer, ouvrir une PR, reviewer, résoudre les commentaires et clôturer. Lancez plusieurs tâches en parallèle grâce aux worktrees Git — chaque agent travaille dans sa propre branche isolée, sans aucun conflit. Pas de changement de contexte, pas de copier-coller. Juste du flow.',
        'skillsBanner.cta': 'Découvrir les skills <i data-feather="arrow-right"></i>',
        // Section 6 — Ticket Context
        'section6.agentInfo': 'Info agent',
        'section6.inProgress': 'En cours',
        'section6.ticketTitle': 'Ajouter le flux d\'authentification utilisateur',
        'section6.ticketDesc': 'Implémenter la connexion OAuth 2.0 avec Google et GitHub. Ajouter la gestion des sessions et la logique de rafraîchissement des tokens.',
        'section6.filesChanged': '3 fichiers modifiés',
        'section6.noCommits': 'Aucun commit',
        'section6.title': 'Votre ticket, toujours en contexte.',
        'section6.p1': 'Quand vous faites <b style="color:#000">/magic:start</b> sur un ticket, magic-slash récupère le titre, la description et les métadonnées depuis Jira ou GitHub Issues. Chaque commande que vous lancez sait sur quoi vous travaillez.',
        'section6.p2': 'Les messages de commit référencent le bon ticket. Les PRs incluent le contexte complet. Fini les allers-retours entre onglets pour copier-coller les détails des issues.',
        'section6.seeDocs': 'Voir la doc',
        // Desktop App
        'desktop.heroLabel': 'Application Desktop',
        'desktop.heroTitle': 'Tous vos agents,<br>un seul écran.',
        'desktop.heroIntro': 'Suivez chaque agent en temps réel. Tâches, diffs et contexte Jira côte à côte — sans jongler entre les terminaux. Conçu pour les développeurs qui travaillent sur plusieurs tâches en parallèle.',
        'desktopApp.title': 'Tous vos agents, un seul écran.',
        'desktopApp.p1': 'Suivez chaque agent en temps réel. Tâches, diffs et contexte Jira côte à côte — sans jongler entre les terminaux.',
        'desktopApp.p2': 'Tickets Jira, statut Git et suivi des PRs — toujours visibles, toujours synchronisés.',
        'desktopApp.cta': 'Explorer l\u2019app <i data-feather="arrow-right"></i>',
        'desktopApp.feat1Title': 'Vue split',
        'desktopApp.feat1Desc': 'Deux agents côte à côte. Glissez-déposez entre les panneaux, chacun scrolle indépendamment.',
        'desktopApp.feat2Title': 'Suivi en temps réel',
        'desktopApp.feat2Desc': 'Statut en direct pour chaque agent, regroupé par étape du workflow. Notifications natives quand quelque chose requiert votre attention.',
        'desktopApp.feat3Title': 'Panneau de contexte',
        'desktopApp.feat3Desc': 'Une sidebar avec le ticket lié, la branche Git, les changements, les commits et le statut de la PR — tout en temps réel.',
        'desktopApp.feat4Title': 'Keyboard-first',
        'desktopApp.feat4Desc': 'Chaque action a son raccourci. Naviguer, splitter, toggle les sidebars — tout sans la souris.',
        'desktopApp.feat5Title': 'Budget des skills',
        'desktopApp.feat5Desc': 'Consommation tokens et caractères par skill avec catégories de poids. Créez et gérez vos skills avec un scoping par repo.',
        'desktopApp.feat6Title': 'Script runner',
        'desktopApp.feat6Desc': 'Lancez vos scripts package.json directement depuis le panneau contextuel — dev, build, test, lint — sans taper une seule commande. Plus besoin de basculer vers un terminal séparé pour lancer un build ou vos tests.',
        'desktopApp.feat6Desc2': 'Les résultats de Vitest, Jest et Mocha sont automatiquement parsés et affichés en notifications toast avec le nombre de tests passés/échoués. Si un test échoue, l\'agent est signalé immédiatement pour que vous puissiez intervenir.',
        'desktopApp.feat6Desc3': 'Les scripts tournent en arrière-plan pendant que vos agents continuent de travailler. Vous avez le streaming de l\'output en temps réel, le suivi des codes de sortie, et un log complet consultable à tout moment. Un clic pour lancer, un clic pour stopper — toute votre toolchain à côté de votre code.',
        'desktopApp.feat7Title': 'Mises à jour auto',
        'desktopApp.feat7Desc': 'Mises à jour silencieuses en arrière-plan avec notes de version au redémarrage. Toujours à jour, zéro effort.',
        'desktopApp.feat8Title': 'Configuration par repo',
        'desktopApp.feat8Desc': 'Style de commit, langue, templates PR et config worktree par repo. Une équipe, dix repos, dix conventions.',
        'desktopApp.feat9Title': 'Notifications en temps réel',
        'desktopApp.feat9Desc': 'Quand un agent termine une tâche, rencontre une erreur ou attend votre intervention, vous recevez une notification macOS native instantanément. Pas besoin de surveiller l\u2019écran — continuez à travailler et laissez l\u2019app vous prévenir quand quelque chose requiert votre attention.',
        'desktopApp.feat10Title': 'Quick Launch',
        'desktopApp.feat10Desc': 'Appuyez sur ⌃Espace pour ouvrir une palette de commandes style Spotlight. Recherchez des agents, lancez des skills ou naviguez vers n\u2019importe quel repo — sans quitter le clavier. Le champ se réinitialise à chaque ouverture.',
        'desktopApp.feat11Title': 'Intégration barre de menus',
        'desktopApp.feat11Desc': 'magic-slash vit dans votre barre de menus macOS. Un popover léger vous donne un aperçu rapide des agents en cours et de leur statut sans afficher la fenêtre principale. Cliquez pour agrandir, ou laissez-le tranquille dans le tray.',
        // Parallel Agents
        'parallel.title': '12 agents. 12 tâches. Zéro attente.',
        'parallel.p1': 'Lancez jusqu\'à 12 agents en parallèle, chacun sur son propre ticket dans son propre worktree. Démarrez une feature, corrigez un bug et refactorez un endpoint — en même temps.',
        'parallel.p2': 'Pas de file d\'attente, pas de changement de contexte. Chaque agent tourne indépendamment avec un accès complet à votre stack.',
        'parallel.seeDocs': 'Voir la doc <i data-feather="arrow-right"></i>',
        // Why
        'why.title': 'Pourquoi on construit \u00e7a.',
        'why.point1Title': 'Jira rencontre Claude Code.',
        'why.point1Desc': 'Vos tickets vivent dans Jira, votre code vit dans Claude Code. magic-slash fait le pont entre les deux pour que chaque commande sache sur quoi vous travaillez, pourquoi, et pour qui.',
        'why.point2Title': 'Z\u00e9ro perte de contexte.',
        'why.point2Desc': 'Fini de reformuler les specs du ticket en prompts. magic-slash injecte la description Jira compl\u00e8te, les crit\u00e8res d\u2019acceptation et les m\u00e9tadonn\u00e9es directement dans Claude Code. Le prompt humain rencontre des specs bien d\u00e9finies \u2014 rien ne se perd.',
        'why.point3Title': 'Une commande au lieu de dix.',
        'why.point3Desc': 'On tapait toujours les m\u00eames prompts pour d\u00e9marrer une t\u00e2che, cr\u00e9er une branche, committer, pousser et ouvrir une PR. Maintenant c\u2019est juste /magic:start PROJ-123 \u2014 rapide, consistant, et termin\u00e9.',
        'why.cta': 'Lire notre histoire <i data-feather="arrow-right"></i>',
        // Nav & Footer
        'nav.ourStory': 'Notre histoire',
        'footer.ourStory': 'Notre histoire',
        // Story page
        'story.label': 'Notre histoire',
        'story.heroTitle': 'On en avait marre<br>du copier-coller.',
        'story.heroIntro': 'On utilisait Claude Code tous les jours, sur de vrais projets, avec de vrais tickets Jira. Et \u00e0 chaque fois, c\u2019\u00e9tait la m\u00eame chose : lire le ticket, le reformuler en prompt, cr\u00e9er les worktrees \u00e0 la main, committer manuellement, r\u00e9diger les descriptions de PR from scratch. \u00c7a marchait. Mais c\u2019\u00e9tait lent, r\u00e9p\u00e9titif et ennuyeux.',
        // Pain points
        'story.painTitle': '\u00c0 quoi \u00e7a ressemblait avant.',
        'story.painSubtitle': 'Chaque t\u00e2che, c\u2019\u00e9tait la m\u00eame routine. Voici ce qu\u2019on faisait 5 \u00e0 10 fois par jour.',
        'story.pain1Title': 'Lire et comprendre le ticket',
        'story.pain1Desc': 'Ouvrir Jira, lire le titre, la description, les crit\u00e8res d\u2019acceptation. Comprendre ce qu\u2019il faut faire, puis basculer sur le terminal et tout reformuler en prompt pour Claude Code.',
        'story.pain2Title': 'Cr\u00e9er le worktree \u00e0 la main',
        'story.pain2Desc': 'Trouver le nom de branche depuis l\u2019ID du ticket, lancer git worktree add, cd dedans, v\u00e9rifier qu\u2019on est sur la bonne branche de base. \u00c0. Chaque. Fois.',
        'story.pain3Title': '\u00c9crire le prompt parfait',
        'story.pain3Desc': 'Traduire la spec Jira dans le meilleur prompt possible. Copier-coller les crit\u00e8res d\u2019acceptation, ajouter du contexte sur la codebase, esp\u00e9rer n\u2019avoir rien oubli\u00e9 d\u2019important.',
        'story.pain4Title': 'Commit, PR, description',
        'story.pain4Desc': 'Stager les changements, \u00e9crire un message de commit conventionnel, pousser, ouvrir la PR, r\u00e9diger la description, lier le ticket Jira, mettre \u00e0 jour le statut. Tout \u00e0 la main.',
        'story.pain5Title': 'R\u00e9pondre aux reviews seul',
        'story.pain5Desc': 'Lire chaque commentaire de review, comprendre le feedback, corriger le code, force-push, r\u00e9soudre les threads. Aucune aide, aucune automatisation.',
        'story.pain6Title': 'Nettoyer (si on y pense)',
        'story.pain6Desc': 'Une fois merg\u00e9, supprimer le worktree, la branche locale, la branche remote. Une fois sur cinq, on oublie, et les branches mortes s\u2019accumulent.',
        // Timeline
        'story.timelineTitle': 'Comment on en est arriv\u00e9 l\u00e0.',
        'story.timelineSubtitle': 'D\u2019un brainstorm \u00e0 un produit utilis\u00e9 au quotidien par l\u2019\u00e9quipe.',
        'story.tl1Date': 'D\u00e9but janvier 2026',
        'story.tl1Title': 'Le premier brainstorm',
        'story.tl1Desc': 'Id\u00e9e initiale : une extension Chrome qui ajoute un bouton sur les tickets Jira pour copier la spec et la coller dans un Claude Code lanc\u00e9 \u00e0 la main. Simple, mais pas suffisant.',
        'story.tl2Date': 'Janvier 2026',
        'story.tl2Title': 'Pivot vers les slash commands',
        'story.tl2Desc': 'Apr\u00e8s le brainstorm, la d\u00e9cision est claire : oubliez l\u2019extension, on construit des slash commands Claude Code aliment\u00e9es par les serveurs MCP GitHub et Atlassian \u2014 pour int\u00e9grer nativement les tickets Jira et les GitHub Issues. Direct, rapide, z\u00e9ro changement de contexte.',
        'story.tl3Date': 'Mi-janvier 2026',
        'story.tl3Title': 'Premi\u00e8re version de magic-slash',
        'story.tl3Desc': 'magic-slash sort avec une landing page, une commande <code>/start</code> pour lancer des t\u00e2ches depuis les tickets Jira, et un CLI d\u2019install soign\u00e9 pour une exp\u00e9rience d\u00e9veloppeur au top. R\u00e9cup\u00e9rer la spec, cr\u00e9er la branche, commencer \u00e0 coder \u2014 une commande.',
        'story.tl4Date': 'Fin janvier 2026',
        'story.tl4Title': '/commit et /done arrivent',
        'story.tl4Desc': '<code>/commit</code> pour des commits conventionnels rapides et <code>/done</code> pour pousser, ouvrir la PR et mettre \u00e0 jour Jira. Le cycle complet prend forme. Les slash commands \u00e9voluent en skills Claude Code pour une meilleure exp\u00e9rience.',
        'story.tl5Date': 'F\u00e9vrier 2026',
        'story.tl5Title': 'Test\u00e9 au combat par l\u2019\u00e9quipe',
        'story.tl5Desc': 'magic-slash entre en utilisation intensive quotidienne dans l\u2019\u00e9quipe dev. De vrais tickets, de vraies PRs, de vrais retours. Chaque point de friction remonte et est corrig\u00e9.',
        'story.tl6Date': 'D\u00e9but mars 2026',
        'story.tl6Title': 'Magic-slash desktop est n\u00e9',
        'story.tl6Desc': 'Nouveau probl\u00e8me : avec 7-8 instances Claude lanc\u00e9es dans des terminaux, personne ne savait quel agent travaillait sur quoi. Trop de temps perdu en remise en contexte. Alors on a construit une app desktop pour tout voir d\u2019un coup d\u2019\u0153il \u2014 jusqu\u2019\u00e0 12 agents en parall\u00e8le, chacun sur son propre ticket.',
        'story.tl7Date': 'Mars 2026',
        'story.tl7Title': 'De 3 skills \u00e0 7 \u2014 le flow de dev complet',
        'story.tl7Desc': 'Le nombre de skills passe de 3 \u00e0 7 avec un cycle de d\u00e9veloppement complet. <code>/done</code> devient <code>/pr</code> pour cr\u00e9er les pull requests, et un nouveau <code>/done</code> g\u00e8re la cl\u00f4ture du ticket apr\u00e8s le merge. <code>/review</code> et <code>/resolve</code> arrivent pour automatiser les revues de code et traiter les retours. Plus un mois complet de tests de l\u2019app desktop, corrections de bugs et affinage de l\u2019UI.',
        'story.tl8Date': 'Avril 2026',
        'story.tl8Title': 'Rebranding & le Lapin Ninja',
        'story.tl8Desc': 'Nouvelle identit\u00e9 avec une mascotte : le Lapin Ninja. Un sabre pour le Slash, un lapin blanc comme symbole de la magie. Nouvelle landing page, nouvelle direction visuelle.',
        'story.tl9Date': 'Coming soon',
        'story.tl9Title': 'Et ensuite ?',
        'story.tl9Desc': 'Plus d\u2019int\u00e9grations, des reviews plus intelligentes, et bien plus encore. Stay tuned.',
        'story.ctaTitle': 'Pr\u00eat \u00e0 essayer ?',
        'story.ctaDesc': 'Installez magic-slash et voyez la diff\u00e9rence.',
        'story.ctaBtn': 'Commencer <i data-feather="arrow-right"></i>',
        // Skills page
        'skills.label': 'Skills',
        'skills.heroTitle': '7 skills.<br>Tout le workflow.',
        'skills.heroSubtitle': 'Du ticket au merge en sept commandes slash. Chaque skill g\u00e8re une \u00e9tape de votre cycle de d\u00e9veloppement. Pas de changement de contexte, pas de copier-coller. Juste du flow.',
        'skills.startTitle': 'R\u00e9cup\u00e9rez votre ticket.',
        'skills.startDesc': 'R\u00e9cup\u00e8re le ticket Jira ou GitHub, analyse la spec, cr\u00e9e un worktree avec le bon nom de branche, et lance un agent qui code et impl\u00e9mente la spec du ticket \u2014 en une seule commande.',
        'skills.continueTitle': 'Reprenez o\u00f9 vous en \u00e9tiez.',
        'skills.continueDesc': 'Bascule sur un worktree existant et recharge tout le contexte du ticket. Reprenez l\u00e0 o\u00f9 vous en \u00e9tiez \u2014 ou prenez le relais sur le travail d\u2019un coll\u00e8gue. Pas de fil perdu, pas besoin de relire la spec.',
        'skills.commitTitle': 'Committez avec du contexte.',
        'skills.commitDesc': 'Indexe vos changements, g\u00e9n\u00e8re un message de commit conventionnel depuis le diff et le contexte du ticket, et committe. Fini le copier-coller d\u2019identifiants ou la r\u00e9daction de messages from scratch.',
        'skills.prTitle': 'Exp\u00e9diez la PR.',
        'skills.prDesc': 'Pousse sur le remote, cr\u00e9e la pull request avec une description compl\u00e8te, et passe le ticket Jira en review. Une commande, z\u00e9ro changement d\u2019onglet.',
        'skills.reviewTitle': 'Reviewez avec des standards.',
        'skills.reviewDesc': 'R\u00e9cup\u00e8re le diff de la PR et la review selon les conventions de votre \u00e9quipe. Commentaires inline, approbation \u2014 tout automatis\u00e9. Fonctionne en self-review ou sur des PRs externes.',
        'skills.resolveTitle': 'Corrigez les retours de review.',
        'skills.resolveDesc': 'Lit chaque commentaire de review, applique les corrections, et force-push. Tous les threads r\u00e9solus, pas d\u2019allers-retours. Du feedback au fix en quelques secondes.',
        'skills.doneTitle': 'Bouclez la boucle.',
        'skills.doneDesc': 'Merge la PR, supprime la branche et le worktree, et passe le ticket Jira en Done. Table rase, pr\u00eat pour la prochaine t\u00e2che.',
        'skills.seeDocs': 'Voir la doc <i data-feather="arrow-right"></i>',
        'skills.overviewTitle': 'En un coup d\u2019\u0153il.',
        'skills.overviewSubtitle': 'Sept commandes. Un cycle de d\u00e9veloppement complet.',
        'skills.overviewStartTitle': 'Start',
        'skills.overviewStartDesc': 'R\u00e9cup\u00e9rer le ticket, cr\u00e9er le worktree, coder.',
        'skills.overviewContinueTitle': 'Continue',
        'skills.overviewContinueDesc': 'Reprendre le travail sur un ticket existant.',
        'skills.overviewCommitTitle': 'Commit',
        'skills.overviewCommitDesc': 'Indexer, message, commit \u2014 avec du contexte.',
        'skills.overviewPrTitle': 'Pull Request',
        'skills.overviewPrDesc': 'Pousser, cr\u00e9er la PR, mettre \u00e0 jour Jira.',
        'skills.overviewReviewTitle': 'Review',
        'skills.overviewReviewDesc': 'Revue de code automatis\u00e9e avec commentaires inline.',
        'skills.overviewResolveTitle': 'Resolve',
        'skills.overviewResolveDesc': 'Corriger les commentaires de review, force-push.',
        'skills.overviewDoneTitle': 'Done',
        'skills.overviewDoneDesc': 'Merge, nettoyage, transition Jira en Done. Boucle boucl\u00e9e.',
        // FAQ
        'faq.title': 'FAQ & Troubleshooting',
        'faq.q1': 'magic-slash est-il gratuit ?',
        'faq.a1': 'Oui. magic-slash est entièrement open-source et gratuit. Il suffit d\'un abonnement Claude Code.',
        'faq.q2': 'Est-ce compatible avec GitHub Issues ?',
        'faq.a2': 'Tout à fait. magic-slash supporte Jira et GitHub Issues nativement.',
        'faq.q3': 'Puis-je personnaliser le format de commit ?',
        'faq.a3': 'Oui. Choisissez entre Conventional Commits, Angular, Gitmoji, ou définissez votre propre format par repo.',
        'faq.q4': 'Est-ce compatible avec tous les langages ?',
        'faq.a4': 'Oui. magic-slash est agnostique au langage — il fonctionne avec tout projet que Claude Code peut gérer.',
        'faq.viewAll': 'Voir toute la FAQ <i data-feather="arrow-right"></i>',
        // Flow Section
        'flow.title': 'Le flow complet.',
        'flow.subtitle': 'Sept \u00e9tapes du ticket au merge. Scrollez pour les d\u00e9couvrir.',
        'flow.step1Title': 'R\u00e9cup\u00e9rez votre ticket.',
        'flow.step1Desc': 'R\u00e9cup\u00e8re le ticket Jira ou GitHub, analyse la spec, cr\u00e9e un worktree avec le bon nom de branche, et lance un agent qui code et impl\u00e9mente la spec du ticket \u2014 en une seule commande.',
        'flow.step2Title': 'Reprenez o\u00f9 vous en \u00e9tiez.',
        'flow.step2Desc': 'Bascule sur un worktree existant et recharge tout le contexte du ticket. Reprenez l\u00e0 o\u00f9 vous en \u00e9tiez \u2014 ou prenez le relais sur le travail d\u2019un coll\u00e8gue. Pas de fil perdu, pas besoin de relire la spec.',
        'flow.step3Title': 'Committez avec du contexte.',
        'flow.step3Desc': 'Indexe vos changements, g\u00e9n\u00e8re un message de commit conventionnel depuis le diff et le contexte du ticket, et committe. Fini le copier-coller d\u2019identifiants.',
        'flow.step4Title': 'Exp\u00e9diez la PR.',
        'flow.step4Desc': 'Pousse sur le remote, cr\u00e9e la pull request avec une description compl\u00e8te, et passe le ticket Jira en review.',
        'flow.step5Title': 'Reviewez avec des standards.',
        'flow.step5Desc': 'R\u00e9cup\u00e8re le diff de la PR et la review selon les conventions de votre \u00e9quipe. Commentaires inline, approbation \u2014 tout automatis\u00e9.',
        'flow.step6Title': 'Corrigez les retours de review.',
        'flow.step6Desc': 'Lit chaque commentaire de review, applique les corrections, et force-push. Tous les threads r\u00e9solus, pas d\u2019allers-retours.',
        'flow.step7Title': 'Bouclez la boucle.',
        'flow.step7Desc': 'Merge la PR, supprime la branche et le worktree, et passe le ticket Jira en Done. Table rase.',
        'flow.cta': 'Commencer <i data-feather="arrow-right"></i>',
        // CTA
        'cta.title': 'Lancez-vous en 30 secondes.',
        'cta.subtitle': 'Installez magic-slash et transformez votre workflow.',
        // Footer
        'footer.tagline': 'Votre workflow, en pilote automatique.',
        'footer.product': 'Produit',
        'footer.gettingStarted': 'D\u00e9marrage rapide',
        'footer.skills': 'Skills',
        'footer.configuration': 'Configuration',
        'footer.changelog': 'Changelog',
        'footer.resources': 'Ressources',
        'footer.documentation': 'Documentation',
        'footer.faq': 'FAQ',
        'footer.company': 'Entreprise',
        'footer.license': 'Licence',
        'footer.reportIssue': 'Signaler un probl\u00e8me',
        'footer.termsLink': 'Conditions',
        'footer.privacyLink': 'Confidentialit\u00e9'
    }
};

// ── Fade-in hero elements ──
function revealHeroElements() {
    var els = document.querySelectorAll('.hero-fade, .header-fade');
    var delay = 0;
    els.forEach(function(el) {
        setTimeout(function() { el.classList.add('visible'); }, delay);
        delay += 150;
    });
}


// ── setLanguage ──
function setLanguage(lang) {
    var translations = i18n[lang];
    if (!translations) return;

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (translations[key] === undefined) return;
        if (el.hasAttribute('data-i18n-html')) {
            el.innerHTML = translations[key];
        } else {
            el.textContent = translations[key];
        }
    });

    // Reset fade elements and replay reveal
    document.querySelectorAll('.hero-fade, .header-fade').forEach(function(el) {
        el.classList.remove('visible');
    });
    revealHeroElements();

    // Re-render feather icons after innerHTML replacements
    feather.replace();

    // Restore version badge if available
    if (window.__latestVersion) {
        var versionEl = document.getElementById('latestVersion');
        if (versionEl) versionEl.textContent = window.__latestVersion;
    }

    // Update html lang attribute
    document.documentElement.lang = lang;

    // Update lang label in header
    var langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.textContent = lang.toUpperCase();

    // Toggle active class on lang options (header + footer)
    document.querySelectorAll('.lang-option, .footer-lang-option').forEach(function(opt) {
        if (opt.dataset.lang === lang) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    // Update footer lang label
    var footerLangLabel = document.getElementById('footerLangLabel');
    if (footerLangLabel) footerLangLabel.textContent = lang === 'fr' ? 'Fran\u00e7ais' : 'English';

    // Persist choice
    localStorage.setItem('magic-slash-lang', lang);
}

// ── Init language (default EN, respect localStorage) ──
(function() {
    var saved = localStorage.getItem('magic-slash-lang');
    setLanguage((saved && i18n[saved]) ? saved : 'en');
})();

// Language dropdown toggle
(function() {
    var toggle = document.getElementById('langToggle');
    var dropdown = document.getElementById('langDropdown');
    var options = dropdown.querySelectorAll('.lang-option');

    toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close nav dropdowns
        document.querySelectorAll('.header-nav-item').forEach(function(item) { item.classList.remove('open'); });
        dropdown.classList.toggle('open');
        toggle.classList.toggle('open');
    });

    options.forEach(function(opt) {
        opt.addEventListener('click', function(e) {
            e.preventDefault();
            setLanguage(opt.dataset.lang);
            dropdown.classList.remove('open');
            toggle.classList.remove('open');
        });
    });

    document.addEventListener('click', function() {
        dropdown.classList.remove('open');
        toggle.classList.remove('open');
    });
})();

// Footer language dropdown toggle
(function() {
    var toggle = document.getElementById('footerLangToggle');
    var dropdown = document.getElementById('footerLangDropdown');
    if (!toggle || !dropdown) return;
    var options = dropdown.querySelectorAll('.footer-lang-option');

    toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        toggle.classList.toggle('open');
    });

    options.forEach(function(opt) {
        opt.addEventListener('click', function(e) {
            e.preventDefault();
            setLanguage(opt.dataset.lang);
            dropdown.classList.remove('open');
            toggle.classList.remove('open');
        });
    });

    document.addEventListener('click', function() {
        dropdown.classList.remove('open');
        toggle.classList.remove('open');
    });
})();

// Nav dropdowns (Products, Resources) — toggle on click
(function() {
    var navItems = document.querySelectorAll('.header-nav-item');
    navItems.forEach(function(item) {
        var dd = item.querySelector('.header-dropdown');
        if (!dd) return;
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            // Close lang dropdown
            document.getElementById('langDropdown').classList.remove('open');
            document.getElementById('langToggle').classList.remove('open');
            var wasOpen = item.classList.contains('open');
            // Close all other nav dropdowns
            navItems.forEach(function(other) { other.classList.remove('open'); });
            if (!wasOpen) {
                item.classList.add('open');
            }
        });
    });
    document.addEventListener('click', function() {
        navItems.forEach(function(item) { item.classList.remove('open'); });
    });
})();


(function() {
    var hero = document.querySelector('.hero');
    var siteHeader = document.querySelector('.site-header');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 0) {
            siteHeader.classList.add('scrolled');
        } else {
            siteHeader.classList.remove('scrolled');
        }
        if (window.scrollY > 600) {
            siteHeader.classList.add('past-hero');
        } else {
            siteHeader.classList.remove('past-hero');
        }
    });
})();


function copyCommand(btn) {
    var codeEl = btn.parentElement.querySelector('code');
    navigator.clipboard.writeText(codeEl.textContent);
    btn.innerHTML = '';
    var icon = document.createElement('i');
    icon.setAttribute('data-feather', 'check');
    btn.appendChild(icon);
    feather.replace();
    setTimeout(function() {
        btn.innerHTML = '';
        var copyIcon = document.createElement('i');
        copyIcon.setAttribute('data-feather', 'copy');
        btn.appendChild(copyIcon);
        feather.replace();
    }, 2000);
}

// Fetch latest version from GitHub
fetch('https://api.github.com/repos/xrequillart/magic-slash/releases/latest')
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.tag_name) {
            window.__latestVersion = data.tag_name;
            document.getElementById('latestVersion').textContent = data.tag_name;
            var headerBadge = document.getElementById('headerVersion');
            headerBadge.textContent = data.tag_name;
            headerBadge.href = data.html_url;
            headerBadge.target = '_blank';
        }
    })
    .catch(function() {});

// ── Desktop terminal animation ──
(function() {
    var terminal = document.querySelector('.desktop-main-terminal');
    if (!terminal) return;

    var contentEl = document.getElementById('desktop-terminal-content');
    if (!contentEl) return;

    var desktopTimeouts = [];
    var desktopAnimationStarted = false;

    function dt(fn, delay) {
        var id = setTimeout(fn, delay);
        desktopTimeouts.push(id);
        return id;
    }

    function selectIn(selector) {
        return terminal.querySelector(selector);
    }

    function lockScroll() {
        contentEl.style.overflowY = 'hidden';
    }
    function unlockScroll() {
        contentEl.style.overflowY = 'auto';
    }

    function scrollToEl(el) {
        if (!el) return;
        var scrollTarget = el.offsetTop + el.offsetHeight - contentEl.clientHeight + 40;
        if (scrollTarget > contentEl.scrollTop) {
            contentEl.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
    }

    function showEl(selector, delay) {
        dt(function() {
            var el = selectIn(selector);
            if (el) {
                el.classList.add('visible');
                scrollToEl(el);
            }
        }, delay);
    }

    function completeEl(selector, delay, showResult) {
        dt(function() {
            var el = selectIn(selector);
            if (el) {
                var loader = el.querySelector('.loader');
                var check = el.querySelector('.checkmark');
                var result = el.querySelector('.result');
                if (loader) loader.classList.add('done');
                if (check) check.classList.add('visible');
                if (showResult && result) result.classList.add('visible');
                scrollToEl(el);
            }
        }, delay);
    }

    function typeText(element, text, speed) {
        element.classList.add('typing');
        var i = 0;
        var interval = setInterval(function() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                element.classList.remove('typing');
            }
        }, speed);
    }

    // Sidebar elements
    // Left sidebar agent elements
    var agentSpinner = document.getElementById('desktop-agent-auth-spinner');
    var agentCheck = document.getElementById('desktop-agent-auth-check');
    var agentDot = document.getElementById('desktop-agent-auth-dot');

    // Right sidebar elements
    var sidebarFiles = document.getElementById('desktop-right-files');
    var sidebarCount = document.getElementById('desktop-right-changes-count');
    var sidebarGauge = document.getElementById('desktop-right-gauge');
    var sidebarHead = document.getElementById('desktop-right-changes-head');
    var sidebarNoChanges = document.getElementById('desktop-right-no-changes');
    var sidebarCommits = document.getElementById('desktop-right-commits');
    var sidebarAhead = document.getElementById('desktop-right-ahead');

    // Sidebar file data matching the terminal diff files
    var sidebarFileData = [
        { name: 'src/middleware/auth.ts', added: 4, removed: 0 },
        { name: 'src/middleware/refresh.ts', added: 4, removed: 0 },
        { name: 'src/routes/index.ts', added: 2, removed: 1 }
    ];

    var sidebarFileCount = 0;

    function updateSidebarCount() {
        if (!sidebarCount) return;
        sidebarCount.textContent = sidebarFileCount + (sidebarFileCount === 1 ? ' file changed' : ' files changed');
        sidebarCount.classList.remove('fade-in');
        void sidebarCount.offsetWidth;
        sidebarCount.classList.add('fade-in');
    }

    function updateSidebarGauge() {
        if (!sidebarGauge) return;
        var totalAdded = 0;
        var totalRemoved = 0;
        for (var i = 0; i < sidebarFileCount; i++) {
            totalAdded += sidebarFileData[i].added;
            totalRemoved += sidebarFileData[i].removed;
        }
        var total = totalAdded + totalRemoved;
        var slots = 6;
        var greenSlots = total > 0 ? Math.round((totalAdded / total) * slots) : 0;
        var redSlots = total > 0 ? Math.round((totalRemoved / total) * slots) : 0;
        var neutralSlots = slots - greenSlots - redSlots;
        var html = '';
        for (var g = 0; g < greenSlots; g++) html += '<span class="g"></span>';
        for (var r = 0; r < redSlots; r++) html += '<span class="r"></span>';
        for (var n = 0; n < neutralSlots; n++) html += '<span class="n"></span>';
        sidebarGauge.innerHTML = html;
    }

    function addSidebarFile(index) {
        if (!sidebarFiles) return;
        if (sidebarNoChanges) sidebarNoChanges.classList.add('hidden');
        if (sidebarHead) sidebarHead.classList.remove('hidden');
        var data = sidebarFileData[index];
        var div = document.createElement('div');
        div.className = 'desktop-right-change-file fade-in';
        var text = data.name;
        if (data.added > 0) text += ' <span class="added">+' + data.added + '</span>';
        if (data.removed > 0) text += ' <span class="removed">-' + data.removed + '</span>';
        div.innerHTML = text;
        sidebarFiles.appendChild(div);
        sidebarFileCount++;
        updateSidebarCount();
        updateSidebarGauge();
    }

    function addSidebarCommit(hash, msg) {
        if (!sidebarCommits) return;
        var div = document.createElement('div');
        div.className = 'desktop-right-commit fade-in';
        div.innerHTML = '<span class="desktop-right-commit-hash">' + hash + '</span>' +
            '<span class="desktop-right-commit-msg">' + msg + '</span>' +
            '<span class="desktop-right-commit-time">now</span>';
        sidebarCommits.insertBefore(div, sidebarCommits.firstChild);
    }

    function showSidebarAhead(count) {
        if (!sidebarAhead) return;
        sidebarAhead.textContent = count + ' ahead of main';
        sidebarAhead.classList.add('fade-in');
    }

    function resetSidebar() {
        // Left sidebar agent reset
        if (agentSpinner) agentSpinner.classList.remove('active');
        if (agentCheck) agentCheck.classList.remove('visible');
        if (agentDot) agentDot.classList.remove('blue-to-green');
        sidebarFileCount = 0;
        if (sidebarFiles) sidebarFiles.innerHTML = '';
        if (sidebarCount) { sidebarCount.textContent = ''; sidebarCount.classList.remove('fade-in'); }
        if (sidebarGauge) sidebarGauge.innerHTML = '';
        if (sidebarCommits) sidebarCommits.innerHTML = '';
        if (sidebarHead) sidebarHead.classList.add('hidden');
        if (sidebarNoChanges) sidebarNoChanges.classList.remove('hidden');
        if (sidebarAhead) { sidebarAhead.textContent = ''; sidebarAhead.classList.remove('fade-in'); }
        var prLink = document.getElementById('desktop-right-pr-link');
        if (prLink) prLink.classList.remove('visible');
    }

    function startDesktopTerminalAnimation() {
        lockScroll();
        var typeSpeed = 60;
        var startCmdText = '/magic:start PROJ-142';
        var startCmdDuration = startCmdText.length * typeSpeed;
        var commitCmdDuration = '/magic:commit'.length * typeSpeed;
        var prCmdDuration = '/magic:pr'.length * typeSpeed;
        var reviewCmdDuration = '/magic:review 87'.length * typeSpeed;
        var resolveCmdDuration = '/magic:resolve'.length * typeSpeed;
        var doneCmdDuration = '/magic:done'.length * typeSpeed;

        // ===== PHASE 1: /start =====
        var p1 = 400;

        dt(function() {
            var prompt1 = selectIn('.phase-1-line.cli-prompt');
            var response1 = selectIn('.phase-1-line.cli-response');
            if (prompt1) {
                prompt1.classList.add('visible');
                scrollToEl(prompt1);
            }
            var cmd1 = prompt1 ? prompt1.querySelector('.command') : null;
            if (cmd1 && cmd1.dataset.text) {
                typeText(cmd1, cmd1.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response1) {
                    response1.classList.add('visible');
                    scrollToEl(response1);
                }
            }, startCmdDuration + 200);
        }, p1);

        var p1Response = p1 + startCmdDuration + 400;
        showEl('.phase-1-status-1', p1Response);
        completeEl('.phase-1-status-1', p1Response + 800);

        showEl('.phase-1-status-2', p1Response + 1000);
        completeEl('.phase-1-status-2', p1Response + 2000, true);

        showEl('.phase-1-status-3', p1Response + 2200);
        completeEl('.phase-1-status-3', p1Response + 3000, true);

        showEl('.phase-1-status-4', p1Response + 3300);
        showEl('.phase-1-status-5', p1Response + 3600);

        // Left sidebar: start spinner when /start begins
        dt(function() {
            if (agentSpinner) agentSpinner.classList.add('active');
        }, p1);

        // Diff reveal + sidebar sync
        dt(function() {
            var diffContainer = selectIn('.agents-diff-container');
            if (diffContainer) {
                diffContainer.classList.add('visible');
                scrollToEl(diffContainer);

                var diffFiles = diffContainer.querySelectorAll('.diff-file');
                var fileDelay = 0;
                diffFiles.forEach(function(file, fileIndex) {
                    dt(function() {
                        file.classList.add('visible');
                        scrollToEl(file);
                        // Add file to sidebar when diff file appears
                        addSidebarFile(fileIndex);
                        var diffLines = file.querySelectorAll('.diff-line');
                        diffLines.forEach(function(line, lineIndex) {
                            dt(function() {
                                line.classList.add('visible');
                                scrollToEl(line);
                            }, lineIndex * 150);
                        });
                    }, fileDelay);
                    fileDelay += 1200;
                });
            }
        }, p1Response + 4100);

        // Complete agent
        dt(function() {
            var agentsEl = selectIn('.phase-1-status-5');
            var diffContainer = selectIn('.agents-diff-container');
            var fileCount = diffContainer ? diffContainer.querySelectorAll('.diff-file').length : 0;
            if (agentsEl) {
                var loader = agentsEl.querySelector('.loader');
                var check = agentsEl.querySelector('.checkmark');
                if (loader) loader.classList.add('done');
                if (check) check.classList.add('visible');
                agentsEl.classList.add('completed');
                var agentsText = agentsEl.querySelector('.agents-text');
                if (agentsText) agentsText.textContent = '1 agent done (' + fileCount + ' files updated)';
            }
        }, p1Response + 8500);

        // ===== PHASE 2: /commit =====
        var p2 = p1Response + 9500;

        dt(function() {
            var prompt2 = selectIn('.phase-2-line.cli-prompt');
            var response2 = selectIn('.phase-2-line.cli-response');
            if (prompt2) {
                prompt2.classList.add('visible');
                scrollToEl(prompt2);
            }
            var cmd2 = prompt2 ? prompt2.querySelector('.command') : null;
            if (cmd2 && cmd2.dataset.text) {
                typeText(cmd2, cmd2.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response2) {
                    response2.classList.add('visible');
                    scrollToEl(response2);
                }
            }, commitCmdDuration + 200);
        }, p2);

        var p2Response = p2 + commitCmdDuration + 400;
        showEl('.phase-2-status-1', p2Response);
        completeEl('.phase-2-status-1', p2Response + 800, true);

        showEl('.phase-2-status-2', p2Response + 1000);
        completeEl('.phase-2-status-2', p2Response + 1800);

        showEl('.phase-2-status-3', p2Response + 2000);

        showEl('.phase-2-status-4', p2Response + 2200);
        completeEl('.phase-2-status-4', p2Response + 3000, true);

        // Sidebar: add commit and clear files changed when "Commit created!"
        dt(function() {
            if (sidebarFiles) sidebarFiles.innerHTML = '';
            if (sidebarCount) sidebarCount.textContent = '';
            if (sidebarGauge) sidebarGauge.innerHTML = '';
            if (sidebarHead) sidebarHead.classList.add('hidden');
            if (sidebarNoChanges) sidebarNoChanges.classList.remove('hidden');
            sidebarFileCount = 0;
            addSidebarCommit('a3f9c2d', 'feat(auth): add JWT middleware');
            showSidebarAhead(1);
        }, p2Response + 3000);

        // ===== PHASE 3: /pr =====
        var p3 = p2Response + 3800;

        dt(function() {
            var prompt3 = selectIn('.phase-3-line.cli-prompt');
            var response3 = selectIn('.phase-3-line.cli-response');
            if (prompt3) {
                prompt3.classList.add('visible');
                scrollToEl(prompt3);
            }
            var cmd3 = prompt3 ? prompt3.querySelector('.command') : null;
            if (cmd3 && cmd3.dataset.text) {
                typeText(cmd3, cmd3.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response3) {
                    response3.classList.add('visible');
                    scrollToEl(response3);
                }
            }, prCmdDuration + 200);
        }, p3);

        var p3Response = p3 + prCmdDuration + 400;
        showEl('.phase-3-status-1', p3Response);
        completeEl('.phase-3-status-1', p3Response + 800, true);

        showEl('.phase-3-status-2', p3Response + 1000);
        completeEl('.phase-3-status-2', p3Response + 1800, true);

        // Sidebar: show PR link when PR is created
        dt(function() {
            var prLink = document.getElementById('desktop-right-pr-link');
            if (prLink) {
                prLink.classList.add('visible');
                feather.replace();
            }
        }, p3Response + 1800);

        showEl('.phase-3-status-3', p3Response + 2000);
        completeEl('.phase-3-status-3', p3Response + 2800, true);

        // ===== PHASE 4: /review =====
        var p4 = p3Response + 3600;

        dt(function() {
            var prompt4 = selectIn('.phase-4-line.cli-prompt');
            var response4 = selectIn('.phase-4-line.cli-response');
            if (prompt4) {
                prompt4.classList.add('visible');
                scrollToEl(prompt4);
            }
            var cmd4 = prompt4 ? prompt4.querySelector('.command') : null;
            if (cmd4 && cmd4.dataset.text) {
                typeText(cmd4, cmd4.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response4) {
                    response4.classList.add('visible');
                    scrollToEl(response4);
                }
            }, reviewCmdDuration + 200);
        }, p4);

        var p4Response = p4 + reviewCmdDuration + 400;
        showEl('.phase-4-status-1', p4Response);
        completeEl('.phase-4-status-1', p4Response + 800, true);

        showEl('.phase-4-status-2', p4Response + 1000);
        completeEl('.phase-4-status-2', p4Response + 2000, true);

        showEl('.phase-4-status-3', p4Response + 2200);

        // ===== PHASE 5: /resolve =====
        var p5 = p4Response + 3000;

        dt(function() {
            var prompt5 = selectIn('.phase-5-line.cli-prompt');
            var response5 = selectIn('.phase-5-line.cli-response');
            if (prompt5) {
                prompt5.classList.add('visible');
                scrollToEl(prompt5);
            }
            var cmd5 = prompt5 ? prompt5.querySelector('.command') : null;
            if (cmd5 && cmd5.dataset.text) {
                typeText(cmd5, cmd5.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response5) {
                    response5.classList.add('visible');
                    scrollToEl(response5);
                }
            }, resolveCmdDuration + 200);
        }, p5);

        var p5Response = p5 + resolveCmdDuration + 400;
        showEl('.phase-5-status-1', p5Response);
        completeEl('.phase-5-status-1', p5Response + 800, true);

        showEl('.phase-5-status-2', p5Response + 1000);
        completeEl('.phase-5-status-2', p5Response + 1800, true);

        showEl('.phase-5-status-3', p5Response + 2000);
        completeEl('.phase-5-status-3', p5Response + 2800, true);

        // ===== PHASE 6: /done =====
        var p6 = p5Response + 3600;

        dt(function() {
            var prompt6 = selectIn('.phase-6-line.cli-prompt');
            var response6 = selectIn('.phase-6-line.cli-response');
            if (prompt6) {
                prompt6.classList.add('visible');
                scrollToEl(prompt6);
            }
            var cmd6 = prompt6 ? prompt6.querySelector('.command') : null;
            if (cmd6 && cmd6.dataset.text) {
                typeText(cmd6, cmd6.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response6) {
                    response6.classList.add('visible');
                    scrollToEl(response6);
                }
            }, doneCmdDuration + 200);
        }, p6);

        var p6Response = p6 + doneCmdDuration + 400;
        showEl('.phase-6-status-1', p6Response);
        completeEl('.phase-6-status-1', p6Response + 800, true);

        showEl('.phase-6-status-2', p6Response + 1000);
        completeEl('.phase-6-status-2', p6Response + 1800, true);

        showEl('.phase-6-status-3', p6Response + 2000);
        completeEl('.phase-6-status-3', p6Response + 2800, true);

        // Success banner
        dt(function() {
            var banner = selectIn('.phase-6-status-4');
            if (banner) {
                banner.classList.add('visible');
                scrollToEl(banner);
            }
            // Left sidebar: spinner → check
            if (agentSpinner) agentSpinner.classList.remove('active');
            if (agentCheck) agentCheck.classList.add('visible');
            if (agentDot) agentDot.classList.add('blue-to-green');
        }, p6Response + 3200);

        // Show replay button
        dt(function() {
            var btn = terminal.querySelector('.desktop-replay-btn');
            if (btn) btn.classList.add('visible');
            unlockScroll();
        }, p6Response + 3800);
    }

    // Replay function (global for onclick)
    window.replayDesktopTerminal = function() {
        // Clear all timeouts
        desktopTimeouts.forEach(function(id) { clearTimeout(id); });
        desktopTimeouts = [];

        // Reset all visual elements
        terminal.querySelectorAll('.cli-prompt, .cli-response, .cli-status, .cli-agents, .cli-success-banner')
            .forEach(function(el) {
                el.classList.remove('visible', 'completed');
            });
        terminal.querySelectorAll('.loader').forEach(function(el) { el.classList.remove('done'); });
        terminal.querySelectorAll('.checkmark').forEach(function(el) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.result').forEach(function(el) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.command').forEach(function(cmd) {
            cmd.textContent = '';
            cmd.classList.remove('typing');
        });
        terminal.querySelectorAll('.workflow-line').forEach(function(el) { el.classList.remove('visible'); });

        var agentsText = terminal.querySelector('.agents-text');
        if (agentsText) agentsText.textContent = '1 agent coding...';

        var diffContainer = terminal.querySelector('.agents-diff-container');
        if (diffContainer) diffContainer.classList.remove('visible');
        terminal.querySelectorAll('.diff-file').forEach(function(el) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.diff-line').forEach(function(el) { el.classList.remove('visible'); });

        var btn = terminal.querySelector('.desktop-replay-btn');
        if (btn) btn.classList.remove('visible');

        contentEl.scrollTop = 0;

        // Reset sidebar
        resetSidebar();

        startDesktopTerminalAnimation();
    };

    // IntersectionObserver to trigger animation on scroll
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting && !desktopAnimationStarted) {
                desktopAnimationStarted = true;
                startDesktopTerminalAnimation();
                // Re-render feather icons for the new elements
                feather.replace();
            }
        });
    }, { threshold: 0.3 });

    observer.observe(terminal);
})();

// ── Flow section: scroll-driven step switching ──
(function() {
    var flowSteps = document.querySelectorAll('.flow-step');
    var flowContents = document.querySelectorAll('.flow-terminal-content');
    var flowDots = document.querySelectorAll('.flow-mockup-dot');
    var flowSection = document.querySelector('.flow-section');

    if (!flowSteps.length || !flowSection) return;

    var stepColors = ['#6366f1', '#6366f1', '#a855f7', '#22c55e', '#06b6d4', '#f97316', '#22c55e'];
    var currentStep = -1;
    var ticking = false;

    function setActiveStep(index) {
        if (index === currentStep) return;
        currentStep = index;

        flowSteps.forEach(function(step, i) {
            step.classList.toggle('active', i === index);
        });
        flowContents.forEach(function(content, i) {
            content.classList.toggle('active', i === index);
        });
        flowDots.forEach(function(dot, i) {
            if (i === index) {
                dot.classList.add('active');
                dot.style.background = stepColors[i];
            } else {
                dot.classList.remove('active');
                dot.style.background = '';
            }
        });
    }

    function updateActiveStep() {
        var sectionRect = flowSection.getBoundingClientRect();

        // Only compute when section is visible
        if (sectionRect.bottom < 0 || sectionRect.top > window.innerHeight) {
            ticking = false;
            return;
        }

        var viewportCenter = window.innerHeight / 2;
        var closest = 0;
        var closestDist = Infinity;

        flowSteps.forEach(function(step, i) {
            var rect = step.getBoundingClientRect();
            var center = rect.top + rect.height / 2;
            var dist = Math.abs(viewportCenter - center);
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        });

        setActiveStep(closest);
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(updateActiveStep);
            ticking = true;
        }
    });

    // Initial state
    setActiveStep(0);
})();
