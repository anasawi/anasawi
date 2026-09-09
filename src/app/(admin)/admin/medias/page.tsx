import { MediaManager } from '@/components/admin/MediaManager'
import { getAllMedia } from '@/server/queries'

export const dynamic = 'force-dynamic'

export default async function MediaAdminPage() {
  const items = await getAllMedia()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ivory">
      <div className="mx-auto max-w-[760px] px-8 py-11 pb-24">
        <h1 className="font-serif text-2xl font-normal">Médias</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Vos photos, prêtes à être utilisées dans n’importe quelle section.
        </p>

        <div className="mt-6">
          <MediaManager items={items} />
        </div>
      </div>
    </div>
  )
}
