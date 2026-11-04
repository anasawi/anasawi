import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import type { Contenu } from './contenu'
import {
  CartePostale,
  ChiffresCartes,
  CitationPosee,
  Colonnes,
  Defile,
  Donne,
  Ecart,
  Etiquettes,
  Eventail,
  EventailEtapes,
  Fiches,
  Frise,
  FriseServices,
  Invitation,
  InvitationFlottante,
  Liasse,
  Manege,
  Mobile,
  MotQuiChange,
  Mur,
  Paquet,
  Pile,
  PortraitAccompagne,
  Roue,
  Semaine,
} from '@/components/anasawi/exception'
import { enLignes, Surtitre } from '@/components/anasawi/sections'
import { Lignes, Revele } from '@/components/anasawi/vivant'
import type { Media } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION — vingt-quatre sections, trois par catégorie de
 * la bibliothèque, dans l'esprit de l'éventail et de la frise : des cartes
 * (photos, étapes, questions, jours…) qui bougent comme de vrais objets,
 * en continu ou au défilement. Vitrine : /moderne/exception.
 *
 * Comme les autres blocs modernes : préremplis avec le contenu réel,
 * tout modifiable dans l'éditeur.
 */

const t = z.string().default('')
const media = z.string().nullable().default(null)
const liste = z.array(z.string()).default([])
const commun = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }
const TITRE = 'Une ligne par retour à la ligne ; le mot clé entre *astérisques*.'
const SECTION = 'overflow-x-clip py-24 md:py-36'
const CONTENEUR = 'mx-auto max-w-[1200px] px-[5vw]'
const RDV = 'Prendre rendez-vous'

const champ = {
  surtitre: field.text('surtitre', 'Étiquette'),
  titre: field.textarea('titre', 'Titre', { help: TITRE }),
  texte: field.textarea('texte', 'Texte'),
  bouton: field.text('bouton', 'Bouton'),
  photos: (help?: string) => field.mediaList('photos', 'Photos', help ? { help } : undefined),
}

