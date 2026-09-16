import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/* ════════════════════════════════════════════════════════════════════
   Enums
   ════════════════════════════════════════════════════════════════════ */

export const userRoleEnum = pgEnum('user_role', ['owner', 'editor'])
export const pageStatusEnum = pgEnum('page_status', ['draft', 'published'])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}

/* ════════════════════════════════════════════════════════════════════
   Utilisateurs
   Le rôle existe dès le départ : ajouter un second admin plus tard
   est un INSERT, pas une migration.
   ════════════════════════════════════════════════════════════════════ */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Toujours stocké en minuscules — la contrainte d'unicité en dépend. */
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: userRoleEnum('role').notNull().default('editor'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('users_email_idx').on(t.email)],
)

/* ════════════════════════════════════════════════════════════════════
   Médias
   width/height stockés à l'upload → zéro CLS.
   blurDataUrl généré côté client au moment de l'upload.
   ════════════════════════════════════════════════════════════════════ */

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull(),
    pathname: text('pathname').notNull(),
    filename: text('filename').notNull(),
    alt: text('alt').notNull(),
    caption: text('caption'),
    width: integer('width').notNull().default(0),
    height: integer('height').notNull().default(0),
    blurDataUrl: text('blur_data_url'),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('media_created_idx').on(t.createdAt)],
)

/* ════════════════════════════════════════════════════════════════════
   Pages
   ════════════════════════════════════════════════════════════════════ */

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    status: pageStatusEnum('status').notNull().default('draft'),
    isHome: boolean('is_home').notNull().default(false),

    /**
     * Publication en deux temps : l'admin édite les sections VIVANTES
     * (autosave), le site public sert cet instantané. « Publier » copie
     * l'état courant ici — entre les deux, les visiteurs ne voient rien.
     * C'est aussi la fondation d'un futur historique de versions.
     */
    publishedSnapshot: jsonb('published_snapshot'),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('pages_slug_idx').on(t.slug),
    // Garantit qu'une seule page peut être la home.
    uniqueIndex('pages_single_home_idx')
      .on(t.isHome)
      .where(sql`${t.isHome} = true`),
  ],
)

/* ════════════════════════════════════════════════════════════════════
   Sections
   `type` pointe vers le registre de blocs ; `payload` est validé par
   le schéma Zod de ce bloc, jamais lu en aveugle.
   ════════════════════════════════════════════════════════════════════ */

export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),

    /**
     * Section parente, pour les blocs placés dans une colonne.
     *
     * Un seul niveau d'imbrication est autorisé — une section peut contenir
     * des blocs, mais ces blocs ne peuvent pas eux-mêmes contenir de colonnes.
     * C'est ce plafond qui garantit que le responsive reste calculable : une
     * imbrication libre produirait des mises en page impossibles à replier
     * proprement sur mobile.
     */
    parentId: uuid('parent_id'),

    /** Colonne occupée dans le parent (0-indexée). */
    columnIndex: integer('column_index').notNull().default(0),

    /**
     * Position libre dans un canevas : `{ x, y, w, h? }` en pourcentages.
     * Nul pour les blocs en flux. N'affecte que l'écran large — sur mobile,
     * les blocs s'empilent automatiquement par ordre de lecture (y, puis x).
     */
    placement: jsonb('placement'),

    /**
     * Réglages non-contenu de la section : animation d'apparition
     * (preset, délai, durée) et variantes futures. Distinct du payload,
     * qui appartient au schéma du template.
     */
    settings: jsonb('settings'),

    /**
     * Apparence de l'élément — schéma commun à tous les types, avec
     * surcharges par breakpoint : `{ base, tablet?, mobile? }`.
     * Nul = les défauts élégants du type (tokens ANASAWI).
     */
    styles: jsonb('styles'),

    /** Nom affiché dans le panneau Calques. Nul = libellé du type. */
    name: text('name'),

    type: text('type').notNull(),
    anchor: text('anchor'),
    navLabel: text('nav_label'),
    showInNav: boolean('show_in_nav').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    /**
     * Couleur de fond en hexadécimal.
     *
     * On ne stocke que le fond : la couleur du texte, celle du texte
     * secondaire et celle des filets en sont déduites au rendu
     * (`sectionTheme`). Stocker les deux permettrait d'enregistrer une
     * combinaison illisible — ici, c'est structurellement impossible.
     */
    backgroundColor: text('background_color').notNull().default('#fcfaf7'),
    payload: jsonb('payload').notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index('sections_page_order_idx').on(t.pageId, t.sortOrder),
    index('sections_parent_idx').on(t.parentId, t.columnIndex, t.sortOrder),
    foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: 'sections_parent_fk',
    }).onDelete('cascade'),
  ],
)

/* ════════════════════════════════════════════════════════════════════
   Métadonnées SEO — une ligne par page
   ════════════════════════════════════════════════════════════════════ */

