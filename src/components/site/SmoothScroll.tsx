'use client'

import { useEffect } from 'react'

/**
 * Défilement inertiel — sans jamais sortir le contenu du flux.
 *
 * LA PREMIÈRE VERSION PLAÇAIT LE CONTENU DANS UN WRAPPER `position:fixed`
 * translaté à chaque frame. L'effet était juste, et le reste cassé : pour
 * le navigateur, un élément qui vit dans un conteneur fixe n'est jamais
 * « hors de l'écran », donc il ne défile jamais vers lui. Conséquences,
 * toutes silencieuses :
 *
 *   — les ancres (`#accompagnements`, « Aller au contenu », les boutons du
 *     hero, le pied de page) ne déplaçaient rien ;
 *   — la tabulation vers un champ situé plus bas ne l'amenait pas à
 *     l'écran : on tapait dans un champ qu'on ne voyait pas ;
 *   — la recherche dans la page (⌘F) ne défilait pas jusqu'au résultat ;
 *   — `scrollIntoView()` n'avait aucun effet, où qu'il soit appelé.
 *
 * La page défile donc RÉELLEMENT, comme partout ailleurs : on se contente
 * d'interposer une inertie entre la molette et le défilement. `scrollY`
 * reste la seule vérité, le document garde sa hauteur naturelle, et tout
 * ce que le navigateur sait faire nativement continue de le faire.
 *
 * L'inertie est désactivée sous prefers-reduced-motion et sur pointeur
 * tactile : le défilement d'un doigt a déjà sa propre inertie, celle du
 * système. Les ANCRES, elles, sont prises en charge dans tous les cas —
 * voir plus bas pourquoi.
 */

/** Part du chemin restant parcourue à chaque frame — la douceur. */
const LISSAGE = 0.11

/** En deçà, on colle à la cible : inutile d'animer un dixième de pixel. */
const SEUIL = 0.5

/**
 * Bas de la capsule de navigation : `top-4` (16 px) + sa hauteur (~54 px),
 * plus une respiration. Sert à ne pas poser un titre SOUS la capsule
 * quand la section visée n'a pas assez de marge haute pour l'accueillir.
 */
const BAS_DE_LA_CAPSULE = 80

/*
 * ── Ancres ────────────────────────────────────────────────────────────
 *
 * Le navigateur sait aller à une ancre tout seul, et pourtant on ne le
 * laisse pas faire. Trois raisons, toutes constatées :
 *
 *   1. Il calcule la position d'arrivée UNE FOIS, au clic, puis anime vers
 *      elle. Si la page bouge pendant le trajet — une image qui charge, une
 *      police qui arrive, un hero en `svh` — on arrive à côté. Ici la
 *      position est RELUE À CHAQUE IMAGE : on suit l'élément, pas un nombre.
 *
 *   2. Son animation et la nôtre se disputaient la page : chacune posait
 *      sa position à tour de rôle, et le dernier mot revenait au hasard.
 *
 *   3. Le décalage d'arrivée était une addition de réglages CSS
 *      (`scroll-padding-top` sur `html`, `scroll-margin-top` sur la
 *      section) que rien n'empêchait de se cumuler — c'est arrivé : 192 px
 *      de vide au-dessus de chaque section. Il n'y a plus qu'une règle, et
 *      elle est ici : UNE SECTION SE POSE À SON BORD HAUT. Sa marge
 *      intérieure suffit à passer sous la capsule ; si elle ne suffit pas,
 *      on descend juste ce qu'il faut. Un autre élément (un champ, le
 *      contenu principal) se pose sous la capsule.
 *
 * Les entrées du menu viennent du CMS : l'ancre d'une section peut être
 * renommée, une section ajoutée ou retirée. Rien ici ne connaît la liste
 * des sections — on résout l'identifiant du lien AU MOMENT DU CLIC, dans
 * la page telle qu'elle est. Ce qui change dans l'admin change donc ici
 * sans rien toucher.
 */

/** Position de défilement où l'élément est « bien posé ». */
function positionDe(element: HTMLElement): number {
  const haut = element.getBoundingClientRect().top + window.scrollY

  let decalage: number
  if (element.tagName === 'SECTION') {
    const marge = parseFloat(getComputedStyle(element).paddingTop) || 0
    decalage = Math.max(0, BAS_DE_LA_CAPSULE - marge)
  } else {
    decalage = BAS_DE_LA_CAPSULE
  }

  const maximum = document.documentElement.scrollHeight - window.innerHeight
  return Math.min(Math.max(0, haut - decalage), Math.max(0, maximum))
}

/** L'élément désigné par `#quelque-chose`, s'il existe dans la page. */
function cibleDe(hash: string): HTMLElement | null {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (!id) return null
  return document.getElementById(id)
}

/**
 * Le lien cliqué mène-t-il à une ancre DE CETTE PAGE ? `#contact` et
 * `/#contact` depuis l'accueil, oui ; `/#contact` depuis une autre page,
 * non — c'est alors une vraie navigation, que le navigateur fait mieux
 * que nous, et on se rattrape à l'arrivée (voir `alignerAuChargement`).
 */
