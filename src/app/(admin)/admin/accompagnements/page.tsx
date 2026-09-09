import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { ServicesManager } from '@/components/admin/ServicesManager'
import { getAllMedia, getAllServices } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function ServicesAdminPage() {
  const [services, library] = await Promise.all([
    getAllServices(),
    getAllMedia(),
  ])

  return (
    <AdminContent width="wide">
      <PageHeader
        title="Accompagnements"
        description="Ce que vous proposez, dans l’ordre où vos visiteurs le découvrent — glissez une ligne pour la déplacer."
      />
      <ServicesManager services={services} library={library} />
    </AdminContent>
  )
}
