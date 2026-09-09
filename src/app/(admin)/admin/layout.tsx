import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

import { AdminPill, EyeIcon } from '@/components/site/AdminPill'
import { Sidebar } from '@/components/admin/Sidebar'
import { auth } from '@/lib/auth'
import { getAdminPages } from '@/server/queries'

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

  /* Les pages du site alimentent le groupe « Pages » de la sidebar.
     Chargées ici, dans le layout : la sidebar est un composant client et
     ne peut pas interroger la base elle-même. */
  const pages = (await getAdminPages()).map((page) => ({
    id: page.id,
    title: page.title,
    isHome: page.isHome,
    published: page.status === 'published',
  }))

  return (
    <div className="admin-shell flex h-svh overflow-hidden bg-background text-foreground antialiased">
      <Sidebar userName={userName} pages={pages} />

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
