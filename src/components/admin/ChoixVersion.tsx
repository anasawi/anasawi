'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { cn } from '@/lib/utils'
import { retenirVersion, type VersionSite } from '@/lib/version-admin'

/**
 * Le choix de la version du site (moderne / classique), là où l'on n'est
 * pas dans l'éditeur (tableau de bord). Retenu : « Mon site » et « Voir le
 * site » suivent.
 */
export function ChoixVersion({ version, className }: { version: VersionSite; className?: string }) {
  const router = useRouter()
  const [enCours, demarrer] = useTransition()
  const choisir = (v: VersionSite) => {
    if (v === version) return
    retenirVersion(v)
    demarrer(() => router.refresh())
  }
  return (
    <div role="radiogroup" aria-label="Version du site" className={cn('inline-flex rounded-full bg-white/70 p-[3px]', enCours && 'opacity-70', className)}>
      {(
        [
          ['moderne', 'Site moderne'],
          ['classique', 'Site classique'],
        ] as const
      ).map(([v, libelle]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={version === v}
          onClick={() => choisir(v)}
          className={cn(
            'h-[26px] rounded-full px-3 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-300',
            version === v ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(22,73,81,0.12)]' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {libelle}
        </button>
      ))}
    </div>
  )
}
