import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

import { AdminPill, EyeIcon } from '@/components/site/AdminPill'
import { AdminRail } from '@/components/admin/AdminRail'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Administration — AMASWI',
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

  return (
    <div className="admin-shell flex h-svh overflow-hidden bg-background text-foreground antialiased">
      <AdminRail userName={userName} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {/* Ici la session est déjà connue côté serveur : la pastille est rendue
          directement, sans l'aller-retour nécessaire sur le site public. */}
      <AdminPill
        status="Édition"
        actionLabel="Voir le site"
        actionHref="/"
        icon={<EyeIcon />}
        homeHref="/admin"
        name={userName}
        className="bottom-6"
      />

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}
