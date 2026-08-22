# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.77.0] - 2026-08-22

### Changed

- **Desktop**: The spec card is headed by the repository being planned against, at the weight the repository cards give it, in place of a `SPEC` label that only ever named the card the panel already is

### Fixed

- **Desktop**: Switching agents no longer lags. The info sidebar's width snaps instead of animating across 300ms of moving layout for the terminal to chase, the terminal is fitted on the frame the switch commits rather than two frames and a 200ms debounce later, and a background agent keeps tracking layout while hidden — the fit that resolved that staleness landed a SIGWINCH, and a full Claude Code repaint, exactly on the frame you switched to it
- **Desktop**: A spec path an agent announces is validated and bound to that agent, and a previewed file is read through the descriptor it was validated on, so nothing outside the repository can be read through the panel
- **Desktop**: Ctrl+W is no longer swallowed by the desktop app

## [0.76.2] - 2026-08-22

### Added

- **Desktop**: An agent has a TYPE — `coder` or `planner` — declared rather than inferred from its status. The sidebar layout, the statuses the picker offers and which status closes the agent all follow the type, so a planner is laid out correctly from its very first render instead of only once a status arrives. The skills announce it (`/metadata?type=`), a new agent takes the type chosen in Settings (`coder` unless changed), and the title bar offers a coder/planner switch for as long as the agent has reported no status. **Requires migrations `20260822090000_agents_type.sql` and `20260822090100_user_settings_default_agent_type.sql`; the second recreates `admin_get_user`, whose `returns table` both clients name column by column, so a database that has not run it breaks the back-office user detail**
- **Desktop**: While an agent is planning, the info sidebar shows the `/magic:plan` spec live in place of the ticket header — the local file, re-read on the `plan:specChanged` ping, so it fills in as Claude Code writes it with cloud sync off and with no network. The terminal stays fully usable beside it (no modal, no backdrop), an expand control opens the same file in the file preview, and at `planned` the spec sits under the ticket that was created from it, both readable at once
- **Plan**: A repository can choose the language its spec is written in, separately from its tickets — `languages.spec` heads the chain `spec` -> `ticket` -> `jiraComment` -> `en`, so a repository that never sets it resolves exactly as it did before the key existed. When the two differ, `/magic:plan` translates the spec's own words into the ticket language rather than recomposing a body from the conversation
- **Desktop**: A plan's status is a select on its page in the webapp, listing both states with the current one visible, rather than a button labelled by the flip it would perform
- **Desktop**: A plan session can be marked done — or reopened — from its own page in the webapp by its author, so a session whose final spec ping never landed no longer sits at "being written" with SQL as the only repair

## [0.76.1] - 2026-08-21

### Changed

- **Desktop**: Plan sessions moved up in the application settings, right under the background-app section

## [0.76.0] - 2026-08-21

### Added

- **Plan**: `/magic:plan` sessions are stored in the cloud and readable on a new `/plans` page in the webapp — the spec, the tickets it created and who ran it, shared with the whole organization on a team repository and with nobody else on a personal one. **Requires migrations `20260821090000_plan_sessions.sql` and `20260821090100_user_settings_plan_sync.sql`: the second recreates `admin_get_user`, whose `returns table` both clients name column by column, so a database that has not run it breaks the back-office user detail**
- **Desktop**: The main process uploads the spec as it fills, coalescing a burst of writes into one upsert, and spools it to the outbox when offline — the skill only pings `/plan/spec` and `/plan/tickets` and never talks to Supabase itself
- **Desktop**: A per-user setting turns spec sync off entirely, from Settings → Application or from the webapp; with it off the local file is still written and everything reading it keeps working

### Changed

- **Docs**: Cloud plan sessions documented

### Fixed

- **Desktop**: Spec reads are confined to the session's own repository, and a queued spec upload is scoped to the user who owns it

## [0.75.3] - 2026-08-21

### Added

- **Desktop**: Machine setup reworked around a loader and one verdict

### Fixed

- **Desktop**: The agent info sidebar is hidden when there is no agent

## [0.75.2] - 2026-08-21

### Added

- **Desktop**: Repository settings tabs rebuilt around what each skill does
- **Desktop**: Tab panels slide in from the side their tab sits on

## [0.75.1] - 2026-08-20

### Added

- **Desktop**: Real SVG flags in every language picker, drawn at one ratio so they line up — the pickers are no longer native selects, which cannot hold anything but text
- **Desktop**: The GitHub remote is editable from the Tracker tab and, for the first time, from the webapp

### Changed

- **Desktop**: Repository settings regrouped into eight subject tabs — General, Tracker, Languages, Git, then one tab per skill in workflow order — each cut into sub-sections, with the danger zone folded into General
- **Desktop**: Language settings gathered in one tab and grouped by who reads them, and the ticket-comment and review-reply settings renamed apart
- **Plan**: The repository's Jira coordinates moved out of `issues.jiraUrl` and `plan.jiraProject` into their own `jira` block. **Requires migration `20260820090000_repositories_jira.sql`: both clients name the column in their select, so a database that has not run it returns no repositories at all**
- **Plan**: Skill description trimmed to 110 words

### Fixed

- **Desktop**: The same internal padding on every settings card, and no hairline left hanging under the last row of one

## [0.75.0] - 2026-08-20

### Added

- **Plan**: New `/magic:plan` skill, the eighth in the cycle — turn an idea into a reviewed spec, then an epic and its stories in Jira or GitHub with a real parent/child hierarchy, required-field discovery and assignee resolution
- **Desktop**: Planning agent statuses and the spec path metadata field
- **Desktop**: Per-repository settings for `/magic:plan`
- **Desktop**: Per-repository ticket language setting

### Changed

- **Plan**: Trigger evals with start-boundary cases, and the eight duplicated skill lists pinned to `skills/`
- **Desktop**: Extract the chip list out of the worktree files row

## [0.74.3] - 2026-08-19

### Added

- **Desktop**: Start the update download from a sidebar button

### Fixed

- **Desktop**: Show the github mark and link for a bare issue id

## [0.74.2] - 2026-08-19

### Added

- **Desktop**: Open the repository on github from the info sidebar

### Fixed

- **Desktop**: Portal the scripts dropdown out of the clipped sidebar

## [0.74.1] - 2026-08-19

### Added

- **Desktop**: Write notifications as explicit translated sentences
- **Landing**: Add the agent info panel section

## [0.74.0] - 2026-08-19

### Added

- **PR**: Point the test scenarios at the ci preview url
- **Desktop**: Show the tracker mark next to the ticket id

### Fixed

- **Desktop**: Derive the github issues url from the repo remote

## [0.73.0] - 2026-08-18

### Added

- **Desktop**: Archive the pre-cloud config.json at launch
- **Desktop**: Give each pr notification its own switch

### Changed

- **Desktop**: Drop the full-stack task card from the agent sidebar
- **Deps**: Bump globals from 17.9.0 to 17.11.0
- **Deps**: Bump the linters group with 4 updates
- Replace the local config file section with the desktop api

### Fixed

- **Desktop**: Only unpublish the port file the running server owns
- **Desktop**: Let the PR refresh button bypass the poll throttle
- **Install**: Read the cli version from the app bundle
- Read the config from the desktop api instead of the retired local file

## [0.72.2] - 2026-08-17

### Changed

- **Desktop**: Cache the spend estimate per transcript file

### Fixed

- **Desktop**: Show a loading state in the spend card

## [0.72.1] - 2026-08-16

### Changed

- **Desktop**: Remove the cost & usage block from the team page

## [0.72.0] - 2026-08-16

### Added

- **Desktop**: Clone org repos during invitation onboarding
- **Desktop**: List org repositories during invitation onboarding

### Fixed

- **Desktop**: Pin the remote owner per org and let admins correct it
- **Desktop**: Validate the captured remote and the clone payloads
- **Desktop**: Surface add-repository warnings in the invitation wizard

## [0.71.5] - 2026-08-15

### Added

- **Desktop**: Surface per-model usage on the team dashboard
- **Desktop**: Persist model id and context window size on usage_events
- **Desktop**: Auto-detect the context window on the skills gauge

### Fixed

- **Desktop**: Scale the skill listing budget to the context window

## [0.71.4] - 2026-08-15

### Added

- **Desktop**: Rework the organization settings and its rail entry
- **Desktop**: Rebuild the empty agents state

### Changed

- **Desktop**: Put every control on the same small size
- **Webapp**: Raise the file descriptor limit for the dev server
- **Readme**: Document the cloud architecture
- **Desktop**: Drop the obsolete config validation toast

### Fixed

- **Desktop**: Play the confetti after a real update

## [0.71.3] - 2026-08-14

### Added

- **Desktop**: Rebuild the pr sidebar card as a checklist
- **Desktop**: Persist named pr checks and stamp manual refreshes

## [0.71.2] - 2026-08-14

### Added

- **Desktop**: Surface the pr watcher setting on the pr card

### Changed

- **Desktop**: Move the pr watcher settings above activity recording

## [0.71.1] - 2026-08-14

### Changed

- **Desktop**: Merge the pr link into a cell-based pr card

### Fixed

- **Desktop**: Find gh when the app is launched from the dock

## [0.71.0] - 2026-08-14

### Added

- **Desktop**: Show the time spent running skills on the team page
- **Webapp**: Replace the hours card with an opt-in when tracking is off
- **Webapp**: Report which agent the last skill run belonged to
- **Webapp**: Show the time spent running skills on the dashboard
- **Desktop**: Add a dedicated pr watch card to the repository card
- **Desktop**: Rebuild the pr watcher on a single graphql query
- **Webapp**: Add the spotlight toggle and regroup the features tab
- **Webapp**: Split the application page into tabs
- **Webapp**: Make the notification and sidebar settings editable

### Changed

- **Desktop**: Give the team page tabs the webapp's sliding pill rail
- **Webapp**: Share the application tab strip with the dashboard
- **Webapp**: Show the repository icon instead of a color dot on the dashboard

### Fixed

- **Desktop**: Key an agent even when its writer omits the app id
- **Desktop**: Report and retry a failed agent archive
- **Desktop**: Retry a transient review page before abandoning the walk
- **Desktop**: Paginate reviews so a verdict cannot fall out of the window
- **Desktop**: Fan pr reads out to every card sharing a url
- **Desktop**: Heartbeat a spool drain so a live claim is never adopted
- **Desktop**: Give each spool drain its own working files
- **Desktop**: Claim the skill spool with an atomic rename
- **Desktop**: Isolate the dev build's config, port and instance lock
- **Desktop**: Key agents on their app id to stop duplicate rows

