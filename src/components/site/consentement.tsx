'use client'

import { MapPin, Play } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * LES CONTENUS D'AUTRES SITES — notre arbitrage sur les cookies.
 *
 * Le site ne dépose AUCUN cookie de mesure d'audience ni de publicité :
 * pas de bandeau, pas de réglage à proposer. Seuls le plan Google Maps
 * et une vidéo YouTube ou Vimeo pourraient en déposer ; ils ne se
 * chargent donc qu'au clic de la personne, pour la page en cours (rien
 * n'est retenu : il n'y a donc pas de choix à « reprendre » plus tard).
 */

export type ServiceTiers = 'google-maps' | 'youtube' | 'vimeo'

const SERVICES: Record<ServiceTiers, { nom: string; usage: string }> = {
  'google-maps': { nom: 'Google Maps', usage: 'le plan d’accès' },
  youtube: { nom: 'YouTube', usage: 'la vidéo' },
  vimeo: { nom: 'Vimeo', usage: 'la vidéo' },
}

/** Le contenu peut-il se charger ? Faux tant que la personne n'a pas cliqué. */
export function useConsentement(): [boolean, () => void] {
  const [accorde, setAccorde] = useState(false)
  return [accorde, () => setAccorde(true)]
}

/** Le service d'une adresse de vidéo intégrée. */
export const serviceDeVideo = (src: string): ServiceTiers => (/vimeo/.test(src) ? 'vimeo' : 'youtube')

/** Un contenu d'un autre site en attente : il se charge au clic. Neutre (hérite des couleurs autour). */
export function ContenuTiers({ service, className, children }: { service: ServiceTiers; className?: string; children: React.ReactNode }) {
  const [accorde, accorder] = useConsentement()
  if (accorde) return <>{children}</>
  const s = SERVICES[service]
  const Icone = service === 'google-maps' ? MapPin : Play
  return (
    <div className={cn('flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-[inherit] bg-black/[0.04] p-6 text-center', className)}>
      <Icone className="h-6 w-6 opacity-60" strokeWidth={1.6} />
      <button type="button" onClick={accorder} className="rounded-full bg-current/10 px-4 py-2 text-[14px] font-semibold underline-offset-4 hover:underline">
        Afficher {s.usage}
      </button>
      <p className="max-w-[40ch] text-[12.5px] leading-[1.5] opacity-70">Contenu fourni par {s.nom}, qui peut déposer des cookies : il ne se charge qu’à votre demande.</p>
    </div>
  )
}
