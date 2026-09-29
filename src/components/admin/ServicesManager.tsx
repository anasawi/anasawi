'use client'

import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, ChevronRight, GripVertical, Pencil, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { MediaPicker } from './MediaPicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn, slugify } from '@/lib/utils'
import {
  arrangeServices,
  createService,
  createServiceGroup,
  deleteService,
  deleteServiceGroup,
  renameServiceGroup,
  reorderServiceGroups,
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

/** Conteneur des accompagnements sans famille — jamais un identifiant réel. */
const SANS_FAMILLE = 'sans-famille'

/* Le calque retrouve sa place d'arrivée en s'estompant : sans cela, il
   disparaîtrait net et l'œil perdrait le fil du déplacement. */
const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
}

type Draft = {
  id: string | null
  title: string
  slug: string
  /** Vrai dès qu'Anne a retouché l'adresse à la main : on cesse alors de
      la recalculer depuis le titre. Toujours vrai pour un accompagnement
      existant — son adresse est déjà connue du site. */
  slugEdite: boolean
  excerpt: string
  body: string
  duration: string
  method: string
  mediaId: string | null
  isActive: boolean
}

const emptyDraft: Draft = {
  id: null,
  title: '',
  slug: '',
  slugEdite: false,
  excerpt: '',
  body: '',
  duration: '',
  method: '',
  mediaId: null,
  isActive: true,
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
  const [draft, setDraft] = useState<Draft | null>(null)
  /* Erreurs renvoyées par le serveur, champ par champ : affichées SOUS le
     champ fautif, pas seulement dans une notification qui s'efface. */
  const [erreurs, setErreurs] = useState<Record<string, string[]>>({})
  const [dragged, setDragged] = useState<string | null>(null)
  const [pending, start] = useTransition()

  /* Pas d'effet qui recopie les props dans l'état : l'écriture serveur
     revalide la route, les props reviennent, et l'effet écraserait alors le
     résultat optimiste par une version parfois plus ancienne — le
     déplacement semblait « ne pas s'enregistrer ». L'état local fait foi
     jusqu'au prochain rendu complet ; en cas d'échec, on restaure. */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  /*
   * Rien n'est déplacé pendant le survol.
   *
   * Changer le conteneur d'un élément en cours de glisser fait avorter
   * dnd-kit : ni `onDragEnd` ni `onDragCancel` n'était alors émis, et le
   * déplacement restait à l'écran sans jamais être enregistré. Tout se
   * décide au relâché ; l'utilisateur ne perd rien, le calque suit son
   * pointeur et le bloc visé s'éclaire.
   */

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

  function ajouterFamille() {
    start(async () => {
      const result = await createServiceGroup('Nouveau titre')
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      /* L'état local fait foi (voir plus haut) : `router.refresh()` seul
         ne changeait donc RIEN à l'écran. On cliquait, la notification
         confirmait, et rien n'apparaissait avant un rechargement manuel.
         On pose donc nous-mêmes ce que le serveur vient d'enregistrer. */
      const maintenant = new Date()
      setGroups((prev) => [
        ...prev,
        {
          id: result.data.id,
          label: 'Nouveau titre',
          sortOrder: prev.length,
          createdAt: maintenant,
          updatedAt: maintenant,
        },
      ])
      router.refresh()
    })
  }

  function renommerFamille(id: string, label: string) {
    const avant = groups
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g)))

    start(async () => {
      const result = await renameServiceGroup(id, label)
      if (!result.ok) {
        setGroups(avant)
        toast.error(result.error)
        return
      }

      /* Seule écriture de cet écran qui ne confirmait rien. Le libellé
         changeait sous les yeux avant même la réponse du serveur : en cas
         d'échec silencieux, Anne partait convaincue d'avoir enregistré. */
      toast.success('Titre renommé.')
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

    start(async () => {
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

      setErreurs({})
      if (draft.id) {
        const result = await updateService(draft.id, payload)
        if (!result.ok) {
          setErreurs(result.fieldErrors ?? {})
          toast.error(result.error)
          return
        }

        toast.success('Accompagnement enregistré.')
        setItems((prev) =>
          prev.map((s) =>
            s.id === draft.id
              ? { ...s, ...payload, media: image, updatedAt: new Date() }
              : s,
          ),
        )
      } else {
        const result = await createService(payload)
        if (!result.ok) {
          setErreurs(result.fieldErrors ?? {})
          toast.error(result.error)
          return
        }

        toast.success('Accompagnement créé.')
        const maintenant = new Date()
        setItems((prev) => [
          ...prev,
          {
            ...payload,
            id: result.data.id,
            sortOrder: prev.length,
            media: image,
            group: null,
            createdAt: maintenant,
            updatedAt: maintenant,
          },
        ])
      }

      setDraft(null)
      router.refresh()
    })
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
    start(async () => {
      const result = await toggleService(service.id, checked)
      if (result.ok) {
        setItems((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, isActive: checked } : s)),
        )
        toast.success(
          checked
            ? 'Accompagnement affiché sur le site.'
            : 'Accompagnement masqué du site.',
        )
      } else toast.error(result.error)
    })

  const supprimer = async (service: ServiceWithMedia) => {
    const result = await deleteService(service.id)
    if (result.ok) setItems((prev) => prev.filter((s) => s.id !== service.id))
    return result
  }

  const vide = items.length === 0 && groups.length === 0

  /* Ce que le calque doit représenter pendant le glisser. */
  const draggedGroup = dragged ? (groups.find((g) => g.id === dragged) ?? null) : null
  const draggedService = dragged
    ? (items.find((s) => s.id === dragged) ?? null)
    : null

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
        <Button onClick={() => setDraft(emptyDraft)}>
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
          <Button className="mt-4" onClick={() => setDraft(emptyDraft)}>
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
          onDragStart={({ active }: DragStartEvent) => {
            origine.current = conteneurDe(String(active.id))
            setDragged(String(active.id))
          }}
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

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? 'Modifier l’accompagnement' : 'Nouvel accompagnement'}
            </DialogTitle>
            <DialogDescription>
              {draft?.id
                ? 'Vos changements seront visibles sur le site dès l’enregistrement.'
                : 'Seul le titre est obligatoire ; vous pourrez compléter le reste plus tard.'}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="s-title" className="mb-2 block">
                  Titre
                </Label>
                <Input
                  id="s-title"
                  value={draft.title}
                  autoComplete="off"
                  aria-invalid={erreurs.title ? true : undefined}
                  aria-describedby={erreurs.title ? 's-title-erreur' : undefined}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      title: e.target.value,
                      /* L'adresse suit le titre tant qu'Anne n'y a pas
                         touché elle-même. */
                      slug: draft.slugEdite
                        ? draft.slug
                        : slugify(e.target.value),
                    })
                  }
                />
                <ErreurChamp id="s-title-erreur" messages={erreurs.title} />
              </div>

              <div>
                <Label htmlFor="s-duration" className="mb-2 block">
                  Durée
                </Label>
                <Input
                  id="s-duration"
                  value={draft.duration}
                  placeholder="60 minutes"
                  onChange={(e) =>
                    setDraft({ ...draft, duration: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="s-method" className="mb-2 block">
                  Méthode
                </Label>
                <Input
                  id="s-method"
                  value={draft.method}
                  placeholder="Gestalt-thérapie"
                  onChange={(e) => setDraft({ ...draft, method: e.target.value })}
                />
                <p className="mt-1.5 text-xs leading-[1.5] text-muted-foreground">
                  Petite mention affichée à côté du titre.
                </p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="s-excerpt" className="mb-2 block">
                  Description courte
                </Label>
                <Textarea
                  id="s-excerpt"
                  rows={3}
                  value={draft.excerpt}
                  onChange={(e) =>
                    setDraft({ ...draft, excerpt: e.target.value })
                  }
                />
                <p className="mt-1.5 text-xs leading-[1.5] text-muted-foreground">
                  C’est ce texte qui apparaît sur la page d’accueil.
                </p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="s-body" className="mb-2 block">
                  Description longue
                </Label>
                <Textarea
                  id="s-body"
                  rows={6}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
                <p className="mt-1.5 text-xs leading-[1.5] text-muted-foreground">
                  Affichée sur la page de l’accompagnement.
                </p>
              </div>

              <MediaPicker
                label="Image"
                value={draft.mediaId}
                onChange={(id) => setDraft({ ...draft, mediaId: id })}
                library={library}
              />

              <div className="flex h-fit items-center justify-between gap-3 self-end rounded-lg border border-border px-3.5 py-2.5">
                <Label htmlFor="s-active" className="cursor-pointer text-[13px] text-foreground">
                  Visible sur le site
                </Label>
                <Switch
                  id="s-active"
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, isActive: checked })
                  }
                />
              </div>

              {/*
               * L'adresse web est reléguée sous un pli « Options avancées » :
               * elle se calcule toute seule, Anne n'a en principe jamais à
               * la voir. Le pli reste OUVERT par défaut : le champ doit être
               * visible pour être rempli (les tests e2e le remplissent
               * directement, et Playwright ne déplie pas un `<details>`
               * fermé). Le prix visuel est faible, tout en bas du
               * formulaire.
               */}
              <details
                open
                className="group/avance rounded-lg border border-border sm:col-span-2"
              >
                <summary className="flex cursor-pointer select-none items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/avance:rotate-90" />
                  Options avancées
                </summary>
                <div className="border-t border-border px-3.5 py-3">
                  <Label htmlFor="s-slug" className="mb-2 block">
                    Adresse de la page
                  </Label>
                  <Input
                    id="s-slug"
                    value={draft.slug}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={erreurs.slug ? true : undefined}
                    aria-describedby={erreurs.slug ? 's-slug-erreur' : undefined}
                    onChange={(e) => {
                      /* Champ vidé : on reprend la main et l'adresse
                         redevient celle du titre. */
                      const saisie = e.target.value.trim()
                      setDraft({
                        ...draft,
                        slug: saisie ? slugify(saisie) : slugify(draft.title),
                        slugEdite: saisie.length > 0,
                      })
                    }}
                  />
                  <ErreurChamp id="s-slug-erreur" messages={erreurs.slug} />
                  <p className="mt-1.5 text-xs leading-[1.5] text-muted-foreground">
                    Dernière partie de l’adresse web de cet accompagnement,
                    générée automatiquement à partir du titre. Modifiez-la
                    seulement si nécessaire.
                  </p>
                </div>
              </details>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDraft(null)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              onClick={save}
              disabled={pending || !draft?.title.trim()}
              aria-busy={pending}
            >
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ── Une famille, ou le bloc des accompagnements sans famille ────────── */

