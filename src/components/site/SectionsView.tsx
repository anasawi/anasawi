'use client'

import { memo, useMemo } from 'react'
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
import { EdgeWave } from '@/components/site/EdgeWave'
import { Ornament } from '@/components/site/Ornament'
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
 * Convention d'espacement vertical — UNE seule, portée par le wrapper.
 *
 * Le `<section>` rendu ici pose `padding-block: var(--spacing-section)` sur
 * toute section standard ; les templates ne mettent AUCUN padding vertical
 * à leur racine. Seuls les blocs `bleed` (héros, bandeaux, séparateurs,
 * contact K, témoignage nuit…) portent leur propre rythme — toujours avec
 * les tokens de globals.css.
 *
 * Les blocs « respiration courte » reçoivent `--spacing-section-tight`
 * (0,6 × section) : médaillon L, appel doux et CTA de fin de page.
 */
const TIGHT_BLOCKS = new Set(['aproposMedaillon', 'appelDoux', 'cta'])

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

/** Tableau vide partagé : une racine sans enfant garde la même référence
    d'un rendu à l'autre (comparaison de `SectionRoot`). */
const EMPTY_SECTIONS: Section[] = []

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
  /* Tout ce qui se dérive de `sections` est mémoïsé sur `sections` : dans
     l'éditeur, chaque frappe de l'inspecteur produit un nouveau tableau,
     mais les lignes non touchées gardent leur identité — c'est ce qui
     permet à `SectionRoot` (memo) de ne re-rendre que la section éditée. */
  const visible = useMemo(
    () => (editable ? sections : sections.filter((s) => s.isActive)),
    [sections, editable],
  )

  const roots = useMemo(() => visible.filter((s) => !s.parentId), [visible])

  const childrenOf = useMemo(() => {
    const map = new Map<string, Section[]>()
    for (const section of visible) {
      if (!section.parentId) continue
      const siblings = map.get(section.parentId) ?? []
      siblings.push(section)
      map.set(section.parentId, siblings)
    }
    return map
  }, [visible])

  /** Descendance de chaque racine (tous niveaux), pour que `SectionRoot`
      détecte un changement dans son sous-arbre — pas seulement sur la
      ligne racine. */
  const descendantsOf = useMemo(() => {
    const map = new Map<string, Section[]>()
    const collect = (id: string, into: Section[]) => {
      for (const kid of childrenOf.get(id) ?? []) {
        into.push(kid)
        collect(kid.id, into)
      }
    }
    for (const root of roots) {
      const list: Section[] = []
      collect(root.id, list)
      map.set(root.id, list)
    }
    return map
  }, [roots, childrenOf])

  const mediaMap = useMemo(
    () => new Map<string, Media>(data.media.map((m) => [m.id, m])),
    [data.media],
  )

  const ctx = useMemo<BlockContext>(
    () => ({
      resolveMedia: (id) => (id ? (mediaMap.get(id) ?? null) : null),
      services: data.services,
      faqItems: data.faqItems,
      settings: data.settings,
      index: 0,
      editable,
    }),
    [mediaMap, data.services, data.faqItems, data.settings, editable],
  )

  /* Canevas de la page, pour la génération du CSS de grille — calculés
     ici, et non plus par effet de bord pendant le rendu des blocs : c'est
     ce qui autorise la mémoïsation des racines. */
  const gridCanvases = useMemo(
    () => collectGridCanvases(roots, childrenOf),
    [roots, childrenOf],
  )

  /* Feuille de styles de la page : styles des nœuds + grilles des canevas.
     En éditeur, tout est aplati au breakpoint affiché — aucune media query,
     la fenêtre de l'admin n'a pas voix au chapitre. */
  const pageCss = useMemo(() => {
    const styleBreakpoint = breakpoint
      ? breakpoint === 'desktop'
        ? ('base' as const)
        : breakpoint
      : undefined

    return (
      generateCss(
        visible.map((s) => ({ id: s.id, styles: s.styles })),
        styleBreakpoint,
      ) + generateGridCss(gridCanvases, breakpoint)
    )
  }, [visible, gridCanvases, breakpoint])

  if (visible.length === 0) return null

  return (
    <>
      {pageCss && <style dangerouslySetInnerHTML={{ __html: pageCss }} />}
      {roots.map((section, index) => (
        <SectionRoot
          key={section.id}
          section={section}
          previous={roots[index - 1]}
          index={index}
          descendants={descendantsOf.get(section.id) ?? EMPTY_SECTIONS}
          childrenOf={childrenOf}
          ctx={ctx}
          editable={editable}
        />
      ))}
    </>
  )
}

/**
 * Canevas atteignables depuis les racines, dans l'ordre de rendu — les mêmes
 * que ceux que `renderBlock` rencontrait : un bloc au payload invalide n'est
 * pas rendu, ses enfants non plus, donc pas de canevas pour eux.
 */
function collectGridCanvases(
  roots: Section[],
  childrenOf: Map<string, Section[]>,
): GridCanvasNode[] {
  const out: GridCanvasNode[] = []

  const visit = (section: Section, isRoot: boolean) => {
    const block = getBlock(section.type)
    if (!block) return
    const parsed = block.schema.safeParse(section.payload)
    if (!parsed.success) return

    /* Les enfants d'un conteneur sont rendus par lui ; ceux d'une racine
       non-conteneur, par ses zones avant/après. Un bloc enfant simple ne
       rend jamais d'enfants. */
    if (!block.container && !isRoot) return

    const kids = sortedKids(childrenOf, section.id)

    if (block.container && block.freeform) {
      const ordered = readingOrder(kids, (k) => parseGridPosition(k.placement))
      out.push({
        id: section.id,
        rows: canvasRows(parsed.data),
        children: ordered.map((k) => ({
          id: k.id,
          position: parseGridPosition(k.placement),
        })),
      })
      for (const kid of ordered) visit(kid, false)
      return
    }

    for (const kid of kids) visit(kid, false)
  }

  for (const root of roots) visit(root, true)
  return out
}

