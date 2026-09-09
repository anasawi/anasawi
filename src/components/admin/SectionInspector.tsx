'use client'

import { Bookmark, Check, Copy, Eye, EyeOff, Wand2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { BlockForm } from './BlockForm'
import { ColorPicker } from './ColorPicker'
import { ConfirmDelete } from './ConfirmDelete'
import { StylePanel, type StyleBreakpoint } from './StylePanel'
import { getBlock } from '@/blocks/registry'
import { CONVERTIBLE_TYPES } from '@/lib/convert-legacy'
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
  deleteSection,
  duplicateSection,
  saveSectionAsTemplate,
  updateSection,
  updateSectionSettings,
} from '@/server/actions/pages'
import type { HistoryEntry } from './history'
import type { ActionResult } from '@/server/actions/types'
import type { Media, Section } from '@/server/db/schema'

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

/**
 * Panneau d'édition du bloc sélectionné.
 *
 * Aucun bouton « Enregistrer » : chaque modification est appliquée au
 * canvas À L'INSTANT (via `onDraft`) puis écrite en base après une courte
 * accalmie de frappe. Le panneau affiche l'état de l'enregistrement, et
 * chaque rafale enregistrée devient une entrée d'historique (⌘Z).
 */
export function SectionInspector({
  section,
  library,
  onClose,
  onMutated,
  pushHistory,
  styleBreakpoint = 'base',
  onDelete,
  onConvert,
  onDraft,
  simple = false,
}: {
  section: Section
  library: Media[]
  onClose: () => void
  /** Signale une écriture réussie — le constructeur recharge l'aperçu. */
  onMutated?: () => void
  /** Enregistre l'inverse d'un enregistrement pour le ⌘Z du constructeur. */
  pushHistory?: (entry: HistoryEntry) => void
  /** Breakpoint d'édition des styles — suit le sélecteur de viewport. */
  styleBreakpoint?: StyleBreakpoint
  /** Suppression avec instantané, fournie par le constructeur. */
  onDelete?: (id: string) => Promise<ActionResult<unknown>>
  /** Conversion d'une section héritée en éléments libres, annulable. */
  onConvert?: (id: string) => Promise<ActionResult<unknown>>
  /** Application immédiate du brouillon sur le canvas, à chaque frappe. */
  onDraft?: (id: string, draft: SectionDraft) => void
  /** Mode CMS à modèles : pas de réglages de style avancés — l'apparence
      est l'affaire du modèle. Seule la couleur de fond reste réglable. */
  simple?: boolean
}) {
  const router = useRouter()
  const block = getBlock(section.type)

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
  /** Onglet actif — en mode simple, seul « Contenu » existe. */
  const [tab, setTab] = useState<'content' | 'style'>('content')

  const writeAnim = (patch: Partial<SectionSettings>) => {
    const next = { ...anim, ...patch }
    setAnim(next)
    void updateSectionSettings(section.id, next).then((r) => {
      if (!r.ok) toast.error(r.error)
      else onMutated?.()
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
  const firstRender = useRef(true)

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

    const result = await updateSection(
      section.id,
      nextMeta,
      nextPayload,
      nextStyles,
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
          await updateSection(section.id, prevMeta, prevPayload, prevStyles)
        ).ok,
      redo: async () =>
        (
          await updateSection(section.id, nextMeta, nextPayload, nextStyles)
        ).ok,
    })

    baseline.current = { meta: nextMeta, payload: nextPayload, styles: nextStyles }
    setSaveState(dirty.current ? 'dirty' : 'saved')
    /* Pas de `router.refresh()` ici : le canvas est déjà à jour via le
       brouillon, et un rechargement pourrait écraser une frappe plus
       récente le temps de l'aller-retour serveur. */
  }, [pushHistory, section.id])

  /* Chaque changement : rendu immédiat sur le canvas, puis écriture après
     600 ms d'accalmie — une rafale de frappe = un enregistrement, une
     entrée d'historique. */
  useEffect(() => {
    latest.current = { payload, meta, styles }
    if (firstRender.current) {
      firstRender.current = false
      return
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par
    // les seules données du brouillon.
  }, [payload, meta, styles])

  /* Fermer le panneau ou changer de bloc n'avale jamais une frappe : le
     reliquat part immédiatement. */
  useEffect(
    () => () => {
      if (dirty.current) void saveNow()
    },
    [saveNow],
  )

  if (!block) {
    return (
      <p className="p-4 text-[0.8rem] text-destructive">
        Type de section inconnu : « {section.type} ».
      </p>
    )
  }

  const tabs: { id: 'content' | 'style'; label: string }[] = simple
    ? [{ id: 'content', label: 'Contenu' }]
    : [
        { id: 'content', label: 'Contenu' },
        { id: 'style', label: 'Style' },
      ]

  return (
    <>
      <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 border-b border-border px-3 pl-4">
        <h2 className="truncate font-serif text-[0.95rem]">{block.label}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="h-7 w-7"
        >
          <X />
        </Button>
      </div>

      <div className="flex shrink-0 border-b border-border">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 py-2 text-[0.75rem] transition-colors',
              tab === id
                ? 'text-foreground shadow-[inset_0_-1px_0_var(--color-foreground)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {/* Section héritée : proposer la décomposition en éléments libres —
            c'est la porte d'entrée vers le placement à la souris. */}
        {isRoot && onConvert && CONVERTIBLE_TYPES.has(section.type) && (
          <div className="mb-2 mt-3 rounded-[6px] border border-[#c9d8e0] bg-blue-mist/50 p-3">
            <p className="text-[0.74rem] leading-[1.55] text-blue-ink">
              Cette section est une composition toute faite. Convertissez-la
              pour déplacer et redimensionner librement chacun de ses
              éléments — annulable avec ⌘Z.
            </p>
            <Button
              size="sm"
              disabled={pending}
              className="mt-2.5 w-full"
              onClick={() =>
                start(async () => {
                  await onConvert(section.id)
                })
              }
            >
              <Wand2 />
              Convertir en éléments libres
            </Button>
          </div>
        )}

        {tab === 'content' ? (
          <>
            {/* ── Section : réglages de la racine ─────────────────── */}
            {isRoot && (
              <fieldset className="border-b border-border py-4">
                <legend className="float-left mb-2.5 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Section
                </legend>
                <div className="clear-both space-y-3">
                  <ColorPicker
                    label="Couleur de fond"
                    value={meta.backgroundColor}
                    onChange={(hex) =>
                      setMeta((m) => ({ ...m, backgroundColor: hex }))
                    }
                  />

                  <div>
                    <Label htmlFor="anchor" className="mb-1.5 block">
                      Ancre
                    </Label>
                    <Input
                      id="anchor"
                      value={meta.anchor}
                      placeholder="a-propos"
                      onChange={(e) =>
                        setMeta((m) => ({ ...m, anchor: slugify(e.target.value) }))
                      }
                    />
                    <p className="mt-1.5 text-[0.68rem] leading-relaxed text-muted-foreground">
                      Permet un lien direct vers cette section (ex. #contact).
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="navLabel" className="mb-1.5 block">
                      Libellé de navigation
                    </Label>
                    <Input
                      id="navLabel"
                      value={meta.navLabel}
                      placeholder="À propos"
                      onChange={(e) =>
                        setMeta((m) => ({ ...m, navLabel: e.target.value }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-[7px]">
                    <Label htmlFor="showInNav" className="cursor-pointer">
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
                </div>
              </fieldset>
            )}

            {/* ── Animation d'apparition — presets sobres, jamais un
                outil d'animation. ─────────────────────────────────── */}
            {isRoot && (
              <fieldset className="border-b border-border py-4">
                <legend className="float-left mb-2.5 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Animation d’apparition
                </legend>
                <div className="clear-both grid grid-cols-2 gap-2">
                  <select
                    value={anim.animation}
                    onChange={(e) =>
                      writeAnim({
                        animation: e.target.value as SectionSettings['animation'],
                      })
                    }
                    className="col-span-2 h-8 rounded-md border border-border bg-transparent px-2 text-[0.8rem]"
                  >
                    <option value="aucune">Aucune — les blocs s’animent seuls</option>
                    <option value="fade">Fondu</option>
                    <option value="fade-up">Fondu montant</option>
                    <option value="scale">Zoom léger</option>
                  </select>
                  {anim.animation !== 'aucune' && (
                    <>
                      <label className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
                        Délai
                        <Input
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={anim.delay}
                          onChange={(e) =>
                            writeAnim({
                              delay: Math.min(2, Math.max(0, e.target.valueAsNumber || 0)),
                            })
                          }
                          className="h-7 text-[0.75rem]"
                        />
                        s
                      </label>
                      <label className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
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
                                Math.max(0.2, e.target.valueAsNumber || 0.8),
                              ),
                            })
                          }
                          className="h-7 text-[0.75rem]"
                        />
                        s
                      </label>
                    </>
                  )}
                </div>
              </fieldset>
            )}

            {/* ── Contenu ─────────────────────────────────────────── */}
            <fieldset className="py-4">
              <legend className="float-left mb-2.5 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
                Contenu
              </legend>
              {/* Une seule colonne : à 320 px, un formulaire sur deux
                  colonnes force des champs trop courts pour être lisibles. */}
              <div className="clear-both [&>div]:!grid-cols-1">
                <BlockForm
                  fields={block.fields}
                  value={payload}
                  onChange={setPayload}
                  library={library}
                />
              </div>
            </fieldset>
          </>
        ) : (
          <div className="py-4">
            <StylePanel
              value={styles}
              onChange={setStyles}
              nodeType={section.type}
              isRoot={isRoot}
              breakpoint={styleBreakpoint}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMeta((m) => ({ ...m, isActive: !m.isActive }))}
          >
            {meta.isActive ? <EyeOff /> : <Eye />}
            {meta.isActive ? 'Masquer' : 'Afficher'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await duplicateSection(section.id)
                if (!result.ok) {
                  toast.error(result.error)
                  return
                }
                let currentId = result.data.id
                pushHistory?.({
                  label: 'Duplication',
                  undo: async () => (await deleteSection(currentId)).ok,
                  redo: async () => {
                    const again = await duplicateSection(section.id)
                    if (again.ok) currentId = again.data.id
                    return again.ok
                  },
                })
                onMutated?.()
                router.refresh()
              })
            }
          >
            <Copy />
            Dupliquer
          </Button>

          {isRoot && (
            <Button
              variant="ghost"
              size="sm"
              title="Enregistrer cette section comme modèle personnel"
              onClick={() =>
                setModelName((cur) => (cur === null ? (section.name ?? '') : null))
              }
            >
              <Bookmark />
              Modèle
            </Button>
          )}

          <ConfirmDelete
            label={block.label}
            description="La section et son contenu seront définitivement supprimés — annulable avec ⌘Z."
            onConfirm={async () => {
              const result = await (onDelete
                ? onDelete(section.id)
                : deleteSection(section.id))
              if (result.ok) {
                onClose()
                router.refresh()
              }
              return result
            }}
          />
        </div>

        {modelName !== null && (
          <form
            className="mb-2 flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              const name = modelName.trim()
              if (!name) return
              start(async () => {
                const result = await saveSectionAsTemplate(section.id, name)
                if (result.ok) {
                  toast.success(
                    `« ${name} » ajouté à Mes sections — retrouvez-le dans la bibliothèque.`,
                  )
                  setModelName(null)
                  router.refresh()
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
              className="h-8 text-[0.78rem]"
            />
            <Button type="submit" size="sm" disabled={pending || !modelName.trim()}>
              Enregistrer
            </Button>
          </form>
        )}

        <p
          className="flex items-center justify-center gap-1.5 text-[0.7rem] text-muted-foreground"
          aria-live="polite"
        >
          {saveState === 'saving' && 'Enregistrement…'}
          {saveState === 'dirty' && 'Modifications en attente…'}
          {saveState === 'saved' && (
            <>
              <Check className="h-3 w-3 text-emerald-600" />
              Enregistré automatiquement
            </>
          )}
        </p>
      </div>
    </>
  )
}
