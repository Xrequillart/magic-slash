import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { STABLE_CONFIG_DIR } from '../config/paths'
import { shQuote } from '../utils/sh'

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const MAGIC_SLASH_HOOK_MARKER = 'magic-slash-desktop'

// StatusLine integration: a wrapper script captures Claude Code's statusline JSON
// (cost, context usage, model) and POSTs it to the local status server, then relays
// the user's original statusline so nothing is lost.
//
// Everything this module writes lands in ~/.claude/settings.json, one file shared by
// every build and by plain `claude` sessions, so every path here is the STABLE one:
// a dev-suffixed statusline path would stop matching STATUSLINE_MARKER and each build
// would bake the other's wrapper in as "the user's original", nesting them.
const STATUSLINE_SCRIPT_PATH = path.join(STABLE_CONFIG_DIR, 'statusline.sh')
const STATUSLINE_BACKUP_PATH = path.join(STABLE_CONFIG_DIR, 'statusline-original.json')
const STATUSLINE_MARKER = 'magic-slash/statusline.sh'
// Our own renderer, used as the inner statusline for anyone who has none of their own.
// Before it existed the wrapper relayed nothing in that case, so Claude Code showed an
// empty statusline — and users who removed theirs silently lost the sidebar usage card,
// whose only data source is this payload.
const STATUSLINE_DEFAULT_PATH = path.join(STABLE_CONFIG_DIR, 'statusline-default.sh')

// Where the skill-telemetry hook spools its records, for the app to drain later (see
// usage/skill-spool.ts). Kept relative so the generated hook expands $HOME at run
// time rather than baking in the path of whoever installed the app.
const SPOOL_DIR_RELATIVE = '.config/magic-slash'
const SKILL_SPOOL_RELATIVE = `${SPOOL_DIR_RELATIVE}/pending-skills.ndjson`


/**
 * The statusline Magic Slash renders when the user has none of their own: working
 * directory, model, and how this session authenticates.
 *
 * Deliberately three segments. It is a default, not a product surface — anyone who
 * wants a cost readout or a context gauge already has the app sidebar, and anyone who
 * wants more in the terminal writes their own statusLine, which this steps aside for.
 *
 * POSIX sh + jq only. jq is a required prerequisite (see setup/prerequisites.ts), and
 * every field read here comes from the statusLine stdin schema except the org type,
 * which Claude Code stores in ~/.claude.json.
 */
function buildDefaultStatusLineScript(): string {
  return `#!/bin/sh
# Managed by Magic Slash Desktop — the statusline used when you have none of your own.
# Edit it and the next app launch overwrites you: set your own \`statusLine\` in
# ~/.claude/settings.json instead, and Magic Slash will relay it rather than this.
input=$(cat)

dir=$(printf '%s' "$input" | jq -r '.workspace.current_dir // .cwd // empty')
[ -n "$dir" ] && dir=$(basename "$dir")
model=$(printf '%s' "$input" | jq -r '.model.display_name // empty')

# How this session talks to Anthropic. The gateway env vars win over everything else
# because they are what Claude Code itself checks first.
auth=""
case "$CLAUDE_CODE_USE_BEDROCK" in 1|true|yes) auth="Bedrock" ;; esac
if [ -z "$auth" ]; then
  case "$CLAUDE_CODE_USE_VERTEX" in 1|true|yes) auth="Vertex" ;; esac
fi
if [ -z "$auth" ] && [ -n "$ANTHROPIC_API_KEY" ]; then auth="API"; fi
if [ -z "$auth" ]; then
  case "$(jq -r '.oauthAccount.organizationType // empty' "$HOME/.claude.json" 2>/dev/null)" in
    claude_team)       auth="Team" ;;
    claude_enterprise) auth="Enterprise" ;;
    claude_max)        auth="Max" ;;
    claude_pro)        auth="Pro" ;;
    "")                auth="" ;;
    *)                 auth="OAuth" ;;
  esac
fi

[ -n "$dir" ]   && printf '\\033[97;48;2;38;79;120m pwd:%s \\033[0m' "$dir"
[ -n "$model" ] && printf ' \\033[97;48;2;75;75;75m %s \\033[0m' "$model"
[ -n "$auth" ]  && printf ' \\033[97;48;2;75;75;75m auth:%s \\033[0m' "$auth"
# Never exit non-zero: the last test above fails whenever its segment is empty, and
# Claude Code reports a failing statusLine command to the user.
exit 0
`
}

// Build the statusLine wrapper. The inner command — the user's own statusline, or
// ours when they have none — is baked in as the fallback so a plain `claude` session
// started OUTSIDE the desktop app (where MAGIC_SLASH_INNER_STATUSLINE is not
// injected) still renders it. Inside the app the env var takes precedence.
function buildStatusLineScript(innerCommand: string): string {
  const baked = shQuote(innerCommand)
  return `#!/usr/bin/env bash
# Managed by Magic Slash Desktop — captures Claude Code usage for the app sidebar.
input=$(cat)
if [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && [ -n "$MAGIC_SLASH_PORT" ]; then
  printf '%s' "$input" | curl -s -X POST --data-binary @- \\
    "http://127.0.0.1:$MAGIC_SLASH_PORT/usage?id=$MAGIC_SLASH_TERMINAL_ID" >/dev/null 2>&1 || true
fi
# Relay the user's original statusline. The env var (set by the desktop app) wins;
# otherwise fall back to the command baked in at configuration time.
INNER=\${MAGIC_SLASH_INNER_STATUSLINE:-${baked}}
if [ -n "$INNER" ]; then
  printf '%s' "$input" | eval "$INNER"
fi
`
}

