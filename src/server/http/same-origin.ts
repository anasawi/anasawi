import { NextResponse } from 'next/server'

/**
 * Défense en profondeur contre les requêtes forgées depuis un autre site.
 *
 * Les cookies de session sont `SameSite=Lax` et les Server Actions ont leur
 * propre contrôle d'origine ; les routes API, elles, n'en ont aucun. Deux
 * signaux, posés par le navigateur et non falsifiables par une page :
 *   — `Sec-Fetch-Site` : `cross-site` désigne sans ambiguïté une page d'un
 *     autre site ;
 *   — `Origin` : comparé à l'hôte servi (`Host`, ou `X-Forwarded-Host`
 *     derrière le CDN).
 *
 * L'`Origin` n'est exigé QUE s'il est présent : les clients hors navigateur
 * (tests d'API, curl, outils) ne l'envoient pas, et ce n'est pas eux que ce
 * contrôle vise — sans cookie, ils n'ont de toute façon pas de session.
 */
export function rejectCrossSite(request: Request): NextResponse | null {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site') return refuse()

  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return null

  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')
  if (!host) return null

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return refuse()
  }
  return originHost.toLowerCase() === host.toLowerCase() ? null : refuse()
}

function refuse(): NextResponse {
  return NextResponse.json({ error: 'Origine refusée.' }, { status: 403 })
}
