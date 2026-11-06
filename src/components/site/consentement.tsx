'use client'

import { Cookie, MapPin, Play, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

/**
 * LES COOKIES — notre arbitrage.
 *
 * Le site ne dépose AUCUN cookie de mesure d'audience ni de publicité :
 * pas de bandeau à imposer à l'arrivée. Seuls les contenus d'autres
 * sites (le plan Google Maps, une vidéo YouTube ou Vimeo) peuvent en
 * déposer ; ils ne se chargent donc qu'après un clic de la personne,
 * qui sait ce qu'elle accepte (recommandation de la CNIL pour les
 * contenus tiers). Le choix est retenu dans ce navigateur, et se
 * reprend à tout moment par le lien « Gérer les cookies » du pied de
 * page.
 */

export type ServiceTiers = 'google-maps' | 'youtube' | 'vimeo'

export const SERVICES: Record<ServiceTiers, { nom: string; usage: string; politique: string }> = {
  'google-maps': { nom: 'Google Maps', usage: 'le plan d’accès au cabinet', politique: 'https://policies.google.com/privacy?hl=fr' },
  youtube: { nom: 'YouTube', usage: 'les vidéos', politique: 'https://policies.google.com/privacy?hl=fr' },
  vimeo: { nom: 'Vimeo', usage: 'les vidéos', politique: 'https://vimeo.com/privacy' },
}

const CLE = 'anasawi-contenus-tiers'
const EVENEMENT = 'anasawi-contenus-tiers'

function lire(): Partial<Record<ServiceTiers, boolean>> {
  try {
    return JSON.parse(window.localStorage.getItem(CLE) ?? '{}') as Partial<Record<ServiceTiers, boolean>>
  } catch {
    return {}
  }
}

export function enregistrerChoix(choix: Partial<Record<ServiceTiers, boolean>>) {
  try {
    window.localStorage.setItem(CLE, JSON.stringify({ ...lire(), ...choix }))
  } catch {
    /* navigation privée : le choix vaut pour la page */
  }
  window.dispatchEvent(new Event(EVENEMENT))
}

const abonner = (rappel: () => void) => {
  window.addEventListener(EVENEMENT, rappel)
  window.addEventListener('storage', rappel)
  return () => {
    window.removeEventListener(EVENEMENT, rappel)
    window.removeEventListener('storage', rappel)
  }
}

/** Le contenu de ce service peut-il se charger ? (faux côté serveur : rien ne part avant le navigateur) */
export function useConsentement(service: ServiceTiers): [boolean, () => void] {
  const accorde = useSyncExternalStore(
    abonner,
    () => lire()[service] === true,
    () => false,
  )
  return [accorde, () => enregistrerChoix({ [service]: true })]
}

/** Le service d'une adresse de vidéo intégrée. */
export const serviceDeVideo = (src: string): ServiceTiers => (/vimeo/.test(src) ? 'vimeo' : 'youtube')

/**
 * Un contenu tiers en attente : il ne se charge qu'après un clic. Neutre
 * (il hérite des couleurs du site autour), pour les blocs du site classique.
 */
export function ContenuTiers({ service, className, children }: { service: ServiceTiers; className?: string; children: React.ReactNode }) {
  const [accorde, accorder] = useConsentement(service)
  if (accorde) return <>{children}</>
  const s = SERVICES[service]
  const Icone = service === 'google-maps' ? MapPin : Play
  return (
    <div className={cn('flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-[inherit] bg-black/[0.04] p-6 text-center', className)}>
      <Icone className="h-6 w-6 opacity-60" strokeWidth={1.6} />
      <button type="button" onClick={accorder} className="rounded-full bg-current/10 px-4 py-2 text-[14px] font-semibold underline-offset-4 hover:underline">
        Afficher {s.usage}
      </button>
      <p className="max-w-[40ch] text-[12.5px] leading-[1.5] opacity-70">
        Ce contenu est fourni par {s.nom}, qui peut déposer des cookies. Il ne se charge qu’avec votre accord.
      </p>
    </div>
  )
}

/** Le lien « Gérer les cookies » et sa petite fenêtre : un interrupteur par service. */
export function GererCookies({ className, libelle = 'Gérer les cookies' }: { className?: string; libelle?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [choix, setChoix] = useState<Partial<Record<ServiceTiers, boolean>>>({})
  useEffect(() => {
    if (!ouvert) return
    setChoix(lire())
    const fermer = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false)
    window.addEventListener('keydown', fermer)
    return () => window.removeEventListener('keydown', fermer)
  }, [ouvert])
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className={className}>
        {libelle}
      </button>
      {ouvert && (
        <div role="dialog" aria-modal="true" aria-label="Gérer les cookies" className="fixed inset-0 z-[90] grid place-items-center bg-[#2e424f]/35 p-4 backdrop-blur-sm" onClick={() => setOuvert(false)}>
          <div className="w-full max-w-[460px] rounded-[26px] bg-[#fbf6ee] p-7 text-left text-[#2e424f] shadow-[0_40px_80px_-30px_rgba(46,66,79,0.6)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <p className="flex items-center gap-2.5 text-[19px] font-semibold">
                <Cookie className="h-5 w-5 text-[#4fa9a6]" strokeWidth={1.7} />
                Cookies et contenus tiers
              </p>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-[14px] leading-[1.65] text-[#574d45]">
              Ce site ne mesure pas votre visite et n’affiche aucune publicité. Seuls les contenus ci-dessous, fournis par d’autres sites, peuvent déposer des cookies — ils ne se chargent qu’avec votre accord.
            </p>
            <ul className="mt-5 divide-y divide-[#e9dac5] border-y border-[#e9dac5]">
              {(Object.keys(SERVICES) as ServiceTiers[]).map((k) => {
                const actif = choix[k] === true
                return (
                  <li key={k} className="flex items-center justify-between gap-4 py-3.5">
                    <span>
                      <span className="block text-[15px] font-semibold">{SERVICES[k].nom}</span>
                      <span className="block text-[13px] text-[#857869]">
                        Pour {SERVICES[k].usage} ·{' '}
                        <a href={SERVICES[k].politique} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          sa politique
                        </a>
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={actif}
                      aria-label={`${SERVICES[k].nom} : ${actif ? 'autorisé' : 'bloqué'}`}
                      onClick={() => setChoix((c) => ({ ...c, [k]: !actif }))}
                      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', actif ? 'bg-[#4fa9a6]' : 'bg-[#e9dac5]')}
                    >
                      <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-300', actif ? 'left-6' : 'left-1')} />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  enregistrerChoix({ 'google-maps': false, youtube: false, vimeo: false })
                  setOuvert(false)
                }}
                className="rounded-full px-4 py-2.5 text-[14px] font-semibold hover:bg-black/5"
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={() => {
                  enregistrerChoix({ 'google-maps': false, youtube: false, vimeo: false, ...choix })
                  setOuvert(false)
                }}
                className="rounded-full bg-[#2e424f] px-5 py-2.5 text-[14px] font-semibold text-white"
              >
                Enregistrer mes choix
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
