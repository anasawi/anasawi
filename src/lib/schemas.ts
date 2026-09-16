import { z } from 'zod'

import { RESERVED_SLUGS } from './utils'

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
  .min(1, 'Le slug est requis.')
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Minuscules, chiffres et tirets uniquement.',
  )
  .refine((s) => !RESERVED_SLUGS.has(s), {
    message: 'Ce slug est réservé par l’application.',
  })

export const serviceFormSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis.').max(160),
  slug: slugSchema,
  excerpt: z.string().trim().max(600).default(''),
  body: z.string().trim().max(8000).default(''),
  duration: z.string().trim().max(80).nullable().default(null),
  mediaId: z.string().uuid().nullable().default(null),
  isActive: z.boolean().default(true),
})

export const faqFormSchema = z.object({
  question: z.string().trim().min(1, 'La question est requise.').max(300),
  answer: z.string().trim().min(1, 'La réponse est requise.').max(4000),
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
  siteName: z.string().trim().min(1).max(120),
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

  defaultSeoTitle: z.string().trim().max(120).nullable().default(null),
  defaultSeoDescription: z.string().trim().max(320).nullable().default(null),
  defaultOgMediaId: z.string().uuid().nullable().default(null),
})

export const mediaFormSchema = z.object({
  alt: z
    .string()
    .trim()
    .min(1, 'Le texte alternatif est obligatoire : il conditionne l’accessibilité et le SEO.')
    .max(300),
  caption: z.string().trim().max(300).nullable().default(null),
})
