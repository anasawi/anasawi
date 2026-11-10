import { SettingsWorkbench } from '@/components/admin/SettingsWorkbench'
import { requireAdmin } from '@/lib/auth'
import { parseIdentity } from '@/lib/identity'
import { phraseDeConfirmation } from '@/server/actions/synchronisation'
import {
  getAllMedia,
  getHomePageForAdmin,
  getNavigationItems,
  getSettings,
} from '@/server/queries'
import { listUsers } from '@/server/queries/users'
import { configSynchro } from '@/server/synchronisation'

export const dynamic = 'force-dynamic'

/**
 * Les réglages du site — un écran, quatre onglets : coordonnées,
 * apparence, menu du site, référencement. Les anciennes adresses
 * (/navigation, /seo, /parametres, /identite) y redirigent.
 */
export default async function ReglagesPage() {
  const [settings, library, home, menuActuel, user, phrase, comptes] = await Promise.all([
    getSettings(),
    getAllMedia(),
    getHomePageForAdmin(),
    getNavigationItems(),
    requireAdmin(),
    phraseDeConfirmation(),
    listUsers(),
  ])

  /* Menu : ce qui est enregistré, sinon la dérivation (ancres des sections
     de l'accueil) — pour partir de l'existant, jamais de zéro. */
  const menuInitial = Array.isArray(settings.navigation)
    ? (settings.navigation as { label: string; href: string }[])
    : menuActuel.map((item) => ({ label: item.label, href: item.anchor }))

  const suggestions = (home?.sections ?? [])
    .filter((s) => !s.parentId && s.anchor && s.isActive)
    .map((s) => ({
      label: s.navLabel ?? s.name ?? s.anchor ?? '',
      href: `/#${s.anchor}`,
      hint: `#${s.anchor}`,
    }))

  return (
    <SettingsWorkbench
      settings={settings}
      identity={parseIdentity(settings.identity)}
      library={library}
      menu={{ initial: menuInitial, suggestions }}
      synchro={{ config: configSynchro(), phrase, proprietaire: user.role === 'owner' }}
      utilisateurs={comptes.ok ? comptes.data : []}
      referencement={
        home
          ? { page: home, seo: home.seo, library, siteName: settings.siteName }
          : null
      }
    />
  )
}
