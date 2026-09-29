import { config } from 'dotenv'

import {
  COMPTE,
  FAMILLES,
  PAGE_ACCUEIL,
  PAGE_ARCHE,
  PAGE_CASSEE,
  QUESTIONS,
  SERVICES,
} from './fixtures'

/*
 * Remet la base de test dans un état connu.
 *
 * Appelé avant chaque série : les tests écrivent beaucoup, et un test qui
 * dépend de ce qu'a laissé le précédent finit toujours par mentir. On vide
 * puis on réinstalle le strict nécessaire — pas le contenu de démonstration
 * du site, qui changerait sous les assertions.
 *
 * Les modules de base de données sont importés DANS `main`, après avoir posé
 * `DATABASE_URL` : `src/server/db/index.ts` lit l'environnement à son
 * évaluation et refuse de se charger sans adresse. Le projet étant en
 * CommonJS, l'`await` au niveau racine n'est pas permis — d'où cette forme.
 */

config({ path: '.env.test', quiet: true })

async function main() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) {
    console.error(
      '\n  ✗ E2E_DATABASE_URL manquant.\n' +
        '    Créez .env.test à partir de .env.test.example — il doit pointer\n' +
        '    vers la branche Neon « test », jamais vers dev ni production.\n',
    )
    process.exit(1)
  }

  /* Garde-fou : une erreur de copier-coller ne doit pas pouvoir vider la
     production. Les trois autres branches du projet sont nommées ici. */
  const interdites = ['wild-butterfly', 'patient-wind', 'plain-cell']
  const suspecte = interdites.find((b) => url.includes(b))
  if (suspecte) {
    console.error(
      `\n  ✗ REFUS : l'adresse contient « ${suspecte} », qui désigne une\n` +
        '    branche de développement, de préproduction ou de production.\n' +
        '    Les tests ne peuvent viser que la branche « test ».\n',
    )
    process.exit(1)
  }

  if (!COMPTE.motDePasse || COMPTE.motDePasse.length < 12) {
    console.error(
      '\n  ✗ E2E_ADMIN_PASSWORD manquant ou trop court (12 caractères minimum).\n' +
        '    À définir dans .env.test.\n',
    )
    process.exit(1)
  }

  process.env.DATABASE_URL = url

  const { eq } = await import('drizzle-orm')
  const { hash } = await import('bcryptjs')
  const { db } = await import('../../src/server/db')
  const {
    contactMessages,
    faqItems,
    media,
    pages,
    savedSections,
    sections,
    seoMeta,
    serviceGroups,
    services,
    settings,
    users,
  } = await import('../../src/server/db/schema')

  console.log('  Remise à plat de la base de test…')

  /* Ordre imposé par les clés étrangères : les enfants d'abord. */
  await db.delete(sections)
  await db.delete(seoMeta)
  await db.delete(savedSections)
  await db.delete(contactMessages)
  await db.delete(services)
  await db.delete(serviceGroups)
  await db.delete(faqItems)
  await db.delete(media)
  await db.delete(pages)
  await db.delete(settings)
  await db.delete(users)

  /* ── Compte administrateur ──────────────────────────────────────── */
  await db.insert(users).values({
    name: COMPTE.nom,
    email: COMPTE.email,
    passwordHash: await hash(COMPTE.motDePasse, 12),
    role: 'owner',
  })

  /* ── Réglages ───────────────────────────────────────────────────── */
  await db.insert(settings).values({
    id: 'singleton',
    siteName: 'ANASAWI',
    practitionerName: 'Anne Winzenried',
    practitionerTitle: 'Thérapeute',
    tagline: 'Un espace d’écoute à Cesson-Sévigné.',
    contactEmail: 'annewinzenried@orange.fr',
    contactPhone: '06 70 89 44 97',
    addressStreet: '6 rue Saint-Martin',
    addressPostalCode: '35510',
    addressCity: 'Cesson-Sévigné',
    addressCountry: 'FR',
    defaultSeoTitle: 'Anne Winzenried — Thérapeute à Cesson-Sévigné | ANASAWI',
    defaultSeoDescription:
      'Anne Winzenried, thérapeute à Cesson-Sévigné. Accompagnement thérapeutique doux et personnalisé.',
    openingHours: [],
    socialLinks: [],
  })

  /* ── Page d'accueil, publiée, avec deux sections ────────────────── */
  const [accueil] = await db
    .insert(pages)
    .values({
      slug: PAGE_ACCUEIL.slug,
      title: PAGE_ACCUEIL.titre,
      status: 'published',
      isHome: true,
      publishedAt: new Date(),
    })
    .returning()

  if (!accueil) throw new Error('Page d’accueil non créée.')

  const creees = await db
    .insert(sections)
    .values([
      {
        pageId: accueil.id,
        /* Le type doit exister au registre (`src/blocks/registry.ts`) : un
           type inconnu ne rend rien, silencieusement. */
        type: 'hero',
        anchor: 'accueil',
        navLabel: 'Accueil',
        showInNav: false,
        sortOrder: 0,
        payload: {
          eyebrow: 'Thérapie — Cesson-Sévigné',
          titleLines: [{ text: 'Retrouver' }, { text: 'son souffle.' }],
          intro: 'Un espace stable et confidentiel pour déposer ce qui pèse.',
          primaryLabel: 'Prendre rendez-vous',
          primaryHref: '#contact',
          secondaryLabel: 'Découvrir l’approche',
          secondaryHref: '#accompagnements',
          mediaId: null,
        },
      },
      {
        pageId: accueil.id,
        type: 'servicesListe',
        anchor: 'accompagnements',
        navLabel: 'Accompagnements',
        showInNav: true,
        sortOrder: 1,
        payload: {
          eyebrow: 'Accompagnements',
          title: 'Selon ce qui vous *amène*.',
          intro: 'Des accompagnements rangés par ce qu’ils permettent.',
          panelCta: 'Prendre rendez-vous',
        },
      },
      {
        /* Seul chemin d'ÉCRITURE ouvert au public : le formulaire de
           contact. Il est donc sur la page de test, sans quoi rien ne
           couvrirait la validation, l'anti-robot ni la limitation de
           débit côté navigateur. Hors menu, pour ne pas déplacer les
           assertions de navigation. */
        pageId: accueil.id,
        type: 'contact',
        anchor: 'contact',
        navLabel: 'Contact',
        showInNav: false,
        sortOrder: 2,
        payload: {
          eyebrow: 'Contact',
          title: 'Écrire un *premier* mot.',
          intro: 'Un message suffit pour commencer.',
          showForm: true,
          bookingLabel: 'Prendre rendez-vous',
        },
      },
      {
        /* Les questions fréquentes alimentent aussi le JSON-LD `FAQPage`,
           donc ce que Google affiche sous le lien du site : sans cette
           section, rien ne vérifierait qu'une question enregistrée
           atteint réellement le public. */
        pageId: accueil.id,
        type: 'faq',
        anchor: 'questions',
        navLabel: 'Questions',
        showInNav: false,
        sortOrder: 3,
        payload: {
          eyebrow: 'Questions fréquentes',
          title: 'Ce qu’on demande *souvent*.',
          intro: '',
        },
      },
    ])
    .returning()

  /* Instantané publié : le site public sert celui-ci, pas les sections
     vivantes. Sans lui, l'accueil s'afficherait vide. */
  await db
    .update(pages)
    .set({ publishedSnapshot: creees })
    .where(eq(pages.id, accueil.id))

  /* ── Page secondaire aux blocs cassés ───────────────────────────── */
  const [cassee] = await db
    .insert(pages)
    .values({
      slug: PAGE_CASSEE.slug,
      title: PAGE_CASSEE.titre,
      status: 'published',
      isHome: false,
      publishedAt: new Date(),
    })
    .returning()

  if (!cassee) throw new Error('Page aux blocs cassés non créée.')

  const sectionsCassees = await db
    .insert(sections)
    .values([
      {
        pageId: cassee.id,
        type: 'texteCentre',
        anchor: 'valide',
        navLabel: 'Valide',
        showInNav: false,
        sortOrder: 0,
        payload: { statement: PAGE_CASSEE.texteValide },
      },
      {
        /* Type absent du registre : ce que devient une section dont le
           bloc a été renommé ou retiré entre deux versions. */
        pageId: cassee.id,
        type: PAGE_CASSEE.typeInconnu,
        anchor: 'inconnu',
        navLabel: 'Inconnu',
        showInNav: false,
        sortOrder: 1,
        payload: {},
      },
      {
        /* Type connu, payload qui ne satisfait pas son schéma :
           `statement` attend une chaîne, pas un nombre. */
        pageId: cassee.id,
        type: 'texteCentre',
        anchor: 'invalide',
        navLabel: 'Invalide',
        showInNav: false,
        sortOrder: 2,
        payload: { statement: 42 },
      },
    ])
    .returning()

  await db
    .update(pages)
    .set({ publishedSnapshot: sectionsCassees })
    .where(eq(pages.id, cassee.id))

  /* ── Page avec le hero « L'arche » et ses réglages de titre ─────── */
  const [arche] = await db
    .insert(pages)
    .values({
      slug: PAGE_ARCHE.slug,
      title: PAGE_ARCHE.titre,
      status: 'published',
      isHome: false,
      publishedAt: new Date(),
    })
    .returning()

  if (!arche) throw new Error('Page avec l’arche non créée.')

  const sectionsArche = await db
    .insert(sections)
    .values([
      {
        pageId: arche.id,
        type: 'heroPleinEcran',
        anchor: 'ouverture',
        navLabel: 'Ouverture',
        showInNav: false,
        sortOrder: 0,
        payload: {
          eyebrow: 'Ouverture',
          titleLines: [...PAGE_ARCHE.lignes],
          titleSize: PAGE_ARCHE.taille,
          intro: '',
          primaryLabel: '',
          primaryHref: '#contact',
          secondaryLabel: '',
          secondaryHref: '#a-propos',
          mediaId: null,
        },
      },
    ])
    .returning()

  await db
    .update(pages)
    .set({ publishedSnapshot: sectionsArche })
    .where(eq(pages.id, arche.id))

  /* ── Accompagnements et familles ────────────────────────────────── */
  const famillesCreees = await db
    .insert(serviceGroups)
    .values(FAMILLES.map((label, i) => ({ label, sortOrder: i })))
    .returning()

  await db.insert(services).values(
    SERVICES.map((s, i) => ({
      slug: s.slug,
      title: s.titre,
      excerpt: s.extrait,
      body: `${s.extrait}\n\nUn deuxième paragraphe, pour que la fiche ait du corps.`,
      duration: s.duree,
      method: s.methode,
      groupId: famillesCreees[i]?.id ?? null,
      sortOrder: i,
      isActive: true,
    })),
  )

  /* ── Questions fréquentes ───────────────────────────────────────── */
  await db.insert(faqItems).values(
    QUESTIONS.map((q, i) => ({
      question: q.question,
      answer: q.reponse,
      sortOrder: i,
      isActive: true,
    })),
  )

  console.log('  ✓ Base de test prête.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
