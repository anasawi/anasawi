'use client'

import { ArrowLeftRight, Check, IdCard, Menu, PanelBottom, Palette, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  menuComplet,
  NavigationEditor,
  type NavigationEditorProps,
  type NavigationItem,
} from './NavigationEditor'
import { AdminContent } from './AdminContent'
import { SynchroWorkbench } from './SynchroWorkbench'
import { PASTELS } from './editor/pastels'
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
import { MenuModerneCard } from './settings/MenuModerneCard'
import { PiedTab } from './settings/PiedTab'
import { Repli } from './form/Repli'
import { useSaveState } from './settings/hooks/useSaveState'
import { Button } from '@/components/ui/button'
import type { Identity } from '@/lib/identity'
import {
  DEFAULT_PALETTE,
  paletteFromIdentity,
  type Palette as PaletteCouleurs,
  type PaletteRole,
} from '@/lib/palette'
import { cn } from '@/lib/utils'
import { updateSettings } from '@/server/actions/content'
import { updatePied } from '@/server/actions/pied'
import { lirePied, type Pied } from '@/lib/pied'
import type { StyleModerne } from '@/lib/style-moderne'
import { updateIdentity } from '@/server/actions/identity'
import { updateNavigation } from '@/server/actions/navigation'
import { updateSeo } from '@/server/actions/seo'
import type { Media, Settings, OpeningHour, SocialLink } from '@/server/db/schema'
import type { ConfigSynchro } from '@/server/synchronisation'

/**
 * Les réglages du site — un écran, cinq onglets (le dernier,
 * Synchronisation, n'a rien à enregistrer : il agit).
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
  {
    id: 'coordonnees',
    label: 'Coordonnées',
    resume: 'Identité, contact, horaires',
    description: 'Qui vous êtes, comment on vous joint, quand vous recevez.',
    icone: IdCard,
    tone: PASTELS[0]!,
  },
  {
    id: 'apparence',
    label: 'Apparence',
    resume: 'Couleurs, polices, animations',
    description: 'Les couleurs, les polices et les animations du site.',
    icone: Palette,
    tone: PASTELS[2]!,
  },
  {
    id: 'menu',
    label: 'Menu du site',
    resume: 'Les liens du haut de page',
    description: 'Les entrées du menu, dans l’ordre où elles s’affichent.',
    icone: Menu,
    tone: PASTELS[1]!,
  },
  {
    id: 'pied',
    label: 'Pied de page',
    resume: 'Organismes, collègues, légal',
    description: 'Les logos des organismes, vos engagements, les sites de collègues, les mentions légales.',
    icone: PanelBottom,
    tone: PASTELS[3]!,
  },
  {
    id: 'referencement',
    label: 'Référencement',
    resume: 'Ce que Google affiche',
    description: 'Le titre, la description et l’image montrés par Google et au partage.',
    icone: Search,
    tone: PASTELS[5]!,
  },
  {
    id: 'synchronisation',
    label: 'Synchronisation',
    resume: 'Préprod ⇄ production',
    description: 'Envoyer le contenu de ce site vers l’autre environnement — avec sauvegarde.',
    icone: ArrowLeftRight,
    tone: { bg: '#f6e7e4', fg: '#9a3a2c' },
  },
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
    organismes: 'pied',
    mentions: 'pied',
    footer: 'pied',
  }
  const cible = correspondances[hash] ?? hash
  return ONGLETS.some((o) => o.id === cible) ? (cible as Onglet) : 'coordonnees'
}

const DEFAULT_RADIUS = 2

/** Les trois jeux de données, chacun avec son propre enregistrement. */
type Groupe = 'formulaire' | 'menu' | 'referencement' | 'pied'
const groupeDe = (o: Onglet): Groupe =>
  o === 'menu' ? 'menu' : o === 'referencement' ? 'referencement' : o === 'pied' ? 'pied' : 'formulaire'

