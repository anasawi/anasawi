import './load-env'

import { eq } from 'drizzle-orm'

import { db } from './index'
import { faqItems, pages, sections, services, settings } from './schema'

/**
 * REMPLACÉ PAR `seed-site.ts` (`npm run db:seed-site`), qui remplit tout le
 * site — accueil, pages secondaires, médias, réglages. Conservé pour
 * référence ; préférez le script complet.
 *
 * Remplit la page d'accueil avec les vrais textes, dans l'ordre exact de la
 * planche V8 : hero (A) → bandeau (B) → à propos (D) → accompagnements (F) →
 * manifeste (H) → le lieu (E) → médaillon (L) → parole (I) → trois voix (J) →
 * galerie (G) → questions (N) → contact (K).
 *
 * Il remplace aussi le contenu des tables « Accompagnements » et « FAQ ».
 *
 * RELANÇABLE SANS RISQUE : à chaque exécution, les sections de l'accueil,
 * les accompagnements et la FAQ sont remplacés à l'identique. Rien n'est
 * publié — la page reste telle quelle côté public (instantané intact),
 * les nouveaux contenus s'ouvrent en brouillon dans l'éditeur.
 *
 *   npm run db:seed-home
 */

/* Fonds des sections — les hexadécimaux de la charte (`globals.css`). */
const IVORY = '#fbf8f2'
const CREAM = '#f8f4ea'
const SAND = '#f4eee3'
const NIGHT = '#2e424f'

