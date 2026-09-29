#!/bin/zsh
#
# Applique les migrations à la base pointée par `.env.local` — celle de
# développement. Double-clic, rien à taper ; la sortie va dans
# `.e2e-logs/migration.log`.
#
# Normalement inutile : `npm run dev` migre tout seul depuis que
# `predev` existe. Reste utile après un `git pull` pour remettre la base
# à niveau sans démarrer le serveur.

cd "${0:A:h}/.." || exit 1
mkdir -p .e2e-logs

{
  echo "=== début $(date '+%H:%M:%S') ==="
  npx tsx src/server/db/migrate.ts
  echo "=== code de sortie : $? ==="
  echo "TERMINÉ"
} > .e2e-logs/migration.log 2>&1

# Ferme la fenêtre de Terminal ouverte par le double-clic. Sans cela,
# chaque lancement en laissait une de plus — seize se sont empilées en
# une journée. Lancé en arrière-plan, pour que le script puisse se
# terminer avant que la fenêtre ne disparaisse.
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose name contains "'"${0:t}"'")' >/dev/null 2>&1) &
