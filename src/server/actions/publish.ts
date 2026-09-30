'use server'

import { asc, eq } from 'drizzle-orm'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import {
  insertSnapshotRows,
  revalidatePage,
  slugOf,
  validateSnapshotRows,
} from './page-helpers'
import { fail, isUuid, ok, type ActionResult } from './types'
import { projectSection } from '@/lib/snapshot'
import { db, runBatch } from '@/server/db'
import { pages, sections, type Section } from '@/server/db/schema'

/* ════════════════════════════════════════════════════════════════════
   Publication
   ════════════════════════════════════════════════════════════════════ */

/**
 * Publie une page : copie l'état courant de ses sections dans
 * l'instantané servi au public. Entre deux publications, l'admin édite
 * librement — les visiteurs ne voient rien.
 */
export async function publishPage(pageId: string): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(pageId)) return fail(MESSAGES.pageIntrouvable)

    /* Sans ce contrôle, un identifiant arbitraire renvoyait `ok` sans
       rien écrire — l'éditeur affichait « Publié » à tort. */
    const [page] = await db
      .select({ slug: pages.slug })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1)
    if (!page) return fail(MESSAGES.pageIntrouvable)

    const rows = await db
      .select()
      .from(sections)
      .where(eq(sections.pageId, pageId))
      .orderBy(asc(sections.sortOrder), asc(sections.createdAt))

    await db
      .update(pages)
      .set({
        publishedSnapshot: rows.map(projectSection),
        publishedAt: new Date(),
        status: 'published',
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId))

    revalidatePage(page.slug)
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Restauration — l'inverse d'une suppression
   ════════════════════════════════════════════════════════════════════ */

/**
 * Restaure un sous-arbre supprimé — le ⌘Z d'une suppression.
 *
 * Les lignes sont réinsérées avec leurs identifiants D'ORIGINE : les autres
 * entrées d'historique qui les référencent restent valides. Parents et
 * enfants partent dans le même lot : pas d'arbre à moitié restauré.
 */
export async function restoreSections(
  input: unknown,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    const validated = validateSnapshotRows(input)
    if (!validated.ok) return fail(validated.error)
    if (validated.rows.length === 0 || !validated.pageId) {
      return fail(MESSAGES.rienARestaurer)
    }

    await runBatch(insertSnapshotRows(validated.rows))

    revalidatePage(await slugOf(validated.pageId))
    return ok()
  })
}

/**
 * Abandonne le brouillon : les sections vivantes de la page sont remplacées
 * par celles de la version en ligne (`published_snapshot`).
 *
 * Refusé si la page n'a jamais été publiée — il n'y aurait rien vers quoi
 * revenir. Les sections restaurées gardent leurs identifiants publiés ;
 * l'historique ⌘Z de l'éditeur est vidé côté client, puisqu'il pointait
 * vers un état qui n'existe plus. Les lignes réinsérées sont relues en
 * base et renvoyées telles quelles : l'éditeur remplace son état local
 * sans attendre un rechargement.
 */
export async function discardDraft(
  pageId: string,
): Promise<ActionResult<{ sections: Section[] }>> {
  return adminAction(async () => {
    if (!isUuid(pageId)) return fail(MESSAGES.pageIntrouvable)

    const [page] = await db
      .select({
        slug: pages.slug,
        publishedAt: pages.publishedAt,
        publishedSnapshot: pages.publishedSnapshot,
      })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1)

    if (!page) return fail(MESSAGES.pageIntrouvable)
    if (!page.publishedAt || !Array.isArray(page.publishedSnapshot)) {
      return fail(MESSAGES.jamaisPubliee)
    }

    const validated = validateSnapshotRows(page.publishedSnapshot)
    if (!validated.ok) return fail(validated.error)
    if (validated.pageId !== null && validated.pageId !== pageId) {
      return fail(MESSAGES.instantaneAutrePage)
    }

    /* Validation faite AVANT toute écriture : si l'instantané est
       inexploitable, le brouillon reste intact. Puis suppression et
       réinsertion dans UN lot : une panne entre les deux laissait une
       page vide, sans brouillon ni version restaurée. */
    await runBatch([
      db.delete(sections).where(eq(sections.pageId, pageId)),
      ...insertSnapshotRows(validated.rows),
    ])

    const restored = await db
      .select()
      .from(sections)
      .where(eq(sections.pageId, pageId))
      .orderBy(asc(sections.sortOrder), asc(sections.createdAt))

    revalidatePage(page.slug)
    return ok({ sections: restored })
  })
}
