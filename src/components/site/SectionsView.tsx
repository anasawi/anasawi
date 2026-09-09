'use client'

import { m, useReducedMotion } from 'motion/react'

import { getBlock } from '@/blocks/registry'
import type { BlockContext } from '@/blocks/types'
import { sectionTheme } from '@/lib/color'
import {
  canvasRows,
  generateGridCss,
  gridContainerClass,
  gridItemClass,
  parseGridPosition,
  readingOrder,
  type Breakpoint,
  type GridCanvasNode,
} from '@/lib/grid'
import { generateCss, nodeClass } from '@/lib/node-styles'
import {
  parseSectionSettings,
  type SectionSettings,
} from '@/lib/section-settings'
import { cn } from '@/lib/utils'
import type {
  FaqItem,
  Media,
  Section,
  ServiceWithMedia,
  Settings,
} from '@/server/db/schema'

/**
 * Les blocs de respiration reçoivent plus de vide que les blocs de contenu.
 */
const BREATHING_BLOCKS = new Set(['quote', 'cta'])

/** Types dont le contenu REMPLIT ses cellules (recadré) au lieu de les
    faire grandir. L'image se redimensionne donc vraiment à la souris ;
    le texte, lui, garde sa hauteur de contenu — le tronquer serait pire. */
const FILL_TYPES = new Set(['image', 'spacer', 'video', 'acces'])

/** Petits composants centrés verticalement dans leurs cellules : la marge
    restante se répartit au lieu de s'accumuler en bas. */
const CENTER_TYPES = new Set(['button', 'badge', 'reseaux', 'barre', 'avatar'])

export type SectionsViewData = {
  services: ServiceWithMedia[]
  faqItems: FaqItem[]
  settings: Settings
  media: Media[]
}

/**
 * Rendu des sections d'une page — LE composant de rendu, unique.
 *
 * Côté public, il est rendu par le wrapper serveur `SectionRenderer` :
 * aucune grille visible, aucun attribut d'édition, media queries pour le
 * responsive. Côté admin, l'éditeur le rend DIRECTEMENT dans son canvas —
 * même document, événements souris natifs, plus d'iframe ni de pont
 * postMessage — avec `editable` et un `breakpoint` explicite.
 *
 * Les canevas sont des GRILLES CSS : 12/8/4 colonnes, lignes de 48 px
 * extensibles. Chaque enfant occupe des cellules (`grid-column` /
 * `grid-row` générés depuis son placement). L'ordre du DOM est l'ordre de
 * lecture — c'est lui qui fait l'empilement mobile par défaut.
 */
