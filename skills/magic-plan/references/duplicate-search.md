# Duplicate search

Read this file in Step 3.3, and only when `plan.duplicateCheck` is `true`. It owns the search call
per tracker, the Jira query shape, and what to display and write into the spec's
`## Related tickets` for each outcome. The tracker is the one **carried** from Step 2.3, never
re-derived.

## 1. The call, per tracker

| Tracker | Call | Scope |
| --- | --- | --- |
| GitHub | `mcp__github__search_issues` | the `owner/repo` carried from Step 2.3 |
| Jira | `mcp__atlassian__searchJiraIssuesUsingJql` | the carried Jira project, on the carried `cloudId` |

The Jira call takes the same `{"jql": …, "fields": [...]}` shape `/magic:start` uses, scoped to the
project and asking only for `summary`, `status` and `issuetype`:
`project = PROJ AND text ~ "rate limit" ORDER BY updated DESC`. No status clause — `text ~` already
spans open and closed issues, and filtering on status would drop exactly the closed ticket worth
finding. Report the issue key (`PROJ-123`), not a `#number`.

## 2. The outcomes

- **Matches found** → display `MSG_DUPLICATES_FOUND` and ask. Every entry states *why* it looked
  related; an unexplained list is noise the user has to re-investigate. Write the list into the
  spec's `## Related tickets` whatever the answer is.
- **Nothing found** → display `MSG_NO_DUPLICATES`, with `{searched_scope}` = the Scope cell above,
  and write `None found` into that section.
- **Search fails twice** → display `MSG_TRACKER_ERROR` — `{tracker}` = the tracker that did not
  answer, `{operation}` = `duplicate search` — and continue with `Not checked` in the spec.
  A failed duplicate check degrades the run; it does not end it. But `Not checked` and `None found`
  are different facts and must never read the same.
