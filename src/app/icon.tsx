import { ImageResponse } from 'next/og'

import { adresseDuLogo } from './logo-du-site'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

/**
 * L'icône de l'onglet, peinte depuis le logo choisi dans les Réglages.
 *
 * Route dynamique et non fichier statique : un fichier ne saurait pas
 * suivre le réglage. Les navigateurs mettent les favicons en cache de
 * façon agressive, le coût est donc négligeable — et l'en-tête du site
 * et l'onglet montrent enfin la même chose.
 */
export const dynamic = 'force-dynamic'

export default async function Icon() {
  const logo = await adresseDuLogo()

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <img src={logo} alt="" width={64} height={64} />
      </div>
    ),
    size,
  )
}