## [0.70.0] - 2026-08-13

### Added

- **Desktop**: Add a notifications tab and regroup the appearance settings
- **Desktop**: Edit the user profile inline in settings
- **Desktop**: Show an account status checklist in settings

### Changed

- **Desktop**: Align the claude email with the other account rows

## [0.69.0] - 2026-08-13

### Added

- **Desktop**: List repositories as a settings sidebar submenu
- **Desktop**: Show how many agents are asking in the menu bar

### Changed

- **Deps**: Bump globals from 17.8.0 to 17.9.0
- **Deps**: Bump typescript-eslint in the linters group

### Fixed

- **Desktop**: Relaunch an agent in the repository attached to it

## [0.68.6] - 2026-08-07

### Fixed

- **Desktop**: Open the tray and quick launch without activating the app
- **Desktop**: Keep the tray update button square

## [0.68.5] - 2026-08-07

### Added

- **Desktop**: Turn the tray icon orange on a pending question
- **Desktop**: Show the CI green status in the app

### Fixed

- **Desktop**: Align the tray update button with the account button

## [0.68.4] - 2026-08-06

### Added

- **Desktop**: Answer multiSelect questions from the menu bar panel

### Fixed

- **Desktop**: Keep a tray question until it is actually answered

## [0.68.3] - 2026-08-06

### Fixed

- **Desktop**: Strip every escape sequence from the permission preview

## [0.68.2] - 2026-08-06

### Fixed

- **Desktop**: Send tray answer keystrokes one at a time

## [0.68.1] - 2026-08-06

### Fixed

- **Desktop**: Keep a notification from replacing a pending question

## [0.68.0] - 2026-08-06

### Added

- **Desktop**: Answer agent questions from the menu bar panel

### Changed

- **Desktop**: Share strip-ansi between main and renderer
- **Desktop**: Feed the hook stdin from a file so a short-circuit cannot EPIPE

### Fixed

- **Desktop**: Guard the answer ipc payload before unpacking it
- **Desktop**: Validate the answer choice crossing ipc
- **Install**: Remove magic-slash hooks on uninstall

## [0.67.0] - 2026-08-06

### Added

- **Desktop**: List agents newest first and stop moving them around
- **Desktop**: Flag waiting agents with an orange question bubble
- **Landing**: Match the mockup's waiting glyph to the app badge

## [0.66.0] - 2026-08-06

### Added

- **Desktop**: Add repo setup modal on launch for unset paths

### Fixed

- **Desktop**: Preserve row state when a write or its re-check fails

## [0.65.1] - 2026-08-05

### Added

- Replace the logo with the new s/ash lockup

### Changed

- **Desktop**: Match the tray panel to the sidebar's list and buttons
- **Desktop**: Remove the unused legacy logo asset

### Fixed

- **Desktop**: Keep the menu bar panel from activating the app

## [0.65.0] - 2026-08-05

### Added

- **Desktop**: Replace the native tray menu with the app's own panel
- **Webapp**: Add the local path step to the onboarding checklist
- **Webapp**: Download the app directly instead of via GitHub

### Changed

- **Desktop**: Extract the agent state badge and the display name helper
- **Webapp**: Match the mockup loader to the app's waving bars
- **Desktop**: Replace the sidebar spinner with three waving bars
- **Webapp**: Warn on the theme note and unstick the language note
- **Webapp**: Say the theme dresses the app, not the site

### Fixed

- **Webapp**: Stop the onboarding test from loading Supabase

## [0.64.3] - 2026-08-05

### Changed

- **Desktop**: Sign-in only — the login screen no longer offers account creation

## [0.64.2] - 2026-08-05

### Changed

- **Desktop**: Fold machine setup into the renamed application tab

## [0.64.1] - 2026-08-04

### Added

- **Desktop**: Install Claude Code from the setup panel

### Fixed

- **Desktop**: Read the interactive shell before calling a tool missing

## [0.64.0] - 2026-08-04

### Added

- **Webapp**: Give every page one host and retire the admin subdomain
- **Webapp**: Use the invite subdomain and read pasted links
- **Desktop**: Send invitations to the invite subdomain
- **Webapp**: Map each host to its own front door
- **Commit**: Branch off before committing on a main branch
- **Webapp**: Add the main-branch commit toggle to repository settings
- **Desktop**: Add the main-branch commit toggle to repository settings
- **Desktop**: Add a setting to guard commits on main branches
- **Desktop**: Add the setup wizard and machine setup panel
- **Desktop**: Set up the machine on launch instead of an install script
- **Webapp**: Add the settings illustration and give both panels depth
- **Webapp**: Add the tilted agent list to the parallel jobs section
- **Webapp**: Slow the hero mockup and follow the app's own states
- **Webapp**: Animate the hero mockup through the six skills
- **Webapp**: Reposition the landing page around the product outcome
- **Desktop**: Use the rabbit mark for the menu bar tray icon
- **Desktop**: Replace the app icon with the new blue rabbit
- **Webapp**: Replace the logo and favicon with the new rabbit lockup
- **Start**: Gate on ticket dependencies before starting
- **Webapp**: Port the documentation with a build-time changelog
- **Webapp**: Port the landing, skills, desktop and story pages
- **Webapp**: Add the public site and documentation catalogues
- **Webapp**: Move the login form to /login and rewrite by host

### Changed

- **Readme**: Refresh the logo and drop the app screenshot
- Remove the static github pages site
- Adapt the release and audit skills to the removed site
- Keep the shelved v2 vision outside the deleted site
- **Webapp**: Unlink the reference from the header and footer
- Document the main-branch commit setting
- Point the audit and release skills at the setup module
- Describe the app's own setup instead of the install script
- **Landing**: Offer the download instead of the install command
- **Webapp**: Offer the download instead of the install command
- **Install**: Remove the install script
- Drop the install script jobs and test on both platforms
- **Webapp**: Drop the indigo scrim from the tilted panels' edge
- **Webapp**: Catch a broken comment in marketing.css

### Fixed

- **Webapp**: Keep the session across hosts and land invitees on the app
- **Desktop**: Point the app's links at magic-slash.io
- Point users to settings instead of the removed installer
- **Desktop**: Complete the permissions and scope them to integrations
- **Start**: Offer the merge commit as base and forbid the unsafe fallback
- **Start**: Re-check merged blocker against the resolved dev branch
- **Start**: Validate blocker pr identity, merge target and base ref

## [0.63.1] - 2026-07-31

### Fixed

- State skill run duration and skill exclusions in the recording breakdown

## [0.63.0] - 2026-07-31

### Added

- **Start**: Read jira custom fields when a ticket has no usable spec

### Changed

- **Desktop**: Drop the abandoned count from skill stats

### Fixed

- **Desktop**: Serialize agent cloud writes to stop false save errors

## [0.62.0] - 2026-07-31

### Added

- **Webapp**: Translate every user page into French, switchable from the login page
- **Pr**: Surface the project's test accounts, configurable per repo

### Fixed

- **Desktop**: Count skills launched from their slash command
- **Pr**: Reject a symlinked test-account source
- **Pr**: Redact credentials from the reference-mode account line
- **Pr**: Reject test-account sources outside the worktree

## [0.61.0] - 2026-07-31

### Added

- **Desktop**: Render read-only skills as a readable document rather than a locked form
- **Desktop**: Record skill runs end to end and stop dropping telemetry
- **Desktop**: Audit settings changes with a database trigger
- Close the skill run from each skill's final step

## [0.60.0] - 2026-07-31

### Added

- **Desktop**: Show per-skill run counts on the Team page, for an organization and for your own work
- **Webapp**: Show the same per-skill run counts on the dashboard
- **Webapp**: Count each magic skill's runs on the admin org record
- **Webapp**: Rework the admin org record header with a copyable id and member/repo counts
- **Start**: Detect and follow a ticket's UI/UX design references

### Changed

- **Supabase**: Assert that a skill run follows its agent's derived organization
- **Install**: Allowlist the Jira remote issue links call

### Fixed

- **Start**: Report the task branch once the worktree exists, so the agent's branch name is recorded
- **Continue**: Report the resumed branch from inside the worktree, for the same reason
- **Start**: Clear a stale design brief when a ticket has no mockup, and sync the desktop permissions
- **Desktop**: Stop attributing skill runs with no agent to the user's first organization
- **Desktop**: Centre the modals on the window rather than on the content pane
- **Webapp**: Compare app versions to the shipped release rather than to the fleet

## [0.59.3] - 2026-07-30

### Added

- **Supabase**: Add org names, repo count and path binding flag to the admin RPCs
- **Webapp**: Rework the admin users list and the user record page

### Changed

- **Webapp**: Swap the admin sidebar for a full-width top nav

### Fixed

- **Desktop**: Make the agent status colours legible on the light themes
- **Webapp**: Keep the settings tables out of the Supabase module graph, so their test runs in CI

## [0.59.2] - 2026-07-29

### Fixed

- **Desktop**: Decouple the branch metadata helper from node-pty, so its test runs in CI

## [0.59.1] - 2026-07-29

### Added

- **Desktop**: Always show the context gauge in the agent sidebar
- **Supabase**: Add admin org management RPCs with a platform-admin gate
- **Webapp**: Rebuild the admin back-office as a CRUD console

### Changed

- **Desktop**: Read agent fields from their columns rather than the jsonb

### Fixed

- **Desktop**: Persist the git branch detected for an agent

## [0.59.0] - 2026-07-28

### Added

- **Desktop**: Record activity by default and show what is collected

## [0.58.0] - 2026-07-28

### Added

- **Webapp**: Add a read-only platform admin back-office, with a tabbed nav across its sections
- **Supabase**: Add a platform admin role and the read-only RPCs the back-office reads from, including `admin_list_orgs` for the organization list
- **Desktop**: Open a repository from the settings list with a sideways sweep — the detail arrives from the right and leaves back to the right, so opening a page reads differently from stepping along the rail
- **Landing**: Add a favicon and an Apple touch icon to the docs site
- Add a favicon and an Apple touch icon to the webapp

### Fixed

- **Webapp**: Drop stale user-detail responses when the route changes, so a slow request can no longer paint the previous user over the one now on screen
- **Webapp**: Let the back-office tabs scroll, and refresh the webapp readme
- **CI**: Keep the fleet rollup tests free of the Supabase import chain

