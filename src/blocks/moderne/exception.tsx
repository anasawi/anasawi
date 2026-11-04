import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import type { Contenu } from './contenu'
import {
  Adresse,
  Chapitres,
  Devoilement,
  Eventail,
  Fente,
  Fil,
  Frise,
  Horloge,
  Index,
  Invitation,
  Lames,
  Lampe,
  LettresVivantes,
  LignesServices,
  MachineAEcrire,
  MotPhoto,
  MotQuiChange,
  Odometre,
  Planche,
  Pli,
  Ruban,
  Sommaire,
  Volets,
  Voyage,
} from '@/components/anasawi/exception'
import { enLignes, Surtitre } from '@/components/anasawi/sections'
import { Lignes, Revele } from '@/components/anasawi/vivant'
import type { Media } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION — vingt-quatre sections, trois par catégorie de
 * la bibliothèque. Épurées : beaucoup d'air, des filets fins, et une seule
 * animation soignée par section. Vitrine : /moderne/exception.
 *
 * Comme les autres blocs modernes : préremplis avec le contenu réel,
 * tout modifiable dans l'éditeur.
 */

const t = z.string().default('')
const media = z.string().nullable().default(null)
const commun = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }
const TITRE = 'Une ligne par retour à la ligne ; le mot clé entre *astérisques*.'
const SECTION = 'py-24 md:py-36'
const CONTENEUR = 'mx-auto max-w-[1200px] px-[5vw]'
const RDV = 'Prendre rendez-vous'

/** En-tête commun : étiquette + titre en lignes (+ texte), centré ou non. */
function Tete({ surtitre, titre, texte, centre = false }: { surtitre: string; titre: string; texte?: string; centre?: boolean }) {
  return (
    <div className={centre ? 'mx-auto mb-16 max-w-[760px] text-center' : 'mb-16 grid gap-6 lg:grid-cols-2 lg:items-end'}>
      <div>
        {surtitre && (centre ? <div className="flex justify-center"><Surtitre>{surtitre}</Surtitre></div> : <Surtitre>{surtitre}</Surtitre>)}
        {titre && (
          <h2 className="text-[clamp(34px,4.6vw,60px)]">
            <Lignes lignes={enLignes(titre)} />
          </h2>
        )}
      </div>
      {texte && (
        <Revele delai={0.2}>
          <p className={centre ? 'mt-6 text-[16.5px] leading-[1.7] text-[var(--ad-pierre)]' : 'max-w-[44ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)] lg:justify-self-end'}>{texte}</p>
        </Revele>
      )}
    </div>
  )
}
const photoDe = (id: string | null, resolve: (id: string) => Media | null) => (id ? resolve(id) : null)
const photosDe = (ids: string[], resolve: (id: string) => Media | null) => ids.map(resolve).filter((m): m is Media => Boolean(m))
const sansSubstitution = (c: Contenu) => c.photos.filter((p) => !/substitution/i.test(p.alt))
/** Les accompagnements, chacun avec sa photo (la sienne, sinon une du cabinet). */
const servicesIllustres = (c: Contenu) => {
  const photos = sansSubstitution(c).filter((p) => p.id !== c.portrait?.id)
  return c.services.map((s, i) => ({ ...s, media: s.media ?? photos[i % Math.max(1, photos.length)] ?? null }))
}

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

const fenteSchema = z.object({ haut: t, bas: t, legende: t, mediaId: media })
export const mExFenteBlock: BlockDefinition<typeof fenteSchema> = {
  ...commun,
  label: 'Exception — La fente',
  description: 'Une phrase coupée par un trait fin ; en descendant, elle s’écarte et s’ouvre sur une photo plein écran.',
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
    return (
      <Enveloppe ctx={ctx}>
        <Fente haut={data.haut} bas={data.bas} legende={data.legende} photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.ambiance} />
      </Enveloppe>
    )
  },
}

const lamesSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t, mediaId: media })
export const mExLamesBlock: BlockDefinition<typeof lamesSchema> = {
  ...commun,
  label: 'Exception — Les lames',
  description: 'La photo d’ouverture arrive en six bandes qui montent l’une après l’autre ; le texte se pose ensuite.',
  schema: lamesSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('intro', 'Introduction'),
    field.text('bouton', 'Bouton'),
    field.media('mediaId', 'Photo'),
  ],
  defaults: { surtitre: '', titre: '', intro: '', bouton: RDV, mediaId: null },
  preremplir: (c) => ({ surtitre: c.ouverture.surtitre, titre: c.ouverture.titre, intro: c.ouverture.intro, bouton: RDV, mediaId: c.ambiance?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <Lames photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.ambiance}>
          {data.surtitre && <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/70">{data.surtitre}</p>}
          <h1 className="mt-4 max-w-[16ch] text-[clamp(42px,7vw,104px)] leading-[1] text-white [&_em]:[-webkit-text-fill-color:#dff1ef] [&_em]:[background:none]">
            {enLignes(data.titre || c.ouverture.titre).map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            {data.intro && <p className="max-w-[46ch] text-[16.5px] leading-[1.65] text-white/80">{data.intro}</p>}
            <a href={c.rdv} className="rounded-full border border-white/50 px-6 py-3 text-[14px] font-semibold text-white transition-colors duration-500 hover:bg-white hover:text-[var(--ad-nuit)]">
              {data.bouton || RDV}
            </a>
          </div>
        </Lames>
      </Enveloppe>
    )
  },
}

