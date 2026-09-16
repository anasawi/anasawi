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
 * Remplit TOUT le site — accueil et pages secondaires — avec de vrais
 * textes et une photothèque d'attente.
 *
 *   npm run db:seed-site
 *
 * Ce que fait le script, dans l'ordre :
 *
 *   1. Médias      — seize photographies d'attente (Unsplash), une ligne
 *                    par image, retrouvées par `pathname` (pas de doublon).
 *   2. Réglages    — coordonnées réelles, horaires, SEO par défaut, menu.
 *   3. Accompagnements & FAQ — remplacés à l'identique.
 *   4. Pages       — accueil, À propos, Accompagnements, Mon approche,
 *                    Le cabinet, Contact : sections remplacées, SEO posé.
 *
 * RELANÇABLE SANS RISQUE : chaque exécution remet le même contenu en place.
 * Les pages existantes sont réutilisées par leur slug, les médias par leur
 * chemin, les réglages par leur singleton.
 *
 * RIEN N'EST PUBLIÉ : les nouvelles pages naissent en brouillon, le statut
 * et l'instantané publié des pages existantes ne sont pas touchés. Le site
 * public continue d'afficher ce qu'il affichait ; les nouveaux contenus
 * s'ouvrent dans l'éditeur, pour relecture, puis « Publier ».
 *
 * Il remplace `seed-home.ts` (qui ne traitait que l'accueil).
 */

/* ════════════════════════════════════════════════════════════════════
   Fonds de section — hexadécimaux de la charte (`globals.css`).
   ════════════════════════════════════════════════════════════════════ */

const IVORY = '#fbf8f2'
const CREAM = '#f8f4ea'
const SAND = '#f4eee3'
const MIST = '#eaf1f4'
const NIGHT = '#2e424f'

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
  isHome?: boolean
  seo: { title: string; description: string; keywords: string[] }
  sections: SectionSeed[]
}

type PageRow = { id: string; title: string; status: 'draft' | 'published' }

/**
 * Retrouve la page (par `isHome` pour l'accueil, par `slug` sinon) ou la
 * crée en brouillon. Le statut et l'instantané publié d'une page
 * existante ne sont jamais modifiés.
 */
