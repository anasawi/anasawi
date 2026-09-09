import { AdminContent } from '@/components/admin/AdminContent'
import { IdentityEditor } from '@/components/admin/IdentityEditor'
import { PageHeader } from '@/components/admin/PageHeader'
import { parseIdentity } from '@/lib/identity'
import { getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function IdentityAdminPage() {
  const settings = await getSettings()

  return (
    <AdminContent width="narrow">
      <PageHeader
        title="Apparence"
        description="Le style de tout votre site — chaque réglage s’applique partout, immédiatement."
      />
      <IdentityEditor initial={parseIdentity(settings.identity)} />
    </AdminContent>
  )
}