## [0.57.3] - 2026-07-28

### Added

- **Desktop**: Give the settings and skills pages a directional transition — picking an entry further down the rail sweeps the pages up, going back up sweeps them down, and the page being left clears the frame before the next one arrives

## [0.57.2] - 2026-07-28

### Fixed

- **Desktop**: Persist the refresh token Supabase rotates on every refresh, so a cloud session survives an app restart instead of forcing a new sign-in after about an hour of uptime
- **Desktop**: Keep the cloud session through a network failure — only a refresh token Supabase definitively rejects signs the user out, so waking from sleep or switching wifi no longer logs you out

## [0.57.1] - 2026-07-27

### Changed

- **Desktop**: Gate activity and skill logs behind the usage opt-in

### Removed

- **Desktop**: Remove the activity History page and its enable-history switch

### Fixed

- **Desktop**: Derive an event's organization from its agent, fixing the foreign key error that blocked activity, usage and skill logging

## [0.57.0] - 2026-07-27

### Added

- **Desktop**: Color the context gauge orange at 40% and red at 70%
- **Desktop**: Add a permanent skill rail to the skills modal

## [0.56.0] - 2026-07-27

### Added

- **Desktop**: Derive an agent's organization from its repositories
- Show team repositories on the webapp dashboard
- **Desktop**: Archive agents on close instead of deleting them
- **Desktop**: Replace team flow metrics with per-repo agent counts

### Fixed

- **Desktop**: Identify a repository by path for worktree files

## [0.55.1] - 2026-07-27

### Added

- **Desktop**: Sync settings and repositories in real time
- **Desktop**: Match Claude Code's theme to the app theme

### Changed

- **Desktop**: Promote the theme registry to the shared level
- **Deps**: Bump globals from 17.7.0 to 17.8.0
- **Deps**: Bump the linters group with 4 updates

### Fixed

- **Desktop**: Protect the config cache from failed and racing loads
- **Desktop**: Extract the user settings mapper out of CloudStore

## [0.55.0] - 2026-07-27

### Added

- **Desktop**: Add a watchCI pull request setting
- **Pr**: Watch CI and review feedback after creating the PR
- Add a webapp application page for app status and settings
- **Desktop**: Replace team volume stats with flow metrics

### Changed

- **Desktop**: Use Cera Pro for session usage and Claude email
- **Readme**: Document the watchCI pull request setting

### Fixed

- **Desktop**: Relaunch agents in their attached repository
- **Desktop**: Scope numeric ticket ids by repo in the flow key
- **Desktop**: Keep the merge-detection test off the node-pty graph
- **Desktop**: Record merge and changes-requested activity events
- Keep the dropdown open while scrolling its own option list

## [0.54.1] - 2026-07-27

### Added

- **Desktop**: Translate the whole interface — the sidebar, every settings page, the agent info panel, the dashboards and all dialogs now follow the app language

## [0.54.0] - 2026-07-27

### Added

- **Desktop**: Add an application language setting (en/fr)

### Changed

- **Desktop**: Align repo detail cards with the standard card surface

### Fixed

- **Desktop**: Keep the local language when the cloud has none
- **Desktop**: Hold the main-process language outside appearance.ts

## [0.53.0] - 2026-07-26

### Added

- **Desktop**: Make the interface themeable with eight light and dark themes
- **Desktop**: Add an interface scale setting
- **Desktop**: Animate page changes in the settings
- **Desktop**: Animate modals when they close
- Restrict team repository settings to org admins and the repo creator
- **Webapp**: Build out the dashboard, account, organization and repository pages

### Changed

- **Desktop**: Lay out the organization members as a table
- **Desktop**: Align the repository page padding with the other settings tabs

### Fixed

- **Desktop**: Keep the role picker the same width for both roles

## [0.52.6] - 2026-07-25

### Added

- **Desktop**: Stop recording activity events when history is off
- **Desktop**: Gate skill invocation logging on the history toggle

### Fixed

- **Desktop**: Apply the history toggle without an app restart

## [0.52.5] - 2026-07-25

### Added

- **Desktop**: Enable the sidebar usage card by default
- **Desktop**: Log every skill invocation to supabase
- Redesign the webapp dashboard with a top nav and install state
- **Desktop**: Move skills, history and team into modals

## [0.52.4] - 2026-07-25

### Added

- **Desktop**: Group claude code settings into a single tab

### Fixed

- **Desktop**: Stop listing accepted invitations in organization settings
- **Desktop**: Show the login wall as soon as the session is dropped

## [0.52.3] - 2026-07-25

### Fixed

- **Desktop**: Scope agents and activity history to their owner

## [0.52.2] - 2026-07-25

### Added

- **Desktop**: Store user settings and app version in user-scoped tables

## [0.52.1] - 2026-07-25

### Added

- **Desktop**: Land on agents page with the top agent selected

### Changed

- **Desktop**: Remove every backdrop-filter to fix scroll stutter
- **Desktop**: Render usage percentages in cera pro

### Fixed

- **Desktop**: Keep ws optional native deps out of the main bundle
- **Desktop**: Give realtime a ws transport so the team feed connects

## [0.52.0] - 2026-07-25

### Added

- **Supabase**: Add multi-tenant schema and rls foundations
- **Auth**: Add account lifecycle (reset, settings, deletion, session)
- **Desktop**: Add optional cloud auth and organization management
- **Desktop**: Make supabase the single source of truth for config/agents/history
- **Org**: Add member management and multi-org switching
- **Desktop**: Add sidebar account button with login entry point
- **Desktop**: Add sidebar account icon and team shortcut
- **Desktop**: Rework settings with account tab and org cards
- **Desktop**: Support per-organization rosters and org creation
- **Desktop**: Settings modal and team/personal repositories
- **Desktop**: Add team/personal repositories schema with RLS and realtime
- **Desktop**: Add realtime team agents dashboard
- **Desktop**: Team dashboard, re-engagement notifs and daily digest
- **Desktop**: Add opt-in usage logs and org stats dashboard
- **Desktop**: Add profiles table with own-only RLS
- **Desktop**: Sync user profile with the cloud, mirrored to profile.md
- **Desktop**: Add get_invitation_preview rpc for the web invite funnel
- **Desktop**: Add delete invitation action in org settings
- **Desktop**: Share web invite link instead of the raw token
- **Desktop**: Serve config and agent metadata over the status server
- Read live config and metadata from the desktop app in skills
- **Desktop**: Show usage gauges in minimized sidebar card
- **Desktop**: Add minimize toggle to context usage card
- **Desktop**: Streamline repository controls in agent info sidebar
- **Webapp**: Add invitation funnel and download web app
- **Webapp**: Light theme and split-screen invitation funnel
- **Webapp**: Connected dashboard with account, organization and profile

### Changed

- **Desktop**: Refine minimized agent usage card layout
- **Desktop**: Drop active agents list from team dashboard
- **Desktop**: Load supabase credentials from .env files
- **Desktop**: Inject supabase credentials into the release build
- **Desktop**: Mock heavy sibling modules in org test for root run
- **Webapp**: Pin vercel framework to nextjs

### Fixed

- **Desktop**: Surface capped flag on org usage stats
- **Desktop**: Resolve review feedback on settings tab deep-link

## [0.51.0] - 2026-07-23

### Added

- **Desktop**: Surface Claude account usage in sidebar and settings

### Changed

- **Desktop**: Remove scheduled events feature

## [0.50.1] - 2026-07-22

### Added

- **Desktop**: Show plan rate limits (5h/7d) in usage sidebar

## [0.50.0] - 2026-07-22

### Added

- **Desktop**: Show live context usage and cost in agent sidebar

### Changed

- **Deps**: Bump actions/setup-node from 4 to 7
- **Deps**: Bump vitest from 4.1.9 to 4.1.10
- **Deps**: Bump globals from 17.6.0 to 17.7.0
- **Deps**: Bump actions/checkout from 4 to 7
- **Deps**: Bump the linters group with 4 updates

### Fixed

- **Pr**: Address review feedback

## [0.49.1] - 2026-07-20

### Fixed

- **Desktop**: Decouple terminal grouping logic from react for CI tests

## [0.49.0] - 2026-07-20

### Added

- **Resolve**: Pin config settings and add ask commit mode

### Fixed

- **Desktop**: Recognize 'Review addressed' status and guard unknown ones
- **Resolve**: Echo pinned config vars and harden repo-key path match

## [0.48.0] - 2026-07-10

### Added

- **Pr**: Require concrete manual test scenarios in the how-to-test section

### Changed

- **Deps**: Bump vitest from 4.1.6 to 4.1.9

## [0.47.4] - 2026-05-19

### Added

- **Resolve**: Allow commit mode override (new/amend) at the preview step without modifying config

## [0.47.3] - 2026-05-19

### Added

- **Desktop**: Improve history page with day pagination and compact event rows

## [0.47.2] - 2026-05-18

### Added

- **Desktop**: Add history feature flag in settings

## [0.47.1] - 2026-05-18

### Added

- **Release**: Add landing page version update step to magic-release skill

### Fixed

- **Landing**: Remove github api calls and hardcode version badges

## [0.47.0] - 2026-05-18

### Added

- **Desktop**: Add tabbed settings navigation and conditional scheduler button

### Changed

- **Landing**: Remove dribbble button from footers

## [0.46.0] - 2026-05-18

### Added

- **Desktop**: Add file preview panel with syntax highlighting and diff view
- **Desktop**: Remove 52-week limit from activity heatmap

### Changed

- **Desktop**: Fix claude.md formatting and title
- **Desktop**: Restore claude.md title
- **Test**: Fix vitest 4 mock typing and add shiki mock
- **Deps**: Bump vitest from 4.1.5 to 4.1.6

### Fixed

- **Desktop**: Exclude scripts from tray menu and agent state
- **Desktop**: Fix diff line rendering using display block on shiki spans

## [0.45.3] - 2026-05-05

### Changed

- **Desktop**: Reduce sidebar horizontal padding for tighter layout
- **Deps**: Bump globals from 17.5.0 to 17.6.0
- **Deps**: Bump the linters group with 4 updates

## [0.45.2] - 2026-05-04

### Fixed

- **Desktop**: Fix terminal not fitting full window width on initial launch (double RAF for layout computation)

## [0.45.1] - 2026-05-04

### Added

- **Start**: Make codebase exploration conditional based on ticket clarity

### Changed

- **Desktop**: Invert time picker icon color to white
- **Desktop**: Invert date/time picker icons in schedule form

