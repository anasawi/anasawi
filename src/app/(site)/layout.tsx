import { AdminBar } from '@/components/site/AdminBar'
import { CustomCursor } from '@/components/site/CustomCursor'
import { Footer } from '@/components/site/Footer'
import { Grain } from '@/components/site/Grain'
import { Header } from '@/components/site/Header'
import { Preloader } from '@/components/site/Preloader'
import { PRELOADER_BOOT_SCRIPT } from '@/components/site/preloader-boot'
import { SmoothScroll } from '@/components/site/SmoothScroll'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { identityCss } from '@/lib/identity'
import { getMediaByIds, getNavigationItems, getSettings } from '@/server/queries'

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

  /* Logo choisi dans les Réglages. Absent — ou média supprimé depuis —
     le composant retombe sur celui livré avec le site. */
  const [logo] = settings.logoMediaId
    ? await getMediaByIds([settings.logoMediaId])
    : []

  /* Identité globale : les surcharges de variables CSS choisies dans
     l'admin — vide si le site suit la charte telle quelle. */
  const identityStyles = identityCss(settings.identity)

  return (
    <MotionProvider>
      {identityStyles && (
        <style dangerouslySetInnerHTML={{ __html: identityStyles }} />
      )}
      {/* Le script d'amorçage PRÉCÈDE le rideau dans le flux : le
          navigateur l'exécute avant de peindre ce qui suit, donc le rideau
          n'apparaît que s'il doit jouer, sans clignotement. Texte
          constant, jamais de donnée interpolée. Sans JavaScript, le
          `<noscript>` masque le rideau à coup sûr. */}
      <script dangerouslySetInnerHTML={{ __html: PRELOADER_BOOT_SCRIPT }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html: '<style>[data-anasawi-preloader]{display:none}</style>',
        }}
      />
      <Preloader />
      <Grain />
      <CustomCursor />
      <Header
        items={navItems}
        /* Le bouton plein de la capsule mène à la section Contact — pas à
           l'agenda en ligne : « Contact » dit ce qu'on trouve derrière,
           et la section, elle, propose le rendez-vous, le téléphone et
           l'e-mail. */
        ctaLabel="Contact"
        ctaHref="/#contact"
        phone={settings.contactPhone}
        email={settings.contactEmail}
        logoUrl={logo?.url ?? null}
      />
      <SmoothScroll>
        {/* `tabIndex={-1}` : cible du lien d'évitement « Aller au contenu ».
            Sans lui, activer le lien déplace le défilement mais PAS le
            focus clavier — Chrome et Firefox rattrapent en déplaçant le
            point de départ de tabulation, Safari et plusieurs lecteurs
            d'écran non : la tabulation suivante renvoie dans l'en-tête,
            c'est-à-dire exactement ce que le lien servait à éviter.
            `outline-none` parce que ce focus est programmatique : il ne
            doit pas dessiner un cadre autour de toute la page. */}
        <main id="contenu" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer settings={settings} items={navItems} />
      </SmoothScroll>
      <AdminBar />
    </MotionProvider>
  )
}
