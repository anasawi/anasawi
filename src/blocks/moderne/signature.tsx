import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import type { Contenu } from './contenu'
import { Aube, Bulles, Chemin, Constellation, FilDeLumiere, Porte, PortraitOndes, Tambour, Volets } from '@/components/anasawi/signature'
import type { Media } from '@/server/db/schema'

/**
 * LA SÉRIE SIGNATURE — neuf sections plein écran (100 vh), chacune une
 * idée unique, en trois couleurs (lagon, abricot, lavande). Vitrine :
 * /moderne/signature. Préremplies avec le contenu réel, tout modifiable.
 */

const t = z.string().default('')
const media = z.string().nullable().default(null)
const commun = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }
const ACCENT = 'Le mot clé entre *astérisques*.'
const RDV = 'Prendre rendez-vous'
const sansSubstitution = (c: Contenu) => c.photos.filter((p) => !/substitution/i.test(p.alt))
const photoDe = (id: string | null, resolve: (id: string) => Media | null) => (id ? resolve(id) : null)
const servicesIllustres = (c: Contenu) => {
  const photos = sansSubstitution(c).filter((p) => p.id !== c.portrait?.id)
  return c.services.map((s, i) => ({ ...s, media: s.media ?? photos[i % Math.max(1, photos.length)] ?? null }))
}

const aubeSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t })
export const mSiAubeBlock: BlockDefinition<typeof aubeSchema> = {
  ...commun,
  label: 'Signature — L’aube',
  description: 'Plein écran. On arrive de nuit : un soleil se lève derrière le titre, le ciel s’éclaircit, les mots s’allument un à un.',
  schema: aubeSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: ACCENT }), field.textarea('intro', 'Introduction'), field.text('bouton', 'Bouton')],
  defaults: { surtitre: '', titre: 'Un espace pour *respirer*', intro: '', bouton: RDV },
  preremplir: (c) => ({ surtitre: c.ouverture.surtitre, titre: 'Un espace pour *respirer*', intro: c.ouverture.intro, bouton: RDV }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <Aube surtitre={data.surtitre} titre={data.titre || 'Un espace pour *respirer*'} intro={data.intro} bouton={data.bouton || RDV} rdv={c.rdv} />
      </Enveloppe>
    )
  },
}

const constellationSchema = z.object({ mot: t, phrase: t, auteur: t })
export const mSiConstellationBlock: BlockDefinition<typeof constellationSchema> = {
  ...commun,
  label: 'Signature — La constellation',
  description: 'Plein écran, de nuit. Des milliers de points de lumière se rassemblent pour écrire un mot ; la souris les écarte, un clic les disperse.',
  schema: constellationSchema,
  fields: [field.text('mot', 'Le mot', { help: 'Court : un mot.' }), field.textarea('phrase', 'Phrase dessous'), field.text('auteur', 'Signature')],
  defaults: { mot: 'Écoute', phrase: '', auteur: '' },
  preremplir: (c) => ({ mot: 'Écoute', phrase: c.citation.texte, auteur: c.citation.auteur }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <Constellation mot={data.mot || 'Écoute'} phrase={data.phrase} auteur={data.auteur} />
    </Enveloppe>
  ),
}

const portraitSchema = z.object({ surtitre: t, titre: t, texte: t, signature: t, mediaId: media })
export const mSiPortraitBlock: BlockDefinition<typeof portraitSchema> = {
  ...commun,
  label: 'Signature — Le portrait en ondes',
  description: 'Plein écran. Le portrait arrive en bandes qui glissent des deux côtés ; survolé, une onde le traverse comme la surface de l’eau.',
  schema: portraitSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: ACCENT }), field.textarea('texte', 'Texte'), field.text('signature', 'Signature'), field.media('mediaId', 'Portrait')],
  defaults: { surtitre: 'Qui je suis', titre: '', texte: '', signature: '', mediaId: null },
  preremplir: (c) => ({ surtitre: c.apropos.surtitre, titre: c.apropos.titre, texte: c.apropos.texte, signature: c.nom, mediaId: c.portrait?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <PortraitOndes portrait={photoDe(data.mediaId, ctx.resolveMedia) ?? c.portrait} surtitre={data.surtitre} titre={data.titre || c.apropos.titre} texte={data.texte} signature={data.signature} />
      </Enveloppe>
    )
  },
}

