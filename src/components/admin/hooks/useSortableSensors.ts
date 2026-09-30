'use client'

import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * Les capteurs dnd-kit des listes triables de l'admin (accompagnements,
 * questions) : le pointeur, avec 6 px de tolérance pour qu'un clic sur la
 * ligne ne devienne pas un glisser ; le clavier, pour déplacer sans souris.
 */
export function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}
