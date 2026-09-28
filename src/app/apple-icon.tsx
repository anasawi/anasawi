import { ImageResponse } from 'next/og'

import { adresseDuLogo } from './logo-du-site'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/**
 * L'icône d'écran d'accueil iOS — même logo que l'en-tête et l'onglet.
 *
 * Fond ivoire plein, contrairement à l'onglet : iOS ne gère pas la
 * transparence ici et poserait l'image sur du noir.
 */
export const dynamic = 'force-dynamic'

export default async function AppleIcon() {
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
          background: '#F7F4EF',
        }}
      >
        <img src={logo} alt="" width={150} height={150} />
      </div>
    ),
    size,
  )
}
