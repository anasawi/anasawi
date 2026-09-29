'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { MediaPicker } from './MediaPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { absoluteUrl, cn } from '@/lib/utils'
import type { Media, Page, SeoMeta } from '@/server/db/schema'

/**
 * Référencement — ce que Google affiche de la page d'accueil.
 *
 * Le composant ne possède pas ses données : le brouillon vit dans l'écran
 * Réglages (`SettingsWorkbench`), qui l'enregistre depuis SA barre
 * « Enregistrer ». Ainsi ce qu'on tape ici survit au passage d'un onglet
 * à l'autre, et le bouton est le même partout.
 *
 * Vocabulaire : jamais « meta », « OG » ni « slug » — « Titre pour
 * Google », « Description pour Google », « Image de partage ».
 */

/** Fourchettes que Google affiche en entier, en général. */
const TITLE_IDEAL: [number, number] = [50, 60]
const DESCRIPTION_IDEAL: [number, number] = [120, 160]

/** Ce que reçoit l'écran Réglages depuis le serveur (voir page.tsx). */
export type SeoEditorProps = {
  page: Page
  seo: SeoMeta | null
  library: Media[]
  siteName: string
}

/** Le brouillon — les champs qu'Anne peut modifier. */
export type SeoDraft = {
  title: string
  description: string
  canonical: string
  ogMediaId: string | null
  robotsIndex: boolean
  robotsFollow: boolean
}

/**
 * Le brouillon montre ce que le site AFFICHE : le titre propre à la page
 * s'il existe, sinon le titre par défaut des réglages (c'est celui que
 * lit `lib/seo.ts` pour l'accueil). Sans ce repli, le champ se présentait
 * vide alors que Google affichait bien un titre — et enregistrer le
 * formulaire vidait ce titre pour de bon.
 */
export function seoDraftFrom(
  seo: SeoMeta | null,
  defauts?: {
    defaultSeoTitle: string | null
    defaultSeoDescription: string | null
    defaultOgMediaId: string | null
  },
): SeoDraft {
  return {
    title: seo?.title ?? defauts?.defaultSeoTitle ?? '',
    description: seo?.description ?? defauts?.defaultSeoDescription ?? '',
    canonical: seo?.canonical ?? '',
    ogMediaId: seo?.ogMediaId ?? defauts?.defaultOgMediaId ?? null,
    robotsIndex: seo?.robotsIndex ?? true,
    robotsFollow: seo?.robotsFollow ?? true,
  }
}

