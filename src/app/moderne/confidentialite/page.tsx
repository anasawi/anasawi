import type { Metadata } from 'next'

import { Annexe } from '@/components/anasawi/Annexe'
import { Confidentialite } from '@/components/site/PagesLegales'
import { lirePied } from '@/lib/pied'
import { getSettings } from '@/server/queries'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return { title: `${lirePied(settings.pied).lienConfidentialite || 'Confidentialité'} — ${settings.siteName}` }
}

/** Politique de confidentialité (site moderne) — rédigée depuis les Réglages. */
export default async function Page() {
  const settings = await getSettings()
  return (
    <Annexe>
      <Confidentialite settings={settings} ton="moderne" />
    </Annexe>
  )
}
