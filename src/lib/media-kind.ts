/**
 * Image ou vidéo ? — sans rien importer du serveur.
 *
 * `lib/storage.ts` tire `node:crypto` et `node:fs` : l'importer depuis un
 * composant client emporte Node dans le navigateur, et la page tombe. Ce
 * petit module n'a pas de dépendance ; les deux côtés peuvent le lire.
 */
export function isVideoMimeType(value: string): boolean {
  return value.startsWith('video/')
}
