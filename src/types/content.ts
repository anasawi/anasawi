/**
 * Formes des colonnes JSONB — partagées par le schéma Drizzle, les
 * requêtes, les actions et les composants.
 *
 * Elles vivent ici, hors de `server/db/schema.ts`, pour qu'un composant
 * client puisse les importer sans tirer Drizzle dans son bundle. Le schéma
 * les applique aux colonnes via `.$type<…>()` : une ligne relue de la base
 * porte donc directement ces types, sans `as` dans les consommateurs.
 */

export type OpeningHour = { day: string; hours: string }

export type SocialLink = { label: string; url: string }

/** Une entrée du menu du site (`settings.navigation`). */
export type NavigationItem = { label: string; href: string }

/**
 * Une section telle qu'elle est figée dans `pages.published_snapshot` :
 * la ligne de la table `sections` sans ses horodatages. C'est LA projection
 * partagée par la publication, la comparaison (« modifications non
 * publiées ») et la restauration.
 */
export type SnapshotRow = {
  id: string
  pageId: string
  parentId: string | null
  columnIndex: number
  placement: unknown
  styles: unknown
  settings: unknown
  name: string | null
  type: string
  anchor: string | null
  navLabel: string | null
  showInNav: boolean
  sortOrder: number
  isActive: boolean
  backgroundColor: string
  payload: unknown
}
