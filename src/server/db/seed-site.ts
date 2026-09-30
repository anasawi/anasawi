import './load-env'

import { eq } from 'drizzle-orm'

import { db } from './index'
import {
  faqItems,
  media,
  pages,
  sections,
  seoMeta,
  services,
  settings,
  type OpeningHour,
} from './schema'

/**
 * Remplit TOUT le site — l'accueil, page unique — avec de vrais textes
 * et une photothèque d'attente.
 *
 *   npm run db:seed-site
 *
 * Ce que fait le script, dans l'ordre :
 *
 *   1. Médias      — seize photographies d'attente (Unsplash), une ligne
 *                    par image, retrouvées par `pathname` (pas de doublon).
 *   2. Réglages    — coordonnées réelles, horaires, SEO par défaut, menu.
 *   3. Accompagnements & FAQ — remplacés à l'identique.
 *   4. Accueil     — sections remplacées, SEO posé. Le site est une page
 *                    unique : « À propos », « Approche », « Le cabinet »
 *                    sont des sections, atteintes par ancre.
 *
 * RELANÇABLE SANS RISQUE : chaque exécution remet le même contenu en place.
 * L'accueil est retrouvé par `isHome`, les médias par leur chemin, les
 * réglages par leur singleton.
 *
 * RIEN N'EST PUBLIÉ : le statut et l'instantané publié de l'accueil ne
 * sont pas touchés. Le site public continue d'afficher ce qu'il
 * affichait ; le nouveau contenu s'ouvre dans l'éditeur, pour relecture,
 * puis « Publier ».
 *
 * Il remplace `seed-home.ts` (qui ne traitait que l'accueil).
 */

/* ════════════════════════════════════════════════════════════════════
   Fonds de section — hexadécimaux de la charte (`globals.css`).
   ════════════════════════════════════════════════════════════════════ */

const IVORY = '#fbf8f2'
const CREAM = '#f8f4ea'
const SAND = '#f4eee3'

/* ════════════════════════════════════════════════════════════════════
   1. Photothèque d'attente
   ════════════════════════════════════════════════════════════════════ */

/* Chaque `alt` se termine par « photo d’attente » : la mention est visible
   dans la bibliothèque et rappelle qu'il faut remplacer l'image. */

type Photo = {
  key: string
  unsplashId: string
  orientation: 'portrait' | 'paysage'
  alt: string
  caption: string
}

