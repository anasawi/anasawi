'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy,
  ExternalLink,
  EyeOff,
  Home,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, slugify } from '@/lib/utils'
import {
  createPage,
  deletePage,
  duplicatePage,
  unpublishPage,
} from '@/server/actions/pages'
import type { Page } from '@/server/db/schema'

/**
 * Gestionnaire de pages : créer, dupliquer, dépublier, supprimer.
 *
 * Chaque page s'édite dans le même éditeur que l'accueil — templates,
 * autosave, brouillon → publier. Une page créée naît en brouillon :
 * invisible du public tant qu'elle n'est pas publiée depuis son éditeur.
 */
export function PagesManager({ pages }: { pages: Page[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  /** Page dont la suppression attend confirmation, dans sa ligne. */
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const submit = () => {
    start(async () => {
      const result = await createPage({ title, slug })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Page créée — en brouillon.')
      setCreating(false)
      setTitle('')
      setSlug('')
      setSlugTouched(false)
      router.push(`/admin/pages/${result.data.id}`)
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Création ─────────────────────────────────────────────── */}
      {creating ? (
        <form
          className="space-y-3 rounded-xl border border-border bg-white px-[22px] py-5"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div>
            <Label htmlFor="new-title" className="mb-1.5 block">
              Titre de la page
            </Label>
            <Input
              id="new-title"
              autoFocus
              value={title}
              placeholder="Mon approche"
              onChange={(e) => {
                setTitle(e.target.value)
                if (!slugTouched) setSlug(slugify(e.target.value))
              }}
            />
          </div>
          <div>
            <Label htmlFor="new-slug" className="mb-1.5 block">
              Adresse
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="text-[0.8rem] text-muted-foreground">
                anasawi.com/
              </span>
              <Input
                id="new-slug"
                value={slug}
                placeholder="mon-approche"
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              className="rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
              disabled={pending || !title || !slug}
            >
              Créer la page
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreating(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button
            className="rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
            onClick={() => setCreating(true)}
          >
            <Plus />
            Nouvelle page
          </Button>
        </div>
      )}

      {/* ── Liste ────────────────────────────────────────────────── */}
      {pages.length === 0 && (
        /* Cas rare (l'accueil est amorcé par `db:seed`), mais une liste
           vide sans un mot ressemble à une panne. */
        <div className="rounded-xl border border-border bg-white px-6 py-14 text-center">
          <p className="text-[13px] text-muted-foreground">
            Aucune page pour l’instant — créez la première avec « Nouvelle
            page », ou lancez <code>npm run db:seed</code> pour amorcer
            l’accueil.
          </p>
        </div>
      )}
      <ul
        className={cn(
          'divide-y divide-border overflow-hidden rounded-xl border border-border bg-white',
          pages.length === 0 && 'hidden',
        )}
      >
        {pages.map((page) => {
          const published = page.status === 'published'
          return (
            <li
              key={page.id}
              className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-ivory/50"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[0.88rem] text-foreground">
                  {page.isHome && (
                    <Home className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{page.title}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-1.5 py-px text-[0.62rem] font-medium',
                      published
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {published ? 'Publiée' : 'Brouillon'}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[0.72rem] text-muted-foreground">
                  {page.isHome ? '/' : `/${page.slug}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {published && (
                  <a
                    href={page.isHome ? '/' : `/${page.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Voir la page"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  title="Dupliquer"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const result = await duplicatePage(page.id)
                      if (result.ok) {
                        toast.success('Page dupliquée — en brouillon.')
                        router.refresh()
                      } else toast.error(result.error)
                    })
                  }
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {!page.isHome && published && (
                  <button
                    type="button"
                    title="Dépublier — la page redevient invisible"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await unpublishPage(page.id)
                        if (result.ok) {
                          toast.success('Page dépubliée.')
                          router.refresh()
                        } else toast.error(result.error)
                      })
                    }
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                )}
                {!page.isHome && confirmDelete !== page.id && (
                  <button
                    type="button"
                    title="Supprimer"
                    aria-label="Supprimer"
                    disabled={pending}
                    onClick={() => setConfirmDelete(page.id)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Confirmation en clair, dans la ligne : pas de corbeille
                  « armée » qui semble ne rien faire au premier clic. */}
              {confirmDelete === page.id ? (
                <div
                  role="alertdialog"
                  aria-label="Confirmer la suppression de la page"
                  className="flex shrink-0 items-center gap-1.5 text-[0.75rem] text-foreground"
                >
                  <span>Supprimer cette page et son contenu ?</span>
                  <button
                    type="button"
                    autoFocus
                    disabled={pending}
                    onClick={() => {
                      setConfirmDelete(null)
                      start(async () => {
                        const result = await deletePage(page.id)
                        if (result.ok) {
                          toast.success('Page supprimée.')
                          router.refresh()
                        } else toast.error(result.error)
                      })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setConfirmDelete(null)
                    }}
                    className="rounded-md bg-red-600 px-2 py-1 text-[0.72rem] font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setConfirmDelete(null)
                    }}
                    className="rounded-md border border-border bg-white px-2 py-1 text-[0.72rem] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <Link
                  href={
                    page.isHome ? '/admin/accueil' : `/admin/pages/${page.id}`
                  }
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[0.75rem] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                  Modifier
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      <p className="text-[0.72rem] leading-[1.6] text-muted-foreground">
        Une nouvelle page naît en brouillon : composez-la avec les templates,
        puis cliquez « Publier » dans son éditeur pour la mettre en ligne.
        Elle apparaîtra alors dans le sitemap — pensez à l’ajouter au menu.
      </p>
    </div>
  )
}
