import 'server-only'

import { and, eq, isNull } from 'drizzle-orm'

import { PAGE_MODERNE_PAR_DEFAUT } from '@/blocks/moderne/blocs'
import type { Contenu } from '@/blocks/moderne/contenu'
import { ANCRES, estVide, TEXTES, textesDe, type CleTextes } from '@/blocks/moderne/textes'
import { blockRegistry, getBlock } from '@/blocks/registry'
import { chargerContenu } from '@/components/anasawi/charger'
import { projectSection } from '@/lib/snapshot'
import { db } from '@/server/db'
import { pages, sections, type Section } from '@/server/db/schema'
import { SLUG_MODERNE } from '@/server/queries'

/**
 * La page de la version moderne : créée au premier passage dans
 * l'éditeur, avec ses sections dans l'ordre, et publiée d'emblée (sinon
 * /moderne resterait vide jusqu'au premier « Publier »).
 *
 * À CHAQUE ouverture de l'éditeur, ensuite :
 *  - les champs vides des sections jamais préremplies reçoivent le texte
 *    réellement affiché (`preremplir`) — on modifie ce qu'on voit ;
 *  - le pied de page, devenu une section modifiable, est ajouté s'il
 *    manque.
 * Rien de ce qui a été saisi n'est jamais écrasé.
 */
export async function assurerPageModerne(): Promise<void> {
  const [existante] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, SLUG_MODERNE)).limit(1)

  if (!existante) {
    const contenu = await chargerContenu({ brouillon: true })
    const [page] = await db
      .insert(pages)
      .values({ slug: SLUG_MODERNE, title: 'Accueil — version moderne', status: 'published', isHome: false })
      .onConflictDoNothing()
      .returning()
    if (!page) return
    const lignes = await db
      .insert(sections)
      .values(
        PAGE_MODERNE_PAR_DEFAUT.map((type, i) => {
          const bloc = blockRegistry[type]
          return {
            pageId: page.id,
            type,
            sortOrder: i,
            payload: { ...(bloc.schema.parse(bloc.defaults) as Record<string, unknown>), ...(bloc.preremplir?.(contenu) ?? {}) },
          }
        }),
      )
      .returning()
    await db
      .update(pages)
      .set({ publishedSnapshot: lignes.map(projectSection), publishedAt: new Date() })
      .where(eq(pages.id, page.id))
    return
  }

  const lignes = await db
    .select()
    .from(sections)
    .where(and(eq(sections.pageId, existante.id), isNull(sections.parentId)))

  /* RIEN À FAIRE dans l'immense majorité des ouvertures : pied de page
     présent, sections préremplies, aucun champ nouveau. On ne charge alors
     pas le contenu (six lectures) — l'éditeur s'ouvre plus vite. */
  const aFaire =
    !lignes.some((s) => s.type === 'mHorizon') ||
    lignes.some((s) => {
      const bloc = getBlock(s.type)
      if (!bloc?.preremplir) return false
      const payload = (s.payload ?? {}) as Record<string, unknown>
      if (payload.rempli !== true) return true
      const forme = (bloc.schema as unknown as { shape?: Record<string, unknown> }).shape
      return forme ? Object.keys(forme).some((cle) => !(cle in payload)) : false
    })
  if (!aFaire) return
  const contenu = await chargerContenu({ brouillon: true })

  /* Le pied de page, s'il manque : en dernier. */
  if (!lignes.some((s) => s.type === 'mHorizon')) {
    const bloc = blockRegistry.mHorizon
    await db.insert(sections).values({
      pageId: existante.id,
      type: 'mHorizon',
      sortOrder: lignes.reduce((m, s) => Math.max(m, s.sortOrder + 1), 0),
      payload: { ...(bloc.schema.parse(bloc.defaults) as Record<string, unknown>), ...bloc.preremplir!(contenu) },
    })
  }

  /* Le préremplissage des sections qui ne l'ont jamais été. */
  for (const s of lignes) {
    const bloc = getBlock(s.type)
    const payload = (s.payload ?? {}) as Record<string, unknown>
    if (!bloc?.preremplir) continue
    const valeurs = bloc.preremplir(contenu)
    if (payload.rempli === true) {
      /* Déjà préremplie : seuls les champs AJOUTÉS depuis (absents de
         l'enregistrement) reçoivent leur texte de départ. */
      const nouveaux = Object.entries(valeurs).filter(([cle]) => !(cle in payload))
      if (nouveaux.length)
        await db
          .update(sections)
          .set({ payload: { ...payload, ...Object.fromEntries(nouveaux) }, updatedAt: new Date() })
          .where(eq(sections.id, s.id))
      continue
    }
    const suite: Record<string, unknown> = { ...payload }
    for (const [cle, valeur] of Object.entries(valeurs)) if (estVide(suite[cle])) suite[cle] = valeur
    suite.rempli = true
    await db.update(sections).set({ payload: suite, updatedAt: new Date() }).where(eq(sections.id, s.id))
  }
}

/** Les valeurs préremplies d'un bloc moderne (création d'une section). */
export async function valeursDeDepart(type: string): Promise<Record<string, unknown> | null> {
  const bloc = getBlock(type)
  if (!bloc?.preremplir) return null
  return bloc.preremplir(await chargerContenu({ brouillon: true }))
}

/** Le menu du site moderne : les sections actives qui y figurent, dans
    l'ordre, avec le libellé saisi (« Dans le menu »). */
export function menuModerne(lignes: Section[], c: Contenu): { href: string; label: string }[] {
  return lignes
    .filter((s) => s.isActive && !s.parentId && s.type in ANCRES)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const cle = s.type as CleTextes
      const textes = textesDe(cle, c, (s.payload ?? {}) as Record<string, unknown>) as { menu?: string }
      return { href: `#${ANCRES[cle]}`, label: (textes.menu ?? '').trim() }
    })
    .filter((l) => l.label)
}

export { TEXTES }
