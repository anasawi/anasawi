import { getObject, mimeTypeForKey } from '@/lib/storage'

export const runtime = 'nodejs'

/**
 * Sert un média du stockage.
 *
 * Les clés sont uniques et immuables : un fichier n'est jamais remplacé sous
 * la même clé, ce qui autorise un cache d'un an côté CDN et navigateur. C'est
 * ce qui rend le passage par une fonction sans conséquence sur les
 * performances — en régime établi, presque aucune requête ne l'atteint.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<Response> {
  const { key } = await params

  const mimeType = mimeTypeForKey(key)
  if (!mimeType) {
    return new Response('Média introuvable.', { status: 404 })
  }

  let data: ArrayBuffer | null
  try {
    data = await getObject(key)
  } catch (error) {
    console.error('[media] lecture impossible', error)
    return new Response('Stockage indisponible.', { status: 502 })
  }

  if (!data) {
    return new Response('Média introuvable.', { status: 404 })
  }

  return new Response(data, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(data.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