interface StatusLineConfig {
  type?: string
  command?: string
  [key: string]: unknown
}

function isMagicSlashStatusLine(sl: StatusLineConfig | undefined): boolean {
  return typeof sl?.command === 'string' && sl.command.includes(STATUSLINE_MARKER)
}
/**
 * Permissions every install gets, whatever the integrations.
 *
 * The two Read() entries are not decoration: the skills read their own reference
 * files (messages, glossary, plan templates) and the Magic Slash config at run time,
 * and without these the very first step of every skill stops on a permission prompt.
 *
 * WHAT THIS FILE IS ACTUALLY DOING, AND WHY THE Bash ENTRIES ARE SHAPED THE WAY THEY ARE
 * ─────────────────────────────────────────────────────────────────────────────────────
 * These land in `~/.claude/settings.json`, which is GLOBAL. They apply to every Claude
 * Code session on the machine, in every repository, whether or not Magic Slash started
 * it and whether or not a skill is running. That is the one fact to hold on to when
 * adding a line here, because it is what makes a convenient grant expensive.
 *
 * This list used to read `Bash(git *)`, `Bash(npm *)`, `Bash(yarn *)`, `Bash(pnpm *)`,
 * `Bash(bun *)`, `Bash(gh *)`, `Bash(jq *)` and `Bash(*http://127.0.0.1:*)`. Every one
 * of those is a route to arbitrary command execution, not by any flaw in the matcher
 * but through the documented features of the tool named:
 *
 *  • `git config alias.x '!sh -c …'`, then `git x`. Also `git -c core.pager=…` and
 *    `git -c core.sshCommand=…`, which run a command on the next fetch.
 *  • `npm run` / `npx` / `pnpm dlx` / `bun x` — fetching and executing a package, or
 *    running a script out of whatever `package.json` happens to be in the directory.
 *  • `gh api --method DELETE`, `gh secret set`, `gh workflow run`.
 *  • A LEADING wildcard, as in `Bash(*http://127.0.0.1:*)`, matches a command that
 *    merely CONTAINS the substring: `sh -c 'anything' # http://127.0.0.1:` qualified.
 *
 * On its own that is a broad grant the user never explicitly agreed to. Combined with
 * what the skills read — PR review comments, issue and ticket descriptions, all of it
 * written by whoever can comment on the repository — it removes the human from the
 * loop precisely where untrusted text is being turned into actions. The skills now say
 * so themselves (see the "Untrusted content" section in each SKILL.md); this is the
 * other half of that fix.
 *
 * So the Bash entries below are PREFIX-scoped to the verbs the skills actually run,
 * taken from the commands in `skills/`. The shape matters in three ways:
 *
 *  1. Every rule names a subcommand, so no rule grants a whole tool. `git config` is
 *    absent, and `Bash(git fetch:*)` does not match `git -c core.sshCommand=… fetch`
 *    either — the `-c` vector closes by construction rather than by a filter.
 *  2. Package managers get `install` (bare) and `run`/`test`. Not `npx`, `pnpm dlx`,
 *    `bun x` or `npm exec`: those exist to execute code fetched from the network, and
 *    a prompt is the correct answer to one of those every time.
 *  3. A missing rule costs a permission PROMPT, never a failure. That is what makes
 *    erring narrow the cheap direction here, and why the list should stay reactive to
 *    real friction rather than pre-emptively generous.
 *
 * `gh api` stays broad, and is the one place this list still grants more than it can
 * justify by shape alone. The skills use it for GraphQL reads and for posting threaded
 * review replies, both of which are `gh api` with a method flag, so there is no prefix
 * that admits the second without admitting a DELETE. Narrowing it needs the skills to
 * route writes through the MCP tools instead — worth doing, bigger than this file.
 */
