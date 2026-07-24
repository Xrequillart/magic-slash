# API Reference — Magic Slash Desktop

These endpoints talk to the Magic Slash Desktop over `http://127.0.0.1:$MAGIC_SLASH_PORT`. The
**write** endpoints update the UI, are silent (`|| true`) and never block the workflow. The
**read** endpoints let a skill fetch the live config/metadata the app holds — the Supabase cloud
store is the source of truth, so these return fresher data than the local `~/.config/magic-slash/config.json`
(which the app no longer keeps in sync). All endpoints require `$MAGIC_SLASH_PORT`; the read
endpoints keyed to a terminal also need `$MAGIC_SLASH_TERMINAL_ID`.

## Read endpoints

### `GET /config`

Returns the current config as JSON (repositories, integrations, languages, …), served from the
app's in-memory cache hydrated from the cloud. Skills prefer this over reading the local file, and
fall back to `~/.config/magic-slash/config.json` when the app is not running (`$MAGIC_SLASH_PORT`
unset) or the response has no repositories.

```bash
curl -sf "http://127.0.0.1:$MAGIC_SLASH_PORT/config"
```

### `GET /agent?id=<terminalId>`

Returns the agent/task metadata (title, ticketId, description, status, baseBranch, branchName,
repositories, prUrl, …) for the given terminal, or `null` if unknown. `id` is `$MAGIC_SLASH_TERMINAL_ID`.

```bash
curl -sf "http://127.0.0.1:$MAGIC_SLASH_PORT/agent?id=$MAGIC_SLASH_TERMINAL_ID"
```

## Write endpoints

These endpoints update the Magic Slash Desktop UI / cloud store. They are silent (`|| true`) and never block the workflow. All require `$MAGIC_SLASH_PORT`; the terminal-scoped ones (`/metadata`, `/repositories`) additionally require `$MAGIC_SLASH_TERMINAL_ID`, while `/config/worktree-files` is keyed on `repo=` and needs only the port.

### `GET /config/worktree-files?repo=<name>&files=<json array>`

Persists a repository's `worktreeFiles` to the cloud store. `repo` and `files` (a URL-encoded JSON
array of strings) are required. Replaces the legacy `jq`-into-local-file write when the app is running.

```bash
curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/config/worktree-files?repo=api&files=%5B%22.env%22%5D"
```

## Endpoint `/metadata`

Updates the agent metadata in the sidebar.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Terminal ID (`$MAGIC_SLASH_TERMINAL_ID`) |
| `title` | string | No | Sidebar title (URL-encoded) |
| `ticketId` | string | No | Ticket ID (e.g.: `PROJ-123`, `#456`) |
| `description` | string | No | Short description (URL-encoded) |
| `status` | string | No | `"in progress"`, `"committed"`, `"PR created"` |
| `baseBranch` | string | No | Dev branch (e.g.: `main`, `develop`) |
| `fullStackTaskId` | string | No | Links multiple worktrees |
| `relatedWorktrees` | JSON array | No | Absolute paths (URL-encoded) |
| `prUrl` | string | No | Created PR URL |
| `prRepo` | string | No | PR repo path |

**Example**:
```bash
curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=PROJ-123%3A%20Add%20login&status=in%20progress"
```

## Endpoint `/repositories`

Attaches repositories to the agent for grouping in the sidebar.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Terminal ID (`$MAGIC_SLASH_TERMINAL_ID`) |
| `repos` | JSON array | Yes | Absolute repo paths (URL-encoded) |

**Example**:
```bash
curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=%5B%22%2Fpath%2Fto%2Frepo%22%5D"
```