function ancreLocale(event: MouseEvent): { lien: HTMLAnchorElement; cible: HTMLElement } | null {
  if (event.defaultPrevented || event.button !== 0) return null
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null

  const lien = (event.target as Element | null)?.closest?.('a[href]')
  if (!(lien instanceof HTMLAnchorElement)) return null
  if (lien.target && lien.target !== '_self') return null

  const url = new URL(lien.href, location.href)
  if (url.origin !== location.origin || url.pathname !== location.pathname) return null
  if (url.search !== location.search) return null
  if (!url.hash) return null

  const cible = cibleDe(url.hash)
  return cible ? { lien, cible } : null
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const inertie = !reduced && !coarse

    const maximum = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

    let cible = window.scrollY
    let courant = cible
    /* Position posée par NOUS au dernier rendu : elle permet de
       reconnaître un défilement venu d'ailleurs — tabulation, ⌘F, barre
       de défilement — et de s'y ranger au lieu de lutter. */
    let derniereEcrite = cible
    /* Élément vers lequel on se dirige, s'il y en a un : sa position est
       relue à chaque image, pour arriver dessus même si la page bouge. */
    let suivi: HTMLElement | null = null
    /* Faux dès que la personne a bougé la page elle-même : on ne la
       ramène alors plus à l'ancre de l'adresse quand les polices ou les
       images finissent de charger. */
    let intact = true
    let anime = false
    let frame = 0

    /* `behavior: 'instant'` explicitement : la feuille de style pose
       `scroll-behavior: smooth` sur `html` — ce qui serait catastrophique
       ici, où le navigateur animerait chacun de nos pas déjà animés. */
    const poser = (y: number) => {
      window.scrollTo({ top: y, behavior: 'instant' })
      derniereEcrite = window.scrollY
    }

    const boucle = () => {
      if (suivi) cible = positionDe(suivi)
      const reste = cible - courant

      if (Math.abs(reste) < SEUIL) {
        courant = cible
        poser(courant)
        anime = false
        suivi = null
        return
      }

      courant += reste * LISSAGE
      poser(courant)
      frame = requestAnimationFrame(boucle)
    }

    const lancer = () => {
      if (anime) return
      anime = true
      frame = requestAnimationFrame(boucle)
    }

    /** Va à un élément — en glissant, ou d'un coup si le mouvement est réduit. */
    const allerVers = (element: HTMLElement, immediat = false) => {
      if (inertie && !immediat) {
        suivi = element
        courant = window.scrollY
        lancer()
        return
      }
      suivi = null
      if (reduced || immediat) {
        poser(positionDe(element))
        cible = courant = window.scrollY
        return
      }
      window.scrollTo({ top: positionDe(element), behavior: 'smooth' })
    }

    const onWheel = (event: WheelEvent) => {
      /* Zoom du navigateur, défilement d'une zone interne (un menu, une
         carte) : ce n'est pas à nous. */
      if (event.ctrlKey || event.metaKey || event.defaultPrevented) return

      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16 /* lignes */
          : event.deltaMode === 2
            ? event.deltaY * window.innerHeight /* pages */
            : event.deltaY

      event.preventDefault()
      /* La molette reprend la main sur un trajet vers une ancre. */
      suivi = null
      intact = false
      cible = Math.min(Math.max(0, cible + delta), maximum())
      lancer()
    }

    /* Défilement provoqué par autre chose que la molette : on adopte sa
       position au lieu de la reprendre de force à la frame suivante. */
    const onScroll = () => {
      if (Math.abs(window.scrollY - derniereEcrite) < 1) return
      cible = window.scrollY
      courant = window.scrollY
      derniereEcrite = window.scrollY
      intact = false
    }

    /* Une fenêtre redimensionnée peut rendre la cible hors bornes. */
    const onResize = () => {
      cible = Math.min(cible, maximum())
    }

    const onClick = (event: MouseEvent) => {
      const ancre = ancreLocale(event)
      if (!ancre) return

      event.preventDefault()
      intact = false

      /* L'adresse change comme si le navigateur avait suivi le lien —
         partage, retour arrière, rechargement gardent le même sens. */
      if (ancre.lien.hash !== location.hash) {
        history.pushState(null, '', ancre.lien.href)
      }

      /* Ce que fait le navigateur en suivant une ancre, et qu'on lui
         retire en interceptant : donner le focus à la cible quand elle
         peut le prendre — le lien d'évitement en dépend. */
      if (ancre.cible.hasAttribute('tabindex') || ancre.cible.matches('input, textarea, select, button, a[href]')) {
        ancre.cible.focus({ preventScroll: true })
      }

      allerVers(ancre.cible)
    }

    /* Retour arrière, ou une adresse tapée : même trajet. */
    const onHashChange = () => {
      intact = false
      const element = cibleDe(location.hash)
      if (element) allerVers(element)
    }

    /*
     * Arrivée sur `/#accompagnements` : le navigateur a déjà sauté, avec
     * SON décalage et AVANT que la page ait sa hauteur finale (polices,
     * images, hero en `svh`). On repose la page au bon endroit, sans
     * animer, une fois maintenant et une fois quand tout a chargé — tant
     * que la personne n'a pas commencé à défiler elle-même.
     */
    const alignerAuChargement = () => {
      if (!intact) return
      const element = cibleDe(location.hash)
      if (element) allerVers(element, true)
    }

    if (inertie) {
      window.addEventListener('wheel', onWheel, { passive: false })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('click', onClick)
    window.addEventListener('hashchange', onHashChange)

    alignerAuChargement()
    window.addEventListener('load', alignerAuChargement)
    document.fonts?.ready.then(alignerAuChargement).catch(() => undefined)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('load', alignerAuChargement)
    }
  }, [])

  /* Le wrapper ne porte plus ni position ni transformation : il groupe,
     rien de plus. Il reste pour ne pas changer la structure du document. */
  return <div>{children}</div>
}
