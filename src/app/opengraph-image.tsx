import { ImageResponse } from 'next/og'

import { getSettings } from '@/server/queries'

export const alt = 'AMASWI'
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
          <div style={{ fontSize: 74, lineHeight: 1.08, maxWidth: 900 }}>
            {settings.defaultSeoTitle ?? settings.tagline ?? settings.siteName}
          </div>
          {settings.practitionerName && (
            <div
              style={{
                marginTop: 34,
                fontSize: 25,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: '#5D8AA0',
                fontFamily: 'sans-serif',
              }}
            >
              {settings.practitionerName}
              {settings.practitionerTitle
                ? ` · ${settings.practitionerTitle}`
                : ''}
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
