'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { useLatest } from './hooks/useLatest'

/**
 * La scène de l'éditeur, dans un cadre à la largeur exacte de l'écran
 * simulé.
 *
 * POURQUOI UN CADRE. Avant, la page était rendue directement dans le
 * document de l'admin, réduite par `transform: scale()`. L'échelle
 * trompait l'œil, pas le navigateur : les media queries (`md:`, `lg:`),
 * les unités `vw`/`svh` et les `clamp()` du site se calculaient sur la
 * fenêtre de 1 920 px, pas sur les 414 px de la scène « mobile ». On
 * voyait donc un site de bureau écrasé dans un rectangle étroit — jamais
 * ce qu'Anne verrait sur son téléphone. Le cadre a une vraie fenêtre de
 * 414 px : tout se calcule comme sur l'appareil. Et la police de 13 px du
 * CMS (`.admin-shell`) ne s'y propage plus.
 *
 * COMMENT, SANS PERDRE L'ÉDITION. Le contenu n'est pas une page chargée
 * dans le cadre : c'est le même arbre React, PROJETÉ dans le document du
 * cadre par un portail. Les événements remontent l'arbre React comme
 * avant (clic, double-clic, survol), l'état de l'éditeur reste unique,
 * et `SectionsView` ne sait pas qu'il est ailleurs. Les feuilles de
 * style du document parent sont recopiées dans le cadre — et resuivies,
 * parce qu'en développement Next les remplace à la volée.
 *
 * Ce qui ne traverse pas un cadre tout seul, on le fait passer : les
 * touches (⌘Z, Échap, Suppr) et les pointeurs (fermeture des menus)
 * sont rejoués sur la fenêtre parente.
 */

type Props = {
  /** Largeur de l'écran simulé, en px CSS du cadre. */
  width: number
  /** Hauteur du contenu — mesurée par l'éditeur, appliquée au cadre. */
  height: number
  /** Réduction visuelle, appliquée au cadre lui-même. */
  scale: number
  /** Appelé quand le cadre est prêt à recevoir du contenu (et à être
      mesuré) : l'éditeur relance alors ses mesures. */
  onReady?: () => void
  title: string
  className?: string
  children: React.ReactNode
}

export type StageFrameHandle = {
  /** Le conteneur du contenu, DANS le cadre — pour `querySelector` et
      les mesures (coordonnées du cadre, non réduites). */
  stage: HTMLDivElement | null
  /** Le cadre lui-même, dans le document parent — pour convertir des
      coordonnées du cadre en coordonnées de la fenêtre. */
  frame: HTMLIFrameElement | null
}

/** Rects du cadre → rects de la fenêtre parente. */
export function versLaFenetre(
  frame: HTMLIFrameElement,
  rect: DOMRect,
  scale: number,
): { top: number; left: number; height: number; width: number } {
  const box = frame.getBoundingClientRect()
  return {
    top: box.top + rect.top * scale,
    left: box.left + rect.left * scale,
    height: rect.height * scale,
    width: rect.width * scale,
  }
}

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

export const StageFrame = forwardRef<StageFrameHandle, Props>(function StageFrame(
  { width, height, scale, onReady, title, className, children },
  ref,
) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [mount, setMount] = useState<HTMLDivElement | null>(null)
  /* `onReady` change d'identité à chaque rendu de l'éditeur ; ce n'est
     pas une raison de reconstruire le cadre : on lit la dernière valeur. */
  const onReadyRef = useLatest(onReady)

  useImperativeHandle(
    ref,
    () => ({ stage: mount, frame: frameRef.current }),
    [mount],
  )

  /* ── Préparation du document du cadre ─────────────────────────────── */
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    let racine: HTMLDivElement | null = null
    let observateur: MutationObserver | null = null
    let copies: Node[] = []

    const preparer = () => {
      const doc = frame.contentDocument
      /* Le document du cadre est celui de `srcdoc`, et il est prêt : pas
         le `about:blank` initial, que le navigateur REMPLACE au premier
         chargement — tout ce qu'on y aurait mis disparaîtrait avec lui
         (c'est arrivé : cadre vide après un rechargement complet). */
      if (!doc || doc.URL !== 'about:srcdoc' || doc.readyState !== 'complete')
        return
      if (racine && doc.contains(racine)) return

      /* Même langue, mêmes variables de police (`next/font` les pose en
         classe sur `<html>`). */
      doc.documentElement.lang = document.documentElement.lang
      doc.documentElement.className = document.documentElement.className

      const base = doc.createElement('style')
      base.textContent =
        'html,body{margin:0;padding:0}body{overflow:hidden}'
      doc.head.appendChild(base)

      /* Copie des feuilles de style du parent — et recopie à chaque
         changement (rechargement à chaud en développement). */
      const recopier = () => {
        for (const n of copies) n.parentNode?.removeChild(n)
        copies = []
        const sources = document.querySelectorAll(
          'head link[rel="stylesheet"], head style',
        )
        for (const source of sources) {
          const copie = source.cloneNode(true)
          doc.head.appendChild(copie)
          copies.push(copie)
        }
      }
      recopier()
      observateur?.disconnect()
      observateur = new MutationObserver(recopier)
      observateur.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      })

      racine = doc.createElement('div')
      doc.body.appendChild(racine)
      setMount(racine)
      onReadyRef.current?.()
    }

    /* Selon le moment, le document `srcdoc` est déjà là (second passage
       des effets en développement) ou arrive avec `load`. */
    preparer()
    const onLoad = () => preparer()
    frame.addEventListener('load', onLoad)

    return () => {
      frame.removeEventListener('load', onLoad)
      observateur?.disconnect()
    }
  }, [onReadyRef])

  /* ── Ce qui doit traverser le cadre ───────────────────────────────── */
  useEffect(() => {
    const win = frameRef.current?.contentWindow
    if (!mount || !win) return

    /* Les raccourcis de l'éditeur écoutent la fenêtre parente : on leur
       rejoue les touches, sauf quand on tape dans un champ du cadre (la
       frappe en place, elle, a ses propres écouteurs). */
    const onKey = (event: KeyboardEvent) => {
      const cible = event.target as Element | null
      if (cible?.closest?.(EDITABLE)) return
      const copie = new KeyboardEvent(event.type, event)
      window.dispatchEvent(copie)
      if (copie.defaultPrevented) event.preventDefault()
    }
    /* Un clic dans la page ferme les menus ouverts dans la barre. */
    const onPointer = (event: PointerEvent) => {
      window.dispatchEvent(new PointerEvent(event.type, event))
    }

    win.addEventListener('keydown', onKey)
    win.addEventListener('pointerdown', onPointer)
    return () => {
      win.removeEventListener('keydown', onKey)
      win.removeEventListener('pointerdown', onPointer)
    }
  }, [mount])

  return (
    <iframe
      ref={frameRef}
      title={title}
      /* Un document explicite, chargé une fois pour toutes : le
         `about:blank` implicite est remplacé en cours de route par le
         navigateur, et emporte ce qu'on y a mis. */
      srcDoc="<!doctype html><html><head></head><body></body></html>"
      className={className}
      style={{
        display: 'block',
        border: 0,
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        background: 'transparent',
      }}
    >
      {mount && createPortal(children, mount)}
    </iframe>
  )
})
