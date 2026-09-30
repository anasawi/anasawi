import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'node:crypto'

/**
 * Jeton d'invitation : empreinte pour le retrouver, chiffrement pour le
 * relire.
 *
 * La base cherche une invitation par l'EMPREINTE SHA-256 du jeton (colonne
 * `token_hash`). Mais l'administration doit pouvoir recopier le lien tant
 * qu'il vaut, sans en refaire un : le jeton est donc aussi conservé, mais
 * CHIFFRÉ (colonne `token`) — AES-256-GCM, clé dérivée d'`AUTH_SECRET` par
 * HKDF. Une lecture de la base seule ne donne ni le jeton ni le lien ; il
 * faut aussi le secret de l'application.
 *
 * Format stocké : `v1.<iv>.<tag>.<données>` en base64url. Le préfixe de
 * version permet de changer d'algorithme sans casser les lignes existantes.
 */

const VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

/** L'empreinte, telle qu'elle est stockée et cherchée. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Un jeton neuf : 32 octets aléatoires, en base64url (43 caractères). */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Clé de chiffrement dérivée d'`AUTH_SECRET`, jamais le secret lui-même :
 * une clé par usage (« info » distinct), pour qu'une fuite d'une dérivée
 * ne compromette pas les autres emplois du secret.
 */
function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET manquant : impossible de chiffrer le jeton d’invitation.')
  }
  return Buffer.from(hkdfSync('sha256', secret, 'anasawi', 'invitation-token-v1', 32))
}

export function encryptInvitationToken(token: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    data.toString('base64url'),
  ].join('.')
}

/**
 * Déchiffre un jeton stocké — `null` s'il est illisible (secret changé,
 * ligne antérieure au chiffrement, valeur altérée). L'administration
 * affiche alors « refaire un lien » plutôt qu'une erreur.
 */
export function decryptInvitationToken(stored: string | null): string | null {
  if (!stored) return null
  const [version, iv, tag, data] = stored.split('.')
  if (version !== VERSION || !iv || !tag || !data) return null
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(iv, 'base64url'),
    )
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}