async function main() {
  const [home] = await db
    .select({ id: pages.id, title: pages.title })
    .from(pages)
    .where(eq(pages.isHome, true))
    .limit(1)

  if (!home) {
    console.error(
      '✗ Aucune page d’accueil (isHome) — lancez d’abord `npm run db:seed`.',
    )
    process.exit(1)
  }

  /* ── 1. Accompagnements — trois entrées, tarifs modifiables dans
        l'admin (écran « Accompagnements », champ « durée ») ─────────── */

  console.log('→ Accompagnements')
  await db.delete(services)
  await db.insert(services).values([
    {
      title: 'Thérapie individuelle',
      slug: 'therapie-individuelle',
      excerpt:
        'Une heure par semaine, au cabinet ou en visio, pour démêler ce qui s’est noué.',
      body: 'Un espace régulier et confidentiel pour déposer ce qui pèse : anxiété, transitions, épuisement, blessures anciennes. Nous avançons à votre rythme, sans grille imposée — la parole, le silence et la respiration y ont chacun leur place.',
      duration: '1 h · 60 € — au cabinet ou en visio',
      sortOrder: 0,
      isActive: true,
    },
    {
      title: 'Adolescents',
      slug: 'adolescents',
      excerpt: 'Quarante-cinq minutes, un lieu où déposer ce qui déborde.',
      body: 'Un cadre pensé pour les adolescents : plus court, plus souple, sans jugement. Un endroit à eux, où ce qui déborde — au collège, à la maison, en silence — peut enfin se dire. Les parents sont associés quand c’est utile, jamais sans l’accord du jeune.',
      duration: '45 min · 50 €',
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Accompagnement du deuil',
      slug: 'accompagnement-du-deuil',
      excerpt: 'Traverser l’absence, à son rythme, sans injonction.',
      body: 'Le deuil ne se « surmonte » pas sur commande. Séance après séance, nous faisons de la place à l’absence, aux souvenirs et à ce qui continue — sans étape obligée, sans calendrier imposé.',
      duration: '1 h · 60 €',
      sortOrder: 2,
      isActive: true,
    },
  ])

  /* ── 2. FAQ — les six questions utiles avant une première séance ── */

  console.log('→ Questions fréquentes')
  await db.delete(faqItems)
  await db.insert(faqItems).values([
    {
      question: 'Comment se passe la première séance ?',
      answer:
        'On fait connaissance, simplement. Vous racontez ce qui vous amène — dans l’ordre ou le désordre — et nous voyons ensemble si le cadre vous convient. Il n’y a rien à préparer : venir suffit.',
      sortOrder: 0,
      isActive: true,
    },
    {
      question: 'Faut-il venir chaque semaine ?',
      answer:
        'Le rythme se décide ensemble, selon ce que vous traversez. Une séance par semaine au début, souvent ; puis on espace, dès que c’est juste.',
      sortOrder: 1,
      isActive: true,
    },
    {
      question: 'Est-ce remboursé ?',
      answer:
        'Les séances ne sont pas prises en charge par la Sécurité sociale, mais de nombreuses mutuelles remboursent plusieurs séances par an. Le plus simple est de poser la question à la vôtre — une facture vous est fournie sur demande.',
      sortOrder: 2,
      isActive: true,
    },
    {
      question: 'Ce que je dis reste-t-il confidentiel ?',
      answer:
        'Absolument. Rien de ce qui se dit au cabinet n’en sort — c’est la condition de tout le reste. Cela vaut aussi pour les adolescents vis-à-vis de leurs parents, dans le cadre que nous posons ensemble.',
      sortOrder: 3,
      isActive: true,
    },
    {
      question: 'Peut-on faire les séances en visio ?',
      answer:
        'Oui. Certaines personnes alternent cabinet et visio, d’autres travaillent entièrement à distance. Le cadre reste le même : un rendez-vous fixe, un espace confidentiel, une présence entière.',
      sortOrder: 4,
      isActive: true,
    },
    {
      question: 'Combien de temps dure un suivi ?',
      answer:
        'Il n’y a pas de règle. Certaines traversées demandent quelques séances, d’autres s’étendent sur une ou deux années. Nous en reparlons régulièrement, et l’on s’arrête quand vous vous sentez prêt·e.',
      sortOrder: 5,
      isActive: true,
    },
  ])

  /* ── 3. Sections de l'accueil — l'ordre de la planche ───────────── */

  console.log(`→ Sections de « ${home.title} »`)
  await db.delete(sections).where(eq(sections.pageId, home.id))
  await db.insert(sections).values([
    /* A — Hero : l'arche, le titre qui l'enlace, le texte circulaire. */
    {
      pageId: home.id,
      type: 'heroPleinEcran',
      anchor: 'accueil',
      navLabel: 'Accueil',
      showInNav: false,
      sortOrder: 0,
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
        mediaId: null,
      },
    },
    /* B — Bandeau : les mots-souffle, tempo constant, fond sable. */
    {
      pageId: home.id,
      type: 'bandeauRespirer',
      sortOrder: 1,
      backgroundColor: SAND,
      payload: {
        words: 'respirer, déposer, traverser, s’apaiser',
        tone: 'sable',
        speed: 'normal',
      },
    },
    /* D — À propos : arche portrait, badge du nom, compteurs. */
    {
      pageId: home.id,
      type: 'aproposPortrait',
      anchor: 'a-propos',
      navLabel: 'À propos',
      showInNav: true,
      sortOrder: 2,
      backgroundColor: IVORY,
      payload: {
        eyebrow: 'Qui je suis',
        title:
          'Quinze ans à accueillir ce qui vient — les silences comme les débordements — *sans jamais juger*.',
        intro: '',
        body: 'Je suis Anne Winzenried, thérapeute à Cesson-Sévigné, près de Rennes. J’accompagne adultes et adolescents dans les traversées de la vie : deuils, séparations, épuisements, transitions — et tout ce qui n’a pas encore de nom.',
        signature: 'Anne Winzenried',
        mediaId: null,
        stats: [
          { value: 15, suffix: '', label: 'ans de pratique' },
          { value: 400, suffix: '+', label: 'personnes' },
          { value: 48, suffix: ' h', label: 'de réponse' },
        ],
        linkLabel: 'Mon parcours',
        linkHref: '#approche',
      },
    },
    /* F — Accompagnements : les rangées qui s'inversent vers la nuit. */
    {
      pageId: home.id,
      type: 'servicesListe',
      anchor: 'accompagnements',
      navLabel: 'Accompagnements',
      showInNav: true,
      sortOrder: 3,
      backgroundColor: IVORY,
      payload: {
        eyebrow: 'Trois manières de commencer',
        title: '',
        intro: '',
      },
    },
    /* H — Manifeste : la conviction, mot-pivot souligné, fond crème. */
    {
      pageId: home.id,
      type: 'manifeste',
      anchor: 'approche',
      navLabel: 'Approche',
      showInNav: true,
      sortOrder: 4,
      backgroundColor: CREAM,
      payload: {
        eyebrow: 'Ma conviction',
        title:
          'On ne répare pas les gens. On les écoute, jusqu’à ce qu’ils *s’entendent* à nouveau eux-mêmes.',
        body: '',
      },
    },
    /* E — Le lieu : deux arches sœurs, la seconde remontée. */
    {
      pageId: home.id,
      type: 'lieuArches',
      anchor: 'cabinet',
      navLabel: 'Le cabinet',
      showInNav: true,
      sortOrder: 5,
      backgroundColor: IVORY,
      payload: {
        eyebrow: 'Le lieu',
        titleLines: [
          { text: 'Un cabinet qui ressemble' },
          { text: 'à une *maison*.' },
        ],
        text: 'Pas de blouse blanche, pas de divan intimidant. Un fauteuil, du thé, et le temps qu’il faut.',
        caption: 'Le cabinet — rue Saint-Martin',
        linkLabel: 'Voir le lieu',
        linkHref: '#images',
        mediaId: null,
        secondMediaId: null,
      },
    },
    /* L — Le médaillon : le chiffre 15 sous sa couronne, fond sable. */
    {
      pageId: home.id,
      type: 'aproposMedaillon',
      sortOrder: 6,
      backgroundColor: SAND,
      payload: {
        value: 15,
        unit: 'années',
        ring: 'quinze années d’écoute · quinze années de présence · ',
        title: 'années à accompagner ce qui *déborde*.',
        text: 'Deuils, séparations, épuisements, transitions — et tout ce qui n’a pas encore de nom.',
      },
    },
    /* I — La parole : fond nuit, halo, arche qui respire. */
    {
      pageId: home.id,
      type: 'temoignageGrand',
      sortOrder: 7,
      backgroundColor: NIGHT,
      payload: {
        quote: 'Le courage, c’est de demander *de l’aide*.',
        author: 'Une patiente, accompagnée deux ans',
      },
    },
    /* J — Trois voix : la carte centrale bleu brume. */
    {
      pageId: home.id,
      type: 'temoignagesMultiples',
      sortOrder: 8,
      backgroundColor: IVORY,
      payload: {
        eyebrow: 'Ils en parlent',
        title: '',
        items: [
          {
            quote: 'J’ai retrouvé un sol sous mes pieds.',
            name: 'M.',
            role: 'deux ans',
          },
          {
            quote: 'Une écoute qui ne juge jamais, qui n’attend rien.',
            name: 'S.',
            role: '41 ans',
          },
          {
            quote: 'Mon fils a recommencé à parler.',
            name: 'Une maman',
            role: '',
          },
        ],
      },
    },
    /* G — La galerie d'arches : fond crème. Les images se choisissent
       dans l'admin — les dégradés de la charte tiennent lieu d'attente. */
    {
      pageId: home.id,
      type: 'galerieArches',
      anchor: 'images',
      sortOrder: 9,
      backgroundColor: CREAM,
      payload: {
        eyebrow: 'Le cabinet, en images',
        mediaIds: [],
      },
    },
    /* N — Questions : la colonne éditoriale. */
    {
      pageId: home.id,
      type: 'faqEditoriale',
      anchor: 'questions',
      navLabel: 'Questions',
      showInNav: false,
      sortOrder: 10,
      backgroundColor: IVORY,
      payload: {
        eyebrow: 'Questions fréquentes',
        title: '',
        intro:
          'Les réponses aux questions qui reviennent le plus souvent avant une première séance. Pour tout le reste, écrivez-moi.',
      },
    },
    /* K — Contact : la grande arche bleu profond. */
    {
      pageId: home.id,
      type: 'contactMinimal',
      anchor: 'contact',
      navLabel: 'Contact',
      showInNav: false,
      sortOrder: 11,
      backgroundColor: IVORY,
      payload: {
        eyebrow: '',
        title: 'On *commence* quand vous voulez.',
        text: 'Sous 48 h, en toute confidentialité.',
        showAddress: true,
        showHours: false,
        showBooking: true,
        bookingLabel: 'Prendre rendez-vous',
      },
    },
  ])

  /* ── 4. Menu — quatre entrées sobres, comme la nav Α de la planche.
        (le bouton « Rendez-vous » est le CTA permanent du header) ──── */

  console.log('→ Navigation')
  const navRows = await db
    .update(settings)
    .set({
      navigation: [
        { label: 'À propos', href: 'a-propos' },
        { label: 'Accompagnements', href: 'accompagnements' },
        { label: 'Approche', href: 'approche' },
        { label: 'Le cabinet', href: 'cabinet' },
      ],
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 'singleton'))
    .returning({ id: settings.id })

  if (navRows.length === 0) {
    console.warn(
      '  (réglages absents — le menu retombera sur les sections « showInNav »)',
    )
  }

  console.log(
    '✓ Accueil remplie : 12 sections, 3 accompagnements, 6 questions.',
  )
  console.log(
    '  Rien n’a été publié — relisez le brouillon dans l’éditeur, puis « Publier ».',
  )
  process.exit(0)
}

main().catch((error) => {
  console.error('✗ Seed de l’accueil impossible :', error)
  process.exit(1)
})
