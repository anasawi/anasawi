'use client'

import { MousePointerClick } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AnchorsContext, type AnchorOption } from './anchors-context'
import { DiscardDialog } from './editor/DiscardDialog'
import { EditorRail } from './editor/EditorRail'
import { EditorStage } from './editor/EditorStage'
import { EditorTopBar } from './editor/EditorTopBar'
import { useActionQueue } from './editor/useActionQueue'
import { useEditorSections } from './editor/useEditorSections'
import { useEditorShortcuts } from './editor/useEditorShortcuts'
import { useHistory } from './editor/useHistory'
import { useInlineEditing } from './editor/useInlineEditing'
import { usePublish } from './editor/usePublish'
import { useResponsiveRail } from './editor/useResponsiveRail'
import { rootsOf, useSectionMutations } from './editor/useSectionMutations'
import { useStageMeasure } from './editor/useStageMeasure'
import { SectionInspector } from './SectionInspector'
import { labelOf } from './SectionRail'
import { TemplateLibrary } from './TemplateLibrary'
import type { Breakpoint } from '@/lib/grid'
import { identityCss } from '@/lib/identity'
import { parseIdentity } from '@/lib/identity'
import { cn } from '@/lib/utils'
import type { SavedSection, Section } from '@/server/db/schema'
import type { SectionsViewData } from '@/components/site/SectionsView'

/**
 * L'éditeur de page du CMS — la philosophie « modèle → contenu ».
 *
 * À gauche, la liste des sections de la page. Au centre, la vraie page.
 * À droite, le formulaire de la section sélectionnée, en enregistrement
 * automatique : on choisit un beau design, on remplit ses informations —
 * jamais de grille, de coordonnées ni de CSS.
 *
 * Modèle d'édition : brouillon automatique + « Publier ». Toute mutation
 * est appliquée à l'état local d'abord, écrite ensuite via une file
 * d'actions sérialisée ; en cas d'échec, l'état précédent revient avec un
 * message. Aucun `router.refresh()` réflexe : seuls Publier et Annuler
 * les modifications rechargent la page depuis le serveur.
 *
 * Ce composant ne garde que l'état partagé et l'assemblage ; la mécanique
 * vit dans `./editor/` (file d'actions, historique, mesures, mutations,
 * édition en place, publication).
 */