async function ensurePage(seed: PageSeed): Promise<PageRow> {
  const columns = { id: pages.id, title: pages.title, status: pages.status }

  if (seed.isHome) {
    const [home] = await db
      .select(columns)
      .from(pages)
      .where(eq(pages.isHome, true))
      .limit(1)
    if (home) return home
  }

  const [bySlug] = await db
    .select(columns)
    .from(pages)
    .where(eq(pages.slug, seed.slug))
    .limit(1)

  if (bySlug) {
    await db
      .update(pages)
      .set({ title: seed.title, updatedAt: new Date() })
      .where(eq(pages.id, bySlug.id))
    return { ...bySlug, title: seed.title }
  }

  const [created] = await db
    .insert(pages)
    .values({
      slug: seed.slug,
      title: seed.title,
      status: 'draft',
      isHome: seed.isHome ?? false,
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
    ogMediaId: seed.isHome ? img('cabinet-fauteuil') : img('cabinet-salon'),
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
      { label: 'À propos', href: '/a-propos' },
      { label: 'Accompagnements', href: '/accompagnements' },
      { label: 'Approche', href: '/approche' },
      { label: 'Le cabinet', href: '/le-cabinet' },
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
    isHome: true,
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
          linkHref: '/a-propos',
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
          linkHref: '/le-cabinet',
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
      /* I — La parole : fond nuit. */
      {
        type: 'temoignageGrand',
        backgroundColor: NIGHT,
        payload: {
          quote: 'Le courage, c’est de demander *de l’aide*.',
          author: 'Une patiente, accompagnée deux ans',
        },
      },
      /* J — Trois voix. */
      {
        type: 'temoignagesMultiples',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Ils en parlent',
          title: 'Ce qu’ils en *gardent*.',
          items: [
            {
              quote: 'J’ai retrouvé un sol sous mes pieds.',
              name: 'M.',
              role: 'accompagnée deux ans',
            },
            {
              quote: 'Une écoute qui ne juge jamais, qui n’attend rien.',
              name: 'S.',
              role: '41 ans',
            },
            {
              quote: 'Mon fils a recommencé à parler.',
              name: 'Une maman',
              role: 'accompagnement d’un adolescent',
            },
          ],
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

function aboutPage(): PageSeed {
  return {
    slug: 'a-propos',
    title: 'À propos',
    seo: {
      title: 'À propos — Anne Winzenried, thérapeute à Cesson-Sévigné',
      description:
        'Qui est Anne Winzenried : quinze années d’écoute, un parcours, des engagements. Thérapeute à Cesson-Sévigné, près de Rennes, pour adultes et adolescents.',
      keywords: ['Anne Winzenried', 'thérapeute', 'parcours', 'Cesson-Sévigné'],
    },
    sections: [
      {
        type: 'heroEditorial',
        anchor: 'a-propos',
        navLabel: 'À propos',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'À propos',
          titleLines: [
            { text: 'Je m’appelle' },
            { text: '*Anne Winzenried.*' },
          ],
          intro:
            'Thérapeute à Cesson-Sévigné, j’accompagne depuis quinze ans des adultes et des adolescents dans les moments où la vie se dérobe — et dans ceux, plus discrets, où l’on cherche simplement à se retrouver.',
          note: 'Cabinet à Cesson-Sévigné · séances en visio',
          mediaId: img('portrait-anne'),
        },
      },
      {
        type: 'aproposAsymetrique',
        anchor: 'histoire',
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'D’où je viens',
          title: 'Écouter, avant tout, a été une *évidence* — puis un métier.',
          statValue: '15',
          statLabel: 'années de pratique',
          body: 'Avant d’ouvrir ce cabinet, j’ai longtemps été celle vers qui l’on venait parler. Ce n’était pas un rôle choisi : les gens s’asseyaient, et quelque chose se déposait. J’ai fini par comprendre que cette place demandait une formation, un cadre, une éthique — et j’en ai fait mon métier.\n\nLa thérapie, telle que je la pratique, n’est pas une technique appliquée de l’extérieur. C’est une relation, dans un cadre stable, où l’on peut dire ce qui n’a jamais été dit, et l’entendre autrement.',
          secondBody:
            'Je me forme encore, régulièrement, parce que chaque personne qui pousse la porte m’apprend quelque chose que les livres n’avaient pas prévu. Et je suis moi-même accompagnée, en supervision : on n’écoute bien que si l’on est écouté quelque part.',
          mediaId: img('portrait-exterieur'),
        },
      },
      {
        type: 'aproposParcours',
        anchor: 'parcours',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Le parcours',
          title: 'Quelques *étapes*, dans l’ordre.',
          intro:
            'Un chemin qui ne va pas tout droit — comme la plupart des chemins qui mènent à ce métier.',
          steps: [
            {
              year: 'Avant',
              title: 'Une première vie professionnelle',
              text: 'Des années au contact des autres, dans un tout autre domaine, où j’ai appris à écouter avant d’apprendre à accompagner.',
            },
            {
              year: 'Formation',
              title: 'Se former à l’accompagnement',
              text: 'Plusieurs années de formation à la relation d’aide et à la psychothérapie, complétées par un travail personnel approfondi et une supervision régulière.',
            },
            {
              year: 'Installation',
              title: 'Le cabinet de Cesson-Sévigné',
              text: 'L’ouverture d’un lieu qui ressemble à une maison, rue Saint-Martin — un fauteuil, du thé, une lumière douce — pour recevoir adultes et adolescents.',
            },
            {
              year: 'Aujourd’hui',
              title: 'Quinze années d’écoute',
              text: 'Plus de quatre cents personnes accompagnées, au cabinet et en visio. Une pratique qui continue de s’affiner, séance après séance.',
            },
          ],
        },
      },
      {
        type: 'aproposCitation',
        backgroundColor: SAND,
        payload: {
          quote:
            'Je ne cherche pas à comprendre plus vite que vous. Je cherche à rester là, le temps que ça prend.',
          name: 'Anne Winzenried',
          role: 'Thérapeute',
          mediaId: img('the-mains'),
        },
      },
      {
        type: 'chiffresClefs',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'En quelques chiffres',
          title: 'Ce que *quinze ans* veulent dire.',
          items: [
            { value: 15, suffix: '', label: 'années de pratique' },
            { value: 400, suffix: '+', label: 'personnes accompagnées' },
            { value: 48, suffix: ' h', label: 'pour une première réponse' },
            { value: 2, suffix: '', label: 'façons de se voir : cabinet ou visio' },
          ],
        },
      },
      {
        type: 'engagements',
        anchor: 'engagements',
        backgroundColor: MIST,
        payload: {
          eyebrow: 'Mes engagements',
          title: 'Ce à quoi je *tiens*.',
          items: [
            {
              title: 'La confidentialité',
              text: 'Rien de ce qui se dit au cabinet n’en sort. C’est la condition de tout le reste, et elle ne souffre aucune exception.',
            },
            {
              title: 'Le non-jugement',
              text: 'Vous pouvez tout dire — la colère, la honte, ce que vous n’avez jamais osé. Je n’attends rien de vous, sinon que vous soyez là.',
            },
            {
              title: 'Le rythme de chacun',
              text: 'Il n’y a pas de calendrier. On avance quand c’est possible, on ralentit quand c’est nécessaire, on s’arrête quand vous êtes prêt·e.',
            },
            {
              title: 'La supervision',
              text: 'Ma pratique est régulièrement relue avec un superviseur. C’est ma garantie — et la vôtre — que je reste à ma place.',
            },
          ],
        },
      },
      {
        type: 'appelDoux',
        backgroundColor: IVORY,
        payload: {
          title: 'Si quelque chose ici vous *parle*.',
          text: 'Un premier échange ne vous engage à rien. Écrivez-moi, ou appelez : nous verrons ensemble si le cadre vous convient.',
          label: 'Prendre contact',
          href: '/contact',
        },
      },
    ],
  }
}