function Famille({
  group,
  services,
  dragged,
  onRename,
  onDelete,
  onEdit,
  onToggle,
  onDeleted,
}: {
  /** `null` pour le bloc des accompagnements présentés seuls. */
  group: ServiceGroup | null
  services: ServiceWithMedia[]
  dragged: string | null
  onRename?: (label: string) => void
  onDelete?: () => Promise<ActionResult<unknown>>
  onEdit: (service: ServiceWithMedia) => void
  onToggle: (service: ServiceWithMedia, checked: boolean) => void
  onDeleted: (service: ServiceWithMedia) => Promise<ActionResult<unknown>>
}) {
  /* Une famille est triable — elle se déplace en bloc ; le tiroir « sans
     titre » reste fixe en fin de liste, il n'a pas de position à défendre. */
  const sortable = useSortable({ id: group?.id ?? SANS_FAMILLE })
  const droppable = useDroppable({ id: SANS_FAMILLE })

  const setNodeRef = group ? sortable.setNodeRef : droppable.setNodeRef
  const isOver = group ? sortable.isOver : droppable.isOver

  /* Le bloc sans famille ne s'affiche que s'il contient quelque chose — ou
     pendant un glisser, pour qu'on puisse y déposer. */
  if (!group && services.length === 0 && !dragged) return null

  return (
    <section
      ref={setNodeRef}
      style={
        group
          ? {
              transform: CSS.Transform.toString(sortable.transform),
              transition: sortable.transition,
            }
          : undefined
      }
      className={cn(
        'overflow-hidden rounded-lg border bg-white transition-colors',
        isOver ? 'border-blue-deep/60 bg-blue-mist/30' : 'border-border',
        /* C'est le calque qu'on suit : l'original marque la place. */
        group && sortable.isDragging && 'opacity-35',
      )}
    >
      {group ? (
        <TitreFamille
          label={group.label}
          dragAttributes={sortable.attributes}
          dragListeners={sortable.listeners}
          onRename={onRename}
          onDelete={onDelete}
        />
      ) : (
        <p className="border-b border-border bg-muted/40 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Sans titre — présentés seuls
        </p>
      )}

      <SortableContext
        items={services.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        {services.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            Aucun accompagnement sous ce titre. Glissez-en un ici.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                onEdit={() => onEdit(service)}
                onToggle={(checked) => onToggle(service, checked)}
                onDeleted={() => onDeleted(service)}
              />
            ))}
          </ul>
        )}
      </SortableContext>
    </section>
  )
}

