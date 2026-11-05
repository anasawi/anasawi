import { z } from 'zod'

import { field } from '../field'
import type { BlockContext, BlockDefinition } from '../types'
import { construireContenu, type Contenu } from './contenu'
import { photosPromenade, TEXTES, textesDe } from './textes'
import {
  EnPratique,
  Horizon,
  Phrase,
  Rencontre,
  RendezVous,
  Respiration,
  SectionArches,
  SectionChemin,
  SectionConversation,
  SectionPromenade,
  SectionSeuil,
} from '@/components/anasawi/sections'
import { ModeEdition } from '@/components/anasawi/vivant'
import type { Media } from '@/server/db/schema'

/**
 * LES BLOCS DE LA VERSION MODERNE — le site dans sa nouvelle direction
 * artistique, en cours d'arbitrage avec le site classique.
 *
 * TOUT SE MODIFIE ICI. Chaque mot affiché par une section est un champ :
 * surtitres, titres, textes, boutons, pastilles, mentions. À la création
 * (ou à la première ouverture dans l'éditeur), les champs sont PRÉREMPLIS
 * avec le texte réellement affiché — tiré du contenu d'Anne (réglages,
 * textes du site classique) — voir `preremplir` et `textes.ts`. Un champ
 * qu'on vide retrouve cette valeur de départ.
 *
 * Les listes partagées (accompagnements, questions, coordonnées,
 * horaires) restent saisies une fois, dans leur écran : l'inspecteur y
 * renvoie (`dataSource`).
 *
 * Titres : une ligne par retour à la ligne ; le mot clé entre
 * astérisques (« Ce que je vous / *propose* »).
 *
 * Pour supprimer la version moderne après l'arbitrage : voir ARBITRAGE.md.
 */

/** Le contenu partagé, ou — hors du site moderne (bibliothèque de
    modèles…) — un contenu minimal tiré du contexte. */
export function contenuDe(ctx: BlockContext): Contenu {
  if (ctx.partage) return ctx.partage
  return construireContenu({
    settings: ctx.settings,
    services: ctx.services,
    faq: ctx.faqItems,
    media: [],
    dossiers: [],
    sections: [],
    categorieDe: () => undefined,
  })
}

export function Enveloppe({ ctx, children }: { ctx: BlockContext; children: React.ReactNode }) {
  return <ModeEdition actif={Boolean(ctx.editable)}>{children}</ModeEdition>
}

/** Aide commune des champs préremplis. */
export const SUIT = 'Prérempli avec le texte affiché sur le site.'
const TITRE = 'Une ligne par retour à la ligne ; le mot clé entre *astérisques*.'
const MENU = 'Libellé de cette section dans le menu du haut. Vide : absente du menu.'

const t = z.string().default('')
/** Posé par le préremplissage : dès lors, un champ vide est VOULU (pastille
    masquée, pas de citation…) et ne reprend plus sa valeur de départ. */
const rempli = z.boolean().default(false)
const media = z.string().nullable().default(null)
const commun = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }

/** Les champs de saisie d'un bloc, sans les valeurs de départ (le
    préremplissage s'en charge, avec le contenu réel). */
const vides = <S extends z.ZodObject<z.ZodRawShape>>(schema: S) => schema.parse({}) as z.input<S>

/* ── Le seuil ─────────────────────────────────────────────────────────── */

