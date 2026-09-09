import { AdminContent } from '@/components/admin/AdminContent'
import { FaqManager } from '@/components/admin/FaqManager'
import { PageHeader } from '@/components/admin/PageHeader'
import { getAllFaq } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function FaqAdminPage() {
  const items = await getAllFaq()

  return (
    <AdminContent width="wide">
      <PageHeader
        title="Questions fréquentes"
        description="Les questions que vos visiteurs se posent souvent, et vos réponses — affichées sur le site."
      />
      <FaqManager items={items} />
    </AdminContent>
  )
}
