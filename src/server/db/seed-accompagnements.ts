import './load-env'

import { eq, max } from 'drizzle-orm'

import { db } from './index'
import { services } from './schema'

/**
 * Installe les cinq accompagnements, rangés en trois familles.
 *
 * « Selon ce qui vous amène » : les accompagnements sont classés par ce
 * qu'ils permettent plutôt que par leur méthode — c'est rarement le
 * vocabulaire des praticiens qui amène quelqu'un à pousser la porte. La
 * méthode reste mentionnée, en regard du titre, pour qui la cherche.
 *
 * Idempotent : on reconnaît chaque accompagnement à son slug. Un existant
 * garde ses textes (Anne a pu les retravailler) et ne reçoit que sa famille,
 * sa méthode et son rang ; un absent est créé avec un texte d'attente.
 *
 * Rien n'est jamais supprimé : les accompagnements hors de cette liste sont
 * seulement retirés de l'affichage, et un interrupteur les rétablit.
 *
 *   npm run db:seed-accompagnements
 */

type Entree = {
  slug: string
  title: string
  groupLabel: string
  method: string | null
  duration: string | null
  excerpt: string
  body: string
}

const FAMILLES = {
  traverser: 'Traverser quelque chose',
  corps: 'Passer par le corps',
  metier: 'Avancer dans son métier',
} as const

/** Retirés de l'affichage, jamais supprimés : leurs textes restent en base. */
const A_MASQUER = ['adolescents', 'accompagnement-du-deuil']

const ENTREES: Entree[] = [
  {
    slug: 'therapie-individuelle',
    title: 'Thérapie individuelle',
    groupLabel: FAMILLES.traverser,
    method: 'Gestalt-thérapie',
    duration: '1 h · 60 € — au cabinet ou en visio',
    excerpt:
      'Une heure, chaque semaine ou tous les quinze jours, pour démêler ce qui s’est noué.',
    body: 'Vous ne savez pas toujours par où commencer — et ce n’est pas grave. La thérapie individuelle est un espace régulier et confidentiel où déposer ce qui pèse : l’anxiété qui ne lâche pas, une séparation, un épuisement, une blessure ancienne qui refait surface, ou simplement le sentiment de ne plus s’y retrouver.\n\nNous avançons à votre rythme, sans grille imposée. La parole, le silence et le corps y ont chacun leur place. Les séances se tiennent au cabinet, à Cesson-Sévigné, ou en visio lorsque la distance ou l’emploi du temps le demandent.',
  },
  {
    slug: 'therapie-de-couple',
    title: 'Thérapie de couple',
    groupLabel: FAMILLES.traverser,
    method: 'Gestalt-thérapie',
    duration: '1 h 15 · 90 € — au cabinet',
    excerpt:
      'Un tiers pour que la conversation reprenne, quand elle tourne en rond à deux.',
    body: 'Il arrive qu’un couple n’arrive plus à se parler sans que cela dérape — ou qu’il se parle encore, poliment, sans que rien ne se dise vraiment. Les mêmes disputes reviennent, les mêmes silences s’installent, et chacun finit par se sentir seul à côté de l’autre.\n\nMa place n’est pas d’arbitrer ni de désigner un responsable. Elle est de rendre audible ce que chacun porte et n’arrive plus à formuler, pour que la conversation redevienne possible. Ce que vous en ferez ensuite vous appartient : se retrouver, ou se séparer autrement.',
  },
  {
    slug: 'viniyoga',
    title: 'Viniyoga',
    groupLabel: FAMILLES.corps,
    method: 'Séance individuelle',
    duration: '1 h · 55 € — au cabinet',
    excerpt:
      'Le yoga adapté à vous, et non l’inverse — souffle, posture, lenteur.',
    body: 'Le viniyoga part d’un principe simple : c’est la pratique qui s’ajuste à la personne, pas la personne qui s’ajuste à la posture. Rien à réussir, rien à tenir devant les autres — les séances sont individuelles.\n\nOn y travaille le souffle autant que le mouvement, lentement, en écoutant ce que le corps accepte ce jour-là. C’est une porte d’entrée précieuse quand les mots viennent mal, quand l’anxiété se loge dans le ventre ou les épaules, ou simplement pour retrouver un appui quand tout vacille.',
  },
  {
    slug: 'supervision',
    title: 'Superviseur',
    groupLabel: FAMILLES.metier,
    method: 'Gestalt-thérapie',
    duration: '1 h · 70 € — au cabinet ou en visio',
    excerpt:
      'Un espace pour les praticiens : reprendre ses situations, et sa place dedans.',
    body: 'La supervision s’adresse aux thérapeutes, accompagnants et soignants qui souhaitent déposer leur pratique quelque part. On y reprend une situation qui accroche, un lien qui pèse, un doute sur ce qu’on a dit ou tu.\n\nCe n’est ni un contrôle ni un examen : c’est un lieu où penser à voix haute, repérer ce qui se joue pour soi dans la relation, et retrouver de la marge. En individuel, régulièrement ou au coup par coup selon vos besoins.',
  },
  {
    slug: 'coaching',
    title: 'Coaching',
    groupLabel: FAMILLES.metier,
    method: null,
    duration: '1 h · 70 € — au cabinet ou en visio',
    excerpt:
      'Un objectif professionnel précis, un nombre de séances défini d’avance.',
    body: 'Prise de poste, changement d’orientation, prise de parole qui angoisse, relation difficile avec une équipe : le coaching se distingue de la thérapie par son cadre. On nomme un objectif au départ, on fixe un nombre de séances, et on évalue ensemble le chemin parcouru.\n\nCela n’empêche pas d’y toucher des choses personnelles — c’est même souvent là que ça se dénoue. Mais le fil reste professionnel, et la fin est prévue dès le début.',
  },
]

