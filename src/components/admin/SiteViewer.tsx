'use client'

import { ExternalLink, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Le site, vu depuis le CMS — sans le quitter.
 *
 * « Voir le site » ouvrait un nouvel onglet : pour Anne, c'était partir
 * ailleurs, perdre l'endroit où elle était. Ici le site EN LIGNE s'ouvre
 * par-dessus le CMS, dans un cadre : on regarde, on ferme, on est
 * toujours au même endroit. Un bouton permet quand même de l'ouvrir dans
 * un onglet à part, pour le montrer ou le garder sous la main.
 *
 * Le cadre charge la vraie page publique (même origine : la politique
 * `frame-ancestors 'self'` l'autorise). Tant qu'elle n'est pas arrivée,
 * un voile le dit — jamais un cadre vide sans explication. La barre
 * d'administration du site public sait qu'elle est dans ce cadre
 * (`?dans-le-cms`) et ne se montre pas : une pilule « Modifier » dans un
 * cadre dans le CMS, c'est un CMS dans le CMS.
 */
export const PARAM_DANS_LE_CMS = 'dans-le-cms'

/** Événement que n'importe quel bouton du CMS peut émettre pour ouvrir
    le site dans le cadre — la pilule du bas l'écoute. */
export const EVENEMENT_VOIR_LE_SITE = 'anasawi:voir-le-site'

export function demanderAVoirLeSite() {
  window.dispatchEvent(new CustomEvent(EVENEMENT_VOIR_LE_SITE))
}

export function SiteViewer({
  href,
  open,
  onClose,
}: {
  /** Chemin public de la page à montrer (`/`, `/mentions-legales`). */
  href: string
  open: boolean
  onClose: () => void
}) {
  const [charge, setCharge] = useState(false)
  const fermer = useRef<HTMLButtonElement>(null)

  /* Échap ferme ; le focus va sur « Fermer » à l'ouverture, revient au
     bouton d'origine à la fermeture (le navigateur s'en charge : on ne
     déplace le focus que si le cadre est ouvert). */
  useEffect(() => {
    if (!open) return
    setCharge(false)
    fermer.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const url = new URL(href, 'http://cms.local')
  url.searchParams.set(PARAM_DANS_LE_CMS, '')
  const src = `${url.pathname}${url.search}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Le site en ligne"
      className="fixed inset-0 z-[120] flex flex-col bg-night/40 p-4 backdrop-blur-[2px] md:p-6"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_24px_80px_-20px_rgba(28,32,30,0.45)]">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <span className="flex items-center gap-2 text-[12.5px] text-ink-soft">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[#12b981]"
            />
            Le site en ligne
            <span className="text-muted-foreground">— {href}</span>
          </span>
          <div className="flex-1" />
          <a
            href={href}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 rounded-lg border border-foreground/15 px-2.5 py-[5px] text-[12px] text-ink-soft transition-colors hover:border-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.6} />
            Ouvrir dans un onglet
          </a>
          <button
            ref={fermer}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-ivory">
          {!charge && (
            <div
              role="status"
              aria-label="Chargement du site"
              className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-soft"
            >
              <span className="animate-pulse">Le site arrive…</span>
            </div>
          )}
          <iframe
            title="Le site en ligne"
            src={src}
            onLoad={() => setCharge(true)}
            className={cn(
              'h-full w-full border-0 transition-opacity duration-300',
              charge ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
      </div>
    </div>
  )
}