const PHOTOS = [
  {
    key: 'cabinet-fauteuil',
    unsplashId: '1628528132630-f50513dc2743',
    orientation: 'portrait',
    alt: 'Fauteuil près d’une fenêtre, dans une lumière douce — photo d’attente',
    caption: 'Le fauteuil',
  },
  {
    key: 'cabinet-salon',
    unsplashId: '1774477178005-bff823e43be8',
    orientation: 'paysage',
    alt: 'Pièce chaleureuse, bois clair et grande fenêtre — photo d’attente',
    caption: 'Le salon',
  },
  {
    key: 'cabinet-assise',
    unsplashId: '1739980153522-23e9fbca080b',
    orientation: 'portrait',
    alt: 'Fauteuil crème dans un intérieur calme — photo d’attente',
    caption: 'L’assise',
  },
  {
    key: 'cabinet-clair',
    unsplashId: '1583847268964-b28dc8f51f92',
    orientation: 'paysage',
    alt: 'Canapé clair dans une pièce lumineuse — photo d’attente',
    caption: 'La pièce',
  },
  {
    key: 'cabinet-plante',
    unsplashId: '1502672260266-1c1ef2d93688',
    orientation: 'portrait',
    alt: 'Assise et plante verte, coin de lecture — photo d’attente',
    caption: 'Le coin lecture',
  },
  {
    key: 'detail-vase',
    unsplashId: '1533090161767-e6ffed986c88',
    orientation: 'portrait',
    alt: 'Mur blanc, vase et plante, détail calme — photo d’attente',
    caption: 'Détail',
  },
  {
    key: 'cabinet-lampe',
    unsplashId: '1506377295352-e3154d43ea9e',
    orientation: 'paysage',
    alt: 'Canapé gris et lampe, lumière tamisée — photo d’attente',
    caption: 'La lampe',
  },
  {
    key: 'plante-pot',
    unsplashId: '1582195221531-d190eb9e6406',
    orientation: 'portrait',
    alt: 'Grande plante verte dans un pot, contre un mur clair — photo d’attente',
    caption: 'La plante',
  },
  {
    key: 'lumiere-fenetre',
    unsplashId: '1648382328457-3738f7f528a6',
    orientation: 'portrait',
    alt: 'Lumière douce qui entre par la fenêtre — photo d’attente',
    caption: 'La lumière',
  },
  {
    key: 'lumiere-soir',
    unsplashId: '1698767747188-22daa33ea9e5',
    orientation: 'portrait',
    alt: 'Lampe allumée, lumière chaude du soir — photo d’attente',
    caption: 'Le soir',
  },
  {
    key: 'entree-porte',
    unsplashId: '1503898362-59e068e7f9d8',
    orientation: 'portrait',
    alt: 'Porte en bois entourée de plantes — photo d’attente',
    caption: 'L’entrée',
  },
  {
    key: 'jardin-allee',
    unsplashId: '1563714193017-5a5fb60bc02b',
    orientation: 'portrait',
    alt: 'Allée de jardin bordée de verdure — photo d’attente',
    caption: 'Le jardin',
  },
  {
    key: 'portrait-anne',
    unsplashId: '1506863530036-1efeddceb993',
    orientation: 'portrait',
    alt: 'Portrait de femme en noir et blanc, regard doux — photo d’attente, à remplacer par le portrait d’Anne Winzenried',
    caption: 'Anne Winzenried',
  },
  {
    key: 'portrait-exterieur',
    unsplashId: '1524550158212-33f2ff985344',
    orientation: 'portrait',
    alt: 'Femme en extérieur, lumière naturelle — photo d’attente, à remplacer par une photographie d’Anne Winzenried',
    caption: 'En extérieur',
  },
  {
    key: 'the-mains',
    unsplashId: '1512917602760-97a8fb80dca5',
    orientation: 'paysage',
    alt: 'Tasse de thé tenue à deux mains — photo d’attente',
    caption: 'Le thé',
  },
  {
    key: 'the-pose',
    unsplashId: '1621850204256-a84f9acbc5e9',
    orientation: 'paysage',
    alt: 'Tasse de thé posée, moment suspendu — photo d’attente',
    caption: 'Un moment',
  },
] as const satisfies readonly Photo[]

type PhotoKey = (typeof PHOTOS)[number]['key']

function unsplashUrl(photo: Photo): string {
  const width = photo.orientation === 'portrait' ? 1400 : 1800
  return `https://images.unsplash.com/photo-${photo.unsplashId}?auto=format&fit=crop&w=${width}&q=80`
}

/** Dimensions plausibles — le rendu impose de toute façon son ratio. */
function dimensions(photo: Photo): { width: number; height: number } {
  return photo.orientation === 'portrait'
    ? { width: 1400, height: 1867 }
    : { width: 1800, height: 1200 }
}

const mediaIds = new Map<PhotoKey, string>()

/** Identifiant du média d'une clé — lève si le média n'a pas été créé. */
function img(key: PhotoKey): string {
  const id = mediaIds.get(key)
  if (!id) throw new Error(`Média introuvable : ${key}`)
  return id
}

/** Crée ou met à jour le média, retrouvé par `pathname`. */
async function upsertMedia(photo: Photo): Promise<string> {
  const pathname = `attente/${photo.key}`
  const { width, height } = dimensions(photo)
  const values = {
    url: unsplashUrl(photo),
    filename: `${photo.key}.jpg`,
    alt: photo.alt,
    caption: photo.caption,
    width,
    height,
    mimeType: 'image/jpeg',
    size: 0,
  }

  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(eq(media.pathname, pathname))
    .limit(1)

  if (existing) {
    await db
      .update(media)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(media.id, existing.id))
    return existing.id
  }

  const [created] = await db
    .insert(media)
    .values({ ...values, pathname })
    .returning({ id: media.id })

  if (!created) throw new Error(`Création impossible : ${photo.key}`)
  return created.id
}

