import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { getAllMedia, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [settings, library] = await Promise.all([getSettings(), getAllMedia()])

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Identité, coordonnées et valeurs SEO par défaut du site."
      />
      <AdminContent>
        <SettingsForm settings={settings} library={library} />
      </AdminContent>
    </>
  )
}
