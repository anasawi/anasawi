import { NextResponse } from 'next/server'

import { clientIp, hashIp, rateLimit } from '@/lib/rate-limit'

/**
 * Réception des violations de Content-Security-Policy.
 *
 * La politique est en mode RAPPORT (voir `next.config.ts`) : rien n'est
 * bloqué, le navigateur se contente de signaler ce qu'une politique
 * stricte aurait refusé. Encore faut-il que quelqu'un écoute — Chrome
 * ignore une politique en mode rapport qui ne désigne aucun destinataire.
 *
 * Deux formats arrivent ici, selon l'âge du navigateur :
 *   — `application/reports+json` : un TABLEAU de rapports (`report-to`) ;
 *   — `application/csp-report`   : un objet `{ "csp-report": … }`
 *     (`report-uri`, déprécié mais seul connu de Safari et Firefox).
 *
 * L'endpoint est public par nature — c'est le navigateur qui l'appelle,
 * sans session. Il se borne donc à : refuser ce qui est trop gros, ne
 * jamais renvoyer le contenu reçu, et écrire une ligne de journal.
 */

/** Au-delà, on jette : un rapport honnête pèse quelques kilo-octets. */
const TAILLE_MAXIMALE = 64 * 1024

/** Rapports journalisés par requête : une page vraiment cassée en produit
    une poignée ; au-delà, c'est du remplissage. */
const RAPPORTS_MAX = 10

/** Requêtes tolérées par adresse et par heure : l'endpoint est public, il
    ne doit pas pouvoir servir à inonder les journaux. */
const REQUETES_PAR_HEURE = 60

type ViolationCsp = {
  'document-uri'?: string
  documentURL?: string
  'violated-directive'?: string
  effectiveDirective?: string
  'blocked-uri'?: string
  blockedURL?: string
}

/**
 * Une URL sans ce qui n'a rien à faire dans un journal : le jeton d'un
 * lien d'invitation (`/invitation/<jeton>`), la chaîne de requête et le
 * fragment. Tronquée, pour qu'une valeur forgée ne remplisse pas une ligne.
 */
function assainir(url: unknown): string {
  if (typeof url !== 'string' || !url) return '?'
  return url
    .replace(/\/invitation\/[^/?#\s]+/g, '/invitation/<jeton>')
    .replace(/[?#].*$/, '')
    .slice(0, 300)
}

/** Ramène les deux formats à une ligne lisible. */
function resumer(violation: ViolationCsp): string {
  const directive = String(
    violation.effectiveDirective ?? violation['violated-directive'] ?? '?',
  ).slice(0, 80)
  const bloque = assainir(violation.blockedURL ?? violation['blocked-uri'])
  const page = assainir(violation.documentURL ?? violation['document-uri'])
  return `${directive} · bloqué: ${bloque} · page: ${page}`
}

export async function POST(request: Request): Promise<NextResponse> {
  const { allowed } = rateLimit(`csp:${hashIp(clientIp(request))}`, {
    limit: REQUETES_PAR_HEURE,
    windowMs: 60 * 60 * 1000,
  })
  if (!allowed) return new NextResponse(null, { status: 429 })

  const annonce = request.headers.get('content-length')
  if (annonce && Number(annonce) > TAILLE_MAXIMALE) {
    return new NextResponse(null, { status: 413 })
  }

  let corps: unknown
  try {
    const texte = await request.text()
    if (texte.length > TAILLE_MAXIMALE) {
      return new NextResponse(null, { status: 413 })
    }
    corps = JSON.parse(texte)
  } catch {
    /* Un corps illisible ne mérite ni journal ni erreur bruyante : le
       navigateur ne réessaiera pas, et personne n'attend de réponse. */
    return new NextResponse(null, { status: 204 })
  }

  const violations: ViolationCsp[] = Array.isArray(corps)
    ? corps
        .map((rapport) =>
          rapport && typeof rapport === 'object' && 'body' in rapport
            ? (rapport as { body: ViolationCsp }).body
            : null,
        )
        .filter((v): v is ViolationCsp => Boolean(v))
    : corps && typeof corps === 'object' && 'csp-report' in corps
      ? [(corps as { 'csp-report': ViolationCsp })['csp-report']]
      : []

  for (const violation of violations.slice(0, RAPPORTS_MAX)) {
    console.warn(`[csp] ${resumer(violation)}`)
  }

  /* 204 : le navigateur n'attend aucun contenu. */
  return new NextResponse(null, { status: 204 })
}
