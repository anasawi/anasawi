'use client'

import { accentue, apparait, ARCHE, Arche, Bouton, CARTE, CONTENEUR, DOUX, Entete, Etiquette, ITALIQUE, Section, TEXTE, Titre, useVu } from './socle'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/* MA MÉTHODE — cinq façons de dire comment vous travaillez. */

type Etape = { titre: string; texte: string }
type Base = { etiquette: string; titre: string; intro: string; etapes: Etape[]; id?: string }
const num = (i: number) => String(i + 1).padStart(2, '0')

/* ── 1. En colonnes : chaque étape sous sa petite arche numérotée, reliées par un fil. */
export function MethodeColonnes({ etiquette, titre, intro, etapes, id }: Base) {
  const [ref, vu] = useVu<HTMLOListElement>()
  const liste = etapes.slice(0, 4)
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={intro} />
        <ol ref={ref} className={cn('relative grid gap-10 md:gap-8', liste.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
          <span aria-hidden="true" className="absolute left-0 right-0 top-[38px] hidden h-px origin-left border-t border-dashed border-[var(--ad-sable-fonce)] md:block" style={{ transform: vu ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 2.2s ${DOUX} .2s` }} />
          {liste.map((e, i) => (
            <li key={i} className="relative" style={apparait(vu, 0.25 + i * 0.18)}>
              <span className="relative grid h-[76px] w-[58px] place-items-center bg-[var(--ad-sable)] font-[family-name:var(--ad-titre)] text-[24px] text-[var(--ad-nuit)] ring-8 ring-[var(--ad-ivoire)]" style={{ borderRadius: ARCHE }}>
                {i + 1}
              </span>
              <p className="mt-6 font-[family-name:var(--ad-titre)] text-[26px] leading-[1.15] text-[var(--ad-nuit)]">{e.titre}</p>
              <p className="mt-3 max-w-[36ch] text-[15px] leading-[1.7] text-[var(--ad-pierre)]">{e.texte}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}

/* ── 2. Verticale : le titre à gauche, les étapes à droite le long d'un trait qui se remplit. */
export function MethodeVerticale({ etiquette, titre, intro, etapes, id, bouton, rdv }: Base & { bouton: string; rdv: string }) {
  const [ref, vu] = useVu<HTMLOListElement>()
  const liste = etapes.slice(0, 5)
  return (
    <Section id={id}>
      <div className={cn(CONTENEUR, 'grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {intro && <p className={cn(TEXTE, 'mt-6 max-w-[42ch]')}>{intro}</p>}
          <div className="mt-9">
            <Bouton href={rdv}>{bouton}</Bouton>
          </div>
        </div>
        <ol ref={ref} className="relative">
          <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-px bg-[var(--ad-sable-fonce)]" />
          <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-px origin-top bg-[var(--ad-bleu)]" style={{ transform: vu ? 'scaleY(1)' : 'scaleY(0)', transition: `transform ${1 + liste.length * 0.5}s ${DOUX} .3s` }} />
          {liste.map((e, i) => (
            <li key={i} className="relative flex gap-6 pb-8 last:pb-0" style={apparait(vu, 0.3 + i * 0.4)}>
              <span className="relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ad-nuit)] text-[14px] font-semibold tabular-nums text-white ring-[6px] ring-[var(--ad-ivoire)]">{i + 1}</span>
              <div className="pt-1.5">
                <p className="font-[family-name:var(--ad-titre)] text-[24px] leading-[1.2] text-[var(--ad-nuit)]">{e.titre}</p>
                <p className="mt-2 max-w-[48ch] text-[15px] leading-[1.7] text-[var(--ad-pierre)]">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}

/* ── 3. En cartes : les étapes posées en pile, qui s'étalent à l'arrivée comme un jeu qu'on ouvre. */
export function MethodeCartes({ etiquette, titre, intro, etapes, id }: Base) {
  const [ref, vu] = useVu<HTMLOListElement>('-20%')
  const liste = etapes.slice(0, 4)
  const n = liste.length
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={intro} centre />
        <ol ref={ref} className={cn('grid gap-4 overflow-x-clip md:gap-5', n >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
          {liste.map((e, i) => {
            const decalage = (n - 1) / 2 - i
            return (
              <li
                key={i}
                className={cn(CARTE, 'relative flex min-h-[260px] flex-col p-7')}
                style={{
                  transform: vu ? 'none' : `translateX(calc(${decalage * 100}% + ${decalage * 20}px)) rotate(${(i - (n - 1) / 2) * 4}deg)`,
                  transition: `transform 1.4s ${DOUX} ${0.3 + i * 0.08}s`,
                  zIndex: n - i,
                }}
              >
                <span className="font-[family-name:var(--ad-titre)] text-[54px] leading-none text-[var(--ad-sable-fonce)]">{num(i)}</span>
                <p className="mt-auto pt-8 font-[family-name:var(--ad-titre)] text-[24px] leading-[1.2] text-[var(--ad-nuit)]">{e.titre}</p>
                <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--ad-pierre)]">{e.texte}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </Section>
  )
}

/* ── 4. Une séance : le déroulé d'une heure, de l'arrivée au départ, sur une ligne du temps. */
export function MethodeSeance({ etiquette, titre, intro, id, moments, duree }: Omit<Base, 'etapes'> & { moments: { moment: string; titre: string; texte: string }[]; duree: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const liste = moments.slice(0, 4)
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={intro} />
        <div ref={ref} className="rounded-[32px] bg-[var(--ad-sable)] p-6 md:p-10">
          <div className="mb-8 flex items-center gap-4">
            <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ad-pierre)]">Arrivée</span>
            <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white">
              <span className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-[var(--ad-bleu)]" style={{ transform: vu ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 3.2s cubic-bezier(0.65,0,0.35,1) .4s` }} />
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ad-pierre)]">{duree || 'Départ'}</span>
          </div>
          <ol className={cn('grid gap-4', liste.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
            {liste.map((m, i) => (
              <li key={i} className="rounded-[22px] bg-white p-6" style={apparait(vu, 0.5 + i * 0.6)}>
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ad-or)]">{m.moment}</p>
                <p className="mt-2 font-[family-name:var(--ad-titre)] text-[22px] leading-[1.2] text-[var(--ad-nuit)]">{m.titre}</p>
                <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--ad-pierre)]">{m.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}

/* ── 5. Mon approche : un texte posé, la porte, et quelques mots qui la résument. */
export function MethodeApproche({ etiquette, titre, intro, id, mots, photo, citation }: Omit<Base, 'etapes'> & { mots: string[]; photo: Media | null; citation: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          <p className={cn(TEXTE, 'mt-6 max-w-[54ch]')} style={apparait(vu, 0.3)}>
            {accentue(intro)}
          </p>
          {citation && (
            <p className={cn(ITALIQUE, 'mt-8 border-l-2 border-[var(--ad-sable-fonce)] pl-5 text-[21px] leading-[1.45] text-[var(--ad-nuit)]')} style={apparait(vu, 0.45)}>
              {accentue(citation)}
            </p>
          )}
          <ul className="mt-9 flex flex-wrap gap-2">
            {mots.map((m, i) => (
              <li key={m} className="rounded-full border border-[var(--ad-sable-fonce)] px-4 py-2 text-[14px] font-semibold text-[var(--ad-nuit)] transition-colors duration-500 hover:bg-[var(--ad-nuit)] hover:text-white" style={apparait(vu, 0.6 + i * 0.1)}>
                {m}
              </li>
            ))}
          </ul>
        </div>
        <Arche media={photo} lente className="mx-auto h-[min(64vh,580px)] w-full max-w-[440px] max-lg:h-[50vh]" />
      </div>
    </Section>
  )
}
