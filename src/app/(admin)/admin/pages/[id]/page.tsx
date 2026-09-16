import { notFound } from 'next/navigation'
import { z } from 'zod'

import { TemplateEditor } from '@/components/admin/TemplateEditor'
import { auth } from '@/lib/auth'
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
  /* `pages.id` est une colonne uuid : un identifiant mal formé ferait
     échouer la requête (500) au lieu d'un 404. */
  if (!z.string().uuid().safeParse(id).success) notFound()

  const [page, media, services, faqItems, settings, saved, allPages, session] =
    await Promise.all([
      getPageById(id),
      getAllMedia(),
      getAllServices(),
      getAllFaq(),
      getSettings(),
      getSavedSections(),
      getAdminPages(),
      auth(),
    ])

  if (!page) notFound()

  return (
    <TemplateEditor
      key={page.id}
      pageId={page.id}
      pageTitle={page.title}
      pageSlug={page.slug}
      isHome={page.isHome}
      userName={session?.user?.name ?? session?.user?.email ?? 'Admin'}
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
