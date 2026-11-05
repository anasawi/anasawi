'use client'

import { Clock, Feather, HeartHandshake, Lock, type LucideIcon, Sparkles, Sprout } from 'lucide-react'

import { accentue, apparait, ARCHE, Arche, Bouton, CARTE, CONTENEUR, DOUX, Entete, Etiquette, ITALIQUE, paragraphes, Section, TEXTE, Titre, useVu } from './socle'
import { Compteur } from '../vivant'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/* QUI JE SUIS — huit façons de se présenter. */

type Presentation = { etiquette: string; titre: string; texte: string; signature?: string; id?: string }

function Texte({ texte, vu, delai = 0.3, max = 3 }: { texte: string; vu: boolean; delai?: number; max?: number }) {
  return (
    <div className="mt-6 space-y-4">
      {paragraphes(texte)
        .slice(0, max)
        .map((p, i) => (
          <p key={i} className={cn(TEXTE, 'max-w-[56ch]')} style={apparait(vu, delai + i * 0.1)}>
            {accentue(p)}
          </p>
        ))}
    </div>
  )
}

function Signature({ nom, vu, delai = 0.8 }: { nom?: string; vu: boolean; delai?: number }) {
  if (!nom) return null
  return (
    <p className={cn(ITALIQUE, 'mt-8 flex items-center gap-4 text-[26px] text-[var(--ad-bleu)]')} style={apparait(vu, delai)}>
      {nom}
      <svg aria-hidden="true" viewBox="0 0 120 20" className="h-4 w-24 text-[var(--ad-bleu)]/60">
        <path d="M2 14 C 22 2, 34 20, 54 10 S 92 4, 118 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: vu ? 0 : 1, transition: `stroke-dashoffset 1.6s ${DOUX} ${delai + 0.3}s` }} />
      </svg>
    </p>
  )
}

/* ── 1. Portrait : la porte à gauche, la présentation à droite. */
export function AproposPortrait({ etiquette, titre, texte, signature, id, portrait }: Presentation & { portrait: Media | null }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20')}>
        <Arche media={portrait} chambranle="gauche" className="mx-auto h-[min(62vh,580px)] w-full max-w-[440px] max-lg:h-[52vh]" />
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          <Texte texte={texte} vu={vu} />
          <Signature nom={signature} vu={vu} />
        </div>
      </div>
    </Section>
  )
}

