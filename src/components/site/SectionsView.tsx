import { SectionsViewClient } from './SectionsViewClient'
import {
  EMPTY_SECTIONS,
  SectionRootView,
  buildBlockContext,
  buildPageCss,
  buildSectionTree,
  type SectionsViewProps,
} from './SectionsViewCore'

export type { SectionsViewData, SectionsViewProps } from './SectionsViewCore'

/**
 * Rendu des sections d'une page — LE composant de rendu, unique.
 *
 * Côté public, il est rendu par le wrapper serveur `SectionRenderer` :
 * aucune grille visible, aucun attribut d'édition, media queries pour le
 * responsive — et RENDU PAR LE SERVEUR, sans hook : le HTML arrive
 * complet, et seuls les îlots interactifs (formulaire, fiches, vidéo,
 * entrées animées) embarquent du JavaScript. Auparavant tout le moteur,
 * ses blocs et leurs dépendances étaient expédiés au navigateur pour y
 * re-rendre ce que le serveur avait déjà écrit.
 *
 * Côté admin, l'éditeur le rend DIRECTEMENT dans son canvas — même
 * document, événements souris natifs, plus d'iframe ni de pont
 * postMessage — avec `editable` et un `breakpoint` explicite : il passe
 * alors par `SectionsViewClient`, la même mécanique mémoïsée pour que
 * chaque frappe de l'inspecteur ne re-rende que la section touchée.
 *
 * Les canevas sont des GRILLES CSS : 12/8/4 colonnes, lignes de 48 px
 * extensibles. Chaque enfant occupe des cellules (`grid-column` /
 * `grid-row` générés depuis son placement). L'ordre du DOM est l'ordre de
 * lecture — c'est lui qui fait l'empilement mobile par défaut.
 */
export function SectionsView(props: SectionsViewProps) {
  if (props.editable) return <SectionsViewClient {...props} />

  const { sections, data, breakpoint } = props
  const tree = buildSectionTree(sections, false)
  if (tree.visible.length === 0) return null

  const ctx = buildBlockContext(data, false)
  const pageCss = buildPageCss(tree, breakpoint)

  return (
    <>
      {pageCss && <style dangerouslySetInnerHTML={{ __html: pageCss }} />}
      {tree.roots.map((section, index) => (
        <SectionRootView
          key={section.id}
          section={section}
          previous={tree.roots[index - 1]}
          index={index}
          descendants={tree.descendantsOf.get(section.id) ?? EMPTY_SECTIONS}
          childrenOf={tree.childrenOf}
          ctx={ctx}
          editable={false}
        />
      ))}
    </>
  )
}
