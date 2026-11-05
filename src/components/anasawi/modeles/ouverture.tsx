'use client'

import Image from 'next/image'

import { apparait, ARCHE, Arche, Bouton, CONTENEUR, DOUX, Etiquette, ITALIQUE, useVu } from './socle'
import { Lignes } from '../vivant'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/* L'OUVERTURE — six façons d'accueillir, toutes dans un écran. */

type Base = { etiquette: string; nom: string; phrase: string; bouton: string; bouton2?: string; rdv: string }

/** « Anne Winzenried » : le prénom en noir, le nom en accent. */
function Nom({ nom, className, delai = 0 }: { nom: string; className?: string; delai?: number }) {
  const [prenom, ...reste] = nom.trim().split(/\s+/)
  return (
    <h1 className={className}>
      <Lignes lignes={[prenom ?? '', reste.length ? <em key="n">{reste.join(' ')}</em> : null].filter(Boolean)} delai={delai} />
    </h1>
  )
}

/* ── 1. Plein cadre : la photo occupe l'écran, une carte ivoire s'y pose. */
export function OuverturePleine({ etiquette, nom, phrase, bouton, rdv, photo }: Base & { photo: Media | null }) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  return (
    <section ref={ref} className="p-3 md:p-4">
      <div className="relative h-[calc(var(--ad-vh,1vh)*100-32px)] max-h-[900px] min-h-[560px] overflow-hidden rounded-[32px] bg-[var(--ad-sable)] md:rounded-[40px]">
        {photo && <Image src={photo.url} alt={photo.alt} fill priority sizes="100vw" className="object-cover motion-safe:animate-[ad-kenburns_18s_ease-out_both]" />}
        <div className="absolute inset-x-3 bottom-3 max-w-[600px] rounded-[28px] bg-[var(--ad-ivoire)]/95 p-7 shadow-[0_30px_60px_-30px_rgba(46,66,79,0.5)] backdrop-blur md:inset-x-auto md:bottom-8 md:left-8 md:p-10" style={apparait(vu, 0.4)}>
          <Etiquette>{etiquette}</Etiquette>
          <Nom nom={nom} className="text-[clamp(44px,6vw,84px)] leading-[0.98]" delai={0.6} />
          <p className="mt-5 max-w-[46ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)]">{phrase}</p>
          <div className="mt-7">
            <Bouton href={rdv}>{bouton}</Bouton>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 2. Portrait : le texte à gauche, la grande porte à droite, et trois mots. */
export function OuverturePortrait({ etiquette, nom, phrase, bouton, bouton2, rdv, photo, mots }: Base & { photo: Media | null; mots: string[] }) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  return (
    <section ref={ref} className={cn(CONTENEUR, 'grid min-h-[min(calc(var(--ad-vh,1vh)*100),920px)] items-center gap-12 pb-16 pt-32 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:pt-28')}>
      <div>
        <div style={apparait(vu, 0.1)}>
          <Etiquette>{etiquette}</Etiquette>
        </div>
        <Nom nom={nom} className="text-[clamp(52px,7.4vw,112px)] leading-[0.96]" delai={0.2} />
        <p className="mt-7 max-w-[44ch] text-[17px] leading-[1.75] text-[var(--ad-pierre)]" style={apparait(vu, 0.5)}>
          {phrase}
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4" style={apparait(vu, 0.65)}>
          <Bouton href={rdv}>{bouton}</Bouton>
          {bouton2 && (
            <Bouton href="#a-propos" discret>
              {bouton2}
            </Bouton>
          )}
        </div>
        {mots.length > 0 && (
          <ul className="mt-12 flex flex-wrap gap-2">
            {mots.map((m, i) => (
              <li key={m} className="rounded-full bg-[var(--ad-sable)] px-4 py-2 text-[14px] font-semibold text-[var(--ad-nuit)]" style={apparait(vu, 0.8 + i * 0.1)}>
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Arche media={photo} priorite lente className="mx-auto h-[min(66vh,620px)] w-full max-w-[480px] max-lg:h-[56vh]" />
    </section>
  )
}

/* ── 3. Éditoriale : le nom en très grand, une petite porte glissée entre le prénom et le nom. */
export function OuvertureEditoriale({ etiquette, nom, phrase, bouton, rdv, photo }: Base & { photo: Media | null }) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  const [prenom, ...reste] = nom.trim().split(/\s+/)
  return (
    <section ref={ref} className={cn(CONTENEUR, 'flex min-h-[min(calc(var(--ad-vh,1vh)*100),900px)] flex-col items-center justify-center pb-16 pt-32 text-center')}>
      <div style={apparait(vu, 0.1)}>
        <Etiquette>{etiquette}</Etiquette>
      </div>
      <h1 className="flex flex-wrap items-center justify-center gap-x-[0.25em] text-[clamp(56px,10vw,168px)] leading-[0.95]">
        <span style={apparait(vu, 0.2)}>{prenom}</span>
        <span
          aria-hidden="true"
          className="relative inline-block h-[0.86em] w-[0.6em] overflow-hidden bg-[var(--ad-sable)] align-middle"
          style={{ borderRadius: ARCHE, clipPath: vu ? `inset(0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`, transition: `clip-path 1.6s ${DOUX} .5s` }}
        >
          {photo && <Image src={photo.url} alt="" fill sizes="160px" className="object-cover motion-safe:animate-[ad-kenburns_14s_ease-out_both]" priority />}
        </span>
        <em style={apparait(vu, 0.35)}>{reste.join(' ')}</em>
      </h1>
      <p className={cn(ITALIQUE, 'mt-8 max-w-[38ch] text-[clamp(19px,1.8vw,24px)] leading-[1.5] text-[var(--ad-pierre)]')} style={apparait(vu, 0.7)}>
        {phrase}
      </p>
      <div className="mt-10" style={apparait(vu, 0.85)}>
        <Bouton href={rdv}>{bouton}</Bouton>
      </div>
    </section>
  )
}

/* ── 4. Minimale : une grande arche dessinée d'un trait, le nom posé dedans. */
export function OuvertureMinimale({ etiquette, nom, phrase, bouton, rdv }: Base) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  return (
    <section ref={ref} className={cn(CONTENEUR, 'relative flex min-h-[min(calc(var(--ad-vh,1vh)*100),880px)] flex-col items-center justify-center pb-14 pt-28 text-center')}>
      <svg aria-hidden="true" viewBox="0 0 400 520" preserveAspectRatio="none" className="pointer-events-none absolute left-1/2 top-[calc(50%+24px)] h-[min(78vh,700px)] w-[min(86vw,560px)] -translate-x-1/2 -translate-y-1/2 text-[var(--ad-sable-fonce)]">
        <path
          d="M 2 518 L 2 200 A 198 198 0 0 1 398 200 L 398 518"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: vu ? 0 : 1, transition: 'stroke-dashoffset 3.2s cubic-bezier(0.65,0,0.35,1) .2s' }}
        />
      </svg>
      <div className="relative" style={apparait(vu, 0.4)}>
        <Etiquette>{etiquette}</Etiquette>
      </div>
      <Nom nom={nom} className="relative flex flex-col text-[clamp(48px,7vw,104px)] leading-[0.98]" delai={0.6} />
      <p className="relative mt-7 max-w-[34ch] text-[16.5px] leading-[1.7] text-[var(--ad-pierre)]" style={apparait(vu, 1)}>
        {phrase}
      </p>
      <div className="relative mt-8" style={apparait(vu, 1.15)}>
        <Bouton href={rdv} discret>
          {bouton}
        </Bouton>
      </div>
    </section>
  )
}

/* ── 5. Bandeau : le texte en haut, puis le cabinet en panorama sous une arche large. */
export function OuvertureBandeau({ etiquette, nom, phrase, bouton, rdv, photo }: Base & { photo: Media | null }) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  return (
    <section ref={ref} className={cn(CONTENEUR, 'flex min-h-[min(calc(var(--ad-vh,1vh)*100),940px)] flex-col justify-center pb-10 pt-28')}>
      <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div style={apparait(vu, 0.1)}>
            <Etiquette>{etiquette}</Etiquette>
          </div>
          <Nom nom={nom} className="text-[clamp(48px,6.6vw,100px)] leading-[0.96]" delai={0.2} />
        </div>
        <div style={apparait(vu, 0.5)}>
          <p className="max-w-[40ch] text-[16.5px] leading-[1.7] text-[var(--ad-pierre)]">{phrase}</p>
          <div className="mt-6">
            <Bouton href={rdv}>{bouton}</Bouton>
          </div>
        </div>
      </div>
      <div
        className="relative mt-10 h-[min(44vh,440px)] overflow-hidden bg-[var(--ad-sable)] max-md:h-[36vh]"
        style={{ borderRadius: '999px 999px 28px 28px / 520px 520px 28px 28px', clipPath: vu ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)', transition: `clip-path 1.8s ${DOUX} .3s` }}
      >
        {photo && <Image src={photo.url} alt={photo.alt} fill priority sizes="100vw" className="object-cover motion-safe:animate-[ad-kenburns_18s_ease-out_both]" />}
      </div>
    </section>
  )
}

/* ── 6. Triptyque : trois portes côte à côte, celle du milieu plus haute, qui s'ouvrent l'une après l'autre. */
export function OuvertureTriptyque({ etiquette, nom, phrase, bouton, rdv, photos }: Base & { photos: (Media | null)[] }) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  const [a, b, c] = photos
  return (
    <section ref={ref} className={cn(CONTENEUR, 'flex min-h-[min(calc(var(--ad-vh,1vh)*100),900px)] flex-col items-center justify-center pb-10 pt-24 text-center')}>
      <div style={apparait(vu, 0.1)}>
        <Etiquette>{etiquette}</Etiquette>
      </div>
      <Nom nom={nom} className="text-[clamp(40px,4.6vw,68px)] leading-[0.98]" delai={0.2} />
      <p className="mt-4 max-w-[46ch] text-[16.5px] leading-[1.7] text-[var(--ad-pierre)]" style={apparait(vu, 0.45)}>
        {phrase}
      </p>
      <div className="mt-8 grid w-full max-w-[820px] grid-cols-3 items-end gap-3 md:gap-6">
        <Arche media={a} delai={0.5} chambranle="gauche" sizes="300px" className="h-[min(28vh,280px)]" />
        <Arche media={b} delai={0.7} chambranle="aucun" sizes="300px" priorite className="h-[min(37vh,360px)]" />
        <Arche media={c} delai={0.9} sizes="300px" className="h-[min(28vh,280px)]" />
      </div>
      <div className="mt-8" style={apparait(vu, 1.2)}>
        <Bouton href={rdv}>{bouton}</Bouton>
      </div>
    </section>
  )
}
