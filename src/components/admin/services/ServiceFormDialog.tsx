'use client'

import { ChevronRight } from 'lucide-react'

import { FieldError } from '../form/FieldError'
import { MediaPicker } from '../MediaPicker'
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
import { slugify } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

export type ServiceDraft = {
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

export const emptyServiceDraft: ServiceDraft = {
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

/**
 * La boîte de création / modification d'un accompagnement.
 *
 * Un vrai `<form>` : Entrée dans un champ vaut « Enregistrer » — et reste
 * sans effet tant que le titre manque, comme le bouton.
 */
export function ServiceFormDialog({
  draft,
  onChange,
  onClose,
  onSubmit,
  pending,
  erreurs,
  library,
}: {
  /** `null` : la boîte est fermée. */
  draft: ServiceDraft | null
  onChange: (draft: ServiceDraft) => void
  onClose: () => void
  onSubmit: () => void
  pending: boolean
  /** Erreurs renvoyées par le serveur, champ par champ : affichées SOUS le
      champ fautif, pas seulement dans une notification qui s'efface. */
  erreurs: Record<string, string[]>
  library: Media[]
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
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

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
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
                    onChange({
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
                <FieldError id="s-title-erreur" messages={erreurs.title} />
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
                    onChange({ ...draft, duration: e.target.value })
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
                  onChange={(e) => onChange({ ...draft, method: e.target.value })}
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
                    onChange({ ...draft, excerpt: e.target.value })
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
                  onChange={(e) => onChange({ ...draft, body: e.target.value })}
                />
                <p className="mt-1.5 text-xs leading-[1.5] text-muted-foreground">
                  Affichée sur la page de l’accompagnement.
                </p>
              </div>

              <MediaPicker
                label="Image"
                value={draft.mediaId}
                onChange={(id) => onChange({ ...draft, mediaId: id })}
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
                    onChange({ ...draft, isActive: checked })
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
                      onChange({
                        ...draft,
                        slug: saisie ? slugify(saisie) : slugify(draft.title),
                        slugEdite: saisie.length > 0,
                      })
                    }}
                  />
                  <FieldError id="s-slug-erreur" messages={erreurs.slug} />
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
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={pending || !draft?.title.trim()}
              aria-busy={pending}
            >
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
