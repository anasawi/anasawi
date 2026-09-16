import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

/* Pas de SVG : `next/image` refuse d'optimiser un SVG distant sans
   `dangerouslyAllowSVG`, et un SVG public peut embarquer du script. */
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Poignée de main pour l'upload direct navigateur → Vercel Blob.
 *
 * Le fichier ne transite jamais par cette route : elle ne délivre qu'un jeton
 * signé, ce qui contourne la limite de 4,5 Mo des route handlers et évite de
 * facturer de la bande passante serverless pour du transfert d'octets.
 */
export async function POST(request: Request): Promise<NextResponse> {
  /* Un corps absent ou mal formé est une erreur du client (400), pas une
     erreur serveur (500) : la lecture reste hors du `try` principal pour
     ne pas la confondre avec un refus de jeton. */
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth()
        if (!session?.user) throw new Error('Non autorisé.')

        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 12 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }
      },
      onUploadCompleted: async () => {
        /* L'enregistrement en base est fait par le client via l'action
           `registerMedia`, qui dispose seule du alt et des dimensions. */
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload impossible.'
    return NextResponse.json(
      { error: message },
      { status: message === 'Non autorisé.' ? 401 : 400 },
    )
  }
}