function servicesPage(): PageSeed {
  return {
    slug: 'accompagnements',
    title: 'Accompagnements',
    seo: {
      title: 'Accompagnements — Thérapie individuelle, adolescents, deuil | ANASAWI',
      description:
        'Thérapie individuelle (1 h · 60 €), accompagnement des adolescents (45 min · 50 €) et accompagnement du deuil (1 h · 60 €) à Cesson-Sévigné ou en visio. Déroulé d’une séance, tarifs, questions fréquentes.',
      keywords: [
        'thérapie individuelle',
        'thérapie adolescent',
        'accompagnement deuil',
        'tarifs thérapie',
        'Cesson-Sévigné',
      ],
    },
    sections: [
      {
        type: 'heroMinimal',
        anchor: 'accompagnements',
        navLabel: 'Accompagnements',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Accompagnements',
          titleLines: [
            { text: 'Trois portes' },
            { text: '*pour entrer.*' },
          ],
          intro:
            'Adultes, adolescents, personnes endeuillées : trois cadres pensés pour trois façons de traverser. Au cabinet, à Cesson-Sévigné, ou en visio.',
          linkLabel: 'Prendre rendez-vous',
          linkHref: '#contact',
        },
      },
      {
        type: 'servicesArches',
        anchor: 'les-accompagnements',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Les accompagnements',
          title: 'Des chemins *différents*, une même écoute.',
          linkLabel: '',
        },
      },
      {
        type: 'servicesDetail',
        anchor: 'a-la-une',
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'À la une',
          position: 1,
          extra:
            'Un espace régulier et confidentiel pour déposer ce qui pèse et avancer à votre rythme, au cabinet ou en visio.',
          linkLabel: 'Prendre rendez-vous',
          linkHref: '#contact',
        },
      },
      {
        type: 'seanceDeroule',
        anchor: 'deroule',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Le déroulé',
          title: 'Comment se passe une *séance*.',
          steps: [
            {
              title: 'L’arrivée',
              text: 'Vous êtes accueilli·e dans le salon, avec un thé si vous voulez. Pas de salle d’attente impersonnelle : on prend le temps d’arriver.',
            },
            {
              title: 'Ce qui vous amène',
              text: 'Vous parlez de ce que vous voulez, dans l’ordre qui vous vient. Il n’y a rien à préparer, rien à bien dire. Le silence est aussi une façon de commencer.',
            },
            {
              title: 'Le travail ensemble',
              text: 'J’écoute, je reformule parfois, je pose une question quand elle peut ouvrir quelque chose. On s’arrête sur ce qui résonne, on laisse le reste pour plus tard.',
            },
            {
              title: 'Le corps et le souffle',
              text: 'Quand c’est utile, nous prêtons attention à ce que le corps dit : la respiration, les tensions, ce qui se noue. Sans technique imposée — seulement ce qui vous convient.',
            },
            {
              title: 'La suite',
              text: 'Les dernières minutes servent à poser ce qui s’est passé et à décider, ensemble, du prochain rendez-vous — ou de l’absence de prochain rendez-vous.',
            },
          ],
        },
      },
      {
        type: 'tarifsSobre',
        anchor: 'tarifs',
        backgroundColor: SAND,
        payload: {
          eyebrow: 'Tarifs',
          title: 'Des prix *clairs*, posés une fois pour toutes.',
          items: [
            {
              label: 'Thérapie individuelle',
              detail: '1 h — au cabinet ou en visio',
              price: '60 €',
            },
            {
              label: 'Adolescents',
              detail: '45 min — au cabinet ou en visio',
              price: '50 €',
            },
            {
              label: 'Accompagnement du deuil',
              detail: '1 h — au cabinet ou en visio',
              price: '60 €',
            },
          ],
          note: 'Règlement en fin de séance, par chèque, espèces ou virement. Une facture est fournie sur demande pour votre mutuelle. Toute séance annulée moins de 48 heures à l’avance est due, sauf urgence. Si le tarif est un frein, parlons-en : une solution est toujours possible.',
        },
      },
      {
        type: 'faqEditoriale',
        anchor: 'questions',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Questions fréquentes',
          title: 'Ce que l’on me demande *souvent*.',
          intro:
            'Première séance, rythme, remboursement, visio : les réponses aux questions qui reviennent avant de commencer.',
        },
      },
      {
        type: 'contactMinimal',
        anchor: 'contact',
        navLabel: 'Contact',
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'Contact',
          title: 'Un premier *rendez-vous* ?',
          text: 'Écrivez-moi ou appelez : je vous réponds sous 48 h, en toute confidentialité.',
          showAddress: true,
          showHours: false,
          showBooking: true,
          bookingLabel: 'Prendre rendez-vous',
        },
      },
    ],
  }
}

