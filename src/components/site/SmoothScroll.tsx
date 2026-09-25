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
 * Désactivé sous prefers-reduced-motion et sur pointeur tactile : le
 * défilement d'un doigt a déjà sa propre inertie, celle du système.
 */

/** Part du chemin restant parcourue à chaque frame — la douceur. */
const LISSAGE = 0.11

/** En deçà, on colle à la cible : inutile d'animer un dixième de pixel. */
const SEUIL = 0.5

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (reduced || coarse) return

    const maximum = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

    let cible = window.scrollY
    let courant = cible
    /* Position posée par NOUS au dernier rendu : elle permet de
       reconnaître un défilement venu d'ailleurs — ancre, tabulation,
       ⌘F, barre de défilement — et de s'y ranger au lieu de lutter. */
    let derniereEcrite = cible
    let anime = false
    let frame = 0

    /* `behavior: 'instant'` explicitement : la feuille de style pose
       `scroll-behavior: smooth` sur `html` — ce qui est très bien pour une
       ancre, et catastrophique ici, où le navigateur animerait chacun de
       nos pas déjà animés. On ne touche pas au réglage global : les ancres
       gardent leur glissé natif. */
    const poser = (y: number) => {
      window.scrollTo({ top: y, behavior: 'instant' })
      derniereEcrite = window.scrollY
    }

    const boucle = () => {
      const reste = cible - courant

      if (Math.abs(reste) < SEUIL) {
        courant = cible
        poser(courant)
        anime = false
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
    }

    /* Une fenêtre redimensionnée peut rendre la cible hors bornes. */
    const onResize = () => {
      cible = Math.min(cible, maximum())
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  /* Le wrapper ne porte plus ni position ni transformation : il groupe,
     rien de plus. Il reste pour ne pas changer la structure du document. */
  return <div>{children}</div>
}
