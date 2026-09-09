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
    <>
      <PageHeader
        title="Accompagnements"
        description="Glissez-déposez pour définir l’ordre d’affichage sur le site."
      />
      <AdminContent>
        <ServicesManager services={services} library={library} />
      </AdminContent>
    </>
  )
}
