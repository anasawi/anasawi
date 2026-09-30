'use client'

import { Check, ChevronDown, Plus, RotateCcw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { LogoPreview } from './LogoPreview'
import { MediaPicker } from './MediaPicker'
import {
  menuComplet,
  NavigationEditor,
  type NavigationEditorProps,
  type NavigationItem,
} from './NavigationEditor'
import { PageHeader } from './PageHeader'
import { PaletteProvider } from './PaletteProvider'
import {
  SeoEditor,
  seoDraftFrom,
  type SeoDraft,
  type SeoEditorProps,
} from './SeoEditor'
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
import { updateNavigation } from '@/server/actions/navigation'
import { updateSeo } from '@/server/actions/seo'
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
 * Trois jeux de données, enregistrés séparément : les deux premiers
 * onglets forment UN formulaire (les mêmes réglages, simplement triés),
 * le menu et le référencement en sont deux autres. Mais UNE seule barre
 * « Enregistrer », toujours au même endroit, toujours avec le même
 * vocabulaire : « Enregistrer » (grisé s'il n'y a rien à enregistrer),
 * « Enregistrement… », « Enregistré ✓ », et l'erreur en clair sous le
 * bouton s'il y en a une.
 *
 * TOUT l'état vit ici, et les quatre panneaux restent montés (les trois
 * inactifs sont simplement cachés) : ce qu'on tape dans un onglet survit
 * au passage dans un autre. Les onglets sont dans l'adresse
 * (`#apparence`) : un lien y mène directement.
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

/** Les trois jeux de données, chacun avec son propre enregistrement. */
type Groupe = 'formulaire' | 'menu' | 'referencement'
const groupeDe = (o: Onglet): Groupe =>
  o === 'menu' ? 'menu' : o === 'referencement' ? 'referencement' : 'formulaire'

/**
 * L'état d'un enregistrement : en cours, réussi (quelques secondes),
 * ou en erreur (jusqu'au prochain essai). Le message d'erreur est celui
 * du serveur, tel quel.
 */
