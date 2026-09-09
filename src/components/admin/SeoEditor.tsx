'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { MediaPicker } from './MediaPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { absoluteUrl, cn } from '@/lib/utils'
import { updateSeo } from '@/server/actions/pages'
import type { Media, Page, SeoMeta } from '@/server/db/schema'

const TITLE_MAX = 60
const DESCRIPTION_MAX = 155

export function SeoEditor({
  page,
  seo,
  library,
  siteName,
}: {
  page: Page
  seo: SeoMeta | null
  library: Media[]
  siteName: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState(seo?.title ?? '')
  const [description, setDescription] = useState(seo?.description ?? '')
  const [canonical, setCanonical] = useState(seo?.canonical ?? '')
  const [ogMediaId, setOgMediaId] = useState(seo?.ogMediaId ?? null)
  const [robotsIndex, setRobotsIndex] = useState(seo?.robotsIndex ?? true)
  const [robotsFollow, setRobotsFollow] = useState(seo?.robotsFollow ?? true)
  const [pending, start] = useTransition()

  const url = absoluteUrl(page.isHome ? '/' : `/${page.slug}`)
  const previewTitle = title || `${page.title} — ${siteName}`

  function save() {
    start(async () => {
      const result = await updateSeo(page.id, {
        title: title || null,
        description: description || null,
        canonical: canonical || null,
        ogMediaId,
        robotsIndex,
        robotsFollow,
        keywords: seo?.keywords ?? [],
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('SEO enregistré.')
      router.refresh()
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label htmlFor="seo-title">Titre SEO</Label>
            <Counter value={title.length} max={TITLE_MAX} />
          </div>
          <Input
            id="seo-title"
            value={title}
            placeholder={`${page.title} — ${siteName}`}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label htmlFor="seo-description">Meta description</Label>
            <Counter value={description.length} max={DESCRIPTION_MAX} />
          </div>
          <Textarea
            id="seo-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="seo-canonical" className="mb-2 block">
            URL canonique
          </Label>
          <Input
            id="seo-canonical"
            value={canonical}
            placeholder={url}
            onChange={(e) => setCanonical(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Vide = {url}. À ne renseigner que si cette page duplique un contenu
            existant ailleurs.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5">
            <Label htmlFor="seo-index" className="cursor-pointer">
              Indexer (index)
            </Label>
            <Switch
              id="seo-index"
              checked={robotsIndex}
              onCheckedChange={setRobotsIndex}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5">
            <Label htmlFor="seo-follow" className="cursor-pointer">
              Suivre les liens (follow)
            </Label>
            <Switch
              id="seo-follow"
              checked={robotsFollow}
              onCheckedChange={setRobotsFollow}
            />
          </div>
        </div>

        <MediaPicker
          label="Image de partage (Open Graph)"
          value={ogMediaId}
          onChange={setOgMediaId}
          library={library}
          className="max-w-xs"
        />

        <Button onClick={save} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>

      {/* Aperçu du snippet Google — approximatif mais suffisant pour
          juger d'une troncature avant publication. */}
      <aside className="h-fit rounded-lg border border-border p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Aperçu Google
        </p>
        <div className="rounded-md bg-white p-3">
          <p className="truncate text-xs text-[#4d5156]">{url}</p>
          <p className="mt-1 line-clamp-2 text-[1.05rem] leading-snug text-[#1a0dab]">
            {previewTitle}
          </p>
          <p className="mt-1 line-clamp-3 text-[0.82rem] leading-relaxed text-[#4d5156]">
            {description || 'Aucune description renseignée.'}
          </p>
        </div>

        {(!robotsIndex || !robotsFollow) && (
          <p className="mt-3 rounded-md bg-[#fbf6e9] px-3 py-2 text-xs leading-relaxed text-[#6b551f]">
            Cette page est en {!robotsIndex ? 'noindex' : ''}
            {!robotsIndex && !robotsFollow ? ', ' : ''}
            {!robotsFollow ? 'nofollow' : ''} — elle n’apparaîtra pas
            normalement dans les résultats.
          </p>
        )}
      </aside>
    </div>
  )
}

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        over ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {value} / {max}
      {over && ' — sera tronqué'}
    </span>
  )
}
