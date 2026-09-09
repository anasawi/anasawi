import { AdminBar } from '@/components/site/AdminBar'
import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { SmoothScroll } from '@/components/motion/SmoothScroll'
import { identityCss } from '@/lib/identity'
import { getNavigationItems, getSettings } from '@/server/queries'

/**
 * Le header ne code pas sa navigation : il lit les sections de la page
 * d'accueil marquées « visible dans la navigation ». Renommer une entrée ou
 * en déplacer une se fait donc depuis le CMS, sans toucher au code.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, navItems] = await Promise.all([
    getSettings(),
    getNavigationItems(),
  ])

  const ctaHref = settings.bookingUrl?.trim() || '#contact'

  return (
    <MotionProvider>
      {/* Identité globale : les surcharges de variables CSS choisies dans
          l'admin — vide si le site suit la charte telle quelle. */}
      {identityCss(settings.identity) && (
        <style
          dangerouslySetInnerHTML={{ __html: identityCss(settings.identity) }}
        />
      )}
      <SmoothScroll />
      <Header items={navItems} ctaLabel="Prendre rendez-vous" ctaHref={ctaHref} />
      <main id="contenu">{children}</main>
      <Footer settings={settings} items={navItems} />
      <AdminBar />
    </MotionProvider>
  )
}
