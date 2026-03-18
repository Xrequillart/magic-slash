# API Reference — Magic Slash Desktop

These endpoints update the Magic Slash Desktop UI. They are silent (`|| true`) and never block the workflow. Only available when `$MAGIC_SLASH_PORT` and `$MAGIC_SLASH_TERMINAL_ID` are set.

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
