import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import type { Contenu } from './contenu'
import {
  AccordeonCouleur,
  AppelCouleur,
  CartesCouleur,
  CarteVisite,
  ChiffresCouleur,
  Coche,
  Conversation,
  Etiquettes,
  Eventail,
  Fenetre,
  FicheContact,
  Frise,
  GalerieFocus,
  Lecture,
  ListeDefilante,
  Mosaique,
  MotQuiChange,
  Onglets,
  Pastilles,
  PileCouleurs,
  QuestionsDefilantes,
  Selecteur,
  Semaine,
  Surligne,
  Tuiles,
} from '@/components/anasawi/exception'
import { enLignes, Surtitre } from '@/components/anasawi/sections'
import { Aimant, Lignes, Revele } from '@/components/anasawi/vivant'
import type { Media } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION — vingt-quatre sections, trois par catégorie de
 * la bibliothèque, dans l'esprit Qeeps aux couleurs d'Anasawi : des blocs
 * droits, six teintes pastel, et une animation simple mais surprenante
 * par section. Vitrine : /moderne/exception.
 *
 * Comme les autres blocs modernes : préremplis avec le contenu réel,
 * tout modifiable dans l'éditeur.
 */

const t = z.string().default('')
const media = z.string().nullable().default(null)
const liste = z.array(z.string()).default([])
const commun = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }
const TITRE = 'Une ligne par retour à la ligne ; le mot clé entre *astérisques*.'
const SECTION = 'overflow-x-clip py-24 md:py-32'
const CONTENEUR = 'mx-auto max-w-[1200px] px-[5vw]'
const RDV = 'Prendre rendez-vous'
const MOTS = 'Écoute\nConfiance\nPrésence\nRespiration\nLien\nAccueil'

const champ = {
  surtitre: field.text('surtitre', 'Étiquette'),
  titre: field.textarea('titre', 'Titre', { help: TITRE }),
  texte: field.textarea('texte', 'Texte'),
  bouton: field.text('bouton', 'Bouton'),
  mots: field.textarea('mots', 'Mots', { help: 'Un mot (ou une courte expression) par ligne.' }),
  photos: (help?: string) => field.mediaList('photos', 'Photos', help ? { help } : undefined),
}
const lignesDe = (s: string, defaut = MOTS) => (s || defaut).split('\n').map((m) => m.trim()).filter(Boolean)

/** En-tête commun : étiquette + titre en lignes (+ texte), centré ou non. */
function Tete({ surtitre, titre, texte, centre = false }: { surtitre: string; titre: string; texte?: string; centre?: boolean }) {
  if (!surtitre && !titre && !texte) return null
  return (
    <div className={centre ? 'mx-auto mb-14 max-w-[760px] text-center' : 'mb-14 grid gap-6 lg:grid-cols-2 lg:items-end'}>
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
const idsDe = (c: Contenu, n: number) => sansSubstitution(c).slice(0, n).map((p) => p.id)
/** Les accompagnements, chacun avec sa photo (la sienne, sinon une du cabinet). */
const servicesIllustres = (c: Contenu) => {
  const photos = sansSubstitution(c).filter((p) => p.id !== c.portrait?.id)
  return c.services.map((s, i) => ({ ...s, media: s.media ?? photos[i % Math.max(1, photos.length)] ?? null }))
}
/** Le bouton principal, dans le ton des blocs : attiré par la souris. */
function Bouton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Aimant force={0.3}>
      <a href={href} className="inline-flex rounded-full bg-[var(--ad-nuit)] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-16px_rgba(46,66,79,0.8)]">
        {children}
      </a>
    </Aimant>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

const ouvertureSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t, mots: t, photos: liste })
const champsOuverture = [champ.surtitre, champ.titre, field.textarea('intro', 'Introduction'), champ.bouton, champ.mots, champ.photos()]
const ouvertureDe = (c: Contenu) => ({ surtitre: c.ouverture.surtitre, titre: c.ouverture.titre, intro: c.ouverture.intro, bouton: RDV, mots: MOTS, photos: idsDe(c, 6) })