export function SectionsView({
  sections,
  data,
  editable = false,
  breakpoint,
}: {
  sections: Section[]
  data: SectionsViewData
  editable?: boolean
  /** Éditeur uniquement : breakpoint affiché, CSS aplati sans media query. */
  breakpoint?: Breakpoint
}) {
  const visible = editable ? sections : sections.filter((s) => s.isActive)
  if (visible.length === 0) return null

  const mediaMap = new Map<string, Media>(data.media.map((m) => [m.id, m]))

  const ctx: BlockContext = {
    resolveMedia: (id) => (id ? (mediaMap.get(id) ?? null) : null),
    services: data.services,
    faqItems: data.faqItems,
    settings: data.settings,
    index: 0,
    editable,
  }

  const roots = visible.filter((s) => !s.parentId)
  const childrenOf = new Map<string, Section[]>()

  for (const section of visible) {
    if (!section.parentId) continue
    const siblings = childrenOf.get(section.parentId) ?? []
    siblings.push(section)
    childrenOf.set(section.parentId, siblings)
  }

  /** Canevas de la page, pour la génération du CSS de grille. */
  const gridCanvases: GridCanvasNode[] = []

  /** Rend un bloc et, s'il est conteneur, ses colonnes ou sa grille. */
  function renderBlock(section: Section, index: number) {
    const block = getBlock(section.type)
    if (!block) return null

    const parsed = block.schema.safeParse(section.payload)
    if (!parsed.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[sections] payload invalide — type "${section.type}", id ${section.id}`,
          parsed.error.flatten(),
        )
      }
      return null
    }

    let columns: React.ReactNode[] | undefined
    let columnProps: Record<string, string | undefined>[] | undefined

    if (block.container) {
      const kids = (childrenOf.get(section.id) ?? []).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      )

      if (block.freeform) {
        /* ── Grille ─────────────────────────────────────────────── */
        const ordered = readingOrder(kids, (k) => parseGridPosition(k.placement))

        gridCanvases.push({
          id: section.id,
          rows: canvasRows(parsed.data),
          children: ordered.map((k) => ({
            id: k.id,
            position: parseGridPosition(k.placement),
          })),
        })

        columns = [
          ordered.map((kid) => {
            const fill = FILL_TYPES.has(kid.type)
            /* Le porteur de style est le conteneur de cellules LUI-MÊME :
               un fond, un arrondi ou des marges internes couvrent toute la
               surface choisie à la souris — pas seulement le texte. */
            return (
              <div
                key={kid.id}
                data-grid-item={editable ? kid.id : undefined}
                data-grid-type={editable ? kid.type : undefined}
                data-block-id={editable ? kid.id : undefined}
                data-block-inactive={
                  editable && !kid.isActive ? 'true' : undefined
                }
                className={cn(
                  gridItemClass(kid.id),
                  'min-w-0',
                  (editable || kid.styles !== null) && nodeClass(kid.id),
                  (editable || fill) && 'relative',
                  fill && 'overflow-hidden',
                  CENTER_TYPES.has(kid.type) && 'flex flex-col justify-center',
                  editable && !kid.isActive && 'opacity-40',
                )}
              >
                {fill ? (
                  /* Contenu en absolu : il ne contribue aucune hauteur,
                     donc les cellules gardent la taille choisie à la
                     souris et l'image est recadrée (`object-cover`). */
                  <div className="absolute inset-0 [&>*]:h-full [&_figure]:h-full [&_iframe]:h-full [&_iframe]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                    {renderBlock(kid, 0)}
                  </div>
                ) : (
                  renderBlock(kid, 0)
                )}
              </div>
            )
          }),
        ]

        columnProps = [
          {
            className: gridContainerClass(section.id),
            ...(editable
              ? {
                  'data-grid-canvas': section.id,
                  'data-grid-rows': String(canvasRows(parsed.data)),
                }
              : {}),
          },
        ]
      } else {
        const count = Math.max(
          1,
          Number((parsed.data as { count?: number }).count ?? 1),
        )

        columns = Array.from({ length: count }, (_, column) =>
          kids
            .filter((kid) => kid.columnIndex === column)
            .map((kid) => (
              <BlockSlot key={kid.id} section={kid} editable={editable}>
                {renderBlock(kid, 0)}
              </BlockSlot>
            )),
        )

        if (editable) {
          columnProps = Array.from({ length: count }, (_, column) => ({
            'data-column-parent': section.id,
            'data-column-index': String(column),
          }))
        }
      }
    }

    return (
      <block.Component
        data={parsed.data}
        ctx={{ ...ctx, index }}
        columns={columns}
        columnProps={columnProps}
      />
    )
  }

  /* Le rendu des racines remplit `gridCanvases` — on le matérialise avant
     de générer la feuille de styles. */
  const rendered = roots.map((section, index) => {
    const block = getBlock(section.type)
    if (!block) return null

    const anchor = section.anchor ?? undefined
    const theme = sectionTheme(section.backgroundColor)

    const kids = (childrenOf.get(section.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )
    const before = kids.filter((kid) => kid.columnIndex === 0)
    const after = kids.filter((kid) => kid.columnIndex !== 0)

    const zone = (columnIndex: 0 | 1, items: Section[]) => {
      if (!editable && items.length === 0) return null

      return (
        <div
          data-column-parent={editable ? section.id : undefined}
          data-column-index={editable ? String(columnIndex) : undefined}
          className={cn(
            'container-editorial',
            editable && 'min-h-10',
            items.length > 0 &&
              (columnIndex === 0 ? 'pb-14 lg:pb-20' : 'pt-14 lg:pt-20'),
          )}
        >
          <div className="mx-auto flex min-w-0 max-w-[52rem] flex-col gap-8">
            {items.map((kid) => (
              <BlockSlot key={kid.id} section={kid} editable={editable}>
                {renderBlock(kid, 0)}
              </BlockSlot>
            ))}
          </div>
        </div>
      )
    }

    return (
      <section
        key={section.id}
        id={anchor}
        aria-label={section.navLabel ?? undefined}
        data-block-id={editable ? section.id : undefined}
        data-block-root={editable ? 'true' : undefined}
        data-block-inactive={editable && !section.isActive ? 'true' : undefined}
        style={
          {
            backgroundColor: theme.background,
            color: theme.foreground,
            ...theme.vars,
          } as React.CSSProperties
        }
        className={cn(
          'relative scroll-mt-24',
          nodeClass(section.id),
          !theme.isDark && 'grain',
          !block.bleed &&
            (BREATHING_BLOCKS.has(section.type)
              ? 'py-[var(--spacing-section-lg)]'
              : 'py-[var(--spacing-section)]'),
          editable && !section.isActive && 'opacity-40',
        )}
      >
        <SectionEntrance settings={parseSectionSettings(section.settings)}>
          {!block.container && zone(0, before)}
          {renderBlock(section, index)}
          {!block.container && zone(1, after)}
        </SectionEntrance>
      </section>
    )
  })

  /* Feuille de styles de la page : styles des nœuds + grilles des canevas.
     En éditeur, tout est aplati au breakpoint affiché — aucune media query,
     la fenêtre de l'admin n'a pas voix au chapitre. */
  const styleBreakpoint = breakpoint
    ? breakpoint === 'desktop'
      ? ('base' as const)
      : breakpoint
    : undefined

  const pageCss =
    generateCss(
      visible.map((s) => ({ id: s.id, styles: s.styles })),
      styleBreakpoint,
    ) + generateGridCss(gridCanvases, breakpoint)

  return (
    <>
      {pageCss && <style dangerouslySetInnerHTML={{ __html: pageCss }} />}
      {rendered}
    </>
  )
}

/**
 * Animation d'apparition d'une section — les presets du CMS.
 *
 * `aucune` (défaut) laisse chaque bloc gérer ses propres micro-animations ;
 * les presets animent la section entière, une seule fois, à l'entrée dans
 * le viewport. Sous `prefers-reduced-motion`, rien ne bouge.
 */
const ENTRANCE_INITIAL: Record<
  Exclude<SectionSettings['animation'], 'aucune'>,
  { opacity: number; y?: number; scale?: number }
> = {
  fade: { opacity: 0 },
  'fade-up': { opacity: 0, y: 44 },
  scale: { opacity: 0, scale: 0.96 },
}

function SectionEntrance({
  settings,
  children,
}: {
  settings: SectionSettings
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()

  if (settings.animation === 'aucune' || reduced) return <>{children}</>

  return (
    <m.div
      initial={ENTRANCE_INITIAL[settings.animation]}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{
        duration: settings.duration,
        delay: settings.delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </m.div>
  )
}

/**
 * Enveloppe d'un bloc enfant. En édition elle porte l'identifiant lu par le
 * constructeur ; sur le site public elle ne devient un `<div>` que si le
 * bloc a des styles à porter.
 */
function BlockSlot({
  section,
  editable,
  children,
}: {
  section: Section
  editable: boolean
  children: React.ReactNode
}) {
  if (!editable) {
    if (!section.styles) return <>{children}</>
    return <div className={nodeClass(section.id)}>{children}</div>
  }

  return (
    <div
      data-block-id={section.id}
      data-block-inactive={!section.isActive ? 'true' : undefined}
      className={cn(
        'relative',
        nodeClass(section.id),
        !section.isActive && 'opacity-40',
      )}
    >
      {children}
    </div>
  )
}
