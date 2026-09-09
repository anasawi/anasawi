import {
  AUTHOR_COL_FACTOR,
  AUTHOR_ROW_FACTOR,
  type GridPosition,
} from './grid'
import type { NodeStyles } from './node-styles'

/**
 * Bibliothèque de modèles du constructeur.
 *
 * Un modèle n'est PAS un composant figé : c'est un arbre de nœuds sérialisé,
 * instancié en base à l'insertion. Dès la seconde suivante, chaque élément se
 * déplace, se restyle, se supprime — le modèle donne un point de départ
 * soigné, il n'enferme jamais.
 *
 * Les compositions reprennent la grammaire du site : serif à fort contraste,
 * italique sur le mot-pivot, asymétrie, respiration.
 */

export type TemplateNode = {
  type: string
  name?: string
  payload: Record<string, unknown>
  styles?: NodeStyles
  /** Position dans la grille parente, en cellules. */
  placement?: GridPosition
  children?: TemplateNode[]
}

export type Template = {
  id: string
  label: string
  description: string
  /** Fond de la section créée. */
  backgroundColor: string
  root: TemplateNode
}

/* Compositions écrites en base 12 (lignes de 48 px), mises à l'échelle
   de la grille réelle — voir AUTHOR_*_FACTOR dans lib/grid. */
const at = (
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
): GridPosition => ({
  desktop: {
    col: (col - 1) * AUTHOR_COL_FACTOR + 1,
    row: (row - 1) * AUTHOR_ROW_FACTOR + 1,
    colSpan: colSpan * AUTHOR_COL_FACTOR,
    rowSpan: rowSpan * AUTHOR_ROW_FACTOR,
  },
})

const rowsOf = (authorRows: number): number => authorRows * AUTHOR_ROW_FACTOR

export const TEMPLATES: Template[] = [
  {
    id: 'ouverture-libre',
    label: 'Ouverture',
    description: 'Grand titre à gauche, image haute à droite, bouton.',
    backgroundColor: '#fcfaf7',
    root: {
      type: 'canvas',
      name: 'Ouverture',
      payload: { height: 'moyen', rows: rowsOf(12) },
      children: [
        {
          type: 'heading',
          payload: {
            eyebrow: 'THÉRAPIE · ACCOMPAGNEMENT',
            text: 'Un espace pour *souffler*.',
            level: 'h2',
            size: 'large',
            align: 'left',
          },
          placement: at(1, 2, 6, 3),
        },
        {
          type: 'text',
          payload: {
            body: 'Quelques lignes d’introduction, à réécrire — double-cliquez pour taper directement dans la page.',
            size: 'lead',
            align: 'left',
          },
          placement: at(1, 6, 5, 2),
        },
        {
          type: 'button',
          payload: {
            label: 'Prendre rendez-vous',
            href: '#contact',
            variant: 'primary',
            align: 'left',
            external: false,
          },
          placement: at(1, 9, 3, 1),
        },
        {
          type: 'image',
          payload: {
            mediaId: null,
            ratio: 'portrait',
            caption: '',
            rounded: false,
          },
          placement: at(8, 1, 5, 12),
        },
      ],
    },
  },
  {
    id: 'image-texte-libre',
    label: 'Image et texte',
    description: 'Image aux deux tiers, titre et paragraphe décalés.',
    backgroundColor: '#f6f2ec',
    root: {
      type: 'canvas',
      name: 'Image et texte',
      payload: { height: 'moyen', rows: rowsOf(10) },
      children: [
        {
          type: 'image',
          payload: {
            mediaId: null,
            ratio: 'portrait',
            caption: '',
            rounded: false,
          },
          placement: at(1, 1, 5, 9),
        },
        {
          type: 'heading',
          payload: {
            eyebrow: '',
            text: 'Un titre qui *respire*.',
            level: 'h2',
            size: 'medium',
            align: 'left',
          },
          placement: at(7, 2, 6, 2),
        },
        {
          type: 'text',
          payload: {
            body: 'Le paragraphe qui accompagne. Déplacez, redimensionnez, réécrivez — tout est libre.',
            size: 'base',
            align: 'left',
          },
          placement: at(7, 5, 5, 3),
        },
      ],
    },
  },
  {
    id: 'citation-libre',
    label: 'Citation',
    description: 'Une phrase centrée, beaucoup de vide autour.',
    backgroundColor: '#fcfaf7',
    root: {
      type: 'canvas',
      name: 'Citation',
      payload: { height: 'petit', rows: rowsOf(6) },
      children: [
        {
          type: 'heading',
          payload: {
            eyebrow: '',
            text: 'Ce qui ne peut se dire trouve parfois à *se déposer*.',
            level: 'h2',
            size: 'medium',
            align: 'center',
          },
          styles: { base: { font: 'serif', lineHeight: 1.35 } },
          placement: at(3, 2, 8, 3),
        },
      ],
    },
  },
  {
    id: 'trois-points-libre',
    label: 'Trois points',
    description: 'Titre, puis trois courts blocs de texte côte à côte.',
    backgroundColor: '#fcfaf7',
    root: {
      type: 'canvas',
      name: 'Trois points',
      payload: { height: 'moyen', rows: rowsOf(10) },
      children: [
        {
          type: 'heading',
          payload: {
            eyebrow: 'APPROCHE',
            text: 'Trois *repères*.',
            level: 'h2',
            size: 'medium',
            align: 'left',
          },
          placement: at(1, 1, 6, 2),
        },
        ...[0, 1, 2].map((i) => ({
          type: 'text',
          name: `Point ${i + 1}`,
          payload: {
            /* Deux paragraphes : le numéro, puis le texte — le champ texte
               ne connaît pas de gras, seulement des paragraphes. */
            body: `${String(i + 1).padStart(2, '0')}\n\nUn court paragraphe à remplacer.`,
            size: 'base',
            align: 'left',
          },
          placement: at(1 + i * 4, 4, 4, 6),
        })),
      ],
    },
  },
]

export function getTemplate(id: string): Template | null {
  return TEMPLATES.find((t) => t.id === id) ?? null
}