const seuilSchema = z.object({ rempli,
  surtitre: t,
  nom: t,
  intro: t,
  accroche: t,
  mediaId: media,
  pastille2: t,
  pastille3: t,
  bouton: t,
  bouton2: t,
  invitation: t,
})
export const mSeuilBlock: BlockDefinition<typeof seuilSchema> = {
  ...commun,
  label: 'Moderne — Le seuil',
  description: 'L’accueil : votre nom, quelques mots, et la porte du cabinet qui s’ouvre — avec une tasse dont la vapeur monte.',
  schema: seuilSchema,
  fields: [
    field.text('surtitre', 'Étiquette au-dessus du nom', { help: SUIT }),
    field.text('nom', 'Nom', { help: 'Le premier mot en noir, la suite en accent.' }),
    field.textarea('intro', 'Présentation (sous le nom)'),
    field.media('mediaId', 'Photo de la porte'),
    field.text('pastille2', 'Pastille du haut', { help: 'Vide : pastille masquée.' }),
    field.text('pastille3', 'Pastille du bas', { help: 'Vide : pastille masquée.' }),
    field.text('bouton', 'Bouton principal'),
    field.text('bouton2', 'Bouton secondaire'),
    field.text('invitation', 'Invitation à défiler'),
  ],
  defaults: vides(seuilSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mSeuil(c), mediaId: (c.ambiance ?? c.portrait)?.id ?? null }),
  dataSource: { label: 'Le métier, la ville et les horaires (pastille « ouvert aujourd’hui »)', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const base = contenuDe(ctx)
    const photo = data.mediaId ? ctx.resolveMedia(data.mediaId) : null
    const c: Contenu = { ...base, ambiance: photo ?? base.ambiance }
    return (
      <Enveloppe ctx={ctx}>
        <SectionSeuil c={c} t={textesDe('mSeuil', base, data)} />
      </Enveloppe>
    )
  },
}

/* ── Respiration ──────────────────────────────────────────────────────── */

const respirationSchema = z.object({ rempli, surtitre: t, titre: t, texte: t, bouton: t })
export const mRespirationBlock: BlockDefinition<typeof respirationSchema> = {
  ...commun,
  label: 'Moderne — Respiration',
  description: 'Un cercle qui respire, et un exercice guidé d’une minute.',
  schema: respirationSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('texte', 'Texte'),
    field.text('bouton', 'Bouton de l’exercice'),
  ],
  defaults: vides(respirationSchema),
  preremplir: () => ({ rempli: true, ...TEXTES.mRespiration() }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <Respiration t={textesDe('mRespiration', contenuDe(ctx), data)} />
    </Enveloppe>
  ),
}

/* ── Rencontre ────────────────────────────────────────────────────────── */

const rencontreSchema = z.object({ rempli,
  menu: t,
  surtitre: t,
  titre: t,
  texte: t,
  citation: t,
  anneau: t,
  mediaId: media,
})
export const mRencontreBlock: BlockDefinition<typeof rencontreSchema> = {
  ...commun,
  label: 'Moderne — Rencontre',
  description: 'Votre portrait dans sa porte, une petite porte sur le cabinet, votre présentation, la citation et votre signature.',
  schema: rencontreSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.richtext('texte', 'Présentation'),
    field.textarea('citation', 'Citation', { help: 'Vide : pas de citation.' }),
    field.media('mediaId', 'Portrait'),
    field.text('menu', 'Dans le menu', { help: MENU }),
  ],
  defaults: vides(rencontreSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mRencontre(c), mediaId: c.portrait?.id ?? null }),
  Component: ({ data, ctx }) => {
    const base = contenuDe(ctx)
    const portrait = data.mediaId ? ctx.resolveMedia(data.mediaId) : null
    return (
      <Enveloppe ctx={ctx}>
        <Rencontre c={{ ...base, portrait: portrait ?? base.portrait }} t={textesDe('mRencontre', base, data)} />
      </Enveloppe>
    )
  },
}

/* ── Chemin ───────────────────────────────────────────────────────────── */

const cheminSchema = z.object({ rempli,
  menu: t,
  surtitre: t,
  titre: t,
  intro: t,
  etapes: z.array(z.object({ titre: t, texte: t })).default([]),
})
export const mCheminBlock: BlockDefinition<typeof cheminSchema> = {
  ...commun,
  label: 'Moderne — Le chemin',
  description: 'Vos étapes reliées par un trait qui se dessine à la lecture.',
  schema: cheminSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('intro', 'Introduction'),
    field.list('etapes', 'Étapes', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' }),
    field.text('menu', 'Dans le menu', { help: MENU }),
  ],
  defaults: vides(cheminSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mChemin(c) }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <SectionChemin c={contenuDe(ctx)} t={textesDe('mChemin', contenuDe(ctx), data)} />
    </Enveloppe>
  ),
}

/* ── Arches (accompagnements) ─────────────────────────────────────────── */

