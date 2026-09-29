# Changes preview

Detail of Step 5.5 of `/magic:resolve`: the display labels for `MSG_CHANGES_PREVIEW` and the inputs the preview accepts.

## Commit mode label and action label

Before displaying the message, compute two display strings based on the effective `commitMode` value:

| effective `commitMode` | `{commit_mode_label}` | `{commit_mode_action}` |
| ---------------------- | --------------------- | ---------------------- |
| `"new"` | `new commit` | `create a new commit (fix: address review feedback)` |
| `"amend"` | `amend last commit` | `amend the last commit (git commit --amend --no-edit)` |

> When `$RESOLVE_COMMIT_MODE` is `"ask"`, resolve the choice **before** computing these labels so the preview reflects the mode the user just picked.

## Handle user response

The `Y`/`O` key confirms using the effective commit mode. The user may also type `amend` or `new` to override the mode for this run only (without modifying the config file).

| Input | Action |
| ----- | ------ |
| `Y` / `O` | Proceed to Step 5.9 using the effective `commitMode` |
| `amend` | Override: set effective `commitMode = "amend"` for this run, proceed to Step 5.9 |
| `new` | Override: set effective `commitMode = "new"` for this run, proceed to Step 5.9 |
| `diff` | Display the full `git diff` output and ask again |
| `n` | Abort the resolve, discard changes with `git checkout -- .` and stop |

> **Note**: `amend` and `new` are only offered as override options when they differ from the effective mode. If the effective mode is already `"amend"`, typing `amend` is equivalent to `Y`. When `$RESOLVE_COMMIT_MODE` is `"ask"`, the mandatory choice already happened above, so this table just lets the user switch their pick before confirming.