/* ════════════════════════════════════════════════════════════════════
   2. Pages & sections — utilitaires
   ════════════════════════════════════════════════════════════════════ */

type SectionSeed = {
  type: string
  backgroundColor: string
  payload: Record<string, unknown>
  anchor?: string
  navLabel?: string
  showInNav?: boolean
  name?: string
}

type PageSeed = {
  slug: string
  title: string
  seo: { title: string; description: string; keywords: string[] }
  sections: SectionSeed[]
}

type PageRow = { id: string; title: string; status: 'draft' | 'published' }

/**
 * Retrouve l'accueil (`isHome`), ou le crée en brouillon. Le statut et
 * l'instantané publié d'un accueil existant ne sont jamais modifiés.
 */
async function ensurePage(seed: PageSeed): Promise<PageRow> {
  const columns = { id: pages.id, title: pages.title, status: pages.status }

  const [home] = await db
    .select(columns)
    .from(pages)
    .where(eq(pages.isHome, true))
    .limit(1)
  if (home) return home

  const [created] = await db
    .insert(pages)
    .values({
      slug: seed.slug,
      title: seed.title,
      status: 'draft',
      isHome: true,
    })
    .returning(columns)

  if (!created) throw new Error(`Création impossible : page « ${seed.slug} »`)
  console.log('  (créée en brouillon)')
  return created
}

async function writePage(seed: PageSeed): Promise<void> {
  console.log(`→ Page « ${seed.title} » (/${seed.slug})`)
  const page = await ensurePage(seed)

  await db.delete(sections).where(eq(sections.pageId, page.id))
  await db.insert(sections).values(
    seed.sections.map((section, index) => ({
      pageId: page.id,
      type: section.type,
      anchor: section.anchor ?? null,
      navLabel: section.navLabel ?? null,
      showInNav: section.showInNav ?? false,
      name: section.name ?? null,
      sortOrder: index,
      isActive: true,
      backgroundColor: section.backgroundColor,
      payload: section.payload,
    })),
  )

  const seo = {
    title: seed.seo.title,
    description: seed.seo.description,
    keywords: seed.seo.keywords,
    ogMediaId: img('cabinet-fauteuil'),
  }
  await db
    .insert(seoMeta)
    .values({ pageId: page.id, ...seo })
    .onConflictDoUpdate({
      target: seoMeta.pageId,
      set: { ...seo, updatedAt: new Date() },
    })

  console.log(
    `  ${seed.sections.length} sections · ${page.status === 'published' ? 'publiée (instantané intact)' : 'brouillon'}`,
  )
}

/* ════════════════════════════════════════════════════════════════════
   3. Contenus transverses
   ════════════════════════════════════════════════════════════════════ */

const OPENING_HOURS: OpeningHour[] = [
  { day: 'Lundi', hours: '9 h – 19 h' },
  { day: 'Mardi', hours: '9 h – 19 h' },
  { day: 'Mercredi', hours: '9 h – 17 h' },
  { day: 'Jeudi', hours: '9 h – 19 h' },
  { day: 'Vendredi', hours: '9 h – 17 h' },
  { day: 'Samedi', hours: 'Le matin, sur demande' },
  { day: 'Dimanche', hours: 'Fermé' },
]

/** Ce que le contenu affirme et qu'Anne doit confirmer. */
const TO_REVIEW = [
  'Horaires d’ouverture (Réglages) — créneaux plausibles, à ajuster.',
  'Accès au cabinet (Réglages « Bon à savoir ») — stationnement, bus, sonnette : à confirmer.',
  'Chiffres : « 15 ans de pratique », « 400+ personnes accompagnées », « réponse sous 48 h ».',
  'FAQ « Thérapeute, psychologue, psychiatre » — la description du statut de thérapeute doit correspondre au titre réel.',
  'FAQ « Remboursement » — mention des mutuelles, à vérifier.',
  'Témoignages — s’assurer d’avoir l’accord des personnes citées.',
]

