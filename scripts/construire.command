#!/bin/zsh
# Lint, typecheck et build de production, depuis le Finder. Journal : .e2e-logs/construction.log
cd "${0:A:h}/.." || exit 1
mkdir -p .e2e-logs
{
  echo "=== début $(date '+%H:%M:%S') ==="
  npm run lint && npm run typecheck && NEXT_DIST_DIR=.next-build npm run build
  echo "=== code de sortie : $? ==="
  echo "TERMINÉ"
} > .e2e-logs/construction.log 2>&1
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose name contains "'"${0:t}"'")' >/dev/null 2>&1) &