## [0.45.0] - 2026-04-30

### Added

- **Desktop**: Add PR review watcher with magic-resolve/magic-done actions
- **Desktop**: Log waiting, completed and agent lifecycle in history

## [0.44.3] - 2026-04-29

### Fixed

- **Desktop**: Fix heatmap tooltip clipped on right-side cells

## [0.44.2] - 2026-04-29

### Changed

- **Desktop**: Simplify history analytics to heatmap only

## [0.44.1] - 2026-04-29

### Fixed

- **Desktop**: Clean existing release assets before publish to prevent 422 errors

## [0.44.0] - 2026-04-29

### Added

- **Desktop**: Add analytics dashboard to history page

### Changed

- **Desktop**: Apply glass effect to all form inputs and selects
- **Deps**: Bump vitest from 4.1.4 to 4.1.5
- **Deps**: Bump the linters group with 2 updates

### Fixed

- **Desktop**: Prevent scheduled agents from freezing when MacBook is locked

## [0.43.6] - 2026-04-24

### Changed

- **Landing**: Rework desktop page with new sections, mockups and reordered layout

## [0.43.5] - 2026-04-24

### Changed

- **Landing**: Add v2 platform vision document

### Fixed

- **Desktop**: Restore agents with empty repositories on app restart

## [0.43.4] - 2026-04-23

### Added

- **Desktop**: Add user profile onboarding wizard

### Changed

- **Landing**: Rework homepage with hero meta, responsive layout and mobile-blocker removal
- **Landing**: Rework skills page with terminal mockups, sticky nav and overview removal

## [0.43.3] - 2026-04-23

### Changed

- **Chore**: Re-release to fix CI publish failure on v0.43.2 (GitHub assets already existed)

## [0.43.2] - 2026-04-23

### Changed

- **Desktop**: Redesign schedule form with custom project select, inline date-time and frequency toggle

## [0.43.1] - 2026-04-22

### Added

- **Desktop**: Add today button to schedule agent date picker
- **Desktop**: Add default time setting for scheduled agents
- **Desktop**: Show scheduled agent banner in right sidebar

### Changed

- **Desktop**: Increase repo name font-size to match ticket title
- **Desktop**: Remove schedule button from agent list in sidebar

## [0.43.0] - 2026-04-22

### Added

- **Desktop**: Add scheduled agents — program agents to run at a specific time
- **Desktop**: Add keyboard shortcut and align scheduled page styling

### Changed

- **Desktop**: Remove hover effect from single-entry history cards

## [0.42.11] - 2026-04-22

### Fixed

- **Desktop**: Show window only after first paint to avoid white flash on startup

## [0.42.10] - 2026-04-22

### Changed

- **Desktop**: Align right sidebar text sizes with left sidebar for visual consistency

## [0.42.9] - 2026-04-22

### Added

- **Desktop**: Add blur effect and click-outside-to-close on history card expand

## [0.42.8] - 2026-04-22

### Added

- **Desktop**: Group consecutive history events by ticket with expand/collapse animation

## [0.42.7] - 2026-04-22

### Changed

- **Desktop**: Merge backlog and in-progress into single active group in sidebar

## [0.42.6] - 2026-04-21

### Changed

- **Chore**: Re-release to fix CI publish failure on v0.42.5 (GitHub assets already existed)

## [0.42.5] - 2026-04-21

### Changed

- **Desktop**: Remove animation on close agent button in sidebar
- **Desktop**: Reduce text and icon sizes in sidebar
- **Desktop**: Remove collapsible sections from sidebar

## [0.42.4] - 2026-04-20

### Fixed

- **Desktop**: Use agent baseBranch metadata for commit list in sidebar

## [0.42.3] - 2026-04-20

### Fixed

- **Desktop**: Avoid redundant setLoginItemSettings call on startup

## [0.42.2] - 2026-04-19

### Changed

- **Plan**: Trim skill description to under 110 words

## [0.42.1] - 2026-04-18

### Changed

- **Desktop**: Align history page header with settings and skills pages

## [0.42.0] - 2026-04-18

### Added

- **Desktop**: Add launch mode setting for Claude Code permission mode

## [0.41.0] - 2026-04-18

### Added

- **Desktop**: Add history page with daily agent activity timeline

## [0.40.0] - 2026-04-18

### Added

- **Desktop**: Add spotlight settings section with shortcut picker

## [0.39.8] - 2026-04-18

### Fixed

- **Desktop**: Move hooks before early return in TerminalsPage to fix React error #300 when creating the first agent

## [0.39.7] - 2026-04-17

### Changed

- **Desktop**: Extract agents from config.json into dedicated agents.json

## [0.39.6] - 2026-04-17

### Added

- **Docs**: Add magic:audit skill for pre-release documentation validation
- **Docs**: Add Quick Launch and Menu Bar sections to desktop page

### Changed

- **Docs**: Add menu bar integration card to documentation page

## [0.39.5] - 2026-04-17

### Changed

- **Chore**: Remove obsolete audit skill

### Fixed

- **Desktop**: Reset Spotlight input on each open

## [0.39.4] - 2026-04-17

### Added

- **Plan**: Add magic-plan skill for idea/bug analysis

### Changed

- **Release**: Rename skill to magic-release for naming consistency

## [0.39.3] - 2026-04-17

### Added

- **Desktop**: Non-blocking update restart with "Restart now" / "Later" buttons

## [0.39.2] - 2026-04-17

### Added

- **Desktop**: Spotlight launches agent immediately with prompt as CLI arg (no more 2s delay)
- **Desktop**: Spotlight-created agents now named "Claude N" (consistent with Cmd+N)

## [0.39.1] - 2026-04-17

### Changed

- **Desktop**: Remove periodic update check (every 5 min), keep startup and manual only

## [0.39.0] - 2026-04-16

### Added

- **Desktop**: Add check-for-updates button in tray menu with periodic polling (every 5 min)
- **Start**: Delegate confidence evaluation to independent critic agent

## [0.38.1] - 2026-04-16

### Fixed

- **Desktop**: Sync tray menu with app by tracking individual agent state and title changes

## [0.38.0] - 2026-04-16

### Added

- **Start**: Add confidence assessment, auto-fix loop, and how-to-test to final summary

### Fixed

- **Desktop**: Use full-width emojis for consistent tray menu alignment

## [0.37.2] - 2026-04-16

### Fixed

- **Desktop**: Change quick launch shortcut to Ctrl+Space and show on all workspaces

## [0.37.1] - 2026-04-16

### Added

- **Desktop**: Add version header, changelog/docs/GitHub links to tray menu
- **Desktop**: Replace colored circle emojis with expressive emojis in tray agent states

## [0.37.0] - 2026-04-15

### Added

- **Desktop**: Add tray icon menu bar mode with quick launch hotkey

### Changed

- **Desktop**: Undo IPC batching and xterm skip from 0198e59

### Fixed

- **Desktop**: Remove unused imports in tray-manager

## [0.36.4] - 2026-04-15

### Changed

- **Desktop**: Reduce split view lag with IPC batching and xterm skip

## [0.36.3] - 2026-04-15

### Added

- **Install**: Add Read permissions for skill reference files and magic-slash config to auto-allow during installation

## [0.36.2] - 2026-04-15

### Added

- **Release**: Add auto-changelog generation from git log, interactive git workflow (commit/tag/push via AskUserQuestion), and resilient Sidebar.tsx version pattern with fallback cascade

## [0.36.1] - 2026-04-14

### Added

- **Evals**: Add 8 new eval test cases — negative cases, French commit triggers, and malformed input entries

### Changed

- **Skills**: Standardize `allowed-tools` frontmatter declarations across all 7 skills (add `AskUserQuestion` to 4 skills, remove over-declared tools from 2 skills)
- **Skills**: Unify bilingual messages pattern — create `references/messages.md` for magic-review, magic-done; normalize magic-commit messages format; merge magic-start per-language files into single bilingual file
- **Skills**: Extract shared `references/node-setup.md` for magic-pr and magic-resolve
- **Review**: Add Atlassian integration check (Step 12.0) before Jira comment to prevent MCP failures when Atlassian is disabled
- **PR**: Add retry-once error handling for PR creation failures

## [0.36.0] - 2026-04-14

### Added

- **Start**: Add plan review sub-agent step and use `AskUserQuestion` for approval
- **Install**: Add preflight checks, rollback mechanism, and dry-run mode
- **Install**: Handle Ctrl+C to cleanly exit installer
- **Install**: Make Atlassian integration optional

### Changed

- **Install**: Redesign ASCII logo as single-line layout
- **Dependencies**: Bump vitest from 4.1.2 to 4.1.4, globals from 17.4.0 to 17.5.0, typescript-eslint linters group, softprops/action-gh-release from 2 to 3

### Fixed

- **Install**: Remove unused `blue` variable flagged by shellcheck

## [0.32.5] - 2026-04-05

### Added

- **Desktop**: Sync `config.json` version with app version on startup via `migrateConfig()`

### Fixed

- **Desktop**: Config validation toast now re-appears on every config load instead of only on first page load — dismissing it no longer hides it forever

## [0.32.4] - 2026-04-04

### Added

- **Install**: Add JSON Schema (`install/config-schema.json`) for `config.json` validation
- **Desktop**: Validate `config.json` against JSON Schema on startup with AJV — critical errors block loading, non-critical errors are warned
- **Desktop**: Auto-repair invalid config values (languages, commit format/style, resolve settings) with `repairConfig()`
- **Desktop**: Create automatic backup (`config.json.bak`) before migration and repair
- **Desktop**: Notify renderer of validation errors on startup via `config:validationErrors` IPC event
- **Desktop**: Add schema validation unit tests (`schema-validator.test.ts`)

### Changed

- **Desktop**: Extract default repository fields into `defaults.ts` (shared by config, migrate, and repair)
- **Docs**: Enrich documentation with new sections and FAQ entries

## [0.32.3] - 2026-04-03

### Changed

- **README**: Update logo to match website topnav branding

## [0.32.2] - 2026-04-03

### Changed

- **Desktop**: Update app icon to ninja rabbit logo

## [0.32.1] - 2026-04-03

### Changed

- **Desktop**: Update app icon to new branding (black background, purple-indigo gradient slash)
- **Docs**: Remove obsolete `app-icon.png` from landing page assets

## [0.32.0] - 2026-04-03

### Added

-

### Changed

- **Landing**: Redesign landing page with new branding and sections

