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
  const logo = await adresseDuLogo('icone')

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
        {/*
          La taille passe par le STYLE, pas par les attributs : Satori
          ignore `width`/`height` sur une image et l'étire alors à tout
          le conteneur — le dessin touchait les quatre bords, et iOS en
          rognait les coins avec son masque arrondi.

          `contain` pour qu'une image non carrée ne soit jamais déformée :
          le logo choisi dans les Réglages peut avoir n'importe quel
          rapport.
        */}
        <img
          src={logo}
          alt=""
          style={{ width: 140, height: 140, objectFit: 'contain' }}
        />
      </div>
    ),
    size,
  )
}
