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
    <AdminContent width="wide">
      <PageHeader
        title="Messages"
        description="Ce que vos visiteurs vous écrivent depuis le formulaire de contact du site."
      />
      <MessagesList messages={messages} />
    </AdminContent>
  )
}
