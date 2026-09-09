import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { SectionRenderer } from '@/components/site/SectionRenderer'
import { auth } from '@/lib/auth'
import { getNavigationItems, getPageById, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Aperçu — AMASWI',
  robots: { index: false, follow: false },
}

/**
 * Aperçu complet d'une page, réservé aux administrateurs.
 *
 * C'est le rendu réel du site — mêmes blocs, mêmes polices, même CSS,
 * en-tête et pied de page compris. L'édition, elle, vit dans le
 * constructeur (`/admin/accueil`), qui rend la page directement dans son
 * canvas : cette route ne sert qu'à voir la page entière dans un vrai
 * onglet, telle qu'un visiteur la verra.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) notFound()

  const { id } = await params

  const [page, settings, navItems] = await Promise.all([
    getPageById(id),
    getSettings(),
    getNavigationItems(),
  ])

  if (!page) notFound()

  return (
    <MotionProvider>
      <Header
        items={navItems}
        ctaLabel="Rendez-vous"
        ctaHref={settings.bookingUrl?.trim() || '/#contact'}
      />
      <main>
        <SectionRenderer sections={page.sections} />
      </main>
      <Footer settings={settings} items={navItems} />
    </MotionProvider>
  )
}
