import { AdminContent } from '@/components/admin/AdminContent'
import { FaqManager } from '@/components/admin/FaqManager'
import { PageHeader } from '@/components/admin/PageHeader'
import { getAllFaq } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function FaqAdminPage() {
  const items = await getAllFaq()

  return (
    <>
      <PageHeader
        title="FAQ"
        description="Questions fréquentes affichées dans l’accordéon du site."
      />
      <AdminContent>
        <FaqManager items={items} />
      </AdminContent>
    </>
  )
}
