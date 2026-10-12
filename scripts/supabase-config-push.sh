#!/usr/bin/env bash
#
# Push supabase/config.toml to the linked project, with an explicit env file.
#
# WHY THIS EXISTS rather than a line in the README saying "run supabase config
# push". The CLI auto-loads `supabase/.env`, which holds the LOCAL values — so a
# bare `supabase config push` sets the production Site URL to
# http://127.0.0.1:3000 and breaks every auth email in the wild. It is one
# command, it looks harmless, and it is not reversible from here.
#
# So the env file is a required argument. There is no default: a default is the
# thing that gets used by accident.
set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "usage: npm run supabase:config:push -- <env-file>" >&2
  echo "   eg: npm run supabase:config:push -- supabase/.env.production" >&2
  echo >&2
  echo "Refusing to push without one: the CLI would fall back to supabase/.env," >&2
  echo "which holds this machine's localhost values." >&2
  exit 2
fi
if [ ! -f "$FILE" ]; then
  echo "no such env file: $FILE" >&2
  echo "copy supabase/.env.production.example and fill it in." >&2
  exit 2
fi

echo "Pushing supabase/config.toml with values from $FILE"
echo "Target project: $(cat supabase/.temp/project-ref 2>/dev/null || echo 'the linked project')"
grep -v '^[[:space:]]*#' "$FILE" | grep -v '^[[:space:]]*$' | sed 's/=.*/=…/' | sed 's/^/  /'
read -r -p "Continue? [y/N] " reply
[ "$reply" = "y" ] || { echo "aborted."; exit 1; }

# `set -a` exports every assignment, which is what makes these override the
# CLI's own reading of supabase/.env.
set -a
# shellcheck disable=SC1090
. "$FILE"
set +a
exec supabase config push
