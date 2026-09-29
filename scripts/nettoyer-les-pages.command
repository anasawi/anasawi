#!/bin/zsh
#
# Supprime les pages secondaires de la base pointée par `.env.local`
# (celle de développement). Le site est une page unique : l'accueil est
# le seul à rester. Double-clic, rien à taper ; la sortie va dans
# `.e2e-logs/nettoyage-pages.log`.

cd "${0:A:h}/.." || exit 1
mkdir -p .e2e-logs

{
  echo "=== début $(date '+%H:%M:%S') ==="
  npx tsx src/server/db/prune-pages.ts
  echo "=== code de sortie : $? ==="
  echo "TERMINÉ"
} > .e2e-logs/nettoyage-pages.log 2>&1

(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose name contains "'"${0:t}"'")' >/dev/null 2>&1) &
