import { getObject, mimeTypeForKey } from '@/lib/storage'
import { describeError } from '@/server/actions/types'

export const runtime = 'nodejs'

/**
 * En-têtes communs à toute réponse de média.
 *
 * — Cache d'un an : les clés sont uniques et immuables, un fichier n'est
 *   jamais remplacé sous la même clé.
 * — CSP `default-src 'none'; sandbox` : même si un fichier passait les
 *   contrôles à l'envoi en portant du script (un polyglotte), le navigateur
 *   ne l'exécuterait pas depuis cette origine.
 * — `Cross-Origin-Resource-Policy: same-origin` : les médias ne peuvent
 *   pas être embarqués par un autre site (pas de hotlinking).
 * — `nosniff` : le type annoncé fait foi, le navigateur ne devine pas.
 */
function mediaHeaders(mimeType: string, extra: Record<string, string> = {}) {
  return {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  }
}

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
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  return serve(request, context, true)
}

/** `HEAD` : les mêmes en-têtes, sans corps — ce que demandent les lecteurs
    vidéo et les vérificateurs de liens avant de charger. */
export async function HEAD(
  request: Request,
  context: { params: Promise<{ key: string }> },
): Promise<Response> {
  return serve(request, context, false)
}

async function serve(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
  withBody: boolean,
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
    console.error('[media] lecture impossible', describeError(error))
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
   *
   * Trois formes (RFC 9110) : `bytes=a-b`, `bytes=a-` (jusqu'à la fin) et
   * `bytes=-n` (les N DERNIERS octets — un suffixe, pas « de 0 à n »).
   */
  const total = data.byteLength
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
  if (range && (range[1] || range[2])) {
    let start: number
    let end: number
    if (!range[1]) {
      const suffix = Math.min(Number(range[2]), total)
      start = total - suffix
      end = total - 1
    } else {
      start = Number(range[1])
      end = range[2] ? Math.min(Number(range[2]), total - 1) : total - 1
    }
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${total}` },
      })
    }
    return new Response(withBody ? data.slice(start, end + 1) : null, {
      status: 206,
      headers: mediaHeaders(mimeType, {
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${total}`,
      }),
    })
  }

  return new Response(withBody ? data : null, {
    headers: mediaHeaders(mimeType, { 'Content-Length': String(total) }),
  })
}
