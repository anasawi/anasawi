/**
 * Entrée d'historique du constructeur (⌘Z / ⌘⇧Z).
 *
 * Chaque action enregistre sa propre inversion sous forme de fermetures :
 * l'historique ne connaît ni les types de blocs ni les actions serveur.
 *
 * Les fonctions renvoient `true` en cas de succès — l'échec (session
 * expirée, conflit) retire l'entrée plutôt que de laisser un historique
 * mensonger.
 */
export type HistoryEntry = {
  label: string
  undo: () => Promise<boolean>
  redo: () => Promise<boolean>
  /** Vrai si l'aperçu se met à jour sans rechargement (placement live). */
  live?: boolean
}
