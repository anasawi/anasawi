'use client'

import { ChevronDown, Eye, LogOut, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ESPACES, estCourant } from './spaces'
import { LogoMark } from '@/components/site/Logo'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/server/actions/auth'

/**
 * La barre de l'administration — le même geste que l'espace de la
 * candidature Qeeps.
 *
 * À gauche, la marque. Au centre, les espaces en pilule : un indicateur
 * blanc glisse sous l'écran courant, on sait toujours où l'on est. À
 * droite, « Voir le site » et le compte (initiale, menu : utilisateurs,
 * déconnexion). Sous 1024 px, les espaces deviennent une barre d'onglets
 * posée en bas de l'écran, à portée de pouce.
 *
 * Toute la barre est la navigation « Administration » : les tests et les
 * lecteurs d'écran la trouvent sous ce nom.
 */

const ESPACES_BARRE = ESPACES.filter((e) => e.barre)

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176c79] focus-visible:ring-offset-2'

/* ── Les espaces, en pilule ─────────────────────────────────────────── */

function Espaces({ nonLus }: { nonLus: number }) {
  const adresse = usePathname() ?? '/admin'
  /* L'onglet cliqué s'allume TOUT DE SUITE, sans attendre l'écran : la
     pilule glisse dès le clic, la page suit. */
  const [cible, setCible] = useState<{ depuis: string; vers: string } | null>(null)
  const pathname = cible && cible.depuis === adresse ? cible.vers : adresse
  const liste = useRef<HTMLUListElement>(null)
  const [indicateur, setIndicateur] = useState<{ left: number; width: number } | null>(null)

  /* L'indicateur se pose sous le lien courant, et le suit d'un écran à
     l'autre (transition CSS sur left / width). */
  useLayoutEffect(() => {
    const mesurer = () => {
      /* Mesuré sur l'élément de liste (positionné) : c'est lui que la
         liste voit, le lien est mesuré par rapport à lui. */
      const actif = liste.current
        ?.querySelector<HTMLElement>('[aria-current="page"]')
        ?.closest('li')
      setIndicateur(actif ? { left: actif.offsetLeft, width: actif.offsetWidth } : null)
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [pathname])

  return (
    <ul
      ref={liste}
      className={cn(
        'relative flex items-center gap-0.5 rounded-[12px] bg-block p-1',
        /* Sous 1024 px : barre d'onglets fixe en bas de l'écran. */
        'max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:z-[70] max-lg:justify-between max-lg:rounded-[18px] max-lg:bg-white/95 max-lg:p-1.5 max-lg:shadow-[0_0_0_1px_rgba(22,73,81,0.06),0_12px_40px_rgba(22,73,81,0.16)] max-lg:backdrop-blur-xl',
      )}
    >
      {indicateur && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 top-1 rounded-[9px] shadow-[0_1px_2px_rgba(22,73,81,0.08),0_4px_12px_rgba(22,73,81,0.06)] transition-[left,width,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:bottom-1.5 max-lg:top-1.5 max-lg:rounded-[12px] max-lg:shadow-none"
          /* Blanc, à peine teinté de cyan — le même pour tous les onglets. */
          style={{
            left: indicateur.left,
            width: indicateur.width,
            /* Une seule teinte pour toute la barre, quel que soit l'onglet :
               le pastel par espace changeait de couleur à chaque clic. */
            background: 'color-mix(in srgb, #ddf7f7 40%, white)',
          }}
        />
      )}
      {ESPACES_BARRE.map((espace) => {
        const actif = estCourant(espace.href, pathname)
        const Icone = espace.icon
        return (
          <li key={espace.href} className="relative z-[1] max-lg:flex-1">
            <Link
              href={espace.href}
              /* Préchargés en entier dès l'arrivée : le clic affiche l'écran
                 tout de suite (voir `staleTimes`, next.config). */
              prefetch
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                if (!estCourant(espace.href, adresse)) setCible({ depuis: adresse, vers: espace.href })
              }}
              aria-current={actif ? 'page' : undefined}
              aria-label={espace.label}
              className={cn(
                'relative flex h-9 items-center gap-2 whitespace-nowrap rounded-[9px] px-3.5 text-[14px] font-medium transition-colors duration-200',
                'max-lg:h-[52px] max-lg:flex-col max-lg:justify-center max-lg:gap-[3px] max-lg:rounded-[12px] max-lg:px-1 max-lg:text-[10.5px]',
                FOCUS,
                actif ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icone
                className="h-4 w-4 shrink-0 transition-colors duration-300 max-lg:h-[19px] max-lg:w-[19px]"
                style={actif ? { color: '#176c79' } : undefined}
                strokeWidth={1.8}
              />
              {/* Le nom : en entier sur ordinateur, sous l'icône sur
                  tablette, absent sur téléphone (l'icône et
                  `aria-label` suffisent, sept onglets ne tiennent pas). */}
              <span aria-hidden="true" className="max-xl:lg:hidden max-sm:hidden">
                {espace.label}
              </span>
              {/* Téléphone : un nom court sous l'icône — une icône seule ne se devine pas. */}
              <span aria-hidden="true" className="hidden text-[10px] leading-none max-sm:block">
                {espace.court}
              </span>
              {espace.href === '/admin/messages' && nonLus > 0 && (
                <span
                  aria-label={`${nonLus} non lu${nonLus > 1 ? 's' : ''}`}
                  className="grid h-[18px] min-w-[18px] animate-[adm-pop_0.4s_cubic-bezier(0.22,1,0.36,1)] place-items-center rounded-full bg-primary px-[5px] text-[11px] font-semibold tabular-nums text-white max-lg:absolute max-lg:left-[calc(50%+6px)] max-lg:top-1"
                >
                  {nonLus}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* ── Le compte ──────────────────────────────────────────────────────── */

function Compte({ userName, siteHref }: { userName: string; siteHref: string }) {
  const pathname = usePathname()
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef<HTMLDivElement>(null)

  useEffect(() => setOuvert(false), [pathname])

  useEffect(() => {
    if (!ouvert) return
    const auClic = (e: MouseEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false)
    }
    const aEchap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', auClic)
    document.addEventListener('keydown', aEchap)
    return () => {
      document.removeEventListener('mousedown', auClic)
      document.removeEventListener('keydown', aEchap)
    }
  }, [ouvert])

  const initiale = userName.trim().charAt(0).toUpperCase() || '?'
  const entree =
    'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-left text-[14px] font-medium text-foreground transition-colors hover:bg-block focus-visible:bg-block focus-visible:outline-none'

  return (
    <div ref={racine} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-haspopup="true"
        aria-label={`Mon compte — ${userName}`}
        className={cn(
          'flex items-center gap-1.5 rounded-full py-[3px] pl-[3px] pr-2 text-muted-foreground transition-colors hover:bg-block',
          ouvert && 'bg-block',
          FOCUS,
        )}
      >
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-gradient-to-br from-[#176c79] to-[#164951] text-[14px] font-semibold text-white">
          {initiale}
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-300', ouvert && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      {/* Toujours monté (les liens restent dans la navigation), révélé à
          l'ouverture. */}
      <div
        className={cn(
          'absolute right-0 top-[calc(100%+10px)] z-[80] flex w-[250px] origin-top-right flex-col rounded-[16px] bg-white p-2 shadow-pop transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          ouvert ? 'opacity-100' : 'pointer-events-none -translate-y-1.5 scale-[0.98] opacity-0',
        )}
        inert={!ouvert ? true : undefined}
      >
        <p className="mb-1 truncate border-b border-[#eef1f2] px-2.5 pb-3 pt-2 text-[13px] font-medium text-foreground">
          <span className="block text-[11px] font-normal text-muted-foreground">Connecté·e en tant que</span>
          {userName}
        </p>
        <Link href="/admin/utilisateurs" className={entree}>
          <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          Utilisateurs
        </Link>
        <Link href={siteHref} className={cn(entree, 'lg:hidden')}>
          <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          Voir le site
        </Link>
        <form action={signOutAction}>
          <button type="submit" className={entree}>
            <LogOut className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── La barre ───────────────────────────────────────────────────────── */

export function AdminTopBar({
  userName,
  nonLus = 0,
  siteHref = '/',
}: {
  userName: string
  /** Messages non lus — la pastille de l'espace Messages. */
  nonLus?: number
  /** Le site de la version sur laquelle on travaille (moderne ou classique). */
  siteHref?: string
}) {
  return (
    <header className="relative z-50 shrink-0 border-b border-[#eef1f2] bg-white/85 backdrop-blur-[14px] backdrop-saturate-[1.4] max-lg:bg-white max-lg:[backdrop-filter:none]">
      <nav
        aria-label="Administration"
        className="grid h-16 grid-cols-[1fr_auto] items-center gap-6 px-4 sm:px-5 lg:h-[72px] lg:grid-cols-[1fr_auto_1fr] lg:px-8"
      >
        <Link
          href="/admin"
          aria-label="ANASAWI — accueil de l’administration"
          className={cn('flex items-center gap-2.5 justify-self-start rounded-[10px]', FOCUS)}
        >
          <LogoMark className="h-8 w-8" />
          <span className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
            Anasawi<span className="text-[#176c79]">.</span>
          </span>
        </Link>

        <Espaces nonLus={nonLus} />

        <div className="flex items-center gap-3 justify-self-end">
          <Link
            href={siteHref}
           
            className={cn(
              'hidden h-8 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium text-foreground shadow-[inset_0_0_0_1px_var(--color-border)] transition-colors hover:bg-[rgba(22,73,81,0.04)] lg:inline-flex',
              FOCUS,
            )}
          >
            <Eye className="h-[14px] w-[14px]" strokeWidth={1.8} />
            Voir le site
          </Link>
          <Compte userName={userName} siteHref={siteHref} />
        </div>
      </nav>
    </header>
  )
}
