# Resolve parameters

Detail of the resolve parameters of `/magic:resolve` and of Step 0.7, which pins them. Step 0.7 reads this file on every run: run the bash block below, then carry the echoed values forward.

## Language parameters

| Parameter           | Repo path                                    | Default |
| ------------------- | -------------------------------------------- | ------ |
| Discussion language | `.repositories.<name>.languages.discussion`  | `"en"` |

## Parameters and what each value does

| Parameter         | Repo path                                      | Default   |
| ----------------- | ---------------------------------------------- | --------- |
| Commit mode       | `.repositories.<name>.resolve.commitMode`      | `"new"`   |
| Format            | `.repositories.<name>.resolve.format`          | *(from commit config)* |
| Style             | `.repositories.<name>.resolve.style`           | *(from commit config)* |
| Use commit config | `.repositories.<name>.resolve.useCommitConfig` | `true`    |
| Reply to comments | `.repositories.<name>.resolve.replyToComments` | `true`    |
| Reply language    | `.repositories.<name>.resolve.replyLanguage`   | `"en"`    |
| Reply verbosity   | `.repositories.<name>.resolve.replyVerbosity`  | `"minimal"` |
| Re-request review | `.repositories.<name>.resolve.autoReRequestReview` | `true`  |
| Template checkboxes | `.repositories.<name>.pullRequest.templateCheckboxes` | `"never"` |
| Body verbosity      | `.repositories.<name>.pullRequest.bodyVerbosity`      | `"concise"` |

**Logic:**
- `commitMode: "new"` (default) → create new commit + `git push`
- `commitMode: "amend"` → `git commit --amend --no-edit` + `git push --force-with-lease`
- `commitMode: "ask"` → prompt the user for `new` vs `amend` at preview time (Step 5.5); the chosen mode drives Step 6 for this run only
- `useCommitConfig: true` (default) → format/style are read from `.repositories.<name>.commit.*`
- `useCommitConfig: false` → format/style are read from `.repositories.<name>.resolve.*`
- When `commitMode: "amend"`, format/style are irrelevant (no new message)
- `replyToComments: true` (default) → reply in-thread on each resolved comment (Step 7)
- `replyToComments: false` → skip Step 7 entirely
- `replyLanguage` (default `"en"`) → language of the in-thread reply bodies in Step 7 (independent of the discussion language)
- `replyVerbosity` (default `"minimal"`) → how much each in-thread reply says in Step 7, *after* the two parts every level shares (the commit reference, then a plain sentence describing the change): `minimal` stops there, `normal` adds why when the fix departs from the comment, `detailed` keeps the reasoning in a conversational reply. Any other value is read as `minimal`.
- `autoReRequestReview: true` (default) → automatically re-request review from original reviewers (Step 7.5)
- `autoReRequestReview: false` → skip Step 7.5, suggest manual re-request in summary
- `templateCheckboxes` (default `"never"`) → read from the `pullRequest` block, not `resolve`, the way `useCommitConfig` reads the `commit` one. Listed here **defensively**: this skill writes no PR body today, so nothing reads it yet; do not go looking for the code path. It is a **hard invariant**, not a soft default: should this skill ever write a PR body, a project template's checkbox state must come out byte-for-byte as this setting allows, exactly as in `/magic:pr` Step 6.1
- `bodyVerbosity` (default `"concise"`) → read from the `pullRequest` block, and listed here **defensively for the same reason**, under the same invariant: this skill writes no PR body today. Should it ever write one, that body obeys the length contract of `/magic:pr` Step 6.1 — bullets rather than paragraphs, capped per section — rather than inventing a second house style for the same repository

## Pin the values (Step 0.7)

