'use client'

import { useEffect, useState } from 'react'

/**
 * Fenêtre étroite : la liste se replie quand l'inspecteur est ouvert (le
 * canvas garde toujours au moins 520 px) ; une icône la rouvre, flottante
 * au-dessus de la page.
 *
 * Téléphone : la liste et la page ne tiennent pas côte à côte. La liste
 * se replie toujours et s'ouvre par-dessus la page, d'un bouton.
 */
export function useResponsiveRail(selectedId: string | null) {
  const [wide, setWide] = useState(true)
  const [narrow, setNarrow] = useState(false)
  const [railOverlay, setRailOverlay] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const mqNarrow = window.matchMedia('(max-width: 767px)')
    const sync = () => {
      setWide(mq.matches)
      setNarrow(mqNarrow.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    mqNarrow.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      mqNarrow.removeEventListener('change', sync)
    }
  }, [])
  /* Fenêtre élargie ou inspecteur fermé : la liste reprend sa place —
     sauf sur téléphone, où elle reste un volet. */
  useEffect(() => {
    if (wide || (!selectedId && !narrow)) setRailOverlay(false)
  }, [wide, narrow, selectedId])

  return { wide, narrow, railOverlay, setRailOverlay }
}