const motPhotoSchema = z.object({ surtitre: t, mot: t, texte: t, mediaId: media })
export const mExMotPhotoBlock: BlockDefinition<typeof motPhotoSchema> = {
  ...commun,
  label: 'Exception — Le mot-photo',
  description: 'Un très grand mot taillé dans la photo : il se resserre en arrivant, et l’image glisse lentement dans les lettres.',
  schema: motPhotoSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.text('mot', 'Le mot', { help: 'Court : un mot, deux au plus.' }), field.textarea('texte', 'Texte dessous'), field.media('mediaId', 'Photo')],
  defaults: { surtitre: '', mot: 'respirer', texte: '', mediaId: null },
  preremplir: (c) => ({ surtitre: c.ouverture.surtitre, mot: 'respirer', texte: c.accroche, mediaId: (c.photos.find((p) => /jardin|verdure|plante/i.test(p.alt)) ?? c.ambiance)?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-hidden pb-24 pt-32 md:pb-32 md:pt-44">
          {data.surtitre && (
            <div className="mb-6 flex justify-center">
              <Surtitre>{data.surtitre}</Surtitre>
            </div>
          )}
          <MotPhoto mot={data.mot || 'respirer'} photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.ambiance} />
          {data.texte && (
            <Revele delai={0.4}>
              <p className="mx-auto mt-10 max-w-[46ch] px-6 text-center text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
            </Revele>
          )}
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

const devoilementSchema = z.object({ surtitre: t, titre: t, texte: t, citation: t, mediaId: media })
export const mExDevoilementBlock: BlockDefinition<typeof devoilementSchema> = {
  ...commun,
  label: 'Exception — Le dévoilement',
  description: 'Le portrait se découvre lentement de bas en haut, à côté d’un texte qui se pose ligne à ligne.',
  schema: devoilementSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('texte', 'Texte'),
    field.textarea('citation', 'Phrase mise en avant'),
    field.media('mediaId', 'Portrait'),
  ],
  defaults: { surtitre: 'Qui je suis', titre: '', texte: '', citation: '', mediaId: null },
  preremplir: (c) => ({ surtitre: c.apropos.surtitre, titre: c.apropos.titre, texte: c.apropos.texte, citation: c.apropos.citation ?? '', mediaId: c.portrait?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={`${CONTENEUR} grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-24`}>
            <Devoilement photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.portrait} />
            <div>
              {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
              <h2 className="text-[clamp(34px,4.4vw,56px)]">
                <Lignes lignes={enLignes(data.titre || c.apropos.titre)} />
              </h2>
              {data.texte && (
                <Revele delai={0.3}>
                  <p className="mt-8 whitespace-pre-line text-[16.5px] leading-[1.75] text-[var(--ad-pierre)]">{data.texte}</p>
                </Revele>
              )}
              {data.citation && (
                <Revele delai={0.5}>
                  <p className="mt-10 border-l border-[var(--ad-sable-fonce)] pl-6 font-[family-name:var(--ad-titre)] text-[22px] italic leading-[1.4] text-[var(--ad-nuit)]">{data.citation}</p>
                </Revele>
              )}
            </div>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const plancheSchema = z.object({ surtitre: t, titre: t, texte: t, photos: z.array(z.string()).default([]) })
export const mExPlancheBlock: BlockDefinition<typeof plancheSchema> = {
  ...commun,
  label: 'Exception — La planche',
  description: 'Des photos en trois colonnes qui glissent à des vitesses différentes au défilement : une profondeur à peine perceptible.',
  schema: plancheSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.textarea('texte', 'Texte'),
    field.mediaList('photos', 'Photos', { help: 'Six ou neuf, c’est l’idéal. La légende de la photo s’affiche dessous.' }),
  ],
  defaults: { surtitre: 'Quelques instants', titre: 'Le cabinet, *au quotidien*', texte: '', photos: [] },
  preremplir: (c) => ({ surtitre: 'Quelques instants', titre: 'Le cabinet, *au quotidien*', texte: '', photos: sansSubstitution(c).slice(0, 6).map((p) => p.id) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = photosDe(data.photos, ctx.resolveMedia)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-36">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} texte={data.texte} />
            <Planche photos={choisies.length ? choisies : sansSubstitution(c).slice(0, 6)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const odometreSchema = z.object({ surtitre: t, titre: t, chiffres: z.array(z.object({ valeur: t, libelle: t })).default([]) })
const chiffresDe = (c: Contenu) => [
  { valeur: String(c.services.length), libelle: 'accompagnements' },
  { valeur: String(c.horaires.filter((h) => !/ferm/i.test(h.hours)).length), libelle: 'jours de consultation' },
  { valeur: String(c.faq.length), libelle: 'questions répondues' },
]
export const mExOdometreBlock: BlockDefinition<typeof odometreSchema> = {
  ...commun,
  label: 'Exception — L’odomètre',
  description: 'Vos chiffres clés : chaque chiffre roule comme un compteur avant de s’arrêter sur sa valeur.',
  schema: odometreSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre', { help: TITRE }),
    field.list('chiffres', 'Chiffres', [field.text('valeur', 'Valeur', { help: 'Ex. « 12 », « 50 min ».' }), field.text('libelle', 'Légende')], { addLabel: 'Ajouter un chiffre' }),
  ],
  defaults: { surtitre: 'En quelques chiffres', titre: 'Ce qui *compte*', chiffres: [] },
  preremplir: (c) => ({ surtitre: 'En quelques chiffres', titre: 'Ce qui *compte*', chiffres: chiffresDe(c) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const chiffres = data.chiffres.filter((x) => x.valeur.trim())
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Odometre chiffres={chiffres.length ? chiffres : chiffresDe(c)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   MA MÉTHODE
   ══════════════════════════════════════════════════════════════════════ */

const etapesSchema = z.object({ surtitre: t, titre: t, etapes: z.array(z.object({ titre: t, texte: t })).default([]) })
const champsEtapes = [
  field.text('surtitre', 'Étiquette'),
  field.textarea('titre', 'Titre', { help: TITRE }),
  field.list('etapes', 'Étapes', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' }),
]
const etapesDe = (data: { etapes: { titre: string; texte: string }[] }, c: Contenu) => {
  const e = data.etapes.filter((x) => x.titre.trim())
  return e.length ? e : c.methode.etapes
}

export const mExFilBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — Le fil',
  description: 'Un trait vertical se dessine au défilement ; chaque étape s’éclaire quand il l’atteint.',
  schema: etapesSchema,
  fields: champsEtapes,
  defaults: { surtitre: 'Ma méthode', titre: 'Comment ça *se passe*', etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: 'Comment ça *se passe*', etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            <Fil etapes={etapesDe(data, c)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExVoyageBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — Le voyage',
  description: 'Sur grand écran, la page s’immobilise et les étapes défilent de côté sur un trait fin qui se trace.',
  schema: etapesSchema,
  fields: champsEtapes,
  defaults: { surtitre: 'Ma méthode', titre: 'Un chemin, *pas à pas*', etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: 'Un chemin, *pas à pas*', etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="pb-24 pt-24 md:pt-36 lg:pb-0">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
          </div>
          <div className="mx-auto max-w-[1200px] px-[5vw] lg:max-w-none lg:px-0">
            <Voyage etapes={etapesDe(data, c)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExVoletsBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — Les volets',
  description: 'Les étapes en colonnes ; celle qu’on survole s’élargit doucement et laisse lire son texte.',
  schema: etapesSchema,
  fields: champsEtapes,
  defaults: { surtitre: 'Ma méthode', titre: 'Trois *temps*', etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: c.methode.titre, etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Volets etapes={etapesDe(data, c)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS
   ══════════════════════════════════════════════════════════════════════ */

const servicesSchema = z.object({ surtitre: t, titre: t, bouton: t })
const champsServices = [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE }), field.text('bouton', 'Lien')]
const sourceServices = { label: 'Les accompagnements', href: '/admin/accompagnements' }

export const mExLignesBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — Les lignes',
  description: 'Une liste à filets ; la ligne survolée s’ouvre en douceur et laisse apparaître sa photo et son texte.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: 'Ce que je *propose*', bouton: RDV },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: 'Ce que je *propose*', bouton: RDV }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <LignesServices services={servicesIllustres(c)} rdv={c.rdv} bouton={data.bouton || RDV} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExSommaireBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — Le sommaire',
  description: 'Les noms en grand, en retrait ; celui qu’on survole s’affirme, un filet se trace dessous et sa photo se pose en fondu.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: '', bouton: RDV },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: '', bouton: RDV }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Sommaire services={servicesIllustres(c)} rdv={c.rdv} bouton={data.bouton || RDV} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExChapitresBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — Les chapitres',
  description: 'Un accompagnement à la fois, comme les chapitres d’un livre : la photo se découvre, le texte monte, un filet marque l’avancée.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: 'Un chapitre *à la fois*', bouton: RDV },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: 'Un chapitre *à la fois*', bouton: RDV }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Chapitres services={servicesIllustres(c)} rdv={c.rdv} bouton={data.bouton || RDV} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

const faqSchema = z.object({ surtitre: t, titre: t })
const champsFaq = [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE })]
const sourceFaq = { label: 'Les questions', href: '/admin/questions' }

export const mExPliBlock: BlockDefinition<typeof faqSchema> = {
  ...commun,
  label: 'Exception — Le pli',
  description: 'Des questions à filets ; la réponse se déplie en douceur et la croix tourne d’un quart de tour.',
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
            <Pli faq={c.faq} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExMachineBlock: BlockDefinition<typeof faqSchema> = {
  ...commun,
  label: 'Exception — La machine à écrire',
  description: 'La question se tape lettre à lettre avec un curseur fin, puis la réponse apparaît ; elles se suivent seules.',
  schema: faqSchema,
  fields: champsFaq,
  defaults: { surtitre: 'Vous vous demandez peut-être', titre: '' },
  preremplir: () => ({ surtitre: 'Vous vous demandez peut-être', titre: '' }),
  dataSource: sourceFaq,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-28 md:py-44">
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
  description: 'Les questions numérotées ; la réponse s’affiche à côté en fondu. En accordéon sur téléphone.',
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

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS & VIDÉOS
   ══════════════════════════════════════════════════════════════════════ */

const lampeSchema = z.object({ surtitre: t, titre: t, texte: t, mediaId: media })
export const mExLampeBlock: BlockDefinition<typeof lampeSchema> = {
  ...commun,
  label: 'Exception — La lampe',
  description: 'Une photo en noir et blanc ; la souris y promène une lumière douce qui lui rend ses couleurs.',
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
    texte: 'Un lieu calme et lumineux, à l’écart du bruit.',
    mediaId: (c.photos.find((p) => p.id !== c.portrait?.id) ?? c.ambiance)?.id ?? null,
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <Revele className="mt-4">
              <Lampe photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.ambiance} titre={data.titre} texte={data.texte} />
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const photosSchema = z.object({ surtitre: t, titre: t, photos: z.array(z.string()).default([]) })
export const mExEventailBlock: BlockDefinition<typeof photosSchema> = {
  ...commun,
  label: 'Exception — L’éventail',
  description: 'Les photos empilées s’ouvrent en éventail, depuis le centre, à mesure qu’on descend.',
  schema: photosSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE }), field.mediaList('photos', 'Photos', { help: 'Jusqu’à sept, de gauche à droite.' })],
  defaults: { surtitre: 'En images', titre: 'Le cabinet, *pièce par pièce*', photos: [] },
  preremplir: (c) => ({ surtitre: 'En images', titre: 'Le cabinet, *pièce par pièce*', photos: sansSubstitution(c).slice(0, 7).map((p) => p.id) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = photosDe(data.photos, ctx.resolveMedia)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-36">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            <Eventail photos={choisies.length ? choisies : sansSubstitution(c).slice(0, 7)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExFriseBlock: BlockDefinition<typeof photosSchema> = {
  ...commun,
  label: 'Exception — La frise',
  description: 'Une seule rangée de photos qui défile très lentement, aux bords fondus ; survolée, elle s’arrête.',
  schema: photosSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE }), field.mediaList('photos', 'Photos')],
  defaults: { surtitre: 'En images', titre: 'Le cabinet, *en lumière*', photos: [] },
  preremplir: (c) => ({ surtitre: 'En images', titre: 'Le cabinet, *en lumière*', photos: sansSubstitution(c).slice(0, 8).map((p) => p.id) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const choisies = photosDe(data.photos, ctx.resolveMedia)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-24 md:py-36">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
          </div>
          <Frise photos={choisies.length ? choisies : sansSubstitution(c).slice(0, 8)} />
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   TEXTES
   ══════════════════════════════════════════════════════════════════════ */

const lettresSchema = z.object({ surtitre: t, titre: t, texte: t })
export const mExLettresBlock: BlockDefinition<typeof lettresSchema> = {
  ...commun,
  label: 'Exception — Lettres vivantes',
  description: 'Un très grand titre : les lettres arrivent en cascade, puis se soulèvent à peine sous la souris.',
  schema: lettresSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: 'Le mot clé entre *astérisques*.' }), field.textarea('texte', 'Texte')],
  defaults: { surtitre: 'Une conviction', titre: 'Ici, on prend *le temps*', texte: '' },
  preremplir: (c) => ({ surtitre: 'Une conviction', titre: 'Ici, on prend *le temps*', texte: c.accroche }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <section className={SECTION}>
        <div className={CONTENEUR}>
          {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
          <LettresVivantes texte={data.titre || 'Ici, on prend *le temps*'} className="text-[clamp(50px,10vw,160px)] tracking-[-0.035em]" />
          {data.texte && (
            <Revele delai={0.5}>
              <p className="mt-10 max-w-[46ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
            </Revele>
          )}
        </div>
      </section>
    </Enveloppe>
  ),
}

const rubanSchema = z.object({ ruban: t, phrase: t, auteur: t })
export const mExRubanBlock: BlockDefinition<typeof rubanSchema> = {
  ...commun,
  label: 'Exception — Le ruban',
  description: 'Une phrase écrite en cercle qui tourne doucement au défilement, la conviction au centre.',
  schema: rubanSchema,
  fields: [field.text('ruban', 'Texte du cercle'), field.textarea('phrase', 'Phrase du centre', { help: 'Le mot clé entre *astérisques*.' }), field.text('auteur', 'Signature')],
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

const motSchema = z.object({ surtitre: t, debut: t, mots: t, texte: t })
export const mExMotChangeBlock: BlockDefinition<typeof motSchema> = {
  ...commun,
  label: 'Exception — Le mot qui change',
  description: '« Un lieu pour… » : le dernier mot change, glisse et se floute ; la phrase s’ajuste à sa longueur.',
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
        <section className="py-28 md:py-44">
          <div className={CONTENEUR}>
            {data.surtitre && (
              <div className="flex justify-center">
                <Surtitre>{data.surtitre}</Surtitre>
              </div>
            )}
            <MotQuiChange debut={data.debut || 'Un lieu pour'} mots={mots.length ? mots : ['respirer']} />
            {data.texte && (
              <Revele delai={0.3}>
                <p className="mx-auto mt-10 max-w-[46ch] text-center text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
              </Revele>
            )}
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT & RENDEZ-VOUS
   ══════════════════════════════════════════════════════════════════════ */

const contactSchema = z.object({ surtitre: t, titre: t })
const champsContact = [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE })]
const sourceReglages = (label: string) => ({ label, href: '/admin/reglages' })

export const mExAdresseBlock: BlockDefinition<typeof contactSchema> = {
  ...commun,
  label: 'Exception — L’adresse',
  description: 'L’adresse en grand ; un filet se trace dessous et les coordonnées s’y posent une à une.',
  schema: contactSchema,
  fields: champsContact,
  defaults: { surtitre: 'Venir', titre: '' },
  preremplir: () => ({ surtitre: 'Venir', titre: '' }),
  dataSource: sourceReglages('Les coordonnées'),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            {data.titre && (
              <h2 className="mb-8 text-[clamp(28px,3.5vw,44px)]">
                <Lignes lignes={enLignes(data.titre)} />
              </h2>
            )}
            <Adresse adresse={c.adresse} telephone={c.telephone} email={c.email} acces={c.infoPratique} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExHorlogeBlock: BlockDefinition<typeof contactSchema> = {
  ...commun,
  label: 'Exception — L’horloge',
  description: 'Un cadran de 24 heures au trait : les heures du jour en arc, l’aiguille à l’heure qu’il est, « Ouvert maintenant » en clair.',
  schema: contactSchema,
  fields: champsContact,
  defaults: { surtitre: 'Horaires', titre: 'Quand *venir*' },
  preremplir: () => ({ surtitre: 'Horaires', titre: 'Quand *venir*' }),
  dataSource: sourceReglages('Les horaires'),
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

const invitationSchema = z.object({ surtitre: t, titre: t, bouton: t })
export const mExInvitationBlock: BlockDefinition<typeof invitationSchema> = {
  ...commun,
  label: 'Exception — L’invitation',
  description: 'Une phrase, beaucoup d’air, un lien : le filet se trace sous le texte et la flèche avance au survol.',
  schema: invitationSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Phrase', { help: TITRE }), field.text('bouton', 'Lien')],
  defaults: { surtitre: 'Rendez-vous', titre: 'Prenons le temps\nd’en *parler*', bouton: RDV },
  preremplir: () => ({ surtitre: 'Rendez-vous', titre: 'Prenons le temps\nd’en *parler*', bouton: RDV }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-32 md:py-48">
          <div className={`${CONTENEUR} text-center`}>
            {data.surtitre && (
              <div className="flex justify-center">
                <Surtitre>{data.surtitre}</Surtitre>
              </div>
            )}
            <h2 className="text-[clamp(44px,7vw,104px)] leading-[1]">
              <Lignes lignes={enLignes(data.titre || 'Prenons le temps\nd’en *parler*')} />
            </h2>
            <Revele delai={0.5} className="mt-14 flex justify-center">
              <Invitation libelle={data.bouton || RDV} href={c.rdv} />
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/** Les modèles d'exception, par catégorie (l'ordre de la vitrine). */
export const EXCEPTION_PAR_CATEGORIE = [
  { categorie: 'Ouverture', types: ['mExFente', 'mExLames', 'mExMotPhoto'] },
  { categorie: 'Qui je suis', types: ['mExDevoilement', 'mExPlanche', 'mExOdometre'] },
  { categorie: 'Ma méthode', types: ['mExFil', 'mExVoyage', 'mExVolets'] },
  { categorie: 'Accompagnements', types: ['mExLignes', 'mExSommaire', 'mExChapitres'] },
  { categorie: 'Questions', types: ['mExPli', 'mExMachine', 'mExIndex'] },
  { categorie: 'Photos & vidéos', types: ['mExLampe', 'mExEventail', 'mExFrise'] },
  { categorie: 'Textes', types: ['mExLettres', 'mExRuban', 'mExMotChange'] },
  { categorie: 'Contact & rendez-vous', types: ['mExAdresse', 'mExHorloge', 'mExInvitation'] },
] as const

export const MODELES_EXCEPTION = EXCEPTION_PAR_CATEGORIE.flatMap((g) => g.types)
