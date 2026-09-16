'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Écran d'erreur de l'administration.
 *
 * Attrape toute erreur levée au rendu d'un écran `/admin/*` (Neon
 * injoignable, requête en échec…) et la montre DANS le shell du CMS — le
 * rail et la palette restent en place, en français, avec un bouton pour
 * retenter le rendu du segment (`reset()`).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    /* En production, Next masque le message aux clients ; le détail reste
       dans les journaux serveur. Ici, on garde une trace côté navigateur. */
    console.error('[admin] erreur de rendu', error)
  }, [error])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ivory">
      <div className="mx-auto max-w-[600px] px-8 py-11 pb-24">
        <h1 className="font-serif text-2xl font-normal leading-tight tracking-[-0.01em]">
          Une erreur est survenue
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Cet écran n’a pas pu être affiché. Vos données n’ont pas été
          perdues.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <p className="text-[13px] leading-[1.6]">
            Il peut s’agir d’un incident passager (connexion à la base de
            données, réseau). Réessayez ; si le problème persiste, revenez au
            tableau de bord.
          </p>
          {error.digest && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Référence : <code>{error.digest}</code>
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-[13px] text-ivory transition-colors hover:bg-foreground/90"
            >
              Réessayer
            </button>
            <Link
              href="/admin"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-4 text-[13px] transition-colors hover:bg-ivory"
            >
              Tableau de bord
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
