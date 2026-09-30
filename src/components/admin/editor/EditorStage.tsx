'use client'

import type { RefObject } from 'react'
import { Plus } from 'lucide-react'

import { StageFrame, type StageFrameHandle } from '../StageFrame'
import { getBlock } from '@/blocks/registry'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { AnimProvider } from '@/components/site/anim'
import {
  SectionsView,
  type SectionsViewData,
} from '@/components/site/SectionsView'
import type { Breakpoint } from '@/lib/grid'
import { cn } from '@/lib/utils'
import type { Section } from '@/server/db/schema'

/**
 * La page, au centre : le cadre à la largeur de l'écran simulé, le cadre
 * de sélection, et les contrôles au survol de chaque section (étiquette,
 * « Modifier », « + » aux deux frontières).
 */
export function EditorStage({
  paneRef,
  frameRef,
  onFrameReady,
  onPaneMove,
  onPaneLeave,
  onPaneDown,
  onStageClick,
  onStageDoubleClick,
  editing,
  mode,
  effectiveViewport,
  vw,
  scale,
  stageHeight,
  sections,
  roots,
  byId,
  data,
  identityStyles,
  selectionRect,
  sectionRects,
  hoverId,
  selectedId,
  onSelect,
  onAddFirst,
  onInsertAt,
}: {
  paneRef: RefObject<HTMLDivElement | null>
  frameRef: RefObject<StageFrameHandle | null>
  onFrameReady: () => void
  onPaneMove: (e: React.PointerEvent) => void
  onPaneLeave: () => void
  onPaneDown: () => void
  onStageClick: (e: React.MouseEvent) => void
  onStageDoubleClick: (e: React.MouseEvent) => void
  editing: boolean
  mode: 'edit' | 'preview'
  effectiveViewport: Breakpoint
  vw: number
  scale: number
  stageHeight: number
  sections: Section[]
  roots: Section[]
  byId: Map<string, Section>
  data: SectionsViewData
  identityStyles: string
  selectionRect: { top: number; height: number } | null
  sectionRects: { id: string; top: number; height: number }[]
  hoverId: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  /** Page vide : ouvre la bibliothèque, sans position fixée. */
  onAddFirst: () => void
  /** Un « + » du canvas : ouvre la bibliothèque pour insérer avant
      `beforeId` (fin de page si nul). */
  onInsertAt: (beforeId: string | null) => void
}) {
  return (
    <div
      ref={paneRef}
      onPointerMove={onPaneMove}
      onPointerLeave={onPaneLeave}
      onPointerDown={onPaneDown}
      className="min-h-0 flex-1 overflow-auto bg-[#eae6df] p-2 md:min-w-[520px] md:p-[22px]"
    >
      {/* Page sans section : une invitation, au centre — pas une page
          blanche muette. */}
      {editing && roots.length === 0 && (
        <div className="flex h-full min-h-[360px] items-center justify-center">
          <div className="max-w-sm rounded-[14px] border border-dashed border-line-strong bg-ivory/80 px-8 py-9 text-center">
            <p className="font-serif text-[1.15rem] text-foreground">
              Cette page est vide.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              Choisissez un premier modèle dans la bibliothèque, puis
              remplissez-le avec vos textes et vos images.
            </p>
            <button
              type="button"
              onClick={onAddFirst}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-deep px-4 py-2 text-[12.5px] font-medium text-white transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50 focus-visible:ring-offset-2"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
              Ajouter votre première section
            </button>
          </div>
        </div>
      )}

      <div
        className="relative mx-auto"
        style={{ width: vw * scale, height: stageHeight * scale }}
      >
        {/* La page vit dans un cadre à la largeur exacte de l'écran
            simulé (voir `StageFrame`) : media queries, `vw` et
            `clamp()` s'y calculent comme sur l'appareil. Les
            gestionnaires restent sur un élément de l'arbre React :
            les événements du portail remontent jusqu'ici. */}
        <div
          onClickCapture={onStageClick}
          onDoubleClick={onStageDoubleClick}
          className="origin-top-left overflow-hidden rounded-[4px] bg-ivory shadow-[0_2px_14px_rgba(28,32,30,0.09)]"
          style={{ width: vw * scale, height: stageHeight * scale }}
        >
          <StageFrame
            ref={frameRef}
            title="Page en cours d’édition"
            width={vw}
            height={stageHeight}
            scale={scale}
            onReady={onFrameReady}
          >
            {/* L'identité globale s'applique aussi dans l'éditeur : ce
                que l'admin règle dans « Apparence » se voit ici. */}
            {identityStyles && (
              <style dangerouslySetInnerHTML={{ __html: identityStyles }} />
            )}
            <MotionProvider>
              {/* Animations coupées : dans l'éditeur, chaque section
                  est rendue dans son état final, immédiatement
                  visible. */}
              <AnimProvider enabled={false}>
                <SectionsView
                  key={`${effectiveViewport}-${mode}`}
                  sections={sections}
                  data={data}
                  editable={editing}
                  breakpoint={effectiveViewport}
                />
              </AnimProvider>
            </MotionProvider>
          </StageFrame>
        </div>

        {/* Cadre de la section sélectionnée */}
        {editing && selectionRect && (
          <div
            className="pointer-events-none absolute inset-x-0 ring-[1.5px] ring-inset ring-blue-deep"
            style={{
              top: selectionRect.top * scale,
              height: selectionRect.height * scale,
            }}
          />
        )}

        {/* ── Contrôles au survol de chaque section ─────────────── */}
        {editing && (
          <div className="pointer-events-none absolute inset-0">
            {sectionRects.map((r, i) => {
              const section = byId.get(r.id)
              if (!section) return null
              const active = hoverId === r.id || selectedId === r.id

              return (
                <div
                  key={r.id}
                  className={cn(
                    'absolute inset-x-0',
                    /* Survol : liseré intérieur bleu à 35 % — la
                       sélection garde son liseré plein. */
                    hoverId === r.id &&
                      selectedId !== r.id &&
                      'ring-[1.5px] ring-inset ring-blue-deep/35',
                  )}
                  style={{ top: r.top * scale, height: r.height * scale }}
                >
                  {active && (
                    <>
                      {/* Étiquette de la section */}
                      <div className="absolute left-2.5 top-2.5 rounded-[5px] bg-[rgba(28,32,30,0.82)] px-2 py-[3px] text-[12px] text-white">
                        {section.name ??
                          getBlock(section.type)?.label ??
                          section.type}
                        {!section.isActive && ' — masquée'}
                      </div>

                      {/* Modifier — ouvre le panneau de droite. */}
                      <button
                        type="button"
                        onClick={() => onSelect(r.id)}
                        className="pointer-events-auto absolute right-2 top-2 rounded-[7px] border border-line-strong bg-white px-2.5 py-1 text-[12px] text-foreground shadow-[0_1px_4px_rgba(28,32,30,0.08)] transition-colors hover:border-blue-deep hover:text-blue-deep"
                      >
                        Modifier
                      </button>

                      {/* « + » aux deux frontières de la section — fixe
                          la position exacte, au clic seulement. */}
                      {(['before', 'after'] as const).map((side, pos) => (
                        <button
                          key={side}
                          type="button"
                          title="Insérer une section ici"
                          onClick={() =>
                            /* Avant cette section, ou avant la suivante
                               (fin de page s'il n'y en a pas). */
                            onInsertAt(
                              side === 'before'
                                ? r.id
                                : (sectionRects[i + 1]?.id ?? null),
                            )
                          }
                          className={cn(
                            'pointer-events-auto absolute left-1/2 z-10 flex h-[26px] w-[26px] -translate-x-1/2 items-center justify-center rounded-full bg-foreground text-ivory shadow-[0_2px_8px_rgba(28,32,30,0.25)] transition-transform hover:scale-110',
                            pos === 0
                              ? 'top-0 -translate-y-1/2'
                              : 'bottom-0 translate-y-1/2',
                          )}
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
