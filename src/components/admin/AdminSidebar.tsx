'use client'

import {
  Eye,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu as MenuIcon,
  PenLine,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { LogoMark } from '@/components/site/Logo'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/server/actions/auth'

/**
 * La navigation de l'administration : une colonne, des mots.
 *
 * L'ancien rail de 64 px n'avait que des icônes, avec le nom en infobulle
 * au survol ; et cinq écrans (accompagnements, questions, messages, menu,
 * référencement) n'y figuraient pas du tout — on les atteignait par des
 * liens en bas des Réglages. Ici chaque écran a son entrée, son icône ET
 * son nom, et l'entrée courante est marquée. Une personne qui ouvre
 * l'outil pour la première fois lit la colonne et sait ce qu'il y a.
 *
 * Sept entrées, pas une de plus : Tableau de bord, Mon site (l'éditeur),
 * Accompagnements, Questions fréquentes, Médias, Messages, Réglages. Le
 * menu du site et le référencement sont des onglets des Réglages.
 *
 * Sous 1024 px, la colonne devient une barre en haut avec un bouton
 * « Menu » qui la déplie.
 */

type Entree = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  /** L'entrée est courante pour ces chemins (préfixes). */
  chemins: string[]
}

const ENTREES: Entree[] = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, chemins: ['/admin'] },
  { href: '/admin/accueil', label: 'Mon site', icon: PenLine, chemins: ['/admin/accueil'] },
  {
    href: '/admin/accompagnements',
    label: 'Accompagnements',
    icon: Sparkles,
    chemins: ['/admin/accompagnements'],
  },
  { href: '/admin/faq', label: 'Questions fréquentes', icon: HelpCircle, chemins: ['/admin/faq'] },
  { href: '/admin/medias', label: 'Médias', icon: ImageIcon, chemins: ['/admin/medias'] },
  { href: '/admin/messages', label: 'Messages', icon: Mail, chemins: ['/admin/messages'] },
  {
    href: '/admin/reglages',
    label: 'Réglages',
    icon: Settings,
    chemins: ['/admin/reglages', '/admin/navigation', '/admin/seo', '/admin/parametres', '/admin/identite'],
  },
]

function courante(entree: Entree, pathname: string): boolean {
  if (entree.href === '/admin') return pathname === '/admin'
  return entree.chemins.some((c) => pathname === c || pathname.startsWith(`${c}/`))
}

export function AdminSidebar({
  userName,
  nonLus = 0,
}: {
  userName: string
  /** Messages non lus — la pastille de l'entrée Messages. */
  nonLus?: number
}) {
  const pathname = usePathname()
  const [ouvert, setOuvert] = useState(false)

  /* Le tiroir mobile se referme quand on change d'écran. */
  useEffect(() => {
    setOuvert(false)
  }, [pathname])

  const liste = (
    <ul className="flex flex-col gap-0.5">
      {ENTREES.map((entree) => {
        const active = courante(entree, pathname)
        const Icone = entree.icon
        return (
          <li key={entree.href}>
            <Link
              href={entree.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'bg-white font-medium text-primary shadow-[0_1px_2px_rgba(28,32,30,0.06)]'
                  : 'text-ink-soft hover:bg-white/80 hover:text-foreground',
              )}
            >
              <Icone className="h-4 w-4 shrink-0" strokeWidth={1.7} />
              <span className="flex-1 truncate">{entree.label}</span>
              {entree.href === '/admin/messages' && nonLus > 0 && (
                <span
                  aria-label={`${nonLus} non lu${nonLus > 1 ? 's' : ''}`}
                  className="rounded-full bg-primary px-1.5 py-px text-[10.5px] font-semibold text-white"
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

  const pied = (
    <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
      <Link
        href="/"
        className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-ink-soft transition-colors hover:bg-white/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Eye className="h-4 w-4" strokeWidth={1.7} />
        Voir le site
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-white/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} />
          <span className="flex-1 truncate">Se déconnecter</span>
        </button>
      </form>
      <p className="truncate px-2.5 pt-1 text-[11.5px] text-muted-foreground" title={userName}>
        {userName}
      </p>
    </div>
  )

  return (
    <>
      {/* ── Colonne, à partir de 1024 px ──────────────────────────── */}
      <nav
        aria-label="Administration"
        className="hidden w-[216px] shrink-0 flex-col border-r border-border bg-ivory px-3 py-4 lg:flex"
      >
        <Link
          href="/admin"
          className="mb-5 flex items-center gap-2.5 px-2 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
        >
          <LogoMark className="h-7 w-7" />
          <span className="font-serif text-[15px] tracking-[0.2em]">ANASAWI</span>
        </Link>
        {liste}
        {pied}
      </nav>

      {/* ── Barre + tiroir, sous 1024 px ─────────────────────────── */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-ivory px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-controls="menu-administration"
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {ouvert ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
        <Link href="/admin" className="flex items-center gap-2 text-primary">
          <LogoMark className="h-6 w-6" />
          <span className="font-serif text-[14px] tracking-[0.2em]">ANASAWI</span>
        </Link>
        <span className="ml-auto truncate text-[13px] text-ink-soft">
          {ENTREES.find((e) => courante(e, pathname))?.label ?? ''}
        </span>
      </div>
      {ouvert && (
        <nav
          id="menu-administration"
          aria-label="Administration"
          className="absolute inset-x-0 top-12 z-40 flex flex-col border-b border-border bg-ivory px-3 py-3 shadow-[0_12px_30px_rgba(28,32,30,0.12)] lg:hidden"
        >
          {liste}
          {pied}
        </nav>
      )}
    </>
  )
}
