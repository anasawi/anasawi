'use client'

import { useEffect, useState } from 'react'

import { AdminPill, PencilIcon } from './AdminPill'

/**
 * Cookie-témoin, lisible par le script : posé (valeur `1`) à la
 * connexion, retiré à la déconnexion. Il ne prouve rien — la session
 * reste vérifiée par `/api/admin-bar` — il dit seulement qu'il VAUT LA
 * PEINE de demander. Tant qu'il n'est pas posé côté serveur, la
 * vérification part quand même, mais une fois la page au repos.
 */
const ADMIN_HINT_COOKIE = 'anasawi_admin'

function porteLeTemoin(): boolean {
  return document.cookie
    .split(';')
    .some((c) => c.trim() === `${ADMIN_HINT_COOKIE}=1`)
}

/**
 * Barre flottante du site public, réservée à l'administrateur connecté.
 *
 * Le statut est vérifié après hydratation plutôt qu'au rendu serveur : lire la
 * session dans le layout créerait une dépendance aux cookies et basculerait
 * toutes les pages publiques en rendu dynamique (voir `/api/admin-bar`).
 * La barre n'est pas du contenu, seulement un raccourci d'édition — l'afficher
 * un instant plus tard ne coûte rien, dégrader le rendu statique si.
 *
 * Chaque visiteur payait pourtant cette requête, dès l'hydratation, pour
 * une réponse « non » dans 99 % des cas. Avec le cookie-témoin, on
 * demande tout de suite ; sans lui, on attend que le navigateur n'ait
 * plus rien de mieux à faire (`requestIdleCallback`) — la barre arrive
 * un peu plus tard pour Anne quand le témoin manque, jamais avant le
 * contenu pour un visiteur.
 */
export function AdminBar() {
  const [state, setState] = useState<{ admin: boolean; name?: string; email?: string } | null>(
    null,
  )
  useEffect(() => {
    const controller = new AbortController()
    let annuler: () => void = () => undefined

    const verifier = () => {
      fetch('/api/admin-bar', {
        credentials: 'same-origin',
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { admin: false }))
        .then((data: { admin: boolean; name?: string; email?: string }) => setState(data))
        .catch(() => {
          /* Hors ligne ou requête annulée : on n'affiche simplement rien. */
        })
    }

    if (porteLeTemoin()) {
      verifier()
    } else if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(verifier, { timeout: 3000 })
      annuler = () => window.cancelIdleCallback(id)
    } else {
      /* Safari n'a pas `requestIdleCallback` : un délai court fait le
         même office, après le premier écran. */
      const id = window.setTimeout(verifier, 1500)
      annuler = () => window.clearTimeout(id)
    }

    return () => {
      annuler()
      controller.abort()
    }
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
