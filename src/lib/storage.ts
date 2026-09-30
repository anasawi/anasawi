import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Stockage des médias — couche indépendante de l'hébergeur.
 *
 * Le CMS ne connaît que trois opérations (`putObject`, `getObject`,
 * `removeObject`) et une clé opaque. Changer d'hébergeur revient à écrire un
 * nouveau pilote ici, sans toucher ni aux routes, ni à l'admin, ni à la base :
 * c'est la leçon de la migration Vercel → Netlify.
 *
 * Deux pilotes existent :
 *   - `netlify` : Netlify Blobs, utilisé dès que le code tourne sur Netlify ;
 *   - `local`   : dossier `.storage/` du projet, pour `next dev` sans compte.
 *
 * Les objets ne sont jamais exposés directement : ils sont servis par la route
 * `/api/media/[key]`, donc toutes les URL du site restent sur le même domaine.
 */

const STORE_NAME = 'media'
const LOCAL_DIR = path.join(process.cwd(), '.storage')

/* Types et limites : définis dans `lib/media-kind.ts` (sans dépendance
   Node, donc importable côté client) et réexportés ici pour les routes et
   actions qui ne connaissent que ce module. */
import type { AllowedMimeType } from './media-kind'

export {
  ALLOWED_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  isAllowedMimeType,
  isVideoMimeType,
  sniffMimeType,
  type AllowedMimeType,
} from './media-kind'

const EXTENSION_BY_MIME: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const MIME_BY_EXTENSION: Record<string, AllowedMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

/**
 * Type MIME déduit de l'extension de la clé.
 *
 * Les clés sont générées ici et portent toujours une extension connue : pas
 * besoin de stocker de métadonnées en parallèle des octets.
 */
export function mimeTypeForKey(key: string): AllowedMimeType | null {
  const extension = key.split('.').pop()?.toLowerCase()
  if (!extension) return null
  return MIME_BY_EXTENSION[extension] ?? null
}

/** URL publique d'un objet — toujours relative, donc valable sur tout domaine. */
export function publicUrlForKey(key: string): string {
  return `/api/media/${encodeURIComponent(key)}`
}

/**
 * Clé unique et lisible : `portrait-anne-3f9c1a2b.webp`.
 *
 * Le fragment aléatoire évite toute collision et rend la clé imprévisible ;
 * le préfixe issu du nom d'origine garde la médiathèque déchiffrable quand on
 * inspecte le stockage à la main.
 */
export function buildObjectKey(filename: string, mimeType: AllowedMimeType) {
  const stem = filename
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  const suffix = randomUUID().replace(/-/g, '').slice(0, 12)
  const extension = EXTENSION_BY_MIME[mimeType]

  return `${stem || 'image'}-${suffix}.${extension}`
}

/* ─── Pilotes ──────────────────────────────────────────────────────────── */

type Driver = {
  put(key: string, data: ArrayBuffer, mimeType: AllowedMimeType): Promise<void>
  get(key: string): Promise<ArrayBuffer | null>
  remove(key: string): Promise<void>
}

/**
 * Netlify injecte `NETLIFY=true` pendant le build et dans les fonctions ;
 * `MEDIA_STORAGE` permet de forcer un pilote (tests, exécution locale contre
 * le vrai stockage via `netlify dev`).
 */
function driverName(): 'netlify' | 'local' {
  const forced = process.env.MEDIA_STORAGE
  if (forced === 'netlify' || forced === 'local') return forced
  /* `NETLIFY=true` n'existe qu'au BUILD : dans les fonctions en ligne, la
     variable est absente et le pilote local prenait le relais — il
     tentait d'écrire dans `/var/task/.storage`, en lecture seule, et
     tout envoi de média échouait en production (« ENOENT … mkdir »).
     La lecture, elle, répondait « introuvable » au lieu d'une erreur.
     On reconnaît donc aussi le contexte Blobs injecté à l'exécution, et
     à défaut le mode production tout court : hors Netlify, la production
     n'existe pas pour ce site, et les tests forcent `local`. */
  if (
    process.env.NETLIFY === 'true' ||
    process.env.NETLIFY_BLOBS_CONTEXT ||
    process.env.NODE_ENV === 'production'
  ) {
    return 'netlify'
  }
  return 'local'
}

/* L'import est différé : `getStore` doit être appelé dans le contexte d'une
   requête, et le paquet n'a rien à faire dans le bundle en mode local. */
async function netlifyDriver(): Promise<Driver> {
  const { getStore } = await import('@netlify/blobs')
  /* Cohérence forte : une image tout juste envoyée doit être lisible par la
     requête suivante, sinon la médiathèque affiche un cadre vide. */
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })

  return {
    async put(key, data, mimeType) {
      await store.set(key, data, { metadata: { mimeType } })
    },
    async get(key) {
      return store.get(key, { type: 'arrayBuffer' })
    },
    async remove(key) {
      await store.delete(key)
    },
  }
}

function localDriver(): Driver {
  const resolve = (key: string) => path.join(LOCAL_DIR, path.basename(key))

  return {
    async put(key, data) {
      await mkdir(LOCAL_DIR, { recursive: true })
      await writeFile(resolve(key), Buffer.from(data))
    },
    async get(key) {
      try {
        const buffer = await readFile(resolve(key))
        return buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer
      } catch {
        return null
      }
    },
    async remove(key) {
      try {
        await unlink(resolve(key))
      } catch {
        /* Déjà absent : la suppression est idempotente. */
      }
    },
  }
}

async function driver(): Promise<Driver> {
  return driverName() === 'netlify' ? netlifyDriver() : localDriver()
}

/* ─── API publique ─────────────────────────────────────────────────────── */

export async function putObject(
  key: string,
  data: ArrayBuffer,
  mimeType: AllowedMimeType,
): Promise<void> {
  const store = await driver()
  await store.put(key, data, mimeType)
}

export async function getObject(key: string): Promise<ArrayBuffer | null> {
  const store = await driver()
  return store.get(key)
}

export async function removeObject(key: string): Promise<void> {
  const store = await driver()
  await store.remove(key)
}