const cheminSchema = z.object({ etapes: z.array(z.object({ titre: t, texte: t })).default([]) })
export const mSiCheminBlock: BlockDefinition<typeof cheminSchema> = {
  ...commun,
  label: 'Signature — Le chemin',
  description: 'Plein écran. Un sentier serpente ; une petite lumière le parcourt seule, le trace derrière elle, et chaque étape s’ouvre à son passage.',
  schema: cheminSchema,
  fields: [field.list('etapes', 'Étapes', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' })],
  defaults: { etapes: [] },
  preremplir: (c) => ({ etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const e = data.etapes.filter((x) => x.titre.trim())
    return (
      <Enveloppe ctx={ctx}>
        <Chemin etapes={e.length ? e : c.methode.etapes} />
      </Enveloppe>
    )
  },
}

const videSchema = z.object({})
export const mSiBullesBlock: BlockDefinition<typeof videSchema> = {
  ...commun,
  label: 'Signature — Les bulles',
  description: 'Plein écran. Les accompagnements flottent en bulles irisées qui s’évitent et fuient la souris ; on en touche une, elle éclate et sa fiche apparaît.',
  schema: videSchema,
  fields: [],
  defaults: {},
  preremplir: () => ({}),
  dataSource: { label: 'Les accompagnements', href: '/admin/accompagnements' },
  Component: ({ ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <Bulles services={servicesIllustres(c)} rdv={c.rdv} />
      </Enveloppe>
    )
  },
}

const voletsSchema = z.object({ photos: z.array(z.string()).default([]) })
export const mSiVoletsBlock: BlockDefinition<typeof voletsSchema> = {
  ...commun,
  label: 'Signature — Les volets',
  description: 'Plein écran. Un diaporama : la photo avance doucement, puis trois volets de couleur balaient l’écran et découvrent la suivante.',
  schema: voletsSchema,
  fields: [field.mediaList('photos', 'Photos', { help: 'La légende de chaque photo s’affiche en bas.' })],
  defaults: { photos: [] },
  preremplir: (c) => ({ photos: sansSubstitution(c).slice(0, 8).map((p) => p.id) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = data.photos.map((id) => ctx.resolveMedia(id)).filter((m): m is Media => Boolean(m))
    return (
      <Enveloppe ctx={ctx}>
        <Volets photos={choisies.length ? choisies : sansSubstitution(c).slice(0, 8)} />
      </Enveloppe>
    )
  },
}

export const mSiTambourBlock: BlockDefinition<typeof videSchema> = {
  ...commun,
  label: 'Signature — Le tambour',
  description: 'Plein écran. Les questions sur un cylindre en 3D qui tourne comme une molette ; la question de face s’ouvre à côté, dans sa couleur.',
  schema: videSchema,
  fields: [],
  defaults: {},
  preremplir: () => ({}),
  dataSource: { label: 'Les questions', href: '/admin/questions' },
  Component: ({ ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <Tambour faq={c.faq} />
      </Enveloppe>
    )
  },
}

const porteSchema = z.object({ titre: t, mediaId: media })
export const mSiPorteBlock: BlockDefinition<typeof porteSchema> = {
  ...commun,
  label: 'Signature — La porte',
  description: 'Plein écran. Une porte en arche : survolée, elle s’entrouvre ; touchée, elle s’ouvre sur le cabinet, la lumière se répand et les coordonnées apparaissent.',
  schema: porteSchema,
  fields: [field.textarea('titre', 'Titre', { help: ACCENT }), field.media('mediaId', 'Photo derrière la porte')],
  defaults: { titre: 'Toquez, *c’est ouvert*', mediaId: null },
  preremplir: (c) => ({ titre: 'Toquez, *c’est ouvert*', mediaId: c.ambiance?.id ?? null }),
  dataSource: { label: 'Les coordonnées', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <Porte titre={data.titre || 'Toquez, *c’est ouvert*'} photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.ambiance} adresse={c.adresse} telephone={c.telephone} email={c.email} rdv={c.rdv} />
      </Enveloppe>
    )
  },
}

const filSchema = z.object({ titre: t, texte: t, bouton: t })
export const mSiFilBlock: BlockDefinition<typeof filSchema> = {
  ...commun,
  label: 'Signature — Le fil de lumière',
  description: 'Plein écran, de nuit. La souris laisse un ruban de lumière aux trois couleurs ; le bouton ouvre un cercle de couleur qui remplit l’écran.',
  schema: filSchema,
  fields: [field.textarea('titre', 'Titre', { help: ACCENT }), field.textarea('texte', 'Texte'), field.text('bouton', 'Bouton')],
  defaults: { titre: 'Et si on *commençait* ?', texte: '', bouton: RDV },
  preremplir: (c) => ({ titre: 'Et si on *commençait* ?', texte: c.accroche, bouton: RDV }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <FilDeLumiere titre={data.titre || 'Et si on *commençait* ?'} texte={data.texte} bouton={data.bouton || RDV} rdv={c.rdv} />
      </Enveloppe>
    )
  },
}

/** La série, dans l'ordre de la vitrine, avec sa catégorie de bibliothèque. */
export const SIGNATURE = [
  { type: 'mSiAube', categorie: 'Ouverture' },
  { type: 'mSiConstellation', categorie: 'Textes' },
  { type: 'mSiPortrait', categorie: 'Qui je suis' },
  { type: 'mSiChemin', categorie: 'Ma méthode' },
  { type: 'mSiBulles', categorie: 'Accompagnements' },
  { type: 'mSiVolets', categorie: 'Photos & vidéos' },
  { type: 'mSiTambour', categorie: 'Questions' },
  { type: 'mSiPorte', categorie: 'Contact & rendez-vous' },
  { type: 'mSiFil', categorie: 'Contact & rendez-vous' },
] as const

export const MODELES_SIGNATURE = SIGNATURE.map((x) => x.type)