### Fixed

-

## [0.31.0] - 2026-03-31

### Added

- **Docs**: Add styled changelog section to documentation page

### Changed

- **Desktop**: Change terminal selection color to yellow

### Fixed

- **Desktop**: Ensure activeTerminalId targets left-pane terminal on split restore

## [0.30.3] - 2026-03-31

### Changed

- **Release**: Improve `/release` skill — use `AskUserQuestion` for all user interactions, remove hardcoded version from skill title, replace fragile line number references with pattern-based search, use `Read` tool instead of `cat | jq`

### Fixed

- **Done**: Prevent worktree verification loop and improve robustness in `/done` skill

## [0.30.2] - 2026-03-31

### Fixed

- **Desktop**: Cmd+N now creates a new agent in the currently focused split pane instead of always defaulting to the left pane

## [0.30.1] - 2026-03-30

### Fixed

- **Desktop**: Prevent terminal flash and Claude Code banner loss when switching agents by using `visibility:hidden` instead of `display:none`

### Changed

- **Desktop**: Terminal containers now use absolute positioning with visibility toggle instead of display toggle, ensuring xterm.js always has correct dimensions

## [0.30.0] - 2026-03-30

### Added

- **Desktop**: New "Warnings" section on the Skills page that detects and displays duplicate skill names across sources (built-in, custom, repo)
- **Desktop**: Long description alert moved to the Warnings section with "Open in VS Code" and "Fix with agent" action buttons
- **Desktop**: "Fix with agent" button launches a new Claude agent with a pre-filled prompt to optimize skill descriptions exceeding 110 words
- **Desktop**: "Open in VS Code" button opens all problematic skill files directly in the editor

## [0.29.4] - 2026-03-29

### Fixed

- **Desktop**: Remove terminal row cap (26 rows) that prevented xterm.js from using full window height
- **Desktop**: Eliminate flash/flicker when switching between agents by using `refresh()` instead of heavy buffer restore (`reset()` + IPC `getBuffer()` + `write()`)
- **Desktop**: Fix inconsistent initial PTY rows between `createTerminal` (26) and `createPtyProcess` (30)

### Changed

- **Desktop**: Replace custom `fitTerminal()` with `fitAddon.fit()` to remove fragile internal xterm.js API usage (`_core._renderService.clear()`)
- **Desktop**: Increase resize debounce from 100ms to 200ms to reduce SIGWINCH churn during continuous window drag

## [0.29.3] - 2026-03-29

### Fixed

- **Desktop**: Cap terminal rows to 26 to reduce excessive empty space in fresh Claude Code sessions
- **Desktop**: Prevent unnecessary SIGWINCH signals when switching agents (guard resize IPC with dimension check)
- **Desktop**: Always re-render terminal from display buffer when agent becomes visible to fix missing status bar info
- **Desktop**: Improve text contrast on transparent background with `minimumContrastRatio: 4.5`

## [0.29.2] - 2026-03-29

### Fixed

- **Desktop**: Fix terminal text formatting (broken line wrapping) when switching between agents after window/container resize
- **Desktop**: Prepend ANSI reset on display buffer truncation to prevent color bleeding on buffer restore

## [0.29.1] - 2026-03-27

### Changed

- **Desktop**: Restyle title bar split view toggle — pill shape, text-only labels (Normal / Split view), slide-in/out animations
- **Desktop**: Restyle sidebar toggle buttons with rounded background matching the split view switch

## [0.29.0] - 2026-03-26

### Added

- **Desktop**: Add split-screen dual view for side-by-side agents
- **Desktop**: Persist split view mode in config.json

## [0.28.4] - 2026-03-26

### Added

- **PR**: Add body formatting verification step (6.2.1) before PR creation — checks for literal `\n`, unfilled placeholders, missing section headers, and empty sections with automatic reconstruction and retry

## [0.28.3] - 2026-03-25

### Changed

- **Landing**: Revamp documentation page — add Hooks & Automation, Security & Permissions, Updates & Auto-Update sections, expand FAQ, fix skill images, remove standalone CLI references

### Fixed

- **Docs**: Fix inconsistencies — Node.js 18+ → 20+ in CLAUDE.md, "3 skills" → "7 skills" in package.json and documentation, remove non-existent logo.png from README, correct lint description

## [0.28.2] - 2026-03-25

### Changed

- **Desktop**: Match terminal font size with sidebar agent list text size (15 → 14px)

## [0.28.1] - 2026-03-25

### Changed

- **Desktop**: Increase terminal font size from 13 to 15 for better readability

## [0.28.0] - 2026-03-25

### Changed

- **Desktop**: Group sidebar agents by workflow status (Backlog, In Progress, In Review, Done) instead of by repository

## [0.27.2] - 2026-03-25

### Changed

- **README**: Add desktop app screenshot
- **Install**: Remove standalone mode and web-ui

### Fixed

- **Desktop**: Add GitHub auth to API calls for release notes and skills updater
- **Desktop**: Reduce terminal line-height to match native Apple Terminal

## [0.27.1] - 2026-03-25

### Added

- **Skills**: Add `/audit` skill — scan documentation files for inconsistencies against sources of truth and fix them interactively

### Changed

- **Release**: Add project prefix to `/release` skill description for clarity
- **Desktop**: Harden terminal robustness — simplify IPC terminal handlers, improve PTY manager error handling, and streamline TerminalView component

## [0.27.0] - 2026-03-24

### Added

- **Desktop**: Add long description warning to skills budget gauge
- **Desktop**: Unify section titles with icons and add shimmer animation to budget bars

### Changed

- **Skill /pr**: Add `AskUserQuestion` to 7 interaction points for better UX and less context usage
- **Skill /pr**: Deduplicate ticket ID extraction (single extraction, reused across steps)
- **Skill /pr**: Default to `git diff --stat` instead of full diff to reduce context consumption
- **Skill /pr**: Merge duplicate config reads into a single step
- **Skill /pr**: Shorten skill description from ~170 to ~95 words
- **Skill /pr**: Replace MUST/CRITICAL language with why-explanations
- **Desktop**: Remove unused snippets feature

### Fixed

- **Skill /pr**: Fix PR description rendering on GitHub — literal `\n` characters replaced with actual line breaks for proper Markdown formatting

## [0.26.0] - 2026-03-23

### Added

- **Desktop**: Add token budget gauge to skills page

### Changed

- **Desktop**: Remove unused workspace terminal feature

## [0.25.1] - 2026-03-23

### Changed

- **Permissions**: Pre-authorize MCP tools (GitHub + Atlassian) and common Bash commands (git, npm, yarn, pnpm, bun, jq, gh) to reduce permission prompts when using magic:* skills

## [0.25.0] - 2026-03-23

### Changed

- **Skill /start**: Reduce context window consumption via sub-agents and reference splitting
- **Skills**: Rename skill names from `magic-*` to `magic:*` for Claude Code native skill invocation
- **Dependencies**: Bump the linters group with 2 updates

### Fixed

- **Desktop**: Use directory name for skill filesystem operations

## [0.24.0] - 2026-03-20

### Added

- **Skill /start**: Add automatic `/simplify` pass after implementation (step 5.4.5) to review changed code for reuse, quality and efficiency

### Changed

- **Skills evals**: Remove trigger evals workspace files (cleanup)

### Fixed

- **Install & Desktop**: Fix invalid permission pattern for localhost curl — use `Bash(*http://127.0.0.1:*)` to comply with Claude Code's `:*` must-be-at-end rule

## [0.23.0] - 2026-03-19

### Added

- **Skills**: Add `skill-creator` skill for creating, improving and benchmarking skills
- **Skills /resolve**: Add multi-repo support and re-request review after pushing fixes
- **Skills evals**: Add eval set (30 queries) and results for magic-skills triggering accuracy
- **Install**: Sync entire skill folders (references, images) instead of only `SKILL.md`

### Changed

- **Skill /start**: Extract bilingual messages, node setup, plan templates, glossary and API into references
- **Skill /continue**: Rewrite SKILL.md with progressive disclosure and why explanations; extract bilingual messages, node setup, glossary and API into references
- **Skill /commit**: Extract bilingual messages, node setup and glossary into references
- **Skill /pr**: Improve skill with structured error handling, PR preview and messages reference
- **Skill /done**: Improve skill with why context, edge cases, robust PR search and dynamic summary
- **Skill /resolve**: Add messages reference file

## [0.22.0] - 2026-03-18

### Changed

- **Desktop**: Replace development branch text input with a select dropdown listing remote branches via `git ls-remote --heads origin` (async, non-blocking)

## [0.21.1] - 2026-03-18

### Fixed

- **Desktop**: Fix terminal scroll issues — smart auto-scroll on incoming data, alternate screen buffer detection, screen clear reset, scroll-to-bottom button, and thin scrollbar

## [0.21.0] - 2026-03-17

### Added

- **Skill /start**: Auto-detect worktree files when config is empty
- **Install (Web UI)**: Add worktree files settings to web-ui configuration
- **Desktop**: Add worktree files settings to desktop configuration

### Fixed

- **Skill /start**: Handle empty response for branch confirmation prompt

## [0.20.2] - 2026-03-17

### Added

- **Skill /done**: Add worktree and branch cleanup after merge
- **Skill /start**: Sync local dev branch before worktree creation

### Fixed

- **Desktop**: Fix terminal scroll — users can now scroll freely while Claude is outputting text, leveraging xterm.js native auto-follow behavior

## [0.20.1] - 2026-03-17

### Fixed

- **Desktop**: Fix linter issue at build

## [0.20.0] - 2026-03-17

### Added

- **Desktop Skills page**: New "Repository Skills" section that scans registered repositories for skills in `.claude/skills/` and `.claude/commands/`, grouped by repo with colored dot and read-only detail view
- **Desktop Skills page**: Subtitle descriptions for Built-in, Custom, and Repository Skills sections

### Changed

- **Desktop**: Widen content max-width from 42rem to 62rem on Skills and Settings pages
- **Desktop Skills page**: SkillCard now uses a generic `badge` prop instead of hardcoded `isBuiltIn` check

## [0.19.0] - 2026-03-17

### Added

- **Config migration**: Auto-migrate `config.json` at startup (desktop + web-ui) to ensure all repositories have a uniform format with all fields present (color, languages, commit, resolve, pullRequest, issues, branches)
- **Config migration**: Auto-migrate agents to ensure `repositories` array and complete `metadata` structure exist
- **Resolve settings**: Add per-repository resolve settings (commitMode, format, style, useCommitConfig, replyToComments, replyLanguage)