function approachPage(): PageSeed {
  return {
    slug: 'approche',
    title: 'Mon approche',
    seo: {
      title: 'Mon approche — Anne Winzenried, thérapeute à Cesson-Sévigné',
      description:
        'Une thérapie fondée sur l’écoute, un cadre stable et le rythme de chacun. Les principes qui guident la pratique d’Anne Winzenried, thérapeute à Cesson-Sévigné.',
      keywords: ['approche thérapeutique', 'écoute', 'thérapie', 'Cesson-Sévigné'],
    },
    sections: [
      {
        type: 'heroMinimal',
        anchor: 'approche',
        navLabel: 'Approche',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Mon approche',
          titleLines: [
            { text: 'Écouter, jusqu’à ce que' },
            { text: '*vous vous entendiez.*' },
          ],
          intro:
            'Pas de méthode appliquée de l’extérieur. Une présence stable, un cadre qui tient, et le temps qu’il faut pour que la parole retrouve son chemin.',
          linkLabel: 'Prendre rendez-vous',
          linkHref: '/contact',
        },
      },
      {
        type: 'manifeste',
        anchor: 'conviction',
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'Ma conviction',
          title:
            'On ne répare pas les gens. On les écoute, jusqu’à ce qu’ils *s’entendent* à nouveau eux-mêmes.',
          body: 'Ce qui soigne, ce n’est pas ce que je sais de vous. C’est ce que vous découvrez de vous-même, dans un lieu où l’on peut enfin le dire sans conséquence.',
        },
      },
      {
        type: 'approcheColonnes',
        anchor: 'principes',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Trois principes',
          title: 'Ce qui *guide* chaque séance.',
          intro:
            'Trois choses simples, tenues sans exception. Elles ne font pas une méthode — elles font un cadre.',
          items: [
            {
              title: 'Un cadre stable',
              text: 'Le même lieu, la même heure, la même durée. La régularité n’est pas une contrainte : c’est ce qui permet de lâcher, parce qu’on sait que le cadre tient.',
            },
            {
              title: 'Une écoute sans attente',
              text: 'Je n’attends de vous ni progrès, ni cohérence, ni bonne volonté. Ce qui vient est ce qui vient — et c’est précisément à partir de là que l’on travaille.',
            },
            {
              title: 'Votre rythme, pas le mien',
              text: 'Certaines choses demandent des semaines avant de pouvoir se dire. Je ne force jamais une porte : je reste à côté, jusqu’à ce que vous l’ouvriez.',
            },
          ],
        },
      },
      {
        type: 'processusVertical',
        anchor: 'chemin',
        backgroundColor: SAND,
        payload: {
          eyebrow: 'Le chemin',
          title: 'Quatre temps, à *votre* mesure.',
          steps: [
            {
              title: 'Se rencontrer',
              text: 'Une première séance pour faire connaissance, dire ce qui vous amène et sentir si le cadre vous convient. Aucun engagement pour la suite.',
            },
            {
              title: 'Déposer',
              text: 'Les premières semaines servent souvent à poser ce qui pèse, sans chercher encore à le comprendre. On vide un peu, on respire mieux.',
            },
            {
              title: 'Traverser',
              text: 'Puis quelque chose se déplace. Des liens apparaissent, des répétitions se voient. On ne va pas plus vite que vous — mais on avance.',
            },
            {
              title: 'Conclure',
              text: 'La fin d’un accompagnement se prépare ensemble, en parlant. Elle arrive quand vous vous entendez à nouveau — et que vous n’avez plus besoin de moi pour ça.',
            },
          ],
        },
      },
      {
        type: 'texteDeuxColonnes',
        anchor: 'pour-aller-plus-loin',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Pour aller plus loin',
          title: 'Ce que j’entends par *thérapie*.',
          body: 'Le mot fait parfois peur. On imagine un divan, un silence pesant, quelqu’un qui note tout sans rien dire. Ce n’est pas ce qui se passe ici. La thérapie, telle que je la pratique, est une conversation — mais une conversation d’un genre particulier, où l’on peut tout dire, où l’autre n’attend rien, et où ce qui est dit reste.\n\nJe m’appuie sur une approche intégrative : plutôt qu’une seule école, un socle solide de formation à la relation d’aide, enrichi au fil des années par le travail sur le corps, la respiration et l’attention à ce qui se passe ici et maintenant. Je choisis, avec vous, ce qui vous convient — et j’écarte ce qui ne vous convient pas.\n\nJe n’établis pas de diagnostic et je ne prescris rien. Lorsqu’un suivi médical est nécessaire, j’en parle avec vous et je travaille en lien avec votre médecin. Ma place est ailleurs : dans l’écoute, la durée, la relation.\n\nEnfin, ma pratique est régulièrement supervisée. C’est une exigence que je me fixe, et une garantie pour vous : ce qui se passe dans ce cabinet est relu, questionné, tenu.',
        },
      },
      {
        type: 'imagePleine',
        backgroundColor: CREAM,
        payload: {
          title: 'Le temps qu’il *faut*.',
          caption: 'La lumière de fin d’après-midi, côté fenêtre',
          mediaId: img('lumiere-fenetre'),
        },
      },
      {
        type: 'citationSoulignee',
        backgroundColor: IVORY,
        payload: {
          quote:
            'Ce n’est pas parce qu’on va mieux qu’on arrête. C’est parce qu’on s’entend à nouveau.',
          attribution: 'Anne Winzenried',
        },
      },
      {
        type: 'appelDoux',
        backgroundColor: SAND,
        payload: {
          title: 'Et si l’on *commençait* par une simple conversation ?',
          text: 'Une première séance ne vous engage à rien. Elle permet seulement de faire le point, et de voir si le cadre vous convient.',
          label: 'Prendre rendez-vous',
          href: '/contact',
        },
      },
    ],
  }
}