const MAGIC_SLASH_BASE_PERMISSIONS = [
  // Skill reference files. Absolute, because Claude Code does not expand $HOME here.
  `Read(${path.join(os.homedir(), '.claude', 'skills', 'magic-*')})`,
  // Magic Slash config
  `Read(${path.join(STABLE_CONFIG_DIR, '*')})`,
  // Desktop communication: the hooks and skills read the live config and report state
  // over the local status server. Anchored at `curl`, so the rule can no longer be
  // satisfied by an unrelated command that merely mentions the address — and listed
  // per flag combination because prefix matching has no way to say "these flags in
  // any order". These three are what `skills/` actually sends.
  'Bash(curl -s "http://127.0.0.1:*)',
  'Bash(curl -sf "http://127.0.0.1:*)',
  'Bash(curl -sf --max-time 5 "http://127.0.0.1:*)',
  // GitHub MCP tools
  'mcp__github__get_issue',
  'mcp__github__add_issue_comment',
  'mcp__github__update_issue',
  'mcp__github__list_pull_requests',
  'mcp__github__get_pull_request',
  'mcp__github__get_pull_request_files',
  'mcp__github__get_pull_request_comments',
  'mcp__github__get_pull_request_reviews',
  'mcp__github__create_pull_request',
  'mcp__github__create_pull_request_review',
  // /magic:plan turns an idea into tickets: it searches for duplicates, then creates the
  // epic and its stories as real sub-issues, and reads the current user to self-assign
  // them. Granted here rather than left to a prompt because they land mid-session — the
  // duplicate search runs before the brainstorm and creation right after the approval, so
  // a prompt would interrupt precisely the two moments the user is waiting on. The write
  // ones are safe to pre-approve for the same reason update_issue above is: /magic:plan
  // cannot reach them until a human has approved the structure, a step the skill states is
  // not configurable.
  'mcp__github__search_issues',
  'mcp__github__issue_write',
  'mcp__github__sub_issue_write',
  'mcp__github__get_me',
  // ── git ────────────────────────────────────────────────────────────────────
  // The subcommands the skills run, and only those. `git config` is deliberately
  // absent: an alias is a stored shell command, so granting it grants everything.
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git branch:*)',
  'Bash(git rev-parse:*)',
  'Bash(git ls-files:*)',
  'Bash(git check-ignore:*)',
  'Bash(git remote:*)',
  'Bash(git merge-base:*)',
  'Bash(git merge-tree:*)',
  'Bash(git fetch:*)',
  'Bash(git pull:*)',
  'Bash(git add:*)',
  'Bash(git commit:*)',
  'Bash(git push:*)',
  'Bash(git checkout:*)',
  'Bash(git worktree:*)',
  'Bash(git rebase:*)',
  'Bash(git reset:*)',
  // The multi-repo flows address a sibling worktree as `git -C <path> <subcommand>`,
  // always read-only (branch, check-ignore, log, ls-files, status). A rule with the
  // path in the MIDDLE is a glob rather than a prefix, and whether the matcher honours
  // one is a Claude Code detail this file cannot verify. Included because the failure
  // is safe in the direction that matters: a rule that never matches costs a prompt,
  // never a wider grant. If these turn out to be dead weight, the durable fix is for
  // the skills to `cd` into the worktree instead of reaching into it with `-C`.
  'Bash(git -C * status:*)',
  'Bash(git -C * branch:*)',
  'Bash(git -C * log:*)',
  'Bash(git -C * ls-files:*)',
  'Bash(git -C * check-ignore:*)',
  // ── package managers ───────────────────────────────────────────────────────
  // Bare `install` — restoring the dependencies a freshly created worktree is missing,
  // from the repository's own lockfile. NOT `install <package>`, which fetches and runs
  // whatever it is pointed at, and not the `npx`/`dlx`/`x`/`exec` verbs at all.
  'Bash(npm install)',
  'Bash(npm ci)',
  'Bash(yarn install)',
  'Bash(pnpm install)',
  'Bash(bun install)',
  // Scripts, which are defined by the repository the user chose to work in. This is the
  // loosest grant of the three groups, and knowingly so: `npm run` executes whatever
  // `package.json` says, so it is only as safe as the working directory. It stays
  // because the verify step of every skill is `npm test` or `npm run lint`, and a
  // prompt on each of those is a prompt on the main loop of the product.
  'Bash(npm run:*)',
  'Bash(npm test:*)',
  'Bash(yarn run:*)',
  'Bash(yarn test:*)',
  'Bash(pnpm run:*)',
  'Bash(pnpm test:*)',
  'Bash(bun run:*)',
  'Bash(bun test:*)',
  // ── jq ─────────────────────────────────────────────────────────────────────
  // Every skill parses the config with it. A filter language with no way to spawn a
  // process; the residual is that it reads any file named on its command line.
  'Bash(jq:*)',
  // ── gh ─────────────────────────────────────────────────────────────────────
  // Per subcommand, for the same reason as git. See the note above on `gh api`, which
  // is the one entry here still wider than its purpose.
  'Bash(gh api:*)',
  'Bash(gh auth status:*)',
  'Bash(gh repo view:*)',
  'Bash(gh pr view:*)',
  'Bash(gh pr list:*)',
  'Bash(gh pr edit:*)',
  'Bash(gh pr checks:*)',
  'Bash(gh issue view:*)',
  'Bash(gh run view:*)',
  // WebFetch is deliberately NOT pre-approved: /magic:start declares it in
  // allowed-tools to resolve public design URLs, but an unscoped grant would widen
  // every future session for a rare path. The user is prompted on the first fetch.
]

/**
 * Granted only when the Atlassian integration is on.
 *
 * Kept separate so turning the integration off actually withdraws them. A blanket
 * grant for a server the user does not use is a permission they never agreed to, and
 * it would silently come back to life the day they configured Jira for something else.
 */
