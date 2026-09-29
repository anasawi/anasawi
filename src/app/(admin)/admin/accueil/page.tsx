import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { TemplateEditor } from '@/components/admin/TemplateEditor'
import { auth } from '@/lib/auth'
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
 * rendu du site, et chaque modification est enregistrée automatiquement
 * en brouillon ; « Publier » la met en ligne.
 */
export default async function HomeBuilderPage() {
  const [page, media, services, faqItems, settings, saved, session] =
    await Promise.all([
      getHomePageForAdmin(),
      getAllMedia(),
      getAllServices(),
      getAllFaq(),
      getSettings(),
      getSavedSections(),
      auth(),
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
    <TemplateEditor
      key={page.id}
      pageId={page.id}
      pageTitle={page.title}
      publishedSnapshot={page.publishedSnapshot}
      publishedAt={page.publishedAt}
      initialSections={page.sections}
      data={{ services, faqItems, settings, media }}
      saved={saved}
      userName={session?.user?.name ?? session?.user?.email ?? 'Admin'}
    />
  )
}
