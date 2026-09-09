import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { SeoEditor } from '@/components/admin/SeoEditor'
import { getAllMedia, getHomePageForAdmin, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * SEO de la page d'accueil.
 *
 * Le site est une single page : il n'y a qu'une URL à référencer, donc plus
 * de sélecteur de page. Le sitemap et robots.txt restent générés depuis la
 * base et suivront automatiquement.
 */
export default async function SeoAdminPage() {
  const [page, library, settings] = await Promise.all([
    getHomePageForAdmin(),
    getAllMedia(),
    getSettings(),
  ])

  return (
    <>
      <PageHeader
        title="SEO"
        description="Métadonnées de la page d’accueil"
      />

      <AdminContent width="wide">
        {page ? (
          <>
            {/* Aperçu Google — depuis les valeurs enregistrées. */}
            <div className="mb-6 max-w-xl rounded-lg border border-border bg-white p-4">
              <p className="mb-3 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Aperçu Google
              </p>
              <p className="text-[0.72rem] text-[#202124]">
                amaswi.com <span className="text-[#5f6368]">› …</span>
              </p>
              <p className="mt-1 truncate text-[1.05rem] leading-snug text-[#1a0dab]">
                {page.seo?.title ??
                  settings.defaultSeoTitle ??
                  `${page.title} — ${settings.siteName}`}
              </p>
              <p className="mt-1 line-clamp-2 text-[0.8rem] leading-[1.45] text-[#4d5156]">
                {page.seo?.description ??
                  settings.defaultSeoDescription ??
                  'Renseignez une meta description ci-dessous — c’est elle que Google affiche sous le titre.'}
              </p>
            </div>

            <SeoEditor
              page={page}
              seo={page.seo}
              library={library}
              siteName={settings.siteName}
            />
          </>
        ) : (
          <p className="text-[0.82rem] text-muted-foreground">
            Page d’accueil introuvable. Lancez <code>npm run db:seed</code>.
          </p>
        )}
      </AdminContent>
    </>
  )
}
