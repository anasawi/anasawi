'use client'

import { Bookmark, Check, ChevronDown, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { BlockForm } from './BlockForm'
import { ColorPicker } from './ColorPicker'
import { StylePanel, type StyleBreakpoint } from './StylePanel'
import type { FieldDescriptor } from '@/blocks/field'
import { getBlock } from '@/blocks/registry'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { parseNodeStyles, type NodeStyles } from '@/lib/node-styles'
import { cn, slugify } from '@/lib/utils'
import {
  parseSectionSettings,
  type SectionSettings,
} from '@/lib/section-settings'
import {
  saveSectionAsTemplate,
  updateSection,
  updateSectionSettings,
} from '@/server/actions/pages'
import type { HistoryEntry } from './history'
import type { ActionResult } from '@/server/actions/types'
import type { Media, SavedSection, Section } from '@/server/db/schema'

/** File d'actions : chaque écriture y passe, et un rejet (réseau) en
    ressort comme un résultat en échec. */
type RunAction = <T extends ActionResult<unknown>>(
  fn: () => Promise<T>,
) => Promise<T>

/** Sans file d'actions fournie, l'action part directement. */
const runDirectly: RunAction = (fn) => fn()

/** Brouillon complet du panneau — la forme que reçoit le constructeur à
    chaque frappe pour mettre le canvas à jour immédiatement. */
export type SectionDraft = {
  payload: Record<string, unknown>
  meta: {
    anchor: string | null
    navLabel: string | null
    showInNav: boolean
    isActive: boolean
    backgroundColor: string
  }
  styles: NodeStyles | null
}

/* ── Groupe repliable — contrôlé, pour animer le chevron proprement ──── */

function Group({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border py-[13px] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-[12.5px] font-medium text-foreground"
      >
        {title}
        <ChevronDown
          className={cn(
            'h-[10px] w-[10px] text-stone transition-transform duration-200',
            open && 'rotate-180',
          )}
          strokeWidth={2}
        />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  )
}

/**
 * Panneau d'édition du bloc sélectionné.
 *
 * Aucun bouton « Enregistrer » : chaque modification est appliquée au
 * canvas À L'INSTANT (via `onDraft`) puis écrite en base après une courte
 * accalmie de frappe. Le panneau affiche l'état de l'enregistrement, et
 * chaque rafale enregistrée devient une entrée d'historique (⌘Z).
 */
type SectionInspectorProps = {
  section: Section
  library: Media[]
  onClose: () => void
  /** Signale une écriture réussie — le constructeur recharge l'aperçu. */
  onMutated?: () => void
  /** Enregistre l'inverse d'un enregistrement pour le ⌘Z du constructeur. */
  pushHistory?: (entry: HistoryEntry) => void
  /** Breakpoint d'édition des styles — suit le sélecteur de viewport. */
  styleBreakpoint?: StyleBreakpoint
  /** Suppression avec instantané — non utilisée ici : la suppression vit
      dans la liste des sections, à gauche. Conservée pour compatibilité. */
  onDelete?: (id: string) => Promise<ActionResult<unknown>>
  /** Application immédiate du brouillon sur le canvas, à chaque frappe. */
  onDraft?: (id: string, draft: SectionDraft) => void
  /** Remonte l'état d'écriture — l'indicateur « Enregistré » du haut. */
  onSaveStateChange?: (state: 'saved' | 'dirty' | 'saving') => void
  /** Mode CMS à modèles : pas de réglages de style avancés — l'apparence
      est l'affaire du modèle. Seule la couleur de fond reste réglable. */
  simple?: boolean
  /** File d'actions du constructeur : chaque écriture y passe pour ne
      jamais partir pendant qu'une autre est en vol. */
  runAction?: RunAction
  /** Réglages (animation, bord, décor) appliqués au canvas sans
      rechargement — l'équivalent d'`onDraft` pour `settings`. */
  onSettings?: (id: string, settings: SectionSettings) => void
  /** Un modèle personnel vient d'être créé — le constructeur l'ajoute à
      « Mes sections » sans recharger la page. */
  onSaved?: (saved: SavedSection) => void
  /** Groupes dépliés à l'ouverture (tous repliés par défaut). */
  initialOpen?: Partial<{
    content: boolean
    button: boolean
    style: boolean
    advanced: boolean
  }>
  /** Le constructeur y trouve de quoi écrire le reliquat de frappe
      AVANT une publication — sans attendre la fin du délai d'accalmie. */
  flushRef?: { current: (() => Promise<void>) | null }
}

export function SectionInspector({
  section,
  library,
  onClose,
  onMutated,
  pushHistory,
  styleBreakpoint = 'base',
  onDraft,
  onSaveStateChange,
  simple = false,
  runAction,
  onSettings,
  onSaved,
  initialOpen,
  flushRef,
}: SectionInspectorProps) {
  const router = useRouter()
  const block = getBlock(section.type)
  const run: RunAction = runAction ?? runDirectly

  const [payload, setPayload] = useState<Record<string, unknown>>(
    (section.payload as Record<string, unknown>) ?? {},
  )
  const [meta, setMeta] = useState({
    anchor: section.anchor ?? '',
    navLabel: section.navLabel ?? '',
    showInNav: section.showInNav,
    isActive: section.isActive,
    backgroundColor: section.backgroundColor,
  })
  const [styles, setStyles] = useState<NodeStyles | null>(
    parseNodeStyles(section.styles),
  )
  const [pending, start] = useTransition()
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving'>('saved')
  /** « Enregistrer comme modèle » : null = fermé, sinon le nom en cours. */
  const [modelName, setModelName] = useState<string | null>(null)
  /** Animation d'apparition — écrite immédiatement, hors du flux payload. */
  const [anim, setAnim] = useState<SectionSettings>(() =>
    parseSectionSettings(section.settings),
  )
  /** Groupes ouverts — TOUS repliés à l'arrivée : on ouvre ce dont on a
      besoin, le panneau reste une table des matières lisible. */
  const [open, setOpen] = useState({
    content: false,
    button: false,
    style: false,
    advanced: false,
    ...initialOpen,
  })
  const toggle = (key: keyof typeof open) =>
    setOpen((o) => ({ ...o, [key]: !o[key] }))

  /* Le constructeur redemande « Contenu » (double-clic sur une section
     déjà sélectionnée) : on l'ouvre sans remonter le panneau. */
  const wantContent = initialOpen?.content ?? false
  useEffect(() => {
    if (wantContent) setOpen((o) => (o.content ? o : { ...o, content: true }))
  }, [wantContent])

  /* L'indicateur du haut suit l'état d'écriture du panneau. */
  useEffect(() => {
    onSaveStateChange?.(saveState)
  }, [saveState, onSaveStateChange])

  /* Réglages : appliqués au canvas tout de suite, écrits via la file ;
     en cas d'échec, l'état précédent revient et l'erreur s'affiche. */
  const writeAnim = (patch: Partial<SectionSettings>) => {
    const prev = anim
    const next = { ...anim, ...patch }
    setAnim(next)
    onSettings?.(section.id, next)
    void run(() => updateSectionSettings(section.id, next)).then((r) => {
      if (!r.ok) {
        setAnim(prev)
        onSettings?.(section.id, prev)
        toast.error(r.error)
      } else {
        onMutated?.()
      }
    })
  }

  const isRoot = !section.parentId

  /* ── Enregistrement automatique ─────────────────────────────────────
     `baseline` est le dernier état ÉCRIT en base : c'est lui que
     l'historique rejoue en arrière. Le prop `section` ne peut pas servir
     de référence — le constructeur l'aligne sur le brouillon à chaque
     frappe pour le rendu instantané. */
  const baseline = useRef({
    meta: {
      anchor: section.anchor,
      navLabel: section.navLabel,
      showInNav: section.showInNav,
      isActive: section.isActive,
      backgroundColor: section.backgroundColor,
    },
    payload: section.payload,
    styles: parseNodeStyles(section.styles),
  })
  const latest = useRef({ payload, meta, styles })
  const dirty = useRef(false)

  const saveNow = useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    setSaveState('saving')

    const draft = latest.current
    const prev = baseline.current
    const nextMeta = {
      anchor: draft.meta.anchor.trim() || null,
      navLabel: draft.meta.navLabel.trim() || null,
      showInNav: draft.meta.showInNav,
      isActive: draft.meta.isActive,
      backgroundColor: draft.meta.backgroundColor,
    }
    const nextPayload = draft.payload
    const nextStyles = draft.styles

    /* Par la file du constructeur : l'écriture attend qu'une éventuelle
       action en vol (suppression, déplacement…) soit terminée, et
       inversement — plus de requête annulée en cours de route. */
    const result = await run(() =>
      updateSection(section.id, nextMeta, nextPayload, nextStyles),
    )

    if (!result.ok) {
      dirty.current = true
      setSaveState('dirty')
      toast.error(result.error)
      return
    }

    const prevMeta = prev.meta
    const prevPayload = prev.payload
    const prevStyles = prev.styles
    pushHistory?.({
      label: 'Modification',
      undo: async () =>
        (
          await run(() =>
            updateSection(section.id, prevMeta, prevPayload, prevStyles),
          )
        ).ok,
      redo: async () =>
        (
          await run(() =>
            updateSection(section.id, nextMeta, nextPayload, nextStyles),
          )
        ).ok,
    })

    baseline.current = { meta: nextMeta, payload: nextPayload, styles: nextStyles }
    setSaveState(dirty.current ? 'dirty' : 'saved')
    /* Pas de `router.refresh()` ici : le canvas est déjà à jour via le
       brouillon, et un rechargement pourrait écraser une frappe plus
       récente le temps de l'aller-retour serveur. */
  }, [pushHistory, run, section.id])

  /* Chaque changement : rendu immédiat sur le canvas, puis écriture après
     600 ms d'accalmie — une rafale de frappe = un enregistrement, une
     entrée d'historique. */
  useEffect(() => {
    /* Rien n'a changé (montage, ou double exécution des effets en mode
       strict) : ni brouillon ni écriture. Un drapeau « premier rendu »
       était consommé par la première exécution, et la seconde marquait
       le panneau sale — ouvrir une section suffisait à l'enregistrer. */
    const seen = latest.current
    if (
      seen.payload === payload &&
      seen.meta === meta &&
      seen.styles === styles
    ) {
      return
    }
    latest.current = { payload, meta, styles }
    dirty.current = true
    setSaveState('dirty')
    onDraft?.(section.id, {
      payload,
      meta: {
        anchor: meta.anchor.trim() || null,
        navLabel: meta.navLabel.trim() || null,
        showInNav: meta.showInNav,
        isActive: meta.isActive,
        backgroundColor: meta.backgroundColor,
      },
      styles,
    })
    const timer = setTimeout(() => void saveNow(), 600)
    return () => clearTimeout(timer)
    /* Déclenché par les seules données du brouillon : `onDraft`, `saveNow`
       et `section.id` sont stables ou lus à l'exécution — les ajouter
       ferait repartir un enregistrement à chaque rendu du parent. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, meta, styles])

  /* Fermer le panneau ou changer de bloc n'avale jamais une frappe : le
     reliquat part immédiatement. */
  useEffect(
    () => () => {
      if (dirty.current) void saveNow()
    },
    [saveNow],
  )

  /* Le constructeur peut forcer l'écriture du reliquat (avant Publier). */
  useEffect(() => {
    if (!flushRef) return
    flushRef.current = saveNow
    return () => {
      if (flushRef.current === saveNow) flushRef.current = null
    }
  }, [flushRef, saveNow])

  if (!block) {
    return (
      <p className="p-4 text-[0.8rem] text-destructive">
        Type de section inconnu : « {section.type} ».
      </p>
    )
  }

  /* ── Répartition automatique des champs en groupes lisibles ─────────
     Le modèle décrit ses champs à plat ; le panneau les range comme la
     maquette : Contenu (textes, images, listes), Bouton (paires
     libellé + lien), Style (disposition, alignements, variantes). */

  const allFields = block.fields

  const labelFields = allFields.filter(
    (f) => f.name === 'label' || f.name.endsWith('Label'),
  )
  const hrefFields = allFields.filter(
    (f) => f.name === 'href' || f.name.endsWith('Href'),
  )
  const buttonNames = new Set<string>()
  for (const lf of labelFields) {
    const prefix = lf.name === 'label' ? '' : lf.name.slice(0, -'Label'.length)
    const match =
      hrefFields.find(
        (hf) =>
          (hf.name === 'href' ? '' : hf.name.slice(0, -'Href'.length)) ===
          prefix,
      ) ??
      /* Un seul libellé, un seul lien : ils vont ensemble même si leurs
         noms ne se ressemblent pas (ex. linkLabel + href). */
      (labelFields.length === 1 && hrefFields.length === 1
        ? hrefFields[0]
        : undefined)
    if (match) {
      buttonNames.add(lf.name)
      buttonNames.add(match.name)
    }
  }
  if (buttonNames.size > 0) {
    for (const f of allFields) if (f.name === 'external') buttonNames.add(f.name)
  }

  const STYLE_FIELD_NAMES = new Set([
    'align', 'imageSide', 'side', 'ratio', 'level', 'size', 'variant',
    'cols', 'count', 'split', 'width', 'gap', 'direction', 'tone',
    'numbered', 'firstOpen', 'rounded', 'highlight', 'spacing',
  ])
  const isLayoutField = (f: FieldDescriptor) =>
    (f.kind === 'select' || f.kind === 'boolean') &&
    (STYLE_FIELD_NAMES.has(f.name) || f.name.startsWith('show'))

  const buttonFields = allFields.filter((f) => buttonNames.has(f.name))
  const layoutFields = allFields.filter(
    (f) => !buttonNames.has(f.name) && isLayoutField(f),
  )
  const contentFields = allFields.filter(
    (f) => !buttonNames.has(f.name) && !isLayoutField(f),
  )

  const buttonTitle =
    buttonFields.filter((f) => f.name === 'label' || f.name.endsWith('Label'))
      .length > 1
      ? 'Boutons'
      : 'Bouton'

  const hasStyleGroup = isRoot || !simple || layoutFields.length > 0

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3.5">
        <h2 className="truncate font-serif text-[15px]">{block.label}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="shrink-0 text-stone transition-colors hover:text-foreground"
        >
          <X className="h-[15px] w-[15px]" strokeWidth={1.7} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1.5">
        {/* ── Contenu ─────────────────────────────────────────────── */}
        {contentFields.length > 0 && (
          <Group
            title="Contenu"
            open={open.content}
            onToggle={() => toggle('content')}
          >
            <BlockForm
              fields={contentFields}
              value={payload}
              onChange={setPayload}
              library={library}
            />
          </Group>
        )}

        {/* ── Bouton(s) : les paires libellé + lien ───────────────── */}
        {buttonFields.length > 0 && (
          <Group
            title={buttonTitle}
            open={open.button}
            onToggle={() => toggle('button')}
          >
            <BlockForm
              fields={buttonFields}
              value={payload}
              onChange={setPayload}
              library={library}
            />
          </Group>
        )}

        {/* ── Style ───────────────────────────────────────────────── */}
        {hasStyleGroup && (
          <Group
            title="Style"
            open={open.style}
            onToggle={() => toggle('style')}
          >
            <div className="space-y-4">
              {layoutFields.length > 0 && (
                <BlockForm
                  fields={layoutFields}
                  value={payload}
                  onChange={setPayload}
                  library={library}
                />
              )}

              {isRoot && (
                <>
                  <ColorPicker
                    label="Couleur de fond"
                    value={meta.backgroundColor}
                    onChange={(hex) =>
                      setMeta((m) => ({ ...m, backgroundColor: hex }))
                    }
                  />

                  <div>
                    <p className="mb-[5px] text-[11.5px] text-ink-soft">
                      Animation d’apparition
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={anim.animation}
                        onChange={(e) =>
                          writeAnim({
                            animation: e.target
                              .value as SectionSettings['animation'],
                          })
                        }
                        className="col-span-2 h-[34px] rounded-[8px] border border-line-strong bg-white px-2 text-[12.5px] outline-none focus:border-blue-deep"
                      >
                        <option value="aucune">
                          Aucune — les blocs s’animent seuls
                        </option>
                        <option value="fade">Fondu</option>
                        <option value="fade-up">Fondu montant</option>
                        <option value="scale">Zoom léger</option>
                      </select>
                      {anim.animation !== 'aucune' && (
                        <>
                          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                            Délai
                            <Input
                              type="number"
                              min={0}
                              max={2}
                              step={0.1}
                              value={anim.delay}
                              onChange={(e) =>
                                writeAnim({
                                  delay: Math.min(
                                    2,
                                    Math.max(0, e.target.valueAsNumber || 0),
                                  ),
                                })
                              }
                              className="h-7 rounded-[8px] border-line-strong bg-white text-[12px] focus-visible:border-blue-deep focus-visible:ring-0"
                            />
                            s
                          </label>
                          <label className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                            Durée
                            <Input
                              type="number"
                              min={0.2}
                              max={2}
                              step={0.1}
                              value={anim.duration}
                              onChange={(e) =>
                                writeAnim({
                                  duration: Math.min(
                                    2,
                                    Math.max(
                                      0.2,
                                      e.target.valueAsNumber || 0.8,
                                    ),
                                  ),
                                })
                              }
                              className="h-7 rounded-[8px] border-line-strong bg-white text-[12px] focus-visible:border-blue-deep focus-visible:ring-0"
                            />
                            s
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bord bas : le fond de cette section se déverse en
                      ondulant dans la suivante. */}
                  <div>
                    <p className="mb-[5px] text-[11.5px] text-ink-soft">
                      Bord du bas
                    </p>
                    <select
                      value={anim.edge}
                      onChange={(e) =>
                        writeAnim({
                          edge: e.target.value as SectionSettings['edge'],
                        })
                      }
                      className="h-[34px] w-full rounded-[8px] border border-line-strong bg-white px-2 text-[12.5px] outline-none focus:border-blue-deep"
                    >
                      <option value="aucun">Droit</option>
                      <option value="vague">Vague</option>
                      <option value="courbe">Courbe douce</option>
                      <option value="arche">Arche</option>
                      <option value="ondulation">Ondulations</option>
                      <option value="oblique">Oblique</option>
                    </select>
                    <p className="mt-1.5 text-[11px] leading-[1.5] text-stone">
                      Visible si la section suivante a un fond différent.
                    </p>
                  </div>

                  {/* Décor au trait — un motif calme posé sur la section. */}
                  <div>
                    <p className="mb-[5px] text-[11.5px] text-ink-soft">
                      Décor
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={anim.ornament}
                        onChange={(e) =>
                          writeAnim({
                            ornament: e.target
                              .value as SectionSettings['ornament'],
                          })
                        }
                        className="col-span-2 h-[34px] rounded-[8px] border border-line-strong bg-white px-2 text-[12.5px] outline-none focus:border-blue-deep"
                      >
                        <option value="aucun">Aucun</option>
                        <option value="ondes">Ondes</option>
                        <option value="cercles">Cercles concentriques</option>
                        <option value="arche">Arche</option>
                        <option value="soleil">Soleil levant</option>
                        <option value="spirale">Spirale</option>
                        <option value="horizon">Horizon</option>
                      </select>

                      {anim.ornament !== 'aucun' && (
                        <>
                          <select
                            value={anim.ornamentPosition}
                            onChange={(e) =>
                              writeAnim({
                                ornamentPosition: e.target
                                  .value as SectionSettings['ornamentPosition'],
                              })
                            }
                            className="h-[34px] rounded-[8px] border border-line-strong bg-white px-2 text-[12.5px] outline-none focus:border-blue-deep"
                          >
                            <option value="haut-gauche">En haut à gauche</option>
                            <option value="haut-droite">En haut à droite</option>
                            <option value="bas-gauche">En bas à gauche</option>
                            <option value="bas-droite">En bas à droite</option>
                            <option value="centre">Au centre</option>
                          </select>

                          <select
                            value={anim.ornamentSize}
                            onChange={(e) =>
                              writeAnim({
                                ornamentSize: e.target
                                  .value as SectionSettings['ornamentSize'],
                              })
                            }
                            className="h-[34px] rounded-[8px] border border-line-strong bg-white px-2 text-[12.5px] outline-none focus:border-blue-deep"
                          >
                            <option value="petit">Petit</option>
                            <option value="moyen">Moyen</option>
                            <option value="grand">Grand</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Hors mode simple, l'accès aux réglages fins reste là. */}
              {!simple && (
                <StylePanel
                  value={styles}
                  onChange={setStyles}
                  nodeType={section.type}
                  isRoot={isRoot}
                  breakpoint={styleBreakpoint}
                />
              )}
            </div>
          </Group>
        )}

        {/* ── Options avancées ────────────────────────────────────── */}
        {isRoot && (
          <Group
            title="Options avancées"
            open={open.advanced}
            onToggle={() => toggle('advanced')}
          >
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="anchor"
                  className="mb-[5px] block text-[11.5px] font-normal text-ink-soft"
                >
                  Lien d’ancrage
                </Label>
                <Input
                  id="anchor"
                  value={meta.anchor}
                  placeholder="a-propos"
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, anchor: slugify(e.target.value) }))
                  }
                  className="h-auto rounded-[8px] border-line-strong bg-white px-2.5 py-2 text-[12.5px] focus-visible:border-blue-deep focus-visible:ring-0"
                />
                <p className="mt-1.5 text-[0.68rem] leading-relaxed text-muted-foreground">
                  Permet un lien direct vers cette section, ex. #contact.
                </p>
              </div>

              <div>
                <Label
                  htmlFor="navLabel"
                  className="mb-[5px] block text-[11.5px] font-normal text-ink-soft"
                >
                  Nom dans le menu
                </Label>
                <Input
                  id="navLabel"
                  value={meta.navLabel}
                  placeholder="À propos"
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, navLabel: e.target.value }))
                  }
                  className="h-auto rounded-[8px] border-line-strong bg-white px-2.5 py-2 text-[12.5px] focus-visible:border-blue-deep focus-visible:ring-0"
                />
              </div>

              <div className="flex items-center justify-between gap-3 py-0.5">
                <Label
                  htmlFor="showInNav"
                  className="cursor-pointer text-[11.5px] font-normal text-ink-soft"
                >
                  Dans le menu
                </Label>
                <Switch
                  id="showInNav"
                  checked={meta.showInNav}
                  onCheckedChange={(checked) =>
                    setMeta((m) => ({ ...m, showInNav: checked }))
                  }
                />
              </div>

              {/* Modèle personnel : garder cette section sous la main. */}
              <div className="border-t border-border pt-3">
                {modelName === null ? (
                  <button
                    type="button"
                    onClick={() => setModelName(section.name ?? '')}
                    className="flex items-center gap-1.5 text-[11.5px] text-blue-deep hover:underline"
                  >
                    <Bookmark className="h-3 w-3" />
                    Enregistrer comme modèle personnel
                  </button>
                ) : (
                  <form
                    className="flex items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const name = modelName.trim()
                      if (!name) return
                      start(async () => {
                        const result = await run(() =>
                          saveSectionAsTemplate(section.id, name),
                        )
                        if (result.ok) {
                          toast.success(
                            `« ${name} » ajouté à Mes sections — retrouvez-le dans la bibliothèque.`,
                          )
                          setModelName(null)
                          /* Le constructeur à modèles reçoit la ligne et
                             met sa bibliothèque à jour lui-même ; sans
                             lui, on recharge. */
                          if (onSaved) onSaved(result.data)
                          else router.refresh()
                        } else {
                          toast.error(result.error)
                        }
                      })
                    }}
                  >
                    <Input
                      autoFocus
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Nom du modèle — ex. « Contact Anne »"
                      className="h-8 rounded-[8px] border-line-strong bg-white text-[12px] focus-visible:border-blue-deep focus-visible:ring-0"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={pending || !modelName.trim()}
                    >
                      OK
                    </Button>
                  </form>
                )}
                <p className="mt-1.5 text-[0.68rem] leading-relaxed text-muted-foreground">
                  Cette section, avec son contenu, deviendra réutilisable sur
                  toutes vos pages depuis « Ajouter une section ».
                </p>
              </div>
            </div>
          </Group>
        )}
      </div>

      {/* Pied minimal — les actions (masquer, dupliquer, supprimer)
          vivent dans la liste des sections, à gauche. Ici, une seule
          information : l'état d'enregistrement. */}
      <div className="shrink-0 border-t border-border">
        <p
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11.5px] text-stone"
          aria-live="polite"
        >
          {saveState === 'saving' && 'Enregistrement…'}
          {saveState === 'dirty' && 'Modifications en attente…'}
          {saveState === 'saved' && (
            <>
              <Check className="h-3 w-3 text-[#3e9e6f]" />
              Enregistré automatiquement
            </>
          )}
        </p>
      </div>
    </>
  )
}
