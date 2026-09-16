import { createHash, randomUUID } from 'node:crypto'

type Entry = { count: number; resetAt: number }

/**
 * Limiteur en mémoire.
 *
 * Suffisant pour un formulaire de contact : chaque instance serverless a son
 * propre compteur, ce qui laisse passer quelques requêtes de plus qu'un
 * compteur partagé, mais bloque efficacement une rafale depuis une même IP.
 * Si le volume le justifiait un jour, seul ce fichier serait à remplacer par
 * un compteur Redis — l'appelant ne changerait pas.
 */
const store = new Map<string, Entry>()

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60 * 60 * 1000 } = {},
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  entry.count += 1

  /* Purge opportuniste — évite une croissance illimitée de la Map. */
  if (store.size > 5000) {
    for (const [k, v] of store) if (v.resetAt < now) store.delete(k)
  }

  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) }
}

/**
 * Sel de l'empreinte d'IP : `AUTH_SECRET`, ou à défaut une valeur aléatoire
 * fixe pour la durée du processus. Un hachage NON salé d'une IPv4 se
 * retrouve par table arc-en-ciel en quelques secondes — le repli garantit
 * qu'il n'en existe jamais, même sur une instance mal configurée
 * (`doctor` exige `AUTH_SECRET` de toute façon). Le sel de repli changeant à
 * chaque démarrage, les compteurs ne survivent pas à un redémarrage — ce qui
 * est déjà le cas du limiteur en mémoire.
 */
const IP_SALT: string = process.env.AUTH_SECRET || randomUUID()

/** L'IP n'est jamais stockée en clair — seulement son empreinte. */
export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${ip}${IP_SALT}`)
    .digest('hex')
    .slice(0, 32)
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}
