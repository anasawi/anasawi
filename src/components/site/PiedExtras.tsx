import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { GererCookies } from './consentement'
import { domaine, initiales, morceaux, type Pied } from '@/lib/pied'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * Ce que les Réglages ajoutent au pied de page, pour les deux sites :
 * les organismes (logo cliquable, ou leurs initiales), le paragraphe
 * déontologique, les sites de collègues, et la ligne légale (mentions,
 * confidentialité, cookies). `ton` : sombre (site moderne, fond bleu
 * nuit) ou clair (site classique).
 */
export function PiedExtras({
  pied,
  logos,
  ton,
  className,
}: {
  pied: Pied
  logos: Record<string, Media>
  ton: 'sombre' | 'clair'
  className?: string
}) {
  const sombre = ton === 'sombre'
  const organismes = pied.organismes.filter((o) => o.url || o.nom || o.sigle)
  const amis = pied.amis.filter((a) => a.nom && a.url)
  const titre = cn('text-[11px] font-semibold uppercase tracking-[0.22em]', sombre ? 'text-white/50' : 'text-stone')
  const lien = cn('underline decoration-1 underline-offset-[3px] transition-colors', sombre ? 'decoration-white/30 hover:text-white hover:decoration-[#4fa9a6]' : 'decoration-current/30 hover:decoration-current')

  return (
    <div className={cn('space-y-12', className)}>
      {organismes.length > 0 && (
        <section aria-label={pied.organismesTitre || 'Organismes'} className="text-center">
          {pied.organismesTitre && <p className={titre}>{pied.organismesTitre}</p>}
          <ul className="mx-auto mt-5 flex max-w-[980px] flex-wrap justify-center gap-3">
            {organismes.map((o) => {
              const logo = logos[o.id]
              const contenu = logo ? (
                <Image
                  src={logo.url}
                  alt={o.nom || o.sigle}
                  width={logo.width || 240}
                  height={logo.height || 120}
                  sizes="160px"
                  className="h-10 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <span className="flex items-center gap-2.5">
                  <span className={cn('grid h-10 min-w-10 place-items-center rounded-full px-2 text-[12px] font-bold tracking-[0.04em]', sombre ? 'bg-[#4fa9a6]/20 text-[#bfe6e3]' : 'bg-[#e2f3f1] text-[#2f8582]')}>
                    {initiales(o)}
                  </span>
                  {o.nom && <span className={cn('max-w-[150px] text-left text-[12px] leading-[1.3]', sombre ? 'text-white/70' : 'text-ink-soft')}>{o.nom}</span>}
                </span>
              )
              const carte = cn(
                'group flex h-[68px] items-center justify-center rounded-[18px] px-5 transition-[translate,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1',
                logo ? 'bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)] hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]' : sombre ? 'bg-white/[0.06] hover:bg-white/[0.1]' : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
              )
              return (
                <li key={o.id}>
                  {o.url ? (
                    <a href={o.url} target="_blank" rel="noopener noreferrer" title={`${o.nom || o.sigle} — ${domaine(o.url)}`} className={carte}>
                      {contenu}
                    </a>
                  ) : (
                    <span className={carte}>{contenu}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {pied.deontologie && (
        <p className={cn('mx-auto max-w-[78ch] text-center text-[13.5px] leading-[1.75]', sombre ? 'text-white/60' : 'text-ink-soft')}>
          {morceaux(pied.deontologie).map((m, i) =>
            'url' in m ? (
              <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className={lien}>
                {m.texte}
              </a>
            ) : (
              <span key={i}>{m.texte}</span>
            ),
          )}
        </p>
      )}

      {amis.length > 0 && (
        <section aria-label={pied.amisTitre || 'Collègues'} className="text-center">
          {pied.amisTitre && <p className={titre}>{pied.amisTitre}</p>}
          <ul className="mx-auto mt-5 flex max-w-[980px] flex-wrap justify-center gap-2">
            {amis.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'group inline-flex items-center gap-2 rounded-full py-2 pl-4 pr-3 text-[13.5px] transition-colors duration-500',
                    sombre ? 'bg-white/[0.06] text-white/85 hover:bg-white/[0.12]' : 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-ivory',
                  )}
                >
                  <span className="font-semibold">{a.nom}</span>
                  {a.description && <span className={sombre ? 'text-white/50' : 'text-stone'}>· {a.description}</span>}
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#4fa9a6] transition-transform duration-500 group-hover:rotate-45" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** La ligne légale : mentions, confidentialité, cookies. */
export function LiensLegaux({ base = '', ton, className }: { base?: string; ton: 'sombre' | 'clair'; className?: string }) {
  const style = cn('-my-1.5 py-1.5 transition-colors', ton === 'sombre' ? 'hover:text-white' : 'hover:text-ink')
  return (
    <nav aria-label="Informations légales" className={cn('flex flex-wrap items-center gap-x-5 gap-y-1', className)}>
      <Link href={`${base}/mentions-legales`} className={style}>
        Mentions légales
      </Link>
      <Link href={`${base}/confidentialite`} className={style}>
        Confidentialité
      </Link>
      <GererCookies className={style} />
    </nav>
  )
}