function placePage(): PageSeed {
  return {
    slug: 'le-cabinet',
    title: 'Le cabinet',
    seo: {
      title: 'Le cabinet — 6 rue Saint-Martin, Cesson-Sévigné | ANASAWI',
      description:
        'Le cabinet d’Anne Winzenried, thérapeute, au 6 rue Saint-Martin à Cesson-Sévigné : un lieu qui ressemble à une maison. Accès, horaires, stationnement.',
      keywords: ['cabinet thérapeute Cesson-Sévigné', 'rue Saint-Martin', 'accès', 'horaires'],
    },
    sections: [
      {
        type: 'heroMinimal',
        anchor: 'le-cabinet',
        navLabel: 'Le cabinet',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Le cabinet',
          titleLines: [
            { text: 'Un lieu qui ressemble' },
            { text: '*à une maison.*' },
          ],
          intro:
            'Pas de blouse blanche, pas de divan intimidant. Un fauteuil, du thé, et le temps qu’il faut. Rue Saint-Martin, à Cesson-Sévigné.',
          linkLabel: 'Venir au cabinet',
          linkHref: '#venir',
        },
      },
      {
        type: 'lieuArches',
        anchor: 'le-lieu',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Le lieu',
          titleLines: [{ text: 'On y entre comme' }, { text: 'chez *quelqu’un*.' }],
          text: 'Une pièce claire, du bois, des plantes. On s’assied où l’on veut. Le thé est prêt. Le reste vient à son rythme.',
          caption: 'Le salon — rue Saint-Martin',
          linkLabel: 'Voir les images',
          linkHref: '#images',
          mediaId: img('cabinet-salon'),
          secondMediaId: img('cabinet-clair'),
        },
      },
      {
        type: 'galerieArches',
        anchor: 'images',
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'En images',
          mediaIds: [
            img('cabinet-lampe'),
            img('cabinet-plante'),
            img('plante-pot'),
            img('lumiere-soir'),
            img('the-pose'),
            img('detail-vase'),
          ],
        },
      },
      {
        type: 'imageLegende',
        backgroundColor: IVORY,
        payload: {
          caption: 'L’entrée — 6 rue Saint-Martin',
          format: 'arche',
          mediaId: img('entree-porte'),
        },
      },
      {
        type: 'texteDeuxColonnes',
        anchor: 'venir',
        backgroundColor: SAND,
        payload: {
          eyebrow: 'Venir au cabinet',
          title: 'Comment *arriver* jusqu’ici.',
          body: 'Le cabinet se trouve au 6 rue Saint-Martin, à Cesson-Sévigné, à quelques minutes du centre-ville et de Rennes. La rue est calme ; on y vient à pied, à vélo, en bus ou en voiture.\n\nEn voiture, le stationnement est facile dans les rues alentour — prévoyez simplement cinq minutes de marge pour arriver sans courir. En bus, le cabinet est desservi par le réseau rennais : je vous indique l’arrêt le plus proche et le trajet lors de la prise de rendez-vous.\n\nÀ votre arrivée, sonnez et entrez : vous êtes attendu·e. Si vous arrivez en avance, un fauteuil vous attend dans le salon. Si vous êtes en retard, ce n’est pas grave — préférez toujours arriver calmement.\n\nPour les séances en visio, je vous envoie un lien par mail la veille du rendez-vous. Il suffit d’un endroit tranquille, d’un ordinateur ou d’un téléphone, et d’un peu de temps devant vous.',
        },
      },
      {
        type: 'contactCarte',
        anchor: 'contact',
        navLabel: 'Contact',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Accès & horaires',
          title: 'Le cabinet vous *attend*.',
          intro:
            'Les horaires ci-contre sont indicatifs : d’autres créneaux sont possibles sur demande, notamment le samedi matin. Écrivez-moi ou appelez, nous trouverons.',
          bookingLabel: 'Prendre rendez-vous',
        },
      },
      {
        type: 'appelDoux',
        backgroundColor: CREAM,
        payload: {
          title: 'Vous *hésitez* encore ?',
          text: 'Découvrez les trois accompagnements proposés, le déroulé d’une séance et les tarifs.',
          label: 'Voir les accompagnements',
          href: '/accompagnements',
        },
      },
    ],
  }
}