const MAGIC_SLASH_ATLASSIAN_PERMISSIONS = [
  'mcp__atlassian__getAccessibleAtlassianResources',
  'mcp__atlassian__getJiraIssue',
  'mcp__atlassian__getJiraIssueRemoteIssueLinks',
  // /magic:start's dependency gate: link type names are configurable per Jira site
  // ("Blocks" / "Bloque" / "Precedes" all exist), so it resolves them instead of
  // hardcoding, then reads each blocker's status category by JQL. Both are read-only.
  // See skills/magic-start/references/dependencies.md §2.1 and §3.2.
  'mcp__atlassian__getIssueLinkTypes',
  'mcp__atlassian__searchJiraIssuesUsingJql',
  'mcp__atlassian__getTransitionsForJiraIssue',
  'mcp__atlassian__transitionJiraIssue',
  'mcp__atlassian__addCommentToJiraIssue',
]

/**
 * Entries earlier versions of this file wrote and this one does not.
 *
 * Removing our own stale grants is the entire reason ownership has to be decidable at
 * all: the allowlist is rewritten from scratch on every launch, so an entry that is no
 * longer recognised as ours is an entry that survives forever. The broad `Bash(git *)`
 * family lives here rather than being quietly dropped — an install that has been
 * running since before this change is exactly the one still holding them.
 *
 * `.config/magic-slash` appears as a literal path because `STABLE_CONFIG_DIR` did not
 * always name it, and a machine that upgraded across that change has the older string.
 */
const LEGACY_MAGIC_SLASH_PERMISSIONS = [
  'Bash(*http://127.0.0.1:*)',
  'Bash(* curl -s "http://127.0.0.1:*" *)',
  'Bash(git *)',
  'Bash(npm *)',
  'Bash(yarn *)',
  'Bash(pnpm *)',
  'Bash(bun *)',
  'Bash(jq *)',
  'Bash(gh *)',
  `Read(${path.join(os.homedir(), '.config', 'magic-slash', '*')})`,
]

/**
 * Which entries in the user's allowlist belong to us, by EXACT match.
 *
 * This used to ask whether the entry contained one of a list of substrings —
 * `mcp__github__`, `127.0.0.1`, `Bash(git `, `.config/magic-slash` — and that was
 * wrong in the destructive direction. A user who had granted `mcp__github__delete_file`
 * themselves, or any rule of their own mentioning a local address, had it silently
 * deleted on the next launch: the app rewrites this list on every start, so the entry
 * was removed and not put back. Nothing reported it, and re-granting it lasted until
 * the next launch.
 *
 * A set of the exact strings this file has ever written has no such failure mode. It is
 * also exhaustive in a way substrings could not be checked to be — the union below IS
 * the definition of "ours", so adding a permission above cannot forget to teach the
 * cleanup about it.
 *
 * The one thing exactness cannot express is our two `Read()` paths, which embed
 * `os.homedir()` and have been spelled more than one way. Those keep a prefix test,
 * narrow enough that it can only match a path inside our own directories.
 */
const OWNED_PERMISSIONS = new Set([
  ...MAGIC_SLASH_BASE_PERMISSIONS,
  ...MAGIC_SLASH_ATLASSIAN_PERMISSIONS,
  ...LEGACY_MAGIC_SLASH_PERMISSIONS,
])

const OWNED_READ_PREFIXES = [
  `Read(${path.join(os.homedir(), '.claude', 'skills', 'magic-')}`,
  `Read(${path.join(os.homedir(), '.config', 'magic-slash')}`,
  `Read(${STABLE_CONFIG_DIR}`,
]

function isMagicSlashPermission(perm: string): boolean {
  return OWNED_PERMISSIONS.has(perm) || OWNED_READ_PREFIXES.some((p) => perm.startsWith(p))
}

interface HookConfig {
  /** Tool-name pattern. Absent means "every tool" (Claude Code's match-all). */
  matcher?: string
  hooks: Array<{
    type: string
    command: string
  }>
}

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookConfig[]
    PostToolUse?: HookConfig[]
    Notification?: HookConfig[]
    Stop?: HookConfig[]
    [key: string]: HookConfig[] | undefined
  }
  permissions?: {
    allow?: string[]
    deny?: string[]
  }
  statusLine?: StatusLineConfig
  [key: string]: unknown
}

function getHookConfig(event: string): HookConfig {
  // Use curl to notify our status server
  // The command uses environment variables set by Magic Slash Desktop:
  // - MAGIC_SLASH_TERMINAL_ID: The terminal ID
  // - MAGIC_SLASH_PORT: The port of the status server
  // This allows hooks to be installed once and work with any instance
  let state: string
  switch (event) {
    case 'UserPromptSubmit':
      state = 'working' // User sent a message, Claude starts processing
      break
    case 'PreToolUse':
      state = 'working'
      break
    case 'PostToolUse':
      state = 'working' // Still working after tool completes (may use more tools)
      break
    case 'Notification':
      state = 'waiting' // Claude needs user attention
      break
    case 'Stop':
      state = 'completed' // Claude finished responding
      break
    case 'SessionStart':
      state = 'idle' // Session started, waiting for input
      break
    default:
      state = 'working'
  }

  const command = `[ -n "$MAGIC_SLASH_TERMINAL_ID" ] && [ -n "$MAGIC_SLASH_PORT" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/status?id=$MAGIC_SLASH_TERMINAL_ID&state=${state}" > /dev/null 2>&1 || true # ${MAGIC_SLASH_HOOK_MARKER}`

  return {
    hooks: [{
      type: 'command',
      command
    }]
  }
}

