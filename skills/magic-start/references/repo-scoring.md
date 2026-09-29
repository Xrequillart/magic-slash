# Repo relevance scoring

Read by `SKILL.md` Steps 3.2 and 3.3, only when more than one repo is configured (a single repo skips scoring).

## 3.2: Extract ticket information

**Jira**: labels, components, title, description.
**GitHub**: labels, title, description.

Custom-field text discovered in Step 2A folds into the `description` source and scores **+2 once**, not +2 per field. Eight discovered fields would otherwise outweigh a +10 label match and silently change which repo gets selected.

## 3.3: Calculate relevance score for each repo

For each configured repo, calculate a score based on its keywords. **All matching is case-insensitive** and supports common variants (with/without hyphens, e.g. "backend" matches "back-end"):

| Match source | Points |
| --- | --- |
| Jira label/component or GitHub label matching a keyword | +10 |
| Keyword found in title | +5 |
| Keyword found in description | +2 |

**Example**: Ticket "Add an API endpoint for users", labels: ["backend"]
- api (keywords: ["backend", "api", "server"]) → 10 (label "backend") + 5 (title "API") = **15**
- web (keywords: ["frontend", "ui", "react"]) → **0**