```bash
# Magic Slash Desktop is the single source of truth (Supabase). The port comes from the
# environment inside an app terminal, and from the file the app publishes anywhere else —
# so a Claude started from a plain terminal reaches the same live config.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
CONFIG_FILE=""
if [ -n "$MS_PORT" ]; then
  MS_TMP_CONFIG="$(mktemp)"
  trap 'rm -f "$MS_TMP_CONFIG"' EXIT
  # A published port may name a server that has since died: -sf turns that into a failure.
  if curl -sf --max-time 5 "http://127.0.0.1:$MS_PORT/config" -o "$MS_TMP_CONFIG" 2>/dev/null \
     && [ "$(jq '.repositories | length' "$MS_TMP_CONFIG" 2>/dev/null || echo 0)" -gt 0 ]; then
    CONFIG_FILE="$MS_TMP_CONFIG"
  fi
fi

# Resolve the repo key whose path matches the current worktree/repo root.
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")
REPO_KEY=$(jq -r --arg pwd "$REPO_ROOT" '
  .repositories | to_entries
  # Longest path first so the most specific repo wins on a tie, then match on a
  # path boundary only. Worktrees are siblings named "{path}-{TICKET}", so the
  # "-" boundary is accepted alongside exact match and the "/" child boundary.
  # This prevents /projects/api from mis-matching a /projects/api-v2 worktree.
  | sort_by(.value.path | length) | reverse
  | map(select(.value.path as $p
      | ($pwd == $p) or ($pwd | startswith($p + "/")) or ($pwd | startswith($p + "-"))))
  | .[0].key // ""' "$CONFIG_FILE")

# Helper: read a resolve field with a fallback default.
rget() { jq -r --arg k "$REPO_KEY" --arg f "$1" --arg d "$2" \
  '(.repositories[$k].resolve[$f]) // $d' "$CONFIG_FILE"; }
cget() { jq -r --arg k "$REPO_KEY" --arg f "$1" --arg d "$2" \
  '(.repositories[$k].commit[$f]) // $d' "$CONFIG_FILE"; }

RESOLVE_COMMIT_MODE=$(rget commitMode new)             # new | amend | ask
RESOLVE_USE_COMMIT_CONFIG=$(rget useCommitConfig true) # true | false
RESOLVE_REPLY=$(rget replyToComments true)             # true | false
RESOLVE_REPLY_LANG=$(rget replyLanguage en)            # en | fr | ...
RESOLVE_REPLY_VERBOSITY=$(rget replyVerbosity minimal) # minimal | normal | detailed
RESOLVE_AUTO_REREQUEST=$(rget autoReRequestReview true)

# Format/style: inherit from commit config when useCommitConfig is true.
if [ "$RESOLVE_USE_COMMIT_CONFIG" = "true" ]; then
  RESOLVE_FORMAT=$(cget format angular)
  RESOLVE_STYLE=$(cget style single-line)
else
  RESOLVE_FORMAT=$(rget format "$(cget format angular)")
  RESOLVE_STYLE=$(rget style "$(cget style single-line)")
fi

# Shell state does NOT persist across Bash invocations in the Claude Code
# harness, so echo every resolved value: this is what lets the model capture
# them into context for Steps 5.5, 6, 7 and 7.5. Do not skip these echoes.
echo "REPO_KEY=$REPO_KEY"
echo "RESOLVE_COMMIT_MODE=$RESOLVE_COMMIT_MODE"
echo "RESOLVE_USE_COMMIT_CONFIG=$RESOLVE_USE_COMMIT_CONFIG"
echo "RESOLVE_FORMAT=$RESOLVE_FORMAT"
echo "RESOLVE_STYLE=$RESOLVE_STYLE"
echo "RESOLVE_REPLY=$RESOLVE_REPLY"
echo "RESOLVE_REPLY_LANG=$RESOLVE_REPLY_LANG"
echo "RESOLVE_REPLY_VERBOSITY=$RESOLVE_REPLY_VERBOSITY"
echo "RESOLVE_AUTO_REREQUEST=$RESOLVE_AUTO_REREQUEST"
```

> **Important**: The `echo` lines above are functionally required, not cosmetic. Because each Bash call runs in a fresh shell, the variable assignments are gone by the next step — the model must read the echoed values from this step's output and carry them forward. Downstream steps reference these captured values (e.g. "the pinned `$RESOLVE_COMMIT_MODE`"), not a live shell variable.

| Variable | Config path | Default |
| -------- | ----------- | ------- |
| `$RESOLVE_COMMIT_MODE` | `.repositories.<name>.resolve.commitMode` | `"new"` |
| `$RESOLVE_USE_COMMIT_CONFIG` | `.repositories.<name>.resolve.useCommitConfig` | `true` |
| `$RESOLVE_FORMAT` | `resolve.format` (or `commit.format` if `useCommitConfig`) | `"angular"` |
| `$RESOLVE_STYLE` | `resolve.style` (or `commit.style` if `useCommitConfig`) | `"single-line"` |
| `$RESOLVE_REPLY` | `.repositories.<name>.resolve.replyToComments` | `true` |
| `$RESOLVE_REPLY_LANG` | `.repositories.<name>.resolve.replyLanguage` | `"en"` |
| `$RESOLVE_REPLY_VERBOSITY` | `.repositories.<name>.resolve.replyVerbosity` | `"minimal"` |
| `$RESOLVE_AUTO_REREQUEST` | `.repositories.<name>.resolve.autoReRequestReview` | `true` |
