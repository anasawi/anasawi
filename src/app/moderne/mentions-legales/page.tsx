import type { Metadata } from 'next'

import { chargerContenu } from '@/components/anasawi/charger'
import { Horizon } from '@/components/anasawi/sections'
import { Fil } from '@/components/anasawi/vivant'
import { MentionsLegales } from '@/components/site/PagesLegales'
import { getSettings } from '@/server/queries'

export const revalidate = 3600

export const metadata: Metadata = { title: 'Mentions légales — ANASAWI' }

/** Mentions légales (site moderne) — rédigées depuis les Réglages. */
export default async function Page() {
  const [settings, c] = await Promise.all([getSettings(), chargerContenu()])
  return (
    <>
      <Fil liens={[{ href: '/moderne', label: 'Retour au site' }]} rdv="/moderne#contact" logo={c.logo} />
      <main>
        <MentionsLegales settings={settings} ton="moderne" />
      </main>
      <Horizon c={c} liens={[]} />
    </>
  )
}
