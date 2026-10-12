# Re-requesting review

Detail of Step 7.5 of `/magic:resolve`. Read it only when `$RESOLVE_AUTO_REREQUEST` is `true` and `$GH_AVAILABLE` is `true`.

## Identify reviewers

Use the reviewer usernames stored in Step 3 (from `CHANGES_REQUESTED` reviews). These are the reviewers who need to re-review the fixes.

## Re-request via `gh api`

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers -f "reviewers[]={reviewer_login}" -X POST
```

If multiple reviewers requested changes, include all of them in a single API call:

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers --input - <<EOF
{"reviewers": ["{reviewer1}", "{reviewer2}"]}
EOF
```

## Retry and fallback

For each `gh api` call, if it fails with a transient error (HTTP 5xx, network timeout, rate limit 429):
- **Retry up to 2 times** with a 2-second pause between attempts
- If all retries fail, log a warning and add "manual re-request needed" to the Step 9 summary

> **Note**: If `gh` CLI is not available, skip this step and add "Request re-review manually" to the Step 9 next steps.