/**
 * Records which skill was invoked, for usage telemetry.
 *
 * Scoped with `matcher: 'Skill'` so it only runs on skill invocations — PreToolUse
 * fires on every single tool call, and spawning jq that often would be wasteful.
 * Claude Code delivers the hook payload on stdin as
 * `{ hook_event_name, tool_name, tool_input, tool_use_id }`; the skill name lives
 * in `tool_input.skill`.
 *
 * WHY THIS APPENDS TO A FILE INSTEAD OF CALLING THE STATUS SERVER
 * ---------------------------------------------------------------------------
 * It used to curl 127.0.0.1/skill like every other hook, which meant a run only
 * counted while the desktop app happened to be listening: the port file is deleted
 * on shutdown, so a skill run with the app closed — the normal way many people use
 * Claude Code — was dropped on the floor with no trace. It looked like nobody had
 * used the product.
 *
 * A file has no such precondition. Nothing in the UI reacts to a skill invocation
 * (see the callback wiring in main/index.ts: telemetry only, no IPC broadcast), so
 * there was never anything real time to preserve — the app drains this spool at
 * launch and on every connectivity tick, and the run is counted either way.
 *
 * FILTERED HERE, NOT LATER
 * ---------------------------------------------------------------------------
 * `select(... startswith("magic-"))` mirrors the main-process filter, and has to:
 * without it the spool would hold the names of every unrelated skill the user runs,
 * including their employer's private ones, sitting in plain text on disk until a
 * drain discarded them. Not writing them at all is the only version of that filter
 * that is actually a privacy guarantee.
 *
 * `sub("^.*:";"")` folds the plugin prefix the same way the rollup RPCs do, so a
 * plugin install reporting "magic-slash:magic-pr" is recognised.
 *
 * MAGIC_SLASH_TERMINAL_ID is empty in a terminal the app did not spawn; the run is
 * then recorded without an agent, which is accurate rather than lossy.
 */
function getSkillHookConfig(): HookConfig {
  const dir = `"$HOME/${SPOOL_DIR_RELATIVE}"`
  const spool = `"$HOME/${SKILL_SPOOL_RELATIVE}"`
  // One jq pass parses stdin, extracts the skill, drops what is not ours, and emits
  // the record. It prints nothing at all for a non-magic skill, so the append is a
  // no-op rather than a blank line.
  const filter =
    'fromjson? | .tool_input.skill // empty ' +
    '| select((sub("^.*:";"")) | startswith("magic-")) ' +
    '| {type: "start", skill: ., agentId: $id, occurredAt: ($ts | tonumber * 1000), source: "tool"} | tojson'
  const command = `mkdir -p ${dir} 2>/dev/null; jq -rR --slurp --arg id "$MAGIC_SLASH_TERMINAL_ID" --arg ts "$(date +%s)" ${shQuote(filter)} 2>/dev/null >> ${spool} || true # ${MAGIC_SLASH_HOOK_MARKER}`

  return {
    matcher: 'Skill',
    hooks: [{
      type: 'command',
      command
    }]
  }
}

/**
 * Records a skill invoked by TYPING ITS SLASH COMMAND, which the hook above cannot see.
 *
 * WHY A SECOND PRODUCER EXISTS AT ALL
 * ---------------------------------------------------------------------------
 * `getSkillHookConfig` is a PreToolUse hook scoped to the `Skill` TOOL, so it only
 * fires when the MODEL decides to invoke a skill — which is what happens when a user
 * asks in natural language ("commit my changes"). Typing `/magic-commit` is a
 * different path entirely: Claude Code expands the command itself and hands the model
 * the instructions directly, so no tool call happens and no PreToolUse fires. Every
 * run started the way the product documents starting them was therefore invisible to
 * the counters, while the dashboards reported an absence of work.
 *
 * UserPromptSubmit is the only event that sees the typed command, so it is where the
 * other half of the truth has to come from.
 *
 * WHY IT IS SAFE TO HAVE TWO
 * ---------------------------------------------------------------------------
 * If Claude Code ever ALSO routes a slash command through the Skill tool, both hooks
 * fire for one run. That would double-count, so the records carry `source` and the
 * drain drops a `tool` start that a `prompt` start already accounts for — see
 * usage/skill-spool.ts. Neither hook has to know what the other did.
 *
 * WHAT COUNTS AS AN INVOCATION
 * ---------------------------------------------------------------------------
 * The command must be at the START of the prompt: a message that merely mentions
 * `/magic-start` is discussing it, not running it. Three spellings reach the same
 * skill and are normalised to the name the rollups group on — `/magic-start`,
 * `/magic:start`, and the plugin form `/magic-slash:magic-start`.
 *
 * Same privacy filter as the tool hook, and for the same reason: a slash command the
 * user typed is their own text, and only the magic ones are ever written down.
 */
