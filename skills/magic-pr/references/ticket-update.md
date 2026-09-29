# Ticket update

The MCP calls behind Step 7.1 (Jira) and Step 7.2 (GitHub issues) of `/magic:pr`. Step 7.0 has
already decided which of the two runs: when `integrations.atlassian` is `false`, Step 7.1 is
skipped entirely. In multi-repo mode, the ticket is updated only once, at the end, with links to
all created PRs.

## Step 7.1: Jira tickets (pattern `[A-Z]+-\d+`)

If a Jira ticket ID is found, use the MCP Atlassian tools:

Note: If you don't know the `cloudId`, first use `mcp__atlassian__getAccessibleAtlassianResources` to obtain it.

1. **Retrieve available transitions** with `mcp__atlassian__getTransitionsForJiraIssue`
2. **Change the status** to "To be reviewed" (or equivalent) with `mcp__atlassian__transitionJiraIssue`
   - If the "To be reviewed" status doesn't exist, try: "In Review", "Code Review", "Review"
3. **Add a comment** with the PR link via `mcp__atlassian__addCommentToJiraIssue`
   (unless `commentOnPR` is `false`)
   - Use **`MSG_JIRA_COMMENT`** for the comment body

## Step 7.2: GitHub issues (numeric pattern `#\d+`)

If a GitHub issue ID is found:

1. **Add a comment** on the issue with the PR link via `mcp__github__add_issue_comment`
   (unless `commentOnPR` is `false`)
   - Use **`MSG_GITHUB_ISSUE_COMMENT`** for the comment body
2. **Update labels** (optional): If the issue has a "todo" or "in progress" label, update it to "in review" if that label exists via `mcp__github__issue_write` with `method: "update"` — read the current labels first (`mcp__github__issue_read`, `method: "get_labels"`) and pass the **whole** set, because `labels` replaces the list rather than appending to it

> Note: The `closes #123` keyword in the PR description (from Step 6.1) will automatically close the issue when the PR is merged. No need to close it manually here.
