'use client'

import {
  Clapperboard,
  Folder,
  FolderPlus,
  ImagePlus,
  Inbox,
  Layers,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { PASTELS } from './editor/pastels'
import { type MediaKind, UploadField, type UploadFieldHandle } from './MediaPicker'
import { formatTaille, MediaMeta, MediaThumb } from './MediaThumb'
import { PageHeader } from './PageHeader'
import { ActionMenu } from '@/components/ui/action-menu'
import { Button, buttonVariants } from '@/components/ui/button'
import { Choice } from '@/components/ui/choice'
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
import { isVideoMimeType } from '@/lib/media-kind'
import { cn } from '@/lib/utils'
import { deleteMedia, updateMedia } from '@/server/actions/media'
import {
  createMediaFolder,
  deleteMediaFolder,
  moveMediaToFolder,
  renameMediaFolder,
} from '@/server/actions/media-folders'
import type { Media, MediaFolder } from '@/server/db/schema'

/**
 * La médiathèque — l'écran « Fichiers » de l'espace Qeeps.
 *
 * À gauche, les dossiers : « Tous les fichiers », chaque dossier avec sa
 * pastille de couleur et son compte, « Non classés », et « Nouveau
 * dossier ». À droite, le dossier ouvert : ses fichiers en vignettes, et
 * en bas la zone d'ajout — un fichier envoyé arrive dans le dossier ouvert.
 *
 * Ranger : glisser une vignette sur un dossier, ou choisir le dossier
 * dans la fenêtre « Modifier ». Supprimer un dossier ne supprime aucun
 * fichier : ils redeviennent non classés.
 */

/** Les deux genres qu'on peut ajouter — libellés attendus par les tests. */
const GENRES: readonly { valeur: MediaKind; libelle: string }[] = [
  { valeur: 'image', libelle: 'Une image' },
  { valeur: 'video', libelle: 'Une vidéo' },
]

/** « Tous les fichiers », « Non classés », ou l'identifiant d'un dossier. */
type Vue = 'tous' | 'non-classes' | string

const DRAG_TYPE = 'application/x-anasawi-media'

const pluriel = (n: number, un: string, plusieurs: string) =>
  `${n} ${n > 1 ? plusieurs : un}`

export function MediaManager({
  items: initial,
  folders: initialFolders,
}: {
  items: Media[]
  folders: MediaFolder[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [folders, setFolders] = useState(initialFolders)
  const [vue, setVue] = useState<Vue>('tous')
  const [editing, setEditing] = useState<Media | null>(null)
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [dossierEdite, setDossierEdite] = useState<string>('aucun')
  const [pending, start] = useTransition()
  const [genre, setGenre] = useState<MediaKind>('image')
  const [creation, setCreation] = useState<string | null>(null)
  const [renommage, setRenommage] = useState<string | null>(null)
  const [survolDossier, setSurvolDossier] = useState<Vue | null>(null)
  const upload = useRef<UploadFieldHandle>(null)
  const zoneAjout = useRef<HTMLDivElement>(null)

  const dossierCourant = folders.find((f) => f.id === vue) ?? null
  const folderIdCourant = dossierCourant?.id ?? null

  const compte = useMemo(() => {
    const parDossier = new Map<string | null, number>()
    for (const m of items) parDossier.set(m.folderId, (parDossier.get(m.folderId) ?? 0) + 1)
    return parDossier
  }, [items])

  const visibles =
    vue === 'tous'
      ? items
      : vue === 'non-classes'
        ? items.filter((m) => !m.folderId)
        : items.filter((m) => m.folderId === vue)

  const titre =
    vue === 'tous' ? 'Tous les fichiers' : vue === 'non-classes' ? 'Non classés' : (dossierCourant?.name ?? '')

  const pastelDe = (folderId: string) => {
    const i = folders.findIndex((f) => f.id === folderId)
    return PASTELS[(Math.max(0, i) + 1) % PASTELS.length]!
  }

  /* ── Fichiers ─────────────────────────────────────────────────────── */

  function openEditor(media: Media) {
    setEditing(media)
    setAlt(media.alt)
    setCaption(media.caption ?? '')
    setDossierEdite(media.folderId ?? 'aucun')
  }

  function save() {
    if (!editing) return
    const cible = dossierEdite === 'aucun' ? null : dossierEdite
    start(async () => {
      const result = await updateMedia(editing.id, { alt, caption: caption || null })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (cible !== editing.folderId) {
        const range = await moveMediaToFolder(editing.id, cible)
        if (!range.ok) {
          toast.error(range.error)
          return
        }
      }
      setItems((prev) =>
        prev.map((m) =>
          m.id === editing.id ? { ...m, alt, caption: caption || null, folderId: cible } : m,
        ),
      )
      toast.success('Modifications enregistrées.')
      setEditing(null)
      router.refresh()
    })
  }

  function ranger(mediaId: string, cible: string | null) {
    const avant = items
    const media = items.find((m) => m.id === mediaId)
    if (!media || media.folderId === cible) return
    setItems((prev) => prev.map((m) => (m.id === mediaId ? { ...m, folderId: cible } : m)))
    start(async () => {
      const result = await moveMediaToFolder(mediaId, cible)
      if (!result.ok) {
        setItems(avant)
        toast.error(result.error)
        return
      }
      const nom = cible ? folders.find((f) => f.id === cible)?.name : 'Non classés'
      toast.success(`Rangé dans « ${nom} ».`)
    })
  }

  /* ── Dossiers ─────────────────────────────────────────────────────── */

  function creerDossier(nomBrut: string) {
    const nom = nomBrut.trim()
    setCreation(null)
    if (!nom) return
    start(async () => {
      const result = await createMediaFolder(nom)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setFolders((prev) => [...prev, result.data])
      setVue(result.data.id)
      toast.success(`Dossier « ${nom} » créé.`)
    })
  }

  function renommerDossier(id: string, nomBrut: string) {
    const nom = nomBrut.trim()
    setRenommage(null)
    const dossier = folders.find((f) => f.id === id)
    if (!nom || !dossier || nom === dossier.name) return
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: nom } : f)))
    start(async () => {
      const result = await renameMediaFolder(id, nom)
      if (!result.ok) {
        setFolders((prev) => prev.map((f) => (f.id === id ? dossier : f)))
        toast.error(result.error)
        return
      }
      toast.success('Dossier renommé.')
    })
  }

  async function supprimerDossier(id: string) {
    const result = await deleteMediaFolder(id)
    if (result.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== id))
      setItems((prev) => prev.map((m) => (m.folderId === id ? { ...m, folderId: null } : m)))
      setVue('tous')
    }
    return result
  }

  /* ── Glisser une vignette sur un dossier ──────────────────────────── */

  const cibleDeDepot = (v: Vue) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setSurvolDossier(v)
    },
    onDragLeave: () => setSurvolDossier((s) => (s === v ? null : s)),
    onDrop: (e: React.DragEvent) => {
      const id = e.dataTransfer.getData(DRAG_TYPE)
      setSurvolDossier(null)
      if (!id) return
      e.preventDefault()
      ranger(id, v === 'non-classes' || v === 'tous' ? null : v)
    },
  })

  /* ── Rendu ────────────────────────────────────────────────────────── */

  const ligneDossier = (
    v: Vue,
    libelle: string,
    n: number,
    pastille: React.ReactNode,
  ) => {
    const actif = vue === v
    const survole = survolDossier === v
    return (
      <li key={v}>
        <button
          type="button"
          onClick={() => setVue(v)}
          aria-current={actif ? 'true' : undefined}
          {...(v !== 'tous' ? cibleDeDepot(v) : {})}
          className={cn(
            'group flex h-[52px] w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] font-medium transition-[background-color,color,box-shadow] duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            actif ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(22,73,81,0.06)]' : 'text-[#46606c] hover:bg-white/60 hover:text-foreground',
            survole && 'bg-white shadow-[0_0_0_2px_var(--page-fg)]',
          )}
        >
          {pastille}
          <span className="min-w-0 flex-1 truncate">{libelle}</span>
          <span className="text-[12px] tabular-nums text-[#8aa4a8]">{n}</span>
        </button>
      </li>
    )
  }

  const tuile = (icone: React.ReactNode, bg: string, fg: string) => (
    <span
      aria-hidden="true"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.06]"
      style={{ background: bg, color: fg }}
    >
      {icone}
    </span>
  )

  const nonClasses = compte.get(null) ?? 0

  return (
    <>
      <PageHeader
        overline="Images et vidéos"
        title="Médias"
        description={`${pluriel(items.length, 'fichier', 'fichiers')} · ${pluriel(folders.length, 'dossier', 'dossiers')}`}
        action={
          <button
            type="button"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            onClick={() => {
              zoneAjout.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              upload.current?.choisir()
            }}
          >
            <Upload strokeWidth={1.8} />
            Envoyer des fichiers
          </button>
        }
      />

      <div className="grid gap-2 rounded-[24px] bg-block p-2 bloc-ecran lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ── Les dossiers ─────────────────────────────────────────── */}
        <nav aria-label="Dossiers" className="min-h-0 overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin] lg:p-2">
          <ul className="flex flex-col gap-0.5">
            {ligneDossier(
              'tous',
              'Tous les fichiers',
              items.length,
              tuile(<Layers className="h-4 w-4" strokeWidth={1.8} />, PASTELS[0]!.bg, PASTELS[0]!.fg),
            )}
          </ul>

          <p className="px-3 pb-1.5 pt-5 text-[13px] font-medium text-[#8aa4a8]">Dossiers</p>
          <ul className="flex flex-col gap-0.5">
            {folders.map((f) =>
              renommage === f.id ? (
                <li key={f.id} className="px-1 py-1">
                  <Input
                    autoFocus
                    aria-label={`Nouveau nom de « ${f.name} »`}
                    defaultValue={f.name}
                    onBlur={(e) => renommerDossier(f.id, e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renommerDossier(f.id, e.currentTarget.value)
                      if (e.key === 'Escape') setRenommage(null)
                    }}
                  />
                </li>
              ) : (
                ligneDossier(
                  f.id,
                  f.name,
                  compte.get(f.id) ?? 0,
                  tuile(<Folder className="h-4 w-4" strokeWidth={1.8} />, pastelDe(f.id).bg, pastelDe(f.id).fg),
                )
              ),
            )}
            {(nonClasses > 0 || vue === 'non-classes') &&
              ligneDossier(
                'non-classes',
                'Non classés',
                nonClasses,
                tuile(<Inbox className="h-4 w-4" strokeWidth={1.8} />, '#e9eced', '#6b8186'),
              )}
            <li className="pt-1">
              {creation !== null ? (
                <div className="px-1 py-1">
                  <Input
                    autoFocus
                    aria-label="Nom du nouveau dossier"
                    placeholder="Nom du dossier"
                    value={creation}
                    onChange={(e) => setCreation(e.target.value)}
                    onBlur={() => creerDossier(creation)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') creerDossier(creation)
                      if (e.key === 'Escape') setCreation(null)
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreation('')}
                  className="group/add flex items-center gap-[7px] rounded-[8px] px-3 py-2 text-[13.5px] font-medium text-[#176c79] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FolderPlus className="h-4 w-4 transition-transform duration-300 group-hover/add:-rotate-6 group-hover/add:scale-110" strokeWidth={1.8} />
                  Nouveau dossier
                </button>
              )}
            </li>
          </ul>
        </nav>

        {/* ── Le dossier ouvert ─────────────────────────────────────── */}
        <section
          aria-label={titre}
          className="flex min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain rounded-[20px] bg-white p-5 [scrollbar-width:thin] sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 key={vue} className="truncate text-[16px] font-semibold text-foreground animate-[adm-fade_0.3s_ease_both]">
                {titre}
              </h2>
              <p className="mt-0.5 text-[13px] text-[#8aa4a8]">
                {pluriel(visibles.length, 'fichier', 'fichiers')}
              </p>
            </div>
            {dossierCourant && (
              <div className="flex shrink-0 items-center gap-1">
                <ActionMenu
                  label={`Actions du dossier « ${dossierCourant.name} »`}
                  items={[
                    {
                      label: 'Renommer',
                      icon: <Pencil />,
                      onSelect: () => setRenommage(dossierCourant.id),
                    },
                  ]}
                />
                <ConfirmDelete
                  label={dossierCourant.name}
                  description="Les fichiers du dossier ne sont pas supprimés : ils redeviennent non classés."
                  succes="Dossier supprimé."
                  onConfirm={() => supprimerDossier(dossierCourant.id)}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Supprimer le dossier ${dossierCourant.name}`}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  }
                />
              </div>
            )}
          </div>

          {/* ── Ajouter, dans le dossier ouvert — EN HAUT, sur une ligne ── */}
          <div ref={zoneAjout} className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div role="group" aria-label="Que voulez-vous ajouter ?" className="flex shrink-0 gap-0.5 self-start rounded-[12px] bg-block p-1 sm:self-auto">
              {GENRES.map(({ valeur, libelle }) => (
                <button
                  key={valeur}
                  type="button"
                  aria-pressed={genre === valeur}
                  onClick={() => setGenre(valeur)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    genre === valeur
                      ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(22,73,81,0.08)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {valeur === 'video' ? (
                    <Clapperboard className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {libelle}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <UploadField
                key={genre}
                ref={upload}
                kind={genre}
                ligne
                folderId={folderIdCourant}
                onUploaded={(media) => setItems((prev) => [media, ...prev])}
              />
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-block px-6 py-14 text-center">
              <span className="mb-2 grid h-12 w-12 place-items-center rounded-[14px] bg-white text-[#8aa4a8]">
                <Folder className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <p className="text-[16px] font-semibold text-foreground">Ce dossier est vide</p>
              <p className="max-w-[40ch] text-[14px] text-muted-foreground">
                Glissez-y des fichiers depuis « Tous les fichiers », ou envoyez-en
                de nouveaux ci-dessous.
              </p>
            </div>
          ) : (
            <ul aria-label="Vos médias" className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
              {visibles.map((media) => {
                const estVideo = isVideoMimeType(media.mimeType)
                return (
                  <li
                    key={media.id}
                    title={media.alt}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_TYPE, media.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className="group relative flex min-w-0 cursor-grab flex-col animate-[adm-pop_0.35s_cubic-bezier(0.22,1,0.36,1)] active:cursor-grabbing"
                  >
                    <button
                      type="button"
                      onClick={() => openEditor(media)}
                      /* Nommé « Modifier », décrit par le nom du fichier : la
                         description (« … à supprimer ») ne doit pas finir
                         dans le nom du bouton, où elle le confondait avec
                         la commande « Supprimer ». */
                      aria-label="Modifier"
                      aria-describedby={`media-nom-${media.id}`}
                      className="relative block aspect-4/3 overflow-hidden rounded-[12px] bg-block transition-shadow duration-300 hover:shadow-[0_10px_30px_rgba(22,73,81,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* Un logo se montre en entier, posé sur blanc ; une photo remplit sa vignette. */}
                      <MediaThumb
                        media={media}
                        sizes="(max-width: 640px) 50vw, 220px"
                        className={/^logo\b/i.test(media.alt) || /svg/i.test(media.mimeType) ? 'bg-white object-contain p-3' : 'object-cover'}
                      />
                      {estVideo && (
                        <span className="absolute bottom-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-foreground">
                          <Clapperboard className="h-3 w-3" strokeWidth={2} />
                        </span>
                      )}
                    </button>

                    <div className="mt-2 flex min-w-0 items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <p id={`media-nom-${media.id}`} className="truncate text-[14px] font-medium text-foreground">{media.alt}</p>
                        <p className="text-[12px] text-[#8aa4a8]">
                          {[estVideo ? 'Vidéo' : 'Image', formatTaille(media.size)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {/* Visible au survol, au clavier et au doigt. */}
                      <div className="flex shrink-0 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                        <ConfirmDelete
                          label={media.alt}
                          description={`Si cette ${estVideo ? 'vidéo' : 'image'} est utilisée sur le site, elle n’y apparaîtra plus.`}
                          onConfirm={async () => {
                            const result = await deleteMedia(media.id)
                            if (result.ok) setItems((prev) => prev.filter((m) => m.id !== media.id))
                            return result
                          }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

        </section>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Modifier {editing && isVideoMimeType(editing.mimeType) ? 'la vidéo' : 'l’image'}
            </DialogTitle>
            <DialogDescription>
              La description s’applique partout où ce média est utilisé sur le site.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="flex items-center gap-3 rounded-[16px] bg-block p-2.5">
              <span className="relative block h-[56px] w-[74px] shrink-0 overflow-hidden rounded-[10px] bg-muted">
                <MediaThumb media={editing} sizes="74px" />
              </span>
              <MediaMeta media={editing} />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="m-alt" className="mb-2 block">
                Description{' '}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="m-alt"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                required
                aria-describedby="m-alt-aide"
              />
              <p id="m-alt-aide" className="mt-1.5 text-[12px] leading-[17px] text-muted-foreground">
                Obligatoire. Ce qu’on voit, en une phrase : lue à voix haute par les
                lecteurs d’écran, et utile à Google.
              </p>
            </div>

            <div>
              <Label htmlFor="m-caption" className="mb-2 block">
                Légende
              </Label>
              <Input
                id="m-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                aria-describedby="m-caption-aide"
              />
              <p id="m-caption-aide" className="mt-1.5 text-[12px] leading-[17px] text-muted-foreground">
                Facultatif. Un texte affiché sous le média, quand la section le prévoit.
              </p>
            </div>

            <Choice
              id="m-dossier"
              label="Dossier"
              value={dossierEdite}
              onChange={setDossierEdite}
              options={[
                { value: 'aucun', label: 'Non classé' },
                ...folders.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={save} disabled={pending || !alt.trim()}>
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
