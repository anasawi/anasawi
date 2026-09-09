'use client'

import {
  Compass,
  Files,
  HelpCircle,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Palette,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { LogoMark } from '@/components/site/Logo'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/server/actions/auth'

export type SidebarPage = {
  id: string
  title: string
  isHome: boolean
  published: boolean
}

/**
 * Sidebar de l'administration.
 *
 * L'architecture suit la logique du CMS, pas celle de la base :
 *
 * — PAGES : les vraies pages du site, listées telles quelles — un clic
 *   ouvre son éditeur. La pastille dit le statut (vert publié, gris
 *   brouillon).
 * — CONTENU : les données transverses (accompagnements, FAQ, médias,
 *   messages reçus).
 * — APPARENCE : ce qui touche tout le site d'un coup (identité, menu).
 * — CONFIGURATION : SEO et paramètres.
 */

const CONTENT_ITEMS = [
  { href: '/admin/accompagnements', label: 'Accompagnements', icon: Sparkles },
  { href: '/admin/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/admin/medias', label: 'Médias', icon: ImageIcon },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
] as const

const APPEARANCE_ITEMS = [
  { href: '/admin/identite', label: 'Identité du site', icon: Palette },
  { href: '/admin/navigation', label: 'Navigation', icon: Compass },
] as const

const CONFIG_ITEMS = [
  { href: '/admin/seo', label: 'SEO', icon: Search },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
] as const

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-[5px] px-2.5 py-[7px] text-[0.8rem] transition-colors duration-150',
        active
          ? 'bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(28,32,30,0.05)]'
          : 'text-muted-foreground hover:bg-white/55 hover:text-foreground',
      )}
    >
      {children}
    </Link>
  )
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 px-2.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/75">
      {children}
    </p>
  )
}

function ItemIcon({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  active: boolean
}) {
  return (
    <Icon
      className={cn(
        'h-[15px] w-[15px] shrink-0 transition-colors',
        active
          ? 'text-blue-deep'
          : 'text-muted-foreground/60 group-hover:text-muted-foreground',
      )}
      strokeWidth={1.75}
    />
  )
}

export function Sidebar({
  userName,
  pages,
}: {
  userName: string
  pages: SidebarPage[]
}) {
  const pathname = usePathname()

  const pageHref = (page: SidebarPage) =>
    page.isHome ? '/admin/accueil' : `/admin/pages/${page.id}`

  return (
    <aside className="flex h-full w-[228px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-[52px] items-center gap-2.5 px-5">
        <LogoMark className="h-[19px] w-[19px] text-blue-deep" />
        <span className="font-serif text-[0.84rem] tracking-[0.24em] text-foreground">
          AMASWI
        </span>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 pb-4 pt-2"
        aria-label="Administration"
      >
        {/* Tableau de bord — seul, au-dessus des groupes. */}
        <ul className="mb-6 space-y-px">
          <li>
            <NavLink href="/admin" active={pathname === '/admin'}>
              <ItemIcon icon={LayoutDashboard} active={pathname === '/admin'} />
              Tableau de bord
            </NavLink>
          </li>
        </ul>

        {/* ── Pages ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <GroupTitle>Pages</GroupTitle>
          <ul className="space-y-px">
            {pages.map((page) => {
              const href = pageHref(page)
              const active = pathname === href
              return (
                <li key={page.id}>
                  <NavLink href={href} active={active}>
                    {page.isHome ? (
                      <ItemIcon icon={Home} active={active} />
                    ) : (
                      <span
                        aria-hidden="true"
                        title={page.published ? 'Publiée' : 'Brouillon'}
                        className={cn(
                          'mx-[5px] h-[5px] w-[5px] shrink-0 rounded-full',
                          page.published
                            ? 'bg-emerald-500'
                            : 'bg-muted-foreground/40',
                        )}
                      />
                    )}
                    <span className="truncate">{page.title}</span>
                  </NavLink>
                </li>
              )
            })}
            <li>
              <NavLink href="/admin/pages" active={pathname === '/admin/pages'}>
                <ItemIcon icon={Files} active={pathname === '/admin/pages'} />
                <span className="text-muted-foreground">Gérer les pages…</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {/* ── Contenu ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <GroupTitle>Contenu</GroupTitle>
          <ul className="space-y-px">
            {CONTENT_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <NavLink href={item.href} active={active}>
                    <ItemIcon icon={item.icon} active={active} />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ── Apparence ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <GroupTitle>Apparence</GroupTitle>
          <ul className="space-y-px">
            {APPEARANCE_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <NavLink href={item.href} active={active}>
                    <ItemIcon icon={item.icon} active={active} />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ── Configuration ─────────────────────────────────────────── */}
        <div>
          <GroupTitle>Configuration</GroupTitle>
          <ul className="space-y-px">
            {CONFIG_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <NavLink href={item.href} active={active}>
                    <ItemIcon icon={item.icon} active={active} />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-blue-mist text-[0.68rem] font-medium text-blue-ink"
            >
              {userName.trim().charAt(0).toUpperCase() || 'A'}
            </span>
            <span className="min-w-0 truncate text-[0.75rem] text-muted-foreground">
              {userName}
            </span>
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
            >
              <LogOut className="h-[13px] w-[13px]" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
