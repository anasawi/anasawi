import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import { enLignes, Surtitre } from '@/components/anasawi/sections'
import { Carnet, Eventail, Fente, Lampe, LettresVivantes, Orbite, Puzzle, Ruban } from '@/components/anasawi/exception'
import {
  Bulles,
  Boussole,
  GrandAppel,
  Horloge,
  Index,
  JeuDeCartes,
  Lames,
  MachineAEcrire,
  MotFenetre,
  MotQuiChange,
  Odometre,
  Pellicule,
  Polaroids,
  Projecteur,
  Retourne,
  Voyage,
} from '@/components/anasawi/exception2'
import { Lignes, Revele } from '@/components/anasawi/vivant'
import type { Contenu } from './contenu'
import type { Media } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION — vingt-quatre sections (trois par catégorie) dont le mouvement est l'idée
 * même : lettres qui respirent sous la souris, phrase qui s'ouvre en
 * photo, lampe qui rend les couleurs, éventail, orbite, ruban, carnet
 * qu'on feuillette, puzzle qui se rassemble. Vitrine : /moderne/exception.
 *
 * Comme les autres blocs modernes : préremplis avec le contenu réel,
 * tout modifiable dans l'éditeur.
 */

const t = z.string().default('')
const media = z.string().nullable().default(null)
const commun = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }
const TITRE = 'Une ligne par retour à la ligne ; le mot clé entre *astérisques*.'
const SECTION = 'py-24 md:py-32'
const CONTENEUR = 'mx-auto max-w-[1200px] px-[5vw]'

/* ── 1. Lettres vivantes ──────────────────────────────────────────────── */

const lettresSchema = z.object({ surtitre: t, titre: t, texte: t })
export const mExLettresBlock: BlockDefinition<typeof lettresSchema> = {
  ...commun,
  label: 'Exception — Lettres vivantes',
  description: 'Un très grand titre : les lettres arrivent en cascade, puis se soulèvent et s’épaississent sous la souris.',
  schema: lettresSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: 'Le mot clé entre *astérisques*.' }),
    field.textarea('texte', 'Texte'),
  ],
  defaults: { surtitre: 'Une conviction', titre: 'Ici, on prend *le temps*', texte: '' },
  preremplir: (c) => ({ surtitre: 'Une conviction', titre: 'Ici, on prend *le temps*', texte: c.accroche }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <section className={SECTION}>
        <div className={CONTENEUR}>
          {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
          <LettresVivantes texte={data.titre || 'Ici, on prend *le temps*'} className="text-[clamp(52px,11vw,176px)] tracking-[-0.035em]" />
          {data.texte && (
            <Revele delai={0.5}>
              <p className="mt-10 max-w-[48ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
            </Revele>
          )}
        </div>
      </section>
    </Enveloppe>
  ),
}

/* ── 2. La fente ─────────────────────────────────────────────────────── */