function getPromptSkillHookConfig(): HookConfig {
  const dir = `"$HOME/${SPOOL_DIR_RELATIVE}"`
  const spool = `"$HOME/${SKILL_SPOOL_RELATIVE}"`
  // `capture` emits nothing when the prompt does not open with a slash command, so
  // the whole pipeline is a no-op for ordinary messages — no blank line appended.
  const filter =
    'fromjson? | .prompt // empty ' +
    '| select(type == "string") ' +
    '| capture("^[[:space:]]*/(?<cmd>[A-Za-z0-9:_-]+)") ' +
    '| .cmd ' +
    // `/magic:start` is the documented spelling; the skill is named `magic-start`.
    '| (if startswith("magic:") then "magic-" + .[6:] else . end) ' +
    // `/magic-slash:magic-pr` — drop the plugin prefix, as the rollup RPCs do.
    '| sub("^.*:"; "") ' +
    '| select(startswith("magic-")) ' +
    '| {type: "start", skill: ., agentId: $id, occurredAt: ($ts | tonumber * 1000), source: "prompt"} | tojson'
  const command = `mkdir -p ${dir} 2>/dev/null; jq -rR --slurp --arg id "$MAGIC_SLASH_TERMINAL_ID" --arg ts "$(date +%s)" ${shQuote(filter)} 2>/dev/null >> ${spool} || true # ${MAGIC_SLASH_HOOK_MARKER}`

  return {
    hooks: [{
      type: 'command',
      command
    }]
  }
}

/**
 * The hooks that drive the menu bar panel's pending-question card.
 *
 * `question` ships the hook's own stdin to the app, so the panel can show WHAT the
 * agent is asking (see main/questions/pending-questions.ts). `question/clear` tells
 * the app the agent is no longer blocked, so the panel drops the card.
 *
 * ⚠️ The clears are bound to EVENTS, never to state. The generic PreToolUse hook
 * reports `working` at the very instant the AskUserQuestion capture fires, and their
 * order is not guaranteed — clearing on a state change would erase the question that
 * just arrived. Hence three separate event registrations (the question's own
 * PostToolUse, a new user prompt, and the end of the turn) instead.
 *
 * `--data-binary @-` makes curl read stdin itself — no `cat`, no temp file, and the
 * payload reaches the app byte for byte, parsed on the app side rather than mangled
 * by shell quoting here.
 *
 * `--max-time 2` is the load-bearing flag: these hooks run on the critical path of a
 * blocked agent. If the app is not listening (closed, or restarting), the connection
 * refusal is immediate; the timeout covers the pathological case of a socket that
 * accepts and never answers, which would otherwise hang the agent indefinitely.
 * `|| true` makes every failure a no-op, as with every other hook here.
 *
 * Both routes share one builder so the guard, the timeout and the marker exist once:
 * these commands swallow their own errors, so a divergent copy would fail silently.
 *
 * @param route `question` to capture, `question/clear` to clear.
 * @param options.post Send the hook's stdin as the request body.
 * @param options.matcher Tool-name pattern, or omitted for events that have no tool.
 */
function getQuestionHookConfig(
  route: 'question' | 'question/clear',
  options: { post?: boolean; matcher?: string } = {}
): HookConfig {
  const body = options.post ? '-X POST --data-binary @- ' : ''
  const command = `[ -n "$MAGIC_SLASH_TERMINAL_ID" ] && [ -n "$MAGIC_SLASH_PORT" ] && curl -s --max-time 2 ${body}"http://127.0.0.1:$MAGIC_SLASH_PORT/${route}?id=$MAGIC_SLASH_TERMINAL_ID" > /dev/null 2>&1 || true # ${MAGIC_SLASH_HOOK_MARKER}`

  return {
    ...(options.matcher ? { matcher: options.matcher } : {}),
    hooks: [{
      type: 'command',
      command
    }]
  }
}

function isMagicSlashHook(hookConfig: HookConfig): boolean {
  return hookConfig.hooks?.some(h => h.command?.includes(MAGIC_SLASH_HOOK_MARKER)) ?? false
}

/**
 * Write the hooks, the statusLine wrapper's permissions and the allowlist.
 *
 * `atlassian` decides whether the Jira tools are granted. It is a PARAMETER rather
 * than a `readConfig()` call because of when this runs: the first call happens on the
 * launch path, before the cloud store has hydrated, when the config in memory is still
 * the default (Atlassian on). Reading it there would grant the Jira tools to a
 * GitHub-only user on every single launch, and quietly undo their choice.
 *
 * So the launch call passes nothing (keeping whatever the file already had for
 * Atlassian), and the connectivity gate calls it again with the hydrated value once it
 * knows it. Idempotent either way: the marker filter removes our own entries first.
 */
