import { AdminContent } from '@/components/admin/AdminContent'
import { MediaManager } from '@/components/admin/MediaManager'
import { PageHeader } from '@/components/admin/PageHeader'
import { getAllMedia } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function MediaAdminPage() {
  const items = await getAllMedia()

  return (
    <AdminContent width="wide">
      <PageHeader
        title="Médias"
        description="Vos images et vos vidéos, prêtes à être utilisées sur le site."
      />
      <MediaManager items={items} />
    </AdminContent>
  )
}
