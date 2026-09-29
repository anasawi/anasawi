'use client'

import { Check, Plus, RotateCcw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { LogoPreview } from './LogoPreview'
import { MediaPicker } from './MediaPicker'
import { NavigationEditor, type NavigationEditorProps } from './NavigationEditor'
import { PageHeader } from './PageHeader'
import { PaletteProvider } from './PaletteProvider'
import { SeoEditor, type SeoEditorProps } from './SeoEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Identity } from '@/lib/identity'
import {
  DEFAULT_PALETTE,
  PALETTE_ROLES,
  paletteContrast,
  paletteFromIdentity,
  shade,
  shadesOf,
  type Palette,
  type PaletteRole,
} from '@/lib/palette'
import { cn } from '@/lib/utils'
import { updateSettings } from '@/server/actions/content'
import { updateIdentity } from '@/server/actions/identity'
import type {
  Media,
  OpeningHour,
  Settings,
  SocialLink,
} from '@/server/db/schema'

/**
 * Les réglages du site — un écran, quatre onglets.
 *
 *   Coordonnées   qui vous êtes, comment on vous joint, vos horaires
 *   Apparence     vos couleurs et vos formes
 *   Menu du site  les entrées du menu, dans l'ordre
 *   Référencement ce que Google affiche
 *
 * Les deux premiers onglets forment UN formulaire (les mêmes réglages,
 * simplement triés) : un seul bouton « Enregistrer », dans une barre qui
 * reste visible, et un état lisible — « Modifications non enregistrées »
 * tant qu'on n'a pas enregistré, avec un garde-fou si l'on quitte la page.
 * Les deux autres onglets ont leur propre bouton : ce sont d'autres
 * données, enregistrées à part.
 *
 * Les onglets sont dans l'adresse (`#apparence`) : un lien y mène
 * directement, et l'état du formulaire survit au passage d'un onglet à
 * l'autre — on ne perd pas ce qu'on a tapé en allant voir l'autre.
 */

export const ONGLETS = [
  { id: 'coordonnees', label: 'Coordonnées' },
  { id: 'apparence', label: 'Apparence' },
  { id: 'menu', label: 'Menu du site' },
  { id: 'referencement', label: 'Référencement' },
] as const
export type Onglet = (typeof ONGLETS)[number]['id']

function ongletDepuisAdresse(): Onglet {
  if (typeof window === 'undefined') return 'coordonnees'
  const hash = window.location.hash.replace('#', '')
  /* Anciennes ancres : identite, horaires → coordonnées ; palette, formes → apparence ; seo → référencement. */
  const correspondances: Record<string, Onglet> = {
    identite: 'coordonnees',
    horaires: 'coordonnees',
    palette: 'apparence',
    formes: 'apparence',
    seo: 'referencement',
    navigation: 'menu',
  }
  const cible = correspondances[hash] ?? hash
  return ONGLETS.some((o) => o.id === cible) ? (cible as Onglet) : 'coordonnees'
}

const DEFAULT_RADIUS = 2

export function SettingsWorkbench({
  settings,
  identity: initialIdentity,
  library,
  menu,
  referencement,
}: {
  settings: Settings
  identity: Identity
  library: Media[]
  menu: NavigationEditorProps
  referencement: SeoEditorProps | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  /** Vrai dès qu'un réglage diffère de ce qui est enregistré. */
  const [dirty, setDirty] = useState(false)
  const [onglet, setOnglet] = useState<Onglet>('coordonnees')

  /* L'onglet suit l'adresse, et l'adresse suit l'onglet. */
  useEffect(() => {
    setOnglet(ongletDepuisAdresse())
    const onHash = () => setOnglet(ongletDepuisAdresse())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const choisir = (id: Onglet) => {
    setOnglet(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  /* Quitter avec des modifications non enregistrées : le navigateur
     demande confirmation. */
  useEffect(() => {
    if (!dirty) return
    const garde = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', garde)
    return () => window.removeEventListener('beforeunload', garde)
  }, [dirty])

  const [form, setForm] = useState({
    siteName: settings.siteName,
    practitionerName: settings.practitionerName,
    practitionerTitle: settings.practitionerTitle ?? '',
    tagline: settings.tagline ?? '',
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    addressStreet: settings.addressStreet ?? '',
    addressPostalCode: settings.addressPostalCode ?? '',
    addressCity: settings.addressCity ?? '',
    addressCountry: settings.addressCountry ?? 'FR',
    latitude: settings.latitude ?? '',
    longitude: settings.longitude ?? '',
    practicalInfo: settings.practicalInfo ?? '',
    bookingUrl: settings.bookingUrl ?? '',
  })

  const [hours, setHours] = useState<OpeningHour[]>(
    (settings.openingHours as OpeningHour[]) ?? [],
  )
  const [socials, setSocials] = useState<SocialLink[]>(
    (settings.socialLinks as SocialLink[]) ?? [],
  )
  const [logoMediaId, setLogoMediaId] = useState(settings.logoMediaId)

  /** Erreurs de validation renvoyées par l'action, par champ — affichées
      sous le champ concerné en plus du toast. Effacées à la prochaine
      saisie ou au prochain enregistrement réussi. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const errorOf = (key: string) => fieldErrors[key]?.[0]

  /* L'identité est réduite à sa forme actuelle dès l'ouverture : les
     anciennes clés de couleurs sont repliées dans la palette, et le premier
     enregistrement les efface pour de bon. */
  const [palette, setPalette] = useState<Palette>(() =>
    paletteFromIdentity(initialIdentity),
  )
  const [buttonRadius, setButtonRadius] = useState(
    initialIdentity.buttonRadius ?? DEFAULT_RADIUS,
  )
  const [spacing, setSpacing] = useState<'compact' | 'normal' | 'aere'>(
    initialIdentity.spacing ?? 'normal',
  )

  const set = (key: keyof typeof form, value: string) => {
    setDirty(true)
    setForm((f) => ({ ...f, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const setRole = (key: PaletteRole, hex: string) => {
    setDirty(true)
    setPalette((p) => ({ ...p, [key]: hex }))
  }

  function save() {
    start(async () => {
      const [content, identity] = await Promise.all([
        updateSettings({
          ...form,
          practitionerTitle: form.practitionerTitle || null,
          tagline: form.tagline || null,
          contactPhone: form.contactPhone || null,
          addressStreet: form.addressStreet || null,
          addressPostalCode: form.addressPostalCode || null,
          addressCity: form.addressCity || null,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
          practicalInfo: form.practicalInfo || null,
          openingHours: hours.filter((h) => h.day && h.hours),
          socialLinks: socials.filter((s) => s.label && s.url),
          logoMediaId,
        }),
        updateIdentity({ palette, buttonRadius, spacing }),
      ])

      if (!content.ok) {
        setFieldErrors(content.fieldErrors ?? {})
        toast.error(content.error)
        return
      }
      if (!identity.ok) {
        toast.error(identity.error)
        return
      }

      setFieldErrors({})
      setDirty(false)
      toast.success('Réglages enregistrés — le site est à jour.')
      router.refresh()
    })
  }

  const formulaire = onglet === 'coordonnees' || onglet === 'apparence'

  return (
    <PaletteProvider palette={palette}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-ivory">
        <div className="mx-auto max-w-[960px] px-5 py-8 sm:px-8 sm:py-11">
          <PageHeader
            title="Réglages"
            description="Tout ce qui vaut pour le site entier : qui vous êtes, comment on vous joint, vos couleurs, votre menu et ce que Google affiche."
          />

          {/* Onglets */}
          <div
            role="tablist"
            aria-label="Réglages"
            className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
          >
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="tab"
                id={`onglet-${o.id}`}
                aria-selected={onglet === o.id}
                aria-controls={`panneau-${o.id}`}
                onClick={() => choisir(o.id)}
                className={cn(
                  '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  onglet === o.id
                    ? 'border-primary font-medium text-primary'
                    : 'border-transparent text-ink-soft hover:text-foreground',
                )}
              >
                {o.label}
                {formulaire && dirty && (o.id === 'coordonnees' || o.id === 'apparence') && onglet !== o.id ? (
                  <span aria-hidden="true" className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#c98a2d] align-middle" />
                ) : null}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panneau-${onglet}`}
            aria-labelledby={`onglet-${onglet}`}
            className="min-w-0 space-y-[22px]"
          >
            {onglet === 'coordonnees' && (
              <>
              <Card
                id="identite"
                title="Identité"
                note="Le nom du site et le vôtre, tels qu’ils apparaissent partout."
              >
                <Field
                  label="Nom du site"
                  value={form.siteName}
                  onChange={(v) => set('siteName', v)}
                  error={errorOf('siteName')}
                />
                <Field
                  label="Accroche"
                  value={form.tagline}
                  onChange={(v) => set('tagline', v)}
                  help="La phrase courte qui accompagne le nom."
                  error={errorOf('tagline')}
                />
                <Field
                  label="Votre nom"
                  value={form.practitionerName}
                  onChange={(v) => set('practitionerName', v)}
                  help="Permet aussi qu’on vous trouve par votre nom sur Google."
                  error={errorOf('practitionerName')}
                />
                <Field
                  label="Titre professionnel"
                  value={form.practitionerTitle}
                  onChange={(v) => set('practitionerTitle', v)}
                  placeholder="Thérapeute"
                  error={errorOf('practitionerTitle')}
                />
              
                <MediaPicker
                  label="Logo du site"
                  value={logoMediaId}
                  onChange={(id) => {
                    setDirty(true)
                    setLogoMediaId(id)
                  }}
                  library={library}
                  className="max-w-xs"
                />
                <div className="self-end">
                  <p className="text-[12px] leading-[1.6] text-muted-foreground">
                    Il apparaît dans l’en-tête du site, dans l’onglet du
                    navigateur et sur l’écran d’accueil d’un téléphone.
                    Sans choix, le logo livré avec le site est utilisé.
                  </p>
                  <LogoPreview
                    url={library.find((m) => m.id === logoMediaId)?.url}
                  />
                </div>
              </Card>

              <Card
                id="coordonnees"
                title="Coordonnées"
                note="Utilisées par la section Contact et le pied de page. Un champ vide est simplement omis — rien n’est inventé."
              >
                <Field
                  label="Téléphone"
                  value={form.contactPhone}
                  onChange={(v) => set('contactPhone', v)}
                  error={errorOf('contactPhone')}
                />
                <Field
                  label="Adresse e-mail"
                  value={form.contactEmail}
                  onChange={(v) => set('contactEmail', v)}
                  error={errorOf('contactEmail')}
                />
                <Field
                  label="Rue"
                  value={form.addressStreet}
                  onChange={(v) => set('addressStreet', v)}
                  full
                  error={errorOf('addressStreet')}
                />
                <Field
                  label="Code postal"
                  value={form.addressPostalCode}
                  onChange={(v) => set('addressPostalCode', v)}
                  error={errorOf('addressPostalCode')}
                />
                <Field
                  label="Ville"
                  value={form.addressCity}
                  onChange={(v) => set('addressCity', v)}
                  error={errorOf('addressCity')}
                />
                <Field
                  label="Latitude"
                  value={form.latitude}
                  onChange={(v) => set('latitude', v)}
                  placeholder="48.1213"
                  help="Facultatif — situe le cabinet sur les cartes."
                  error={errorOf('latitude')}
                />
                <Field
                  label="Longitude"
                  value={form.longitude}
                  onChange={(v) => set('longitude', v)}
                  placeholder="-1.6033"
                  error={errorOf('longitude')}
                />
                <Field
                  label="Lien de prise de rendez-vous"
                  value={form.bookingUrl}
                  onChange={(v) => set('bookingUrl', v)}
                  placeholder="https://…"
                  help="Si vide, le bouton « Prendre rendez-vous » mène vers la section Contact."
                  full
                  error={errorOf('bookingUrl')}
                />

                <div className="sm:col-span-2">
                  <Label className="mb-2 block">Informations pratiques</Label>
                  <Textarea
                    rows={4}
                    value={form.practicalInfo}
                    aria-invalid={errorOf('practicalInfo') ? true : undefined}
                    onChange={(e) => set('practicalInfo', e.target.value)}
                  />
                  {errorOf('practicalInfo') && (
                    <FieldError>{errorOf('practicalInfo')}</FieldError>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label className="mb-2 block">Réseaux sociaux</Label>
                  <RepeatableList
                    items={socials}
                    onChange={(next) => {
                      setDirty(true)
                      setSocials(next)
                    }}
                    blank={{ label: '', url: '' }}
                    addLabel="Ajouter un réseau"
                    render={(item, update) => (
                      <>
                        <Input
                          value={item.label}
                          placeholder="Instagram"
                          onChange={(e) =>
                            update({ ...item, label: e.target.value })
                          }
                        />
                        <Input
                          value={item.url}
                          placeholder="https://…"
                          onChange={(e) =>
                            update({ ...item, url: e.target.value })
                          }
                        />
                      </>
                    )}
                  />
                </div>
              </Card>
              <Card
                id="horaires"
                title="Horaires"
                note="Une ligne par plage — le libellé de gauche est affiché tel quel."
              >
                <RepeatableList
                  items={hours}
                  onChange={(next) => {
                    setDirty(true)
                    setHours(next)
                  }}
                  blank={{ day: '', hours: '' }}
                  addLabel="Ajouter un horaire"
                  render={(item, update) => (
                    <>
                      <Input
                        value={item.day}
                        placeholder="Lundi – Vendredi"
                        onChange={(e) => update({ ...item, day: e.target.value })}
                      />
                      <Input
                        value={item.hours}
                        placeholder="09:00 – 19:00"
                        onChange={(e) =>
                          update({ ...item, hours: e.target.value })
                        }
                      />
                    </>
                  )}
                />
              </Card>
              </>
            )}

            {onglet === 'apparence' && (
              <>
              <PaletteCard
                palette={palette}
                buttonRadius={buttonRadius}
                onChange={setRole}
                onReset={() => {
                  setDirty(true)
                  setPalette({ ...DEFAULT_PALETTE })
                }}
              />
              <Card
                id="formes"
                title="Formes et respiration"
                note="Deux réglages de forme, valables pour tout le site."
              >
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">
                    Arrondi des boutons — {buttonRadius} px
                  </Label>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={1}
                    value={buttonRadius}
                    onChange={(e) => {
                      setDirty(true)
                      setButtonRadius(Number(e.target.value))
                    }}
                    className="w-full accent-[#46728a]"
                    aria-label="Arrondi des boutons"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">
                    Respiration des sections
                  </Label>
                  <div className="flex gap-1.5">
                    {(
                      [
                        ['compact', 'Compacte'],
                        ['normal', 'Normale'],
                        ['aere', 'Aérée'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={spacing === key}
                        onClick={() => {
                          setDirty(true)
                          setSpacing(key)
                        }}
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-[0.78rem] transition-colors',
                          spacing === key
                            ? 'border-blue-deep bg-blue-mist/60 text-blue-ink'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
              </>
            )}

            {onglet === 'menu' && <NavigationEditor {...menu} />}

            {onglet === 'referencement' &&
              (referencement ? (
                <SeoEditor {...referencement} />
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Le référencement se règle une fois la page d’accueil créée.
                </p>
              ))}
          </div>

          {/* La barre d'enregistrement du formulaire (coordonnées et
              apparence) colle au bas de la zone qui défile : elle reste
              sous la main, et dit toujours où l'on en est. */}
          {formulaire && (
            <div className="sticky bottom-0 z-10 -mx-5 mt-7 flex items-center justify-end gap-3 border-t border-border bg-ivory/90 px-5 py-3.5 backdrop-blur sm:-mx-8 sm:px-8">
              <span
                aria-live="polite"
                className={cn(
                  'flex items-center gap-1.5 text-[12.5px]',
                  dirty ? 'text-[#8a5f1e]' : 'text-muted-foreground',
                )}
              >
                {pending ? (
                  'Enregistrement…'
                ) : dirty ? (
                  <>
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#c98a2d]" />
                    Modifications non enregistrées
                  </>
                ) : (
                  <>
                    <Check className="h-[14px] w-[14px] text-primary" />
                    Tout est enregistré
                  </>
                )}
              </span>
              <Button onClick={save} disabled={pending || !dirty}>
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </PaletteProvider>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Palette
   ══════════════════════════════════════════════════════════════════════ */

function PaletteCard({
  palette,
  buttonRadius,
  onChange,
  onReset,
}: {
  palette: Palette
  buttonRadius: number
  onChange: (key: PaletteRole, hex: string) => void
  onReset: () => void
}) {
  const contrast = paletteContrast(palette)

  return (
    <section
      id="palette"
      className="scroll-mt-6 rounded-xl border border-border bg-white px-[22px] py-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Palette
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-[12px] leading-[1.6] text-muted-foreground">
            Cinq couleurs, pas plus. Toutes les nuances du site — les gris, les
            filets, les fonds doux — en sont déduites, et restent donc dans la
            famille de ce que vous choisissez.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw />
          Revenir à la charte
        </Button>
      </div>

      {/* Une rangée par rôle : la pastille, le nom, les nuances, le hex.
          Tout tient sur une ligne — la palette se lit d'un regard. */}
      <div className="mt-4 divide-y divide-border">
        {PALETTE_ROLES.map((role) => (
          <div
            key={role.key}
            className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 py-3.5 first:pt-0"
          >
            {/* La pastille EST le bouton : le sélecteur natif est masqué
                dessous. On voit la couleur, pas un widget de navigateur. */}
            <label
              className="block h-[30px] w-[30px] shrink-0 cursor-pointer rounded-[9px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-transform duration-200 hover:scale-[1.08]"
              style={{ backgroundColor: palette[role.key] }}
              title={`${role.label} — ${palette[role.key].toUpperCase()}`}
            >
              <input
                type="color"
                value={palette[role.key]}
                onChange={(e) => onChange(role.key, e.target.value)}
                className="sr-only"
                aria-label={role.label}
              />
            </label>

            <div className="min-w-[150px] flex-1">
              <Label className="block">{role.label}</Label>
              <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                {role.help}
              </p>
            </div>

            {/* Les nuances : cliquer sur l'une d'elles l'adopte comme
                couleur de base du rôle. */}
            <div className="flex shrink-0 gap-1">
              {shadesOf(palette[role.key]).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(role.key, item.hex)}
                  title={`${item.label} — ${item.hex.toUpperCase()}`}
                  aria-label={`${role.label}, ${item.label}`}
                  className="h-[22px] w-[22px] rounded-[6px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-transform duration-200 hover:scale-[1.14]"
                  style={{ backgroundColor: item.hex }}
                />
              ))}
            </div>

            <span className="w-[74px] shrink-0 text-right font-mono text-[0.72rem] uppercase text-muted-foreground">
              {palette[role.key]}
            </span>
          </div>
        ))}
      </div>

      {contrast < 4.5 && (
        <p className="mt-3 rounded-md bg-[#fbf0ee] px-3.5 py-2.5 text-[12px] leading-relaxed text-destructive">
          Le contraste du texte sur le fond principal est de{' '}
          {contrast.toFixed(1)}:1 — en dessous de 4,5:1, le texte devient
          pénible à lire. Assombrissez l’encre ou éclaircissez le fond.
        </p>
      )}

      <PalettePreview palette={palette} buttonRadius={buttonRadius} />
    </section>
  )
}

/** Une mini-maquette qui suit chaque geste — fond, fond alterné, titre,
    paragraphe, filet, bouton. */
function PalettePreview({
  palette,
  buttonRadius,
}: {
  palette: Palette
  buttonRadius: number
}) {
  const inkSoft = shade(palette.ink, 'light')
  const stone = shade(palette.ink, 'lightest')

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        Aperçu
      </p>
      <div
        className="overflow-hidden rounded-lg border border-border"
        style={{ backgroundColor: palette.surface }}
      >
        <div className="px-5 py-6">
          <span
            className="text-[9.5px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: palette.accent }}
          >
            Accompagnement
          </span>
          <h3
            className="mt-2 font-serif text-[26px] font-light leading-tight"
            style={{ color: palette.ink }}
          >
            Un lieu pour déposer
          </h3>
          <span
            className="mt-3 block h-px w-16"
            style={{ backgroundColor: palette.accentSoft }}
          />
          <p
            className="mt-3 max-w-[52ch] text-[12px] leading-[1.75]"
            style={{ color: inkSoft }}
          >
            Une séance se déroule à votre rythme. Rien n’est attendu de vous
            sinon d’être là, et de dire ce qui vient.
          </p>
          <span
            className="mt-4 inline-block px-4 py-2 text-[11.5px]"
            style={{
              backgroundColor: palette.accent,
              color: palette.surface,
              borderRadius: `${buttonRadius}px`,
            }}
          >
            Prendre rendez-vous
          </span>
        </div>

        <div className="px-5 py-5" style={{ backgroundColor: palette.surfaceAlt }}>
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: stone }}
          >
            Fond alterné
          </span>
          <p className="mt-1.5 text-[12px]" style={{ color: inkSoft }}>
            Une section sur deux respire sur ce ton — l’alternance se sent,
            elle ne se voit pas.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Briques communes
   ══════════════════════════════════════════════════════════════════════ */

function Card({
  id,
  title,
  note,
  children,
}: {
  id: string
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-xl border border-border bg-white px-[22px] py-5"
    >
      <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h2>
      {note && (
        <p className="mt-1.5 max-w-[62ch] text-[12px] leading-[1.6] text-muted-foreground">
          {note}
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
  full,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  help?: string
  full?: boolean
  /** Erreur de validation renvoyée par l'action pour ce champ. */
  error?: string
}) {
  const id = `reglage-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`

  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <Label htmlFor={id} className="mb-2 block">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <FieldError>{error}</FieldError>}
      {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
    </div>
  )
}

/** Message d'erreur sous un champ — petit, dans la couleur destructive. */
function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-xs text-destructive">
      {children}
    </p>
  )
}

function RepeatableList<T>({
  items,
  onChange,
  blank,
  addLabel,
  render,
}: {
  items: T[]
  onChange: (next: T[]) => void
  blank: T
  addLabel: string
  render: (item: T, update: (next: T) => void) => React.ReactNode
}) {
  return (
    <div className="sm:col-span-2">
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                {render(item, (next) => {
                  const copy = [...items]
                  copy[index] = next
                  onChange(copy)
                })}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retirer"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, structuredClone(blank)])}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}