export const mExTuilesBlock: BlockDefinition<typeof ouvertureSchema> = {
  ...commun,
  label: 'Exception — Les tuiles',
  description: 'À côté du titre, un damier de photos et de tuiles colorées qui arrivent avec un petit rebond, puis changent de temps en temps.',
  schema: ouvertureSchema,
  fields: champsOuverture,
  defaults: { surtitre: '', titre: '', intro: '', bouton: RDV, mots: MOTS, photos: [] },
  preremplir: ouvertureDe,
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="pb-24 pt-36 md:pb-32 md:pt-44">
          <div className={`${CONTENEUR} grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]`}>
            <div>
              {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
              <h1 className="text-[clamp(42px,6vw,88px)] leading-[1.02]">
                <Lignes lignes={enLignes(data.titre || c.ouverture.titre)} />
              </h1>
              {data.intro && (
                <Revele delai={0.3}>
                  <p className="mt-7 max-w-[44ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.intro}</p>
                </Revele>
              )}
              <Revele delai={0.45} className="mt-9">
                <Bouton href={c.rdv}>{data.bouton || RDV}</Bouton>
              </Revele>
            </div>
            <Tuiles photos={photosOu(data.photos, ctx.resolveMedia, c, 6)} mots={lignesDe(data.mots)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const surligneSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t })
export const mExSurligneBlock: BlockDefinition<typeof surligneSchema> = {
  ...commun,
  label: 'Exception — Le surligné',
  description: 'Un grand titre centré : le mot clé se surligne d’une couleur qui change doucement ; dessous, les accompagnements poppent en pastilles.',
  schema: surligneSchema,
  fields: [champ.surtitre, field.textarea('titre', 'Titre', { help: 'Le mot à surligner entre *astérisques*.' }), field.textarea('intro', 'Introduction'), champ.bouton],
  defaults: { surtitre: '', titre: 'Un espace pour\n*respirer*', intro: '', bouton: RDV },
  preremplir: (c) => ({ surtitre: c.ouverture.surtitre, titre: 'Un espace pour\n*respirer*', intro: c.ouverture.intro, bouton: RDV }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="pb-24 pt-36 md:pb-32 md:pt-48">
          <div className={`${CONTENEUR} flex flex-col items-center text-center`}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <Surligne titre={data.titre || 'Un espace pour\n*respirer*'} />
            {data.intro && (
              <Revele delai={0.3}>
                <p className="mx-auto mt-8 max-w-[50ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.intro}</p>
              </Revele>
            )}
            <Pastilles mots={c.services.map((s) => s.title)} className="mt-10 justify-center" />
            <Revele delai={0.8} className="mt-10">
              <Bouton href={c.rdv}>{data.bouton || RDV}</Bouton>
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const fenetreSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t, mediaId: media, note1: t, note1Texte: t, note2: t, note2Texte: t })
export const mExFenetreBlock: BlockDefinition<typeof fenetreSchema> = {
  ...commun,
  label: 'Exception — La fenêtre',
  description: 'La photo dans une fenêtre d’application qui s’élargit au défilement ; deux petites notifications viennent s’y poser.',
  schema: fenetreSchema,
  fields: [
    champ.surtitre,
    champ.titre,
    field.textarea('intro', 'Introduction'),
    champ.bouton,
    field.media('mediaId', 'Photo'),
    field.text('note1', 'Notification 1 — titre'),
    field.text('note1Texte', 'Notification 1 — texte'),
    field.text('note2', 'Notification 2 — titre'),
    field.text('note2Texte', 'Notification 2 — texte'),
  ],
  defaults: { surtitre: '', titre: '', intro: '', bouton: RDV, mediaId: null, note1: 'Prendre rendez-vous', note1Texte: 'En quelques clics', note2: 'Au cabinet ou en visio', note2Texte: 'Comme vous préférez' },
  preremplir: (c) => ({
    surtitre: c.ouverture.surtitre,
    titre: c.ouverture.titre,
    intro: c.ouverture.intro,
    bouton: RDV,
    mediaId: c.ambiance?.id ?? null,
    note1: 'Prendre rendez-vous',
    note1Texte: 'En quelques clics',
    note2: 'Au cabinet ou en visio',
    note2Texte: c.ville ? `À ${c.ville}` : 'Comme vous préférez',
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="overflow-x-clip pb-24 pt-36 md:pb-32 md:pt-44">
          <div className={`${CONTENEUR} text-center`}>
            {data.surtitre && (
              <div className="flex justify-center">
                <Surtitre>{data.surtitre}</Surtitre>
              </div>
            )}
            <h1 className="mx-auto max-w-[18ch] text-[clamp(40px,6vw,88px)] leading-[1.02]">
              <Lignes lignes={enLignes(data.titre || c.ouverture.titre)} />
            </h1>
            {data.intro && (
              <Revele delai={0.3}>
                <p className="mx-auto mt-7 max-w-[50ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.intro}</p>
              </Revele>
            )}
            <Revele delai={0.45} className="mt-9 flex justify-center">
              <Bouton href={c.rdv}>{data.bouton || RDV}</Bouton>
            </Revele>
            <div className="mt-16">
              <Fenetre
                photo={photoDe(data.mediaId, ctx.resolveMedia) ?? c.ambiance}
                notes={[
                  { titre: data.note1, texte: data.note1Texte },
                  { titre: data.note2, texte: data.note2Texte },
                ].filter((n) => n.titre)}
              />
            </div>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

const visiteSchema = z.object({ surtitre: t, titre: t, texte: t, mediaId: media })
export const mExCarteVisiteBlock: BlockDefinition<typeof visiteSchema> = {
  ...commun,
  label: 'Exception — La carte de visite',
  description: 'Sur un bloc coloré, une carte : le portrait et son point « disponible » qui pulse, les pastilles qui poppent, les coordonnées qui glissent.',
  schema: visiteSchema,
  fields: [champ.surtitre, champ.titre, champ.texte, field.media('mediaId', 'Portrait')],
  defaults: { surtitre: 'Qui je suis', titre: '', texte: '', mediaId: null },
  preremplir: (c) => ({ surtitre: c.apropos.surtitre, titre: c.apropos.titre, texte: c.apropos.texte, mediaId: c.portrait?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const auj = c.horaires.find((h) => !/ferm/i.test(h.hours))
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={`${CONTENEUR} grid items-center gap-14 lg:grid-cols-2`}>
            <CarteVisite
              portrait={photoDe(data.mediaId, ctx.resolveMedia) ?? c.portrait}
              nom={c.nom}
              metier={c.metier}
              tags={c.services.map((s) => s.title)}
              infos={[c.adresse, c.telephone, auj ? `${auj.day} · ${auj.hours}` : null].filter((x): x is string => Boolean(x))}
            />
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

const chiffresSchema = z.object({ surtitre: t, titre: t, chiffres: z.array(z.object({ valeur: t, libelle: t })).default([]) })
const chiffresDe = (c: Contenu) => [
  { valeur: String(c.services.length), libelle: 'accompagnements' },
  { valeur: String(c.horaires.filter((h) => !/ferm/i.test(h.hours)).length), libelle: 'jours de consultation' },
  { valeur: String(c.faq.length), libelle: 'questions répondues' },
]
export const mExChiffresCouleurBlock: BlockDefinition<typeof chiffresSchema> = {
  ...commun,
  label: 'Exception — Les chiffres en couleur',
  description: 'Chaque chiffre dans son bloc : la couleur monte du bas pour le remplir, et le nombre compte jusqu’à sa valeur.',
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
            <Tete surtitre={data.surtitre} titre={data.titre} />
            <ChiffresCouleur chiffres={chiffres.length ? chiffres : chiffresDe(c)} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const mosaiqueSchema = z.object({ surtitre: t, titre: t, texte: t, mots: t, photos: liste })
export const mExMosaiqueBlock: BlockDefinition<typeof mosaiqueSchema> = {
  ...commun,
  label: 'Exception — La mosaïque',
  description: 'Photos et tuiles de couleur en grille ; chaque case s’ouvre comme un volet coloré qui s’efface, l’une après l’autre.',
  schema: mosaiqueSchema,
  fields: [champ.surtitre, champ.titre, champ.texte, champ.mots, champ.photos('Trois photos.')],
  defaults: { surtitre: 'Qui je suis', titre: 'Un cabinet, *une présence*', texte: '', mots: 'Écoute\nConfiance', photos: [] },
  preremplir: (c) => ({ surtitre: c.apropos.surtitre, titre: 'Un cabinet, *une présence*', texte: c.accroche, mots: 'Écoute\nConfiance', photos: [c.portrait?.id, ...idsDe(c, 3)].filter((x): x is string => Boolean(x)).slice(0, 3) }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} texte={data.texte} />
            <Mosaique photos={photosOu(data.photos, ctx.resolveMedia, c, 3)} mots={lignesDe(data.mots, 'Écoute\nConfiance')} />
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
const blocEtapes = (
  type: { label: string; description: string; titre: string },
  rendu: (etapes: { titre: string; texte: string }[]) => React.ReactNode,
): BlockDefinition<typeof etapesSchema> => ({
  ...commun,
  label: type.label,
  description: type.description,
  schema: etapesSchema,
  fields: champsEtapes,
  defaults: { surtitre: 'Ma méthode', titre: type.titre, etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: type.titre, etapes: c.methode.etapes }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre />
            {rendu(etapesDe(data, c))}
          </div>
        </section>
      </Enveloppe>
    )
  },
})

export const mExCocheBlock = blocEtapes(
  { label: 'Exception — Les étapes à cocher', description: 'Une liste façon application : au défilement, chaque étape se coche, sa coche se dessine et sa ligne se colore.', titre: 'Comment ça *se passe*' },
  (e) => <Coche etapes={e} />,
)
export const mExOngletsBlock = blocEtapes(
  { label: 'Exception — Les onglets', description: 'Des onglets de couleur qui avancent seuls, comme des « stories » : la barre se remplit, puis le panneau change de couleur.', titre: 'Un chemin, *pas à pas*' },
  (e) => <Onglets etapes={e} />,
)
export const mExPileCouleursBlock = blocEtapes(
  { label: 'Exception — La pile de couleurs', description: 'Chaque étape sur un grand bloc de couleur ; au défilement, ils viennent se poser les uns sur les autres.', titre: 'Trois *temps*' },
  (e) => <PileCouleurs etapes={e} />,
)

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS
   ══════════════════════════════════════════════════════════════════════ */

const servicesSchema = z.object({ surtitre: t, titre: t, texte: t })
const blocServices = (
  type: { label: string; description: string; titre: string; centre?: boolean },
  rendu: (c: Contenu) => React.ReactNode,
): BlockDefinition<typeof servicesSchema> => ({
  ...commun,
  label: type.label,
  description: type.description,
  schema: servicesSchema,
  fields: [champ.surtitre, champ.titre, champ.texte],
  defaults: { surtitre: 'Accompagnements', titre: type.titre, texte: '' },
  preremplir: () => ({ surtitre: 'Accompagnements', titre: type.titre, texte: '' }),
  dataSource: { label: 'Les accompagnements', href: '/admin/accompagnements' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} texte={data.texte} centre={type.centre} />
            {rendu(c)}
          </div>
        </section>
      </Enveloppe>
    )
  },
})

export const mExCartesCouleurBlock = blocServices(
  { label: 'Exception — Les cartes de couleur', description: 'Une carte par accompagnement, chacune dans sa teinte ; elles montent l’une après l’autre et la photo se pose.', titre: 'Ce que je *propose*' },
  (c) => <CartesCouleur services={servicesIllustres(c)} rdv={c.rdv} />,
)
export const mExListeDefilanteBlock: BlockDefinition<typeof servicesSchema> = {
  ...blocServices({ label: '', description: '', titre: '' }, () => null),
  label: 'Exception — La liste qui défile',
  description: 'Les accompagnements en rangées, chacune avec sa pastille de couleur, qui montent sans fin dans un bloc ; survolée, la liste s’arrête.',
  defaults: { surtitre: 'Accompagnements', titre: 'Un rythme qui *vous ressemble*', texte: '' },
  preremplir: (c) => ({ surtitre: 'Accompagnements', titre: 'Un rythme qui *vous ressemble*', texte: `${c.services.length} accompagnements : individuels, en couple, ou pour les professionnels. Un choix ensemble, à votre rythme.` }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={`${CONTENEUR} grid items-center gap-12 lg:grid-cols-2`}>
            <div>
              {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
              <h2 className="text-[clamp(34px,4.6vw,60px)]">
                <Lignes lignes={enLignes(data.titre)} />
              </h2>
              {data.texte && (
                <Revele delai={0.2}>
                  <p className="mt-6 max-w-[44ch] text-[16.5px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
                </Revele>
              )}
              <Revele delai={0.35} className="mt-8">
                <Bouton href={c.rdv}>{RDV}</Bouton>
              </Revele>
            </div>
            <ListeDefilante services={c.services} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}
export const mExSelecteurBlock = blocServices(
  { label: 'Exception — Le sélecteur', description: 'Des pastilles qui s’enchaînent seules (ou au clic) ; le grand bloc dessous change de couleur et de photo.', titre: 'Trouver *le vôtre*', centre: true },
  (c) => <Selecteur services={servicesIllustres(c)} rdv={c.rdv} />,
)

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

const faqSchema = z.object({ surtitre: t, titre: t })
const blocFaq = (
  type: { label: string; description: string; titre: string; centre?: boolean },
  rendu: (c: Contenu) => React.ReactNode,
): BlockDefinition<typeof faqSchema> => ({
  ...commun,
  label: type.label,
  description: type.description,
  schema: faqSchema,
  fields: [champ.surtitre, champ.titre],
  defaults: { surtitre: 'Questions', titre: type.titre },
  preremplir: () => ({ surtitre: 'Questions', titre: type.titre }),
  dataSource: { label: 'Les questions', href: '/admin/questions' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Tete surtitre={data.surtitre} titre={data.titre} centre={type.centre ?? true} />
            {rendu(c)}
          </div>
        </section>
      </Enveloppe>
    )
  },
})

export const mExConversationBlock = blocFaq(
  { label: 'Exception — La conversation', description: 'Une fenêtre de messagerie : la question arrive en bulle colorée, trois petits points, puis la réponse. Et la suivante.', titre: 'Vous vous *demandez*' },
  (c) => <Conversation faq={c.faq} nom={c.nom} />,
)
export const mExAccordeonCouleurBlock = blocFaq(
  { label: 'Exception — L’accordéon en couleur', description: 'Chaque question a sa pastille ; ouverte, sa ligne entière prend la couleur et la réponse se déplie.', titre: 'Tout ce qu’il faut *savoir*' },
  (c) => <AccordeonCouleur faq={c.faq} />,
)
export const mExQuestionsDefilantesBlock = blocFaq(
  { label: 'Exception — Les questions qui défilent', description: 'Les questions montent sans fin sur des pastilles ; on en touche une, sa réponse s’affiche sur un bloc de couleur.', titre: 'Ce qu’on *me demande*', centre: false },
  (c) => <QuestionsDefilantes faq={c.faq} />,
)

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS & VIDÉOS
   ══════════════════════════════════════════════════════════════════════ */

const galerieSchema = z.object({ surtitre: t, titre: t, photos: liste })
const blocPhotos = (
  type: { label: string; description: string; titre: string; n: number; aide: string; pleine?: boolean },
  rendu: (photos: Media[]) => React.ReactNode,
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
            <Tete surtitre={data.surtitre} titre={data.titre} centre={!type.pleine} />
            {!type.pleine && rendu(photos)}
          </div>
          {type.pleine && rendu(photos)}
        </section>
      </Enveloppe>
    )
  },
})

export const mExGalerieFocusBlock = blocPhotos(
  { label: 'Exception — La galerie qui fait le point', description: 'Une grille droite : on survole une photo, les autres s’effacent en douceur et sa légende apparaît en pastille.', titre: 'Le cabinet, *en détails*', n: 6, aide: 'Six photos.' },
  (photos) => <GalerieFocus photos={photos} />,
)
export const mExEventailBlock = blocPhotos(
  { label: 'Exception — L’éventail', description: 'Les photos empilées s’ouvrent en éventail, depuis le centre, à mesure qu’on descend.', titre: 'Le cabinet, *pièce par pièce*', n: 7, aide: 'Jusqu’à sept, de gauche à droite.' },
  (photos) => <Eventail photos={photos} />,
)
export const mExFriseBlock = blocPhotos(
  { label: 'Exception — La frise', description: 'Une rangée de photos qui défile très lentement, bords fondus, légendes en pastilles ; survolée, elle s’arrête.', titre: 'Le cabinet, *en lumière*', n: 8, aide: 'Six ou plus.', pleine: true },
  (photos) => <Frise photos={photos} />,
)

/* ══════════════════════════════════════════════════════════════════════
   TEXTES
   ══════════════════════════════════════════════════════════════════════ */

const lectureSchema = z.object({ phrase: t, auteur: t })
export const mExLectureBlock: BlockDefinition<typeof lectureSchema> = {
  ...commun,
  label: 'Exception — La lecture',
  description: 'Une grande phrase dont les mots s’encrent au fil du défilement, comme si on la lisait ; les mots clés se surlignent en couleur.',
  schema: lectureSchema,
  fields: [field.textarea('phrase', 'Phrase', { help: 'Les mots à surligner entre *astérisques*.' }), field.text('auteur', 'Signature')],
  defaults: { phrase: '', auteur: '' },
  preremplir: (c) => ({ phrase: c.citation.texte.replace(/(écoute)/i, '*$1*').replace(/(eux-mêmes)/i, '*$1*'), auteur: c.citation.auteur }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-28 md:py-40">
          <div className={CONTENEUR}>
            <Lecture phrase={data.phrase || c.citation.texte} auteur={data.auteur} />
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
  description: 'Des mots sur des pastilles de couleur, en deux rangées droites qui défilent en sens contraire.',
  schema: etiquettesSchema,
  fields: [champ.surtitre, champ.titre, champ.mots],
  defaults: { surtitre: 'Ce qui m’anime', titre: '', mots: `${MOTS}\nBienveillance\nTemps` },
  preremplir: () => ({ surtitre: 'Ce qui m’anime', titre: '', mots: `${MOTS}\nBienveillance\nTemps` }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <section className="overflow-x-clip py-24 md:py-32">
        <div className={CONTENEUR}>
          <Tete surtitre={data.surtitre} titre={data.titre} centre />
        </div>
        <Etiquettes mots={lignesDe(data.mots)} />
      </section>
    </Enveloppe>
  ),
}

const motSchema = z.object({ surtitre: t, debut: t, mots: t, texte: t })
export const mExMotChangeBlock: BlockDefinition<typeof motSchema> = {
  ...commun,
  label: 'Exception — Le mot qui change',
  description: '« Un lieu pour… » : le dernier mot est sur une pastille dont la couleur change avec lui.',
  schema: motSchema,
  fields: [champ.surtitre, field.text('debut', 'Début de la phrase'), field.textarea('mots', 'Mots qui changent', { help: 'Un mot (ou deux) par ligne.' }), champ.texte],
  defaults: { surtitre: '', debut: 'Un lieu pour', mots: 'respirer\ndéposer\ncomprendre\navancer', texte: '' },
  preremplir: (c) => ({ surtitre: '', debut: 'Un lieu pour', mots: 'respirer\ndéposer\ncomprendre\navancer', texte: c.accroche }),
  Component: ({ data, ctx }) => (
    <Enveloppe ctx={ctx}>
      <section className="py-28 md:py-40">
        <div className={CONTENEUR}>
          {data.surtitre && (
            <div className="flex justify-center">
              <Surtitre>{data.surtitre}</Surtitre>
            </div>
          )}
          <MotQuiChange debut={data.debut || 'Un lieu pour'} mots={lignesDe(data.mots, 'respirer')} />
          {data.texte && (
            <Revele delai={0.3}>
              <p className="mx-auto mt-10 max-w-[46ch] text-center text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
            </Revele>
          )}
        </div>
      </section>
    </Enveloppe>
  ),
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT & RENDEZ-VOUS
   ══════════════════════════════════════════════════════════════════════ */

const contactSchema = z.object({ surtitre: t, titre: t, texte: t })
export const mExFicheContactBlock: BlockDefinition<typeof contactSchema> = {
  ...commun,
  label: 'Exception — La fiche contact',
  description: 'Un bloc, une carte, des lignes avec leur pastille de couleur ; un clic sur le téléphone ou le courriel le copie (« Copié »).',
  schema: contactSchema,
  fields: [champ.surtitre, champ.titre, champ.texte],
  defaults: { surtitre: 'Contact', titre: 'Me *joindre*', texte: '' },
  preremplir: () => ({ surtitre: 'Contact', titre: 'Me *joindre*', texte: 'Un appel, un message : je vous réponds au plus vite.' }),
  dataSource: { label: 'Les coordonnées', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={`${CONTENEUR} grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]`}>
            <div>
              {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
              <h2 className="text-[clamp(34px,4.6vw,60px)]">
                <Lignes lignes={enLignes(data.titre)} />
              </h2>
              {data.texte && (
                <Revele delai={0.2}>
                  <p className="mt-6 max-w-[40ch] text-[16.5px] leading-[1.7] text-[var(--ad-pierre)]">{data.texte}</p>
                </Revele>
              )}
            </div>
            <FicheContact adresse={c.adresse} telephone={c.telephone} email={c.email} acces={c.infoPratique} />
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
  description: 'Sept tuiles de couleur, une par jour ; celle d’aujourd’hui se lève, et l’on sait tout de suite si c’est ouvert.',
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

const appelSchema = z.object({ titre: t, texte: t, bouton: t })
export const mExAppelCouleurBlock: BlockDefinition<typeof appelSchema> = {
  ...commun,
  label: 'Exception — L’appel en couleur',
  description: 'Un grand bloc dont la couleur glisse lentement de teinte en teinte ; le bouton a son halo qui respire.',
  schema: appelSchema,
  fields: [field.textarea('titre', 'Phrase', { help: 'Le mot clé entre *astérisques*.' }), champ.texte, champ.bouton],
  defaults: { titre: 'Prenons le temps d’en *parler*', texte: '', bouton: RDV },
  preremplir: (c) => ({ titre: 'Prenons le temps d’en *parler*', texte: c.accroche, bouton: RDV }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-[1300px] px-[4vw]">
            <AppelCouleur titre={data.titre || 'Prenons le temps d’en *parler*'} texte={data.texte} libelle={data.bouton || RDV} href={c.rdv} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/** Les modèles d'exception, par catégorie (l'ordre de la vitrine). */
export const EXCEPTION_PAR_CATEGORIE = [
  { categorie: 'Ouverture', types: ['mExTuiles', 'mExSurligne', 'mExFenetre'] },
  { categorie: 'Qui je suis', types: ['mExCarteVisite', 'mExChiffresCouleur', 'mExMosaique'] },
  { categorie: 'Ma méthode', types: ['mExCoche', 'mExOnglets', 'mExPileCouleurs'] },
  { categorie: 'Accompagnements', types: ['mExCartesCouleur', 'mExListeDefilante', 'mExSelecteur'] },
  { categorie: 'Questions', types: ['mExConversation', 'mExAccordeonCouleur', 'mExQuestionsDefilantes'] },
  { categorie: 'Photos & vidéos', types: ['mExGalerieFocus', 'mExEventail', 'mExFrise'] },
  { categorie: 'Textes', types: ['mExLecture', 'mExEtiquettes', 'mExMotChange'] },
  { categorie: 'Contact & rendez-vous', types: ['mExFicheContact', 'mExSemaine', 'mExAppelCouleur'] },
] as const

export const MODELES_EXCEPTION = EXCEPTION_PAR_CATEGORIE.flatMap((g) => g.types)
