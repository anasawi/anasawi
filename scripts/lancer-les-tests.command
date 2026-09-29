#!/bin/zsh
#
# Lance la suite de bout en bout depuis le Finder, sans rien taper.
#
# Pourquoi ce fichier existe : l'assistant travaille dans un environnement
# Linux isolé et sans réseau. Il peut lire et écrire les fichiers du
# projet, et faire tourner ce qui est du JavaScript pur (TypeScript,
# ESLint), mais pas Playwright : il faudrait un vrai navigateur, les
# binaires macOS du projet, et l'accès à la base Neon. Tout cela n'existe
# que sur cette machine.
#
# Un double-clic suffit donc à déclencher la série ; la sortie est écrite
# dans `.e2e-logs/sortie.log`, que l'assistant relit ensuite directement.
#
# Le fichier `.e2e-logs/cible.txt`, s'il existe, limite la série à
# certains fichiers — sinon tout est joué.

cd "${0:A:h}/.." || exit 1

mkdir -p .e2e-logs
JOURNAL=".e2e-logs/sortie.log"

CIBLE=""
[[ -f .e2e-logs/cible.txt ]] && CIBLE="$(cat .e2e-logs/cible.txt)"

{
  echo "=== début $(date '+%H:%M:%S') ==="
  [[ -n "$CIBLE" ]] && echo "=== cible : $CIBLE ===" || echo "=== série complète ==="
  echo

  # `${=CIBLE}` : découpage en mots par zsh, pour passer plusieurs chemins.
  npx playwright test ${=CIBLE}
  CODE=$?

  echo
  echo "=== code de sortie : $CODE ==="
  echo "=== fin $(date '+%H:%M:%S') ==="
  echo "TERMINÉ"
} > "$JOURNAL" 2>&1

# Ferme la fenêtre de Terminal ouverte par le double-clic. Sans cela,
# chaque lancement en laissait une de plus — seize se sont empilées en
# une journée. Lancé en arrière-plan, pour que le script puisse se
# terminer avant que la fenêtre ne disparaisse.
(sleep 1; osascript -e 'tell application "Terminal" to close (every window whose name contains "'"${0:t}"'")' >/dev/null 2>&1) &