const fenteSchema = z.object({ haut: t, bas: t, legende: t, mediaId: media })
export const mExFenteBlock: BlockDefinition<typeof fenteSchema> = {
  ...commun,
  label: 'Exception — La fente',
  description: 'Une phrase coupée par un trait de lumière ; en descendant, elle s’écarte et s’ouvre sur une photo plein écran.',
  schema: fenteSchema,
  fields: [
    field.text('haut', 'Moitié du haut', { help: 'Le mot clé entre *astérisques*.' }),
    field.text('bas', 'Moitié du bas'),
    field.text('legende', 'Légende, dans la photo'),
    field.media('mediaId', 'Photo'),
  ],
  defaults: { haut: 'Entrez,', bas: '*prenez place*', legende: '', mediaId: null },
  preremplir: (c) => ({ haut: 'Entrez,', bas: '*prenez place*', legende: c.accroche, mediaId: c.ambiance?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.ambiance
    return (
      <Enveloppe ctx={ctx}>
        <Fente haut={data.haut} bas={data.bas} legende={data.legende} photo={photo} />
      </Enveloppe>
    )
  },
}

/* ── 3. La lampe ─────────────────────────────────────────────────────── */

const lampeSchema = z.object({ surtitre: t, titre: t, texte: t, mediaId: media })
export const mExLampeBlock: BlockDefinition<typeof lampeSchema> = {
  ...commun,
  label: 'Exception — La lampe',
  description: 'Une photo en noir et blanc ; la souris y promène une lumière qui lui rend ses couleurs.',
  schema: lampeSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre, sur la photo', { help: 'Le mot clé entre *astérisques*.' }),
    field.textarea('texte', 'Texte, sur la photo'),
    field.media('mediaId', 'Photo'),
  ],
  defaults: { surtitre: 'Le cabinet', titre: 'Regardez *de plus près*', texte: '', mediaId: null },
  preremplir: (c) => ({
    surtitre: 'Le cabinet',
    titre: 'Regardez *de plus près*',
    texte: 'Un lieu calme et lumineux, à l’écart du bruit. Promenez la lumière.',
    mediaId: (c.photos.find((p) => p.id !== c.portrait?.id) ?? c.ambiance)?.id ?? null,
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.ambiance
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <Revele className="mt-4">
              <Lampe photo={photo} titre={data.titre} texte={data.texte} />
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── 4. L'éventail ───────────────────────────────────────────────────── */

const eventailSchema = z.object({ surtitre: t, titre: t, photos: z.array(z.string()).default([]) })
export const mExEventailBlock: BlockDefinition<typeof eventailSchema> = {
  ...commun,
  label: 'Exception — L’éventail',
  description: 'Les photos empilées comme un jeu de cartes s’ouvrent en éventail au défilement ; survolée, une carte se lève.',
  schema: eventailSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.mediaList('photos', 'Photos', { help: 'Jusqu’à sept, de gauche à droite.' }),
  ],
  defaults: { surtitre: 'En images', titre: 'Le cabinet, *pièce par pièce*', photos: [] },
  preremplir: (c) => ({
    surtitre: 'En images',
    titre: 'Le cabinet, *pièce par pièce*',
    photos: c.photos.filter((p) => !/substitution/i.test(p.alt)).slice(0, 7).map((p) => p.id),
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = data.photos.map((id) => ctx.resolveMedia(id)).filter((m): m is Media => Boolean(m))
    const photos = choisies.length ? choisies : c.photos.slice(0, 7)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-32">
          <div className={CONTENEUR}>
            <div className="mb-14 text-center">
              {data.surtitre && (
                <div className="flex justify-center">
                  <Surtitre>{data.surtitre}</Surtitre>
                </div>
              )}
              <h2 className="text-[clamp(34px,5vw,64px)]">
                <Lignes lignes={enLignes(data.titre)} />
              </h2>
            </div>
            <Eventail photos={photos} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── 5. L'orbite ─────────────────────────────────────────────────────── */

const orbiteSchema = z.object({ surtitre: t, titre: t, bouton: t, mediaId: media })
export const mExOrbiteBlock: BlockDefinition<typeof orbiteSchema> = {
  ...commun,
  label: 'Exception — L’orbite',
  description: 'Vos accompagnements tournent lentement autour de votre portrait ; survolé, l’un d’eux vient au centre.',
  schema: orbiteSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.text('bouton', 'Lien sous la description'),
    field.media('mediaId', 'Photo du centre'),
  ],
  defaults: { surtitre: 'Accompagnements', titre: 'Autour de *vous*', bouton: 'Prendre rendez-vous', mediaId: null },
  preremplir: (c) => ({ surtitre: 'Accompagnements', titre: 'Autour de *vous*', bouton: 'Prendre rendez-vous', mediaId: c.portrait?.id ?? null }),
  dataSource: { label: 'Les accompagnements', href: '/admin/accompagnements' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const centre = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.portrait
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-32">
          <div className={CONTENEUR}>
            <div className="mb-12 text-center">
              {data.surtitre && (
                <div className="flex justify-center">
                  <Surtitre>{data.surtitre}</Surtitre>
                </div>
              )}
              <h2 className="text-[clamp(34px,5vw,64px)]">
                <Lignes lignes={enLignes(data.titre)} />
              </h2>
            </div>
            <Orbite services={c.services} portrait={centre} rdv={c.rdv} bouton={data.bouton || 'Prendre rendez-vous'} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── 6. Le ruban ─────────────────────────────────────────────────────── */

const rubanSchema = z.object({ ruban: t, phrase: t, auteur: t })
export const mExRubanBlock: BlockDefinition<typeof rubanSchema> = {
  ...commun,
  label: 'Exception — Le ruban',
  description: 'Une phrase écrite en cercle, deux anneaux qui tournent en sens contraire au défilement, la conviction au centre.',
  schema: rubanSchema,
  fields: [
    field.text('ruban', 'Texte de l’anneau'),
    field.textarea('phrase', 'Phrase du centre', { help: 'Le mot clé entre *astérisques*.' }),
    field.text('auteur', 'Signature'),
  ],
  defaults: { ruban: 'Écouter · Accueillir · Traverser', phrase: '', auteur: '' },
  preremplir: (c) => ({ ruban: 'Écouter · Accueillir · Traverser', phrase: c.citation.texte, auteur: c.citation.auteur }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-20 md:py-28">
          <Ruban ruban={data.ruban || 'Écouter · Accueillir · Traverser'} phrase={data.phrase || c.citation.texte} auteur={data.auteur} />
        </section>
      </Enveloppe>
    )
  },
}

/* ── 7. Le carnet ────────────────────────────────────────────────────── */

const carnetSchema = z.object({ titre: t, etapes: z.array(z.object({ titre: t, texte: t })).default([]) })
export const mExCarnetBlock: BlockDefinition<typeof carnetSchema> = {
  ...commun,
  label: 'Exception — Le carnet',
  description: 'Vos étapes sont les pages d’un carnet : en descendant, on les tourne une à une, en trois dimensions.',
  schema: carnetSchema,
  fields: [
    field.textarea('titre', 'Titre', { help: 'Le mot clé entre *astérisques*.' }),
    field.list('etapes', 'Pages', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une page' }),
  ],
  defaults: { titre: 'Comment ça *se passe*', etapes: [] },
  preremplir: (c) => ({ titre: 'Comment ça *se passe*', etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const etapes = data.etapes.filter((e) => e.titre.trim())
    return (
      <Enveloppe ctx={ctx}>
        <Carnet etapes={etapes.length ? etapes : c.methode.etapes} titre={enLignes(data.titre)} />
      </Enveloppe>
    )
  },
}

/* ── 8. Le puzzle ────────────────────────────────────────────────────── */

const puzzleSchema = z.object({ surtitre: t, titre: t, texte: t, mediaId: media })
export const mExPuzzleBlock: BlockDefinition<typeof puzzleSchema> = {
  ...commun,
  label: 'Exception — Le puzzle',
  description: 'La photo arrive en morceaux éparpillés ; en descendant, ils se rassemblent et l’image se forme.',
  schema: puzzleSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('texte', 'Texte'),
    field.media('mediaId', 'Photo'),
  ],
  defaults: { surtitre: 'Se rassembler', titre: 'Remettre *les morceaux* ensemble', texte: '', mediaId: null },
  preremplir: (c) => ({
    surtitre: 'Se rassembler',
    titre: 'Remettre *les morceaux* ensemble',
    texte: 'Pièce après pièce, ce qui était épars retrouve sa place. Sans forcer, à votre rythme.',
    mediaId: c.ambiance?.id ?? null,
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.ambiance
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-32">
          <div className={CONTENEUR}>
            <div className="mb-14 grid items-end gap-6 lg:grid-cols-2">
              <div>
                {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
                <h2 className="text-[clamp(34px,5vw,64px)]">
                  <Lignes lignes={enLignes(data.titre)} />
                </h2>
              </div>
              {data.texte && (
                <Revele delai={0.2}>
                  <p className="max-w-[44ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)] lg:justify-self-end">{data.texte}</p>
                </Revele>
              )}
            </div>
            <Puzzle photo={photo} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   LA SUITE DE LA BIBLIOTHÈQUE — trois modèles d'exception par catégorie.
   ══════════════════════════════════════════════════════════════════════ */

/** En-tête commun : étiquette + titre en lignes, centré ou non. */
function Tete({ surtitre, titre, centre = false }: { surtitre: string; titre: string; centre?: boolean }) {
  return (
    <div className={centre ? 'mb-14 text-center' : 'mb-14'}>
      {surtitre && (centre ? <div className="flex justify-center"><Surtitre>{surtitre}</Surtitre></div> : <Surtitre>{surtitre}</Surtitre>)}
      <h2 className="text-[clamp(34px,5vw,64px)]">
        <Lignes lignes={enLignes(titre)} />
      </h2>
    </div>
  )
}
const photosDe = (ids: string[], resolve: (id: string) => Media | null) => ids.map(resolve).filter((m): m is Media => Boolean(m))
const sansSubstitution = (c: Contenu) => c.photos.filter((p) => !/substitution/i.test(p.alt))
const RDV_LIBELLE = 'Prendre rendez-vous'
/** Les accompagnements, chacun avec sa photo (la sienne, sinon une du cabinet). */
const servicesIllustres = (c: Contenu) => {
  const photos = sansSubstitution(c).filter((p) => p.id !== c.portrait?.id)
  return c.services.map((s, i) => ({ ...s, media: s.media ?? photos[i % Math.max(1, photos.length)] ?? null }))
}

/* ── Ouverture — Les lames ───────────────────────────────────────────── */

const lamesSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t, mediaId: media })
export const mExLamesBlock: BlockDefinition<typeof lamesSchema> = {
  ...commun,
  label: 'Exception — Les lames',
  description: 'La photo d’ouverture découpée en persiennes qui pivotent une à une pour la révéler ; sous la souris, les lames frémissent.',
  schema: lamesSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('intro', 'Introduction'),
    field.text('bouton', 'Bouton'),
    field.media('mediaId', 'Photo'),
  ],
  defaults: { surtitre: '', titre: '', intro: '', bouton: RDV_LIBELLE, mediaId: null },
  preremplir: (c) => ({ surtitre: c.ouverture.surtitre, titre: c.ouverture.titre, intro: c.ouverture.intro, bouton: RDV_LIBELLE, mediaId: c.ambiance?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.ambiance
    return (
      <Enveloppe ctx={ctx}>
        <Lames photo={photo}>
          {data.surtitre && <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/75">{data.surtitre}</p>}
          <h1 className="mt-3 max-w-[16ch] text-[clamp(44px,7.5vw,112px)] leading-[0.98] text-white [&_em]:text-[#bfe5e2]">
            {enLignes(data.titre || c.ouverture.titre).map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            {data.intro && <p className="max-w-[48ch] text-[17px] leading-[1.65] text-white/85">{data.intro}</p>}
            <a href={c.rdv} className="rounded-full bg-white px-6 py-3.5 text-[14px] font-semibold text-[var(--ad-nuit)] transition-transform hover:-translate-y-0.5">
              {data.bouton || RDV_LIBELLE}
            </a>
          </div>
        </Lames>
      </Enveloppe>
    )
  },
}

/* ── Ouverture — Le mot-fenêtre ──────────────────────────────────────── */

const motFenetreSchema = z.object({ mot: t, phrase: t, mediaId: media })
export const mExMotFenetreBlock: BlockDefinition<typeof motFenetreSchema> = {
  ...commun,
  label: 'Exception — Le mot-fenêtre',
  description: 'Un mot immense rempli par la photo ; en descendant, il grandit jusqu’à ce qu’on passe à travers et qu’on entre dans l’image.',
  schema: motFenetreSchema,
  fields: [field.text('mot', 'Le mot', { help: 'Court : un mot, deux au plus.' }), field.text('phrase', 'Phrase, une fois entré', { help: 'Le mot clé entre *astérisques*.' }), field.media('mediaId', 'Photo')],
  defaults: { mot: 'respirer', phrase: 'Bienvenue, *prenez votre temps*', mediaId: null },
  preremplir: (c) => ({ mot: 'respirer', phrase: c.accroche || 'Bienvenue, *prenez votre temps*', mediaId: c.ambiance?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.ambiance
    return (
      <Enveloppe ctx={ctx}>
        <MotFenetre mot={data.mot || 'respirer'} phrase={data.phrase} photo={photo} />
      </Enveloppe>
    )
  },
}

/* ── Qui je suis — Les polaroïds ─────────────────────────────────────── */

const polaroidsSchema = z.object({ surtitre: t, titre: t, texte: t, photos: z.array(z.string()).default([]) })
export const mExPolaroidsBlock: BlockDefinition<typeof polaroidsSchema> = {
  ...commun,
  label: 'Exception — Les polaroïds',
  description: 'Des photos tombent sur la table, un peu de travers ; on peut les attraper et les déplacer, au doigt comme à la souris.',
  schema: polaroidsSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('texte', 'Texte'),
    field.mediaList('photos', 'Photos', { help: 'Jusqu’à six. La légende de chaque photo s’écrit sous le cadre.' }),
  ],
  defaults: { surtitre: 'Qui je suis', titre: 'Quelques *instants*', texte: '', photos: [] },
  preremplir: (c) => ({
    surtitre: c.apropos.surtitre,
    titre: 'Quelques *instants*',
    texte: c.apropos.texte.split('\n')[0] ?? '',
    photos: [c.portrait, ...sansSubstitution(c).filter((p) => p.id !== c.portrait?.id)].filter((p): p is Media => Boolean(p)).slice(0, 6).map((p) => p.id),
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = photosDe(data.photos, ctx.resolveMedia)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-32">
          <div className={CONTENEUR}>
            <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
              <Tete surtitre={data.surtitre} titre={data.titre} />
              {data.texte && <p className="mb-14 max-w-[46ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)] lg:justify-self-end">{data.texte}</p>}
            </div>
            <Polaroids photos={choisies.length ? choisies : sansSubstitution(c).slice(0, 6)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Qui je suis — L'odomètre ────────────────────────────────────────── */

const odometreSchema = z.object({ surtitre: t, titre: t, chiffres: z.array(z.object({ valeur: t, libelle: t })).default([]) })
export const mExOdometreBlock: BlockDefinition<typeof odometreSchema> = {
  ...commun,
  label: 'Exception — L’odomètre',
  description: 'Vos chiffres clés : chaque chiffre roule comme un compteur mécanique avant de s’arrêter sur sa valeur.',
  schema: odometreSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.list('chiffres', 'Chiffres', [field.text('valeur', 'Valeur', { help: 'Ex. « 12 », « 50 min », « 7j/7 ».' }), field.text('libelle', 'Légende')], { addLabel: 'Ajouter un chiffre' }),
  ],
  defaults: { surtitre: 'En quelques chiffres', titre: 'Ce qui *compte*', chiffres: [] },
  preremplir: (c) => ({
    surtitre: 'En quelques chiffres',
    titre: 'Ce qui *compte*',
    chiffres: [
      { valeur: String(c.services.length), libelle: 'accompagnements' },
      { valeur: String(c.horaires.filter((h) => !/ferm/i.test(h.hours)).length), libelle: 'jours de consultation' },
      { valeur: String(c.faq.length), libelle: 'questions répondues' },
    ],
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const chiffres = data.chiffres.filter((x) => x.valeur.trim())
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Odometre chiffres={chiffres.length ? chiffres : [{ valeur: String(c.services.length), libelle: 'accompagnements' }]} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Ma méthode — Le voyage ──────────────────────────────────────────── */

const etapesSchema = z.object({ surtitre: t, titre: t, etapes: z.array(z.object({ titre: t, texte: t })).default([]) })
const champsEtapes = [
  field.text('surtitre', 'Étiquette'),
  field.textarea('titre', 'Titre', { help: TITRE }),
  field.list('etapes', 'Étapes', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' }),
]
export const mExVoyageBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — Le voyage',
  description: 'Sur grand écran, la page s’immobilise et le chemin se parcourt de côté : un trait se dessine et allume chaque étape.',
  schema: etapesSchema,
  fields: champsEtapes,
  defaults: { surtitre: 'Ma méthode', titre: 'Un chemin, *pas à pas*', etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: 'Un chemin, *pas à pas*', etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const etapes = data.etapes.filter((e) => e.titre.trim())
    return (
      <Enveloppe ctx={ctx}>
        <section className="pt-24 md:pt-32 lg:pb-0 pb-24">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
          </div>
          <div className="mx-auto max-w-[1200px] px-[5vw] lg:max-w-none lg:px-0">
            <Voyage etapes={etapes.length ? etapes : c.methode.etapes} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Ma méthode — Les cartes à retourner ─────────────────────────────── */

export const mExRetourneBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — Les cartes à retourner',
  description: 'Chaque étape est une carte : survolée ou touchée, elle se retourne en 3D et montre l’explication.',
  schema: etapesSchema,
  fields: champsEtapes,
  defaults: { surtitre: 'Ma méthode', titre: 'Retournez *les cartes*', etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: 'Retournez *les cartes*', etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const etapes = data.etapes.filter((e) => e.titre.trim())
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Retourne etapes={etapes.length ? etapes : c.methode.etapes} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Accompagnements — Le projecteur ─────────────────────────────────── */

const servicesSchema = z.object({ surtitre: t, titre: t, bouton: t })
const champsServices = [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE }), field.text('bouton', 'Bouton')]
const sourceServices = { label: 'Les accompagnements', href: '/admin/accompagnements' }
export const mExProjecteurBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — Le projecteur',
  description: 'Les accompagnements en très grand, en creux ; survolé, un nom se remplit de lumière et sa photo envahit le fond.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: 'Sous *la lumière*', bouton: RDV_LIBELLE },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: 'Sous *la lumière*', bouton: RDV_LIBELLE }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Projecteur services={servicesIllustres(c)} rdv={c.rdv} bouton={data.bouton || RDV_LIBELLE} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Accompagnements — Le jeu de cartes ──────────────────────────────── */

export const mExJeuBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — Le jeu de cartes',
  description: 'Une pile de cartes : on lance celle du dessus de côté (ou on clique les flèches) et la suivante se redresse.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: 'Tirez *une carte*', bouton: RDV_LIBELLE },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: 'Tirez *une carte*', bouton: RDV_LIBELLE }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-32">
          <div className={`${CONTENEUR} grid items-center gap-12 lg:grid-cols-2`}>
            <div>
              <Tete surtitre={data.surtitre} titre={data.titre} />
              <p className="-mt-6 max-w-[40ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)]">
                Faites glisser la carte du dessus, ou utilisez les flèches. {c.services.length} accompagnements à découvrir.
              </p>
            </div>
            <JeuDeCartes services={servicesIllustres(c)} rdv={c.rdv} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Questions — Les bulles, la machine à écrire, l'index ────────────── */

const faqSchema = z.object({ surtitre: t, titre: t })
const champsFaq = [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE })]
const sourceFaq = { label: 'Les questions', href: '/admin/questions' }

export const mExBullesBlock: BlockDefinition<typeof faqSchema> = {
  ...commun,
  label: 'Exception — Les bulles',
  description: 'Les questions flottent doucement, chacune à son rythme ; on en attrape une, elle grandit et sa réponse s’ouvre.',
  schema: faqSchema,
  fields: champsFaq,
  defaults: { surtitre: 'Questions', titre: 'Ce qu’on *se demande*' },
  preremplir: () => ({ surtitre: 'Questions', titre: 'Ce qu’on *se demande*' }),
  dataSource: sourceFaq,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            <Bulles faq={c.faq} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExMachineBlock: BlockDefinition<typeof faqSchema> = {
  ...commun,
  label: 'Exception — La machine à écrire',
  description: 'La question se tape lettre à lettre avec son curseur, puis la réponse apparaît ; elles défilent seules.',
  schema: faqSchema,
  fields: champsFaq,
  defaults: { surtitre: 'Vous vous demandez peut-être', titre: '' },
  preremplir: () => ({ surtitre: 'Vous vous demandez peut-être', titre: '' }),
  dataSource: sourceFaq,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-28 md:py-40">
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            {data.titre && (
              <h2 className="mb-10 text-[clamp(28px,3.5vw,44px)]">
                <Lignes lignes={enLignes(data.titre)} />
              </h2>
            )}
            <MachineAEcrire faq={c.faq} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExIndexBlock: BlockDefinition<typeof faqSchema> = {
  ...commun,
  label: 'Exception — L’index',
  description: 'Les questions numérotées ; la réponse se dévoile à côté, derrière un grand numéro en creux. En accordéon sur téléphone.',
  schema: faqSchema,
  fields: champsFaq,
  defaults: { surtitre: 'Questions', titre: 'Tout ce qu’il faut *savoir*' },
  preremplir: () => ({ surtitre: 'Questions', titre: 'Tout ce qu’il faut *savoir*' }),
  dataSource: sourceFaq,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Index faq={c.faq} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Photos — La pellicule ───────────────────────────────────────────── */

const pelliculeSchema = z.object({ surtitre: t, titre: t, photos: z.array(z.string()).default([]) })
export const mExPelliculeBlock: BlockDefinition<typeof pelliculeSchema> = {
  ...commun,
  label: 'Exception — La pellicule',
  description: 'Deux bandes de film perforées défilent en sens contraire, de biais ; survolées, elles s’arrêtent et la photo s’avance.',
  schema: pelliculeSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE }), field.mediaList('photos', 'Photos')],
  defaults: { surtitre: 'En images', titre: 'Le cabinet, *en mouvement*', photos: [] },
  preremplir: (c) => ({ surtitre: 'En images', titre: 'Le cabinet, *en mouvement*', photos: sansSubstitution(c).slice(0, 10).map((p) => p.id) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = photosDe(data.photos, ctx.resolveMedia)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-32">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
          </div>
          <Pellicule photos={choisies.length ? choisies : sansSubstitution(c).slice(0, 10)} />
        </section>
      </Enveloppe>
    )
  },
}

/* ── Textes — Le mot qui change ──────────────────────────────────────── */

const motSchema = z.object({ surtitre: t, debut: t, mots: t, texte: t })
export const mExMotChangeBlock: BlockDefinition<typeof motSchema> = {
  ...commun,
  label: 'Exception — Le mot qui change',
  description: '« Un lieu pour… » : le dernier mot change toutes les deux secondes, glisse, se floute, et la phrase s’ajuste.',
  schema: motSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.text('debut', 'Début de la phrase'),
    field.textarea('mots', 'Mots qui changent', { help: 'Un mot (ou deux) par ligne.' }),
    field.textarea('texte', 'Texte dessous'),
  ],
  defaults: { surtitre: '', debut: 'Un lieu pour', mots: 'respirer\ndéposer\ncomprendre\navancer', texte: '' },
  preremplir: (c) => ({ surtitre: '', debut: 'Un lieu pour', mots: 'respirer\ndéposer\ncomprendre\navancer', texte: c.accroche }),
  Component: ({ data, ctx }) => {
    const mots = data.mots.split('\n').map((m) => m.trim()).filter(Boolean)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-28 md:py-40">
          <div className={CONTENEUR}>
            {data.surtitre && (
              <div className="flex justify-center">
                <Surtitre>{data.surtitre}</Surtitre>
              </div>
            )}
            <MotQuiChange debut={data.debut || 'Un lieu pour'} mots={mots.length ? mots : ['respirer']} />
            {data.texte && (
              <Revele delai={0.3}>
                <p className="mx-auto mt-10 max-w-[48ch] text-center text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
              </Revele>
            )}
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ── Contact — La boussole, l'horloge, le grand appel ────────────────── */

const contactSchema = z.object({ surtitre: t, titre: t })
export const mExBoussoleBlock: BlockDefinition<typeof contactSchema> = {
  ...commun,
  label: 'Exception — La boussole',
  description: 'Une boussole dont l’aiguille suit la souris (au repos, elle cherche le nord) ; à côté, l’adresse et l’itinéraire.',
  schema: contactSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE })],
  defaults: { surtitre: 'Venir', titre: 'Trouver *son chemin*' },
  preremplir: () => ({ surtitre: 'Venir', titre: 'Trouver *son chemin*' }),
  dataSource: { label: 'Les coordonnées', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Boussole adresse={c.adresse} telephone={c.telephone} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExHorlogeBlock: BlockDefinition<typeof contactSchema> = {
  ...commun,
  label: 'Exception — L’horloge',
  description: 'Un cadran de 24 heures : les heures d’ouverture du jour en arc, l’aiguille à l’heure qu’il est, « ouvert maintenant » en clair.',
  schema: contactSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE })],
  defaults: { surtitre: 'Horaires', titre: 'Quand *venir*' },
  preremplir: () => ({ surtitre: 'Horaires', titre: 'Quand *venir*' }),
  dataSource: { label: 'Les horaires', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Horloge horaires={c.horaires} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const appelSchema = z.object({ titre: t, bouton: t })
export const mExAppelBlock: BlockDefinition<typeof appelSchema> = {
  ...commun,
  label: 'Exception — Le grand appel',
  description: 'Un immense bouton rond, attiré par la souris, cerclé d’un texte qui tourne et d’ondes qui partent de lui.',
  schema: appelSchema,
  fields: [field.text('titre', 'Mot en fond'), field.text('bouton', 'Texte du cercle')],
  defaults: { titre: 'Venez', bouton: RDV_LIBELLE },
  preremplir: () => ({ titre: 'Venez', bouton: RDV_LIBELLE }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-[1400px] px-[3vw]">
            <GrandAppel titre={data.titre || 'Venez'} libelle={data.bouton || RDV_LIBELLE} href={c.rdv} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/** Les modèles d'exception, par catégorie (l'ordre de la vitrine). */
export const EXCEPTION_PAR_CATEGORIE = [
  { categorie: 'Ouverture', types: ['mExFente', 'mExLames', 'mExMotFenetre'] },
  { categorie: 'Qui je suis', types: ['mExPuzzle', 'mExPolaroids', 'mExOdometre'] },
  { categorie: 'Ma méthode', types: ['mExCarnet', 'mExVoyage', 'mExRetourne'] },
  { categorie: 'Accompagnements', types: ['mExOrbite', 'mExProjecteur', 'mExJeu'] },
  { categorie: 'Questions', types: ['mExBulles', 'mExMachine', 'mExIndex'] },
  { categorie: 'Photos & vidéos', types: ['mExLampe', 'mExEventail', 'mExPellicule'] },
  { categorie: 'Textes', types: ['mExLettres', 'mExRuban', 'mExMotChange'] },
  { categorie: 'Contact & rendez-vous', types: ['mExBoussole', 'mExHorloge', 'mExAppel'] },
] as const

export const MODELES_EXCEPTION = EXCEPTION_PAR_CATEGORIE.flatMap((g) => g.types)
