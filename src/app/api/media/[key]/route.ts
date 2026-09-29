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
  request: Request,
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

  /*
   * Plages d'octets. Safari refuse de LIRE une vidéo servie par un serveur
   * qui ignore `Range` : il demande d'abord les deux premiers octets, et
   * sans un 206 en face, la vidéo reste noire. Les images n'en ont pas
   * besoin mais n'en souffrent pas. L'objet est déjà en mémoire (quatre
   * mégaoctets au plus) : découper est gratuit.
   */
  const total = data.byteLength
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
  if (range) {
    const debut = range[1] ? Number(range[1]) : 0
    const fin = range[2] ? Math.min(Number(range[2]), total - 1) : total - 1
    if (Number.isNaN(debut) || Number.isNaN(fin) || debut > fin || debut >= total) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${total}` },
      })
    }
    return new Response(data.slice(debut, fin + 1), {
      status: 206,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fin - debut + 1),
        'Content-Range': `bytes ${debut}-${fin}/${total}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  return new Response(data, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(total),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
