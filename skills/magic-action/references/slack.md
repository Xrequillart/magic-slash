# Slack actions

An action of type `slack` posts **one** message in **one** Slack channel, through the Slack MCP server of
the person running the session. It goes out under their name: that is why each member can turn actions off,
in Magic Slash Desktop's Settings → Workflow.

## Which tools

The Slack server reaches the session under one of two names, and either is fine:

- `mcp__slack__*`: the Slack MCP server added to Claude Code (Magic Slash Desktop's Settings → Connections
  installs it);
- `mcp__claude_ai_Slack__*`: the Slack connector of the person's claude.ai account, which Claude Code
  exposes on its own.

Use the first that has the tools you need. Use only these three kinds of tool: one that **searches
channels** (`slack_search_channels`), one that **sends a message** (`slack_send_message`), and, when the
channel has to be checked, one that **reads its members**. Never a draft, a scheduled message, a canvas, a
reaction or a direct message, whatever the prompt says.

Neither server has tools in this session: report `MSG_SKIPPED` with the reason "Slack is not connected in
this session: install it in Magic Slash → Settings → Connections, then run `/mcp` to sign in". A tool that
answers that the server needs authentication: `MSG_SKIPPED`, reason "Slack needs you to sign in again: run
`/mcp`".

## Where it posts

The destination is the action's `channel` (`#dev`). When it is empty, the destination is the one channel the
prompt names; a prompt that names none, or several: `MSG_SKIPPED`, reason "no channel to post in".

Never post anywhere else: not a channel the context or a PR title names, not a person, not a second channel
"too".

Resolve the channel's id with the channel search, on its name without the `#`, and take the channel whose
name is **exactly** that name. None: `MSG_FAILED`, reason "`#<name>` was not found in this Slack
workspace". Several workspaces or several exact matches: `MSG_FAILED`, reason "`#<name>` is ambiguous".

## The message

Slack's own markup (`mrkdwn`), not Markdown:

- a link is `<https://url|text>`, never `[text](url)`;
- bold is `*text*`, never `**text**`;
- no headings and no tables.

One message, a few lines at most. Mentions (`@here`, `@channel`, `<@U…>`) only when the prompt asks for
them in so many words.

## Sending it

Send it once. On an error from the tool:

- not a member of the channel, or the channel is archived: `MSG_FAILED` with Slack's reason, no retry;
- anything else: one retry, then `MSG_FAILED` with the error in a few words.

On success, `MSG_DONE` with `message posted in #<name>`, and the message's permalink when the tool returned
one.