const archesSchema = z.object({ rempli, menu: t, surtitre: t, titre: t, texte: t, bouton: t })
export const mArchesBlock: BlockDefinition<typeof archesSchema> = {
  ...commun,
  label: 'Moderne — Accompagnements',
  description: 'Une carte par accompagnement ; survolée, elle s’ouvre en fiche.',
  schema: archesSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('texte', 'Texte à droite du titre'),
    field.text('bouton', 'Lien de chaque fiche'),
    field.text('menu', 'Dans le menu', { help: MENU }),
  ],
  defaults: vides(archesSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mArches(c) }),
  dataSource: { label: 'Les accompagnements (titres, textes, durées, photos)', href: '/admin/accompagnements' },
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <SectionArches c={contenuDe(ctx)} t={textesDe('mArches', contenuDe(ctx), data)} />
    </Enveloppe>
  ),
}

/* ── En pratique ──────────────────────────────────────────────────────── */

const pratiqueSchema = z.object({ rempli,
  surtitre: t,
  titre: t,
  cabinet: t,
  itineraire: t,
  seances: t,
  visioTitre: t,
  visioTexte: t,
  consultations: t,
})
export const mEnPratiqueBlock: BlockDefinition<typeof pratiqueSchema> = {
  ...commun,
  label: 'Moderne — En pratique',
  description: 'Le plan, les séances, la visio, les jours : tout ce qu’on cherche avant d’appeler.',
  schema: pratiqueSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.text('cabinet', 'Carte : étiquette de l’adresse'),
    field.text('itineraire', 'Carte : lien d’itinéraire'),
    field.text('seances', 'Carte des séances : titre'),
    field.text('visioTitre', 'Carte visio : titre'),
    field.text('visioTexte', 'Carte visio : texte'),
    field.text('consultations', 'Carte des jours : titre'),
  ],
  defaults: vides(pratiqueSchema),
  preremplir: () => ({ rempli: true, ...TEXTES.mEnPratique() }),
  dataSource: { label: 'L’adresse, les horaires et les accompagnements', href: '/admin/reglages' },
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <EnPratique c={contenuDe(ctx)} t={textesDe('mEnPratique', contenuDe(ctx), data)} />
    </Enveloppe>
  ),
}

/* ── Phrase ───────────────────────────────────────────────────────────── */

const phraseSchema = z.object({ rempli, texte: t, auteur: t })
export const mPhraseBlock: BlockDefinition<typeof phraseSchema> = {
  ...commun,
  label: 'Moderne — Phrase',
  description: 'Une conviction, en très grand, qui s’allume mot à mot.',
  schema: phraseSchema,
  fields: [
    field.textarea('texte', 'La phrase', { help: 'Les mots entre *astérisques* sont en accent.' }),
    field.text('auteur', 'Signature'),
  ],
  defaults: vides(phraseSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mPhrase(c) }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <Phrase c={contenuDe(ctx)} t={textesDe('mPhrase', contenuDe(ctx), data)} />
    </Enveloppe>
  ),
}

/* ── Promenade ────────────────────────────────────────────────────────── */

const promenadeSchema = z.object({ rempli, menu: t, titre: t, legende: t, photos: z.array(z.string()).default([]) })
export const mPromenadeBlock: BlockDefinition<typeof promenadeSchema> = {
  ...commun,
  label: 'Moderne — Le cabinet',
  description: 'Les photos du cabinet dans des portes en arche qui défilent très lentement, et s’arrêtent au survol.',
  schema: promenadeSchema,
  fields: [
    field.text('titre', 'Titre', { help: 'Le mot clé entre *astérisques*.' }),
    field.textarea('legende', 'Phrase d’accueil (à côté du titre)'),
    field.mediaList('photos', 'Photos', { help: 'Huit au plus, dans l’ordre de la promenade. La légende de chaque photo s’affiche sous sa porte.' }),
    field.text('menu', 'Dans le menu', { help: MENU }),
  ],
  defaults: vides(promenadeSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mPromenade(), photos: photosPromenade(c).map((p) => p.id) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = data.photos.map((id) => ctx.resolveMedia(id)).filter((m): m is Media => Boolean(m))
    return (
      <Enveloppe ctx={ctx}>
        <SectionPromenade c={c} t={textesDe('mPromenade', c, data)} photos={choisies.length ? choisies : undefined} />
      </Enveloppe>
    )
  },
}

