import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { TemplateEditor } from '@/components/admin/TemplateEditor'
import { PoliceModerne } from '@/components/anasawi/PoliceModerne'
import { chargerContenu } from '@/components/anasawi/charger'
import { parseIdentity } from '@/lib/identity'
import { assurerPageModerne, menuModerne } from '@/server/moderne'
import {
  getAllFaq,
  getAllMedia,
  getAllServices,
  getHomePageForAdmin,
  getModernPageForAdmin,
  getSavedSections,
  getSettings,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * Éditeur de la page d'accueil — CMS à templates.
 *
 * L'admin choisit un template dans la bibliothèque, remplit ses
 * informations, réordonne ses sections. L'aperçu central est le vrai
 * rendu du site, et chaque modification est enregistrée automatiquement
 * en brouillon ; « Publier » la met en ligne.
 */
export default async function HomeBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[]; theme?: string | string[] }>
}) {
  const { section, theme: themeBrut } = await searchParams
  /* Le temps de l'arbitrage, deux sites : le classique (la page
     d'accueil) et le moderne (sa propre page, créée au premier passage). */
  const theme = themeBrut === 'moderne' ? 'moderne' : 'classique'
  if (theme === 'moderne') await assurerPageModerne()
  const [page, media, services, faqItems, settings, saved, partage] =
    await Promise.all([
      theme === 'moderne' ? getModernPageForAdmin() : getHomePageForAdmin(),
      getAllMedia(),
      getAllServices(),
      getAllFaq(),
      getSettings(),
      getSavedSections(),
      /* Le contenu partagé que lisent les blocs modernes — d'après les
         sections VIVANTES du site classique. */
      theme === 'moderne' ? chargerContenu({ brouillon: true }) : Promise.resolve(undefined),
    ])

  if (!page) {
    return (
      <AdminContent>
        <PageHeader title="Page d’accueil" />
        <p className="text-[13px] text-muted-foreground">
          La page d’accueil n’a pas été trouvée dans la base de données.
          Contactez la personne qui gère le site : elle saura la rétablir.
        </p>
      </AdminContent>
    )
  }

  return (
    <>
      {theme === 'moderne' && <PoliceModerne style={parseIdentity(settings.identity).moderne} />}
    <TemplateEditor
      key={`${theme}-${page.id}`}
      pageId={page.id}
      pageTitle={page.title}
      publishedSnapshot={page.publishedSnapshot}
      publishedAt={page.publishedAt}
      initialSections={page.sections}
      data={{ services, faqItems, settings, media, partage: partage && { ...partage, menu: menuModerne(page.sections, partage) } }}
      theme={theme}
      saved={saved}
      /* `?section=…` : depuis « Votre page » sur l'accueil, l'éditeur
         s'ouvre sur la section cliquée. Une valeur inconnue est ignorée. */
      initialSelectedId={
        typeof section === 'string' && page.sections.some((s) => s.id === section)
          ? section
          : null
      }
    />
    </>
  )
}
