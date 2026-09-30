'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { versLaFenetre, type StageFrameHandle } from '../StageFrame'
import { GRID_VIEWPORTS, type Breakpoint } from '@/lib/grid'
import type { Section } from '@/server/db/schema'

/**
 * Mesures de la scène : échelle, hauteur du cadre, rectangles des
 * sections (survol, cadre de sélection), défilement vers une section.
 *
 * Les rectangles sont mesurés DANS le cadre : ses coordonnées ne sont pas
 * réduites (la réduction s'applique au cadre lui-même, dans le document
 * parent), il n'y a donc plus d'échelle à défaire ici.
 */
export function useStageMeasure({
  viewport,
  narrow,
  mode,
  editing,
  selectedId,
  sections,
}: {
  viewport: Breakpoint
  narrow: boolean
  mode: 'edit' | 'preview'
  editing: boolean
  selectedId: string | null
  sections: Section[]
}) {
  /* Le cadre de la scène : `frameRef.current.stage` est le conteneur du
     contenu DANS le cadre (mesures, `querySelector`), `.frame` le cadre
     dans la fenêtre parente (conversion de coordonnées). */
  const frameRef = useRef<StageFrameHandle>(null)
  const stage = useCallback(() => frameRef.current?.stage ?? null, [])
  /* Incrémenté quand le cadre est prêt : les mesures repartent. */
  const [frameVersion, setFrameVersion] = useState(0)
  const paneRef = useRef<HTMLDivElement>(null)
  const [paneWidth, setPaneWidth] = useState(1280)
  const [stageHeight, setStageHeight] = useState(800)
  const [selectionRect, setSelectionRect] = useState<{
    top: number
    height: number
  } | null>(null)

  /** Rects (non mis à l'échelle) de chaque section racine, ordre visuel. */
  const [sectionRects, setSectionRects] = useState<
    { id: string; top: number; height: number }[]
  >([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  /** Section à amener au centre du canvas au prochain rendu. */
  const scrollToRef = useRef<string | null>(null)

  /* Sur téléphone, la page est rendue à la largeur RÉELLE de l'écran, à
     l'échelle 1 : ce qu'Anne voit est ce que verra un visiteur sur le même
     téléphone. Ailleurs, l'écran simulé choisi, réduit s'il ne tient pas. */
  const effectiveViewport: Breakpoint = narrow ? 'mobile' : viewport
  const vw = narrow ? Math.max(320, paneWidth - 16) : GRID_VIEWPORTS[viewport]
  const scale = narrow ? 1 : Math.min(1, (paneWidth - 48) / vw)

  /* ── Mesures : échelle + cadre de sélection ──────────────────────── */

  useLayoutEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    const ro = new ResizeObserver(() => setPaneWidth(pane.clientWidth))
    ro.observe(pane)
    setPaneWidth(pane.clientWidth)
    return () => ro.disconnect()
  }, [])

  /* `remeasure` lit l'échelle et la sélection via des refs synchronisées :
     son identité reste stable, et le ResizeObserver ci-dessous n'est plus
     démonté/remonté à chaque sélection ni à chaque redimensionnement du
     volet. Les refs sont mises à jour dans un effet de layout déclaré
     AVANT ceux qui mesurent — les effets s'exécutent dans l'ordre. */
  const scaleRef = useRef(scale)
  const selectedIdRef = useRef(selectedId)
  useLayoutEffect(() => {
    scaleRef.current = scale
    selectedIdRef.current = selectedId
  }, [scale, selectedId])

  /*
   * Mesures DANS le cadre : ses coordonnées ne sont pas réduites (la
   * réduction s'applique au cadre lui-même, dans le document parent), il
   * n'y a donc plus d'échelle à défaire ici. Les rectangles obtenus sont
   * en px de la scène, comme avant.
   */
  const remeasure = useCallback(() => {
    const scene = stage()
    if (!scene) return
    const currentSelectedId = selectedIdRef.current
    setStageHeight(scene.offsetHeight)

    const stageBox = scene.getBoundingClientRect()
    const rects = Array.from(
      scene.querySelectorAll<HTMLElement>('[data-block-root]'),
    )
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          id: el.dataset.blockId ?? '',
          top: r.top - stageBox.top,
          height: r.height,
        }
      })
      .sort((a, b) => a.top - b.top)
    setSectionRects(rects)

    if (currentSelectedId) {
      const el = scene.querySelector<HTMLElement>(
        `[data-block-id="${currentSelectedId}"]`,
      )
      if (el) {
        const r = el.getBoundingClientRect()
        setSelectionRect({
          top: r.top - stageBox.top,
          height: r.height,
        })
        return
      }
    }
    setSelectionRect(null)
  }, [stage])

  /* Une nouvelle échelle ou une nouvelle sélection demandent une mesure
     (cadre de sélection), sans toucher à l'observateur. */
  useLayoutEffect(() => {
    remeasure()
  }, [remeasure, scale, selectedId, frameVersion])

  useLayoutEffect(() => {
    remeasure()
    const scene = stage()
    if (!scene) return
    /* L'observateur du document DU CADRE : celui du parent ne suit pas
       un élément d'un autre document. */
    const Observer = scene.ownerDocument.defaultView?.ResizeObserver
    if (!Observer) return
    const ro = new Observer(() => remeasure())
    ro.observe(scene)
    return () => ro.disconnect()
  }, [remeasure, stage, sections, viewport, mode, frameVersion])

  /**
   * Amène une section au centre du canvas.
   *
   * Pas de `scrollIntoView` : la scène est mise à l'échelle par
   * `transform: scale()`, et `scrollIntoView` raisonne sur la géométrie
   * NON transformée — il filait tout en bas. Les rectangles rendus
   * (`getBoundingClientRect`) tiennent compte de la transformation.
   */
  const scrollStageTo = useCallback((id: string) => {
    const scroller = paneRef.current
    const frame = frameRef.current?.frame
    const el = stage()?.querySelector<HTMLElement>(`[data-block-id="${id}"]`)
    if (!scroller || !frame || !el) return
    /* Le rectangle est dans le cadre : ramené à la fenêtre. */
    const rect = versLaFenetre(frame, el.getBoundingClientRect(), scaleRef.current)
    const box = scroller.getBoundingClientRect()
    const wanted =
      scroller.scrollTop +
      (rect.top - box.top) -
      (scroller.clientHeight - rect.height) / 2
    const max = scroller.scrollHeight - scroller.clientHeight
    scroller.scrollTo({
      top: Math.min(Math.max(0, wanted), Math.max(0, max)),
      behavior: 'smooth',
    })
  }, [stage])

  /* Section ajoutée, dupliquée ou restaurée : une fois rendue, on la
     centre dans le canvas. Le conteneur de défilement n'est jamais
     remonté (pas de `key` changeante, plus de rechargement). */
  useLayoutEffect(() => {
    const id = scrollToRef.current
    if (!id) return
    const el = stage()?.querySelector(`[data-block-id="${id}"]`)
    if (!el) return
    scrollToRef.current = null
    requestAnimationFrame(() => scrollStageTo(id))
  }, [sections, scrollStageTo, stage])

  /* ── Survol du canvas ────────────────────────────────────────────── */

  const onPaneMove = useCallback(
    (e: React.PointerEvent) => {
      if (!editing) return
      const scene = stage()
      if (!scene) return
      /* Le pointeur n'est dans la page que s'il vient du document du
         cadre ; ses coordonnées sont alors celles du cadre, non réduites
         — comme les rectangles mesurés. Ailleurs dans le volet (marges
         grises), rien n'est survolé. */
      if ((e.target as Node).ownerDocument !== scene.ownerDocument) {
        setHoverId(null)
        return
      }
      const box = scene.getBoundingClientRect()
      const y = e.clientY - box.top
      const found = sectionRects.find(
        (r) => y >= r.top && y <= r.top + r.height,
      )
      setHoverId((cur) => ((found?.id ?? null) === cur ? cur : (found?.id ?? null)))
    },
    [editing, sectionRects, stage],
  )

  return {
    frameRef,
    paneRef,
    /** Le cadre est prêt : les mesures repartent. */
    onFrameReady: useCallback(() => setFrameVersion((v) => v + 1), []),
    effectiveViewport,
    vw,
    scale,
    stageHeight,
    selectionRect,
    sectionRects,
    hoverId,
    setHoverId,
    onPaneMove,
    scrollStageTo,
    scrollToRef,
  }
}