export function configureClaudeHooks(options?: { atlassian?: boolean }): void {
  try {
    // Ensure .claude directory exists
    const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH)
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true })
    }

    // Read existing settings or create new
    let settings: ClaudeSettings = {}
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
      try {
        settings = JSON.parse(content)
      } catch {
        // If JSON is invalid, start fresh but backup the old file
        const backupPath = `${CLAUDE_SETTINGS_PATH}.backup.${Date.now()}`
        fs.copyFileSync(CLAUDE_SETTINGS_PATH, backupPath)
        console.log(`Backed up invalid settings to ${backupPath}`)
      }
    }

    // Initialize hooks object if needed
    if (!settings.hooks) {
      settings.hooks = {}
    }

    // Events we want to hook into
    const hookEvents = [
      'UserPromptSubmit', // User sends a message → working
      'PreToolUse',       // Before tool use → working
      'PostToolUse',      // After tool use → working
      'Notification',     // Claude needs attention → waiting
      'Stop',             // Claude finished → idle
      'SessionStart',     // Session started → idle
    ]

    for (const event of hookEvents) {
      // Initialize array if needed
      if (!settings.hooks[event]) {
        settings.hooks[event] = []
      }

      // Remove any existing Magic Slash hooks (to update them)
      settings.hooks[event] = settings.hooks[event]!.filter(hook => !isMagicSlashHook(hook))

      // Add our hook
      settings.hooks[event]!.push(getHookConfig(event))
    }

    // Skill-invocation telemetry, from the two places a skill can start. Both are
    // second entries on events already hooked above, and the filter there already
    // stripped them (same marker), so this stays idempotent.
    //   - the Skill TOOL, when the model chose to run a skill;
    //   - the typed slash command, which never reaches a tool call.
    settings.hooks.PreToolUse!.push(getSkillHookConfig())
    settings.hooks.UserPromptSubmit!.push(getPromptSkillHookConfig())

    // Pending questions, for the menu bar panel. Five more ADDITIONAL entries on
    // events already hooked above — pushed, never assigned, or the state reporting
    // that shares those events would be replaced by these.
    //
    // Capture: the AskUserQuestion tool call (scoped by matcher, since PreToolUse
    // fires on every tool), and Notification, which is how a permission prompt
    // announces itself.
    settings.hooks.PreToolUse!.push(getQuestionHookConfig('question', { post: true, matcher: 'AskUserQuestion' }))
    settings.hooks.Notification!.push(getQuestionHookConfig('question', { post: true }))
    // Clear: the question was answered in the terminal (its PostToolUse), the user
    // moved on to something else, or the turn ended.
    settings.hooks.PostToolUse!.push(getQuestionHookConfig('question/clear', { matcher: 'AskUserQuestion' }))
    settings.hooks.UserPromptSubmit!.push(getQuestionHookConfig('question/clear'))
    settings.hooks.Stop!.push(getQuestionHookConfig('question/clear'))

    // Configure permissions for magic-slash skills (MCP tools + common commands)
    if (!settings.permissions) {
      settings.permissions = { allow: [] }
    }
    if (!settings.permissions.allow) {
      settings.permissions.allow = []
    }
    // Whether to grant the Jira tools. Unspecified means "don't decide": keep what the
    // file already says, so the pre-hydration call cannot overwrite a real choice with
    // a default. First install has neither, and Atlassian defaults on — matching the
    // config normalizer in config/config.ts.
    const atlassian =
      options?.atlassian ??
      (settings.permissions.allow.some((p: string) => p.startsWith('mcp__atlassian__')) ||
        !settings.permissions.allow.some((p: string) => isMagicSlashPermission(p)))

    // Remove old magic-slash permissions (to update them if list changed)
    settings.permissions.allow = settings.permissions.allow.filter(
      (p: string) => !isMagicSlashPermission(p)
    )
    settings.permissions.allow.push(...MAGIC_SLASH_BASE_PERMISSIONS)
    if (atlassian) {
      settings.permissions.allow.push(...MAGIC_SLASH_ATLASSIAN_PERMISSIONS)
    }

    // Write back settings
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log('Claude Code hooks configured successfully')
  } catch (error) {
    console.error('Failed to configure Claude Code hooks:', error)
  }
}

/**
 * Configure Claude Code's statusLine to point at our capture wrapper, preserving any
 * pre-existing user statusLine (chained via MAGIC_SLASH_INNER_STATUSLINE).
 *
 * Whoever has no statusLine of their own gets ours (buildDefaultStatusLineScript) —
 * the wrapper has to be installed either way for the sidebar usage card to have any
 * data, and relaying nothing left those users staring at an empty statusline.
 *
 * Returns the statusLine command to chain: the user's own where there is one, ours
 * otherwise, and an empty string only if our renderer could not be written.
 */
