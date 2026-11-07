import type { Metadata } from 'next'

import { Annexe } from '@/components/anasawi/Annexe'
import { MentionsLegales } from '@/components/site/PagesLegales'
import { lirePied } from '@/lib/pied'
import { getSettings } from '@/server/queries'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return { title: `${lirePied(settings.pied).lienMentions || 'Mentions légales'} — ${settings.siteName}` }
}

/** Mentions légales (site moderne) — rédigées depuis les Réglages. */
export default async function Page() {
  const settings = await getSettings()
  return (
    <Annexe>
      <MentionsLegales settings={settings} ton="moderne" />
    </Annexe>
  )
}
