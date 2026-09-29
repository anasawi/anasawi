'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  EVENEMENT_VOIR_LE_SITE,
  SiteViewer,
} from '@/components/admin/SiteViewer'
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
  const [siteOuvert, setSiteOuvert] = useState(false)

  /* La carte « Voir le site » du tableau de bord, ou tout autre bouton,
     ouvre le même cadre. */
  useEffect(() => {
    const ouvrir = () => setSiteOuvert(true)
    window.addEventListener(EVENEMENT_VOIR_LE_SITE, ouvrir)
    return () => window.removeEventListener(EVENEMENT_VOIR_LE_SITE, ouvrir)
  }, [])

  if (isEditorPath(pathname)) return null

  return (
    <>
      <AdminPill
        status="Édition"
        actionLabel="Voir le site"
        actionHref="/"
        /* Par-dessus le CMS, sans le quitter : on regarde, on ferme, on
           est toujours au même endroit. */
        onAction={() => setSiteOuvert(true)}
        icon={<EyeIcon />}
        homeHref="/admin"
        name={userName}
        className="bottom-6"
      />
      <SiteViewer
        href="/"
        open={siteOuvert}
        onClose={() => setSiteOuvert(false)}
      />
    </>
  )
}