function useEnregistrement() {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(t)
  }, [saved])

  /** `fn` renvoie le message d'erreur, ou null si tout s'est bien passé. */
  const lancer = (fn: () => Promise<string | null>) => {
    start(async () => {
      setError(null)
      setSaved(false)
      const erreur = await fn()
      if (erreur) setError(erreur)
      else setSaved(true)
    })
  }

  return { pending, saved, error, lancer }
}

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
  const [onglet, setOnglet] = useState<Onglet>('coordonnees')
  const tabRefs = useRef<Record<Onglet, HTMLButtonElement | null>>({
    coordonnees: null,
    apparence: null,
    menu: null,
    referencement: null,
  })

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
  /* Flèches gauche/droite, Début/Fin : le geste attendu d'une rangée
     d'onglets. */
  const clavierOnglets = (event: React.KeyboardEvent) => {
    const index = ONGLETS.findIndex((o) => o.id === onglet)
    let suivant: number | null = null
    if (event.key === 'ArrowRight') suivant = (index + 1) % ONGLETS.length
    else if (event.key === 'ArrowLeft')
      suivant = (index - 1 + ONGLETS.length) % ONGLETS.length
    else if (event.key === 'Home') suivant = 0
    else if (event.key === 'End') suivant = ONGLETS.length - 1
    if (suivant === null) return
    event.preventDefault()
    const id = ONGLETS[suivant]!.id
    choisir(id)
    tabRefs.current[id]?.focus()
  }

  /* ── Coordonnées + Apparence : un formulaire ─────────────────────── */

  const [dirtyForm, setDirtyForm] = useState(false)
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
    setDirtyForm(true)
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
    setDirtyForm(true)
    setPalette((p) => ({ ...p, [key]: hex }))
  }

  const formulaire = useEnregistrement()
  const enregistrerFormulaire = () =>
    formulaire.lancer(async () => {
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
        return content.error
      }
      if (!identity.ok) {
        toast.error(identity.error)
        return identity.error
      }

      setFieldErrors({})
      setDirtyForm(false)
      toast.success('Réglages enregistrés — tout le site est à jour.')
      router.refresh()
      return null
    })

  /* ── Menu du site ───────────────────────────────────────────────── */

  const [dirtyMenu, setDirtyMenu] = useState(false)
  const [menuItems, setMenuItems] = useState<NavigationItem[]>(menu.initial)
  const [menuErrors, setMenuErrors] = useState<Record<string, string[]>>({})
  const menuValide = menuComplet(menuItems)

  const menuSauvegarde = useEnregistrement()
  const enregistrerMenu = () =>
    menuSauvegarde.lancer(async () => {
      const result = await updateNavigation(menuItems)
      if (!result.ok) {
        setMenuErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return result.error
      }
      setMenuErrors({})
      setDirtyMenu(false)
      toast.success('Menu enregistré — le site est à jour.')
      router.refresh()
      return null
    })

  /* ── Référencement ──────────────────────────────────────────────── */

  const [dirtySeo, setDirtySeo] = useState(false)
  const [seo, setSeo] = useState<SeoDraft>(() =>
    seoDraftFrom(referencement?.seo ?? null, settings),
  )
  const [seoErrors, setSeoErrors] = useState<Record<string, string[]>>({})

  const seoSauvegarde = useEnregistrement()
  const enregistrerSeo = () =>
    seoSauvegarde.lancer(async () => {
      if (!referencement) return null
      const result = await updateSeo(referencement.page.id, {
        title: seo.title || null,
        description: seo.description || null,
        canonical: seo.canonical || null,
        ogMediaId: seo.ogMediaId,
        robotsIndex: seo.robotsIndex,
        robotsFollow: seo.robotsFollow,
        keywords: referencement.seo?.keywords ?? [],
      })
      if (!result.ok) {
        setSeoErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return result.error
      }
      setSeoErrors({})
      setDirtySeo(false)
      toast.success('Référencement enregistré — le site est à jour.')
      router.refresh()
      return null
    })

  /* ── La barre, selon l'onglet ───────────────────────────────────── */

  const dirtyDe: Record<Groupe, boolean> = {
    formulaire: dirtyForm,
    menu: dirtyMenu,
    referencement: dirtySeo,
  }
  const groupe = groupeDe(onglet)
  const barre =
    groupe === 'menu'
      ? {
          etat: menuSauvegarde,
          dirty: dirtyMenu,
          onSave: enregistrerMenu,
          bloque: menuValide
            ? null
            : 'Chaque lien doit avoir un texte et une destination.',
        }
      : groupe === 'referencement'
        ? {
            etat: seoSauvegarde,
            dirty: dirtySeo,
            onSave: enregistrerSeo,
            bloque: null,
          }
        : {
            etat: formulaire,
            dirty: dirtyForm,
            onSave: enregistrerFormulaire,
            bloque: null,
          }

  /* Quitter avec des modifications non enregistrées, dans n'importe quel
     onglet : le navigateur demande confirmation. */
  const dirtyQuelquePart = dirtyForm || dirtyMenu || dirtySeo
  useEffect(() => {
    if (!dirtyQuelquePart) return
    const garde = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', garde)
    return () => window.removeEventListener('beforeunload', garde)
  }, [dirtyQuelquePart])

  return (
    <PaletteProvider palette={palette}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-ivory">
        <div className="mx-auto max-w-[960px] px-5 py-8 sm:px-8 sm:py-11">
          <PageHeader
            title="Réglages"
            description="Tout ce qui vaut pour le site entier : qui vous êtes, comment on vous joint, vos couleurs, votre menu et ce que Google affiche."
          />
          <p className="-mt-3 mb-6 flex items-start gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 text-[13px] text-ink-soft">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Les réglages sont visibles sur le site dès que vous enregistrez.
          </p>

          {/* Onglets */}
          <div
            role="tablist"
            aria-label="Réglages"
            onKeyDown={clavierOnglets}
            className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
          >
            {ONGLETS.map((o) => {
              const actif = onglet === o.id
              const modifie = dirtyDe[groupeDe(o.id)] && !actif
              return (
                <button
                  key={o.id}
                  ref={(el) => {
                    tabRefs.current[o.id] = el
                  }}
                  type="button"
                  role="tab"
                  id={`onglet-${o.id}`}
                  aria-selected={actif}
                  aria-controls={`panneau-${o.id}`}
                  tabIndex={actif ? 0 : -1}
                  onClick={() => choisir(o.id)}
                  className={cn(
                    '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    actif
                      ? 'border-primary font-medium text-primary'
                      : 'border-transparent text-ink-soft hover:text-foreground',
                  )}
                >
                  {o.label}
                  {/* Point ambre : « il y a du non-enregistré là-bas ». Décoratif
                      pour le lecteur d'écran (le nom de l'onglet ne change pas) ;
                      la barre du bas porte l'information en toutes lettres. */}
                  {modifie ? (
                    <span
                      aria-hidden="true"
                      title="Modifications non enregistrées"
                      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#c98a2d] align-middle"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Les quatre panneaux restent montés : ce qu'on y tape survit
              au changement d'onglet. Seul l'actif est visible. */}
          <Panneau id="coordonnees" actif={onglet === 'coordonnees'}>
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
                  setDirtyForm(true)
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
                label="Lien de prise de rendez-vous"
                value={form.bookingUrl}
                onChange={(v) => set('bookingUrl', v)}
                placeholder="https://…"
                help="Si vide, le bouton « Prendre rendez-vous » mène vers la section Contact."
                full
                error={errorOf('bookingUrl')}
              />

              <div className="sm:col-span-2">
                <Label htmlFor="reglage-informations-pratiques" className="mb-2 block">
                  Informations pratiques
                </Label>
                <Textarea
                  id="reglage-informations-pratiques"
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
                    setDirtyForm(true)
                    setSocials(next)
                  }}
                  blank={{ label: '', url: '' }}
                  addLabel="Ajouter un réseau"
                  render={(item, update, index) => (
                    <>
                      <Input
                        value={item.label}
                        placeholder="Instagram"
                        aria-label={`Nom du réseau ${index + 1}`}
                        onChange={(e) =>
                          update({ ...item, label: e.target.value })
                        }
                      />
                      <Input
                        value={item.url}
                        placeholder="https://…"
                        aria-label={`Adresse du réseau ${index + 1}`}
                        onChange={(e) =>
                          update({ ...item, url: e.target.value })
                        }
                      />
                    </>
                  )}
                />
              </div>

              {/* Latitude et longitude : utiles aux cartes, jamais tapées
                  de tête — donc à l'écart, avec la marche à suivre. */}
              <OptionsAvancees
                id="coordonnees-avance"
                forcer={Boolean(errorOf('latitude') || errorOf('longitude'))}
                ouvertAuDepart={Boolean(form.latitude || form.longitude)}
                help="Facultatif — situe le cabinet sur les cartes (Google Maps, Apple Plans). Trouvez ces deux nombres sur Google Maps : clic droit sur le lieu, le premier nombre est la latitude, le second la longitude."
              >
                <Field
                  label="Latitude"
                  value={form.latitude}
                  onChange={(v) => set('latitude', v)}
                  placeholder="48.1213"
                  error={errorOf('latitude')}
                />
                <Field
                  label="Longitude"
                  value={form.longitude}
                  onChange={(v) => set('longitude', v)}
                  placeholder="-1.6033"
                  error={errorOf('longitude')}
                />
              </OptionsAvancees>
            </Card>

            <Card
              id="horaires"
              title="Horaires"
              note="Une ligne par plage — le libellé de gauche est affiché tel quel."
            >
              <RepeatableList
                items={hours}
                onChange={(next) => {
                  setDirtyForm(true)
                  setHours(next)
                }}
                blank={{ day: '', hours: '' }}
                addLabel="Ajouter un horaire"
                render={(item, update, index) => (
                  <>
                    <Input
                      value={item.day}
                      placeholder="Lundi – Vendredi"
                      aria-label={`Jours de la plage ${index + 1}`}
                      onChange={(e) => update({ ...item, day: e.target.value })}
                    />
                    <Input
                      value={item.hours}
                      placeholder="09:00 – 19:00"
                      aria-label={`Heures de la plage ${index + 1}`}
                      onChange={(e) =>
                        update({ ...item, hours: e.target.value })
                      }
                    />
                  </>
                )}
              />
            </Card>
          </Panneau>

          <Panneau id="apparence" actif={onglet === 'apparence'}>
            <PaletteCard
              palette={palette}
              buttonRadius={buttonRadius}
              onChange={setRole}
              onReset={() => {
                setDirtyForm(true)
                setPalette({ ...DEFAULT_PALETTE })
              }}
            />
            <Card
              id="formes"
              title="Formes et respiration"
              note="Deux réglages de forme, valables pour tout le site."
            >
              <div className="sm:col-span-2">
                <Label htmlFor="reglage-arrondi" className="mb-1.5 block">
                  Arrondi des boutons — {buttonRadius} px
                </Label>
                <input
                  id="reglage-arrondi"
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={buttonRadius}
                  onChange={(e) => {
                    setDirtyForm(true)
                    setButtonRadius(Number(e.target.value))
                  }}
                  className="w-full accent-[#46728a]"
                  aria-label="Arrondi des boutons"
                />
              </div>

              <div className="sm:col-span-2">
                <p id="reglage-respiration" className="mb-1.5 block text-[0.76rem] font-medium leading-none text-muted-foreground">
                  Respiration des sections
                </p>
                <div
                  role="group"
                  aria-labelledby="reglage-respiration"
                  className="flex flex-wrap gap-1.5"
                >
                  {(
                    [
                      ['compact', 'Compacte'],
                      ['normal', 'Normale'],
                      ['aere', 'Aérée'],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={spacing === key ? 'default' : 'outline'}
                      aria-pressed={spacing === key}
                      onClick={() => {
                        setDirtyForm(true)
                        setSpacing(key)
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </Panneau>

          <Panneau id="menu" actif={onglet === 'menu'}>
            <NavigationEditor
              items={menuItems}
              suggestions={menu.suggestions}
              fieldErrors={menuErrors}
              onChange={(next) => {
                setDirtyMenu(true)
                /* Les erreurs sont indexées par position : toute
                   modification les rend caduques. */
                setMenuErrors({})
                setMenuItems(next)
              }}
            />
          </Panneau>

          <Panneau id="referencement" actif={onglet === 'referencement'}>
            {referencement ? (
              <SeoEditor
                page={referencement.page}
                library={referencement.library}
                siteName={referencement.siteName}
                value={seo}
                fieldErrors={seoErrors}
                onChange={(next) => {
                  setDirtySeo(true)
                  setSeo(next)
                }}
              />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Le référencement se règle une fois la page d’accueil créée.
              </p>
            )}
          </Panneau>

          {/* LA barre d'enregistrement : une seule, collée au bas de la
              zone qui défile, qui dit toujours où l'on en est. */}
          {(groupe !== 'referencement' || referencement) && (
            <BarreEnregistrement
              dirty={barre.dirty}
              pending={barre.etat.pending}
              saved={barre.etat.saved}
              error={barre.etat.error}
              bloque={barre.bloque}
              onSave={barre.onSave}
            />
          )}
        </div>
      </div>
    </PaletteProvider>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Onglets et barre
   ══════════════════════════════════════════════════════════════════════ */

function Panneau({
  id,
  actif,
  children,
}: {
  id: Onglet
  actif: boolean
  children: React.ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={`panneau-${id}`}
      aria-labelledby={`onglet-${id}`}
      hidden={!actif}
      className="min-w-0 space-y-[22px]"
    >
      {children}
    </div>
  )
}

function BarreEnregistrement({
  dirty,
  pending,
  saved,
  error,
  bloque,
  onSave,
}: {
  dirty: boolean
  pending: boolean
  saved: boolean
  error: string | null
  /** Pourquoi on ne peut pas enregistrer pour l'instant (champ manquant). */
  bloque: string | null
  onSave: () => void
}) {
  const libelle = pending
    ? 'Enregistrement…'
    : saved && !dirty
      ? 'Enregistré ✓'
      : 'Enregistrer'

  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-7 border-t border-border bg-ivory/90 px-5 py-3.5 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <span
          aria-live="polite"
          className={cn(
            'flex items-center gap-1.5 text-[12.5px]',
            dirty && !pending ? 'text-[#8a5f1e]' : 'text-muted-foreground',
          )}
        >
          {pending ? (
            'Enregistrement en cours…'
          ) : dirty ? (
            <>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#c98a2d]" />
              {bloque ?? 'Modifications non enregistrées'}
            </>
          ) : (
            <>
              <Check className="h-[14px] w-[14px] text-primary" aria-hidden="true" />
              Tout est enregistré
            </>
          )}
        </span>
        <Button
          onClick={onSave}
          disabled={pending || !dirty || Boolean(bloque)}
          className="w-full sm:w-auto"
        >
          {libelle}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive sm:text-right">
          {error}
        </p>
      )}
    </div>
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
  const lisible = contrast >= 4.5
  /* Le code de la couleur (#46728a) ne parle qu'aux personnes qui le
     connaissent déjà : il se montre sur demande. */
  const [avance, setAvance] = useState(false)

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
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={avance}
            onClick={() => setAvance((v) => !v)}
          >
            Avancé
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw />
            Revenir à la charte
          </Button>
        </div>
      </div>

      {/* Une rangée par rôle : la pastille, le nom, les nuances (et le
          code, en mode avancé). Tout tient sur une ligne — la palette se
          lit d'un regard. */}
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
              <p className="mt-0.5 text-xs text-muted-foreground">
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

            {avance && (
              <span className="w-[74px] shrink-0 text-right font-mono text-xs uppercase text-muted-foreground">
                {palette[role.key]}
              </span>
            )}
          </div>
        ))}
      </div>

      <p
        aria-live="polite"
        title={`Contraste ${contrast.toFixed(1)}:1`}
        className={cn(
          'mt-3 rounded-md px-3.5 py-2.5 text-[12px] leading-relaxed',
          lisible
            ? 'bg-ivory text-muted-foreground'
            : 'bg-[#fbf0ee] text-destructive',
        )}
      >
        {lisible
          ? 'Lisible ✓ — le texte se lit bien sur le fond principal.'
          : 'Texte difficile à lire sur ce fond — assombrissez l’encre ou éclaircissez le fond.'}
      </p>

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
      <p className="mb-1.5 text-xs uppercase tracking-[0.1em] text-muted-foreground">
        Aperçu
      </p>
      <div
        className="overflow-hidden rounded-lg border border-border"
        style={{ backgroundColor: palette.surface }}
      >
        <div className="px-5 py-6">
          <span
            className="text-xs font-semibold uppercase tracking-[0.24em]"
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
            className="mt-4 inline-block px-4 py-2 text-[12px]"
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
            className="text-xs uppercase tracking-[0.18em]"
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

/**
 * Un bloc replié « Options avancées » : ce qu'on ne touche presque
 * jamais, à l'écart mais à portée. S'ouvre tout seul si quelque chose y
 * est déjà renseigné ou si le serveur y signale une erreur.
 */
function OptionsAvancees({
  id,
  help,
  forcer,
  ouvertAuDepart,
  children,
}: {
  id: string
  help: string
  forcer: boolean
  ouvertAuDepart: boolean
  children: React.ReactNode
}) {
  const [ouvert, setOuvert] = useState(ouvertAuDepart)
  const visible = ouvert || forcer

  return (
    <div className="sm:col-span-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={visible}
        aria-controls={id}
        onClick={() => setOuvert((v) => !v)}
        className="-ml-2"
      >
        <ChevronDown
          className={cn('transition-transform', visible && 'rotate-180')}
        />
        {visible ? 'Masquer' : 'Afficher'} les options avancées
      </Button>
      {visible && (
        <div id={id} className="mt-2 rounded-lg border border-border bg-ivory/50 p-4">
          <p className="mb-4 text-xs leading-[1.6] text-muted-foreground">
            {help}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </div>
      )}
    </div>
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
  render: (item: T, update: (next: T) => void, index: number) => React.ReactNode
}) {
  return (
    <div className="sm:col-span-2">
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                {render(
                  item,
                  (next) => {
                    const copy = [...items]
                    copy[index] = next
                    onChange(copy)
                  },
                  index,
                )}
              </div>
              {/* Retirer une ligne : un bouton nommé, pas une icône seule. */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Retirer la ligne ${index + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X />
                Retirer
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
