'use client'

import { Check } from 'lucide-react'

import { accentue, apparait, ARCHE, Arche, Bouton, CONTENEUR, DOUX, Entete, Etiquette, ITALIQUE, paragraphes, Section, TEXTE, Titre, useVu } from './socle'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/* TEXTES — neuf façons de poser des mots entre deux sections. */

/* ── 1. Manifeste : vos convictions, une par ligne, en grand, qui s'allument l'une après l'autre. */
export function TexteManifeste({ etiquette, titre, phrases, id }: { etiquette: string; titre: string; phrases: string[]; id?: string }) {
  const [ref, vu] = useVu<HTMLOListElement>('-15%')
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} />
        <ol ref={ref} className="border-t border-[var(--ad-sable-fonce)]">
          {phrases.slice(0, 5).map((p, i) => (
            <li key={i} className="grid grid-cols-[48px_1fr] items-baseline gap-4 border-b border-[var(--ad-sable-fonce)] py-4 md:grid-cols-[80px_1fr] md:py-5">
              <span className="text-[13px] font-semibold tabular-nums text-[var(--ad-or)]">{String(i + 1).padStart(2, '0')}</span>
              <span
                className={cn(ITALIQUE, 'text-[clamp(22px,2.8vw,38px)] leading-[1.25] transition-colors duration-[1200ms]')}
                style={{ color: vu ? 'var(--ad-nuit)' : 'color-mix(in srgb, var(--ad-gris) 35%, transparent)', transitionDelay: `${0.3 + i * 0.45}s` }}
              >
                {accentue(p)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}

/* ── 2. Texte centré : un titre, un paragraphe, de l'air autour. */
export function TexteCentre({ etiquette, titre, texte, bouton, rdv, id }: { etiquette: string; titre: string; texte: string; bouton: string; rdv: string; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'flex flex-col items-center text-center')}>
        <Etiquette>{etiquette}</Etiquette>
        <Titre texte={titre} />
        {paragraphes(texte)
          .slice(0, 3)
          .map((p, i) => (
            <p key={i} className={cn(TEXTE, 'mx-auto mt-6 max-w-[62ch] text-[17px]')} style={apparait(vu, 0.3 + i * 0.1)}>
              {accentue(p)}
            </p>
          ))}
        {bouton && (
          <div className="mt-9" style={apparait(vu, 0.6)}>
            <Bouton href={rdv} discret>
              {bouton}
            </Bouton>
          </div>
        )}
      </div>
    </Section>
  )
}

/* ── 3. Citation soulignée : la phrase en grand ; sous le mot clé, un trait de plume se dessine. */
export function TexteSouligne({ citation, auteur, id }: { citation: string; auteur: string; id?: string }) {
  const [ref, vu] = useVu<HTMLQuoteElement>('-20%')
  return (
    <Section id={id}>
      <div className={cn(CONTENEUR, 'text-center')}>
        <blockquote ref={ref} className="mx-auto max-w-[24ch] font-[family-name:var(--ad-titre)] text-[clamp(34px,4.6vw,64px)] leading-[1.15] text-[var(--ad-nuit)]">
          {citation.split('*').map((m, i) =>
            i % 2 ? (
              <span key={i} className="relative inline-block whitespace-nowrap">
                <em>{m}</em>
                <svg aria-hidden="true" viewBox="0 0 200 16" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-0 h-[0.28em] w-full text-[var(--ad-or)]">
                  <path d="M3 11 C 50 3, 100 14, 197 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: vu ? 0 : 1, transition: `stroke-dashoffset 1.4s ${DOUX} .6s` }} />
                </svg>
              </span>
            ) : (
              m
            ),
          )}
        </blockquote>
        {auteur && (
          <p className="mt-10 text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--ad-gris)]" style={apparait(vu, 1.2)}>
            {auteur}
          </p>
        )}
      </div>
    </Section>
  )
}

/* ── 4. Citation en carte : vos mots sur une carte sable, votre portrait en médaillon, votre nom. */
export function TexteCitation({ citation, auteur, metier, portrait, id }: { citation: string; auteur: string; metier: string; portrait: Media | null; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <div ref={ref} className="relative mx-auto max-w-[920px] rounded-[36px] bg-[var(--ad-sable)] px-7 py-12 text-center md:px-16 md:py-16" style={apparait(vu, 0)}>
          <span aria-hidden="true" className={cn(ITALIQUE, 'absolute left-8 top-2 text-[140px] leading-none text-[var(--ad-accent-trait)]')}>
            “
          </span>
          <blockquote className={cn(ITALIQUE, 'relative text-[clamp(24px,2.8vw,36px)] leading-[1.4] text-[var(--ad-nuit)]')}>{accentue(citation)}</blockquote>
          <div className="mt-9 flex items-center justify-center gap-4" style={apparait(vu, 0.4)}>
            <Arche media={portrait} forme="rond" chambranle="aucun" sizes="60px" className="h-14 w-14 shrink-0" />
            <div className="text-left">
              <p className="text-[16px] font-semibold text-[var(--ad-nuit)]">{auteur}</p>
              <p className="text-[13.5px] text-[var(--ad-gris)]">{metier}</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 5. Texte et image : un texte de fond, la porte en regard (à gauche ou à droite). */
export function TexteImage({ etiquette, titre, texte, photo, inverse, bouton, rdv, id }: { etiquette: string; titre: string; texte: string; photo: Media | null; inverse: boolean; bouton: string; rdv: string; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20')}>
        <div className={cn(inverse && 'lg:order-2')}>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {paragraphes(texte)
            .slice(0, 3)
            .map((p, i) => (
              <p key={i} className={cn(TEXTE, 'mt-5 max-w-[56ch]')} style={apparait(vu, 0.3 + i * 0.1)}>
                {accentue(p)}
              </p>
            ))}
          {bouton && (
            <div className="mt-8" style={apparait(vu, 0.6)}>
              <Bouton href={rdv} discret>
                {bouton}
              </Bouton>
            </div>
          )}
        </div>
        <Arche media={photo} chambranle={inverse ? 'gauche' : 'droite'} className="mx-auto h-[min(60vh,540px)] w-full max-w-[400px] max-lg:h-[48vh]" />
      </div>
    </Section>
  )
}

/* ── 6. Bandeau : des mots qui passent lentement, sans fin, en italique. */
export function TexteBandeau({ mots, id }: { mots: string[]; id?: string }) {
  const tour = [...mots, ...mots, ...mots, ...mots]
  return (
    <section id={id || undefined} className="group overflow-hidden border-y border-[var(--ad-sable-fonce)] py-8 md:py-10">
      <ul className="flex w-max items-center gap-10 pl-10 motion-safe:animate-[ad-defiler_60s_linear_infinite] group-hover:[animation-play-state:paused]" aria-label={mots.join(', ')}>
        {tour.map((m, i) => (
          <li key={i} aria-hidden={i >= mots.length} className="flex items-center gap-10">
            <span className={cn(ITALIQUE, 'whitespace-nowrap text-[clamp(30px,4vw,56px)] leading-none', i % 2 ? 'text-[var(--ad-accent)]' : 'text-[var(--ad-nuit)]')}>{m}</span>
            <span aria-hidden="true" className="h-5 w-4 shrink-0 border-[1.5px] border-[var(--ad-touche)]" style={{ borderRadius: ARCHE }} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── 7. Deux colonnes : le titre à gauche ; à droite, un texte long posé sur deux colonnes. */
export function TexteDeuxColonnes({ etiquette, titre, texte, id }: { etiquette: string; titre: string; texte: string; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
        </div>
        <div className="gap-10 md:columns-2" style={apparait(vu, 0.3)}>
          {paragraphes(texte).map((p, i) => (
            <p key={i} className={cn(TEXTE, 'mb-5 break-inside-avoid', i === 0 && 'first-letter:float-left first-letter:mr-2 first-letter:font-[family-name:var(--ad-titre)] first-letter:text-[58px] first-letter:leading-[0.9] first-letter:text-[var(--ad-accent)]')}>
              {accentue(p)}
            </p>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ── 8. Les atouts : une liste courte, chaque point coché à son tour. */
export function TexteAtouts({ etiquette, titre, texte, points, photo, id }: { etiquette: string; titre: string; texte: string; points: string[]; photo: Media | null; id?: string }) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={id}>
      <div className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && <p className={cn(TEXTE, 'mt-5 max-w-[46ch]')}>{texte}</p>}
          <ul ref={ref} className="mt-8 flex flex-col gap-3">
            {points.slice(0, 6).map((p, i) => (
              <li key={i} className="flex items-start gap-4 text-[16px] leading-[1.55] text-[var(--ad-nuit)]" style={apparait(vu, 0.2 + i * 0.12)}>
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--ad-touche-pale)] text-[var(--ad-touche-fonce)]">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} style={{ strokeDasharray: 30, strokeDashoffset: vu ? 0 : 30, transition: `stroke-dashoffset .6s ease ${0.5 + i * 0.12}s` }} />
                </span>
                {accentue(p)}
              </li>
            ))}
          </ul>
        </div>
        <Arche media={photo} chambranle="gauche" className="mx-auto h-[min(60vh,540px)] w-full max-w-[420px] max-lg:hidden" />
      </div>
    </Section>
  )
}

/* ── 9. Séparateur : trois petites arches qui se dessinent, entre deux sections. */
export function TexteSeparateur({ mot, id }: { mot: string; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>('-5%')
  return (
    <div id={id || undefined} ref={ref} className="flex items-center justify-center gap-5 py-12 text-[var(--ad-touche)]">
      <span className="h-px w-[min(18vw,160px)] origin-right bg-current" style={{ transform: vu ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1.2s ${DOUX}` }} />
      {mot ? (
        <span className={cn(ITALIQUE, 'text-[18px] text-[var(--ad-gris)]')} style={apparait(vu, 0.3)}>
          {mot}
        </span>
      ) : (
        <span className="flex items-end gap-1.5">
          {[16, 22, 16].map((h, i) => (
            <span key={i} className="w-3 border-[1.5px] border-current" style={{ height: h, borderRadius: ARCHE, ...apparait(vu, 0.2 + i * 0.12) }} />
          ))}
        </span>
      )}
      <span className="h-px w-[min(18vw,160px)] origin-left bg-current" style={{ transform: vu ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1.2s ${DOUX}` }} />
    </div>
  )
}
