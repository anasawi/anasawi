'use client'

import { usePathname } from 'next/navigation'

import { AdminPill, EyeIcon } from '@/components/site/AdminPill'

/**
 * La pastille flottante, sur TOUS les écrans de l'administration.
 *
 * Elle vivait dans le seul éditeur ; sur Médias ou Réglages, elle
 * manquait, alors qu'elle est le geste le plus court pour revenir au site
 * — et, depuis l'avatar, pour se déconnecter. L'état à gauche nomme
 * l'écran ; l'action est toujours « Voir le site », dans le même onglet.
 */

const ECRANS: { prefix: string; label: string }[] = [
  { prefix: '/admin/accueil', label: 'Édition' },
  { prefix: '/admin/accompagnements', label: 'Accompagnements' },
  { prefix: '/admin/faq', label: 'Questions' },
  { prefix: '/admin/medias', label: 'Médias' },
  { prefix: '/admin/messages', label: 'Messages' },
  { prefix: '/admin/utilisateurs', label: 'Utilisateurs' },
  { prefix: '/admin/reglages', label: 'Réglages' },
]

export function AdminPillShell({ name, email }: { name: string; email?: string }) {
  const pathname = usePathname() ?? '/admin'
  const ecran = ECRANS.find((e) => pathname.startsWith(e.prefix))?.label ?? 'Administration'

  return (
    <AdminPill
      status={ecran}
      actionLabel="Voir le site"
      actionHref="/"
      icon={<EyeIcon />}
      name={name}
      email={email}
      className="bottom-7"
    />
  )
}
