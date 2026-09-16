import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Karla } from 'next/font/google'

import '@/styles/globals.css'
import { SITE_URL } from '@/lib/utils'

/* Fonts auto-hébergées par next/font : aucune requête vers Google au
   runtime, aucun FOUT. Les variables `--font-cormorant` / `--font-karla`
   sont reprises par le thème Tailwind (`--font-serif` / `--font-sans`). */
const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-cormorant',
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  preload: true,
})

const karla = Karla({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-karla',
  weight: ['400', '500', '600'],
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'ANASAWI', template: '%s' },
  formatDetection: { telephone: false, address: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#fbf8f2',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${karla.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}