export function SeoEditor({
  page,
  library,
  siteName,
  value,
  onChange,
  fieldErrors,
}: {
  page: Page
  library: Media[]
  siteName: string
  value: SeoDraft
  onChange: (next: SeoDraft) => void
  /** Erreurs de validation renvoyées par l'action, par champ. */
  fieldErrors: Record<string, string[]>
}) {
  const errorOf = (key: string) => fieldErrors[key]?.[0]
  const set = <K extends keyof SeoDraft>(key: K, v: SeoDraft[K]) =>
    onChange({ ...value, [key]: v })

  const url = absoluteUrl('/')
  const titreParDefaut = `${page.title} — ${siteName}`
  const previewTitle = value.title || titreParDefaut

  /* Les options avancées s'ouvrent d'elles-mêmes si quelque chose s'y
     trouve déjà, ou si le serveur y signale une erreur. */
  const [avanceOuvert, setAvanceOuvert] = useState(Boolean(value.canonical))
  const avance = avanceOuvert || Boolean(errorOf('canonical'))

  return (
    <div className="space-y-[22px]">
      {/* Aperçu du résultat Google — approximatif mais suffisant pour
          juger d'une troncature avant publication. Il suit la saisie. */}
      <Card
        title="Aperçu sur Google"
        note="À peu près ce que verra une personne qui cherche votre site. L’aperçu suit ce que vous tapez ci-dessous."
      >
        <div className="rounded-lg border border-border bg-ivory/60 px-4 py-3.5">
          <p className="truncate text-xs text-[#4d5156]">{url}</p>
          <p className="mt-1 line-clamp-2 text-[1.05rem] leading-snug text-[#1a0dab]">
            {previewTitle}
          </p>
          <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-[#4d5156]">
            {value.description ||
              'Renseignez une description ci-dessous — c’est elle que Google affiche sous le titre.'}
          </p>
        </div>

        {(!value.robotsIndex || !value.robotsFollow) && (
          <p className="rounded-md bg-[#fbf6e9] px-3.5 py-2.5 text-xs leading-relaxed text-[#6b551f]">
            Les moteurs de recherche sont bridés sur cette page : elle
            n’apparaîtra normalement pas dans les résultats.
          </p>
        )}
      </Card>

      <Card title="Titre et description">
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Label htmlFor="seo-title">Titre pour Google</Label>
            <Counter value={value.title.length} ideal={TITLE_IDEAL} />
          </div>
          <Input
            id="seo-title"
            value={value.title}
            placeholder={titreParDefaut}
            aria-invalid={errorOf('title') ? true : undefined}
            aria-describedby="seo-title-aide"
            onChange={(e) => set('title', e.target.value)}
          />
          <FieldError message={errorOf('title')} />
          <p id="seo-title-aide" className="mt-1.5 text-xs text-muted-foreground">
            C’est la ligne bleue du résultat. 50 à 60 caractères, c’est
            l’idéal — au-delà, Google coupe la fin. Vide, le site utilise
            « {titreParDefaut} ».
          </p>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Label htmlFor="seo-description">Description pour Google</Label>
            <Counter
              value={value.description.length}
              ideal={DESCRIPTION_IDEAL}
            />
          </div>
          <Textarea
            id="seo-description"
            rows={3}
            value={value.description}
            aria-invalid={errorOf('description') ? true : undefined}
            aria-describedby="seo-description-aide"
            onChange={(e) => set('description', e.target.value)}
          />
          <FieldError message={errorOf('description')} />
          <p
            id="seo-description-aide"
            className="mt-1.5 text-xs text-muted-foreground"
          >
            Les deux lignes sous le titre. 120 à 160 caractères, c’est
            l’idéal : dites en une phrase ce que vous proposez et où.
          </p>
        </div>
      </Card>

      <Card
        title="Partage et visibilité"
        note="L’image qui accompagne le lien de votre site quand on le partage sur les réseaux sociaux ou par message."
      >
        <MediaPicker
          label="Image de partage (réseaux sociaux)"
          value={value.ogMediaId}
          onChange={(id) => set('ogMediaId', id)}
          library={library}
          className="max-w-xs"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3.5 py-2.5">
            <Label htmlFor="seo-index" className="cursor-pointer leading-snug">
              Autoriser les moteurs de recherche
            </Label>
            <Switch
              id="seo-index"
              checked={value.robotsIndex}
              onCheckedChange={(v) => set('robotsIndex', v)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3.5 py-2.5">
            <Label htmlFor="seo-follow" className="cursor-pointer leading-snug">
              Autoriser le suivi des liens
            </Label>
            <Switch
              id="seo-follow"
              checked={value.robotsFollow}
              onCheckedChange={(v) => set('robotsFollow', v)}
            />
          </div>
        </div>
      </Card>

      <Card title="Options avancées">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={avance}
          aria-controls="seo-avance"
          onClick={() => setAvanceOuvert((v) => !v)}
          className="-ml-2"
        >
          <ChevronDown
            className={cn('transition-transform', avance && 'rotate-180')}
          />
          {avance ? 'Masquer' : 'Afficher'} les options avancées
        </Button>
        {avance && (
          <div id="seo-avance">
            <Label htmlFor="seo-canonical" className="mb-2 block">
              Adresse de référence
            </Label>
            <Input
              id="seo-canonical"
              value={value.canonical}
              placeholder={url}
              aria-invalid={errorOf('canonical') ? true : undefined}
              onChange={(e) => set('canonical', e.target.value)}
            />
            <FieldError message={errorOf('canonical')} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              À laisser vide dans la plupart des cas ({url}). Utile seulement
              si ce contenu existe déjà à une autre adresse.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

function Card({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-white px-[22px] py-5">
      <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h2>
      {note && (
        <p className="mt-1.5 max-w-[62ch] text-[12px] leading-[1.6] text-muted-foreground">
          {note}
        </p>
      )}
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

/** Le compteur dit où l'on en est par rapport à la fourchette idéale,
    sans jargon : « 34 caractères », « 62 caractères — un peu long ». */
function Counter({ value, ideal }: { value: number; ideal: [number, number] }) {
  const [min, max] = ideal
  const long = value > max
  const court = value > 0 && value < min
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        long ? 'text-[#8a5f1e]' : 'text-muted-foreground',
      )}
    >
      {value} caractère{value > 1 ? 's' : ''}
      {long && ' — un peu long, la fin sera coupée'}
      {court && ' — un peu court'}
    </span>
  )
}
