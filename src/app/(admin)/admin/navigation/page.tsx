import { NavigationEditor } from '@/components/admin/NavigationEditor'
import { PageHeader } from '@/components/admin/PageHeader'
import {
  getAdminPages,
  getHomePageForAdmin,
  getNavigationItems,
  getSettings,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function NavigationAdminPage() {
  const [settings, pages, home, current] = await Promise.all([
    getSettings(),
    getAdminPages(),
    getHomePageForAdmin(),
    getNavigationItems(),
  ])

  /* État initial : le menu enregistré, sinon la dérivation historique
     (ancres de l'accueil) — pour partir de l'existant, jamais de zéro. */
  const initial = Array.isArray(settings.navigation)
    ? (settings.navigation as { label: string; href: string }[])
    : current.map((item) => ({ label: item.label, href: item.anchor }))

  const suggestions = [
    ...pages
      .filter((p) => !p.isHome && p.status === 'published')
      .map((p) => ({ label: p.title, href: `/${p.slug}`, hint: `/${p.slug}` })),
    ...(home?.sections ?? [])
      .filter((s) => !s.parentId && s.anchor && s.isActive)
      .map((s) => ({
        label: s.navLabel ?? s.name ?? s.anchor ?? '',
        href: `/#${s.anchor}`,
        hint: `#${s.anchor}`,
      })),
  ]

  return (
    <>
      <PageHeader title="Navigation" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavigationEditor initial={initial} suggestions={suggestions} />
      </div>
    </>
  )
}
