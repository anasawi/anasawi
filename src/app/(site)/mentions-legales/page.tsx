import type { Metadata } from 'next'

import { MentionsLegales } from '@/components/site/PagesLegales'
import { getSettings } from '@/server/queries'

export const revalidate = 3600

export const metadata: Metadata = { title: 'Mentions légales — ANASAWI' }

/** Mentions légales (site classique) — rédigées depuis les Réglages. */
export default async function Page() {
  const settings = await getSettings()
  return <MentionsLegales settings={settings} ton="classique" />
}