async function writeSettings(): Promise<void> {
  console.log('→ Réglages du site')

  const values = {
    siteName: 'ANASAWI',
    practitionerName: 'Anne Winzenried',
    practitionerTitle: 'Thérapeute',
    tagline:
      'Un espace stable et confidentiel pour déposer ce qui pèse — à Cesson-Sévigné et en visio.',
    contactEmail: 'annewinzenried@orange.fr',
    contactPhone: '06 70 89 44 97',
    addressStreet: '6 rue Saint-Martin',
    addressPostalCode: '35510',
    addressCity: 'Cesson-Sévigné',
    addressCountry: 'FR',
    openingHours: OPENING_HOURS,
    practicalInfo:
      'Stationnement facile dans les rues alentour. Le cabinet est desservi par le réseau de bus rennais — je vous indique l’arrêt le plus proche lors de la prise de rendez-vous. Séances en visio possibles.',
    defaultSeoTitle: 'Anne Winzenried — Thérapeute à Cesson-Sévigné | ANASAWI',
    defaultSeoDescription:
      'Anne Winzenried, thérapeute à Cesson-Sévigné, près de Rennes. Thérapie individuelle, accompagnement des adolescents et du deuil. Au cabinet ou en visio, dans un cadre stable et confidentiel.',
    defaultOgMediaId: img('cabinet-fauteuil'),
    navigation: [
      /* Le site est une page unique : la navigation pointe vers les ancres
         des sections, pas vers des pages qui n'existent pas. */
      { label: 'À propos', href: '#a-propos' },
      { label: 'Accompagnements', href: '#accompagnements' },
      { label: 'Approche', href: '#approche' },
      { label: 'Le cabinet', href: '#cabinet' },
      { label: 'Questions', href: '#questions' },
    ],
  }

  await db
    .insert(settings)
    .values({ id: 'singleton', socialLinks: [], ...values })
    .onConflictDoUpdate({
      target: settings.id,
      set: { ...values, updatedAt: new Date() },
    })
}

async function writeServices(): Promise<void> {
  console.log('→ Accompagnements')
  await db.delete(services)
  await db.insert(services).values([
    {
      title: 'Thérapie individuelle',
      slug: 'therapie-individuelle',
      excerpt:
        'Une heure, chaque semaine ou tous les quinze jours, pour démêler ce qui s’est noué.',
      body: 'Vous ne savez pas toujours par où commencer — et ce n’est pas grave. La thérapie individuelle est un espace régulier et confidentiel où déposer ce qui pèse : l’anxiété qui ne lâche pas, une séparation, un épuisement, une blessure ancienne qui refait surface, ou simplement le sentiment de ne plus s’y retrouver.\n\nNous avançons à votre rythme, sans grille imposée. La parole, le silence et le corps y ont chacun leur place. Les séances se tiennent au cabinet, à Cesson-Sévigné, ou en visio lorsque la distance ou l’emploi du temps le demandent.',
      duration: '1 h · 60 € — au cabinet ou en visio',
      mediaId: img('cabinet-fauteuil'),
      sortOrder: 0,
      isActive: true,
    },
    {
      title: 'Adolescents',
      slug: 'adolescents',
      excerpt: 'Quarante-cinq minutes, un lieu à soi où déposer ce qui déborde.',
      body: 'L’adolescence est un âge où tout se déplace en même temps — le corps, les amitiés, la place dans la famille, le regard sur soi. Il arrive que cela déborde : au collège, au lycée, à la maison, ou en silence, derrière une porte fermée.\n\nJe propose aux adolescents un cadre plus court et plus souple, sans jugement, où parler à quelqu’un qui n’est ni un parent ni un professeur. Les parents sont associés lorsque c’est utile, toujours avec l’accord du jeune : c’est la condition pour que la confiance s’installe.',
      duration: '45 min · 50 €',
      mediaId: img('cabinet-assise'),
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Accompagnement du deuil',
      slug: 'accompagnement-du-deuil',
      excerpt:
        'Traverser l’absence, à son rythme, sans injonction à « aller mieux ».',
      body: 'Le deuil ne se « surmonte » pas sur commande, et il n’a pas de calendrier. Il y a la sidération des premières semaines, puis les vagues qui reviennent quand on ne les attend plus — un anniversaire, une chanson, une odeur.\n\nSéance après séance, nous faisons de la place à l’absence, aux souvenirs, à la colère parfois, et à ce qui continue malgré tout. Sans étape obligée, sans durée fixée d’avance. Cet accompagnement s’adresse aussi à celles et ceux qui portent un deuil ancien, jamais vraiment déposé.',
      duration: '1 h · 60 €',
      mediaId: img('lumiere-fenetre'),
      sortOrder: 2,
      isActive: true,
    },
  ])
}