### Changed

- **Config**: `addRepository()` now creates repositories with all default fields instead of only path/keywords/languages

## [0.18.3] - 2026-03-16

### Changed

- **README**: Update for all 7 skills — add `/magic-pr`, `/magic-review`, `/magic-resolve` sections, fix `/magic-done` description, add natural language triggers, update installation modes, config schema (`installationMode`, `branches.development`), and project structure

## [0.18.2] - 2026-03-16

### Changed

- **Desktop**: Display active agent title (from metadata) in the center of the title bar
- **Desktop**: Change sidebar toggle icons active color from blue to white

## [0.18.1] - 2026-03-16

### Changed

- **Skills**: Update skill icons for `/magic-pr`, `/magic-review`, and `/magic-resolve`

## [0.18.0] - 2026-03-16

### Added

- **Skills**: Add `/magic-pr` skill — push commits, create pull request and update Jira ticket
- **Skills**: Add `/magic-review` skill — perform code review on a PR (self-review or external)
- **Skills**: Add `/magic-resolve` skill — address review comments, amend commits and force-push
- **Desktop**: Add review workflow statuses (Reviewing, Changes requested, Approved) to agent status dropdown
- **Docs**: Add `/magic-pr`, `/magic-review`, `/magic-resolve` to landing page, terminal animations and documentation reference

### Changed

- **Skills**: `/magic-done` is now a post-merge finalization skill (verify merge, transition Jira to Done, clean up) — PR creation moved to `/magic-pr`
- **Skills**: `/magic-start` next steps now reference `/magic-pr` instead of `/magic-done`
- **Landing**: Section title updated from "4 skills" to "7 skills" with full workflow presentation
- **Landing**: Desktop mockup animation extended with 3 new phases (review, resolve, done)
- **Landing**: Skills manager mockup shows all 7 built-in skills
- **Install**: Install and uninstall scripts updated to handle 7 skills
- **Desktop**: Simplify close modal

## [0.17.5] - 2026-03-16

### Added

-

### Changed

-

### Fixed

-

## [0.17.4] - 2026-03-16

### Added

- **Desktop**: "No status" default option in the agent status dropdown — new agents now show a neutral "no status" badge that can be changed manually from the sidebar

### Changed

- **Desktop**: Include default metadata when creating a new agent so the status dropdown is visible immediately
- **Desktop**: Status options now use a `label` field decoupled from the stored `value`, with a renamed `getStatusOption` helper

## [0.17.3] - 2026-03-16

### Changed

- **Desktop**: Harmonize sidebar card backgrounds with Settings/Skills pages (`bg-white/[0.06]`, borderless cards, `rounded-xl`)
- **Desktop**: Style PR button with accent color matching the "What's New" button in Settings

## [0.17.2] - 2026-03-15

### Changed

- **Desktop**: Wrap "No uncommitted changes" placeholder in a card container matching the existing sidebar card style

### Fixed

- **Desktop**: Prevent terminal from scrolling up during TUI redraws
- **Skills**: Sync version number in `/magic-continue` and prevent future desync in release skill

## [0.17.1] - 2026-03-15

### Fixed

- **CI**: Pin macOS runner to `macos-14` to fix notarization build failure caused by `macos-latest` upgrading to macOS 15 (Sequoia) with incompatible `xcrun notarytool` output
- **CI**: Add `APPLE_TEAM_ID` guard in notarize script to prevent crashes when the variable is missing

## [0.17.0] - 2026-03-15

### Added

- **Skills**: Configurable base branch per repository — `/magic-start`, `/magic-done`, and `/magic-continue` now read `branches.development` from config and always ask the user to confirm the base branch (showing the configured default if available)
- **Desktop**: Display base branch alongside current branch in the agent sidebar — two side-by-side boxes with an arrow separator (e.g., `develop → feature/PROJ-123`)
- **Desktop**: `baseBranch` field in agent metadata, sent by skills via `/metadata` endpoint and displayed in the sidebar
- **Web UI**: "Branches" settings section in repository detail page with a "Development Branch" text input

### Changed

- **Skills**: `origin/main` is no longer hardcoded — all git commands (`git worktree add`, `git log`, `git diff`) now use `origin/$DEV_BRANCH`
- **Skills**: `/magic-done` Step 5.0 now prioritizes `$DEV_BRANCH` for PR base branch, with fallback to dynamic detection

## [0.16.2] - 2026-03-14

### Added

- **Desktop**: "What's New" button in Settings page (About section) — fetches release notes from GitHub API and opens the modal on demand
- **Desktop**: Hero image banner at the top of the What's New modal with close button overlaid

### Changed

- **Desktop**: What's New modal now filters release notes HTML to only show the "What's Changed" section (removes Installation, Full Changelog, etc.)
- **Desktop**: Removed "Release Notes" label from the modal for a cleaner design

## [0.16.1] - 2026-03-14

### Fixed

- **Desktop**: What's New modal not showing after auto-update — persist release notes from main process (`fs.writeFileSync`) instead of renderer `localStorage` which was destroyed before Chromium flushed LevelDB to disk

## [0.16.0] - 2026-03-14

### Added

- **Desktop**: Clickable status dropdown in the TicketHeader sidebar — click the status badge to open a dropdown and manually change the agent status (in progress, committed, ready for PR, PR created)

## [0.15.1] - 2026-03-14

### Fixed

- **CI**: Bump Node.js to 22 for desktop build jobs — `@electron/rebuild@4.0.3` requires Node >= 22.12.0, causing CI failures on typecheck and release workflows

## [0.15.0] - 2026-03-14

### Added

- **Desktop**: "What's New" modal displayed after an auto-update, showing the release notes from the GitHub Release. The modal appears once on restart after the update, and is dismissed permanently until the next update.
- **Desktop**: "What's New modal" option in the dev debug menu to preview the modal without triggering an update
- **Desktop**: `maxWidth` prop on the `Modal` component for flexible sizing

## [0.14.5] - 2026-03-14

### Fixed

- **Desktop**: Add Vite client type definitions (`vite-env.d.ts`) to fix `import.meta.env` TypeScript error in `UpdateOverlay`

## [0.14.4] - 2026-03-14

### Added

- **Desktop**: Add dev-only debug menu (Bug icon) with "Auto update steps" simulation and "Flood terminal" option for testing scroll behavior

### Changed

- **Desktop**: Restyle `UpdateOverlay` with glassmorphism (backdrop-blur, semi-transparent card, shadow), fixed card size, tada animation and confetti on download completion
- **Desktop**: Replace purple accent color with blue `#393BFF` for all update overlay states (spinner, download icon, check, progress bar, text)

### Fixed

- **Desktop**: Lock terminal scroll to bottom while a command is running — user can only scroll freely once the command finishes

## [0.14.3] - 2026-03-14

### Changed

- **Release**: Add post-release grep verification step in `/release` skill to automatically detect files not updated during a release

### Fixed

- **Release**: Align `magic-continue` (was v0.14.1) and `release` skill (was v0.11.2) versions that were missed during 0.14.2 release

## [0.14.2] - 2026-03-14

### Fixed

- **Desktop**: Prevent scroll from jumping back up during conversation in `TerminalPane` — auto-scroll now only fires when the user is near the bottom, matching the existing `TerminalView` behavior

## [0.14.1] - 2026-03-14

### Fixed

- **Desktop**: Update `BUILT_IN_SKILLS` and `SKILLS` constants to use `magic-*` prefix — skills were no longer recognized as built-in after the rename in v0.14.0, making them editable in the app

## [0.14.0] - 2026-03-14

### Changed

- **Skills**: Rename all commands from `/start`, `/continue`, `/commit`, `/done` to `/magic-start`, `/magic-continue`, `/magic-commit`, `/magic-done` for discoverability (type `/magic-` to find all commands)
- **Install**: Migration script removes old unprefixed skills before installing new `/magic-*` ones
- **Docs**: Updated documentation, landing page and README to reflect the `/magic-*` prefix

## [0.13.0] - 2026-03-13

### Added

- **Skill**: New `/continue` skill — resume work on an existing Jira ticket or GitHub issue (worktree detection, branch fallback, PR status)
- **Install**: `/continue` skill added to install and uninstall scripts
- **Desktop**: `/continue` added to built-in skills list and skills updater
- **Docs**: `/continue` skill card, usage example, i18n (EN/FR), and multi-repo section in landing page and documentation

### Changed

-

### Fixed

-

## [0.12.14] - 2026-03-13

### Added

- **Desktop**: Auto-detect Node.js version for script execution — injects nvm/fnm activation prefix when `.nvmrc` or `.node-version` is present

### Fixed

- **Desktop**: Remove job control noise (`[1] PID` / `[1] + done`) in script terminals by using a plain shell instead of login shell
- **Desktop**: Fix NVM version sort in `getShellPath()` — use semver comparison instead of alphabetical sort
- **Desktop**: Add Volta shims path (`~/.volta/bin`) to shell PATH resolution

## [0.12.13] - 2026-03-13

### Fixed

- **Desktop notifications**: Remove duplicate icon in macOS notifications — the `icon` parameter was adding a second image (right side) alongside the app bundle icon (left side), causing the old cached icon and the new icon to both appear

## [0.12.12] - 2026-03-13

### Fixed

- **Install**: Replace automatic DMG install (crash) with manual drag-and-drop flow — opens the DMG in Finder and asks the user to drag the app to Applications

## [0.12.11] - 2026-03-13

### Fixed

- **Install**: Strip quarantine attribute from downloaded DMG before mounting to fix silent `hdiutil attach` failure on macOS

## [0.12.10] - 2026-03-13

### Fixed

- **Install**: Auto-install app to `/Applications` without manual drag-and-drop from DMG

## [0.12.9] - 2026-03-13

### Fixed

- **Install**: Fix DMG filename mismatch — use hyphen (`Magic-Slash`) instead of space to match electron-builder output (`curl: (56) 404`)

## [0.12.8] - 2026-03-13

### Fixed

- **Install**: URL-encode space in DMG filename to fix desktop app download (`curl: (3) URL rejected: Malformed input`)

## [0.12.7] - 2026-03-13

### Fixed

- **Auto-update**: Remove safety net relaunch to prevent infinite update loop on unsigned-to-signed upgrade

## [0.12.6] - 2026-03-13

### Fixed

- **Auto-update**: Add macOS code signing and notarization to fix Squirrel.Mac update installation

