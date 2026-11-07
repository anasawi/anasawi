import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { Toaster } from 'sonner'

import { AdminTopBar } from '@/components/admin/AdminTopBar'
import { TonedMain } from '@/components/admin/TonedMain'
import { NavigationProgress } from '@/components/admin/NavigationProgress'
import { PaletteProvider } from '@/components/admin/PaletteProvider'
import { auth } from '@/lib/auth'
import { paletteFromIdentity } from '@/lib/palette'
import { adresseSite, COOKIE_VERSION, lireVersion } from '@/lib/version-admin'
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
  const version = lireVersion((await cookies()).get(COOKIE_VERSION)?.value)
  const [settings, nonLus] = await Promise.all([
    getSettings(),
    /* La pastille « messages non lus » de la navigation : une requête
       légère, sur chaque écran — c'est ce qui fait qu'Anne ne rate pas un
       message reçu pendant qu'elle travaille ailleurs. */
    getUnreadCount(),
  ])

  return (
    <PaletteProvider palette={paletteFromIdentity(settings.identity)}>
      <div className="admin-shell relative flex h-svh flex-col overflow-hidden bg-background text-foreground antialiased">
        {/* Le fil de progression lit l'adresse (`useSearchParams`) : la
            frontière Suspense est exigée par Next, même sur un layout
            déjà dynamique. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>

        <AdminTopBar userName={userName} nonLus={nonLus} siteHref={adresseSite(version)} />

        {/* Repère « contenu principal » pour les lecteurs d'écran : la
            barre du haut est la navigation, ceci est l'écran. */}
        <TonedMain>{children}</TonedMain>

        {/* Notifications sobres : une carte blanche, l'icône porte la
            couleur (succès, erreur) — pas de fond vert ou rouge plein. */}
        <Toaster
          position="top-right"
          offset={84}
          closeButton
          toastOptions={{
            classNames: {
              toast:
                'admin-toast !rounded-[12px] !border-0 !bg-white !text-foreground !shadow-pop !text-[14px] !font-medium',
              description: '!text-muted-foreground',
              success: '[&_[data-icon]]:!text-success',
              error: '[&_[data-icon]]:!text-destructive',
            },
          }}
        />
      </div>
    </PaletteProvider>
  )
}
