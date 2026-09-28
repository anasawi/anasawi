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
          background: 'transparent',
        }}
      >
        {/*
          La taille passe par le STYLE, pas par les attributs : Satori
          ignore `width`/`height` sur une image et l'étire alors à tout le
          conteneur — le dessin touchait les quatre bords, et iOS en
          rognait les coins avec son masque arrondi.

          `contain` pour qu'une image non carrée ne soit jamais déformée :
          le logo choisi dans les Réglages peut avoir n'importe quel
          rapport.
        */}
        <img
          src={logo}
          alt=""
          style={{ width: 52, height: 52, objectFit: 'contain' }}
        />
      </div>
    ),
    size,
  )
}
