import { AdminContent } from '@/components/admin/AdminContent'
import { MessagesList } from '@/components/admin/MessagesList'
import { PageHeader } from '@/components/admin/PageHeader'
import { getMessages } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const messages = await getMessages(200)

  return (
    <AdminContent width="wide">
      <PageHeader
        title="Messages"
        description="Ce que vos visiteurs vous écrivent depuis le formulaire de contact du site."
      />
      <MessagesList messages={messages} />
    </AdminContent>
  )
}
