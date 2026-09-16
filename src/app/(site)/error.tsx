'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { LogoMark } from '@/components/site/Logo'

/**
 * Écran d'erreur du site public — même geste que la 404 : ivoire, serif,
 * beaucoup d'air. Il s'affiche dans le chrome du site (en-tête et pied de
 * page restent) quand le rendu d'une page échoue ; une erreur du layout
 * lui-même remonte à `app/global-error.tsx`.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[site] erreur de rendu', error)
  }, [error])

  return (
    <div className="grain flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-12 w-12 text-stone" />

      <p className="label-eyebrow mt-12 text-stone">Erreur</p>

      <h1 className="mt-7 max-w-[16ch] text-[clamp(2.2rem,5vw,4rem)] leading-[1.08]">
        Quelque chose s’est <em className="italic">interrompu</em>.
      </h1>

      <p className="mt-7 max-w-[42ch] leading-[1.7] text-ink-soft">
        Cette page n’a pas pu s’afficher. Vous pouvez réessayer, ou revenir à
        l’accueil.
      </p>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-3 rounded-[2px] border border-ink bg-ink px-7 py-4 text-[0.8rem] uppercase tracking-[0.14em] text-ivory transition-colors duration-500 hover:bg-transparent hover:text-ink"
        >
          Réessayer
        </button>

        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-[2px] border border-line px-7 py-4 text-[0.8rem] uppercase tracking-[0.14em] text-ink transition-colors duration-500 hover:border-ink hover:bg-ink hover:text-ivory"
        >
          Retour à l’accueil
          <span
            aria-hidden="true"
            className="transition-transform duration-500 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>
    </div>
  )
}
