import { sectionsModernesParDefaut } from '@/blocks/moderne/defaut'
import { textesDe } from '@/blocks/moderne/textes'
import { chargerContenu } from '@/components/anasawi/charger'
import { Horizon } from '@/components/anasawi/sections'
import { Fil } from '@/components/anasawi/vivant'
import { menuModerne } from '@/server/moderne'
import { getPublishedModern } from '@/server/queries'

/**
 * L'HABILLAGE d'une page annexe du site moderne (mentions légales,
 * confidentialité) : la même barre et le même pied de page que l'accueil,
 * avec les textes saisis dans l'éditeur — pas des textes de départ.
 * Les liens du menu ramènent aux sections de l'accueil.
 */
export async function Annexe({ children }: { children: React.ReactNode }) {
  const [page, c] = await Promise.all([getPublishedModern(), chargerContenu()])
  const sections = (page?.sections ?? sectionsModernesParDefaut()).filter((s) => s.isActive)
  const liens = menuModerne(sections, c).map((l) => ({ ...l, href: `/moderne${l.href}` }))
  const pied = sections.find((s) => s.type === 'mHorizon')
  const t = textesDe('mHorizon', c, (pied?.payload ?? {}) as Record<string, unknown>)
  /* Hors de l'accueil, une ancre (« #contact ») doit y ramener. */
  const rdv = c.rdv.startsWith('#') ? `/moderne${c.rdv}` : c.rdv
  const cAnnexe = { ...c, rdv }
  return (
    <>
      <Fil liens={liens} rdv={rdv} logo={c.logo} marque={c.marque} bouton={c.pied.boutonMenu} boutonTelephone={c.pied.boutonMenuTelephone} />
      <main>{children}</main>
      <Horizon c={cAnnexe} liens={liens} t={t} />
    </>
  )
}