## [0.12.5] - 2026-03-13

### Fixed

- **Auto-update**: Fix restart failure on macOS by force-closing windows before `quitAndInstall` and adding safety net relaunch

## [0.12.4] - 2026-03-13

### Changed

- **Languages configuration**: Remove global languages, move all language settings to repo-level only
  - Each repository now has its own `languages` object (`commit`, `pullRequest`, `jiraComment`, `discussion`)
  - New repositories are created with default languages (`en` for all)
  - Remove global "Default Languages" settings page from Web UI
  - Remove `PUT /api/languages` endpoint from Web UI server
  - Remove "Default (English/Francais)" option from repo language selects
  - Update `/start`, `/commit`, `/done` skills to read languages from repo config only

## [0.12.3] - 2026-03-13

### Added

- **Landing page**: Mobile/tablet blocker overlay displayed below 776px with pink background

### Fixed

- **Desktop notifications**: Use app icon instead of default Electron icon on macOS

## [0.12.2] - 2026-03-12

### Fixed

- **Desktop auto-update**: Clean up PTY terminals and status server before calling `quitAndInstall()` to prevent restart errors

## [0.12.1] - 2026-03-12

### Fixed

- **Desktop auto-update**: Add desktop build job to CI release workflow so `electron-updater` can find release assets (`.dmg`, `.zip`, `latest-mac.yml`)

## [0.12.0] - 2026-03-12

### Added

- **Desktop application**: Native Electron app for Magic Slash with integrated Claude Code terminals
  - Multiple concurrent Claude Code agents (up to 12) with state tracking (idle, working, waiting, completed, error)
  - Integrated xterm.js terminal emulation with terminal persistence across app restarts
  - Agent naming, metadata editing (title, description, ticket info), and resizable info sidebar
  - Multi-repository support with visual color coding per project
  - Built-in and custom skills management with creation, import/export, and sharing
  - Package manager auto-detection (npm, yarn, pnpm, bun) with one-click script execution
  - Automatic background app updates with progress tracking and auto-restart
  - Automatic skills synchronization between Claude Code and desktop app
  - Claude Code hooks integration for real-time terminal state and metadata tracking
  - Keyboard shortcuts for agent management (Cmd+N, Cmd+W, Cmd+B)
  - Multi-page UI (Terminals, Settings, Skills) with dark theme

## [0.11.2] - 2025-01-29

### Added

- **languages.discussion support**: `/commit` and `/done` now respect the `languages.discussion` setting
  - Configures the language Claude uses for interactions during commit and PR workflows
  - Supports both global and per-repository configuration

## [0.11.1] - 2025-01-29

### Changed

- **Commit settings enforcement**: `/commit` now strictly respects `coAuthor` and `includeTicketId` configuration
  - Co-author line only added when `coAuthor: true` is set
  - Ticket ID only included in commit message when `includeTicketId: true` is set

## [0.11.0] - 2025-01-29

### Added

- **Auto-permissions for /start**: Automatically adds required Bash permissions when starting a task
  - Permissions for creating worktrees, switching branches, and other git operations
  - Jira ticket status is now automatically updated to "In Progress" when starting a task
- **Local /release skill**: New internal skill for preparing Magic Slash releases
  - Updates version in all project files (package.json, README, docs, install script)
  - Manages CHANGELOG.md with proper formatting
  - Provides step-by-step release workflow guidance
- **Commit message preview in Web UI**: Shows a preview of the commit message format
  - Displays example commit message based on current settings (format, style, co-author, ticket ID)
  - Updates dynamically when settings change

## [0.10.0] - 2025-01-29

### Added

- **Web UI for configuration**: `magic-slash` now launches a local web interface instead of CLI menu
  - Modern dark theme with animated background orbs
  - Add, edit, and delete repositories with live path validation
  - Per-repository settings for commit, PR, and issues behavior
  - PR template detection and inline editing
  - Global language defaults configuration
- **Per-repository commit settings**:
  - `style`: Single-line or multi-line with body
  - `format`: Conventional, Angular, Gitmoji, or none
  - `coAuthor`: Add Claude as co-author in commits
  - `includeTicketId`: Add ticket ID from branch name in commit message
- **Per-repository PR settings**:
  - `autoLinkTickets`: Auto-link Jira/GitHub tickets in PR description (default: true)
- **Per-repository issues settings**:
  - `commentOnPR`: Add comment with PR link on Jira when creating PR (default: true)
- **PR template management**: View, edit, and generate PR templates directly from web UI

### Changed

- **`magic-slash` command**: Now launches web UI by default (use `--cli` for legacy terminal menu)
- **Skills updated**: `/commit` and `/done` now respect all per-repository settings
- **Default behaviors**: Auto-link tickets and comment on PR are now enabled by default

## [0.9.0] - 2025-01-28

### Added

- **Natural language invocation**: Invoke commands using natural language instead of slash commands
  - Say "démarre PROJ-123" or "work on PROJ-123" instead of `/start PROJ-123`
  - Say "je suis prêt à committer" or "ready to commit" instead of `/commit`
  - Say "on peut créer la PR" or "create the PR" instead of `/done`
  - Supports both French and English trigger phrases
- **Skills architecture**: Commands are now "skills" installed in `~/.claude/skills/`
  - Each skill contains full instructions + trigger phrases for natural invocation
  - Replaces the old `~/.claude/commands/` structure
- **Multi-repo commit support**: `/commit` now detects and commits across multiple worktrees
  - Automatically finds all worktrees for the same ticket ID
  - Shows summary of changes in each worktree before committing
- **Auto-fix for pre-commit hooks**: `/commit` automatically fixes linting/formatting errors
  - Detects ESLint, Prettier, Black, and other common pre-commit hooks
  - Automatically corrects issues and retries commit (up to 3 attempts)
- **Landing page improvements**:
  - Differentiated terminal animations showing both Jira and GitHub workflows
  - Mix of slash commands and natural language invocations in demo
  - New "Skills / Natural invocation" documentation section
  - New "Troubleshooting" documentation section with common issues and fixes
  - Language-aware examples (FR/EN) throughout documentation

### Changed

- **Simplified installation**: `install.sh` reduced from ~940 to ~490 lines
  - Skills are now the single source of truth (no separate commands)
  - Cleaner installation process with better feedback
- **Updated uninstall**: Now removes skills from `~/.claude/skills/` and cleans up legacy commands

### Performance

- **Optimized intro animation**: Improved performance on low-end devices

## [0.8.0] - 2025-01-28

### Added

- **Commit split evaluation in `/commit`**: New step that evaluates if staged changes should be split
  into multiple atomic commits
  - Detects when changes span multiple distinct features
  - Identifies mixed commit types (e.g., `feat` + `fix` + `chore`)
  - Recognizes independent scopes/modules that should be committed separately
  - Proposes split with description of each commit, asks for user confirmation
  - If accepted: unstages all, then stages and commits each logical group separately
- **Stats section on landing page**: New "Gagnez du temps" / "Save time" section showcasing productivity gains
  - Timeline comparing before/after times for each command (/start: 5min→30s, /commit: 2min→10s, /done: 5min→20s)
  - Detailed comparison table showing manual workflow steps vs Magic Slash automation
  - Bilingual support (FR/EN) consistent with rest of the site
- **Install box in CTA section**: Added curl install command directly in the "Ready to automate?" call-to-action

## [0.7.1] - 2025-01-27

### Changed

- **Landing page scroll animation**: Tripled scroll distance for intro animation (logo → tagline → terminal)
  - Animation now requires 9x viewport height instead of 3x for smoother experience
  - Prevents animation from feeling rushed when scrolling quickly

## [0.7.0] - 2025-01-27

### Added

- **PR template support in `/done`**: Now automatically detects and uses the project's PR template
  - Searches for templates in `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, or `docs/pull_request_template.md`
  - Fills all template sections when a project template is found
  - Falls back to default template if no project template exists

### Fixed

- **Landing page terminal animation**: Animation now properly resets when scrolling back up
  - Added timeout tracking system to cancel pending animations on reset
  - Prevents visual glitches with pre-checked steps when replaying animation
- **Terminal appearance timing**: Increased spacing between secondary terminal appearances (3% → 4% scroll intervals)

## [0.6.1] - 2025-01-26

### Fixed

- Fix markdown linting errors (table formatting, blank lines around lists)
- Fix YAML linting errors (line length in CI workflow and issue template)
- Fix shellcheck warnings (separate declare and assign for local variables)

## [0.6.0] - 2025-01-26

### Added

- **Multi-repository support**: Configure 1 to N repositories instead of hardcoded backend/frontend
  - Each repository now has a `path` and optional `keywords` array for smart detection
  - Keywords default to the repository name if not specified
- **Language settings**: Configure language preferences for each feature via `magic-slash` CLI
  - `Commit language`: Language for commit messages (English/Français)
  - `Pull Request language`: Language for PR title and description (English/Français)
  - `Jira comment language`: Language for Jira comments when PR is created (English/Français)
  - `Discussion language`: Language for Claude Code interactions (English/Français)
- **Language submenu in CLI**: New "Language settings" option in the main menu
  - Interactive language selection with arrow keys
  - Settings persisted in `~/.config/magic-slash/config.json`
- **Smart repository selection in `/start`**: Keyword-based scoring system
  - Labels/Components matching keywords: +10 points
  - Keywords found in title: +5 points
  - Keywords found in description: +2 points
  - Single high-score repo is auto-selected, multiple matches prompt user choice
- **CLI repository management**: New `magic-slash` CLI features
  - Dynamic menu showing all configured repositories
  - Add new repository with name, path, and keywords
  - Remove existing repositories
  - Edit repository path and keywords
- **Backward compatibility**: Automatically reads legacy v1 config format

### Changed

- **Installation flow**: Now asks "How many repositories?" (1-10) instead of hardcoded backend/frontend prompts
- **Configuration schema**: New format with structured repository objects

  ```json
  {
    "repositories": {
      "api": {"path": "/path/to/api", "keywords": ["backend", "api"]},
      "web": {"path": "/path/to/web", "keywords": ["frontend", "ui"]}
    }
  }
  ```

- **`/start` command**: Iterates over N configured repos instead of just backend/frontend
- **Scope detection**: Uses keyword scoring instead of simple BACK/FRONT/BOTH logic

## [0.5.0] - 2025-01-26

### Added

- **Version badge in header**: Dynamic version display in the floating navigation
  - Fetches version from `package.json` via GitHub raw content
  - Links to CHANGELOG.md for release notes

### Changed

- **Landing page code structure**: Extracted inline CSS and JavaScript into separate files
  - `styles.css`: All styling rules (~2300 lines)
  - `script.js`: All JavaScript logic (~1400 lines)
  - Reduces `index.html` from ~3300 to ~1900 lines for better maintainability
- **Install command styling**: Increased font-size from 13px to 17px for better readability

## [0.4.0] - 2025-01-25

### Added

- **Version tracking**: Installation version is now saved in `~/.config/magic-slash/config.json`
- **Smart update detection**: `install.sh` now detects previously installed versions
  - Shows "already up to date" message when same version is installed
  - Shows update prompt when a newer version is available
  - Arrow key navigation menu for update/cancel choices (consistent with CLI UX)

### Changed

- **Installer UX**: Replaced y/N prompts with arrow key selection menus for version choices
- **Config file structure**: Added `version` field to track installed version
- **ASCII logo**: New logo matching the brand identity (magic + /slash) with purple colored slash
  - Updated in `install.sh`, `uninstall.sh`, and `magic-slash` CLI

## [0.3.0] - 2025-01-25

### Added

- **Landing page multi-terminal animation**: Display 7 terminals during scroll to showcase parallel task execution
  - Central terminal with original animation
  - 6 side terminals (left, right, top-left, top-right, bottom-left, bottom-right) appearing sequentially
  - Each terminal displays a different Jira ticket ID (PROJ-42, PROJ-18, PROJ-95, PROJ-7, PROJ-156, PROJ-63, PROJ-204)
  - Terminals slide in from their respective directions with smooth animations

### Changed

- **Landing page scroll behavior**: Terminals now stay in position after zoom animation ends
  and scroll naturally with the page
- **Terminal appearance timing**: Increased spacing between terminal appearances for better visual effect
- **Install box styling**: Updated border-radius to 50px to match floating header, circular copy button

### Fixed

- **Terminal animation targeting**: Fixed animation selectors to target only the central terminal,
  preventing conflicts with cloned terminals

## [0.2.1] - 2025-01-25

### Fixed

- **Landing page**: Fix terminal animation not starting automatically due to race condition
  - `terminalAnimationComplete` variable was declared after the scroll event listener was attached
  - Moved variable declaration before `handleZoomScroll` to prevent "temporal dead zone" errors

## [0.2.0] - 2026-01-25

### Added

- **GitHub Issues support in `/start`**: Now supports starting tasks from GitHub issues
  - Detects ticket type automatically based on format (Jira: `PROJ-123`, GitHub: `123` or `#123`)
  - Searches for issues across all configured repositories
  - Prompts user to choose when same issue number exists in multiple repos
  - Adapts branch naming for GitHub issues (e.g., `feature/repo-name-123`)

