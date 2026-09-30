#!/bin/zsh
# Retire les témoignages d'une base (dev, preprod ou prod), depuis le Finder.
# Lit `.e2e-logs/temoignages.txt` : « dev », « preprod » ou « prod ».
# Journal : `.e2e-logs/temoignages.log`.
cd "${0:A:h}/.." || exit 1
mkdir -p .e2e-logs
CIBLE="$(cat .e2e-logs/temoignages.txt 2>/dev/null)"
{
  echo "=== début $(date '+%H:%M:%S') — cible : $CIBLE ==="
  CIBLE="$CIBLE" npx tsx src/server/db/retirer-temoignages.ts
  echo "=== code de sortie : $? ==="
  echo "TERMINÉ"
} > .e2e-logs/temoignages.log 2>&1
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose name contains "'"${0:t}"'")' >/dev/null 2>&1) &
