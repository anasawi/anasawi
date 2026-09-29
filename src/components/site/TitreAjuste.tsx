'use client'

import { useLayoutEffect, useRef } from 'react'

/**
 * Un titre géant qui tient TOUJOURS dans sa boîte.
 *
 * Le hero « L'arche » compose son titre en `vw` : sur un écran de bureau,
 * la proportion est juste. Sur un téléphone, un mot long — « SUPERVISION »,
 * « GESTALT-THÉRAPIE » — devient plus large que l'écran, et comme il ne
 * peut pas se couper, il déborde et se fait rogner des deux côtés. Aucune
 * règle CSS fixe ne peut le savoir : la largeur dépend du MOT, qu'Anne
 * écrit dans l'admin.
 *
 * On mesure donc. À chaque changement de taille, chaque ligne est
 * comparée à la boîte du titre ; si l'une dépasse, tout le titre est
 * réduit d'un même facteur (`--ajustement`), pour garder les proportions
 * entre les lignes. Les décalages latéraux des lignes « alternées »
 * (`translate-x`) entrent dans le calcul : une ligne centrée puis poussée
 * de 4 vw a besoin de 8 vw de marge.
 *
 * La taille de police du titre DOIT multiplier par `var(--ajustement, 1)`.
 */
export function TitreAjuste({
  className,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<'h1'>) {
  const ref = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    const titre = ref.current
    if (!titre) return

    const ajuster = () => {
      /* Mesure à l'échelle 1 : la largeur d'une ligne est proportionnelle
         à la police, le facteur se déduit d'une seule mesure. */
      titre.style.setProperty('--ajustement', '1')
      const boite = titre.getBoundingClientRect().width
      if (boite <= 0) return

      let facteur = 1
      for (const ligne of Array.from(titre.children) as HTMLElement[]) {
        const largeur = ligne.getBoundingClientRect().width
        if (largeur <= 0) continue
        /* Décalage latéral posé par une transformation (lignes alternées). */
        const matrice = new DOMMatrixReadOnly(getComputedStyle(ligne).transform)
        const decalage = Math.abs(matrice.e)
        const disponible = Math.max(0, boite - 2 * decalage)
        if (largeur > disponible) {
          facteur = Math.min(facteur, disponible / largeur)
        }
      }
      /* Rien à réduire : la maquette telle quelle. Sinon, deux pour cent
         de marge pour l'arrondi des glyphes. */
      titre.style.setProperty(
        '--ajustement',
        facteur < 1 ? String(facteur * 0.98) : '1',
      )
    }

    ajuster()
    const observateur = new ResizeObserver(ajuster)
    observateur.observe(titre)
    /* Les polices arrivent après le premier rendu, et changent la mesure. */
    const doc = titre.ownerDocument
    doc.fonts?.ready.then(ajuster).catch(() => undefined)

    return () => observateur.disconnect()
  }, [children])

  return (
    <h1 ref={ref} className={className} {...rest}>
      {children}
    </h1>
  )
}
