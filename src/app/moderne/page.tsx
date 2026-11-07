import type { Metadata } from 'next'

import { sectionsModernesParDefaut } from '@/blocks/moderne/defaut'
import { getBlock } from '@/blocks/registry'
import { chargerContenu } from '@/components/anasawi/charger'
import { Horizon } from '@/components/anasawi/sections'
import { Fil } from '@/components/anasawi/vivant'
import { SectionsView } from '@/components/site/SectionsView'
import { menuModerne } from '@/server/moderne'
import { getActiveFaq, getActiveServices, getAllMedia, getPublishedModern, getSettings } from '@/server/queries'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const nom = settings.practitionerName ? `${settings.practitionerName} — ` : ''
  return { title: settings.defaultSeoTitle || `${nom}${settings.siteName}` }
}

/**
 * La version moderne : les sections publiées de la page « accueil-
 * moderne » (composées dans l'éditeur, thème Moderne), rendues par le
 * même moteur que le site classique — avec le contenu partagé.
 */
export default async function ModernePage() {
  const [page, c, settings, services, faqItems, media] = await Promise.all([
    getPublishedModern(),
    chargerContenu(),
    getSettings(),
    getActiveServices(),
    getActiveFaq(),
    getAllMedia(),
  ])
  const sections = (page?.sections ?? sectionsModernesParDefaut()).filter((s) => s.isActive)
  /* Le menu : les sections qui y figurent, avec le libellé saisi. */
  const liens = menuModerne(sections, c)
  const partage = { ...c, menu: liens }
  /* Le pied de page est une section (modifiable) ; à défaut, celui-ci. */
  const piedEnSection = sections.some((s) => getBlock(s.type)?.piedDePage)

  return (
    <>
      <Fil liens={liens} rdv={c.rdv} logo={c.logo} marque={c.marque} bouton={c.pied.boutonMenu} boutonTelephone={c.pied.boutonMenuTelephone} />
      <main>
        <SectionsView sections={sections} data={{ services, faqItems, settings, media, partage }} />
      </main>
      {!piedEnSection && <Horizon c={c} liens={liens} />}
    </>
  )
}
