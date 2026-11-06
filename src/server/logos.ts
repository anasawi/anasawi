import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * RÉCUPÉRER LE LOGO D'UN ORGANISME — à partir de l'adresse de son site.
 *
 * On lit la page d'accueil, on y cherche le logo (une image dont le nom,
 * la classe ou le texte alternatif parle de « logo », puis l'image de
 * partage `og:image`, puis l'icône d'application), on la télécharge et on
 * la convertit en PNG (les logos SVG compris). Le PNG obtenu rejoint la
 * médiathèque, comme une image envoyée à la main.
 *
 * Prudence, puisque c'est le SERVEUR qui va chercher : seulement http(s),
 * jamais une adresse privée ou locale (vérifiée à chaque redirection),
 * délais courts, tailles bornées.
 */

const DELAI_MS = 9000
const MAX_HTML = 1_500_000
const MAX_IMAGE = 6_000_000
const AGENT = 'Mozilla/5.0 (compatible; AnasawiLogo/1.0; +https://anasawi.fr)'

function ipPrivee(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true
    const v4 = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return v4 ? ipPrivee(v4[1]!) : false
  }
  const [a, b] = ip.split('.').map(Number) as [number, number]
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function adresseSure(brute: string): Promise<URL> {
  const url = new URL(brute)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Adresse non prise en charge.')
  if (url.username || url.password) throw new Error('Adresse non prise en charge.')
  const hote = url.hostname.replace(/^\[|\]$/g, '')
  if (hote === 'localhost' || hote.endsWith('.local') || hote.endsWith('.internal')) throw new Error('Adresse non autorisée.')
  const ips = isIP(hote) ? [{ address: hote }] : await lookup(hote, { all: true })
  if (!ips.length || ips.some((i) => ipPrivee(i.address))) throw new Error('Adresse non autorisée.')
  return url
}

/** Un GET prudent : redirections suivies à la main (chaque étape vérifiée), corps borné. */
async function telecharger(brute: string, max: number): Promise<{ url: URL; type: string; octets: Buffer }> {
  let url = await adresseSure(brute)
  for (let saut = 0; saut < 5; saut++) {
    const reponse = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(DELAI_MS),
      headers: { 'user-agent': AGENT, accept: 'text/html,image/*;q=0.9,*/*;q=0.5', 'accept-language': 'fr,en;q=0.8' },
    })
    if (reponse.status >= 300 && reponse.status < 400) {
      const suite = reponse.headers.get('location')
      if (!suite) throw new Error('Redirection sans destination.')
      url = await adresseSure(new URL(suite, url).toString())
      continue
    }
    if (!reponse.ok || !reponse.body) throw new Error(`Le site a répondu ${reponse.status}.`)
    const annonce = Number(reponse.headers.get('content-length') ?? 0)
    if (annonce > max) throw new Error('Fichier trop lourd.')
    const morceaux: Uint8Array[] = []
    let total = 0
    for await (const morceau of reponse.body as unknown as AsyncIterable<Uint8Array>) {
      total += morceau.byteLength
      if (total > max) throw new Error('Fichier trop lourd.')
      morceaux.push(morceau)
    }
    return { url, type: (reponse.headers.get('content-type') ?? '').toLowerCase(), octets: Buffer.concat(morceaux) }
  }
  throw new Error('Trop de redirections.')
}

