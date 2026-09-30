'use client'

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type TransitionStartFunction,
} from 'react'
import { toast } from 'sonner'

import { SANS_FAMILLE } from '../ServiceGroup'
import { arrangeServices, reorderServiceGroups } from '@/server/actions/content'
import type { ServiceGroup, ServiceWithMedia } from '@/server/db/schema'

/**
 * Le glisser-déposer de l'écran Accompagnements : deux niveaux de tri
 * imbriqués (les familles entre elles, les accompagnements dans chacune
 * et d'une famille à l'autre), et l'écriture du plan qui en résulte.
 *
 * Rien n'est déplacé pendant le survol. Changer le conteneur d'un élément
 * en cours de glisser fait avorter dnd-kit : ni `onDragEnd` ni
 * `onDragCancel` n'était alors émis, et le déplacement restait à l'écran
 * sans jamais être enregistré. Tout se décide au relâché ; l'utilisateur
 * ne perd rien, le calque suit son pointeur et le bloc visé s'éclaire.
 */
export function useServiceArrangement({
  items,
  setItems,
  groups,
  setGroups,
  start,
}: {
  items: ServiceWithMedia[]
  setItems: Dispatch<SetStateAction<ServiceWithMedia[]>>
  groups: ServiceGroup[]
  setGroups: Dispatch<SetStateAction<ServiceGroup[]>>
  /** La transition partagée de l'écran (`pending` grise les boutons). */
  start: TransitionStartFunction
}) {
  const [dragged, setDragged] = useState<string | null>(null)

  /* Le plan d'affichage : une entrée par famille, puis les orphelins. */
  const blocs = useMemo(() => {
    const parFamille = new Map<string, ServiceWithMedia[]>()
    for (const g of groups) parFamille.set(g.id, [])
    const orphelins: ServiceWithMedia[] = []

    for (const s of items) {
      const cible = s.groupId ? parFamille.get(s.groupId) : undefined
      if (cible) cible.push(s)
      else orphelins.push(s)
    }

    return { parFamille, orphelins }
  }, [items, groups])

  /** Vrai si l'identifiant désigne une famille et non un accompagnement. */
  const estFamille = (id: string) => groups.some((g) => g.id === id)

  /* Conteneur d'origine, retenu au départ du glisser. Indispensable : le
     survol déplace déjà l'élément pour que l'aperçu soit fidèle, si bien
     qu'au relâché la comparaison « d'où vient-il / où va-t-il » porterait
     sur deux fois la même valeur — et l'on conclurait à tort qu'il n'a pas
     bougé. */
  const origine = useRef<string | null>(null)

  /** Identifiant du conteneur qui accueille un élément ou survolé. */
  function conteneurDe(id: string): string {
    if (id === SANS_FAMILLE || estFamille(id)) return id
    const service = items.find((s) => s.id === id)
    return service?.groupId ?? SANS_FAMILLE
  }

  /**
   * Écrit le plan complet — une entrée par famille, puis les orphelins.
   *
   * L'ensemble plutôt que le seul élément déplacé : l'appelant connaît
   * l'état final voulu, et une écriture globale ne peut pas laisser deux
   * accompagnements au même rang.
   */
  function persister(liste: ServiceWithMedia[], avant: ServiceWithMedia[]) {
    setItems(liste)
    start(async () => {
      const plan = [
        ...groups.map((g) => ({
          groupId: g.id,
          serviceIds: liste.filter((s) => s.groupId === g.id).map((s) => s.id),
        })),
        {
          groupId: null,
          serviceIds: liste.filter((s) => !s.groupId).map((s) => s.id),
        },
      ]

      const result = await arrangeServices(plan)
      if (result.ok) toast.success('Ordre enregistré.')
      else {
        setItems(avant)
        toast.error(result.error)
      }
    })
  }

  function handleDragStart({ active }: DragStartEvent) {
    origine.current = conteneurDe(String(active.id))
    setDragged(String(active.id))
  }

  function handleDragCancel() {
    setDragged(null)
    origine.current = null
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragged(null)

    /* ── Déplacement d'une famille entière ─────────────────────────── */
    if (estFamille(String(active.id))) {
      origine.current = null
      if (!over) return
      const cible = conteneurDe(String(over.id))
      const from = groups.findIndex((g) => g.id === active.id)
      const to = groups.findIndex((g) => g.id === cible)
      if (from < 0 || to < 0 || from === to) return

      const suivant = arrayMove(groups, from, to)
      const avant = groups
      setGroups(suivant)

      start(async () => {
        const result = await reorderServiceGroups(suivant.map((g) => g.id))
        if (result.ok) toast.success('Ordre des titres enregistré.')
        else {
          setGroups(avant)
          toast.error(result.error)
        }
      })
      return
    }

    origine.current = null
    if (!over || active.id === over.id) return

    const actifId = String(active.id)
    const surId = String(over.id)
    const cible = conteneurDe(surId)
    const depart = conteneurDe(actifId)

    const from = items.findIndex((s) => s.id === actifId)
    const element = items[from]
    if (from < 0 || !element) return

    /* Retiré puis réinséré : devant l'accompagnement survolé, ou en fin de
       bloc quand c'est le bloc lui-même qui est visé (zone vide). */
    const sans = items.filter((s) => s.id !== actifId)
    const deplace: ServiceWithMedia = {
      ...element,
      groupId: cible === SANS_FAMILLE ? null : cible,
      group: groups.find((g) => g.id === cible) ?? null,
    }

    let index = sans.findIndex((s) => s.id === surId)
    if (index < 0) {
      const dernier = sans.reduce(
        (acc, s, i) => (conteneurDe(s.id) === cible ? i : acc),
        -1,
      )
      index = dernier + 1
    }

    const prochain = [...sans.slice(0, index), deplace, ...sans.slice(index)]
    if (depart === cible && from === index) return

    persister(prochain, items)
  }

  /* Ce que le calque doit représenter pendant le glisser. */
  const draggedGroup = dragged ? (groups.find((g) => g.id === dragged) ?? null) : null
  const draggedService = dragged
    ? (items.find((s) => s.id === dragged) ?? null)
    : null

  return {
    blocs,
    dragged,
    draggedGroup,
    draggedService,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
