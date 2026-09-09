import { AdminContent } from '@/components/admin/AdminContent'
import { MediaManager } from '@/components/admin/MediaManager'
import { PageHeader } from '@/components/admin/PageHeader'
import { getAllMedia } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function MediaAdminPage() {
  const items = await getAllMedia()

  return (
    <>
      <PageHeader
        title="Médias"
        description="Bibliothèque partagée : une même image peut servir dans plusieurs sections."
      />
      <AdminContent width="wide">
        <MediaManager items={items} />
      </AdminContent>
    </>
  )
}
