#!/usr/bin/env sh
set -e

# Install/sync npm dependencies (idempotent; node_modules is an anonymous volume).
npm install --no-audit --no-fund

# Link this clone to its Base44 app by writing the gitignored base44/.app.jsonc pointer.
# `base44 dev` refuses --app-id, so the link file is the only way to provide the app id.
if [ -n "$BASE44_APP_ID" ]; then
  mkdir -p base44
  cat > base44/.app.jsonc <<EOF
// Base44 App Configuration
// This file links your local project to your Base44 app.
// Do not commit this file to version control.
{
  "id": "$BASE44_APP_ID"
}
EOF
fi

# Start the local Deno backend + Vite frontend together (orchestrated by the CLI).
exec base44 dev
