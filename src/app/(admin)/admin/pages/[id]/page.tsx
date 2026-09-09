import { notFound } from 'next/navigation'

import { TemplateEditor } from '@/components/admin/TemplateEditor'
import {
  getAdminPages,
  getAllFaq,
  getAllMedia,
  getAllServices,
  getPageById,
  getSavedSections,
  getSettings,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * Éditeur d'une page secondaire — strictement le même que celui de
 * l'accueil : bibliothèque de templates, autosave, brouillon → publier.
 */
export default async function PageBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [page, media, services, faqItems, settings, saved, allPages] =
    await Promise.all([
      getPageById(id),
      getAllMedia(),
      getAllServices(),
      getAllFaq(),
      getSettings(),
      getSavedSections(),
      getAdminPages(),
    ])

  if (!page) notFound()

  return (
    <TemplateEditor
      pageId={page.id}
      pageTitle={page.title}
      publishedSnapshot={page.publishedSnapshot}
      publishedAt={page.publishedAt}
      initialSections={page.sections}
      data={{ services, faqItems, settings, media }}
      saved={saved}
      pages={allPages.map((p) => ({
        id: p.id,
        title: p.title,
        isHome: p.isHome,
        published: p.status === 'published',
      }))}
    />
  )
}
