import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { PagesManager } from '@/components/admin/PagesManager'
import { getAdminPages } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function PagesAdminPage() {
  const pages = await getAdminPages()

  return (
    <AdminContent width="wide">
      <PageHeader
        title="Pages"
        description="Toutes les pages de votre site — l’accueil et celles que vous ajoutez."
      />
      <PagesManager pages={pages} />
    </AdminContent>
  )
}
