'use client'

import { Clapperboard, ImagePlus, Loader2 } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
} from 'react'
import { toast } from 'sonner'

import { formatTaille, libelleGenre, MediaThumb } from './MediaThumb'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isVideoMimeType } from '@/lib/media-kind'
import { cn } from '@/lib/utils'
import { estUneVideo, preparerLaVideo } from '@/lib/video-compression'
import { registerMedia } from '@/server/actions/media'
import type { Media } from '@/server/db/schema'

/** Au-delà, un écran ne gagne plus rien : on paie de la bande passante pour rien. */
const MAX_DIMENSION = 2400

/** Doit rester sous la limite de la route d'envoi (4 Mo). */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const LIMITE_MO = MAX_UPLOAD_BYTES / (1024 * 1024)

/**
 * Vidéo : une boucle « cinéma » de vingt secondes au plus, en 1280 px au
 * plus — le débit se calcule pour tenir dans les 4 Mo (voir
 * `lib/video-compression.ts`).
 */
const VIDEO_MAX_SECONDS = 20
const VIDEO_MAX_EDGE = 1280

/** Formats d'image acceptés — la même liste que la route d'envoi. */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const IMAGE_FORMATS_LISIBLES = 'JPEG, PNG, WebP ou AVIF'
const VIDEO_FORMATS_LISIBLES = 'MP4, MOV ou WebM'

/** Ce qu'un sélecteur ou un champ d'envoi accepte. */
export type MediaKind = 'image' | 'video'

/** Le média est-il du genre demandé ? */
function estDuGenre(media: Media, kind: MediaKind): boolean {
  return isVideoMimeType(media.mimeType) === (kind === 'video')
}

/* ── Messages d'erreur : humains, jamais techniques ─────────────────── */

const ERREUR_RESEAU =
  'L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez.'

function messageFormat(video: boolean): string {
  return video
    ? `Ce format n’est pas pris en charge. Choisissez une vidéo ${VIDEO_FORMATS_LISIBLES}.`
    : `Ce format n’est pas pris en charge. Choisissez une image ${IMAGE_FORMATS_LISIBLES}.`
}

function messageTropLourd(video: boolean): string {
  return video
    ? `La vidéo reste trop lourde après compression (limite : ${LIMITE_MO} Mo). Essayez avec une vidéo plus courte.`
    : `L’image reste trop lourde après compression (limite : ${LIMITE_MO} Mo). Essayez avec une image plus petite.`
}

/** Traduit la réponse de la route d'envoi en une phrase pour Anne. */
function messageServeur(status: number, video: boolean): string {
  if (status === 413) return messageTropLourd(video)
  if (status === 415) return messageFormat(video)
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous, puis réessayez.'
  return ERREUR_RESEAU
}

type PreparedImage = {
  data: Blob
  mimeType: string
  width: number
  height: number
  blurDataUrl: string | null
}

/**
 * Redimensionne, recompresse et mesure l'image — entièrement côté navigateur.
 *
 * Trois bénéfices d'un seul geste : on évite `sharp` côté serveur (le
 * navigateur a déjà l'image décodée), on ramène une photo d'appareil photo de
 * 8 Mo à quelques centaines de kilooctets — ce qui la fait passer sous la
 * limite de charge utile des fonctions serverless — et on relève les
 * dimensions réelles, qui suppriment tout décalage de mise en page.
 *
 * Le placeholder flouté est produit dans la foulée, sur un canvas de 16 px.
 */
async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file)

  /* `close()` remet width et height à zéro : on relève les dimensions
     d'origine tant que le bitmap est vivant. */
  const sourceWidth = bitmap.width
  const sourceHeight = bitmap.height

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    /* Sans canvas, on renvoie le fichier tel quel : la route refusera s'il
       dépasse la limite, avec un message clair. */
    bitmap.close()
    return {
      data: file,
      mimeType: file.type,
      width: sourceWidth,
      height: sourceHeight,
      blurDataUrl: null,
    }
  }

  context.drawImage(bitmap, 0, 0, width, height)
  const encoded = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.86),
  )

  const thumb = document.createElement('canvas')
  const thumbScale = 16 / Math.max(width, height)
  thumb.width = Math.max(1, Math.round(width * thumbScale))
  thumb.height = Math.max(1, Math.round(height * thumbScale))

  const thumbContext = thumb.getContext('2d')
  let blurDataUrl: string | null = null
  if (thumbContext) {
    thumbContext.drawImage(bitmap, 0, 0, thumb.width, thumb.height)
    blurDataUrl = thumb.toDataURL('image/webp', 0.6)
  }

  bitmap.close()

  /* Si la recompression n'a rien gagné (petite image déjà optimisée), on garde
     l'original plutôt que de dégrader pour rien. */
  if (!encoded || encoded.size >= file.size) {
    return {
      data: file,
      mimeType: file.type,
      width: sourceWidth,
      height: sourceHeight,
      blurDataUrl,
    }
  }

  return { data: encoded, mimeType: 'image/webp', width, height, blurDataUrl }
}

