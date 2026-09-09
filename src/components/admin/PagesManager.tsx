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
  const [armedDelete, setArmedDelete] = useState<string | null>(null)

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
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {/* ── Création ─────────────────────────────────────────────── */}
      {creating ? (
        <form
          className="space-y-3 rounded-lg border border-border p-4"
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
                amaswi.com/
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
            <Button type="submit" size="sm" disabled={pending || !title || !slug}>
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
        <Button onClick={() => setCreating(true)}>
          <Plus />
          Nouvelle page
        </Button>
      )}

      {/* ── Liste ────────────────────────────────────────────────── */}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {pages.map((page) => {
          const published = page.status === 'published'
          return (
            <li
              key={page.id}
              className="group flex items-center gap-3 px-4 py-3"
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
                {!page.isHome && (
                  <button
                    type="button"
                    title={
                      armedDelete === page.id
                        ? 'Cliquez pour confirmer la suppression'
                        : 'Supprimer'
                    }
                    disabled={pending}
                    onClick={() => {
                      if (armedDelete === page.id) {
                        setArmedDelete(null)
                        start(async () => {
                          const result = await deletePage(page.id)
                          if (result.ok) {
                            toast.success('Page supprimée.')
                            router.refresh()
                          } else toast.error(result.error)
                        })
                      } else {
                        setArmedDelete(page.id)
                        setTimeout(() => setArmedDelete(null), 2500)
                      }
                    }}
                    className={cn(
                      'rounded p-1.5 transition-colors',
                      armedDelete === page.id
                        ? 'bg-red-600 text-white'
                        : 'text-muted-foreground hover:bg-red-50 hover:text-red-600',
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Link
                href={
                  page.isHome ? '/admin/accueil' : `/admin/pages/${page.id}`
                }
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[0.75rem] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                Modifier
              </Link>
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
