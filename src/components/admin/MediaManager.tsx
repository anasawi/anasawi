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
        <p className="mt-6 rounded-[14px] border-[1.5px] border-dashed border-foreground/20 px-4 py-14 text-center text-[13px] text-muted-foreground">
          Aucune image pour l’instant — ajoutez-en une ci-dessus.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((media) => (
            <li
              key={media.id}
              className="group relative aspect-4/3 overflow-hidden rounded-[10px] border border-border bg-muted"
              title={media.alt}
            >
              <Image
                src={media.url}
                alt={media.alt}
                fill
                sizes="(max-width: 640px) 50vw, 240px"
                className="object-cover"
              />

              {/* Voile sombre + actions, au survol seulement. */}
              <span className="absolute inset-0 hidden items-end gap-1.5 bg-[rgba(28,32,30,0.42)] p-2 group-hover:flex">
                <button
                  type="button"
                  onClick={() => openEditor(media)}
                  className="rounded-md bg-white px-2 py-1 text-[10.5px] text-foreground transition-colors hover:bg-ivory"
                >
                  Modifier
                </button>
                <ConfirmDelete
                  label={media.filename}
                  description="Le fichier sera retiré du stockage. Les sections qui l’utilisent afficheront un vide."
                  trigger={
                    <button
                      type="button"
                      className="rounded-md bg-white px-2 py-1 text-[10.5px] text-red-700 transition-colors hover:bg-ivory"
                    >
                      Supprimer
                    </button>
                  }
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
              </span>
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
