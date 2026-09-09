import { IdentityEditor } from '@/components/admin/IdentityEditor'
import { PageHeader } from '@/components/admin/PageHeader'
import { parseIdentity } from '@/lib/identity'
import { getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function IdentityAdminPage() {
  const settings = await getSettings()

  return (
    <>
      <PageHeader title="Identité du site" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <IdentityEditor initial={parseIdentity(settings.identity)} />
      </div>
    </>
  )
}
