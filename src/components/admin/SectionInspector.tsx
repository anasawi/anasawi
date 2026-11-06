'use client'

import { Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { BlockForm } from './BlockForm'
import { ColorPicker } from './ColorPicker'
import { toneOf } from './editor/sectionTone'
import type { FieldDescriptor } from '@/blocks/field'
import { getBlock } from '@/blocks/registry'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Choice } from '@/components/ui/choice'
import { Label } from '@/components/ui/label'
import { parseNodeStyles, type NodeStyles } from '@/lib/node-styles'
import { cn, slugify } from '@/lib/utils'
import {
  parseSectionSettings,
  type SectionSettings,
} from '@/lib/section-settings'
import { saveSectionAsTemplate } from '@/server/actions/saved-sections'
import { updateSection, updateSectionSettings } from '@/server/actions/sections'
import type { RunAction } from './editor/useActionQueue'
import type { HistoryEntry } from './history'
import { useLatest } from './hooks/useLatest'
import type { Media, SavedSection, Section } from '@/server/db/schema'

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
  tone,
  flash = false,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  /** Encre de la section : la pastille devant le titre du bloc. */
  tone?: string
  /** Premier bloc d'une section qu'on vient de choisir : il s'illumine. */
  flash?: boolean
}) {
  /* Un bloc gris de l'espace Qeeps : une pastille de la couleur de la
     section, le titre, et les champs blancs posés dessus. */
  return (
    <div
      className="rounded-[24px] bg-block p-6"
      /* Le halo de l'espace Qeeps, après l'entrée du bloc (style en
         ligne : il s'ajoute à l'animation d'entrée au lieu de la
         remplacer). */
      style={
        flash
          ? {
              animation:
                'adm-in 0.7s cubic-bezier(0.02, 0.45, 0.56, 1) backwards, adm-flash 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.35s',
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="-m-1 flex w-[calc(100%+8px)] items-center gap-2.5 rounded-[10px] p-1 text-left text-[16px] font-semibold leading-[22px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full opacity-70"
          style={{ background: tone ?? '#176c79' }}
        />
        <span className="flex-1">{title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[#8aa4a8] transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
            open && 'rotate-180',
          )}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3.5 pt-5 animate-[adm-fade_0.3s_ease_both]">{children}</div>
      )}
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
  /** Enregistre l'inverse d'un enregistrement pour le ⌘Z du constructeur. */
  pushHistory?: (entry: HistoryEntry) => void
  /** Application immédiate du brouillon sur le canvas, à chaque frappe. */
  onDraft?: (id: string, draft: SectionDraft) => void
  /** Remonte l'état d'écriture — l'indicateur « Enregistré » du haut. */
  onSaveStateChange?: (state: 'saved' | 'dirty' | 'saving') => void
  /** File d'actions du constructeur : chaque écriture y passe pour ne
      jamais partir pendant qu'une autre est en vol. */
  runAction: RunAction
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
  /** Rang de la section dans la page (« Section 03 / 11 »). */
  position?: { index: number; total: number }
  /** Les voisines, pour « Précédente / Suivante » en bas du formulaire. */
  previous?: { label: string; go: () => void }
  next?: { label: string; go: () => void }
}

export function SectionInspector({
  section,
  library,
  onClose,
  pushHistory,
  onDraft,
  onSaveStateChange,
  runAction: run,
  onSettings,
  onSaved,
  initialOpen,
  flushRef,
  position,
  previous,
  next,
}: SectionInspectorProps) {
  const router = useRouter()
  const block = getBlock(section.type)
  /* Le pastel suit la place de la section (de sa racine) dans la page. */
  const tone = toneOf(section.type, position?.index ?? 0)
  const ToneIcon = tone.icon

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
  /* Les styles fins ne se règlent plus dans le panneau (l'apparence est
     l'affaire du modèle) : la valeur reste celle de la ligne, stable
     d'un rendu à l'autre pour la garde du brouillon ci-dessous. */
  const [styles] = useState<NodeStyles | null>(
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
  /* « Contenu » est ouvert d'emblée : c'est ce qu'on vient modifier neuf
     fois sur dix. Le reste se déplie à la demande. */
  const [open, setOpen] = useState({
    content: true,
    button: false,
    style: false,
    advanced: false,
    ...initialOpen,
  })
  /** Erreurs par champ de la dernière écriture refusée. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
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
      setFieldErrors(result.fieldErrors ?? {})
      toast.error(result.error)
      return
    }
    setFieldErrors({})

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
     entrée d'historique. Déclenché par les seules données du brouillon :
     `onDraft` et `saveNow` sont lus à l'exécution via des refs — les
     mettre en dépendance ferait repartir un enregistrement à chaque rendu
     du parent. */
  const onDraftRef = useLatest(onDraft)
  const saveNowRef = useLatest(saveNow)
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
    onDraftRef.current?.(section.id, {
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
    const timer = setTimeout(() => void saveNowRef.current(), 600)
    return () => clearTimeout(timer)
  }, [payload, meta, styles, section.id, onDraftRef, saveNowRef])

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
      <p className="p-4 text-[14px] text-destructive">
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

  /* L'apparence est l'affaire du modèle : pas de réglages de style fins
     ici, seulement les champs de disposition du bloc et, pour une
     racine, le fond, l'animation, le bord et le décor. */
  const hasStyleGroup = isRoot || layoutFields.length > 0

  return (
    <>
      <div className="adm-page flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-8 pt-7 sm:px-8">
        {/* ── En-tête de la section, comme sur l'espace Qeeps : la grande
            icône teintée, le rang, le nom, le modèle d'où elle vient. ── */}
        <div className="relative mb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-[10px] text-[#8aa4a8] transition-colors hover:bg-block hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <span
            aria-hidden="true"
            className="mb-3.5 grid h-[46px] w-[46px] place-items-center rounded-[14px] animate-[adm-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            style={{ background: tone.bg, color: tone.fg }}
          >
            <ToneIcon className="h-[21px] w-[21px]" strokeWidth={1.8} />
          </span>
          {position && position.index >= 0 && (
            <p className="text-[14px] font-medium leading-[17px]" style={{ color: tone.fg }}>
              Section {String(position.index + 1).padStart(2, '0')}
              <span className="opacity-60"> / {String(position.total).padStart(2, '0')}</span>
            </p>
          )}
          {/* Le nom de LA section (celui de la liste), puis le modèle dont
              elle vient — pas l'inverse : « Hero — L'arche » ne dit pas
              à Anne qu'elle est en train de modifier son ouverture. */}
          <h2 className="mt-1.5 pr-10 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[36px] sm:leading-[43px]">
            {section.name ?? block.label}
          </h2>
          {section.name && (
            <p className="mt-2 text-[16px] leading-[22px] text-muted-foreground">Modèle : {block.label}</p>
          )}
        </div>

        {/* ── Contenu venu d'un autre écran ───────────────────────── */}
        {block.dataSource && (
          <p className="rounded-[16px] bg-accent px-4 py-3 text-[14px] leading-[1.5] text-foreground">
            {block.dataSource.label} se modifient dans{' '}
            <Link
              href={block.dataSource.href}
              className="font-medium text-foreground underline underline-offset-2 hover:text-blue-deep"
            >
              l’écran dédié
            </Link>
            {' '}— on les saisit une fois, ils servent partout.
          </p>
        )}

        {/* ── Contenu ─────────────────────────────────────────────── */}
        {contentFields.length > 0 && (
          <Group
            tone={tone.fg}
            title="Contenu"
            open={open.content}
            onToggle={() => toggle('content')}
          >
            <BlockForm
              fields={contentFields}
              value={payload}
              onChange={setPayload}
              library={library}
              errors={fieldErrors}
            />
          </Group>
        )}

        {/* ── Bouton(s) : les paires libellé + lien ───────────────── */}
        {buttonFields.length > 0 && (
          <Group
            tone={tone.fg}
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
            tone={tone.fg}
            title="Apparence"
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

              {isRoot && block.theme === 'moderne' && (
                <>
                  <FondModerne value={meta.backgroundColor} onChange={(hex) => setMeta((m) => ({ ...m, backgroundColor: hex }))} />
                  <PanneauModerne value={anim.panneau} onChange={(panneau) => writeAnim({ panneau })} />
                </>
              )}

              {isRoot && block.theme !== 'moderne' && (
                <>
                  <ColorPicker
                    label="Couleur de fond"
                    value={meta.backgroundColor}
                    onChange={(hex) =>
                      setMeta((m) => ({ ...m, backgroundColor: hex }))
                    }
                  />

                  <div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <Choice
                        id="section-animation"
                        label="Animation d’apparition"
                        className="col-span-2"
                        value={anim.animation}
                        onChange={(animation) => writeAnim({ animation })}
                        options={[
                          { value: 'aucune', label: 'Aucune — les éléments s’animent seuls' },
                          { value: 'fade', label: 'Fondu' },
                          { value: 'fade-up', label: 'Fondu montant' },
                          { value: 'scale', label: 'Zoom léger' },
                        ]}
                      />
                      {anim.animation !== 'aucune' && (
                        /* Une vitesse, pas des secondes : « 0,8 s » ne parle
                           à personne. Trois allures, qui posent la durée. */
                        <Choice
                          id="section-animation-vitesse"
                          label="Vitesse"
                          className="col-span-2"
                          value={
                            anim.duration <= 0.5 ? 'rapide' : anim.duration >= 1.3 ? 'lente' : 'normale'
                          }
                          onChange={(vitesse) =>
                            writeAnim({
                              delay: 0,
                              duration: vitesse === 'rapide' ? 0.45 : vitesse === 'lente' ? 1.4 : 0.8,
                            })
                          }
                          options={[
                            { value: 'rapide', label: 'Rapide' },
                            { value: 'normale', label: 'Normale' },
                            { value: 'lente', label: 'Lente' },
                          ]}
                        />
                      )}
                    </div>
                  </div>

                  {/* Bord bas : le fond de cette section se déverse en
                      ondulant dans la suivante. */}
                  <div>
                    <Choice
                      id="section-bord"
                      label="Bord du bas"
                      value={anim.edge}
                      onChange={(edge) => writeAnim({ edge })}
                      options={[
                        { value: 'aucun', label: 'Droit' },
                        { value: 'vague', label: 'Vague' },
                        { value: 'courbe', label: 'Courbe douce' },
                        { value: 'arche', label: 'Arche' },
                        { value: 'ondulation', label: 'Ondulations' },
                        { value: 'oblique', label: 'Oblique' },
                      ]}
                    />
                    <p className="mt-1.5 text-[12px] leading-[1.5] text-stone">
                      Visible si la section suivante a un fond différent.
                    </p>
                  </div>

                  {/* Décor au trait — un motif calme posé sur la section. */}
                  <div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <Choice
                        id="section-decor"
                        label="Décor"
                        className="col-span-2"
                        value={anim.ornament}
                        onChange={(ornament) => writeAnim({ ornament })}
                        options={[
                          { value: 'aucun', label: 'Aucun' },
                          { value: 'ondes', label: 'Ondes' },
                          { value: 'cercles', label: 'Cercles concentriques' },
                          { value: 'arche', label: 'Arche' },
                          { value: 'soleil', label: 'Soleil levant' },
                          { value: 'spirale', label: 'Spirale' },
                          { value: 'horizon', label: 'Horizon' },
                        ]}
                      />

                      {anim.ornament !== 'aucun' && (
                        <>
                          <Choice
                            id="section-decor-position"
                            label="Position du décor"
                            hideLabel
                            value={anim.ornamentPosition}
                            onChange={(ornamentPosition) => writeAnim({ ornamentPosition })}
                            options={[
                              { value: 'haut-gauche', label: 'En haut à gauche' },
                              { value: 'haut-droite', label: 'En haut à droite' },
                              { value: 'bas-gauche', label: 'En bas à gauche' },
                              { value: 'bas-droite', label: 'En bas à droite' },
                              { value: 'centre', label: 'Au centre' },
                            ]}
                          />
                          <Choice
                            id="section-decor-taille"
                            label="Taille du décor"
                            hideLabel
                            value={anim.ornamentSize}
                            onChange={(ornamentSize) => writeAnim({ ornamentSize })}
                            options={[
                              { value: 'petit', label: 'Petit' },
                              { value: 'moyen', label: 'Moyen' },
                              { value: 'grand', label: 'Grand' },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Group>
        )}

        {/* ── Options avancées ────────────────────────────────────── */}
        {isRoot && (
          <Group
            tone={tone.fg}
            title="Options avancées"
            open={open.advanced}
            onToggle={() => toggle('advanced')}
          >
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="anchor"
                  className="mb-[5px] block text-[12.5px] font-normal text-ink-soft"
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
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  Le mot après le # dans l’adresse de la section (ex.
                  anasawi.com/#contact). Il sert au menu du site et aux
                  boutons qui mènent ici. Pour ajouter cette section au
                  menu : Réglages › Menu du site.
                </p>
              </div>

              {/* Modèle personnel : garder cette section sous la main. */}
              <div className="border-t border-border pt-3">
                {modelName === null ? (
                  <button
                    type="button"
                    onClick={() => setModelName(section.name ?? '')}
                    className="flex items-center gap-1.5 text-[12.5px] text-blue-deep hover:underline"
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
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  Cette section, avec son contenu, deviendra réutilisable sur
                  toutes vos pages depuis « Ajouter une section ».
                </p>
              </div>
            </div>
          </Group>
        )}

        {/* ── Précédente / Suivante : on parcourt la page sans revenir à
            la liste. ─────────────────────────────────────────────── */}
        {(previous || next) && (
          <nav aria-label="Sections voisines" className="mt-2 flex justify-between gap-3">
            {previous && (
              <button
                type="button"
                onClick={previous.go}
                className="group/nav flex min-w-0 items-center gap-3 rounded-[16px] px-[18px] py-3.5 text-left text-[15px] font-medium text-foreground shadow-[0_0_0_1px_var(--color-border)] transition-[background-color,box-shadow] duration-[250ms] hover:bg-block hover:shadow-none"
              >
                <ChevronLeft className="h-4 w-4 shrink-0 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/nav:-translate-x-[3px]" />
                <span className="min-w-0">
                  <small className="block text-[12px] font-normal text-[#8aa4a8]">Précédente</small>
                  <span className="block truncate">{previous.label}</span>
                </span>
              </button>
            )}
            {next && (
              <button
                type="button"
                onClick={next.go}
                className="group/nav ml-auto flex min-w-0 items-center gap-3 rounded-[16px] px-[18px] py-3.5 text-right text-[15px] font-medium text-foreground shadow-[0_0_0_1px_var(--color-border)] transition-[background-color,box-shadow] duration-[250ms] hover:bg-block hover:shadow-none"
              >
                <span className="min-w-0">
                  <small className="block text-[12px] font-normal text-[#8aa4a8]">Suivante</small>
                  <span className="block truncate">{next.label}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/nav:translate-x-[3px]" />
              </button>
            )}
          </nav>
        )}
      </div>

      {/* Pied minimal — les actions (masquer, dupliquer, supprimer)
          vivent dans la liste des sections, à gauche. Ici, une seule
          information : l'état d'enregistrement. */}
      <div className="shrink-0 border-t border-[#eef1f2]">
        <p
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] text-[#8aa4a8]"
          aria-live="polite"
        >
          {saveState === 'saving' && 'Enregistrement…'}
          {saveState === 'dirty' && 'Modifications en attente…'}
          {saveState === 'saved' && (
            <>
              <Check className="h-3 w-3 text-success" />
              Enregistré automatiquement
            </>
          )}
        </p>
      </div>
    </>
  )
}

/* ── Fond et panneaux d'une section moderne : deux nuanciers identiques ── */

type Teinte<V extends string> = { value: V; hex: string; nom: string }

/** Un nuancier : cinq pastilles de même forme, en colonnes égales, le nom dessous. */
function Nuancier<V extends string>({ titre, aide, teintes, value, onChange }: { titre: string; aide: string; teintes: readonly Teinte<V>[]; value: V; onChange: (v: V) => void }) {
  return (
    <div>
      <p className="mb-2.5 text-[12.5px] font-medium text-[#6b8186]">{titre}</p>
      <div role="radiogroup" aria-label={titre} className="grid grid-cols-5 gap-2">
        {teintes.map((t) => {
          const actif = value === t.value
          return (
            <button key={t.value} type="button" role="radio" aria-checked={actif} title={t.nom} onClick={() => onChange(t.value)} className="group flex min-w-0 flex-col items-center gap-1.5">
              <span
                className={
                  'block h-10 w-10 rounded-full ring-1 ring-black/10 transition-shadow duration-300 ' +
                  (actif ? 'shadow-[0_0_0_3px_#fff,0_0_0_5px_#176c79]' : 'group-hover:shadow-[0_0_0_3px_#fff,0_0_0_4px_#cfd9db]')
                }
                style={{ background: t.hex }}
              />
              <span className={'w-full truncate text-center text-[11.5px] leading-4 ' + (actif ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{t.nom}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[12px] leading-[1.5] text-muted-foreground">{aide}</p>
    </div>
  )
}

const FONDS_MODERNES = [
  { value: '#fbf6ee', hex: '#fbf6ee', nom: 'Fond' },
  { value: '#f5ecdf', hex: '#f5ecdf', nom: 'Sable' },
  { value: '#eaf1f4', hex: '#eaf1f4', nom: 'Brume' },
  { value: '#e2f3f1', hex: '#e2f3f1', nom: 'Turquoise' },
  { value: '#ffffff', hex: '#ffffff', nom: 'Blanc' },
] as const

function FondModerne({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const courant = (value || '#fbf6ee').toLowerCase()
  return (
    <Nuancier
      titre="Fond de la section"
      aide="Les teintes suivent les couleurs choisies dans Réglages › Apparence."
      teintes={FONDS_MODERNES}
      value={(courant === '#fcfaf7' ? '#fbf6ee' : courant) as (typeof FONDS_MODERNES)[number]['value']}
      onChange={onChange}
    />
  )
}

const PANNEAUX = [
  { value: 'ivoire', hex: '#fbf6ee', nom: 'Fond' },
  { value: 'sable', hex: '#f5ecdf', nom: 'Sable' },
  { value: 'brume', hex: '#eaf1f4', nom: 'Brume' },
  { value: 'turquoise', hex: '#e2f3f1', nom: 'Turquoise' },
  { value: 'blanc', hex: '#ffffff', nom: 'Blanc' },
] as const

function PanneauModerne({ value, onChange }: { value: SectionSettings['panneau']; onChange: (v: SectionSettings['panneau']) => void }) {
  return (
    <Nuancier
      titre="Panneaux et cadres"
      aide="La couleur des blocs posés dans la section : le cadre derrière une photo, les cartes de couleur, les étiquettes."
      teintes={PANNEAUX}
      value={value}
      onChange={onChange}
    />
  )
}