export function TemplateEditor({
  pageId,
  pageTitle,
  publishedSnapshot,
  publishedAt,
  initialSections,
  data,
  saved,
  initialSelectedId = null,
  theme = 'classique',
}: {
  /** Le site édité (arbitrage classique / moderne en cours). */
  theme?: 'classique' | 'moderne'
  /** Section ouverte d'emblée — le lien « Votre page » de l'accueil. */
  initialSelectedId?: string | null
  pageId: string
  pageTitle: string
  /** Instantané servi au public — sert à l'indicateur d'état. */
  publishedSnapshot: unknown
  publishedAt: Date | null
  initialSections: Section[]
  data: SectionsViewData
  /** Modèles personnels (« Mes sections »). */
  saved: SavedSection[]
}) {
  const {
    sections,
    sectionsRef,
    commitSections,
    saveState,
    onSaveStateChange,
    savedList,
    setSavedList,
  } = useEditorSections(initialSections, saved)

  const [viewport, setViewport] = useState<Breakpoint>('desktop')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  const [libraryOpen, setLibraryOpen] = useState(false)
  /** Section dont la suppression attend confirmation (ligne du rail). */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  /** Écriture forcée du reliquat de frappe de l'inspecteur. */
  const flushDraftRef = useRef<(() => Promise<void>) | null>(null)
  /** Position choisie par un « + » du canvas : avant la section `beforeId`,
      ou en fin de page (`beforeId` nul). Nul tout court = la bibliothèque a
      été ouverte depuis le rail. */
  const insertIndexRef = useRef<{ beforeId: string | null } | null>(null)

  const { enqueue, enVol } = useActionQueue()
  const {
    historyLen,
    pushHistory,
    clearHistory,
    dropHistory,
    runHistory,
    undoEntry,
  } = useHistory()

  const {
    publishState,
    canPublish,
    publishing,
    publish,
    confirmDiscard,
    setConfirmDiscard,
    discarding,
    discard,
  } = usePublish({
    pageId,
    publishedSnapshot,
    publishedAt,
    sections,
    sectionsRef,
    commitSections,
    enqueue,
    flushDraftRef,
    clearHistory,
    setSelectedId,
  })

  const { wide, narrow, railOverlay, setRailOverlay } =
    useResponsiveRail(selectedId)

  const editing = mode === 'edit'

  const byId = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  )
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null

  /* Panneau fermé : plus d'écriture en cours à afficher. */
  useEffect(() => {
    if (!selected) onSaveStateChange('saved')
  }, [selected, onSaveStateChange])

  /* Une frappe pas encore écrite, ou une action pas encore écrite : le
     navigateur demande confirmation avant de fermer ou recharger. */
  useEffect(() => {
    if (saveState === 'saved' && !enVol) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveState, enVol])

  const roots = useMemo(() => rootsOf(sections), [sections])
  /* Les sections vers lesquelles un bouton peut mener (celles qui ont
     une ancre), nommées comme dans la liste. */
  const anchorOptions = useMemo<AnchorOption[]>(
    () =>
      roots
        .filter((r) => r.anchor)
        .map((r) => ({ anchor: r.anchor as string, label: labelOf(r) })),
    [roots],
  )

  const stage = useStageMeasure({
    viewport,
    narrow,
    mode,
    editing,
    selectedId,
    sections,
  })

  /* Ouvert sur une section précise : le canvas la centre dès qu'il est prêt. */
  useEffect(() => {
    if (initialSelectedId) stage.scrollToRef.current = initialSelectedId
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois, à l'ouverture
  }, [])

  const {
    freshId,
    setFreshId,
    highlightId,
    applyDraft,
    applySettings,
    deleteWithHistory,
    addSection,
    addSaved,
    removeSaved,
    onSavedCreated,
    reorderTo,
    toggleWithHistory,
    renameWithHistory,
    duplicateWithHistory,
  } = useSectionMutations({
    pageId,
    sectionsRef,
    commitSections,
    enqueue,
    pushHistory,
    dropHistory,
    undoEntry,
    selectedId,
    setSelectedId,
    flushDraftRef,
    insertIndexRef,
    scrollToRef: stage.scrollToRef,
    savedList,
    setSavedList,
  })

  useEditorShortcuts({
    confirmDeleteId,
    confirmDiscard,
    libraryOpen,
    mode,
    railOverlay,
    runHistory,
    selectedId,
    wide,
    setConfirmDeleteId,
    setRailOverlay,
    setSelectedId,
    setMode,
  })

  const { onStageClick, onStageDoubleClick } = useInlineEditing({
    editing,
    sectionsRef,
    commitSections,
    enqueue,
    pushHistory,
    setSelectedId,
    setFreshId,
  })

  /* ── Rendu ───────────────────────────────────────────────────────── */

  /* Calculé une fois par rendu (et non deux, à la garde puis au rendu). */
  const identityStyles = identityCss(data.settings.identity)

  /* Sous 1280 px, la liste se replie en une bande à icône : le
     formulaire et l'aperçu gardent leur place. */
  const railCollapsed = (narrow || !wide) && !railOverlay

  /* La section racine en cours (une sous-section renvoie à sa racine) :
     son rang « Section 03 / 11 » et ses voisines pour « Précédente /
     Suivante ». */
  const rootIndex = selected
    ? roots.findIndex((r) => r.id === (selected.parentId ?? selected.id))
    : -1
  const selectAndScroll = (id: string) => {
    setSelectedId(id)
    stage.scrollStageTo(id)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <EditorTopBar
        theme={theme}
        pageTitle={pageTitle}
        publishState={publishState}
        saving={saveState !== 'saved' || enVol}
        historyLen={historyLen}
        runHistory={runHistory}
        viewport={viewport}
        setViewport={setViewport}
        mode={mode}
        onToggleMode={() => {
          setMode((m) => (m === 'edit' ? 'preview' : 'edit'))
          setSelectedId(null)
        }}
        publishing={publishing}
        canPublish={canPublish}
        onPublish={() => void publish()}
        onDiscardRequest={() => setConfirmDiscard(true)}
      />

      <div className="relative flex min-h-0 flex-1 overflow-x-auto">
        {/* ── Sections de la page ──────────────────────────────────── */}
        {editing && (
          <EditorRail
            collapsed={railCollapsed}
            overlay={railOverlay}
            onExpand={() => setRailOverlay(true)}
            count={roots.length}
            roots={roots}
            selectedId={selectedId}
            highlightId={highlightId}
            confirmId={confirmDeleteId}
            onConfirmChange={setConfirmDeleteId}
            floating={railOverlay}
            onCollapse={() => setRailOverlay(false)}
            onSelect={(id) => {
              setSelectedId(id)
              stage.scrollStageTo(id)
              if (railOverlay) setRailOverlay(false)
            }}
            onToggle={(section) => void toggleWithHistory(section)}
            onDuplicate={(section) => void duplicateWithHistory(section)}
            onDelete={deleteWithHistory}
            onRename={(section, value) => void renameWithHistory(section, value)}
            reorderTo={reorderTo}
            onAdd={() => {
              /* Depuis le rail : jamais la frontière laissée par un « + »
                 survolé plus tôt — après la sélection, sinon en fin. */
              insertIndexRef.current = null
              setLibraryOpen(true)
            }}
          />
        )}

        {/* ── Le formulaire de la section — au centre, comme sur
            l'espace Qeeps ────────────────────────────────────────── */}
        {editing && (
          <div
            className={cn(
              'flex min-h-0 w-full max-w-[600px] shrink-0 flex-col overflow-hidden lg:w-[44%] xl:w-[520px] 2xl:w-[600px]',
              selected
                ? /* Sous 1024 px, le formulaire est un volet posé sur
                     l'aperçu : à côté, il ne restait plus de place. */
                  'max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:w-[min(380px,94vw)] max-lg:bg-white max-lg:shadow-pop'
                : 'max-lg:hidden',
            )}
          >
            {selected ? (
              <AnchorsContext.Provider value={anchorOptions}>
                <SectionInspector
                  key={selected.id}
                  section={selected}
                  library={data.media}
                  styleModerne={parseIdentity(data.settings.identity).moderne}
                  onClose={() => setSelectedId(null)}
                  pushHistory={pushHistory}
                  onDraft={applyDraft}
                  onSettings={applySettings}
                  onSaved={onSavedCreated}
                  onSaveStateChange={onSaveStateChange}
                  runAction={enqueue}
                  flushRef={flushDraftRef}
                  initialOpen={
                    selected.id === freshId ? { content: true } : undefined
                  }
                  position={{ index: rootIndex, total: roots.length }}
                  previous={
                    rootIndex > 0
                      ? { label: labelOf(roots[rootIndex - 1]!), go: () => selectAndScroll(roots[rootIndex - 1]!.id) }
                      : undefined
                  }
                  next={
                    rootIndex >= 0 && rootIndex < roots.length - 1
                      ? { label: labelOf(roots[rootIndex + 1]!), go: () => selectAndScroll(roots[rootIndex + 1]!.id) }
                      : undefined
                  }
                />
              </AnchorsContext.Provider>
            ) : (
              <div className="adm-page flex flex-1 flex-col items-start justify-center px-8 py-10 xl:px-10">
                <span className="mb-4 grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-accent text-[#176c79] animate-[adm-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
                  <MousePointerClick className="h-[21px] w-[21px]" strokeWidth={1.8} />
                </span>
                <p className="text-[14px] font-medium text-[#8aa4a8]">Votre page</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
                  Choisissez une section
                </p>
                <p className="mt-2 max-w-[42ch] text-[16px] leading-[22px] text-muted-foreground">
                  Cliquez sur une section dans la liste ou dans l’aperçu pour
                  modifier ses textes, ses photos et son apparence.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── L'aperçu en direct — une carte grise, comme sur l'espace
            Qeeps ─────────────────────────────────────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3 lg:py-6 lg:pl-0 lg:pr-6">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-block px-2 pb-2">
            <div className="flex h-12 shrink-0 items-center gap-3 pl-3 pr-2">
              <span className="flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-foreground">
                <span className="relative h-2 w-2 rounded-full bg-[#6eb382]">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-inherit motion-safe:animate-[adm-ping_1.8s_cubic-bezier(0.22,1,0.36,1)_infinite]"
                  />
                </span>
                {mode === 'edit' ? 'Aperçu en direct' : 'Aperçu avant publication'}
              </span>
              {selected && (
                <span
                  key={selected.id}
                  className="min-w-0 flex-1 truncate text-[13px] text-[#8aa4a8] animate-[adm-fade_0.3s_ease_both]"
                >
                  → {labelOf(selected)}
                </span>
              )}
            </div>
        <EditorStage
          paneRef={stage.paneRef}
          frameRef={stage.frameRef}
          onFrameReady={stage.onFrameReady}
          onPaneMove={stage.onPaneMove}
          onPaneLeave={() => stage.setHoverId(null)}
          onPaneDown={() => {
            if (railOverlay) setRailOverlay(false)
          }}
          onStageClick={onStageClick}
          onStageDoubleClick={onStageDoubleClick}
          editing={editing}
          mode={mode}
          effectiveViewport={stage.effectiveViewport}
          vw={stage.vw}
          scale={stage.scale}
          stageHeight={stage.stageHeight}
          sections={sections}
          roots={roots}
          byId={byId}
          data={data}
          identityStyles={identityStyles}
          selectionRect={stage.selectionRect}
          sectionRects={stage.sectionRects}
          hoverId={stage.hoverId}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddFirst={() => {
            insertIndexRef.current = null
            setLibraryOpen(true)
          }}
          onInsertAt={(beforeId) => {
            insertIndexRef.current = { beforeId }
            setLibraryOpen(true)
          }}
        />

          </div>
        </div>
      </div>

      <TemplateLibrary
        theme={theme}
        open={libraryOpen}
        onOpenChange={(open) => {
          setLibraryOpen(open)
          /* Fermée sans choisir : la frontière du « + » ne doit pas
             survivre au prochain « Ajouter une section ». */
          if (!open) insertIndexRef.current = null
        }}
        data={data}
        saved={savedList}
        onPick={addSection}
        onPickSaved={addSaved}
        onDeleteSaved={removeSaved}
      />

      <DiscardDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        discarding={discarding}
        onConfirm={() => void discard()}
      />
    </div>
  )
}
