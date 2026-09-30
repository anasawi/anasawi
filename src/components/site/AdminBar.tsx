'use client'

import { useEffect, useState } from 'react'

import { AdminPill, PencilIcon } from './AdminPill'

/**
 * Barre flottante du site public, réservée à l'administrateur connecté.
 *
 * Le statut est vérifié après hydratation plutôt qu'au rendu serveur : lire la
 * session dans le layout créerait une dépendance aux cookies et basculerait
 * toutes les pages publiques en rendu dynamique (voir `/api/admin-bar`).
 * La barre n'est pas du contenu, seulement un raccourci d'édition — l'afficher
 * un instant plus tard ne coûte rien, dégrader le rendu statique si.
 */
export function AdminBar() {
  const [state, setState] = useState<{ admin: boolean; name?: string; email?: string } | null>(
    null,
  )
  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/admin-bar', {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { admin: false }))
      .then((data: { admin: boolean; name?: string; email?: string }) => setState(data))
      .catch(() => {
        /* Hors ligne ou requête annulée : on n'affiche simplement rien. */
      })

    return () => controller.abort()
  }, [])

  if (!state?.admin) return null

  return (
    <AdminPill
      status="Aperçu"
      actionLabel="Modifier"
      /* Le site est une page unique : l'éditeur, c'est toujours celui de
         l'accueil. */
      actionHref="/admin/accueil"
      icon={<PencilIcon />}
      name={state.name ?? 'Admin'}
      email={state.email}
      /* Remontée sur mobile pour ne pas recouvrir la barre
         « Prendre rendez-vous », qui occupe déjà le bas de l'écran. */
      className="bottom-24 lg:bottom-7"
    />
  )
}
