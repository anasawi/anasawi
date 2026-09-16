'use client'

import { ImagePlus, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

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
import { cn } from '@/lib/utils'
import { registerMedia } from '@/server/actions/media'
import type { Media } from '@/server/db/schema'

/** Au-delà, un écran ne gagne plus rien : on paie de la bande passante pour rien. */
const MAX_DIMENSION = 2400

/** Doit rester sous la limite de la route d'envoi (4 Mo). */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

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

type Props = {
  value: string | null
  onChange: (id: string | null) => void
  library: Media[]
  label?: string
  className?: string
}

export function MediaPicker({
  value,
  onChange,
  library,
  label = 'Image',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(library)
  const selected = items.find((m) => m.id === value) ?? null

  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>

      {selected ? (
        <div className="group relative aspect-4/3 overflow-hidden rounded-md border border-border bg-muted">
          <Image
            src={selected.url}
            alt={selected.alt}
            fill
            sizes="280px"
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Retirer l’image"
            className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-x-0 bottom-0 bg-background/90 py-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            Changer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
        >
          <ImagePlus className="h-5 w-5" />
          Choisir une image
        </button>
      )}

      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
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

export function MediaLibraryDialog({
  open,
  onOpenChange,
  items,
  onAdd,
  onSelect,
  trigger,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Media[]
  onAdd: (media: Media) => void
  onSelect: (id: string) => void
  trigger?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Médiathèque</DialogTitle>
          <DialogDescription>
            Une image peut être réutilisée dans plusieurs sections. Son texte
            alternatif se corrige alors à un seul endroit.
          </DialogDescription>
        </DialogHeader>

        <UploadField onUploaded={onAdd} />

        <div className="max-h-[52vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune image pour l’instant.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => onSelect(media.id)}
                  className="group overflow-hidden rounded-md border border-border text-left transition-colors hover:border-ring"
                >
                  <span className="relative block aspect-square bg-muted">
                    <Image
                      src={media.url}
                      alt={media.alt}
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  </span>
                  <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">
                    {media.filename}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function UploadField({
  onUploaded,
}: {
  onUploaded: (media: Media) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setAlt('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function submit() {
    if (!file) return
    if (!alt.trim()) {
      toast.error('Le texte alternatif est obligatoire.')
      return
    }

    start(async () => {
      try {
        const prepared = await prepareImage(file)

        if (prepared.data.size > MAX_UPLOAD_BYTES) {
          toast.error('Image trop lourde, même après compression.')
          return
        }

        const body = new FormData()
        body.append(
          'file',
          new File([prepared.data], file.name, { type: prepared.mimeType }),
        )
        body.append('filename', file.name)

        const response = await fetch('/api/upload', { method: 'POST', body })
        const payload: unknown = await response.json()

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof payload.error === 'string'
              ? payload.error
              : 'Upload impossible.'
          toast.error(message)
          return
        }

        const stored = payload as { key: string; url: string }

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
          return
        }

        onUploaded(result.data)
        toast.success('Image ajoutée.')
        reset()
      } catch (error) {
        console.error(error)
        toast.error('Upload impossible.')
      }
    })
  }

  return (
    <div className="rounded-md border border-dashed border-border p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="upload-file" className="mb-1.5 block text-xs">
            Fichier
          </Label>
          <Input
            id="upload-file"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="cursor-pointer text-xs file:mr-3 file:cursor-pointer"
          />
        </div>

        <div>
          <Label htmlFor="upload-alt" className="mb-1.5 block text-xs">
            Texte alternatif <span className="text-destructive">*</span>
          </Label>
          <Input
            id="upload-alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Décrivez l’image en une phrase"
          />
        </div>

        <Button
          type="button"
          onClick={submit}
          disabled={!file || pending}
          className={cn(pending && 'pointer-events-none')}
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? 'Envoi…' : 'Ajouter'}
        </Button>
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground">
        JPEG, PNG, WebP ou AVIF. L’image est redimensionnée et compressée
        automatiquement avant l’envoi — inutile de la préparer vous-même.
      </p>
    </div>
  )
}
