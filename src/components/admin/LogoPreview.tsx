'use client'

import logoParDefaut from '@/components/site/logo-anasawi.png'

/**
 * Le logo tel qu'il sera vu, aux trois tailles qui comptent.
 *
 * Un sélecteur d'image montre l'image en grand : c'est justement à
 * cette taille-là qu'un logo ne pose jamais problème. Le piège est à
 * 16 px, et il est systématique — une image dont le dessin ne remplit
 * pas le carré perd la moitié de sa surface en marges vides, et il ne
 * reste qu'une tache. Personne ne peut le deviner depuis l'admin.
 *
 * Alors on le montre. Les trois tailles sont les vraies : l'onglet du
 * navigateur, l'en-tête du site, l'icône d'écran d'accueil réduite.
 */
const TAILLES = [
  { px: 16, legende: 'Onglet' },
  { px: 28, legende: 'En-tête' },
  { px: 64, legende: 'Écran d’accueil' },
] as const

export function LogoPreview({ url }: { url?: string | null }) {
  const source = url || logoParDefaut.src

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Ce que verront vos visiteurs
      </p>

      <div className="flex items-end gap-5 rounded-lg border border-border bg-ivory px-4 py-3">
        {TAILLES.map(({ px, legende }) => (
          <span key={px} className="flex flex-col items-center gap-1.5">
            <span
              className="flex items-center justify-center"
              style={{ width: px, height: px }}
            >
              {/* `next/image` refuserait une adresse externe non déclarée,
                  et redimensionnerait une image que l'on veut voir
                  EXACTEMENT telle qu'elle sera rendue. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={source}
                alt=""
                width={px}
                height={px}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="text-[10px] leading-none text-muted-foreground">
              {legende}
            </span>
          </span>
        ))}

        <span className="ml-auto max-w-[24ch] text-[11px] leading-[1.5] text-muted-foreground">
          Si le dessin paraît minuscule, c’est que l’image a des marges
          vides : recadrez-la au plus près.
        </span>
      </div>
    </div>
  )
}
