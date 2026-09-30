'use client'

import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  type DropAnimation,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { GripVertical, Plus } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { useActionForm } from './hooks/useActionForm'
import { useSortableSensors } from './hooks/useSortableSensors'
import { useServiceArrangement } from './services/hooks/useServiceArrangement'
import {
  emptyServiceDraft,
  ServiceFormDialog,
  type ServiceDraft,
} from './services/ServiceFormDialog'
import { Famille } from './services/ServiceGroup'
import { Button } from '@/components/ui/button'
import { slugify } from '@/lib/utils'
import {
  createService,
  createServiceGroup,
  deleteService,
  deleteServiceGroup,
  renameServiceGroup,
  toggleService,
  updateService,
} from '@/server/actions/content'
import type { ActionResult } from '@/server/actions/types'
import type {
  Media,
  ServiceGroup,
  ServiceWithMedia,
} from '@/server/db/schema'

/*
 * Écran « Accompagnements ».
 *
 * La liste se lit comme le site : des familles titrées, et en dernier les
 * accompagnements présentés seuls. Tout se manipule directement — on glisse
 * une ligne d'une famille à l'autre, on renomme un titre en cliquant dessus,
 * on en ajoute ou on en retire.
 *
 * Un point de vocabulaire : supprimer un titre ne supprime jamais ce qu'il
 * coiffait. Les accompagnements redescendent simplement parmi ceux qui n'ont
 * pas de famille. C'est ce que la clé étrangère `set null` garantit en base.
 */

/* Le calque retrouve sa place d'arrivée en s'estompant : sans cela, il
   disparaîtrait net et l'œil perdrait le fil du déplacement. */
const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
}

/** Rappel commun aux écrans de contenus : ici, pas d'étape « publier ». */
function NoteEnLigne() {
  return (
    <p className="mb-4 rounded-lg border border-blue-deep/20 bg-blue-mist/30 px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground">
      Les modifications sont visibles sur le site dès que vous enregistrez.
    </p>
  )
}

