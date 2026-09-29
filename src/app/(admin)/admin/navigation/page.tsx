import { AdminContent } from '@/components/admin/AdminContent'
import { NavigationEditor } from '@/components/admin/NavigationEditor'
import { PageHeader } from '@/components/admin/PageHeader'
import {
  getHomePageForAdmin,
  getNavigationItems,
  getSettings,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function NavigationAdminPage() {
  const [settings, home, current] = await Promise.all([
    getSettings(),
    getHomePageForAdmin(),
    getNavigationItems(),
  ])

  /* État initial : le menu enregistré, sinon la dérivation historique
     (ancres de l'accueil) — pour partir de l'existant, jamais de zéro. */
  const initial = Array.isArray(settings.navigation)
    ? (settings.navigation as { label: string; href: string }[])
    : current.map((item) => ({ label: item.label, href: item.anchor }))

  /* Les suggestions : les sections de l'accueil — le site est une page
     unique, ses entrées de menu sont des ancres. */
  const suggestions = [
    ...(home?.sections ?? [])
      .filter((s) => !s.parentId && s.anchor && s.isActive)
      .map((s) => ({
        label: s.navLabel ?? s.name ?? s.anchor ?? '',
        href: `/#${s.anchor}`,
        hint: `#${s.anchor}`,
      })),
  ]

  return (
    <AdminContent>
      <PageHeader
        title="Menu du site"
        description="Les liens affichés en haut de chaque page, dans l’ordre où vos visiteurs les voient."
      />
      <NavigationEditor initial={initial} suggestions={suggestions} />
    </AdminContent>
  )
}
