/**
 * Ce qu'un média peut être — sans rien importer du serveur.
 *
 * `lib/storage.ts` tire `node:crypto` et `node:fs` : l'importer depuis un
 * composant client emporte Node dans le navigateur, et la page tombe. Ce
 * petit module n'a pas de dépendance ; les deux côtés peuvent le lire —
 * `storage.ts` réexporte ces constantes pour ses propres consommateurs.
 */

/**
 * Types acceptés à l'envoi. Pas de SVG : un SVG public peut porter du
 * script. Deux formats vidéo, ceux que le navigateur produit lui-même en
 * recompressant (voir `lib/video-compression.ts`) : un `.mov` d'iPhone
 * n'arrive jamais tel quel, il est réencodé avant l'envoi.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

/** Limite de charge utile : les fonctions serverless plafonnent bien avant. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

export function isVideoMimeType(value: string): boolean {
  return value.startsWith('video/')
}

/**
 * Le type MIME que les premiers octets du fichier RÉVÈLENT — ou `null`.
 *
 * Le `Content-Type` d'une partie multipart est déclaré par l'émetteur : un
 * exécutable annoncé « image/png » passerait la liste blanche. On compare
 * donc la signature des octets ; les types vidéo ISO-BMFF (MP4, AVIF)
 * partagent la boîte `ftyp`, distinguée par sa marque.
 */
export function sniffMimeType(bytes: Uint8Array): AllowedMimeType | null {
  const at = (i: number) => bytes[i] ?? -1
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length))

  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp'
  if (at(0) === 0x1a && at(1) === 0x45 && at(2) === 0xdf && at(3) === 0xa3) return 'video/webm'
  if (bytes.length >= 12 && ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4)
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') return 'image/avif'
    return 'video/mp4'
  }
  return null
}
