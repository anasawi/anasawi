import type { Metadata } from 'next'

import { Confidentialite } from '@/components/site/PagesLegales'
import { getSettings } from '@/server/queries'

export const revalidate = 3600

export const metadata: Metadata = { title: 'Politique de confidentialité — ANASAWI' }

/** Politique de confidentialité (site classique) — rédigées depuis les Réglages. */
export default async function Page() {
  const settings = await getSettings()
  return <Confidentialite settings={settings} ton="classique" />
}
