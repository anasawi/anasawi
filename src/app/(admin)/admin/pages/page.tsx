import { PageHeader } from '@/components/admin/PageHeader'
import { PagesManager } from '@/components/admin/PagesManager'
import { getAdminPages } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function PagesAdminPage() {
  const pages = await getAdminPages()

  return (
    <>
      <PageHeader title="Pages" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PagesManager pages={pages} />
      </div>
    </>
  )
}
