import type { MetadataRoute } from 'next'

/**
 * Manifeste d'application web — ce que lit un téléphone quand on ajoute
 * le site à l'écran d'accueil : le nom sous l'icône, l'icône elle-même,
 * la couleur de la barre pendant le chargement.
 *
 * Les icônes sont les routes composées à la volée (`/icon`, `/apple-icon`),
 * pour suivre le logo choisi dans les Réglages. Les couleurs sont celles
 * du thème : l'ivoire de `--color-ivory`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ANASAWI — Anne Winzenried, thérapeute',
    short_name: 'ANASAWI',
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf8f2',
    theme_color: '#fbf8f2',
    icons: [
      { src: '/icon', sizes: '64x64', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