export function configureStatusLine(): string {
  try {
    // Ensure config dir exists
    if (!fs.existsSync(STABLE_CONFIG_DIR)) {
      fs.mkdirSync(STABLE_CONFIG_DIR, { recursive: true })
    }

    const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH)
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true })
    }

    let settings: ClaudeSettings = {}
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      try {
        settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'))
      } catch {
        // Leave settings empty; configureClaudeHooks handles backup of invalid files
      }
    }

    const existing = settings.statusLine
    let inner = ''

    if (existing && !isMagicSlashStatusLine(existing)) {
      // First time we take over: back up the user's original statusLine and chain it.
      // The backup MUST succeed before we overwrite — otherwise a later uninstall
      // could not restore the original and would silently drop the user's config.
      inner = typeof existing.command === 'string' ? existing.command : ''
      try {
        fs.writeFileSync(STATUSLINE_BACKUP_PATH, JSON.stringify(existing))
      } catch (e) {
        throw new Error('Failed to back up original statusLine; aborting to avoid data loss', { cause: e })
      }
    } else if (existing && isMagicSlashStatusLine(existing)) {
      // Already ours: recover the original command from the backup to keep chaining
      inner = readBackupStatusLineCommand()
    } else {
      // No statusLine configured: record "none" so uninstall removes ours cleanly
      try {
        fs.writeFileSync(STATUSLINE_BACKUP_PATH, 'null')
      } catch {
        // non-fatal
      }
    }

    // Our renderer is refreshed on every launch so a released change to it reaches
    // machines that already have the file — the wrapper is rewritten the same way.
    try {
      fs.writeFileSync(STATUSLINE_DEFAULT_PATH, buildDefaultStatusLineScript(), { mode: 0o755 })
      fs.chmodSync(STATUSLINE_DEFAULT_PATH, 0o755)
      // Nobody else's statusline to relay, so render ours. Quoted because it is
      // reached through `eval` and a home directory may contain spaces.
      if (!inner) inner = `sh ${shQuote(STATUSLINE_DEFAULT_PATH)}`
    } catch (e) {
      // Non-fatal: an unwritable default costs the statusline, not the usage capture
      // the wrapper exists for. Leave `inner` empty and relay nothing, as before.
      console.error('Failed to write the default statusLine renderer:', e)
    }

    // Write the wrapper script (executable) with the original command baked in as
    // the fallback, so it works even outside the desktop app.
    fs.writeFileSync(STATUSLINE_SCRIPT_PATH, buildStatusLineScript(inner), { mode: 0o755 })
    // Re-assert mode in case the file already existed with different perms
    fs.chmodSync(STATUSLINE_SCRIPT_PATH, 0o755)

    settings.statusLine = {
      type: 'command',
      command: `bash ${STATUSLINE_SCRIPT_PATH}`,
    }

    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log('Claude Code statusLine configured successfully')
    return inner
  } catch (error) {
    console.error('Failed to configure Claude Code statusLine:', error)
    return ''
  }
}

function readBackupStatusLineCommand(): string {
  try {
    if (!fs.existsSync(STATUSLINE_BACKUP_PATH)) return ''
    const raw = fs.readFileSync(STATUSLINE_BACKUP_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as StatusLineConfig | null
    return typeof parsed?.command === 'string' ? parsed.command : ''
  } catch {
    return ''
  }
}

function restoreStatusLine(settings: ClaudeSettings): void {
  if (!isMagicSlashStatusLine(settings.statusLine)) {
    return
  }
  let restored: StatusLineConfig | null = null
  try {
    if (fs.existsSync(STATUSLINE_BACKUP_PATH)) {
      restored = JSON.parse(fs.readFileSync(STATUSLINE_BACKUP_PATH, 'utf-8'))
    }
  } catch {
    restored = null
  }
  if (restored && typeof restored === 'object') {
    settings.statusLine = restored
  } else {
    delete settings.statusLine
  }
  try {
    if (fs.existsSync(STATUSLINE_BACKUP_PATH)) {
      fs.unlinkSync(STATUSLINE_BACKUP_PATH)
    }
  } catch {
    // non-fatal
  }
}

export function removeClaudeHooks(): void {
  try {
    if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      return
    }

    const content = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8')
    const settings: ClaudeSettings = JSON.parse(content)

    // Restore the user's original statusLine (or remove ours if they had none)
    restoreStatusLine(settings)

    // Remove Magic Slash hooks from all events
    if (settings.hooks) {
      for (const event of Object.keys(settings.hooks)) {
        if (Array.isArray(settings.hooks[event])) {
          settings.hooks[event] = settings.hooks[event]!.filter(hook => !isMagicSlashHook(hook))
          // Remove empty arrays
          if (settings.hooks[event]!.length === 0) {
            delete settings.hooks[event]
          }
        }
      }

      // Remove empty hooks object
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks
      }
    }

    // Remove Magic Slash permissions
    if (settings.permissions?.allow) {
      settings.permissions.allow = settings.permissions.allow.filter(
        (p: string) => !isMagicSlashPermission(p)
      )
      if (settings.permissions.allow.length === 0) {
        delete settings.permissions.allow
      }
      if (settings.permissions && Object.keys(settings.permissions).length === 0) {
        delete settings.permissions
      }
    }

    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    console.log('Claude Code hooks removed')
  } catch (error) {
    console.error('Failed to remove Claude Code hooks:', error)
  }
}
