'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'

import { adminAction } from './admin'
import { fail, formError, ok, type ActionResult } from './types'
import { domaine, piedSchema, type Pied } from '@/lib/pied'
import { buildObjectKey, publicUrlForKey, putObject } from '@/lib/storage'
import { db } from '@/server/db'
import { media, mediaFolders, settings, type Media } from '@/server/db/schema'
import { trouverLogo } from '@/server/logos'
import { tags } from '@/server/queries'

/**
 * Le pied de page : enregistrement depuis les Réglages, et récupération
 * automatique du logo d'un organisme à partir de son site.
 */

const MIGRATION = 'La base n’a pas encore la colonne du pied de page : lancez « npm run db:migrate », puis réessayez.'

export async function updatePied(input: Pied): Promise<ActionResult<void>> {
  return adminAction(async () => {
    const parsed = piedSchema.safeParse(input)
    if (!parsed.success) return formError(parsed.error, 'Certains champs sont à corriger.')
    try {
      await db
        .insert(settings)
        .values({ id: 'singleton', pied: parsed.data, updatedAt: new Date() })
        .onConflictDoUpdate({ target: settings.id, set: { pied: parsed.data, updatedAt: new Date() } })
    } catch (erreur) {
      if (/pied/.test(String((erreur as Error).message))) return fail(MIGRATION)
      throw erreur
    }
    revalidateTag(tags.settings)
    revalidatePath('/', 'layout')
    return ok()
  })
}

/** Le dossier « Logos » de la médiathèque (créé au besoin). */
async function dossierLogos(): Promise<string> {
  const [existant] = await db.select({ id: mediaFolders.id }).from(mediaFolders).where(eq(mediaFolders.name, 'Logos')).limit(1)
  if (existant) return existant.id
  const [cree] = await db.insert(mediaFolders).values({ name: 'Logos', sortOrder: 99 }).returning({ id: mediaFolders.id })
  return cree!.id
}

/** Va chercher le logo sur le site de l'organisme et l'ajoute à la médiathèque. */
export async function recupererLogo(site: string, nom: string): Promise<ActionResult<Media>> {
  return adminAction(async () => {
    let logo
    try {
      logo = await trouverLogo(site)
    } catch (erreur) {
      return fail(`Logo introuvable sur ${domaine(site)} : ${(erreur as Error).message} Vous pouvez en choisir un dans la médiathèque.`)
    }
    const etiquette = (nom || domaine(site)).slice(0, 80)
    const key = buildObjectKey(`logo-${etiquette}`, 'image/png')
    await putObject(key, new Uint8Array(logo.png).buffer as ArrayBuffer, 'image/png')
    const [cree] = await db
      .insert(media)
      .values({
        url: publicUrlForKey(key),
        pathname: key,
        filename: `logo-${domaine(site)}.png`,
        alt: `Logo — ${etiquette}`,
        width: logo.largeur,
        height: logo.hauteur,
        mimeType: 'image/png',
        size: logo.png.byteLength,
        folderId: await dossierLogos(),
      })
      .returning()
    if (!cree) return fail('Le logo n’a pas pu être enregistré.')
    revalidateTag(tags.media)
    revalidatePath('/admin/medias')
    return ok(cree)
  })
}