export function SettingsWorkbench({
  settings,
  identity: initialIdentity,
  library,
  menu,
  referencement,
  synchro,
}: {
  settings: Settings
  identity: Identity
  library: Media[]
  menu: NavigationEditorProps
  referencement: SeoEditorProps | null
  synchro: { config: ConfigSynchro | null; phrase: string; proprietaire: boolean }
}) {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('coordonnees')
  const tabRefs = useRef<Record<Onglet, HTMLButtonElement | null>>({
    coordonnees: null,
    apparence: null,
    menu: null,
    pied: null,
    referencement: null,
    synchronisation: null,
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
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') suivant = (index + 1) % ONGLETS.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
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
  const [palette, setPalette] = useState<PaletteCouleurs>(() =>
    paletteFromIdentity(initialIdentity),
  )
  const [buttonRadius, setButtonRadius] = useState(
    initialIdentity.buttonRadius ?? DEFAULT_RADIUS,
  )
  const [spacing, setSpacing] = useState<Spacing>(
    initialIdentity.spacing ?? 'normal',
  )
  const [styleModerne, setStyleModerne] = useState<StyleModerne>(initialIdentity.moderne ?? {})

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

  const faireFormulaire =
    (async (): Promise<string | null> => {
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
        updateIdentity({ palette, buttonRadius, spacing, moderne: styleModerne }),
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
      router.refresh()
      return null
    })

  /* ── Menu du site ───────────────────────────────────────────────── */

  const [dirtyMenu, setDirtyMenu] = useState(false)
  const [menuItems, setMenuItems] = useState<NavigationItem[]>(menu.initial)
  const [menuErrors, setMenuErrors] = useState<Record<string, string[]>>({})
  const menuValide = menuComplet(menuItems)

  const faireMenu =
    (async (): Promise<string | null> => {
      const result = await updateNavigation(menuItems)
      if (!result.ok) {
        setMenuErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return result.error
      }
      setMenuErrors({})
      setDirtyMenu(false)
      router.refresh()
      return null
    })

  /* ── Référencement ──────────────────────────────────────────────── */

  const [dirtySeo, setDirtySeo] = useState(false)
  const [seo, setSeo] = useState<SeoDraft>(() =>
    seoDraftFrom(referencement?.seo ?? null, settings),
  )
  const [seoErrors, setSeoErrors] = useState<Record<string, string[]>>({})

  const faireSeo =
    (async (): Promise<string | null> => {
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
      router.refresh()
      return null
    })

  /* ── Pied de page ───────────────────────────────────────────────── */

  const [dirtyPied, setDirtyPied] = useState(false)
  const [pied, setPied] = useState<Pied>(() => lirePied(settings.pied))
  const fairePied =
    (async (): Promise<string | null> => {
      const result = await updatePied(pied)
      if (!result.ok) {
        toast.error(result.error)
        return result.error
      }
      setDirtyPied(false)
      router.refresh()
      return null
    })

  /* ── La barre, selon l'onglet ───────────────────────────────────── */

  const dirtyDe: Record<Groupe, boolean> = {
    formulaire: dirtyForm,
    menu: dirtyMenu,
    referencement: dirtySeo,
    pied: dirtyPied,
  }

  /* UN SEUL enregistrement pour tous les onglets : ce qui a changé, où
     que ce soit, part d'un coup. On ne se demande pas « ai-je enregistré
     l'autre onglet ? ». */
  const sauvegarde = useSaveState()
  const enregistrerTout = () =>
    sauvegarde.lancer(async () => {
      const etapes: [boolean, () => Promise<string | null>][] = [
        [dirtyForm, faireFormulaire],
        [dirtyMenu, faireMenu],
        [dirtySeo && Boolean(referencement), faireSeo],
        [dirtyPied, fairePied],
      ]
      for (const [aFaire, faire] of etapes) {
        if (!aFaire) continue
        const erreur = await faire()
        if (erreur) return erreur
      }
      toast.success('Enregistré — le site est à jour.')
      return null
    })
  const barre = {
    etat: sauvegarde,
    dirty: dirtyForm || dirtyMenu || dirtySeo || dirtyPied,
    onSave: enregistrerTout,
    bloque: dirtyMenu && !menuValide ? 'Menu du site classique : chaque lien doit avoir un texte et une destination.' : null,
  }

  /* Quitter avec des modifications non enregistrées, dans n'importe quel
     onglet : le navigateur demande confirmation. */
  const dirtyQuelquePart = dirtyForm || dirtyMenu || dirtySeo || dirtyPied
  useEffect(() => {
    if (!dirtyQuelquePart) return
    const garde = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', garde)
    return () => window.removeEventListener('beforeunload', garde)
  }, [dirtyQuelquePart])

  const courant = ONGLETS.find((o) => o.id === onglet)!
  const IconeCourante = courant.icone
  const defilement = useRef<HTMLDivElement>(null)
  /* Changer d'onglet ramène en haut du panneau : on ne reprend pas au
     milieu d'un autre formulaire. */
  useEffect(() => {
    defilement.current?.scrollTo({ top: 0 })
  }, [onglet])

  return (
    <PaletteProvider palette={palette}>
      <AdminContent width="wide">
        <PageHeader
          overline="Votre site"
          title="Réglages"
          description="Ce qui vaut pour le site entier — visible dès que vous enregistrez."
        />

        {/* Le cadre gris, comme Médias et Messages : les rubriques à
            gauche, la rubrique ouverte à droite, qui défile seule. */}
        <div className="bloc-ecran grid gap-2 rounded-[24px] bg-block p-2 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div
            role="tablist"
            aria-label="Réglages"
            aria-orientation="vertical"
            onKeyDown={clavierOnglets}
            className="grid gap-0.5 p-1 max-lg:grid-cols-2 lg:content-start lg:p-2"
          >
            {ONGLETS.map((o) => {
              const actif = onglet === o.id
              const modifie = o.id !== 'synchronisation' && dirtyDe[groupeDe(o.id)]
              const Icone = o.icone
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
                    'group flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    actif ? 'bg-white shadow-[0_1px_2px_rgba(22,73,81,0.06)]' : 'hover:bg-white/60',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.06]"
                    style={{ background: o.tone.bg, color: o.tone.fg }}
                  >
                    <Icone className="h-[17px] w-[17px]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-[14px]',
                        actif ? 'font-semibold text-foreground' : 'font-medium text-[#46606c]',
                      )}
                    >
                      {o.label}
                    </span>
                    <span className="block truncate text-[12px] text-[#8aa4a8] max-sm:hidden">{o.resume}</span>
                  </span>
                  {/* « Il y a du non-enregistré là » — décoratif ; la barre
                      d'enregistrement le dit en toutes lettres. */}
                  {modifie && (
                    <span
                      aria-hidden="true"
                      title="Modifications non enregistrées"
                      className="h-2 w-2 shrink-0 rounded-full bg-[#176c79]"
                    />
                  )}
                </button>
              )
            })}
          </div>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px] bg-white">
            <header className="flex items-center gap-3.5 border-b border-[#eef1f2] px-5 py-4 sm:px-7">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
                style={{ background: courant.tone.bg, color: courant.tone.fg }}
              >
                <IconeCourante className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <div key={onglet} className="min-w-0 animate-[adm-fade_0.25s_ease_both]">
                <h2 className="text-[17px] font-semibold text-foreground">{courant.label}</h2>
                <p className="truncate text-[13px] text-muted-foreground">{courant.description}</p>
              </div>
            </header>

            {/* Les quatre panneaux restent montés : ce qu'on y tape survit
                au changement d'onglet. Seul l'actif est visible. */}
            <div
              ref={defilement}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-width:thin] sm:px-7 sm:py-6"
            >
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
                  styleModerne={styleModerne}
                  onStyleModerne={(next) => {
                    setDirtyForm(true)
                    setStyleModerne(next)
                  }}
                  nom={form.practitionerName}
                />
              </Panneau>

              <Panneau id="menu" actif={onglet === 'menu'}>
                <MenuModerneCard
                  pied={pied}
                  onChange={(next) => {
                    setDirtyPied(true)
                    setPied(next)
                  }}
                />
                <Repli titre="Site classique" note="Son menu se compose à la main : les sections de l’accueil classique, dans l’ordre voulu.">
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
                </Repli>
              </Panneau>

              <Panneau id="pied" actif={onglet === 'pied'}>
                <PiedTab
                  pied={pied}
                  library={library}
                  onChange={(next) => {
                    setDirtyPied(true)
                    setPied(next)
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

              <Panneau id="synchronisation" actif={onglet === 'synchronisation'}>
                {/* Monté à la première ouverture seulement : il interroge l'autre site. */}
                {onglet === 'synchronisation' && <SynchroWorkbench {...synchro} />}
              </Panneau>
            </div>

            {/* LA barre d'enregistrement : une seule, au pied du panneau,
                toujours au même endroit. */}
            {onglet !== 'synchronisation' && (
              <BarreEnregistrement
                dirty={barre.dirty}
                pending={barre.etat.pending}
                saved={barre.etat.saved}
                error={barre.etat.error}
                bloque={barre.bloque}
                onSave={barre.onSave}
              />
            )}
          </section>
        </div>
      </AdminContent>
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
      className="min-w-0 space-y-3"
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
    <div className="border-t border-[#eef1f2] bg-white px-5 py-3 sm:px-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <span
          aria-live="polite"
          className={cn(
            'flex items-center gap-1.5 text-[13px]',
            dirty && !pending ? 'font-medium text-[#176c79]' : 'text-muted-foreground',
          )}
        >
          {pending ? (
            'Enregistrement en cours…'
          ) : dirty ? (
            <>
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#176c79]" />
              {bloque ?? 'Modifications non enregistrées'}
            </>
          ) : (
            <>
              <Check className="h-[14px] w-[14px] text-success" aria-hidden="true" />
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
