import { ImageResponse } from 'next/og'

import { LOGO_ILLUSTRATION } from './logo-illustration'
import { getSettings } from '@/server/queries'

export const alt = 'ANASAWI'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Image Open Graph de repli, générée à la volée depuis les Réglages.
 * Elle n'est utilisée que si aucune image OG n'a été choisie dans le CMS.
 */
export default async function Image() {
  const settings = await getSettings()

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F7F4EF',
          padding: '84px 92px',
          fontFamily: 'serif',
        }}
      >
        {/*
          L'ombelle, posée à droite et débordant légèrement du cadre.
          C'est la seule surface où cette illustration a la place d'être
          lue : la vignette de partage fait 1200×630, et c'est elle que
          voient les gens à qui l'on envoie le lien du site.
          Elle passe DERRIÈRE le texte (z-index 0 contre le flux normal),
          et le titre est borné à 620px pour ne jamais la chevaucher.
        */}
        <img
          src={LOGO_ILLUSTRATION}
          alt=""
          width={440}
          height={440}
          style={{ position: 'absolute', right: 40, top: 95 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg width="52" height="52" viewBox="0 0 64 64">
            <g
              fill="none"
              stroke="#1F2321"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M32 30 19 29M32 30 19.3 22M32 30 23.5 15.3M32 30 32 11.5M32 30 40.5 15.3M32 30 44.7 22M32 30 45 29" />
              <path d="M32 30C32 40 31 48 31.2 56" />
            </g>
            <circle cx="32" cy="30" r="2.2" fill="#1F2321" />
          </svg>
          <div style={{ fontSize: 30, letterSpacing: 9, color: '#1F2321' }}>
            {settings.siteName}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            color: '#1F2321',
          }}
        >
          <div style={{ fontSize: 66, lineHeight: 1.1, maxWidth: 620 }}>
            {settings.defaultSeoTitle ?? settings.tagline ?? settings.siteName}
          </div>
          {settings.practitionerName && (
            /* Satori (next/og) exige `display: flex` sur tout <div> qui a
               plusieurs enfants, et deux expressions JSX adjacentes en font
               deux : on compose donc une seule chaîne. */
            <div
              style={{
                display: 'flex',
                marginTop: 34,
                fontSize: 25,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: '#5D8AA0',
                fontFamily: 'sans-serif',
              }}
            >
              {settings.practitionerTitle
                ? `${settings.practitionerName} · ${settings.practitionerTitle}`
                : settings.practitionerName}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            height: 1,
            width: '100%',
            background: '#E2DCD3',
          }}
        />
      </div>
    ),
    size,
  )
}