function contactPage(): PageSeed {
  return {
    slug: 'contact',
    title: 'Contact',
    seo: {
      title: 'Contact — Prendre rendez-vous avec Anne Winzenried | ANASAWI',
      description:
        'Prendre rendez-vous avec Anne Winzenried, thérapeute à Cesson-Sévigné : 06 70 89 44 97, annewinzenried@orange.fr, 6 rue Saint-Martin. Réponse sous 48 h, en toute confidentialité.',
      keywords: ['contact', 'rendez-vous thérapeute', 'Cesson-Sévigné', 'Anne Winzenried'],
    },
    sections: [
      {
        type: 'contactMinimal',
        anchor: 'contact',
        navLabel: 'Contact',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Contact',
          title: 'On *commence* quand vous voulez.',
          text: 'Un mail, un appel, un message : je vous réponds sous 48 h, en toute confidentialité. Un premier échange ne vous engage à rien.',
          showAddress: true,
          showHours: true,
          showBooking: true,
          bookingLabel: 'Prendre rendez-vous',
        },
      },
      {
        type: 'contactCarte',
        anchor: 'acces',
        backgroundColor: CREAM,
        payload: {
          eyebrow: 'Coordonnées',
          title: 'Un mot suffit pour *commencer*.',
          intro:
            'Par écrit ou de vive voix, comme vous préférez. Si je ne réponds pas au téléphone, c’est que je suis en séance : laissez un message, je vous rappelle.',
          bookingLabel: 'Prendre rendez-vous',
        },
      },
      {
        type: 'faqEditoriale',
        anchor: 'questions',
        backgroundColor: IVORY,
        payload: {
          eyebrow: 'Avant d’écrire',
          title: 'Les questions qui *reviennent*.',
          intro:
            'Peut-être que la réponse est déjà là. Sinon, écrivez-moi : il n’y a pas de mauvaise question.',
        },
      },
    ],
  }
}

