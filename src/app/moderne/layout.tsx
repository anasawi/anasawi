import type { Metadata } from 'next'

import { PoliceModerne } from '@/components/anasawi/PoliceModerne'
import { AdminBar } from '@/components/site/AdminBar'
import { parseIdentity } from '@/lib/identity'
import { getSettings } from '@/server/queries'

/**
 * `/moderne` — le site d'Anne dans sa NOUVELLE direction artistique, en
 * cours d'arbitrage avec le site classique (`/`). Même contenu (réglages,
 * accompagnements, questions, médias, textes), autre mise en forme.
 * Pas indexé tant que l'arbitrage n'est pas fait : un seul des deux
 * restera. Voir ARBITRAGE.md.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ModerneLayout({ children }: { children: React.ReactNode }) {
  /* Couleurs, polices et animations : Réglages › Apparence. */
  const settings = await getSettings()
  const style = parseIdentity(settings.identity).moderne
  return (
    <div className="ad min-h-screen overflow-x-clip bg-[var(--ad-ivoire)] antialiased">
      <PoliceModerne style={style} />
      {children}
      {/* Connecté : la pastille « Aperçu · Modifier », vers l'éditeur moderne. */}
      <AdminBar editHref="/admin/accueil?theme=moderne" className="bottom-5 lg:bottom-7" />
    </div>
  )
}
