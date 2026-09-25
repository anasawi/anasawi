'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Défilement inertiel façon maquette : le contenu vit dans un wrapper
 * `position:fixed` translaté à chaque frame vers -scrollY avec un lerp
 * de .085, pendant que le body garde la hauteur réelle du contenu.
 *
 * Le scroll natif de la fenêtre reste LA source de vérité : on ne fait
 * que lire `window.scrollY`. La molette, le clavier et la restauration de
 * position fonctionnent donc sans code.
 *
 * LES ANCRES, ELLES, DEMANDENT DU CODE — et leur absence a fait un dégât
 * silencieux. Le wrapper étant `position:fixed`, il ne défile pas avec la
 * page : pour le navigateur, une cible qui vit dedans est déjà « en
 * place », et un clic sur `#accompagnements` ne déplace rien. Tous les
 * liens internes du site étaient donc morts — le menu, le lien d'évitement
 * « Aller au contenu », les boutons du hero, le pied de page — sans le
 * moindre message d'erreur : la page ne bougeait pas, voilà tout.
 *
 * On recalcule donc la position de la cible dans le référentiel du
 * document (sa position à l'écran PLUS la translation courante du
 * wrapper), on respecte son `scroll-margin-top`, et on laisse le lerp
 * faire l'inertie.
 *
 * Désactivé sous prefers-reduced-motion et sur pointeur tactile — le
 * flux normal reprend (le wrapper redevient un simple div) et les ancres
 * natives refonctionnent seules.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const wrap = wrapRef.current
    if (reduced || coarse || !wrap) return

    setActive(true)

    /* Le lissage natif (html { scroll-behavior:smooth }) s'additionnerait
       au lerp : on rend le scroll fenêtre instantané, le lerp fait le
       reste. Les ancres gardent leur inertie — celle du lerp. */
    const previousBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'

    let current = window.scrollY

    const setHeight = () => {
      document.body.style.height = `${wrap.scrollHeight}px`
    }
    setHeight()

    /* Les images qui chargent, les accordéons qui s'ouvrent : la hauteur
       du body suit le contenu, pas l'inverse. */
    const observer = new ResizeObserver(setHeight)
    observer.observe(wrap)

    let frame = 0
    const loop = () => {
      const target = window.scrollY
      current += (target - current) * 0.085
      if (Math.abs(target - current) < 0.05) current = target
      wrap.style.transform = `translate3d(0, ${-current}px, 0)`
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    /* ── Ancres ──────────────────────────────────────────────────────
       `rect.top` est mesuré sur un wrapper déjà translaté de `-current` :
       la position de la cible DANS LE DOCUMENT vaut donc `rect.top +
       current`. On retire ensuite son `scroll-margin-top` (les sections
       portent `scroll-mt-24`, pour ne pas passer sous la capsule de
       navigation), et on borne au défilement disponible. */
    const allerA = (id: string): boolean => {
      if (!id) return false
      const cible = document.getElementById(id)
      if (!cible) return false

      const marge =
        Number.parseFloat(getComputedStyle(cible).scrollMarginTop) || 0
      const maximum = Math.max(0, document.body.scrollHeight - window.innerHeight)
      const y = Math.min(
        Math.max(0, cible.getBoundingClientRect().top + current - marge),
        maximum,
      )

      window.scrollTo({ top: y, behavior: 'auto' })

      /* En annulant la navigation de fragment, on annule aussi le
         déplacement de focus qu'elle opérait : on le refait à la main.
         Sur une cible non focalisable — une `<section>` ordinaire —
         `focus()` ne fait rien, ce qui est le comportement attendu ;
         sur le `<main tabindex="-1">` du lien d'évitement, il rend au
         clavier la place qu'il devait prendre. */
      cible.focus({ preventScroll: true })
      return true
    }

    const onClick = (event: MouseEvent) => {
      /* On ne détourne que le clic gauche simple : un clic milieu, un
         ⌘/Ctrl-clic ou un clic droit ouvrent un onglet, et c'est très
         bien ainsi. */
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const lien = (event.target as Element | null)?.closest?.('a[href]')
      if (!(lien instanceof HTMLAnchorElement)) return
      if (lien.target && lien.target !== '_self') return

      const href = lien.getAttribute('href') ?? ''
      /* Ancre de la page courante uniquement : « #contact », ou
         « /#contact » alors qu'on est déjà à la racine. */
      const id = href.startsWith('#')
        ? href.slice(1)
        : href.startsWith(`${window.location.pathname}#`)
          ? href.slice(href.indexOf('#') + 1)
          : ''

      if (!allerA(decodeURIComponent(id))) return

      event.preventDefault()
      /* L'URL suit, sans second saut : `replaceState` n'émet pas de
         navigation de fragment. */
      history.replaceState(null, '', `#${id}`)
    }

    /* Arrivée sur la page avec un fragment : le navigateur a déjà
       renoncé à défiler, on rattrape une fois la mise en page posée. */
    const auChargement = () => {
      const id = window.location.hash.slice(1)
      if (id) requestAnimationFrame(() => allerA(decodeURIComponent(id)))
    }
    auChargement()

    document.addEventListener('click', onClick)
    window.addEventListener('hashchange', auChargement)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', auChargement)
      document.body.style.height = ''
      document.documentElement.style.scrollBehavior = previousBehavior
      wrap.style.transform = ''
      setActive(false)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      className={cn(active && 'fixed left-0 top-0 w-full will-change-transform')}
    >
      {children}
    </div>
  )
}
