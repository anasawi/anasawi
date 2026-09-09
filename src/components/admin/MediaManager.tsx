'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { UploadField } from './MediaPicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateMedia } from '@/server/actions/content'
import { deleteMedia } from '@/server/actions/media'
import type { Media } from '@/server/db/schema'

export function MediaManager({ items: initial }: { items: Media[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [editing, setEditing] = useState<Media | null>(null)
  const [alt, setAlt] = useState('')
  const [caption, setCaption] = useState('')
  const [pending, start] = useTransition()

  function openEditor(media: Media) {
    setEditing(media)
    setAlt(media.alt)
    setCaption(media.caption ?? '')
  }

  function save() {
    if (!editing) return

    start(async () => {
      const result = await updateMedia(editing.id, {
        alt,
        caption: caption || null,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setItems((prev) =>
        prev.map((m) =>
          m.id === editing.id ? { ...m, alt, caption: caption || null } : m,
        ),
      )
      toast.success('Média enregistré.')
      setEditing(null)
      router.refresh()
    })
  }

  return (
    <>
      <UploadField onUploaded={(media) => setItems((prev) => [media, ...prev])} />

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
          Aucun média pour l’instant.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((media) => (
            <li
              key={media.id}
              className="overflow-hidden rounded-lg border border-border"
            >
              <span className="relative block aspect-4/3 bg-muted">
                <Image
                  src={media.url}
                  alt={media.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, 240px"
                  className="object-cover"
                />
              </span>

              <div className="p-3">
                <p className="truncate text-xs font-medium">{media.filename}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {media.alt}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {media.width > 0
                    ? `${media.width} × ${media.height}`
                    : 'Vectoriel'}
                </p>

                <div className="mt-2.5 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(media)}
                  >
                    Modifier
                  </Button>
                  <ConfirmDelete
                    label={media.filename}
                    description="Le fichier sera retiré du stockage. Les sections qui l’utilisent afficheront un vide."
                    onConfirm={async () => {
                      const result = await deleteMedia(media.id)
                      if (result.ok) {
                        setItems((prev) =>
                          prev.filter((m) => m.id !== media.id),
                        )
                      }
                      return result
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le média</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="m-alt" className="mb-2 block">
                Texte alternatif <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-alt"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Décrit l’image pour les lecteurs d’écran et pour Google. Il
                s’applique partout où l’image est utilisée.
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
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
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
