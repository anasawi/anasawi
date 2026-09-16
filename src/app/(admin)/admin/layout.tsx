import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

import { AdminRail } from '@/components/admin/AdminRail'
import { AdminShellPill } from '@/components/admin/AdminShellPill'
import { PaletteProvider } from '@/components/admin/PaletteProvider'
import { auth } from '@/lib/auth'
import { paletteFromIdentity } from '@/lib/palette'
import { getSettings } from '@/server/queries'

export const metadata: Metadata = {
  title: 'Administration — ANASAWI',
  robots: { index: false, follow: false },
}

/**
 * Le middleware bloque déjà `/admin/*` avant le rendu ; cette seconde
 * vérification garantit qu'une session valide existe côté serveur au moment
 * où le layout charge les données — la ceinture en plus des bretelles.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userName = session.user.name ?? session.user.email ?? 'Admin'

  /* La palette du site est chargée ici, une fois : tous les sélecteurs de
     couleur du CMS — inspecteur de section, éditeur de page, réglages — y
     puisent leurs nuances au lieu d'une liste figée dans le code. */
  const settings = await getSettings()

  return (
    <PaletteProvider palette={paletteFromIdentity(settings.identity)}>
      <div className="admin-shell flex h-svh overflow-hidden bg-background text-foreground antialiased">
        <AdminRail userName={userName} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>

        {/* Ici la session est déjà connue côté serveur : la pastille est rendue
            directement, sans l'aller-retour nécessaire sur le site public.
            L'éditeur de page affiche la sienne (état de publication). */}
        <AdminShellPill userName={userName} />

        <Toaster position="bottom-right" richColors closeButton />
      </div>
    </PaletteProvider>
  )
}
