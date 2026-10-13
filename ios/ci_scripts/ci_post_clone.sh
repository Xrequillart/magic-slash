#!/bin/sh
# Xcode Cloud runs this right after cloning (it must sit next to MagicSlash.xcodeproj).
#
# Secrets.xcconfig is git-ignored, so a cloud build would ship the "Not configured"
# screen. Write it from the workflow's environment variables instead
# (App Store Connect > Xcode Cloud > workflow > Environment):
#
#   SUPABASE_HOST      project host, without https://
#   SUPABASE_ANON_KEY  the project's public anon key
#
# DEVELOPMENT_TEAM stays empty: Xcode Cloud signs with the team that owns the app.
set -eu

if [ -z "${SUPABASE_HOST:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  # An archive goes to TestFlight: never let one out without a backend.
  if [ "${CI_XCODEBUILD_ACTION:-}" = "archive" ]; then
    echo "error: SUPABASE_HOST and SUPABASE_ANON_KEY must be set in the Xcode Cloud workflow" >&2
    exit 1
  fi
  echo "warning: no Supabase settings, the app will show its Not configured screen"
  exit 0
fi

cat > "$CI_PRIMARY_REPOSITORY_PATH/ios/Config/Secrets.xcconfig" <<XCCONFIG
SUPABASE_HOST = $SUPABASE_HOST
SUPABASE_ANON_KEY = $SUPABASE_ANON_KEY
XCCONFIG
echo "Wrote ios/Config/Secrets.xcconfig for $SUPABASE_HOST"
