#!/bin/zsh
#
# Pousse une branche vers GitHub — et donc déclenche son déploiement
# Netlify. Même principe que `lancer-les-tests.command` : un double-clic,
# aucune frappe, et la sortie va dans un journal que l'assistant relit.
#
# La branche visée est lue dans `.e2e-logs/branche.txt` ; à défaut, la
# branche courante. Rien d'autre n'est fait ici : ni fusion, ni migration
# (c'est le build Netlify qui migre, voir netlify.toml).

cd "${0:A:h}/.." || exit 1

mkdir -p .e2e-logs
JOURNAL=".e2e-logs/deploiement.log"

BRANCHE="$(cat .e2e-logs/branche.txt 2>/dev/null)"
[[ -z "$BRANCHE" ]] && BRANCHE="$(git branch --show-current)"

{
  echo "=== début $(date '+%H:%M:%S') ==="
  echo "=== branche : $BRANCHE ==="
  echo

  git push origin "$BRANCHE"
  CODE=$?

  echo
  echo "=== code de sortie : $CODE ==="
  echo "=== fin $(date '+%H:%M:%S') ==="
  echo "TERMINÉ"
} > "$JOURNAL" 2>&1

echo
echo "Terminé. Vous pouvez fermer cette fenêtre."