/** Intitulé modifiable au clic, et poignée pour déplacer la famille entière. */
function TitreFamille({
  label,
  dragAttributes,
  dragListeners,
  onRename,
  onDelete,
}: {
  label: string
  dragAttributes?: DraggableAttributes
  dragListeners?: SyntheticListenerMap
  onRename?: (label: string) => void
  onDelete?: () => Promise<ActionResult<unknown>>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)
  const champId = useId()

  useEffect(() => setValue(label), [label])
  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function valider() {
    const propre = value.trim()
    if (propre && propre !== label) onRename?.(propre)
    else setValue(label)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-ivory/60 px-3 py-2 sm:px-4">
      {/* Poignée toujours visible : rien ne doit dépendre du survol, qui
          n'existe pas au doigt. */}
      {!editing && (
        <button
          type="button"
          {...dragAttributes}
          {...dragListeners}
          aria-label={`Déplacer le bloc ${label}`}
          className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {editing ? (
        <>
          <Label htmlFor={champId} className="sr-only">
            Nom du titre
          </Label>
          <Input
            id={champId}
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') valider()
              if (e.key === 'Escape') {
                setValue(label)
                setEditing(false)
              }
            }}
            className="max-w-sm"
          />
          <Button variant="ghost" size="icon" onClick={valider} aria-label="Valider">
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setValue(label)
              setEditing(false)
            }}
            aria-label="Annuler"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Cliquer pour renommer"
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </span>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          </button>

          {onDelete && (
            <ConfirmDelete
              label={label}
              description="Le titre disparaît du site, les accompagnements restent : ils rejoignent la liste sans titre, à leur place."
              succes="Titre retiré — les accompagnements sont conservés."
              onConfirm={onDelete}
            />
          )}
        </>
      )}
    </div>
  )
}