/* ── 2. Asymétrique : le texte large, deux portes décalées en regard. */
export function AproposAsymetrique({ etiquette, titre, texte, signature, id, photos }: Presentation & { photos: (Media | null)[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          <Texte texte={texte} vu={vu} />
          <Signature nom={signature} vu={vu} />
        </div>
        <div className="grid grid-cols-2 items-start gap-4 md:gap-6">
          <Arche media={photos[0]} chambranle="aucun" sizes="300px" className="h-[min(48vh,440px)]" />
          <Arche media={photos[1]} chambranle="droite" delai={0.25} sizes="300px" className="mt-[min(14vh,120px)] h-[min(48vh,440px)]" />
        </div>
      </div>
    </Section>
  )
}

/* ── 3. Médaillon : un portrait rond au centre, et son anneau de mots qui tourne lentement. */
export function AproposMedaillon({ etiquette, titre, texte, signature, id, portrait, anneau }: Presentation & { portrait: Media | null; anneau: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const mots = `${anneau} · `.repeat(3)
  /* Un identifiant stable (le même côté serveur et navigateur), tiré des mots. */
  const idAnneau = `anneau-${[...anneau].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36)}`
  return (
    <Section id={id} serre>
      <div ref={ref} className={cn(CONTENEUR, 'flex flex-col items-center text-center')}>
        <div className="relative h-[190px] w-[190px] md:h-[210px] md:w-[210px]" style={apparait(vu, 0)}>
          <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute inset-0 text-[var(--ad-gris)] motion-safe:animate-[ad-tourner_50s_linear_infinite]">
            <defs>
              <path id={idAnneau} d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
            </defs>
            <text className="fill-current text-[10.5px] font-semibold uppercase tracking-[0.22em]">
              <textPath href={`#${idAnneau}`}>{mots}</textPath>
            </text>
          </svg>
          <Arche media={portrait} forme="rond" chambranle="aucun" sizes="200px" className="absolute inset-[26px]" />
        </div>
        <div className="mt-6 flex flex-col items-center">
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
        </div>
        <p className={cn(TEXTE, 'mx-auto mt-6 max-w-[62ch]')} style={apparait(vu, 0.4)}>
          {accentue(paragraphes(texte)[0] ?? '')}
        </p>
        <Signature nom={signature} vu={vu} />
      </div>
    </Section>
  )
}

/* ── 4. Citation : vos mots en grand ; à côté, la petite porte et quelques lignes. */
export function AproposCitation({ etiquette, citation, texte, signature, metier, id, portrait }: { etiquette: string; citation: string; texte: string; signature: string; metier: string; id?: string; portrait: Media | null }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <span aria-hidden="true" className={cn(ITALIQUE, 'block h-[0.5em] text-[120px] leading-none text-[var(--ad-sable-fonce)]')} style={apparait(vu, 0.1)}>
            “
          </span>
          <blockquote className={cn(ITALIQUE, 'text-[clamp(26px,3vw,42px)] leading-[1.3] text-[var(--ad-nuit)]')} style={apparait(vu, 0.25)}>
            {accentue(citation)}
          </blockquote>
        </div>
        <div className={cn(CARTE, 'p-7')} style={apparait(vu, 0.5)}>
          <div className="flex items-center gap-4">
            <Arche media={portrait} chambranle="aucun" sizes="80px" className="h-[96px] w-[72px] shrink-0" />
            <div>
              <p className="text-[18px] font-semibold text-[var(--ad-nuit)]">{signature}</p>
              <p className="text-[14px] text-[var(--ad-gris)]">{metier}</p>
            </div>
          </div>
          <p className={cn(TEXTE, 'mt-5 text-[15px]')}>{paragraphes(texte)[0]}</p>
        </div>
      </div>
    </Section>
  )
}

/* ── 5. Parcours : les étapes de votre chemin, sur un fil qui se dessine. */
export function AproposParcours({ etiquette, titre, texte, id, etapes, portrait }: Presentation & { etapes: { annee: string; titre: string; texte: string }[]; portrait: Media | null }) {
  const [ref, vu] = useVu<HTMLOListElement>()
  return (
    <Section id={id}>
      <div className={cn(CONTENEUR, 'grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && <p className={cn(TEXTE, 'mt-6 max-w-[42ch]')}>{texte}</p>}
          <Arche media={portrait} chambranle="aucun" sizes="200px" className="mt-10 h-[200px] w-[150px] max-lg:hidden" />
        </div>
        <ol ref={ref} className="relative ml-2 border-l border-transparent pl-10">
          <span aria-hidden="true" className="absolute left-0 top-2 w-px origin-top bg-[var(--ad-sable-fonce)]" style={{ bottom: 8, transform: vu ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 2s ${DOUX} .2s` }} />
          {etapes.slice(0, 5).map((e, i) => (
            <li key={i} className="relative pb-9 last:pb-0" style={apparait(vu, 0.3 + i * 0.18)}>
              <span aria-hidden="true" className="absolute -left-[45px] top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[var(--ad-ivoire)] bg-[var(--ad-bleu)] shadow-[0_0_0_1px_var(--ad-sable-fonce)]" />
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ad-or)]">{e.annee}</p>
              <p className="mt-1 font-[family-name:var(--ad-titre)] text-[24px] leading-[1.2] text-[var(--ad-nuit)]">{e.titre}</p>
              {e.texte && <p className="mt-1.5 max-w-[52ch] text-[15px] leading-[1.65] text-[var(--ad-pierre)]">{e.texte}</p>}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}

/* ── 6. En chiffres : des nombres qui comptent, chacun dans sa petite arche sable. */
export function AproposChiffres({ etiquette, titre, texte, id, chiffres }: Presentation & { chiffres: { valeur: string; libelle: string }[] }) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <ul ref={ref} className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {chiffres.slice(0, 4).map((c, i) => {
            const nombre = Number.parseInt(c.valeur, 10)
            const suite = c.valeur.replace(/^\d+/, '')
            return (
              <li
                key={i}
                className="flex h-[min(34vh,300px)] min-h-[200px] flex-col items-center justify-end bg-[var(--ad-sable)] px-4 pb-8 text-center"
                style={{ borderRadius: ARCHE, ...apparait(vu, i * 0.12) }}
              >
                <span className="font-[family-name:var(--ad-titre)] text-[clamp(48px,5.4vw,76px)] leading-none text-[var(--ad-nuit)]">
                  {Number.isNaN(nombre) ? c.valeur : <><Compteur valeur={nombre} />{suite}</>}
                </span>
                <span className="mt-3 max-w-[18ch] text-[14px] font-semibold leading-[1.35] text-[var(--ad-pierre)]">{c.libelle}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

/* ── 7. Engagements : ce que vous promettez, en quatre cartes. */
const ICONES: LucideIcon[] = [Lock, HeartHandshake, Clock, Feather, Sprout, Sparkles]

export function AproposEngagements({ etiquette, titre, texte, id, engagements }: Presentation & { engagements: { titre: string; texte: string }[] }) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <ul ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {engagements.slice(0, 4).map((e, i) => {
            const Icone = ICONES[i % ICONES.length]!
            return (
              <li key={i} className={cn(CARTE, 'group p-7 transition-transform duration-500 hover:-translate-y-1')} style={apparait(vu, i * 0.1)}>
                <span className="grid h-14 w-11 place-items-center bg-[var(--ad-brume)] text-[var(--ad-bleu)] transition-colors duration-500 group-hover:bg-[var(--ad-nuit)] group-hover:text-white" style={{ borderRadius: ARCHE }}>
                  <Icone className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <p className="mt-6 text-[19px] font-semibold tracking-[-0.02em] text-[var(--ad-nuit)]">{e.titre}</p>
                <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--ad-pierre)]">{e.texte}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

/* ── 8. Mes approches : les noms de vos approches, en grand, séparés de petites arches. */
export function AproposApproches({ etiquette, titre, texte, id, approches, bouton, rdv }: Presentation & { approches: string[]; bouton: string; rdv: string }) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={id}>
      <div className={cn(CONTENEUR, 'text-center')}>
        <div className="flex flex-col items-center">
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && <p className={cn(TEXTE, 'mx-auto mt-5 max-w-[56ch]')}>{texte}</p>}
        </div>
        <ul ref={ref} className="mx-auto mt-12 flex max-w-[1000px] flex-wrap items-center justify-center gap-x-6 gap-y-4">
          {approches.map((a, i) => (
            <li key={i} className="flex items-center gap-6" style={apparait(vu, 0.15 + i * 0.12)}>
              {i > 0 && <span aria-hidden="true" className="h-4 w-3 border-[1.5px] border-[var(--ad-sable-fonce)]" style={{ borderRadius: ARCHE }} />}
              <span className={cn(ITALIQUE, 'text-[clamp(26px,3.2vw,46px)] text-[var(--ad-nuit)] transition-colors duration-500 hover:text-[var(--ad-bleu)]')}>{a}</span>
            </li>
          ))}
        </ul>
        <div className="mt-12" style={apparait(vu, 0.4 + approches.length * 0.12)}>
          <Bouton href={rdv} discret>
            {bouton}
          </Bouton>
        </div>
      </div>
    </Section>
  )
}

