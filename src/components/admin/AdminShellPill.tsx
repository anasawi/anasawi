'use client'

import { usePathname } from 'next/navigation'

import { AdminPill, EyeIcon } from '@/components/site/AdminPill'

/** Routes où l'éditeur de page rend sa propre pilule, avec l'état de
    publication de la page (« En ligne », « Modifications à publier »…). */
export function isEditorPath(pathname: string): boolean {
  if (pathname === '/admin/accueil') return true
  const m = /^\/admin\/pages\/([^/]+)$/.exec(pathname)
  return m !== null && m[1] !== 'nouvelle'
}

/**
 * Pilule flottante du CMS, hors éditeur.
 *
 * Dans l'éditeur, deux libellés d'état concurrents (« Édition » en bas,
 * l'indicateur de publication en haut) disaient deux choses différentes :
 * l'éditeur porte désormais la sienne, et celle-ci s'efface.
 */
export function AdminShellPill({ userName }: { userName: string }) {
  const pathname = usePathname()
  if (isEditorPath(pathname)) return null

  return (
    <AdminPill
      status="Édition"
      actionLabel="Voir le site"
      actionHref="/"
      icon={<EyeIcon />}
      homeHref="/admin"
      name={userName}
      className="bottom-6"
    />
  )
}
