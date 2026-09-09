'use client'

import {
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { LogoMark } from '@/components/site/Logo'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/server/actions/auth'

/**
 * Rail de navigation de l'administration — 5 entrées, rien d'autre.
 *
 * Fidèle à la maquette validée : 64 px de large, boutons 42×42 avec
 * tooltip en pastille sombre à droite, entrée active sur fond blanc avec
 * l'icône en bleu profond. En bas, l'avatar ouvre le menu de déconnexion.
 */

type RailEntry = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  isActive: (pathname: string) => boolean
}

const ENTRIES: RailEntry[] = [
  {
    href: '/admin',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    isActive: (p) => p === '/admin',
  },
  {
    href: '/admin/accueil',
    label: 'Mon site',
    icon: Home,
    isActive: (p) =>
      p.startsWith('/admin/accueil') || p.startsWith('/admin/pages'),
  },
  {
    href: '/admin/identite',
    label: 'Apparence',
    icon: Palette,
    isActive: (p) => p.startsWith('/admin/identite'),
  },
  {
    href: '/admin/medias',
    label: 'Médias',
    icon: ImageIcon,
    isActive: (p) => p.startsWith('/admin/medias'),
  },
  {
    href: '/admin/reglages',
    label: 'Paramètres',
    icon: Settings,
    isActive: (p) =>
      [
        '/admin/reglages',
        '/admin/parametres',
        '/admin/navigation',
        '/admin/seo',
        '/admin/messages',
        '/admin/accompagnements',
        '/admin/faq',
      ].some((prefix) => p.startsWith(prefix)),
  },
]

export function AdminRail({ userName }: { userName: string }) {
  const pathname = usePathname()

  /* Menu de l'avatar — fermé au clic extérieur. */
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  return (
    <nav
      aria-label="Administration"
      className="z-30 flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-ivory py-3.5"
    >
      <Link
        href="/admin"
        aria-label="Accueil de l'administration"
        className="mb-3.5 flex h-[30px] w-[30px] items-center justify-center text-blue-deep"
      >
        <LogoMark className="h-7 w-7" />
      </Link>

      {ENTRIES.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex h-[42px] w-[42px] items-center justify-center rounded-[10px] transition-colors',
              active
                ? 'bg-white text-blue-deep shadow-[0_1px_2px_rgba(28,32,30,0.06)]'
                : 'text-muted-foreground hover:bg-white/90 hover:text-foreground',
            )}
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-[52px] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11.5px] text-ivory opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              {label}
            </span>
          </Link>
        )
      })}

      <div className="flex-1" />

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Compte — ${userName}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-blue-mist text-[12px] font-medium text-blue-deep transition-shadow hover:shadow-[0_1px_3px_rgba(28,32,30,0.15)]"
        >
          {userName.trim().charAt(0).toUpperCase() || 'A'}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-0 left-[46px] z-40 w-48 rounded-[10px] border border-border bg-white p-1.5 shadow-[0_8px_24px_rgba(28,32,30,0.14)]"
          >
            <p className="truncate px-2.5 pb-1.5 pt-1 text-[12px] text-muted-foreground">
              {userName}
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-[7px] text-left text-[12.5px] text-foreground transition-colors hover:bg-blue-mist/60"
              >
                <LogOut className="h-[14px] w-[14px]" strokeWidth={1.6} />
                Se déconnecter
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  )
}