/* ── Sélecteur d'un média, dans un formulaire ───────────────────────── */

type Props = {
  value: string | null
  onChange: (id: string | null) => void
  library: Media[]
  label?: string
  className?: string
  /** Images (par défaut) ou vidéos : le sélecteur ne montre que le genre
      demandé, et l'envoi ne prend que ce genre. */
  kind?: MediaKind
}

export function MediaPicker({
  value,
  onChange,
  library,
  label,
  className,
  kind = 'image',
}: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(library)
  const selected = items.find((m) => m.id === value) ?? null
  const nom = kind === 'video' ? 'vidéo' : 'image'
  const titre = label ?? (kind === 'video' ? 'Vidéo' : 'Image')

  return (
    <div className={className} role="group" aria-label={titre}>
      <Label className="mb-2 block">{titre}</Label>

      {selected ? (
        <div className="overflow-hidden rounded-[8px] border border-border bg-card">
          <div className="relative aspect-4/3 bg-muted">
            <MediaThumb media={selected} sizes="280px" />
          </div>
          <div className="px-2.5 pt-2">
            <p className="truncate text-[13px] text-foreground" title={selected.alt}>
              {selected.alt}
            </p>
          </div>
          {/* Les actions sont toujours visibles : rien au survol seulement. */}
          <div className="flex gap-2 p-2.5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(true)}
            >
              Changer
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => onChange(null)}
            >
              Retirer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-4/3 min-h-9 w-full flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-line-strong bg-card text-[13px] text-ink-soft transition-colors hover:border-blue-deep hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {kind === 'video' ? (
            <Clapperboard className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          )}
          Choisir une {nom}
        </button>
      )}

      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        kind={kind}
        items={items}
        onAdd={(media) => setItems((prev) => [media, ...prev])}
        onSelect={(id) => {
          onChange(id)
          setOpen(false)
        }}
      />
    </div>
  )
}

/* ── Le dialogue « Choisir une image » ──────────────────────────────── */

