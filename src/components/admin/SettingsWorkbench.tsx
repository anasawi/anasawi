'use client'

import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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
import { ApparenceTab, type Spacing } from './settings/ApparenceTab'
import { CoordonneesTab, type CoordonneesForm } from './settings/CoordonneesTab'
import { useSaveState } from './settings/hooks/useSaveState'
import { Button } from '@/components/ui/button'
import type { Identity } from '@/lib/identity'
import {
  DEFAULT_PALETTE,
  paletteFromIdentity,
  type Palette,
  type PaletteRole,
} from '@/lib/palette'
import { cn } from '@/lib/utils'
import { updateSettings } from '@/server/actions/content'
import { updateIdentity } from '@/server/actions/identity'
import { updateNavigation } from '@/server/actions/navigation'
import { updateSeo } from '@/server/actions/seo'
import type { Media, Settings, OpeningHour, SocialLink } from '@/server/db/schema'

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

const ONGLETS = [
  { id: 'coordonnees', label: 'Coordonnées' },
  { id: 'apparence', label: 'Apparence' },
  { id: 'menu', label: 'Menu du site' },
  { id: 'referencement', label: 'Référencement' },
] as const
type Onglet = (typeof ONGLETS)[number]['id']

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
  const [form, setForm] = useState<CoordonneesForm>({
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
  const [spacing, setSpacing] = useState<Spacing>(
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

  const formulaire = useSaveState()
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

  const menuSauvegarde = useSaveState()
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

  const seoSauvegarde = useSaveState()
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
                      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Les quatre panneaux restent montés : ce qu'on y tape survit
              au changement d'onglet. Seul l'actif est visible. */}
          <Panneau id="coordonnees" actif={onglet === 'coordonnees'}>
            <CoordonneesTab
              form={form}
              onField={set}
              errorOf={errorOf}
              hours={hours}
              onHours={(next) => {
                setDirtyForm(true)
                setHours(next)
              }}
              socials={socials}
              onSocials={(next) => {
                setDirtyForm(true)
                setSocials(next)
              }}
              logoMediaId={logoMediaId}
              onLogo={(id) => {
                setDirtyForm(true)
                setLogoMediaId(id)
              }}
              library={library}
            />
          </Panneau>

          <Panneau id="apparence" actif={onglet === 'apparence'}>
            <ApparenceTab
              palette={palette}
              buttonRadius={buttonRadius}
              spacing={spacing}
              onRole={setRole}
              onReset={() => {
                setDirtyForm(true)
                setPalette({ ...DEFAULT_PALETTE })
              }}
              onRadius={(px) => {
                setDirtyForm(true)
                setButtonRadius(px)
              }}
              onSpacing={(value) => {
                setDirtyForm(true)
                setSpacing(value)
              }}
            />
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
            dirty && !pending ? 'text-warning-ink' : 'text-muted-foreground',
          )}
        >
          {pending ? (
            'Enregistrement en cours…'
          ) : dirty ? (
            <>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
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
