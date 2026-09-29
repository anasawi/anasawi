'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * Fil de progression en haut du CMS, le temps d'une navigation.
 *
 * Chaque écran du CMS charge ses données depuis Neon avant de s'afficher :
 * entre le clic et l'arrivée, il se passe une demi-seconde à deux
 * secondes pendant lesquelles, avant ce fil, RIEN ne bougeait à l'écran.
 * Un bouton qui ne répond pas est un bouton qu'on reclique — et une
 * navigation qu'on croit en panne.
 *
 * Le fil part au clic sur n'importe quel lien interne (capture, avant
 * que Next ne prenne la main) et s'arrête quand l'adresse a changé. Il
 * ne dépend donc pas de chaque composant : un lien ajouté demain en
 * profite sans rien faire. Les liens vers un nouvel onglet, les ancres,
 * les clics avec modificateur et les liens externes ne le déclenchent
 * pas — le navigateur ne quitte pas la page, il n'y a rien à attendre.
 *
 * Garde-fou : une navigation qui ne change pas l'adresse (lien vers la
 * page courante) rangerait le fil au bout de quelques secondes plutôt que
 * de le laisser courir sans fin.
 */
const DELAI_MAX = 8000

export function NavigationProgress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const [actif, setActif] = useState(false)
  const garde = useRef(0)

  /* L'adresse a changé : la page est arrivée. */
  const adresse = `${pathname}?${search.toString()}`
  useEffect(() => {
    setActif(false)
    window.clearTimeout(garde.current)
  }, [adresse])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const lien = (event.target as Element | null)?.closest?.('a[href]')
      if (!(lien instanceof HTMLAnchorElement)) return
      if (lien.target && lien.target !== '_self') return
      if (lien.hasAttribute('download')) return

      const url = new URL(lien.href, location.href)
      if (url.origin !== location.origin) return
      /* Même page, autre ancre : pas de navigation. */
      if (url.pathname === location.pathname && url.search === location.search)
        return

      setActif(true)
      window.clearTimeout(garde.current)
      garde.current = window.setTimeout(() => setActif(false), DELAI_MAX)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.clearTimeout(garde.current)
    }
  }, [])

  return (
    <div
      role="progressbar"
      aria-label="Chargement de la page"
      aria-hidden={!actif}
      data-actif={actif ? '' : undefined}
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden"
    >
      {/* Un fil qui avance vite au départ puis ralentit, sans jamais
          atteindre le bout : il dit « ça vient », pas « voilà où on en
          est » — on ne le sait pas. Il disparaît d'un coup à l'arrivée. */}
      <div
        className="h-full origin-left bg-blue-deep"
        style={{
          transform: actif ? 'scaleX(0.9)' : 'scaleX(0)',
          transition: actif
            ? 'transform 6s cubic-bezier(0.1, 0.7, 0.2, 1)'
            : 'none',
        }}
      />
    </div>
  )
}