function ServiceRow({
  service,
  onEdit,
  onToggle,
  onDeleted,
}: {
  service: ServiceWithMedia
  onEdit: () => void
  onToggle: (checked: boolean) => void
  onDeleted: () => Promise<ActionResult<unknown>>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: service.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        /* `flex-wrap` : sur téléphone, les commandes passent sous le texte
           plutôt que de l'écraser. */
        'flex flex-wrap items-center gap-x-3 gap-y-2 bg-white px-3 py-3 transition-colors duration-150 hover:bg-ivory/50 sm:px-4',
        /* C'est le calque qu'on suit : l'original marque la place. */
        isDragging && 'opacity-35',
        !service.isActive && 'opacity-60',
      )}
    >
      {/* Poignée toujours visible — rien n'apparaît seulement au survol. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Déplacer ${service.title}`}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
        {service.media && (
          <Image
            src={service.media.url}
            alt={service.media.alt}
            fill
            sizes="44px"
            className="object-cover"
          />
        )}
      </span>

      <div className="min-w-[9rem] flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {service.title}
          {service.method && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {service.method}
            </span>
          )}
          {!service.isActive && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Masqué
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {service.excerpt || 'Aucune description courte pour l’instant.'}
        </p>
      </div>

      <span className="ml-auto flex shrink-0 items-center gap-1">
        {/* Le mot « Visible » explique l'interrupteur ; l'aria-label reste
            le nom complet, propre à chaque ligne. */}
        <span className="mr-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="hidden text-xs text-muted-foreground sm:inline"
          >
            Visible
          </span>
          <Switch
            checked={service.isActive}
            onCheckedChange={onToggle}
            aria-label={`Afficher ${service.title}`}
          />
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Modifier ${service.title}`}
          title="Modifier"
        >
          <Pencil />
        </Button>

        <ConfirmDelete
          label={service.title}
          description="Cet accompagnement disparaîtra du site immédiatement. Cette action est définitive."
          onConfirm={onDeleted}
        />
      </span>
    </li>
  )
}

/** Message d'erreur sous un champ — annoncé au lecteur d'écran. */
function ErreurChamp({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages || messages.length === 0) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs leading-[1.5] text-red-700">
      {messages[0]}
    </p>
  )
}