async function main() {
  console.log('Installation des accompagnements…\n')

  const [{ value: maxOrder } = { value: null }] = await db
    .select({ value: max(services.sortOrder) })
    .from(services)

  let rang = 0
  let crees = 0
  let majs = 0

  for (const entree of ENTREES) {
    const [existant] = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.slug, entree.slug))
      .limit(1)

    if (existant) {
      /* Les textes ne sont pas écrasés : Anne a pu les retravailler. */
      await db
        .update(services)
        .set({
          groupLabel: entree.groupLabel,
          method: entree.method,
          sortOrder: rang,
          isActive: true,
        })
        .where(eq(services.id, existant.id))
      majs += 1
      console.log(`  rangé    ${entree.title}  →  ${entree.groupLabel}`)
    } else {
      await db.insert(services).values({
        slug: entree.slug,
        title: entree.title,
        excerpt: entree.excerpt,
        body: entree.body,
        duration: entree.duration,
        groupLabel: entree.groupLabel,
        method: entree.method,
        sortOrder: rang,
        isActive: true,
      })
      crees += 1
      console.log(`  créé     ${entree.title}  →  ${entree.groupLabel}`)
    }

    rang += 1
  }

  /* Retrait de l'affichage, pas de la base : les textes restent, et un
     interrupteur dans /admin/accompagnements suffit à les rétablir. */
  let masques = 0
  for (const slug of A_MASQUER) {
    const [existant] = await db
      .select({
        id: services.id,
        title: services.title,
        isActive: services.isActive,
      })
      .from(services)
      .where(eq(services.slug, slug))
      .limit(1)

    if (existant?.isActive) {
      await db
        .update(services)
        .set({ isActive: false, groupLabel: null, sortOrder: rang })
        .where(eq(services.id, existant.id))
      rang += 1
      masques += 1
      console.log(`  masqué   ${existant.title}`)
    }
  }

  console.log(`\n  ${crees} créé(s), ${majs} rangé(s), ${masques} masqué(s).`)
  if (maxOrder !== null && maxOrder >= rang) {
    console.log(
      '  D’autres accompagnements subsistent hors de cette liste : ils suivent,\n' +
        '  sans famille. À ranger ou retirer depuis /admin/accompagnements.',
    )
  }
  console.log(
    '\n  Textes d’attente pour les nouveaux — à faire relire par Anne.\n',
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