/* ════════════════════════════════════════════════════════════════════
   Exécution
   ════════════════════════════════════════════════════════════════════ */

const TO_REVIEW = [
  'Horaires d’ouverture (Réglages) — créneaux plausibles, à ajuster.',
  'Accès au cabinet (Réglages « Bon à savoir » et page Le cabinet, section « Venir au cabinet ») — stationnement, bus, sonnette : à confirmer.',
  'Chiffres : « 15 ans de pratique », « 400+ personnes accompagnées », « réponse sous 48 h » (accueil, À propos).',
  'Parcours (À propos) — quatre étapes génériques, sans dates : à compléter avec les vraies années et formations.',
  'Supervision et « approche intégrative » (À propos, Mon approche) — à confirmer ou reformuler.',
  'FAQ « Thérapeute, psychologue, psychiatre » — la description du statut de thérapeute doit correspondre au titre réel.',
  'FAQ « Remboursement » — mention des mutuelles, à vérifier.',
  'Tarifs et note (Accompagnements) — modes de règlement et politique d’annulation 48 h : à valider.',
  'Témoignages (accueil) — s’assurer d’avoir l’accord des personnes citées.',
  'Citations signées « Anne Winzenried » (À propos, Mon approche) — à faire siennes ou à réécrire.',
]

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

  /* 3. Pages */
  const pageSeeds = [
    homePage(),
    aboutPage(),
    servicesPage(),
    approachPage(),
    placePage(),
    contactPage(),
  ]
  for (const seed of pageSeeds) {
    await writePage(seed)
  }

  /* 4. Bilan */
  const sectionCount = pageSeeds.reduce((n, p) => n + p.sections.length, 0)
  console.log(
    `\n✓ Site rempli : ${pageSeeds.length} pages, ${sectionCount} sections, 3 accompagnements, 8 questions, ${PHOTOS.length} médias.`,
  )
  console.log(
    '  Rien n’a été publié — les pages secondaires sont en brouillon (404 côté public tant qu’elles ne sont pas publiées) ;',
  )
  console.log(
    '  le menu pointe déjà vers elles : publiez-les depuis /admin avant de publier l’accueil.',
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