async function writeFaq(): Promise<void> {
  console.log('→ Questions fréquentes')
  await db.delete(faqItems)
  const items = [
    {
      question: 'Comment se passe la première séance ?',
      answer:
        'On fait connaissance, simplement. Vous racontez ce qui vous amène — dans l’ordre ou le désordre — et nous voyons ensemble si le cadre vous convient. Il n’y a rien à préparer : venir suffit. À la fin, nous décidons s’il y a une suite, et à quel rythme.',
    },
    {
      question: 'Faut-il venir chaque semaine ?',
      answer:
        'Le rythme se décide ensemble, selon ce que vous traversez. Une séance par semaine au début, souvent, le temps que quelque chose se pose ; puis tous les quinze jours, dès que c’est juste. Rien n’est figé : on en reparle chaque fois que c’est nécessaire.',
    },
    {
      question: 'Les séances sont-elles remboursées ?',
      answer:
        'Les séances ne sont pas prises en charge par la Sécurité sociale, mais de nombreuses mutuelles remboursent plusieurs séances par an au titre des médecines douces ou de la psychothérapie. Le plus simple est de poser la question à la vôtre — une facture vous est fournie sur demande.',
    },
    {
      question: 'Ce que je dis reste-t-il confidentiel ?',
      answer:
        'Absolument. Rien de ce qui se dit au cabinet n’en sort — c’est la condition de tout le reste. Cela vaut aussi pour les adolescents vis-à-vis de leurs parents, dans le cadre que nous posons ensemble dès la première rencontre.',
    },
    {
      question: 'Peut-on faire les séances en visio ?',
      answer:
        'Oui. Certaines personnes alternent cabinet et visio, d’autres travaillent entièrement à distance, parce qu’elles habitent loin ou voyagent. Le cadre reste le même : un rendez-vous fixe, un espace confidentiel, une présence entière. Il suffit d’un endroit calme où vous ne serez pas dérangé·e.',
    },
    {
      question: 'Combien de temps dure un suivi ?',
      answer:
        'Il n’y a pas de règle. Certaines traversées demandent quelques séances, d’autres s’étendent sur une ou deux années. Nous faisons le point régulièrement, et l’on s’arrête quand vous vous sentez prêt·e — jamais brusquement, toujours en en parlant.',
    },
    {
      question: 'Thérapeute, psychologue, psychiatre : quelle différence ?',
      answer:
        'Le psychiatre est un médecin : il pose un diagnostic et peut prescrire un traitement. Le psychologue est titulaire d’un diplôme universitaire de psychologie. En tant que thérapeute, je propose un accompagnement par la parole et la relation, sans prescription ni diagnostic médical — et je travaille en lien avec votre médecin lorsque c’est nécessaire.',
    },
    {
      question: 'Comment savoir si c’est le bon moment ?',
      answer:
        'Si vous vous posez la question, c’est souvent que quelque chose demande à être entendu. Il n’est pas nécessaire d’aller « très mal » pour consulter : une première séance permet simplement de faire le point, sans engagement pour la suite.',
    },
  ]
  await db.insert(faqItems).values(
    items.map((item, index) => ({ ...item, sortOrder: index, isActive: true })),
  )
}

