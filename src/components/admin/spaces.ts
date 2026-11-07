import {
  HelpCircle,
  Home,
  Image as ImageIcon,
  Mail,
  PenLine,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { PASTELS } from './editor/pastels'

/**
 * Les espaces de l'administration, et la teinte de chacun.
 *
 * Chaque écran a SON pastel (pris dans les dix de l'éditeur) : on le
 * retrouve sous l'onglet actif de la barre du haut, sur l'icône de
 * l'en-tête, dans les notes, les pastilles des blocs, les onglets, les
 * états vides. Le pétrole reste la couleur des actions (boutons) ; le
 * pastel dit OÙ l'on est.
 */

export type Espace = {
  href: string
  label: string
  /** Le nom sous l'icône, sur téléphone (sept onglets : il faut court). */
  court: string
  icon: LucideIcon
  /** Le pastel de l'espace. */
  tone: { bg: string; fg: string }
  /** Dans la barre du haut (sinon : menu du compte). */
  barre: boolean
}

const P = PASTELS

export const ESPACES: Espace[] = [
  { href: '/admin', label: 'Accueil', court: 'Accueil', icon: Home, tone: P[0]!, barre: true },
  { href: '/admin/accueil', label: 'Mon site', court: 'Site', icon: PenLine, tone: P[1]!, barre: true },
  { href: '/admin/accompagnements', label: 'Accompagnements', court: 'Séances', icon: Sparkles, tone: P[3]!, barre: true },
  { href: '/admin/faq', label: 'Questions', court: 'Questions', icon: HelpCircle, tone: P[4]!, barre: true },
  { href: '/admin/medias', label: 'Médias', court: 'Photos', icon: ImageIcon, tone: P[6]!, barre: true },
  { href: '/admin/messages', label: 'Messages', court: 'Messages', icon: Mail, tone: P[5]!, barre: true },
  /* Réglages : une ardoise neutre, pas un pastel — c'est la salle des
     machines, elle n'a pas à attirer l'œil (le jaune beurre détonnait). */
  { href: '/admin/reglages', label: 'Réglages', court: 'Réglages', icon: Settings, tone: { bg: '#e3eaee', fg: '#46606c' }, barre: true },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', court: 'Comptes', icon: Users, tone: P[8]!, barre: false },
]

export function estCourant(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** L'espace de l'écran courant (par défaut : l'accueil). */
export function espaceDe(pathname: string): Espace {
  return ESPACES.find((e) => e.href !== '/admin' && estCourant(e.href, pathname)) ?? ESPACES[0]!
}
