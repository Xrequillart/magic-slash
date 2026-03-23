# Messages Reference (EN)

> English messages for the /magic-start skill.

## MSG_CONFIG_ERROR

```text
❌ Magic Slash configuration not found

Please create the config file at:
  ~/.config/magic-slash/config.json

See documentation: https://github.com/magic-slash/config
```

## MSG_NODE_NO_MANAGER

```text
⚠️ Node.js version file detected (.nvmrc/.node-version) but no version manager (nvm/fnm) found.
Commands will use the system Node.js version.
```

## MSG_BRANCH_CONFIRM

```text
The configured base branch is **{branch}**. Use it, or specify another? (press Enter to confirm)
```

## MSG_BRANCH_ASK

```text
No development branch configured for this repository.
Which branch should I use as the base? (e.g., main, develop, staging)
```

## MSG_TRANSITION_FAILED

```text
⚠️ Unable to move the ticket to "In Progress" (transition not available or insufficient permissions)
```

## MSG_LABEL_FAILED

```text
⚠️ Unable to add the "in-progress" label (label not found or insufficient permissions)
```

## MSG_NO_ISSUE_FOUND

```text
No issue #{number} found in any configured repository.

Please check the issue number and try again, or specify the full repo (e.g. owner/repo#123).
```

## MSG_GITHUB_MULTI_ISSUE

```text
Multiple issues #{number} found:

{issue_list}

Which one do you want to use? (or 'all')
```

## MSG_SCOPE_MULTIPLE

```text
This ticket seems to involve multiple repositories:

{repo_list_with_scores}

Which one do you want to use? (1, 2, or 'all')
```

## MSG_SCOPE_NONE

```text
Unable to automatically determine the relevant repo.

Available repositories:
{repo_list}

Which one do you want to use? ({numbers}, or 'all')
```

## MSG_WORKTREE_EXISTS

```text
⚠️ Worktree already exists: {path}

Options:
1. Use existing worktree (recommended)
2. Delete and recreate
3. Abort

Choose (1/2/3):
```

## MSG_BRANCH_ALREADY_EXISTS

```text
⚠️ Branch feature/{TICKET_ID} already exists.

Options:
1. Use the existing branch (checkout into worktree)
2. Delete and recreate from {DEV_BRANCH}
3. Abort

Choose (1/2/3):
```

## MSG_REBASE_CONFLICT

```text
⚠️ Rebase conflict on {DEV_BRANCH}. The branch may have diverged.

Options:
1. Abort rebase and use current state (git rebase --abort)
2. Resolve conflicts manually
3. Abort

Choose (1/2/3):
```

## MSG_FETCH_FAILED

```text
⚠️ git fetch failed. Check your network connection. Continuing with local state...
```

## MSG_WORKTREE_FILES_COPIED

```text
📄 Copied worktree files:
{file_list}
```

> Use `✓ {file}` for copied files and `⚠ {file} (not found in main repo, skipped)` for missing files.

## MSG_WORKTREE_FILES_DETECTED

```text
🔍 Detected untracked files in the main repo that might need copying to worktrees:
{file_list}

Save to config for future worktrees? (y/n)
```

## MSG_INSTALLING_DEPS

```text
📦 Installing dependencies with {PACKAGE_MANAGER}...
```

## MSG_INSTALL_FAILED

```text
⚠️ Dependency installation failed. You may need to install manually. Continuing...
```

## MSG_TASK_SUMMARY

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : {source}
🎫 Ticket    : {ticket_id} - {title}
📋 Type      : {type_or_labels}
📁 Worktree  : {worktree_path}

🔍 Exploring codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_TASK_SUMMARY_FULLSTACK

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Source    : {source}
🎫 Ticket    : {ticket_id} - {title}
📋 Type      : {type_or_labels}
🔀 Full-Stack Task:
{worktree_list}

🔍 Exploring codebase...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_STRATEGY_SOLO

```text
🎯 Execution strategy: Solo

  The entire plan will be executed sequentially.
```

## MSG_STRATEGY_MULTI

```text
🎯 Execution strategy: Multi-agent ({N} subagents)

  {agent_list}

  Orchestrator: Main agent (sync + final summary)
```

## MSG_APPROVAL

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Does this plan and execution strategy look good to you?

• Type "yes", "ok", "go", or "let's go" to start implementation
• Type "no" or ask questions if you want to discuss changes
• You can also suggest modifications to the plan or the strategy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MSG_PROGRESS_SOLO

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION IN PROGRESS (Solo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Step {X}/{N}: {step_title}

{description}
```

## MSG_PROGRESS_MULTI

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 IMPLEMENTATION IN PROGRESS (Multi-agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Launching {N} subagents in parallel...

  {agent_list}

⏳ Waiting for all agents to complete...
```

## MSG_FINAL_SUMMARY

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implementation completed for {TICKET-ID}

## Files modified
{modified_files}

## Files created
{created_files}

## Summary of changes
{summary}

## Decisions made
{decisions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next steps:
   • Test the changes
   • Run /commit to create a commit
   • Run /pr to create a Pull Request
```

## MSG_FINAL_SUMMARY_FULLSTACK

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Implementation completed for {TICKET-ID} (Full-Stack)

## Backend ({backend_path})

### Files modified
{backend_modified}

### Files created
{backend_created}

## Frontend ({frontend_path})

### Files modified
{frontend_modified}

### Files created
{frontend_created}

## Summary of changes
{summary}

## How the repos interact
{interaction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next steps:
   • Test the changes in both repos
   • Run /commit in each worktree to create commits
   • Run /pr to create a Pull Request
```

## MSG_SIMPLIFY

```text
🔍 Running simplification pass on modified files...
```

## MSG_MULTI_REPO_CONTEXT

```text
# Full-Stack Context

You are working on ticket **{TICKET_ID}** which spans multiple repos.

## Worktrees for this task
{worktree_list}

## Instructions
- Use `cd` to navigate to the appropriate worktree
- You can work on both repos in a single session
- Make sure changes are consistent across repos
```
