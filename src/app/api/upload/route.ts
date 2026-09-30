import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { rejectCrossSite } from '@/server/http/same-origin'
import {
  buildObjectKey,
  isAllowedMimeType,
  MAX_UPLOAD_BYTES,
  publicUrlForKey,
  putObject,
  sniffMimeType,
} from '@/lib/storage'
import { describeError } from '@/server/actions/types'

export const runtime = 'nodejs'

/** Marge pour l'enveloppe multipart (limites, en-têtes de partie, champ
    `filename`) au-dessus de la taille maximale du fichier lui-même. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

const FORMAT_REFUSE = 'Format non pris en charge : JPEG, PNG, WebP, AVIF, MP4 ou WebM.'

/**
 * Dépôt d'un fichier dans le stockage des médias.
 *
 * Le navigateur redimensionne et recompresse l'image avant l'envoi (voir
 * `MediaPicker`), ce qui ramène des photos de plusieurs mégaoctets sous la
 * limite de charge utile des fonctions serverless. La route ne fait que
 * vérifier la session, l'origine, le type (déclaré ET révélé par les
 * octets) et la taille, puis délègue à `lib/storage`.
 *
 * L'enregistrement en base est fait ensuite par l'action `registerMedia`,
 * seule à disposer du texte alternatif et des dimensions.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const crossSite = rejectCrossSite(request)
  if (crossSite) return crossSite

  /* Refus AVANT de lire le corps : un envoi trop lourd est rejeté sur son
     annonce, sans charger les octets en mémoire. */
  const announced = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(announced) && announced > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json(
      { error: 'Fichier trop lourd après compression.' },
      { status: 413 },
    )
  }

  /* Un corps qui n'est pas un formulaire multipart est une erreur du client
     (400), pas une panne du serveur (500). */
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  }

  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json({ error: FORMAT_REFUSE }, { status: 415 })
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'Fichier trop lourd après compression.' },
      { status: 413 },
    )
  }

  const bytes = await file.arrayBuffer()

  /* Le type déclaré doit être confirmé par la signature des octets : un
     exécutable renommé `.png` porte un `Content-Type` d'image, pas une
     en-tête PNG. */
  const sniffed = sniffMimeType(new Uint8Array(bytes.slice(0, 16)))
  if (sniffed !== file.type) {
    return NextResponse.json({ error: FORMAT_REFUSE }, { status: 415 })
  }

  const filename = form.get('filename')
  const key = buildObjectKey(
    typeof filename === 'string' && filename ? filename : file.name,
    file.type,
  )

  try {
    await putObject(key, bytes, file.type)
  } catch (error) {
    console.error('[upload] écriture impossible', describeError(error))
    /* Hors production, la cause technique accompagne la réponse : cette
       route n'est atteignable qu'avec une session d'administration, et
       sans elle on ne peut pas diagnostiquer un stockage qui refuse
       d'écrire (les journaux ne sont pas toujours sous la main). En
       production, les journaux de l'hébergeur suffisent, et le message
       d'une bibliothèque n'a rien à faire dans une réponse HTTP. */
    return NextResponse.json(
      {
        error: 'Stockage indisponible.',
        ...(process.env.NODE_ENV !== 'production'
          ? { detail: describeError(error) }
          : {}),
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ key, url: publicUrlForKey(key) })
}
