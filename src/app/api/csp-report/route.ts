import { NextResponse } from 'next/server'

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

type ViolationCsp = {
  'document-uri'?: string
  documentURL?: string
  'violated-directive'?: string
  effectiveDirective?: string
  'blocked-uri'?: string
  blockedURL?: string
}

/** Ramène les deux formats à une ligne lisible. */
function resumer(violation: ViolationCsp): string {
  const directive =
    violation.effectiveDirective ?? violation['violated-directive'] ?? '?'
  const bloque = violation.blockedURL ?? violation['blocked-uri'] ?? '?'
  const page = violation.documentURL ?? violation['document-uri'] ?? '?'
  return `${directive} · bloqué: ${bloque} · page: ${page}`
}

export async function POST(request: Request): Promise<NextResponse> {
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

  for (const violation of violations) {
    console.warn(`[csp] ${resumer(violation)}`)
  }

  /* 204 : le navigateur n'attend aucun contenu. */
  return new NextResponse(null, { status: 204 })
}
