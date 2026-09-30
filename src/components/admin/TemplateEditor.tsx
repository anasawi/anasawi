'use client'

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
}: {
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
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

  /* Sous 1280 px avec l'inspecteur ouvert, la liste se replie en une
     bande à icône ; le canvas garde ≥ 520 px. */
  const railCollapsed = (narrow || (!wide && selected !== null)) && !railOverlay

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <EditorTopBar
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

        {/* ── La page ──────────────────────────────────────────────── */}
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

        {/* ── Contenu de la section — seulement quand elle existe ──── */}
        {editing && selected && (
          /* Sous 1024 px, l'inspecteur devient un volet posé par-dessus la
             scène : à côté, il ne restait plus de place pour la page. */
          <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-border bg-ivory max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:w-[min(320px,92vw)] max-lg:shadow-[-8px_0_28px_rgba(28,32,30,0.14)]">
            <AnchorsContext.Provider value={anchorOptions}>
            <SectionInspector
              key={selected.id}
              section={selected}
              library={data.media}
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
            />
            </AnchorsContext.Provider>
          </aside>
        )}
      </div>

      <TemplateLibrary
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
