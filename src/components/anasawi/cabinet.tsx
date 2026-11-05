'use client'

import Image from 'next/image'

import { accent, apparait, ARCHE, useVu } from './accueil'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * LE CABINET — la promenade lente, choisie par Anne parmi cinq idées
 * (fenêtre, mur de cadres, deux battants, bienvenue, promenade).
 */

type Props = { photos: Media[]; titre: string; sousTitre: string; id?: string }

function Entete({ titre, sousTitre, vu, centre = false }: { titre: string; sousTitre: string; vu: boolean; centre?: boolean }) {
  return (
    <div className={cn('mb-10 flex flex-wrap items-end gap-6 lg:mb-12', centre ? 'flex-col items-center text-center' : 'justify-between')}>
      <h2 className="text-[clamp(40px,4.8vw,68px)] leading-[1.02]" style={apparait(vu, 0.1)}>
        {accent(titre)}
      </h2>
      {sousTitre && (
        <p className="max-w-[36ch] font-[family-name:var(--ad-titre)] text-[19px] italic leading-[1.5] text-[var(--ad-pierre)]" style={apparait(vu, 0.25)}>
          {sousTitre}
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA PROMENADE LENTE — une rangée de portes qui glisse sans fin, très
   lentement, comme quand on marche dans un couloir. Elle s'arrête dès
   qu'on pose la souris dessus.
   ══════════════════════════════════════════════════════════════════════ */

export function CabinetDefile({ photos, titre, sousTitre, id = 'cabinet' }: Props) {
  const [ref, vu] = useVu<HTMLElement>()
  const liste = photos.slice(0, 8)
  const tour = [...liste, ...liste]
  return (
    <section ref={ref} id={id} className="scroll-mt-24 overflow-hidden py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        <Entete titre={titre} sousTitre={sousTitre} vu={vu} />
      </div>
      <div className="group" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1.4s .3s' }}>
        <ul className="flex w-max gap-5 pl-5 motion-safe:animate-[ad-defiler_90s_linear_infinite] group-hover:[animation-play-state:paused] lg:gap-7 lg:pl-7">
          {tour.map((p, k) => (
            <li key={k} aria-hidden={k >= liste.length} className="shrink-0">
              <div
                className="relative overflow-hidden bg-[var(--ad-sable)] shadow-[0_26px_50px_-32px_rgba(46,66,79,0.45)]"
                style={{ borderRadius: ARCHE, height: 'min(52vh, 480px)', width: (k % liste.length) % 2 ? 'min(26vh, 240px)' : 'min(36vh, 330px)', marginTop: (k % liste.length) % 2 ? 40 : 0 }}
              >
                <Image src={p.url} alt={k < liste.length ? p.alt : ''} fill sizes="330px" className="object-cover transition-transform duration-[1400ms] hover:scale-[1.05]" />
              </div>
              <p className="mt-3 text-center font-[family-name:var(--ad-titre)] text-[15px] italic text-[var(--ad-pierre)]">{p.caption}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
