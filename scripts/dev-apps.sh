#!/usr/bin/env bash
# Runs the router at http://localhost:3000 plus the apps you name, linked like polymadlabs.com.
#   pnpm dev:apps                    every app, the pass and the landing page (about 5.5 GB of memory)
#   pnpm dev:apps focus breathwork   only these two (about 0.8 GB each, plus 0.4 GB for the router)
# Names: personality focus breathwork attention intention pass landing.
# An app you did not start answers with an error page through the router. Ctrl+C stops everything.
set -euo pipefail
cd "$(dirname "$0")/.."

all=(personality focus breathwork attention intention pass landing)
apps=("$@")
[ ${#apps[@]} -eq 0 ] && apps=("${all[@]}")

filters=(--filter @micro/router)
for app in "${apps[@]}"; do
  if [[ ! " ${all[*]} " =~ " ${app} " ]]; then
    echo "Unknown app: ${app}. Use: ${all[*]}" >&2
    exit 1
  fi
  filters+=(--filter "@micro/${app}")
  # Local databases are made or updated before the app starts. The landing page has none.
  [ "${app}" != landing ] && pnpm --filter "@micro/${app}" db:migrate < /dev/null > /dev/null
done

echo "Starting: router ${apps[*]}. Open http://localhost:3000/"
exec pnpm -r --parallel "${filters[@]}" dev
