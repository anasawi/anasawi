import { z } from 'zod'


/** Validation partagée entre le formulaire client et la route API. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Merci d’indiquer votre nom.').max(120),
  email: z.string().trim().email('Adresse e-mail invalide.').max(180),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(20, 'Merci de détailler un peu votre demande (20 caractères minimum).')
    .max(4000),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Merci d’accepter le traitement de vos données.' }),
  }),
  /** Champ piège — toujours vide pour un humain. Volontairement sans
      contrainte de longueur : un robot qui le remplit doit PASSER la
      validation pour atteindre la branche « répondre 200 sans enregistrer »
      de la route (`/api/contact`). Une erreur 400 lui apprendrait à vider
      le champ. */
  website: z.string().optional(),
})

export type ContactInput = z.infer<typeof contactSchema>

export const loginSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
})

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'Indiquez une adresse de page.')
  .max(80, 'L’adresse de la page est trop longue (80 caractères maximum).')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Une adresse de page ne contient que des lettres minuscules, des chiffres et des tirets.',
  )

export const serviceFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Donnez un titre à cet accompagnement.')
    .max(160, 'Le titre est trop long (160 caractères maximum).'),
  slug: slugSchema,
  excerpt: z.string().trim().max(600, 'La description courte est trop longue (600 caractères maximum).').default(''),
  body: z.string().trim().max(8000, 'Le texte est trop long (8 000 caractères maximum).').default(''),
  duration: z.string().trim().max(80).nullable().default(null),
  /* Famille d'appartenance et mention de méthode : nulles par défaut, le
     regroupement ne s'impose donc jamais. */
  groupId: z.string().uuid().nullable().default(null),
  method: z.string().trim().max(120).nullable().default(null),
  mediaId: z.string().uuid().nullable().default(null),
  isActive: z.boolean().default(true),
})

export const faqFormSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Écrivez la question.')
    .max(300, 'La question est trop longue (300 caractères maximum).'),
  answer: z
    .string()
    .trim()
    .min(1, 'Écrivez la réponse.')
    .max(4000, 'La réponse est trop longue (4 000 caractères maximum).'),
  category: z.string().trim().max(80).nullable().default(null),
  isActive: z.boolean().default(true),
})

export const seoFormSchema = z.object({
  title: z.string().trim().max(120).nullable().default(null),
  description: z.string().trim().max(320).nullable().default(null),
  canonical: z
    .string()
    .trim()
    .url('URL invalide.')
    .nullable()
    .or(z.literal(''))
    .default(null),
  ogMediaId: z.string().uuid().nullable().default(null),
  robotsIndex: z.boolean().default(true),
  robotsFollow: z.boolean().default(true),
  keywords: z.array(z.string().trim().min(1)).default([]),
})

export const settingsFormSchema = z.object({
  siteName: z.string().trim().min(1, 'Indiquez le nom du site.').max(120, 'Le nom du site est trop long (120 caractères maximum).'),
  practitionerName: z.string().trim().max(160).default(''),
  practitionerTitle: z.string().trim().max(160).nullable().default(null),
  tagline: z.string().trim().max(300).nullable().default(null),

  contactEmail: z
    .string()
    .trim()
    .email('Adresse e-mail invalide.')
    .nullable()
    .or(z.literal(''))
    .default(null),
  contactPhone: z.string().trim().max(40).nullable().default(null),
  addressStreet: z.string().trim().max(200).nullable().default(null),
  addressPostalCode: z.string().trim().max(20).nullable().default(null),
  addressCity: z.string().trim().max(120).nullable().default(null),
  addressCountry: z.string().trim().max(2).nullable().default('FR'),
  latitude: z.string().trim().max(32).nullable().default(null),
  longitude: z.string().trim().max(32).nullable().default(null),

  openingHours: z
    .array(z.object({ day: z.string().trim(), hours: z.string().trim() }))
    .default([]),
  practicalInfo: z.string().trim().max(4000).nullable().default(null),
  bookingUrl: z
    .string()
    .trim()
    .url('URL invalide.')
    .nullable()
    .or(z.literal(''))
    .default(null),
  socialLinks: z
    .array(z.object({ label: z.string().trim(), url: z.string().trim().url() }))
    .default([]),

  /* Le référencement se règle dans son onglet (voir `updateSeo`, qui
     tient ces valeurs à jour) : absents ici, ces champs ne sont pas
     touchés. */
  defaultSeoTitle: z.string().trim().max(120).nullable().optional(),
  defaultSeoDescription: z.string().trim().max(320).nullable().optional(),
  logoMediaId: z.string().uuid().nullable().default(null),
  defaultOgMediaId: z.string().uuid().nullable().optional(),
})

export const mediaFormSchema = z.object({
  alt: z
    .string()
    .trim()
    .min(1, 'Décrivez l’image en quelques mots : cette description est lue par Google et par les personnes malvoyantes.')
    .max(300, 'La description est trop longue (300 caractères maximum).'),
  caption: z.string().trim().max(300).nullable().default(null),
})