function sortedKids(
  childrenOf: Map<string, Section[]>,
  id: string,
): Section[] {
  return [...(childrenOf.get(id) ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
}

type RenderEnv = {
  childrenOf: Map<string, Section[]>
  ctx: BlockContext
  editable: boolean
}

/** Rend un bloc et, s'il est conteneur, ses colonnes ou sa grille. */
function renderBlock(section: Section, index: number, env: RenderEnv) {
  const { childrenOf, ctx, editable } = env
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
    const kids = sortedKids(childrenOf, section.id)

    if (block.freeform) {
      /* ── Grille ─────────────────────────────────────────────── */
      const ordered = readingOrder(kids, (k) => parseGridPosition(k.placement))

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
                  {renderBlock(kid, 0, env)}
                </div>
              ) : (
                renderBlock(kid, 0, env)
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
              {renderBlock(kid, 0, env)}
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

type SectionRootProps = {
  section: Section
  /** Racine précédente — son fond se déverse ici (bord ondulé). */
  previous: Section | undefined
  index: number
  /** Sous-arbre complet de la racine — sert uniquement à la comparaison. */
  descendants: Section[]
  childrenOf: Map<string, Section[]>
  ctx: BlockContext
  editable: boolean
}

/**
 * Une section racine — `<section>` + fond + ornement + bloc + zones.
 *
 * Mémoïsée : une frappe dans l'inspecteur ne re-rend que la racine dont
 * une ligne (elle-même ou un descendant) a changé d'identité. `childrenOf`
 * change à chaque rendu du parent, mais son contenu pour CE sous-arbre est
 * entièrement décrit par `descendants` — c'est lui que compare
 * `sameRootProps`, pas la carte.
 */
const SectionRoot = memo(function SectionRoot({
  section,
  previous,
  index,
  childrenOf,
  ctx,
  editable,
}: SectionRootProps) {
  const block = getBlock(section.type)
  if (!block) return null

  const env: RenderEnv = { childrenOf, ctx, editable }

  const anchor = section.anchor ?? undefined
  const theme = sectionTheme(section.backgroundColor)
  const settings = parseSectionSettings(section.settings)

  /* Le bord ondulé appartient à la section du DESSUS : c'est son fond
     qui se déverse ici. On le lit donc chez la précédente. */
  const edge = previous ? parseSectionSettings(previous.settings).edge : 'aucun'

  const kids = sortedKids(childrenOf, section.id)
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
          /* Rythme « titre → contenu » du système : 48px desktop,
             40px mobile — jamais un padding de section en plus. */
          items.length > 0 &&
            (columnIndex === 0 ? 'pb-10 md:pb-12' : 'pt-10 md:pt-12'),
        )}
      >
        <div className="mx-auto flex min-w-0 max-w-[52rem] flex-col gap-8">
          {items.map((kid) => (
            <BlockSlot key={kid.id} section={kid} editable={editable}>
              {renderBlock(kid, 0, env)}
            </BlockSlot>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section
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
          /* L'index de section (« iv — approche ») vit DANS le template,
             donc sous le padding du wrapper : on lui donne de quoi
             remonter à 28px du haut de la section. Les blocs `bleed`
             portent leur padding eux-mêmes et gardent le défaut. */
          ...(block.bleed
            ? {}
            : {
                '--section-index-top': TIGHT_BLOCKS.has(section.type)
                  ? 'calc(1.75rem - var(--spacing-section-tight))'
                  : 'calc(1.75rem - var(--spacing-section))',
              }),
        } as React.CSSProperties
      }
      className={cn(
        'relative scroll-mt-24',
        /* Sous `lg`, aucune section ne peut ouvrir de défilement
           horizontal (titres décalés, chiffres, bandeaux). `clip` ne
           crée pas de conteneur de défilement. Le desktop validé reste
           tel quel. */
        'max-lg:overflow-x-clip',
        nodeClass(section.id),
        !theme.isDark && 'grain',
        /* LE padding vertical du site : section, ou section-tight pour
           les respirations courtes. Rien d'autre, nulle part. */
        !block.bleed &&
          (TIGHT_BLOCKS.has(section.type)
            ? 'py-[var(--spacing-section-tight)]'
            : 'py-[var(--spacing-section)]'),
        editable && !section.isActive && 'opacity-40',
      )}
    >
      {previous && <EdgeWave edge={edge} color={previous.backgroundColor} />}

      {/* Le décor au trait, sous le contenu et hors de l'animation
          d'entrée : il a son propre tracé, plus lent. */}
      <Ornament
        motif={settings.ornament}
        position={settings.ornamentPosition}
        size={settings.ornamentSize}
        dark={theme.isDark}
      />

      <SectionEntrance settings={settings}>
        {!block.container && zone(0, before)}
        {renderBlock(section, index, env)}
        {!block.container && zone(1, after)}
      </SectionEntrance>
    </section>
  )
}, sameRootProps)

function sameRootProps(a: SectionRootProps, b: SectionRootProps): boolean {
  if (
    a.section !== b.section ||
    a.previous !== b.previous ||
    a.index !== b.index ||
    a.ctx !== b.ctx ||
    a.editable !== b.editable ||
    a.descendants.length !== b.descendants.length
  ) {
    return false
  }
  for (let i = 0; i < a.descendants.length; i++) {
    if (a.descendants[i] !== b.descendants[i]) return false
  }
  return true
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
