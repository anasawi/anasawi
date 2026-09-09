import type { Metadata, Viewport } from 'next'
import { Hanken_Grotesk, Newsreader } from 'next/font/google'

import '@/styles/globals.css'
import { SITE_URL } from '@/lib/utils'

/* Fonts variables, auto-hébergées par next/font : aucune requête vers
   Google au runtime, aucun FOUT, un seul fichier par famille. */
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-newsreader',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  preload: true,
})

const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-hanken',
  weight: ['400', '500'],
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'AMASWI', template: '%s' },
  formatDetection: { telephone: false, address: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#F7F4EF',
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
      className={`${newsreader.variable} ${hanken.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}
