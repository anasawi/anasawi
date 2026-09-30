#!/bin/zsh
#
# Copie le contenu de la base de développement vers la préprod ou la prod,
# depuis le Finder. Lit `.e2e-logs/copie.txt` : « preprod », « prod »,
# éventuellement suivi de « blanc » pour une répétition sans écriture.
# Journal : `.e2e-logs/copie.log`.

cd "${0:A:h}/.." || exit 1
mkdir -p .e2e-logs
read -r CIBLE MODE < .e2e-logs/copie.txt
{
  echo "=== début $(date '+%H:%M:%S') — cible : $CIBLE ${MODE:-} ==="
  if [[ "$MODE" == "blanc" ]]; then
    CIBLE="$CIBLE" A_BLANC=1 npx tsx src/server/db/copier-contenu.ts
  else
    CIBLE="$CIBLE" npx tsx src/server/db/copier-contenu.ts
  fi
  echo "=== code de sortie : $? ==="
  echo "TERMINÉ"
} > .e2e-logs/copie.log 2>&1
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose name contains "'"${0:t}"'")' >/dev/null 2>&1) &
