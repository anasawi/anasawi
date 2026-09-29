'use client'

import { ExternalLink } from 'lucide-react'

import { demanderAVoirLeSite } from '@/components/admin/SiteViewer'

/**
 * Carte « Voir le site » du tableau de bord : ouvre le site par-dessus le
 * CMS (voir `SiteViewer`), sans le quitter. C'est un bouton, pas un lien :
 * on ne va nulle part.
 */
export function VoirLeSiteCard({
  className,
  titleClassName,
  labelClassName,
  iconClassName,
}: {
  className: string
  titleClassName: string
  labelClassName: string
  iconClassName: string
}) {
  return (
    <button
      type="button"
      onClick={demanderAVoirLeSite}
      className={`${className} text-left`}
    >
      <span className={titleClassName}>
        <ExternalLink className={iconClassName} strokeWidth={1.6} />
        <span className={labelClassName}>Aperçu</span>
      </span>
      <p className="mt-3 font-serif text-[1.3rem] leading-snug">Voir le site</p>
      <p className="mt-1.5 text-[12px] text-muted-foreground">
        Votre site, tel que vos visiteurs le découvrent.
      </p>
    </button>
  )
}
