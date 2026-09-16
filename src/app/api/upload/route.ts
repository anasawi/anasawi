import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  buildObjectKey,
  isAllowedMimeType,
  MAX_UPLOAD_BYTES,
  publicUrlForKey,
  putObject,
} from '@/lib/storage'

export const runtime = 'nodejs'

/**
 * Dépôt d'un fichier dans le stockage des médias.
 *
 * Le navigateur redimensionne et recompresse l'image avant l'envoi (voir
 * `MediaPicker`), ce qui ramène des photos de plusieurs mégaoctets sous la
 * limite de charge utile des fonctions serverless. La route ne fait que
 * vérifier la session, le type et la taille, puis délègue à `lib/storage`.
 *
 * L'enregistrement en base est fait ensuite par l'action `registerMedia`,
 * seule à disposer du texte alternatif et des dimensions.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
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
    return NextResponse.json(
      { error: 'Format non pris en charge : JPEG, PNG, WebP ou AVIF.' },
      { status: 415 },
    )
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'Fichier trop lourd après compression.' },
      { status: 413 },
    )
  }

  const filename = form.get('filename')
  const key = buildObjectKey(
    typeof filename === 'string' && filename ? filename : file.name,
    file.type,
  )

  try {
    await putObject(key, await file.arrayBuffer(), file.type)
  } catch (error) {
    console.error('[upload] écriture impossible', error)
    return NextResponse.json(
      { error: 'Stockage indisponible.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ key, url: publicUrlForKey(key) })
}
