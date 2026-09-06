#!/usr/bin/env sh
set -e

# Install/sync npm dependencies (idempotent; node_modules is an anonymous volume).
npm install --no-audit --no-fund

# Link this clone to its Base44 app by writing the gitignored base44/.app.jsonc pointer.
# `base44 dev` refuses --app-id / BASE44_APP_ID, so the link file is the only way to
# provide the app id — capture it, write the file, then drop the env var.
APP_ID="$BASE44_APP_ID"
if [ -n "$APP_ID" ]; then
  mkdir -p base44
  cat > base44/.app.jsonc <<EOF
// Base44 App Configuration
// This file links your local project to your Base44 app.
// Do not commit this file to version control.
{
  "id": "$APP_ID"
}
EOF
fi
unset BASE44_APP_ID

# Start the local Deno backend + Vite frontend together (orchestrated by the CLI).
exec base44 dev
