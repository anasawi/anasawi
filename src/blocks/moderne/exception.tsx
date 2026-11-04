import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import { enLignes, Surtitre } from '@/components/anasawi/sections'
import { Carnet, Eventail, Fente, Lampe, LettresVivantes, Orbite, Puzzle, Ruban } from '@/components/anasawi/exception'
import { Lignes, Revele } from '@/components/anasawi/vivant'
import type { Media } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION — huit sections dont le mouvement est l'idée
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

/** L'ordre de la vitrine /moderne/exception. */
export const MODELES_EXCEPTION = [
  'mExLettres',
  'mExFente',
  'mExLampe',
  'mExEventail',
  'mExOrbite',
  'mExRuban',
  'mExCarnet',
  'mExPuzzle',
] as const