export function ServicesManager({
  services: initial,
  groups: initialGroups,
  library,
}: {
  services: ServiceWithMedia[]
  groups: ServiceGroup[]
  library: Media[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [groups, setGroups] = useState(initialGroups)
  const [draft, setDraft] = useState<ServiceDraft | null>(null)
  const { pending, start, fieldErrors: erreurs, run } = useActionForm()

  /* Pas d'effet qui recopie les props dans l'état : l'écriture serveur
     revalide la route, les props reviennent, et l'effet écraserait alors le
     résultat optimiste par une version parfois plus ancienne — le
     déplacement semblait « ne pas s'enregistrer ». L'état local fait foi
     jusqu'au prochain rendu complet ; en cas d'échec, on restaure. */

  const sensors = useSortableSensors()
  const {
    blocs,
    dragged,
    draggedGroup,
    draggedService,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useServiceArrangement({ items, setItems, groups, setGroups, start })

  function ajouterFamille() {
    run(() => createServiceGroup('Nouveau titre'), {
      onSuccess: (data) => {
        /* L'état local fait foi (voir plus haut) : `router.refresh()` seul
           ne changeait donc RIEN à l'écran. On cliquait, la notification
           confirmait, et rien n'apparaissait avant un rechargement manuel.
           On pose donc nous-mêmes ce que le serveur vient d'enregistrer. */
        const maintenant = new Date()
        setGroups((prev) => [
          ...prev,
          {
            id: data.id,
            label: 'Nouveau titre',
            sortOrder: prev.length,
            createdAt: maintenant,
            updatedAt: maintenant,
          },
        ])
        router.refresh()
      },
    })
  }

  function renommerFamille(id: string, label: string) {
    const avant = groups
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g)))

    /* Seule écriture de cet écran qui ne confirmait rien. Le libellé
       changeait sous les yeux avant même la réponse du serveur : en cas
       d'échec silencieux, Anne partait convaincue d'avoir enregistré. */
    run(() => renameServiceGroup(id, label), {
      success: 'Titre renommé.',
      onError: (r) => {
        setGroups(avant)
        toast.error(r.error)
      },
    })
  }

  /* Rend le résultat du serveur : la confirmation attend qu'il soit là
     avant d'annoncer « supprimé ». Avant, elle l'annonçait tout de suite,
     et un rechargement rapide annulait la requête en vol — le titre
     réapparaissait, malgré la notification. */
  async function supprimerFamille(id: string): Promise<ActionResult<unknown>> {
    const result = await deleteServiceGroup(id)
    if (!result.ok) return result
    start(() => {
      /* La clé étrangère est en `set null` côté base : les
         accompagnements rejoignent la liste sans titre. L'écran doit
         montrer exactement cela, tout de suite. */
      setGroups((prev) => prev.filter((g) => g.id !== id))
      setItems((prev) =>
        prev.map((s) =>
          s.groupId === id ? { ...s, groupId: null, group: null } : s,
        ),
      )
      router.refresh()
    })
    return result
  }

  function save() {
    if (!draft) return

    const existant = draft.id ? items.find((s) => s.id === draft.id) : null
    const payload = {
      title: draft.title,
      slug: draft.slug || slugify(draft.title),
      excerpt: draft.excerpt,
      body: draft.body,
      duration: draft.duration || null,
      method: draft.method.trim() || null,
      groupId: existant?.groupId ?? null,
      mediaId: draft.mediaId,
      isActive: draft.isActive,
    }

    /*
     * Les deux chemins sont écrits séparément parce que l'état local
     * fait foi (voir plus haut) : sans écriture locale, l'accompagnement
     * créé n'apparaissait NULLE PART et le titre modifié restait
     * l'ancien à l'écran. Anne enregistrait, voyait la confirmation, ne
     * voyait aucun changement — et recommençait, pour se heurter cette
     * fois à « Cette adresse est déjà utilisée ».
     */
    const image = library.find((m) => m.id === payload.mediaId) ?? null

    if (draft.id) {
      const id = draft.id
      run(() => updateService(id, payload), {
        success: 'Accompagnement enregistré.',
        onSuccess: () => {
          setItems((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, ...payload, media: image, updatedAt: new Date() }
                : s,
            ),
          )
          setDraft(null)
          router.refresh()
        },
      })
    } else {
      run(() => createService(payload), {
        success: 'Accompagnement créé.',
        onSuccess: (data) => {
          const maintenant = new Date()
          setItems((prev) => [
            ...prev,
            {
              ...payload,
              id: data.id,
              sortOrder: prev.length,
              media: image,
              group: null,
              createdAt: maintenant,
              updatedAt: maintenant,
            },
          ])
          setDraft(null)
          router.refresh()
        },
      })
    }
  }

  const ouvrirDraft = (service: ServiceWithMedia) =>
    setDraft({
      id: service.id,
      title: service.title,
      slug: service.slug,
      slugEdite: true,
      excerpt: service.excerpt,
      body: service.body,
      duration: service.duration ?? '',
      method: service.method ?? '',
      mediaId: service.mediaId,
      isActive: service.isActive,
    })

  const basculer = (service: ServiceWithMedia, checked: boolean) =>
    run(() => toggleService(service.id, checked), {
      success: checked
        ? 'Accompagnement affiché sur le site.'
        : 'Accompagnement masqué du site.',
      onSuccess: () =>
        setItems((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, isActive: checked } : s)),
        ),
    })

  const supprimer = async (service: ServiceWithMedia) => {
    const result = await deleteService(service.id)
    if (result.ok) setItems((prev) => prev.filter((s) => s.id !== service.id))
    return result
  }

  const vide = items.length === 0 && groups.length === 0

  return (
    <>
      <NoteEnLigne />

      {/* Sur téléphone, les deux boutons passent l'un sous l'autre plutôt
          que de se comprimer ; l'action principale reste en dernier. */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={ajouterFamille} disabled={pending}>
          <Plus />
          Ajouter un titre
        </Button>
        <Button onClick={() => setDraft(emptyServiceDraft)}>
          <Plus />
          Nouvel accompagnement
        </Button>
      </div>

      {vide ? (
        <div className="rounded-lg border border-border bg-white px-6 py-14 text-center">
          <p className="text-[13px] leading-[1.6] text-muted-foreground">
            Aucun accompagnement pour l’instant. Créez le premier pour le
            présenter sur votre site.
          </p>
          <Button className="mt-4" onClick={() => setDraft(emptyServiceDraft)}>
            <Plus />
            Créer un accompagnement
          </Button>
        </div>
      ) : (
        <DndContext
          /* Identifiant fixe : sans lui, dnd-kit génère un compteur différent
             côté serveur et côté client (`DndDescribedBy-N`) — erreur
             d'hydratation React à chaque ouverture de l'écran. */
          id="services-sortable"
          sensors={sensors}
          /* `closestCorners` plutôt que `closestCenter` : avec plusieurs
             conteneurs, c'est lui qui vise juste près des bordures. */
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-4">
            {/* Deux niveaux de tri imbriqués : les familles entre elles, et
                les accompagnements dans chacune. dnd-kit distingue les deux
                par l'identifiant saisi au départ du glisser. */}
            <SortableContext
              items={groups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {groups.map((group) => (
                <Famille
                  key={group.id}
                  group={group}
                  services={blocs.parFamille.get(group.id) ?? []}
                  dragged={dragged}
                  onRename={(label) => renommerFamille(group.id, label)}
                  onDelete={() => supprimerFamille(group.id)}
                  onEdit={ouvrirDraft}
                  onToggle={basculer}
                  onDeleted={supprimer}
                />
              ))}
            </SortableContext>

            <Famille
              group={null}
              services={blocs.orphelins}
              dragged={dragged}
              onEdit={ouvrirDraft}
              onToggle={basculer}
              onDeleted={supprimer}
            />
          </div>

          {/* Calque de glisser : une copie qui suit le pointeur au pixel.
              Sans lui, avec deux niveaux de tri imbriqués, les mesures se
              chassent et l'élément paraît sauter d'une position à l'autre. */}
          <DragOverlay dropAnimation={dropAnimation}>
            {draggedGroup ? (
              <div className="w-full overflow-hidden rounded-lg border border-blue-deep/50 bg-white shadow-xl">
                <p className="border-b border-border bg-ivory/60 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {draggedGroup.label}
                </p>
                <p className="px-4 py-3 text-[12.5px] text-muted-foreground">
                  {(blocs.parFamille.get(draggedGroup.id) ?? []).length}{' '}
                  accompagnement(s)
                </p>
              </div>
            ) : draggedService ? (
              <div className="flex items-center gap-3 rounded-lg border border-blue-deep/50 bg-white px-4 py-3 shadow-xl">
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-muted">
                  {draggedService.media && (
                    <Image
                      src={draggedService.media.url}
                      alt={draggedService.media.alt}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="text-sm font-medium">
                  {draggedService.title}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ServiceFormDialog
        draft={draft}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onSubmit={save}
        pending={pending}
        erreurs={erreurs}
        library={library}
      />
    </>
  )
}
