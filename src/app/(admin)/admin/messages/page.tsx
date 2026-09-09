import { desc } from 'drizzle-orm'

import { AdminContent } from '@/components/admin/AdminContent'
import { MessagesList } from '@/components/admin/MessagesList'
import { PageHeader } from '@/components/admin/PageHeader'
import { db } from '@/server/db'
import { contactMessages } from '@/server/db/schema'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const messages = await db
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt))
    .limit(200)

  return (
    <>
      <PageHeader
        title="Messages"
        description="Demandes reçues via le formulaire de contact du site."
      />
      <AdminContent>
        <MessagesList messages={messages} />
      </AdminContent>
    </>
  )
}
