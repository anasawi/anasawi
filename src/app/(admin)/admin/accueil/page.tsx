import { PageHeader } from '@/components/admin/PageHeader'
import { TemplateEditor } from '@/components/admin/TemplateEditor'
import {
  getAllFaq,
  getAllMedia,
  getAllServices,
  getHomePageForAdmin,
  getSavedSections,
  getSettings,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * Éditeur de la page d'accueil — CMS à templates.
 *
 * L'admin choisit un template dans la bibliothèque, remplit ses
 * informations, réordonne ses sections. L'aperçu central est le vrai
 * rendu du site, et chaque modification est enregistrée automatiquement —
 * publier n'existe pas, la page EST la donnée.
 */
export default async function HomeBuilderPage() {
  const [page, media, services, faqItems, settings, saved] = await Promise.all([
    getHomePageForAdmin(),
    getAllMedia(),
    getAllServices(),
    getAllFaq(),
    getSettings(),
    getSavedSections(),
  ])

  if (!page) {
    return (
      <>
        <PageHeader title="Page d’accueil" />
        <div className="p-8">
          <p className="text-[0.82rem] text-muted-foreground">
            Page d’accueil introuvable. Lancez <code>npm run db:seed</code>.
          </p>
        </div>
      </>
    )
  }

  return (
    <TemplateEditor
      pageId={page.id}
      pageTitle={page.title}
      publishedSnapshot={page.publishedSnapshot}
      publishedAt={page.publishedAt}
      initialSections={page.sections}
      data={{ services, faqItems, settings, media }}
      saved={saved}
    />
  )
}