## [0.1.0] - 2026-01-24

### Added

- **CLI `magic-slash`**: Interactive command-line tool for configuration management
  - TUI interface with keyboard navigation (arrow keys, Enter, q to quit)
  - Configure backend and frontend repository paths
  - Path validation with git repository detection
  - Persistent configuration stored in `~/.config/magic-slash/config.json`

## [0.0.1] - 2026-01-24

### Added

- **Slash commands for Claude Code**:
  - `/start <TICKET-ID>`: Start a task from a Jira ticket
    - Fetches ticket details via Atlassian MCP
    - Analyzes scope (backend/frontend/both) from labels and keywords
    - Creates git worktrees for isolated development
  - `/commit`: Create atomic commits with conventional messages
    - Analyzes staged changes
    - Generates conventional commit messages (`type(scope): description`)
    - Supports feat, fix, docs, style, refactor, test, chore types
  - `/done`: Finalize a task
    - Pushes commits to remote
    - Creates Pull Request via GitHub MCP
    - Updates Jira ticket status to "To be reviewed"
    - Adds PR link as comment on Jira ticket
- **Installation scripts**:
  - `install.sh`: One-line installation via curl
  - `uninstall.sh`: Clean removal of all components
- **Documentation website**: Landing page at magic-slash.io
- **CI/CD pipelines**:
  - `ci.yml`: Linting and validation workflow
  - `release.yml`: Automated GitHub releases on version tags
- **Community files**:
  - Issue templates (bug report, feature request)
  - Pull request template with checklist
  - Contributing guidelines
  - Code of conduct
  - Security policy

[0.77.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.77.0
[0.76.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.76.2
[0.76.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.76.1
[0.76.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.76.0
[0.75.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.75.3
[0.75.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.75.2
[0.75.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.75.1
[0.75.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.75.0
[0.74.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.74.3
[0.74.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.74.2
[0.74.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.74.1
[0.74.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.74.0
[0.73.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.73.0
[0.72.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.72.2
[0.72.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.72.1
[0.72.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.72.0
[0.71.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.71.5
[0.71.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.71.4
[0.71.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.71.3
[0.71.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.71.2
[0.71.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.71.1
[0.71.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.71.0
[0.70.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.70.0
[0.69.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.69.0
[0.68.6]: https://github.com/xrequillart/magic-slash/releases/tag/v0.68.6
[0.68.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.68.5
[0.68.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.68.4
[0.68.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.68.3
[0.68.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.68.2
[0.68.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.68.1
[0.68.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.68.0
[0.67.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.67.0
[0.66.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.66.0
[0.65.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.65.1
[0.65.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.65.0
[0.64.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.64.3
[0.64.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.64.2
[0.64.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.64.1
[0.64.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.64.0
[0.63.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.63.1
[0.63.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.63.0
[0.62.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.62.0
[0.61.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.61.0
[0.60.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.60.0
[0.59.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.59.3
[0.59.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.59.2
[0.59.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.59.1
[0.59.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.59.0
[0.58.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.58.0
[0.57.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.57.3
[0.57.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.57.2
[0.57.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.57.1
[0.57.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.57.0
[0.56.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.56.0
[0.55.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.55.1
[0.55.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.55.0
[0.54.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.54.1
[0.54.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.54.0
[0.53.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.53.0
[0.52.6]: https://github.com/xrequillart/magic-slash/releases/tag/v0.52.6
[0.52.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.52.5
[0.52.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.52.4
[0.52.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.52.3
[0.52.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.52.2
[0.52.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.52.1
[0.52.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.52.0
[0.51.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.51.0
[0.50.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.50.1
[0.50.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.50.0
[0.49.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.49.1
[0.49.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.49.0
[0.48.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.48.0
[0.47.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.47.4
[0.47.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.47.3
[0.47.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.47.2
[0.47.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.47.1
[0.47.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.47.0
[0.46.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.46.0
[0.45.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.45.3
[0.45.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.45.2
[0.45.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.45.1
[0.45.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.45.0
[0.44.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.44.3
[0.44.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.44.2
[0.44.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.44.1
[0.44.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.44.0
[0.43.6]: https://github.com/xrequillart/magic-slash/releases/tag/v0.43.6
[0.43.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.43.5
[0.43.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.43.4
[0.43.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.43.3
[0.43.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.43.2
[0.43.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.43.1
[0.43.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.43.0
[0.42.11]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.11
[0.42.10]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.10
[0.42.9]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.9
[0.42.8]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.8
[0.42.7]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.7
[0.42.6]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.6
[0.42.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.5
[0.42.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.4
[0.42.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.3
[0.42.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.2
[0.42.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.1
[0.42.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.42.0
[0.41.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.41.0
[0.40.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.40.0
[0.39.8]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.8
[0.39.7]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.7
[0.39.6]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.6
[0.39.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.5
[0.39.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.4
[0.39.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.3
[0.39.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.2
[0.39.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.1
[0.39.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.39.0
[0.38.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.38.1
[0.38.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.38.0
[0.37.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.37.2
[0.37.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.37.1
[0.37.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.37.0
[0.36.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.36.4
[0.36.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.36.3
[0.36.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.36.2
[0.36.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.36.1
[0.36.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.36.0
[0.32.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.32.5
[0.32.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.32.4
[0.32.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.32.3
[0.32.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.32.2
[0.32.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.32.1
[0.32.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.32.0
[0.31.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.31.0
[0.30.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.30.3
[0.30.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.30.2
[0.30.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.30.1
[0.30.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.30.0
[0.29.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.4
[0.29.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.3
[0.29.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.2
[0.29.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.1
[0.29.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.29.0
[0.28.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.4
[0.28.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.3
[0.28.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.2
[0.28.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.1
[0.28.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.28.0
[0.27.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.27.2
[0.27.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.27.1
[0.27.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.27.0
[0.26.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.26.0
[0.25.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.25.1
[0.25.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.25.0
[0.24.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.24.0
[0.23.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.23.0
[0.22.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.22.0
[0.21.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.21.1
[0.21.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.21.0
[0.20.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.20.2
[0.20.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.20.1
[0.20.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.20.0
[0.19.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.19.0
[0.18.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.3
[0.18.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.2
[0.18.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.1
[0.18.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.18.0
[0.17.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.5
[0.17.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.4
[0.17.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.3
[0.17.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.2
[0.17.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.1
[0.17.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.17.0
[0.16.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.16.2
[0.16.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.16.1
[0.16.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.16.0
[0.15.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.15.1
[0.15.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.15.0
[0.14.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.5
[0.14.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.4
[0.14.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.3
[0.14.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.2
[0.14.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.1
[0.14.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.14.0
[0.13.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.13.0
[0.12.14]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.14
[0.12.13]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.13
[0.12.12]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.12
[0.12.11]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.11
[0.12.10]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.10
[0.12.9]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.9
[0.12.8]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.8
[0.12.7]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.7
[0.12.6]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.6
[0.12.5]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.5
[0.12.4]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.4
[0.12.3]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.3
[0.12.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.2
[0.12.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.1
[0.12.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.12.0
[0.11.2]: https://github.com/xrequillart/magic-slash/releases/tag/v0.11.2
[0.11.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.11.1
[0.11.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.11.0
[0.10.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.10.0
[0.9.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.9.0
[0.8.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.8.0
[0.7.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.7.1
[0.7.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.7.0
[0.6.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.6.1
[0.6.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.6.0
[0.5.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.5.0
[0.4.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.4.0
[0.3.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.3.0
[0.2.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.2.1
[0.2.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.2.0
[0.1.0]: https://github.com/xrequillart/magic-slash/releases/tag/v0.1.0
[0.0.1]: https://github.com/xrequillart/magic-slash/releases/tag/v0.0.1
