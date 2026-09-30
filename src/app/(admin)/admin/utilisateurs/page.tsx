import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { UsersManager } from '@/components/admin/UsersManager'
import { listUsers } from '@/server/queries/users'

export const dynamic = 'force-dynamic'

export default async function UtilisateursPage() {
  const result = await listUsers()
  const utilisateurs = result.ok ? result.data : []

  return (
    <AdminContent width="wide">
      <PageHeader
        title="Utilisateurs"
        description="Les personnes qui peuvent se connecter à cette administration."
      />
      <UsersManager initial={utilisateurs} />
    </AdminContent>
  )
}
