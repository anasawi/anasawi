import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { getAllMedia, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [settings, library] = await Promise.all([getSettings(), getAllMedia()])

  return (
    <AdminContent>
      <PageHeader
        title="Coordonnées & horaires"
        description="Tout ce que vos visiteurs doivent savoir pour vous joindre — et ce que Google affiche de vous."
      />
      <SettingsForm settings={settings} library={library} />
    </AdminContent>
  )
}
