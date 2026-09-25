import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { ServicesManager } from '@/components/admin/ServicesManager'
import {
  getAllMedia,
  getAllServices,
  getServiceGroups,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function ServicesAdminPage() {
  const [services, groups, library] = await Promise.all([
    getAllServices(),
    getServiceGroups(),
    getAllMedia(),
  ])

  return (
    <AdminContent width="wide">
      <PageHeader
        title="Accompagnements"
        description="Ce que vous proposez, dans l’ordre où vos visiteurs le découvrent. Glissez une ligne pour la déplacer, y compris d’un titre à l’autre."
      />
      <ServicesManager services={services} groups={groups} library={library} />
    </AdminContent>
  )
}