export function MediaLibraryDialog({
  open,
  onOpenChange,
  items,
  onAdd,
  onSelect,
  trigger,
  kind = 'image',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Media[]
  onAdd: (media: Media) => void
  onSelect: (id: string) => void
  trigger?: React.ReactNode
  kind?: MediaKind
}) {
  const visibles = items.filter((media) => estDuGenre(media, kind))
  const nom = kind === 'video' ? 'vidéo' : 'image'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      {/* Sur téléphone, le dialogue prend tout l'écran et défile ; à partir
          d'une tablette, c'est une fenêtre centrée de hauteur bornée. */}
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-4 rounded-none sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:rounded-[8px]">
        <DialogHeader>
          <DialogTitle>Choisir une {nom}</DialogTitle>
          <DialogDescription>
            Cliquez sur une {nom} pour l’utiliser, ou ajoutez-en une nouvelle.
          </DialogDescription>
        </DialogHeader>

        <UploadField onUploaded={onAdd} kind={kind} compact />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibles.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              Aucune {nom} pour l’instant.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibles.map((media) => (
                <li key={media.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(media.id)}
                    className="group block w-full overflow-hidden rounded-[8px] border border-border bg-card text-left transition-colors hover:border-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="relative block aspect-square bg-muted">
                      <MediaThumb media={media} sizes="180px" />
                    </span>
                    <span
                      className="block truncate px-2.5 py-2 text-[12px] text-ink-soft"
                      title={media.alt}
                    >
                      {media.alt}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Ajouter un média : bouton, glisser-déposer, description, envoi ─── */

/** Ce que l'écran parent peut demander au champ : ouvrir le choix de fichier. */
export type UploadFieldHandle = { choisir: () => void }

export const UploadField = forwardRef<
  UploadFieldHandle,
  {
    onUploaded: (media: Media) => void
    /** Images (par défaut) ou vidéos — le champ n'accepte qu'un genre à la
        fois, et prépare le fichier en conséquence. */
    kind?: MediaKind
    /** Prévient le parent qu'un fichier est en cours d'ajout (ou plus). */
    onFileChange?: (file: File | null) => void
    /** Version basse, pour un dialogue. */
    compact?: boolean
  }
>(function UploadField({ onUploaded, kind = 'image', onFileChange, compact = false }, ref) {
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [pending, start] = useTransition()
  /** Avancement de la recompression vidéo (0 à 1), null sinon. */
  const [progression, setProgression] = useState<number | null>(null)
  /** Un fichier est en train d'être glissé au-dessus de la zone. */
  const [survol, setSurvol] = useState(false)
  /** Aperçu local du fichier choisi, avant l'envoi. */
  const [apercu, setApercu] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const altRef = useRef<HTMLInputElement>(null)
  const video = kind === 'video'
  const nom = video ? 'vidéo' : 'image'
  const inputId = `upload-file-${kind}`
  const altId = `upload-alt-${kind}`

  useImperativeHandle(ref, () => ({ choisir: () => inputRef.current?.click() }), [])

  /* Aperçu : une URL locale, libérée dès que le fichier change. */
  useEffect(() => {
    if (!file) {
      setApercu(null)
      return
    }
    const url = URL.createObjectURL(file)
    setApercu(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function choisir(candidat: File | null) {
    if (!candidat) return
    if (video ? !estUneVideo(candidat) : !IMAGE_MIME_TYPES.includes(candidat.type)) {
      toast.error(messageFormat(video))
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile(candidat)
    onFileChange?.(candidat)
    /* La description est la seule chose qui manque : on y met le curseur. */
    setTimeout(() => altRef.current?.focus(), 0)
  }

  function reset() {
    setFile(null)
    setAlt('')
    setProgression(null)
    onFileChange?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function submit() {
    if (!file) return
    if (!alt.trim()) {
      toast.error(
        video
          ? 'La description de la vidéo est obligatoire.'
          : 'La description de l’image est obligatoire.',
      )
      altRef.current?.focus()
      return
    }
    if (video && !estUneVideo(file)) {
      toast.error(messageFormat(true))
      return
    }

    start(async () => {
      try {
        const prepared = video
          ? await preparerLaVideo(file, {
              maxBytes: MAX_UPLOAD_BYTES,
              maxSeconds: VIDEO_MAX_SECONDS,
              maxEdge: VIDEO_MAX_EDGE,
              onProgress: setProgression,
            })
          : await prepareImage(file)

        if (prepared.data.size > MAX_UPLOAD_BYTES) {
          toast.error(messageTropLourd(video))
          setProgression(null)
          return
        }

        const body = new FormData()
        body.append(
          'file',
          new File([prepared.data], file.name, { type: prepared.mimeType }),
        )
        body.append('filename', file.name)

        let response: Response
        try {
          response = await fetch('/api/upload', { method: 'POST', body })
        } catch {
          toast.error(ERREUR_RESEAU)
          setProgression(null)
          return
        }

        if (!response.ok) {
          toast.error(messageServeur(response.status, video))
          setProgression(null)
          return
        }

        const stored = (await response.json()) as { key: string; url: string }

        const result = await registerMedia({
          url: stored.url,
          pathname: stored.key,
          filename: file.name,
          alt: alt.trim(),
          width: prepared.width,
          height: prepared.height,
          blurDataUrl: prepared.blurDataUrl,
          mimeType: prepared.mimeType,
          size: prepared.data.size,
        })

        if (!result.ok) {
          toast.error(result.error)
          setProgression(null)
          return
        }

        onUploaded(result.data)
        toast.success(video ? 'Vidéo ajoutée.' : 'Image ajoutée.')
        reset()
      } catch (error) {
        console.error(error)
        /* La recompression vidéo explique elle-même ce qui bloque (navigateur,
           fichier illisible) ; pour le reste, une phrase simple. */
        toast.error(error instanceof Error && video ? error.message : ERREUR_RESEAU)
        setProgression(null)
      }
    })
  }

  const etat = !pending
    ? 'Ajouter'
    : progression !== null && progression < 1
      ? `Compression… ${Math.round(progression * 100)} %`
      : 'Envoi…'

  const aide = video
    ? `${VIDEO_FORMATS_LISIBLES}, depuis votre téléphone ou votre ordinateur. La vidéo est raccourcie à ${VIDEO_MAX_SECONDS} secondes, sans son, et allégée automatiquement avant l’envoi.`
    : `${IMAGE_FORMATS_LISIBLES}. L’image est réduite et allégée automatiquement avant l’envoi — inutile de la préparer vous-même.`

  return (
    <div>
      {/* Le champ de fichier reste dans la page (les tests et le clavier
          s'en servent) mais c'est le bouton et la zone qui se voient. */}
      <Label htmlFor={inputId} className="sr-only">
        Fichier
      </Label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        /* `video/*` : sur un téléphone, la pellicule ET la caméra sont
           proposées ; un `.mov` d'iPhone est accepté puis réencodé. */
        accept={video ? 'video/*,.mov,.mp4,.m4v,.webm' : IMAGE_MIME_TYPES.join(',')}
        onChange={(e) => choisir(e.target.files?.[0] ?? null)}
        className="sr-only"
        tabIndex={-1}
      />

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setSurvol(true)
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault()
            setSurvol(false)
            choisir(e.dataTransfer.files?.[0] ?? null)
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[8px] border border-dashed bg-card text-center transition-colors',
            compact ? 'px-4 py-4' : 'px-4 py-8',
            survol ? 'border-blue-deep bg-blue-mist' : 'border-line-strong hover:border-blue-deep',
          )}
        >
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            {video ? <Clapperboard aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
            Ajouter une {nom}
          </Button>
          <p className="text-[13px] text-ink-soft">
            Glissez une {nom} ici ou cliquez pour choisir
          </p>
          <p className="max-w-[46ch] text-[12px] leading-[1.5] text-stone">{aide}</p>
        </div>
      ) : (
        <div className="rounded-[8px] border border-border bg-card p-3">
          <div className="flex items-start gap-3">
            {/* Aperçu du fichier choisi, avant même l'envoi. */}
            <span className="relative block h-[64px] w-[84px] shrink-0 overflow-hidden rounded-[8px] bg-muted">
              {apercu &&
                (video ? (
                  <video
                    src={apercu}
                    muted
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local, pas une URL distante
                  <img src={apercu} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground" title={file.name}>
                {file.name}
              </p>
              <p className="text-[12px] text-stone">
                {libelleGenre({ mimeType: video ? 'video/' : file.type })}
                {file.size > 0 ? ` · ${formatTaille(file.size)}` : ''}
              </p>
              {!pending && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 -ml-3"
                  onClick={reset}
                >
                  Choisir un autre fichier
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3">
            <Label htmlFor={altId} className="mb-1.5 block">
              Description de {video ? 'la vidéo' : 'l’image'}{' '}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id={altId}
              ref={altRef}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              required
              aria-describedby={`${altId}-aide`}
              placeholder={
                video ? 'Ce qu’on voit dans la vidéo, en une phrase' : 'Ce qu’on voit sur l’image, en une phrase'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <p id={`${altId}-aide`} className="mt-1.5 text-[12px] leading-[1.5] text-stone">
              Obligatoire. Cette phrase est lue à voix haute par les lecteurs d’écran et aide Google à comprendre {nom === 'image' ? 'l’image' : 'la vidéo'}.
            </p>
          </div>

          {/* Avancement : la compression vidéo est en temps réel, on le montre. */}
          {pending && progression !== null && progression < 1 && (
            <div
              role="progressbar"
              aria-label="Compression de la vidéo"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progression * 100)}
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-mist"
            >
              <div
                className="h-full rounded-full bg-blue-deep transition-[width]"
                style={{ width: `${Math.round(progression * 100)}%` }}
              />
            </div>
          )}

          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={reset} disabled={pending}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={pending}
              className={cn(pending && 'pointer-events-none')}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {etat}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
