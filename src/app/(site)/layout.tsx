import { AdminBar } from '@/components/site/AdminBar'
import { CustomCursor } from '@/components/site/CustomCursor'
import { Footer } from '@/components/site/Footer'
import { Grain } from '@/components/site/Grain'
import { Header } from '@/components/site/Header'
import { Preloader } from '@/components/site/Preloader'
import { SmoothScroll } from '@/components/site/SmoothScroll'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { identityCss } from '@/lib/identity'
import { getNavigationItems, getSettings } from '@/server/queries'

/**
 * Chrome du site public — et uniquement du site public.
 *
 * Ordre important : préchargeur, grain et curseur vivent HORS du wrapper
 * de défilement inertiel (ils sont fixes) ; le Header aussi, car un
 * `position:fixed` à l'intérieur d'un ancêtre transformé deviendrait
 * relatif au wrapper. Seuls le contenu et le Footer défilent.
 *
 * Le header ne code pas sa navigation : il lit les sections de la page
 * d'accueil marquées « visible dans la navigation ». Renommer une entrée
 * ou en déplacer une se fait depuis le CMS, sans toucher au code.
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

  const ctaHref = settings.bookingUrl?.trim() || '/#contact'

  return (
    <MotionProvider>
      {/* Identité globale : les surcharges de variables CSS choisies dans
          l'admin — vide si le site suit la charte telle quelle. */}
      {identityCss(settings.identity) && (
        <style
          dangerouslySetInnerHTML={{ __html: identityCss(settings.identity) }}
        />
      )}
      <Preloader />
      <Grain />
      <CustomCursor />
      <Header items={navItems} ctaLabel="Rendez-vous" ctaHref={ctaHref} />
      <SmoothScroll>
        <main id="contenu">{children}</main>
        <Footer settings={settings} items={navItems} />
      </SmoothScroll>
      <AdminBar />
    </MotionProvider>
  )
}
