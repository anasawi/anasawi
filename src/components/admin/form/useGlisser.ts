'use client'

import { useState } from 'react'

/**
 * GLISSER-DÉPOSER pour réordonner une liste (photos d'une galerie, étapes,
 * organismes…). Le glisser part d'une POIGNÉE (une image, une icône) : les
 * champs de texte de l'élément restent sélectionnables normalement.
 *
 *   const g = useGlisser(liste, onChange)
 *   <li {...g.element(i)}>  <span {...g.poignee(i)} />  …
 *
 * Les flèches restent à côté : au clavier et au doigt (le glisser natif
 * ne fonctionne pas sur téléphone), on réordonne avec elles.
 */
export function useGlisser<T>(liste: T[], onChange: (next: T[]) => void) {
  const [arme, setArme] = useState<number | null>(null)
  const [source, setSource] = useState<number | null>(null)
  const [cible, setCible] = useState<number | null>(null)

  const deplacer = (de: number, vers: number) => {
    if (de === vers || vers < 0 || vers >= liste.length) return
    const copie = [...liste]
    const [el] = copie.splice(de, 1)
    copie.splice(vers, 0, el as T)
    onChange(copie)
  }

  const fin = () => {
    setArme(null)
    setSource(null)
    setCible(null)
  }

  return {
    deplacer,
    enCours: source !== null,
    element: (i: number) => ({
      draggable: arme === i,
      onDragStart: (e: React.DragEvent) => {
        setSource(i)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(i))
      },
      onDragOver: (e: React.DragEvent) => {
        if (source === null) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (cible !== i) setCible(i)
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        if (source !== null) deplacer(source, i)
        fin()
      },
      onDragEnd: fin,
      'data-glisse': source === i ? 'oui' : undefined,
      'data-cible': cible === i && source !== null && source !== i ? (source < i ? 'apres' : 'avant') : undefined,
    }),
    poignee: (i: number) => ({
      onPointerDown: () => setArme(i),
      onPointerUp: () => source === null && setArme(null),
      title: 'Glisser pour déplacer',
      style: { cursor: 'grab' } as React.CSSProperties,
    }),
  }
}

/** Les classes d'un élément glissable : estompé quand il part, un liseré là où il va tomber. */
export const CLASSES_GLISSER =
  'transition-[opacity,box-shadow,transform] duration-200 data-[glisse=oui]:opacity-40 data-[cible=avant]:shadow-[inset_0_3px_0_#176c79] data-[cible=apres]:shadow-[inset_0_-3px_0_#176c79]'
