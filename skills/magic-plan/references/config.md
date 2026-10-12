# Configuration reads

The two reads Step 0 makes from Magic Slash Desktop, and the reasoning behind Step 0.2's language
chains. Read §1 in Step 0.1 and §3 in Step 0.5, and run their blocks: both happen on every run.
Read §2 only when a language chain's result is in doubt, or before changing how Step 0.2 resolves
one.

## 1. The live config (Step 0.1)

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
[ -z "$CONFIG_FILE" ] && echo "APP_NOT_RUNNING" || echo "OK"
```

## 2. The language chains (Step 0.2)

"The order above" is the order of the table in SKILL.md Step 0.2.

The ticket and spec languages are **fallback chains**, not defaulted fields: neither
`languages.ticket` nor `languages.spec` exists in the config defaults, because materialising `en`
there would pin every existing repository to English and make the chain unreachable. Resolve each at
read time, in the order above, and take the first non-empty value. Treat an empty string as unset —
the config is a jsonb blob written wholesale, so `''` does arrive.

Note the spec chains onto the **resolved** ticket language, not onto `jiraComment`: a repository that
set only `languages.ticket` must carry that value through to its spec.

A French-speaking developer who files English tickets for an international team is the normal case
here, not an edge case. Talking in one language and writing in another is expected behaviour — do
not "helpfully" align them.

## 3. The Atlassian integration (Step 0.5)

```bash
# Every bash block runs in its own shell: $MS_PORT does not survive from Step 0.1,
# so resolve it again here. One line, and it costs nothing to repeat.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
curl -sf --max-time 5 "http://127.0.0.1:$MS_PORT/config" | jq -r '.integrations.atlassian // true'
```
