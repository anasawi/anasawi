import { SettingsWorkbench } from '@/components/admin/SettingsWorkbench'
import { parseIdentity } from '@/lib/identity'
import { getAllMedia, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * Les réglages du site — une seule page, six sections ancrées.
 *
 * Ce qui était éclaté entre « Paramètres » et « Apparence » (deux écrans,
 * deux boutons d'enregistrement) tient désormais ici. Les deux anciennes
 * adresses redirigent vers l'ancre correspondante.
 */
export default async function ReglagesPage() {
  const [settings, library] = await Promise.all([getSettings(), getAllMedia()])

  return (
    <SettingsWorkbench
      settings={settings}
      identity={parseIdentity(settings.identity)}
      library={library}
    />
  )
}
