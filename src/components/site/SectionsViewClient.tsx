'use client'

import { memo, useMemo } from 'react'

import {
  EMPTY_SECTIONS,
  SectionRootView,
  buildBlockContext,
  buildPageCss,
  buildSectionTree,
  sameRootProps,
  type SectionsViewProps,
} from './SectionsViewCore'

/**
 * Une racine mémoïsée : une frappe dans l'inspecteur ne re-rend que la
 * racine dont une ligne (elle-même ou un descendant) a changé d'identité.
 */
const SectionRoot = memo(SectionRootView, sameRootProps)

/**
 * Le rendu des sections pour l'ÉDITEUR — même moteur que le site public
 * (`SectionsViewCore`), mais tenu en mémoire sur `sections` : chaque
 * frappe de l'inspecteur produit un nouveau tableau, et les lignes non
 * touchées gardent leur identité — c'est ce qui permet à `SectionRoot`
 * de ne re-rendre que la section éditée.
 */
export function SectionsViewClient({
  sections,
  data,
  editable = false,
  breakpoint,
}: SectionsViewProps) {
  const tree = useMemo(
    () => buildSectionTree(sections, editable),
    [sections, editable],
  )

  /* Sur les CHAMPS de `data`, pas sur l'objet : un parent qui le
     recomposerait à chaque rendu ne doit pas invalider toutes les
     racines. */
  const { services, faqItems, settings, media } = data
  const ctx = useMemo(
    () => buildBlockContext({ services, faqItems, settings, media }, editable),
    [services, faqItems, settings, media, editable],
  )

  const pageCss = useMemo(() => buildPageCss(tree, breakpoint), [tree, breakpoint])

  if (tree.visible.length === 0) return null

  return (
    <>
      {pageCss && <style dangerouslySetInnerHTML={{ __html: pageCss }} />}
      {tree.roots.map((section, index) => (
        <SectionRoot
          key={section.id}
          section={section}
          previous={tree.roots[index - 1]}
          index={index}
          descendants={tree.descendantsOf.get(section.id) ?? EMPTY_SECTIONS}
          childrenOf={tree.childrenOf}
          ctx={ctx}
          editable={editable}
        />
      ))}
    </>
  )
}
