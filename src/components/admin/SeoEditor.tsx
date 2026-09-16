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
  /** Erreurs de validation par champ (renvoyées par l'action), affichées
      sous le champ concerné en plus du toast. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const errorOf = (key: string) => fieldErrors[key]?.[0]

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
        setFieldErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }

      setFieldErrors({})
      toast.success('Référencement enregistré.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-[22px]">
      {/* Aperçu du résultat Google — approximatif mais suffisant pour
          juger d'une troncature avant publication. Il suit la saisie. */}
      <Card title="Aperçu sur Google">
        <div className="rounded-lg border border-border bg-ivory/60 px-4 py-3.5">
          <p className="truncate text-[0.72rem] text-[#4d5156]">{url}</p>
          <p className="mt-1 line-clamp-2 text-[1.05rem] leading-snug text-[#1a0dab]">
            {previewTitle}
          </p>
          <p className="mt-1 line-clamp-3 text-[0.8rem] leading-relaxed text-[#4d5156]">
            {description ||
              'Renseignez une description ci-dessous — c’est elle que Google affiche sous le titre.'}
          </p>
        </div>

        {(!robotsIndex || !robotsFollow) && (
          <p className="rounded-md bg-[#fbf6e9] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#6b551f]">
            Les moteurs de recherche sont bridés sur cette page : elle
            n’apparaîtra normalement pas dans les résultats.
          </p>
        )}
      </Card>

      <Card title="Titre et description">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label htmlFor="seo-title">Titre pour Google</Label>
            <Counter value={title.length} max={TITLE_MAX} />
          </div>
          <Input
            id="seo-title"
            value={title}
            placeholder={`${page.title} — ${siteName}`}
            aria-invalid={errorOf('title') ? true : undefined}
            onChange={(e) => setTitle(e.target.value)}
          />
          <FieldError message={errorOf('title')} />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label htmlFor="seo-description">Description pour Google</Label>
            <Counter value={description.length} max={DESCRIPTION_MAX} />
          </div>
          <Textarea
            id="seo-description"
            rows={3}
            value={description}
            aria-invalid={errorOf('description') ? true : undefined}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FieldError message={errorOf('description')} />
        </div>
      </Card>

      <Card title="Partage et visibilité">
        <MediaPicker
          label="Image de partage"
          value={ogMediaId}
          onChange={setOgMediaId}
          library={library}
          className="max-w-xs"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5">
            <Label htmlFor="seo-index" className="cursor-pointer">
              Autoriser les moteurs de recherche
            </Label>
            <Switch
              id="seo-index"
              checked={robotsIndex}
              onCheckedChange={setRobotsIndex}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5">
            <Label htmlFor="seo-follow" className="cursor-pointer">
              Autoriser le suivi des liens
            </Label>
            <Switch
              id="seo-follow"
              checked={robotsFollow}
              onCheckedChange={setRobotsFollow}
            />
          </div>
        </div>
      </Card>

      <Card title="Réglage avancé">
        <div>
          <Label htmlFor="seo-canonical" className="mb-2 block">
            Adresse de référence
          </Label>
          <Input
            id="seo-canonical"
            value={canonical}
            placeholder={url}
            aria-invalid={errorOf('canonical') ? true : undefined}
            onChange={(e) => setCanonical(e.target.value)}
          />
          <FieldError message={errorOf('canonical')} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            À laisser vide dans la plupart des cas ({url}). Utile seulement si
            ce contenu existe déjà à une autre adresse.
          </p>
        </div>
      </Card>

      <Button
        className="rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
        onClick={save}
        disabled={pending}
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-white px-[22px] py-5">
      <h4 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h4>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  )
}

/** Message d'erreur sous un champ — rien si le champ est valide. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1.5 text-xs text-destructive">
      {message}
    </p>
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