/* ── Conversation ─────────────────────────────────────────────────────── */

const conversationSchema = z.object({ rempli, menu: t, surtitre: t, titre: t, signature: t, suivante: t })
export const mConversationBlock: BlockDefinition<typeof conversationSchema> = {
  ...commun,
  label: 'Moderne — Questions',
  description: 'Vos questions fréquentes, comme une messagerie.',
  schema: conversationSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.text('signature', 'Signature sous la réponse'),
    field.text('suivante', 'Bouton « question suivante »'),
    field.text('menu', 'Dans le menu', { help: MENU }),
  ],
  defaults: vides(conversationSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mConversation(c) }),
  dataSource: { label: 'Les questions et leurs réponses', href: '/admin/faq' },
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <SectionConversation c={contenuDe(ctx)} t={textesDe('mConversation', contenuDe(ctx), data)} />
    </Enveloppe>
  ),
}

/* ── Rendez-vous ──────────────────────────────────────────────────────── */

const rdvSchema = z.object({ rempli,
  surtitre: t,
  titre: t,
  salutation: t,
  nom: t,
  telephone: t,
  email: t,
  message: t,
  consentement: t,
  signature: t,
  bouton: t,
  merciTitre: t,
  merciTexte: t,
})
export const mRendezVousBlock: BlockDefinition<typeof rdvSchema> = {
  ...commun,
  label: 'Moderne — Rendez-vous',
  description: 'La semaine allumée, vos coordonnées, et une lettre plutôt qu’un formulaire.',
  schema: rdvSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.text('salutation', 'Lettre : formule d’appel'),
    field.text('nom', 'Lettre : ligne du nom'),
    field.text('telephone', 'Lettre : ligne du téléphone'),
    field.text('email', 'Lettre : ligne de l’e-mail'),
    field.text('message', 'Lettre : début du message'),
    field.textarea('consentement', 'Lettre : case à cocher'),
    field.text('signature', 'Lettre : formule de fin'),
    field.text('bouton', 'Lettre : bouton d’envoi'),
    field.text('merciTitre', 'Après l’envoi : titre', { help: 'Le mot clé entre *astérisques*.' }),
    field.textarea('merciTexte', 'Après l’envoi : texte'),
  ],
  defaults: vides(rdvSchema),
  preremplir: (c) => ({ rempli: true, ...TEXTES.mRendezVous(c) }),
  dataSource: { label: 'Téléphone, e-mail, adresse et horaires', href: '/admin/reglages' },
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <RendezVous c={contenuDe(ctx)} t={textesDe('mRendezVous', contenuDe(ctx), data)} />
    </Enveloppe>
  ),
}

/* ── Pied de page ─────────────────────────────────────────────────────── */

const horizonSchema = z.object({ rempli, titre: t, bouton: t, mention: t })
export const mHorizonBlock: BlockDefinition<typeof horizonSchema> = {
  ...commun,
  label: 'Moderne — Pied de page',
  description: 'Le grand mot de la fin, le rendez-vous, vos coordonnées et le menu.',
  schema: horizonSchema,
  piedDePage: true,
  fields: [
    field.textarea('titre', 'Grand titre', { help: TITRE }),
    field.text('bouton', 'Bouton'),
    field.text('mention', 'Lien vers le site classique'),
  ],
  defaults: vides(horizonSchema),
  preremplir: () => ({ rempli: true, ...TEXTES.mHorizon() }),
  dataSource: { label: 'Téléphone, e-mail et logo', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <Horizon c={c} liens={c.menu ?? []} t={textesDe('mHorizon', c, data)} />
      </Enveloppe>
    )
  },
}

/** L'ordre de la page moderne quand on la crée. */
export const PAGE_MODERNE_PAR_DEFAUT = [
  'mSeuil',
  'mRespiration',
  'mRencontre',
  'mChemin',
  'mArches',
  'mEnPratique',
  'mPhrase',
  'mPromenade',
  'mConversation',
  'mRendezVous',
  'mHorizon',
] as const
