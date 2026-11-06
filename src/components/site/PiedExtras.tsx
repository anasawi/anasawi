import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { domaine, initiales, type Pied } from '@/lib/pied'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * Les pièces du pied de page réglées dans Réglages › Pied de page, pour
 * les deux sites : la rangée des organismes (logo cliquable, ou leurs
 * initiales), la liste des collègues, la ligne légale. `ton` : sombre
 * (site moderne, fond bleu nuit) ou clair (site classique).
 */

type Ton = 'sombre' | 'clair'

/** Les organismes, en une rangée de petites cartes : le logo sur fond blanc, ou les initiales. */
export function Organismes({ pied, logos, ton, className }: { pied: Pied; logos: Record<string, Media>; ton: Ton; className?: string }) {
  const organismes = pied.organismes.filter((o) => o.url || o.nom || o.sigle)
  if (!organismes.length) return null
  const sombre = ton === 'sombre'
  return (
    <ul aria-label={pied.organismesTitre || 'Organismes'} className={cn('flex flex-wrap items-center gap-2', className)}>
      {organismes.map((o) => {
        const logo = logos[o.id]
        const carte = cn(
          'group flex h-11 items-center justify-center rounded-[13px] px-3.5 transition-[translate,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5',
          logo ? 'bg-white shadow-[0_6px_18px_-12px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_26px_-14px_rgba(0,0,0,0.5)]' : sombre ? 'bg-white/[0.07] hover:bg-white/[0.12]' : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
        )
        const contenu = logo ? (
          <Image src={logo.url} alt={o.nom || o.sigle} width={logo.width || 200} height={logo.height || 100} sizes="240px" className="h-7 w-auto max-w-[110px] object-contain" />
        ) : (
          <span className={cn('flex items-center gap-2 text-[12px] font-bold tracking-[0.06em]', sombre ? 'text-white/85' : 'text-ink')}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#4fa9a6]" />
            {initiales(o)}
          </span>
        )
        return (
          <li key={o.id}>
            {o.url ? (
              <a href={o.url} target="_blank" rel="noopener noreferrer" title={`${o.nom || o.sigle} — ${domaine(o.url)}`} aria-label={`${o.nom || o.sigle} (nouvel onglet)`} className={carte}>
                {contenu}
              </a>
            ) : (
              <span title={o.nom} className={carte}>
                {contenu}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Les sites de collègues : une liste de liens, nom et métier. */
export function Collegues({ pied, ton, className }: { pied: Pied; ton: Ton; className?: string }) {
  const amis = pied.amis.filter((a) => a.nom && a.url)
  if (!amis.length) return null
  const sombre = ton === 'sombre'
  return (
    <ul className={cn('space-y-2', className)}>
      {amis.map((a) => (
        <li key={a.id}>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className={cn('group inline-flex items-baseline gap-1.5 transition-colors', sombre ? 'text-white/75 hover:text-white' : 'text-ink-soft hover:text-ink')}>
            <span>
              {a.nom}
              {a.description && <span className={sombre ? 'text-white/40' : 'text-stone'}> · {a.description}</span>}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 translate-y-[2px] text-[#4fa9a6] transition-transform duration-500 group-hover:rotate-45" />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** La ligne légale : mentions et confidentialité. */
export function LiensLegaux({ base = '', ton, className }: { base?: string; ton: Ton; className?: string }) {
  const style = cn('-my-1.5 py-1.5 transition-colors', ton === 'sombre' ? 'hover:text-white' : 'hover:text-ink')
  return (
    <nav aria-label="Informations légales" className={cn('flex flex-wrap items-center gap-x-5 gap-y-1', className)}>
      <Link href={`${base}/mentions-legales`} className={style}>
        Mentions légales
      </Link>
      <Link href={`${base}/confidentialite`} className={style}>
        Confidentialité
      </Link>
    </nav>
  )
}
