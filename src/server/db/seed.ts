import './load-env'

import { db } from './index'
import {
  faqItems,
  pages,
  sections,
  seoMeta,
  services,
  settings,
} from './schema'

/**
 * Amorce la base avec la structure du site et les coordonnées réelles.
 *
 * Les textes éditoriaux sont provisoires et destinés à être réécrits depuis
 * le CMS. Les coordonnées, elles, sont exactes : ce sont elles qui alimentent
 * le JSON-LD, et une donnée inventée y serait une faute.
 *
 *   npm run db:seed
 */

const HERO_INTRO =
  'Un accompagnement thérapeutique doux et personnalisé, pour traverser les épreuves de la vie avec davantage de clarté et de sérénité.'

async function main() {
  console.log('→ Réglages du site')

  await db
    .insert(settings)
    .values({
      id: 'singleton',
      siteName: 'ANASAWI',
      practitionerName: 'Anne Winzenried',
      practitionerTitle: 'Thérapeute',
      tagline:
        'Un espace d’écoute et d’accompagnement thérapeutique à Cesson-Sévigné.',
      contactEmail: 'annewinzenried@orange.fr',
      contactPhone: '06 70 89 44 97',
      addressStreet: '6 rue Saint-Martin',
      addressPostalCode: '35510',
      addressCity: 'Cesson-Sévigné',
      addressCountry: 'FR',
      defaultSeoTitle:
        'Anne Winzenried — Thérapeute à Cesson-Sévigné | ANASAWI',
      defaultSeoDescription:
        'Anne Winzenried, thérapeute à Cesson-Sévigné (35510). Accompagnement thérapeutique doux et personnalisé : écoute, soutien et travail sur soi.',
      /* Horaires et informations pratiques laissés vides volontairement :
         ils seront renseignés depuis le CMS, et sont omis du JSON-LD
         tant qu'ils ne sont pas connus. */
      openingHours: [],
      socialLinks: [],
    })
    .onConflictDoNothing()

  console.log('→ Page d’accueil')

  const [home] = await db
    .insert(pages)
    .values({
      slug: 'accueil',
      title: 'Accueil',
      status: 'published',
      isHome: true,
    })
    .onConflictDoNothing()
    .returning({ id: pages.id })

  if (!home) {
    console.log('  (déjà présente — seed interrompu pour ne rien écraser)')
    return
  }

  await db.insert(seoMeta).values({
    pageId: home.id,
    title: 'Anne Winzenried — Thérapeute à Cesson-Sévigné | ANASAWI',
    description:
      'Anne Winzenried, thérapeute à Cesson-Sévigné. Un accompagnement doux et personnalisé pour traverser les épreuves de la vie avec clarté et sérénité.',
    keywords: [
      'Anne Winzenried',
      'Anne Winzenried thérapeute',
      'ANASAWI',
      'thérapeute Cesson-Sévigné',
      'accompagnement thérapeutique Rennes',
    ],
  })

  console.log('→ Sections')

  await db.insert(sections).values([
    {
      pageId: home.id,
      type: 'hero',
      anchor: 'accueil',
      navLabel: 'Accueil',
      showInNav: true,
      sortOrder: 0,
      backgroundColor: '#fcfaf7',
      payload: {
        eyebrow: 'THÉRAPIE · ACCOMPAGNEMENT · ÉCOUTE',
        titleLines: [
          { text: 'Retrouver un' },
          { text: 'espace *intérieur*' },
          { text: 'où respirer.' },
        ],
        intro: HERO_INTRO,
        primaryLabel: 'Prendre rendez-vous',
        primaryHref: '#contact',
        secondaryLabel: 'En savoir plus',
        secondaryHref: '#a-propos',
        mediaId: null,
      },
    },
    {
      pageId: home.id,
      type: 'about',
      anchor: 'a-propos',
      navLabel: 'À propos',
      showInNav: true,
      sortOrder: 1,
      backgroundColor: '#fcfaf7',
      payload: {
        eyebrow: 'À PROPOS',
        title: 'Un accompagnement fondé sur l’*écoute*.',
        intro:
          'À COMPLÉTER — quelques lignes de présentation d’Anne, à sa voix.',
        body:
          'À COMPLÉTER — parcours, formations et façon de travailler.\n\nCe texte est provisoire : il se remplace depuis l’administration, section « À propos ».',
        mediaId: null,
        values: [
          {
            label: 'Écoute',
            text: 'À COMPLÉTER — ce que recouvre cette valeur dans la pratique.',
          },
          {
            label: 'Confidentialité',
            text: 'À COMPLÉTER — le cadre posé autour des séances.',
          },
        ],
      },
    },
    {
      pageId: home.id,
      type: 'services',
      anchor: 'accompagnements',
      navLabel: 'Accompagnements',
      showInNav: true,
      sortOrder: 2,
      backgroundColor: '#f6f2ec',
      payload: {
        eyebrow: 'ACCOMPAGNEMENTS',
        title: 'Des chemins *différents*, un même soin.',
        intro:
          'À COMPLÉTER — introduction aux différentes formes d’accompagnement proposées.',
        layout: 'rows',
      },
    },
    {
      pageId: home.id,
      type: 'quote',
      sortOrder: 3,
      backgroundColor: '#fcfaf7',
      payload: {
        lines: [
          { text: 'Ce qui ne peut se dire' },
          { text: 'trouve parfois à *se déposer*.' },
        ],
        attribution: '',
      },
    },
    {
      pageId: home.id,
      type: 'approach',
      anchor: 'approche',
      navLabel: 'Approche',
      showInNav: true,
      sortOrder: 4,
      backgroundColor: '#fcfaf7',
      payload: {
        eyebrow: 'APPROCHE',
        title: 'Avancer à *votre* rythme.',
        body:
          'À COMPLÉTER — description de l’approche thérapeutique, du cadre et du déroulement.',
        mediaId: null,
        steps: [
          {
            label: 'Premier échange',
            text: 'À COMPLÉTER — comment se déroule le premier contact.',
          },
          {
            label: 'Le travail ensemble',
            text: 'À COMPLÉTER — rythme et forme des séances.',
          },
          {
            label: 'Le chemin',
            text: 'À COMPLÉTER — durée et fin de l’accompagnement.',
          },
        ],
      },
    },
    {
      pageId: home.id,
      type: 'faq',
      anchor: 'faq',
      navLabel: 'FAQ',
      showInNav: true,
      sortOrder: 5,
      backgroundColor: '#f6f2ec',
      payload: {
        eyebrow: 'QUESTIONS FRÉQUENTES',
        title: 'Vos *questions*.',
        intro:
          'Si votre question n’apparaît pas ici, n’hésitez pas à écrire ou à appeler.',
      },
    },
    {
      pageId: home.id,
      type: 'contact',
      anchor: 'contact',
      navLabel: 'Contact',
      showInNav: true,
      sortOrder: 6,
      backgroundColor: '#fcfaf7',
      payload: {
        eyebrow: 'CONTACT',
        title: 'Prendre *rendez-vous*.',
        intro:
          'Pour un premier échange ou une prise de rendez-vous, écrivez ou appelez directement.',
        showForm: true,
        bookingLabel: 'Prendre rendez-vous',
      },
    },
  ])

  console.log('→ Accompagnements (provisoires)')

  await db.insert(services).values([
    {
      title: 'Accompagnement individuel',
      slug: 'accompagnement-individuel',
      excerpt:
        'À COMPLÉTER — description courte, visible sur la page d’accueil.',
      body: '',
      duration: '',
      sortOrder: 0,
    },
    {
      title: 'Traversée d’une épreuve',
      slug: 'traversee-epreuve',
      excerpt: 'À COMPLÉTER — description courte.',
      body: '',
      duration: '',
      sortOrder: 1,
    },
    {
      title: 'Travail sur soi',
      slug: 'travail-sur-soi',
      excerpt: 'À COMPLÉTER — description courte.',
      body: '',
      duration: '',
      sortOrder: 2,
    },
  ])

  console.log('→ FAQ (provisoire)')

  await db.insert(faqItems).values([
    {
      question: 'Comment se déroule une première séance ?',
      answer: 'À COMPLÉTER — réponse d’Anne.',
      sortOrder: 0,
    },
    {
      question: 'Combien de temps dure un accompagnement ?',
      answer: 'À COMPLÉTER — réponse d’Anne.',
      sortOrder: 1,
    },
    {
      question: 'Les séances sont-elles remboursées ?',
      answer: 'À COMPLÉTER — réponse d’Anne.',
      sortOrder: 2,
    },
  ])

  console.log('\n✓ Base amorcée.')
  console.log('  Les textes marqués « À COMPLÉTER » sont à réécrire dans /admin.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