/* ════════════════════════════════════════════════════════════════════
   4. Les pages — contenus
   ════════════════════════════════════════════════════════════════════ */

function homePage(): PageSeed {
  return {
    slug: 'accueil',
    title: 'Accueil',
    seo: {
      title: 'Anne Winzenried — Thérapeute à Cesson-Sévigné | ANASAWI',
      description:
        'Anne Winzenried, thérapeute à Cesson-Sévigné, près de Rennes. Un espace stable et confidentiel pour déposer ce qui pèse — et avancer à votre rythme. Au cabinet ou en visio.',
      keywords: [
        'Anne Winzenried',
        'thérapeute Cesson-Sévigné',
        'thérapie Rennes',
        'accompagnement deuil',
        'thérapie adolescents',
        'ANASAWI',
      ],
    },
    sections: [
      /* A — Hero : l'arche, le titre qui l'enlace. */
      {
        type: 'heroPleinEcran',
        anchor: 'accueil',
        navLabel: 'Accueil',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Thérapie — Cesson-Sévigné & visio',
          titleLines: [{ text: 'Retrouver' }, { text: '*son souffle.*' }],
          intro:
            'Un espace stable et confidentiel pour déposer ce qui pèse — et avancer à votre rythme.',
          primaryLabel: 'Prendre rendez-vous',
          primaryHref: '#contact',
          secondaryLabel: 'Découvrir l’approche',
          secondaryHref: '#approche',
          mediaId: img('cabinet-fauteuil'),
        },
      },
      /* B — Bandeau : les mots-souffle. */
      {
        type: 'bandeauRespirer',
        backgroundColor: SAND,
        payload: {
          words: 'respirer, déposer, traverser, s’apaiser',
          tone: 'sable',
          speed: 'normal',
        },
      },
      /* D — À propos : arche portrait, compteurs. */
      {
        type: 'aproposPortrait',
        anchor: 'a-propos',
        navLabel: 'À propos',
        showInNav: true,
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Qui je suis',
          title:
            'Quinze ans à accueillir ce qui vient — les silences comme les débordements — *sans jamais juger*.',
          intro:
            'Je suis Anne Winzenried, thérapeute à Cesson-Sévigné, près de Rennes.',
          body: 'J’accompagne adultes et adolescents dans les traversées de la vie : deuils, séparations, épuisements, transitions — et tout ce qui n’a pas encore de nom.\n\nMon cabinet ressemble à une maison. On y vient comme on est, on y dépose ce qui pèse, et l’on repart un peu plus léger — pas parce que tout est résolu, mais parce qu’on a été entendu.',
          signature: 'Anne Winzenried',
          mediaId: img('portrait-anne'),
          stats: [
            { value: 15, suffix: '', label: 'ans de pratique' },
            { value: 400, suffix: '+', label: 'personnes accompagnées' },
            { value: 48, suffix: ' h', label: 'pour une première réponse' },
          ],
          linkLabel: 'Mon parcours',
          linkHref: '#a-propos',
        },
      },
      /* F — Accompagnements : les rangées. */
      {
        type: 'servicesListe',
        anchor: 'accompagnements',
        navLabel: 'Accompagnements',
        showInNav: true,
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Trois manières de commencer',
          title: 'Des chemins *différents*, une même écoute.',
          intro:
            'Adultes, adolescents, personnes endeuillées : trois cadres pensés pour trois façons de traverser. Au cabinet ou en visio.',
        },
      },
      /* H — Manifeste : la conviction. */
      {
        type: 'manifeste',
        anchor: 'approche',
        navLabel: 'Approche',
        showInNav: true,
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'Ma conviction',
          title:
            'On ne répare pas les gens. On les écoute, jusqu’à ce qu’ils *s’entendent* à nouveau eux-mêmes.',
          body: 'Je ne crois pas aux méthodes qu’on applique de l’extérieur. Je crois à une présence stable, à un cadre qui tient, et au temps qu’il faut pour que la parole retrouve son chemin.',
        },
      },
      /* E — Le lieu : deux arches sœurs. */
      {
        type: 'lieuArches',
        anchor: 'cabinet',
        navLabel: 'Le cabinet',
        showInNav: true,
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Le lieu',
          titleLines: [
            { text: 'Un cabinet qui ressemble' },
            { text: 'à une *maison*.' },
          ],
          text: 'Pas de blouse blanche, pas de divan intimidant. Un fauteuil, du thé, et le temps qu’il faut.',
          caption: 'Le cabinet — rue Saint-Martin, Cesson-Sévigné',
          linkLabel: 'Voir le lieu',
          linkHref: '#cabinet',
          mediaId: img('cabinet-salon'),
          secondMediaId: img('cabinet-assise'),
        },
      },
      /* L — Le médaillon : le chiffre 15 sous sa couronne. */
      {
        type: 'aproposMedaillon',
        backgroundColor: SAND,
        payload: {
          value: 15,
          unit: 'années',
          ring: 'quinze années d’écoute · quinze années de présence · ',
          title: 'années à accompagner ce qui *déborde*.',
          text: 'Deuils, séparations, épuisements, transitions — et tout ce qui n’a pas encore de nom.',
        },
      },
      /* G — La galerie d'arches : les légendes viennent des médias. */
      {
        type: 'galerieArches',
        anchor: 'images',
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'Le cabinet, en images',
          mediaIds: [
            img('entree-porte'),
            img('cabinet-fauteuil'),
            img('lumiere-fenetre'),
            img('detail-vase'),
            img('jardin-allee'),
          ],
        },
      },
      /* N — Questions. */
      {
        type: 'faqEditoriale',
        anchor: 'questions',
        navLabel: 'Questions',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Questions fréquentes',
          title: 'Avant de *venir*.',
          intro:
            'Les réponses aux questions qui reviennent le plus souvent avant une première séance. Pour tout le reste, écrivez-moi.',
        },
      },
      /* K — Contact : la grande arche bleu profond. */
      {
        type: 'contactMinimal',
        anchor: 'contact',
        navLabel: 'Contact',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Contact',
          title: 'On *commence* quand vous voulez.',
          text: 'Un mail, un appel, un message : je vous réponds sous 48 h, en toute confidentialité.',
          showAddress: true,
          showHours: false,
          showBooking: true,
          bookingLabel: 'Prendre rendez-vous',
        },
      },
    ],
  }
}

async function main() {
  console.log('ANASAWI — remplissage complet du site\n')

  /* 1. Médias */
  console.log('→ Photothèque d’attente')
  for (const photo of PHOTOS) {
    const id = await upsertMedia(photo)
    mediaIds.set(photo.key, id)
    console.log(`  · ${photo.key}`)
  }

  /* 2. Transverses */
  await writeSettings()
  await writeServices()
  await writeFaq()

  /* 3. L'accueil */
  const accueil = homePage()
  await writePage(accueil)

  /* 4. Bilan */
  console.log(
    `\n✓ Site rempli : ${accueil.sections.length} sections, 3 accompagnements, 8 questions, ${PHOTOS.length} médias.`,
  )
  console.log(
    '  Rien n’a été publié — relisez l’accueil dans l’éditeur, puis « Publier ».',
  )
  console.log(
    '\n  Photos d’attente (Unsplash) — remplacez-les depuis /admin/medias dès que les photographies d’Anne sont disponibles.',
  )
  console.log('\n  À relire par Anne :')
  for (const item of TO_REVIEW) console.log(`   – ${item}`)
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('✗ Seed du site impossible :', error)
    process.exit(1)
  })