const attr = (balise: string, nom: string) => balise.match(new RegExp(`\\b${nom}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1] ?? null

/** Les candidats, du plus probable au moins probable. */
function candidats(html: string, base: URL): string[] {
  const liste: { url: string; score: number }[] = []
  const ajouter = (brute: string | null, score: number) => {
    if (!brute || brute.startsWith('data:')) return
    try {
      liste.push({ url: new URL(brute.replace(/&amp;/g, '&'), base).toString(), score })
    } catch {
      /* adresse illisible : ignorée */
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const b = m[0]
    const src = attr(b, 'src') ?? attr(b, 'data-src')
    const indices = `${src ?? ''} ${attr(b, 'class') ?? ''} ${attr(b, 'alt') ?? ''} ${attr(b, 'id') ?? ''}`.toLowerCase()
    if (/logo/.test(indices)) ajouter(src, /favicon|icon-|sprite/.test(indices) ? 40 : 100 - liste.length)
  }
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const prop = (attr(m[0], 'property') ?? attr(m[0], 'name') ?? '').toLowerCase()
    if (prop === 'og:image' || prop === 'og:image:url') ajouter(attr(m[0], 'content'), 50)
  }
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(m[0], 'rel') ?? '').toLowerCase()
    if (/apple-touch-icon/.test(rel)) ajouter(attr(m[0], 'href'), 45)
    else if (/\bicon\b/.test(rel)) ajouter(attr(m[0], 'href'), 30)
  }
  ajouter('/apple-touch-icon.png', 10)
  return [...new Map(liste.sort((a, b) => b.score - a.score).map((c) => [c.url, c])).keys()].slice(0, 8)
}

export type LogoTrouve = { png: Buffer; largeur: number; hauteur: number; source: string }

/** Le logo du site à cette adresse, en PNG (au plus 600 × 300), ou une erreur explicite. */
export async function trouverLogo(site: string): Promise<LogoTrouve> {
  const page = await telecharger(site, MAX_HTML)
  if (!page.type.includes('html')) throw new Error('Cette adresse ne mène pas à une page web.')
  const html = page.octets.toString('utf8')
  /* Les redirections « meta refresh » (eagt.org → eagt.org/home) : on suit une fois. */
  const rafraichir = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=['"]?([^"'>]+)/i)?.[1]
  if (rafraichir && html.length < 3000) return trouverLogo(new URL(rafraichir, page.url).toString())

  const sharp = (await import('sharp')).default
  let derniere = 'Aucun logo trouvé sur la page.'
  /* Un logo tout blanc (fait pour un bandeau foncé) serait invisible sur
     sa carte blanche : on garde l'image en réserve, on cherche mieux, et
     à défaut on l'assombrit. */
  let reserve: LogoTrouve | null = null
  for (const adresse of candidats(html, page.url)) {
    try {
      const image = await telecharger(adresse, MAX_IMAGE)
      const svg = image.type.includes('svg') || /^\s*(<\?xml|<svg)/.test(image.octets.subarray(0, 200).toString('utf8'))
      if (!svg && !image.type.startsWith('image/')) continue
      /* Les marges vides autour du logo sont rognées : il remplit sa carte. */
      const rogne = await sharp(image.octets, { density: svg ? 300 : 72, limitInputPixels: 40_000_000 })
        .trim({ threshold: 18 })
        .png()
        .toBuffer()
        .catch(() => image.octets)
      const sortie = await sharp(rogne, { density: svg ? 300 : 72, limitInputPixels: 40_000_000 })
        .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: !svg })
        .png({ compressionLevel: 9 })
        .toBuffer({ resolveWithObject: true })
      if (sortie.info.width < 24 || sortie.info.height < 16) continue
      const trouve = { png: sortie.data, largeur: sortie.info.width, hauteur: sortie.info.height, source: adresse }
      if (await toutBlanc(sharp, sortie.data)) {
        reserve ??= trouve
        continue
      }
      return trouve
    } catch (erreur) {
      derniere = (erreur as Error).message
    }
  }
  if (reserve) {
    /* Blanc sur transparent : on le passe en bleu nuit (la couleur des textes du site). */
    const { data: alpha, info } = await sharp(reserve.png).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
    const nuit = await sharp({ create: { width: info.width, height: info.height, channels: 3, background: { r: 46, g: 66, b: 79 } } })
      .joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    return { ...reserve, png: nuit }
  }
  throw new Error(derniere)
}

/** Le logo est-il (presque) tout blanc là où il est visible ? */
async function toutBlanc(sharp: (typeof import('sharp'))['default'], png: Buffer): Promise<boolean> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let visibles = 0
  let clarte = 0
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3]! < 40) continue
    visibles++
    clarte += (data[i]! + data[i + 1]! + data[i + 2]!) / 3
  }
  return visibles > 0 && clarte / visibles > 235
}