/** En-tête commun : étiquette + titre en lignes (+ texte), centré ou non. */
function Tete({ surtitre, titre, texte, centre = false }: { surtitre: string; titre: string; texte?: string; centre?: boolean }) {
  if (!surtitre && !titre && !texte) return null
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
const sansSubstitution = (c: Contenu) => c.photos.filter((p) => !/substitution/i.test(p.alt))
/** Les photos choisies, sinon celles du cabinet (n au plus). */
const photosOu = (ids: string[], resolve: (id: string) => Media | null, c: Contenu, n: number) => {
  const choisies = ids.map(resolve).filter((m): m is Media => Boolean(m))
  return (choisies.length ? choisies : sansSubstitution(c)).slice(0, n)
}
const idsDe = (c: Contenu, n: number, sauf?: string) => sansSubstitution(c).filter((p) => p.id !== sauf).slice(0, n).map((p) => p.id)
/** Les accompagnements, chacun avec sa photo (la sienne, sinon une du cabinet). */
const servicesIllustres = (c: Contenu) => {
  const photos = sansSubstitution(c).filter((p) => p.id !== c.portrait?.id)
  return c.services.map((s, i) => ({ ...s, media: s.media ?? photos[i % Math.max(1, photos.length)] ?? null }))
}

/** Le texte d'ouverture (étiquette, titre, intro, bouton), réutilisé. */
function TexteOuverture({ data, c, centre = false }: { data: { surtitre: string; titre: string; intro: string; bouton: string }; c: Contenu; centre?: boolean }) {
  return (
    <div className={centre ? 'mx-auto max-w-[820px] text-center' : ''}>
      {data.surtitre && (centre ? <div className="flex justify-center"><Surtitre>{data.surtitre}</Surtitre></div> : <Surtitre>{data.surtitre}</Surtitre>)}
      <h1 className="text-[clamp(42px,6.4vw,96px)] leading-[1]">
        <Lignes lignes={enLignes(data.titre || c.ouverture.titre)} />
      </h1>
      {data.intro && (
        <Revele delai={0.3}>
          <p className={centre ? 'mx-auto mt-7 max-w-[48ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]' : 'mt-7 max-w-[44ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]'}>{data.intro}</p>
        </Revele>
      )}
      <Revele delai={0.45} className={centre ? 'mt-9 flex justify-center' : 'mt-9'}>
        <a href={c.rdv} className="inline-flex rounded-full bg-[var(--ad-nuit)] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_36px_-18px_rgba(46,66,79,0.7)] transition-transform duration-500 hover:-translate-y-0.5">
          {data.bouton || RDV}
        </a>
      </Revele>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

const ouvertureSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t, photos: liste })
const champsOuverture = [champ.surtitre, champ.titre, field.textarea('intro', 'Introduction'), champ.bouton, champ.photos('Quatre ou cinq, c’est l’idéal.')]
const ouvertureDe = (c: Contenu) => ({ surtitre: c.ouverture.surtitre, titre: c.ouverture.titre, intro: c.ouverture.intro, bouton: RDV, photos: idsDe(c, 5) })

export const mExPileBlock: BlockDefinition<typeof ouvertureSchema> = {
  ...commun,
  label: 'Exception — La pile',
  description: 'À côté du titre, des photos posées en tas qui flottent doucement et s’écartent les unes des autres quand on descend.',
  schema: ouvertureSchema,
  fields: champsOuverture,
  defaults: { surtitre: '', titre: '', intro: '', bouton: RDV, photos: [] },
  preremplir: ouvertureDe,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip pb-24 pt-36 md:pb-32 md:pt-44">
          <div className={`${CONTENEUR} grid items-center gap-16 lg:grid-cols-2`}>
            <TexteOuverture data={data} c={c} />
            <Pile photos={photosOu(data.photos, ctx.resolveMedia, c, 4)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExRoueBlock: BlockDefinition<typeof ouvertureSchema> = {
  ...commun,
  label: 'Exception — La roue',
  description: 'Sous le titre, une grande roue de photos qui tourne lentement, sans fin ; on n’en voit que le haut, comme un horizon.',
  schema: ouvertureSchema,
  fields: champsOuverture,
  defaults: { surtitre: '', titre: '', intro: '', bouton: RDV, photos: [] },
  preremplir: (c) => ({ ...ouvertureDe(c), photos: idsDe(c, 10) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip pt-36 md:pt-44">
          <div className={CONTENEUR}>
            <TexteOuverture data={data} c={c} centre />
          </div>
          <div className="mt-16">
            <Roue photos={photosOu(data.photos, ctx.resolveMedia, c, 10)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const ecartSchema = z.object({ surtitre: t, titre: t, texte: t, photos: liste })
export const mExEcartBlock: BlockDefinition<typeof ecartSchema> = {
  ...commun,
  label: 'Exception — L’écart',
  description: 'Les photos recouvrent le titre, en tas ; en descendant, elles glissent vers les bords et le titre apparaît au milieu.',
  schema: ecartSchema,
  fields: [champ.surtitre, champ.titre, champ.texte, champ.photos('Cinq photos.')],
  defaults: { surtitre: '', titre: 'Entrez,\n*prenez place*', texte: '', photos: [] },
  preremplir: (c) => ({ surtitre: c.ouverture.surtitre, titre: 'Entrez,\n*prenez place*', texte: c.accroche, photos: idsDe(c, 5) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <Ecart photos={photosOu(data.photos, ctx.resolveMedia, c, 5)}>
          {data.surtitre && (
            <div className="flex justify-center">
              <Surtitre>{data.surtitre}</Surtitre>
            </div>
          )}
          <h2 className="text-[clamp(44px,8vw,128px)] leading-[0.98]">
            {enLignes(data.titre || 'Entrez,\n*prenez place*').map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </h2>
          {data.texte && <p className="mx-auto mt-8 max-w-[44ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>}
        </Ecart>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

const portraitSchema = z.object({ surtitre: t, titre: t, texte: t, mediaId: media, photos: liste })
export const mExPortraitBlock: BlockDefinition<typeof portraitSchema> = {
  ...commun,
  label: 'Exception — Le portrait accompagné',
  description: 'Le portrait sur sa carte, deux petites photos glissées derrière qui dépassent et dérivent à leur propre vitesse.',
  schema: portraitSchema,
  fields: [champ.surtitre, champ.titre, champ.texte, field.media('mediaId', 'Portrait'), champ.photos('Deux photos, derrière le portrait.')],
  defaults: { surtitre: 'Qui je suis', titre: '', texte: '', mediaId: null, photos: [] },
  preremplir: (c) => ({ surtitre: c.apropos.surtitre, titre: c.apropos.titre, texte: c.apropos.texte, mediaId: c.portrait?.id ?? null, photos: idsDe(c, 2, c.portrait?.id) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const portrait = photoDe(data.mediaId, ctx.resolveMedia) ?? c.portrait
    const autres = photosOu(data.photos, ctx.resolveMedia, c, 3).filter((p) => p.id !== portrait?.id).slice(0, 2)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={`${CONTENEUR} grid items-center gap-20 lg:grid-cols-2`}>
            <PortraitAccompagne portrait={portrait} photos={autres} />
            <div>
              {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
              <h2 className="text-[clamp(32px,4.2vw,54px)]">
                <Lignes lignes={enLignes(data.titre || c.apropos.titre)} />
              </h2>
              {data.texte && (
                <Revele delai={0.3}>
                  <p className="mt-8 whitespace-pre-line text-[16.5px] leading-[1.75] text-[var(--ad-pierre)]">{data.texte}</p>
                </Revele>
              )}
            </div>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const photosSchema = z.object({ surtitre: t, titre: t, texte: t, photos: liste })
export const mExColonnesBlock: BlockDefinition<typeof photosSchema> = {
  ...commun,
  label: 'Exception — Les colonnes',
  description: 'Trois colonnes de photos qui montent et descendent sans fin, en sens contraire ; survolées, elles s’arrêtent.',
  schema: photosSchema,
  fields: [champ.surtitre, champ.titre, champ.texte, champ.photos('Six ou plus.')],
  defaults: { surtitre: 'Quelques instants', titre: 'Le cabinet, *au quotidien*', texte: '', photos: [] },
  preremplir: (c) => ({ surtitre: 'Quelques instants', titre: 'Le cabinet, *au quotidien*', texte: '', photos: idsDe(c, 9) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} texte={data.texte} />
            <Colonnes photos={photosOu(data.photos, ctx.resolveMedia, c, 12)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const chiffresSchema = z.object({ surtitre: t, titre: t, chiffres: z.array(z.object({ valeur: t, libelle: t })).default([]) })
const chiffresDe = (c: Contenu) => [
  { valeur: String(c.services.length), libelle: 'accompagnements' },
  { valeur: String(c.horaires.filter((h) => !/ferm/i.test(h.hours)).length), libelle: 'jours de consultation' },
  { valeur: String(c.faq.length), libelle: 'questions répondues' },
]
export const mExChiffresBlock: BlockDefinition<typeof chiffresSchema> = {
  ...commun,
  label: 'Exception — Les chiffres en cartes',
  description: 'Chaque chiffre sur sa carte : empilées, elles s’ouvrent en éventail au défilement, et les chiffres roulent.',
  schema: chiffresSchema,
  fields: [champ.surtitre, champ.titre, field.list('chiffres', 'Chiffres', [field.text('valeur', 'Valeur', { help: 'Ex. « 12 », « 50 min ».' }), field.text('libelle', 'Légende')], { addLabel: 'Ajouter un chiffre' })],
  defaults: { surtitre: 'En quelques chiffres', titre: 'Ce qui *compte*', chiffres: [] },
  preremplir: (c) => ({ surtitre: 'En quelques chiffres', titre: 'Ce qui *compte*', chiffres: chiffresDe(c) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const chiffres = data.chiffres.filter((x) => x.valeur.trim())
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            <ChiffresCartes chiffres={chiffres.length ? chiffres : chiffresDe(c)} />
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
const champsEtapes = [champ.surtitre, champ.titre, field.list('etapes', 'Étapes', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' })]
const etapesDe = (data: { etapes: { titre: string; texte: string }[] }, c: Contenu) => {
  const e = data.etapes.filter((x) => x.titre.trim())
  return e.length ? e : c.methode.etapes
}

export const mExPaquetBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — Le paquet',
  description: 'En descendant, les étapes arrivent une à une du bas de l’écran pour se poser sur la pile, un peu de travers.',
  schema: etapesSchema,
  fields: champsEtapes,
  defaults: { surtitre: 'Ma méthode', titre: 'Comment ça *se passe*', etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: 'Comment ça *se passe*', etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="pt-24 md:pt-36">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
          </div>
          <Paquet etapes={etapesDe(data, c)} />
        </section>
      </Enveloppe>
    )
  },
}

export const mExDefileBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — Le défilé',
  description: 'Sur grand écran, la page s’arrête et les cartes-étapes passent devant nous ; celle du centre se redresse, les autres s’inclinent.',
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
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
          </div>
          <div className="mx-auto max-w-[1200px] px-[5vw] lg:max-w-none lg:px-0">
            <Defile etapes={etapesDe(data, c)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExEventailEtapesBlock: BlockDefinition<typeof etapesSchema> = {
  ...commun,
  label: 'Exception — L’éventail des étapes',
  description: 'Les étapes sur des cartes empilées, qui s’ouvrent en éventail depuis le centre au défilement.',
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
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            <EventailEtapes etapes={etapesDe(data, c)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS
   ══════════════════════════════════════════════════════════════════════ */

const servicesSchema = z.object({ surtitre: t, titre: t })
const champsServices = [champ.surtitre, champ.titre]
const sourceServices = { label: 'Les accompagnements', href: '/admin/accompagnements' }

export const mExFriseServicesBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — La frise des accompagnements',
  description: 'Les cartes des accompagnements défilent lentement, sans fin ; survolée, la frise s’arrête et la carte se lève.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: 'Ce que je *propose*' },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: 'Ce que je *propose*' }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-24 md:py-36">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
          </div>
          <FriseServices services={servicesIllustres(c)} rdv={c.rdv} />
        </section>
      </Enveloppe>
    )
  },
}

export const mExDonneBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — La donne',
  description: 'Les cartes arrivent en paquet au centre, puis se distribuent chacune à sa place, comme un jeu qu’on étale.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: 'Cartes *sur table*' },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: 'Cartes *sur table*' }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <Donne services={servicesIllustres(c)} rdv={c.rdv} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

export const mExManegeBlock: BlockDefinition<typeof servicesSchema> = {
  ...commun,
  label: 'Exception — Le manège',
  description: 'Les cartes forment un cercle en trois dimensions qui tourne lentement ; survolé, il s’arrête.',
  schema: servicesSchema,
  fields: champsServices,
  defaults: { surtitre: 'Accompagnements', titre: 'Faites *un tour*' },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: 'Faites *un tour*' }),
  dataSource: sourceServices,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
          </div>
          <Manege services={servicesIllustres(c)} rdv={c.rdv} />
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

const faqSchema = z.object({ surtitre: t, titre: t })
const champsFaq = [champ.surtitre, champ.titre]
const sourceFaq = { label: 'Les questions', href: '/admin/questions' }
const blocFaq = (
  type: { label: string; description: string; titre: string },
  rendu: (c: Contenu) => React.ReactNode,
  centre = true,
): BlockDefinition<typeof faqSchema> => ({
  ...commun,
  label: type.label,
  description: type.description,
  schema: faqSchema,
  fields: champsFaq,
  defaults: { surtitre: 'Questions', titre: type.titre },
  preremplir: () => ({ surtitre: 'Questions', titre: type.titre }),
  dataSource: sourceFaq,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-24 md:py-36">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre={centre} />
          </div>
          {rendu(c)}
        </section>
      </Enveloppe>
    )
  },
})

export const mExFichesBlock = blocFaq(
  { label: 'Exception — Les fiches', description: 'Un paquet de fiches : toutes les quelques secondes, celle du dessus glisse de côté et repart derrière.', titre: 'Ce qu’on *se demande*' },
  (c) => (
    <div className={CONTENEUR}>
      <Fiches faq={c.faq} />
    </div>
  ),
)
export const mExMurBlock = blocFaq(
  { label: 'Exception — Le mur', description: 'Deux rangées de questions qui défilent en sens contraire ; survolée, une carte se lève et montre sa réponse.', titre: 'Toutes *vos questions*' },
  (c) => <Mur faq={c.faq} />,
)
export const mExLiasseBlock = blocFaq(
  { label: 'Exception — La liasse', description: 'Les questions-réponses sur des cartes qui, au défilement, viennent se poser les unes sur les autres.', titre: 'Tout ce qu’il faut *savoir*' },
  (c) => (
    <div className={CONTENEUR}>
      <Liasse faq={c.faq} />
    </div>
  ),
)

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS & VIDÉOS
   ══════════════════════════════════════════════════════════════════════ */

const galerieSchema = z.object({ surtitre: t, titre: t, photos: liste })
const blocPhotos = (
  type: { label: string; description: string; titre: string; n: number; aide: string },
  rendu: (photos: Media[]) => React.ReactNode,
  pleineLargeur = false,
): BlockDefinition<typeof galerieSchema> => ({
  ...commun,
  label: type.label,
  description: type.description,
  schema: galerieSchema,
  fields: [champ.surtitre, champ.titre, champ.photos(type.aide)],
  defaults: { surtitre: 'En images', titre: type.titre, photos: [] },
  preremplir: (c) => ({ surtitre: 'En images', titre: type.titre, photos: idsDe(c, type.n) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photos = photosOu(data.photos, ctx.resolveMedia, c, type.n)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre={!pleineLargeur} />
            {!pleineLargeur && rendu(photos)}
          </div>
          {pleineLargeur && rendu(photos)}
        </section>
      </Enveloppe>
    )
  },
})

export const mExMobileBlock = blocPhotos(
  { label: 'Exception — Le mobile', description: 'Des photos suspendues à des fils qui se balancent doucement, chacune à son rythme.', titre: 'Le cabinet, *en suspens*', n: 7, aide: 'Jusqu’à sept.' },
  (photos) => <Mobile photos={photos} />,
)
export const mExEventailBlock = blocPhotos(
  { label: 'Exception — L’éventail', description: 'Les photos empilées s’ouvrent en éventail, depuis le centre, à mesure qu’on descend.', titre: 'Le cabinet, *pièce par pièce*', n: 7, aide: 'Jusqu’à sept, de gauche à droite.' },
  (photos) => <Eventail photos={photos} />,
)
export const mExFriseBlock = blocPhotos(
  { label: 'Exception — La frise', description: 'Une seule rangée de photos qui défile très lentement, aux bords fondus ; survolée, elle s’arrête.', titre: 'Le cabinet, *en lumière*', n: 8, aide: 'Six ou plus.' },
  (photos) => <Frise photos={photos} />,
  true,
)

/* ══════════════════════════════════════════════════════════════════════
   TEXTES
   ══════════════════════════════════════════════════════════════════════ */

const citationSchema = z.object({ phrase: t, auteur: t, photos: liste })
export const mExCitationBlock: BlockDefinition<typeof citationSchema> = {
  ...commun,
  label: 'Exception — La citation posée',
  description: 'La phrase sur une grande carte, deux photos glissées dessous qui dépassent et flottent ; au défilement, tout se décale.',
  schema: citationSchema,
  fields: [field.textarea('phrase', 'Phrase', { help: 'Le mot clé entre *astérisques*.' }), field.text('auteur', 'Signature'), champ.photos('Deux photos.')],
  defaults: { phrase: '', auteur: '', photos: [] },
  preremplir: (c) => ({ phrase: c.citation.texte, auteur: c.citation.auteur, photos: idsDe(c, 2) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <CitationPosee phrase={data.phrase || c.citation.texte} auteur={data.auteur} photos={photosOu(data.photos, ctx.resolveMedia, c, 2)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const etiquettesSchema = z.object({ surtitre: t, titre: t, mots: t })
export const mExEtiquettesBlock: BlockDefinition<typeof etiquettesSchema> = {
  ...commun,
  label: 'Exception — Les étiquettes',
  description: 'Des mots sur de petites cartes, en rangées qui défilent en sens contraire, légèrement penchées.',
  schema: etiquettesSchema,
  fields: [champ.surtitre, champ.titre, field.textarea('mots', 'Mots', { help: 'Un mot (ou une courte expression) par ligne.' })],
  defaults: { surtitre: 'Ce qui m’anime', titre: '', mots: 'Écoute\nBienveillance\nPrésence\nConfiance\nRespiration\nLien\nTemps\nAccueil' },
  preremplir: () => ({ surtitre: 'Ce qui m’anime', titre: '', mots: 'Écoute\nBienveillance\nPrésence\nConfiance\nRespiration\nLien\nTemps\nAccueil' }),
  Component: ({ data, ctx }) => {
    const mots = data.mots.split('\n').map((m) => m.trim()).filter(Boolean)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-24 md:py-32">
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
          </div>
          <Etiquettes mots={mots.length ? mots : ['Écoute']} />
        </section>
      </Enveloppe>
    )
  },
}

const motSchema = z.object({ surtitre: t, debut: t, mots: t, texte: t })
export const mExMotChangeBlock: BlockDefinition<typeof motSchema> = {
  ...commun,
  label: 'Exception — Le mot qui change',
  description: '« Un lieu pour… » : le dernier mot est posé sur une carte qui bascule pour laisser place au suivant.',
  schema: motSchema,
  fields: [champ.surtitre, field.text('debut', 'Début de la phrase'), field.textarea('mots', 'Mots qui changent', { help: 'Un mot (ou deux) par ligne.' }), champ.texte],
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

const postaleSchema = z.object({ surtitre: t, titre: t, mediaId: media })
export const mExCartePostaleBlock: BlockDefinition<typeof postaleSchema> = {
  ...commun,
  label: 'Exception — La carte postale',
  description: 'L’adresse écrite sur une carte postale posée de travers ; au défilement elle se redresse, et flotte à peine.',
  schema: postaleSchema,
  fields: [champ.surtitre, champ.titre, field.media('mediaId', 'Photo de la carte')],
  defaults: { surtitre: 'Venir', titre: 'À *bientôt*', mediaId: null },
  preremplir: (c) => ({ surtitre: 'Venir', titre: 'À *bientôt*', mediaId: (c.photos.find((p) => /porte|fen[eê]tre/i.test(p.alt)) ?? c.ambiance)?.id ?? null }),
  dataSource: { label: 'Les coordonnées', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            <CartePostale photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.ambiance} adresse={c.adresse} telephone={c.telephone} email={c.email} nom={c.nom} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const semaineSchema = z.object({ surtitre: t, titre: t })
export const mExSemaineBlock: BlockDefinition<typeof semaineSchema> = {
  ...commun,
  label: 'Exception — La semaine',
  description: 'Sept cartes, une par jour, qui s’ouvrent en éventail ; celle d’aujourd’hui se lève, et l’on sait si c’est ouvert.',
  schema: semaineSchema,
  fields: [champ.surtitre, champ.titre],
  defaults: { surtitre: 'Horaires', titre: 'Quand *venir*' },
  preremplir: () => ({ surtitre: 'Horaires', titre: 'Quand *venir*' }),
  dataSource: { label: 'Les horaires', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            <Semaine horaires={c.horaires} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const invitationSchema = z.object({ surtitre: t, titre: t, bouton: t, photos: liste })
export const mExInvitationBlock: BlockDefinition<typeof invitationSchema> = {
  ...commun,
  label: 'Exception — L’invitation',
  description: 'Une phrase au centre et, autour, quelques photos qui flottent comme posées en l’air ; au défilement, elles dérivent.',
  schema: invitationSchema,
  fields: [champ.surtitre, field.textarea('titre', 'Phrase', { help: TITRE }), field.text('bouton', 'Lien'), champ.photos('Quatre photos.')],
  defaults: { surtitre: 'Rendez-vous', titre: 'Prenons le temps\nd’en *parler*', bouton: RDV, photos: [] },
  preremplir: (c) => ({ surtitre: 'Rendez-vous', titre: 'Prenons le temps\nd’en *parler*', bouton: RDV, photos: idsDe(c, 4) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip py-16 md:py-24">
          <div className="mx-auto max-w-[1400px] px-[3vw]">
            <InvitationFlottante photos={photosOu(data.photos, ctx.resolveMedia, c, 4)}>
              {data.surtitre && (
                <div className="flex justify-center">
                  <Surtitre>{data.surtitre}</Surtitre>
                </div>
              )}
              <h2 className="text-[clamp(40px,6.4vw,96px)] leading-[1]">
                <Lignes lignes={enLignes(data.titre || 'Prenons le temps\nd’en *parler*')} />
              </h2>
              <Revele delai={0.5} className="mt-12 flex justify-center">
                <Invitation libelle={data.bouton || RDV} href={c.rdv} />
              </Revele>
            </InvitationFlottante>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/** Les modèles d'exception, par catégorie (l'ordre de la vitrine). */
export const EXCEPTION_PAR_CATEGORIE = [
  { categorie: 'Ouverture', types: ['mExPile', 'mExRoue', 'mExEcart'] },
  { categorie: 'Qui je suis', types: ['mExPortrait', 'mExColonnes', 'mExChiffres'] },
  { categorie: 'Ma méthode', types: ['mExPaquet', 'mExDefile', 'mExEventailEtapes'] },
  { categorie: 'Accompagnements', types: ['mExFriseServices', 'mExDonne', 'mExManege'] },
  { categorie: 'Questions', types: ['mExFiches', 'mExMur', 'mExLiasse'] },
  { categorie: 'Photos & vidéos', types: ['mExMobile', 'mExEventail', 'mExFrise'] },
  { categorie: 'Textes', types: ['mExCitation', 'mExEtiquettes', 'mExMotChange'] },
  { categorie: 'Contact & rendez-vous', types: ['mExCartePostale', 'mExSemaine', 'mExInvitation'] },
] as const

export const MODELES_EXCEPTION = EXCEPTION_PAR_CATEGORIE.flatMap((g) => g.types)
