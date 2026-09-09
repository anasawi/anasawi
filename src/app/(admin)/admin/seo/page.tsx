import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { SeoEditor } from '@/components/admin/SeoEditor'
import { getAllMedia, getHomePageForAdmin, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * Référencement de la page d'accueil.
 *
 * Le site est une single page : il n'y a qu'une URL à référencer, donc plus
 * de sélecteur de page. Le sitemap et robots.txt restent générés depuis la
 * base et suivront automatiquement. L'aperçu Google vit dans l'éditeur,
 * où il se met à jour pendant la saisie.
 */
export default async function SeoAdminPage() {
  const [page, library, settings] = await Promise.all([
    getHomePageForAdmin(),
    getAllMedia(),
    getSettings(),
  ])

  return (
    <AdminContent>
      <PageHeader
        title="Référencement"
        description="Comment votre site apparaît sur Google — le titre, la description et l’image de partage."
      />

      {page ? (
        <SeoEditor
          page={page}
          seo={page.seo}
          library={library}
          siteName={settings.siteName}
        />
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Page d’accueil introuvable. Lancez <code>npm run db:seed</code>.
        </p>
      )}
    </AdminContent>
  )
}