export const seoMeta = pgTable(
  'seo_meta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    title: text('title'),
    description: text('description'),
    canonical: text('canonical'),
    ogMediaId: uuid('og_media_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    robotsIndex: boolean('robots_index').notNull().default(true),
    robotsFollow: boolean('robots_follow').notNull().default(true),
    keywords: text('keywords').array().notNull().default(sql`'{}'::text[]`),
    ...timestamps,
  },
  (t) => [uniqueIndex('seo_meta_page_idx').on(t.pageId)],
)

/* ════════════════════════════════════════════════════════════════════
   Accompagnements
   ════════════════════════════════════════════════════════════════════ */

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt').notNull().default(''),
    body: text('body').notNull().default(''),
    duration: text('duration'),
    mediaId: uuid('media_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('services_slug_idx').on(t.slug),
    index('services_order_idx').on(t.sortOrder),
  ],
)

/* ════════════════════════════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════════════════════════════ */

export const faqItems = pgTable(
  'faq_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: text('category'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('faq_order_idx').on(t.sortOrder)],
)

/* ════════════════════════════════════════════════════════════════════
   Réglages — singleton (une seule ligne, id = 'singleton')
   ════════════════════════════════════════════════════════════════════ */

export const settings = pgTable('settings', {
  id: text('id').primaryKey().default('singleton'),

  siteName: text('site_name').notNull().default('ANASAWI'),
  practitionerName: text('practitioner_name').notNull().default(''),
  practitionerTitle: text('practitioner_title'),
  tagline: text('tagline'),

  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  addressStreet: text('address_street'),
  addressPostalCode: text('address_postal_code'),
  addressCity: text('address_city'),
  addressCountry: text('address_country').default('FR'),
  latitude: text('latitude'),
  longitude: text('longitude'),

  openingHours: jsonb('opening_hours').notNull().default([]),
  practicalInfo: text('practical_info'),
  bookingUrl: text('booking_url'),
  socialLinks: jsonb('social_links').notNull().default([]),

  defaultSeoTitle: text('default_seo_title'),
  defaultSeoDescription: text('default_seo_description'),
  defaultOgMediaId: uuid('default_og_media_id').references(() => media.id, {
    onDelete: 'set null',
  }),

  /**
   * Menu du site, géré à la main : [{ label, href }] — pages, ancres de
   * sections ou liens externes. Null = dérivation automatique historique
   * (sections `showInNav` de l'accueil).
   */
  navigation: jsonb('navigation'),

  /**
   * Identité globale du site (tokens surchargés depuis l'admin) :
   * couleurs, typographie, boutons, respiration. Null = défauts de la
   * charte. Injectée en variables CSS — tous les templates la consomment.
   */
  identity: jsonb('identity'),

  ...timestamps,
})

/* ════════════════════════════════════════════════════════════════════
   Messages du formulaire de contact
   ════════════════════════════════════════════════════════════════════ */

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('contact_created_idx').on(t.createdAt)],
)

/* ════════════════════════════════════════════════════════════════════
   Relations
   ════════════════════════════════════════════════════════════════════ */

export const pagesRelations = relations(pages, ({ many, one }) => ({
  sections: many(sections),
  seo: one(seoMeta, { fields: [pages.id], references: [seoMeta.pageId] }),
}))

export const sectionsRelations = relations(sections, ({ one }) => ({
  page: one(pages, { fields: [sections.pageId], references: [pages.id] }),
}))

export const seoMetaRelations = relations(seoMeta, ({ one }) => ({
  page: one(pages, { fields: [seoMeta.pageId], references: [pages.id] }),
  ogMedia: one(media, { fields: [seoMeta.ogMediaId], references: [media.id] }),
}))

export const servicesRelations = relations(services, ({ one }) => ({
  media: one(media, { fields: [services.mediaId], references: [media.id] }),
}))

/* ════════════════════════════════════════════════════════════════════
   Types inférés
   ════════════════════════════════════════════════════════════════════ */

export type User = typeof users.$inferSelect
export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
/**
 * « Mes sections » — une section personnalisée enregistrée comme modèle
 * personnel, réutilisable sur n'importe quelle page depuis la
 * bibliothèque de templates.
 */
export const savedSections = pgTable('saved_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  backgroundColor: text('background_color').notNull().default('#fcfaf7'),
  payload: jsonb('payload').notNull(),
  settings: jsonb('settings'),
  ...timestamps,
})

export type SavedSection = typeof savedSections.$inferSelect

export type Page = typeof pages.$inferSelect
export type Section = typeof sections.$inferSelect
export type SeoMeta = typeof seoMeta.$inferSelect
export type Service = typeof services.$inferSelect
export type FaqItem = typeof faqItems.$inferSelect
export type Settings = typeof settings.$inferSelect
export type ContactMessage = typeof contactMessages.$inferSelect

export type ServiceWithMedia = Service & { media: Media | null }
export type OpeningHour = { day: string; hours: string }
export type SocialLink = { label: string; url: string }
