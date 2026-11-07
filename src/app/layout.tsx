import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Karla, Poppins } from 'next/font/google'

import '@/styles/globals.css'
import { SITE_URL } from '@/lib/utils'

/* Fonts auto-hébergées par next/font : aucune requête vers Google au
   runtime, aucun FOUT. Les variables `--font-cormorant` / `--font-karla`
   sont reprises par le thème Tailwind (`--font-serif` / `--font-sans`). */
const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-cormorant',
  /* La police VARIABLE entière, pas une liste de graisses : pour une liste,
     Google sert désormais des fichiers « /l/font?kit=… » sans extension, que
     next/font ne sait pas lire — le build de Netlify échouait (« Cannot
     read properties of null (reading '1') »). Le fichier variable couvre
     les mêmes graisses (300 à 700). */
  weight: 'variable',
  style: ['normal', 'italic'],
  preload: true,
})

const karla = Karla({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-karla',
  /* Variable, pour la même raison que Cormorant (graisses 200 à 800). */
  weight: 'variable',
  preload: true,
})

/* La police de l'ADMINISTRATION (même famille que l'espace de la
   candidature Qeeps). Non préchargée : le site public ne la demande
   jamais, seul l'outil l'utilise. */
const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '500', '600'],
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'ANASAWI', template: '%s' },
  formatDetection: { telephone: false, address: false, email: false },
  manifest: '/manifest.webmanifest',
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
      className={`${cormorant.variable} ${karla.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}
