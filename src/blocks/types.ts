import type { ComponentType } from 'react'
import type { z } from 'zod'

import type { FieldDescriptor } from './field'
import type { FaqItem, Media, ServiceWithMedia, Settings } from '@/server/db/schema'

/**
 * Les blocs ne stockent jamais une image dénormalisée : ils stockent son id.
 * L'alt et les dimensions sont résolus au rendu depuis la table `media`, ce qui
 * permet de réutiliser une même image dans plusieurs sections et de corriger
 * son texte alternatif à un seul endroit.
 */
export type MediaResolver = (id: string | null | undefined) => Media | null

/**
 * Données partagées, chargées une seule fois par page et passées à tous les
 * blocs — plutôt qu'une requête par bloc.
 */
export type BlockContext = {
  resolveMedia: MediaResolver
  services: ServiceWithMedia[]
  faqItems: FaqItem[]
  settings: Settings
  /** Position de la section dans la page — sert au `priority` de l'image du hero. */
  index: number
  /**
   * Rendu dans l'aperçu du constructeur. Les blocs de texte y marquent
   * leurs champs éditables en direct (`data-edit-field`) — jamais sur le
   * site public.
   */
  editable?: boolean
}

export type BlockProps<TPayload> = {
  data: TPayload
  ctx: BlockContext
  /**
   * Colonnes déjà rendues, pour les blocs conteneurs.
   * `columns[0]` est le contenu de la première colonne, etc.
   */
  columns?: React.ReactNode[]

  /**
   * Attributs à poser sur chaque élément de colonne.
   *
   * En mode édition, ils portent l'identifiant du conteneur et l'index de la
   * colonne, ce qui permet au constructeur de mesurer les zones de dépôt.
   * Vides sur le site public : aucun identifiant de base n'y circule.
   */
  columnProps?: Record<string, string | undefined>[]
}

/**
 * Partie d'une définition de bloc qui ne dépend pas de son schéma.
 */
type BlockMeta = {
  /** Nom affiché dans le sélecteur de blocs du CMS. */
  label: string
  description: string
  fields: readonly FieldDescriptor[]
  /** Ancre proposée par défaut lors de la création de la section. */
  suggestedAnchor?: string
  /**
   * Contenu venu d'un écran du CMS plutôt que du bloc.
   *
   * Certains blocs n'affichent pas leur propre texte : ils lisent une liste
   * partagée (accompagnements, questions fréquentes), pour qu'on la saisisse
   * une fois et qu'on la réutilise partout. L'inspecteur l'annonce et y
   * renvoie — sans quoi on cherche en vain les champs correspondants.
   */
  dataSource?: {
    /** Ce que le bloc affiche, à la première personne du CMS. */
    label: string
    /** Écran où cela se modifie. */
    href: string
  }
  /** Le bloc est-il proposé pour la navigation ? */
  navigable?: boolean
  /**
   * Le bloc gère lui-même sa largeur et ses marges verticales.
   * Le conteneur de section ne lui applique alors aucune respiration.
   */
  bleed?: boolean

  /**
   * Le bloc accueille des blocs enfants répartis en colonnes.
   * Un seul niveau : un bloc placé dans une colonne ne peut pas être
   * conteneur à son tour.
   */
  container?: boolean

  /**
   * Les enfants sont positionnés librement (x, y, largeur en % du canevas)
   * au lieu de suivre le flux. Écran large uniquement — sur mobile ils
   * s'empilent dans l'ordre, ce qui garde le responsive garanti.
   */
  freeform?: boolean

  /**
   * Le bloc peut être déposé dans une colonne.
   *
   * Les grandes sections éditoriales (hero, à propos, approche) ne le
   * peuvent pas : leur composition suppose toute la largeur, les serrer
   * dans un tiers de page les casse.
   */
  inline?: boolean

  /** Regroupement dans la palette du constructeur. */
  group: 'Sections' | 'Contenu' | 'Mise en page'
}

/**
 * Définition d'un bloc, liée à son schéma.
 *
 * C'est la forme à annoter sur chaque bloc : elle vérifie que `defaults`
 * satisfait le schéma et que le composant reçoit bien le type de données que
 * ce schéma produit.
 */
/* Pas de valeur par défaut sur `TSchema` : écrire `BlockDefinition` nu
   redonnerait le type invariant qui a produit 19 erreurs d'assignabilité.
   Sans défaut, l'oubli ne compile pas. */
export type BlockDefinition<TSchema extends z.ZodTypeAny> = BlockMeta & {
    schema: TSchema
    defaults: z.input<TSchema>
    Component: ComponentType<BlockProps<z.output<TSchema>>>
  }

/**
 * Forme effacée, pour les usages génériques : registre, palette, rendu.
 *
 * `BlockDefinition<T>` n'est **pas** assignable à `BlockDefinition<ZodTypeAny>` :
 * `T` y apparaît en covariance (`schema`) et en contravariance (via
 * `z.output<T>` dans les props du composant), donc TypeScript le traite comme
 * invariant. Un registre typé `Record<string, BlockDefinition>` échoue sur
 * chacune de ses entrées.
 *
 * D'où ce type distinct, où les trois champs dépendants du schéma sont
 * relâchés. La vérification stricte a déjà lieu là où elle compte : à la
 * déclaration de chaque bloc, annoté `BlockDefinition<typeof monSchema>`.
 */
export type AnyBlockDefinition = BlockMeta & {
  schema: z.ZodTypeAny
  defaults: unknown
  /* `any` est ici volontaire, et `unknown` ne conviendrait pas.
     `FunctionComponent` expose une signature d'appel, dont le paramètre est
     donc comparé en contravariance sous `strictFunctionTypes` : il faut que
     `BlockProps<X>` de la cible soit assignable à `BlockProps<Payload>` de
     la source. Seul `any`, qui se relie dans les deux sens, le permet. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<BlockProps<any>>
}

/** Découpe un champ « richtext » (paragraphes séparés par une ligne vide). */
export function toParagraphs(input: string): string[] {
  return input
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
