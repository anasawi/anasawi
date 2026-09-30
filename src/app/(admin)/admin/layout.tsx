import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Toaster } from 'sonner'

import { AdminPillShell } from '@/components/admin/AdminPillShell'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { NavigationProgress } from '@/components/admin/NavigationProgress'
import { PaletteProvider } from '@/components/admin/PaletteProvider'
import { auth } from '@/lib/auth'
import { paletteFromIdentity } from '@/lib/palette'
import { getSettings, getUnreadCount } from '@/server/queries'
import { userExists } from '@/server/queries/users'

export const metadata: Metadata = {
  title: 'Administration — ANASAWI',
  robots: { index: false, follow: false },
}

/**
 * Le middleware bloque déjà `/admin/*` avant le rendu ; cette seconde
 * vérification garantit qu'une session valide existe côté serveur au moment
 * où le layout charge les données — la ceinture en plus des bretelles.
 *
 * Et la personne est relue en base : le jeton de session vaut sept jours,
 * un compte supprimé entre-temps ne doit pas garder l'écran ouvert.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!(await userExists(session.user.id))) redirect('/login')

  const userName = session.user.name ?? session.user.email ?? 'Admin'

  /* La palette du site est chargée ici, une fois : tous les sélecteurs de
     couleur du CMS — inspecteur de section, éditeur de page, réglages — y
     puisent leurs nuances au lieu d'une liste figée dans le code. */
  const [settings, nonLus] = await Promise.all([
    getSettings(),
    /* La pastille « messages non lus » de la navigation : une requête
       légère, sur chaque écran — c'est ce qui fait qu'Anne ne rate pas un
       message reçu pendant qu'elle travaille ailleurs. */
    getUnreadCount(),
  ])

  return (
    <PaletteProvider palette={paletteFromIdentity(settings.identity)}>
      <div className="admin-shell relative flex h-svh flex-col overflow-hidden bg-background text-foreground antialiased lg:flex-row">
        {/* Le fil de progression lit l'adresse (`useSearchParams`) : la
            frontière Suspense est exigée par Next, même sur un layout
            déjà dynamique. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>

        <AdminSidebar userName={userName} nonLus={nonLus} />

        {/* Repère « contenu principal » pour les lecteurs d'écran : la
            barre latérale est la navigation, ceci est l'écran. */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

        {/* La pastille flottante, sur tous les écrans : voir le site,
            menu du compte. */}
        <AdminPillShell name={userName} email={session.user.email ?? undefined} />

        <Toaster position="bottom-right" richColors closeButton />
      </div>
    </PaletteProvider>
  )
}
