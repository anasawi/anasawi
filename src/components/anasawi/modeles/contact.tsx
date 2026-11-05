'use client'

import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'

import { accentue, apparait, Arche, Bouton, CARTE, CONTENEUR, DOUX, Entete, Etiquette, ITALIQUE, Section, TEXTE, Titre, useVu } from './socle'
import { Vapeur } from '../accueil'
import { Carte, SemaineListe } from '../vivant'
import { cn, toE164 } from '@/lib/utils'
import type { Media } from '@/server/db/schema'
import type { OpeningHour } from '@/types/content'

/* CONTACT & RENDEZ-VOUS — sept façons d'inviter à franchir le pas. */

type Coordonnees = { telephone: string | null; email: string | null; adresse: string | null; horaires: OpeningHour[]; rdv: string }
type Base = Coordonnees & { etiquette: string; titre: string; texte: string; bouton: string; id?: string }

const lignesDe = (c: Coordonnees) =>
  [
    c.telephone && { Icone: Phone, libelle: 'Téléphone', texte: c.telephone, href: `tel:${toE164(c.telephone)}` },
    c.email && { Icone: Mail, libelle: 'E-mail', texte: c.email, href: `mailto:${c.email}` },
    c.adresse && { Icone: MapPin, libelle: 'Le cabinet', texte: c.adresse, href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.adresse)}` },
  ].filter(Boolean) as { Icone: typeof Phone; libelle: string; texte: string; href: string }[]

/* ── 1. Minimal : vos coordonnées en grand, comme écrites à la main, et rien d'autre. */
export function ContactMinimal(p: Base) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={p.id}>
      <div className={cn(CONTENEUR, 'flex flex-col items-center text-center')}>
        <Etiquette>{p.etiquette}</Etiquette>
        <Titre texte={p.titre} />
        {p.texte && <p className={cn(TEXTE, 'mx-auto mt-5 max-w-[48ch]')}>{p.texte}</p>}
        <ul ref={ref} className="mt-10 flex flex-col items-center gap-3">
          {lignesDe(p).map((l, i) => (
            <li key={l.libelle} style={apparait(vu, 0.2 + i * 0.12)}>
              <a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={cn(ITALIQUE, 'group relative text-[clamp(22px,3vw,40px)] text-[var(--ad-nuit)] [overflow-wrap:anywhere]')}>
                {l.texte}
                <span aria-hidden="true" className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--ad-accent)] transition-transform duration-500 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-10" style={apparait(vu, 0.6)}>
          <Bouton href={p.rdv}>{p.bouton}</Bouton>
        </div>
      </div>
    </Section>
  )
}

/* ── 2. En cartes : une carte par moyen de vous joindre, et la semaine. */
export function ContactCartes(p: Base) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={p.id}>
      <div className={CONTENEUR}>
        <Entete etiquette={p.etiquette} titre={p.titre} texte={p.texte} />
        <div ref={ref} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {lignesDe(p).map((l, i) => (
            <a key={l.libelle} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={cn(CARTE, 'group isolate flex min-h-[220px] flex-col p-6 transition-transform duration-500 hover:-translate-y-1')} style={apparait(vu, i * 0.1)}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--ad-accent-pale)] text-[var(--ad-accent)] transition-colors duration-500 group-hover:bg-[var(--ad-accent)] group-hover:text-white">
                <l.Icone className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>
              <span className="mt-auto pt-8 text-[13px] font-semibold text-[var(--ad-gris)]">{l.libelle}</span>
              <span className="mt-1 flex items-end justify-between gap-2 text-[15.5px] font-semibold leading-[1.35] text-[var(--ad-nuit)] [overflow-wrap:anywhere]">
                {l.texte}
                <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-500 group-hover:rotate-45" />
              </span>
            </a>
          ))}
          <div className={cn(CARTE, 'isolate flex flex-col gap-3 px-6 py-6')} style={apparait(vu, 0.3)}>
            <p className="text-[13px] font-semibold text-[var(--ad-gris)]">Consultations</p>
            <SemaineListe horaires={p.horaires} />
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 3. Le plan : la carte en grand, l'adresse, la semaine et le rendez-vous à côté. */
export function ContactPlan(p: Base) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={p.id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid gap-6 lg:grid-cols-[1.25fr_0.75fr]')}>
        <div className={cn(CARTE, 'relative h-[min(64vh,580px)] overflow-hidden max-lg:h-[42vh]')} style={apparait(vu, 0)}>
          {p.adresse ? <Carte adresse={p.adresse} className="absolute inset-0" /> : <div className="absolute inset-0 bg-[var(--ad-accent-pale)]" />}
        </div>
        <div className="flex flex-col justify-center lg:pl-6">
          <Etiquette>{p.etiquette}</Etiquette>
          <Titre texte={p.titre} />
          {p.adresse && (
            <p className="mt-6 text-[18px] font-semibold tracking-[-0.01em] text-[var(--ad-nuit)]" style={apparait(vu, 0.3)}>
              {p.adresse}
            </p>
          )}
          <div className="isolate mt-6 max-w-[340px]" style={apparait(vu, 0.4)}>
            <SemaineListe horaires={p.horaires} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4" style={apparait(vu, 0.5)}>
            <Bouton href={p.rdv}>{p.bouton}</Bouton>
            {p.telephone && (
              <a href={`tel:${toE164(p.telephone)}`} className="text-[15px] font-semibold text-[var(--ad-accent)]">
                {p.telephone}
              </a>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 4. L'appel : un panneau sable, un titre, un bouton. */
export function Appel({ etiquette, titre, texte, bouton, rdv, id }: { etiquette: string; titre: string; texte: string; bouton: string; rdv: string; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <div ref={ref} className="flex flex-col items-center rounded-[40px] bg-[var(--ad-sable)] px-6 py-16 text-center md:py-24">
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && (
            <p className={cn(TEXTE, 'mx-auto mt-5 max-w-[50ch]')} style={apparait(vu, 0.3)}>
              {accentue(texte)}
            </p>
          )}
          <div className="mt-9" style={apparait(vu, 0.45)}>
            <Bouton href={rdv}>{bouton}</Bouton>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 5. L'appel en image : la porte d'un côté, l'invitation de l'autre. */
export function AppelImage({ etiquette, titre, texte, bouton, rdv, photo, id }: { etiquette: string; titre: string; texte: string; bouton: string; rdv: string; photo: Media | null; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <div ref={ref} className="grid items-center gap-10 rounded-[40px] bg-[var(--ad-sable)] p-6 md:grid-cols-[0.8fr_1.2fr] md:p-12 lg:gap-16">
          <Arche media={photo} chambranle="aucun" lente className="mx-auto h-[min(52vh,480px)] w-full max-w-[360px] max-md:h-[40vh]" />
          <div>
            <Etiquette>{etiquette}</Etiquette>
            <Titre texte={titre} />
            {texte && (
              <p className={cn(TEXTE, 'mt-5 max-w-[46ch]')} style={apparait(vu, 0.3)}>
                {accentue(texte)}
              </p>
            )}
            <div className="mt-8" style={apparait(vu, 0.45)}>
              <Bouton href={rdv}>{bouton}</Bouton>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 6. L'appel immersif : la photo du cabinet en grand, une carte ivoire posée au milieu. */
export function AppelImmersif({ etiquette, titre, texte, bouton, rdv, photo, id }: { etiquette: string; titre: string; texte: string; bouton: string; rdv: string; photo: Media | null; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <div ref={ref} className="relative grid h-[min(72vh,660px)] min-h-[460px] place-items-center overflow-hidden rounded-[40px] bg-[var(--ad-sable)] p-4" style={{ clipPath: vu ? 'inset(0 round 40px)' : 'inset(6% 6% 6% 6% round 40px)', transition: `clip-path 1.6s ${DOUX}` }}>
          {photo && <Image src={photo.url} alt={photo.alt} fill sizes="100vw" className="object-cover motion-safe:animate-[ad-kenburns_18s_ease-out_both]" />}
          <div className="relative flex max-w-[560px] flex-col items-center rounded-[30px] bg-[var(--ad-ivoire)]/95 px-7 py-10 text-center shadow-[0_30px_60px_-30px_rgba(46,66,79,0.5)] backdrop-blur md:px-12" style={apparait(vu, 0.6)}>
            <Etiquette>{etiquette}</Etiquette>
            <Titre texte={titre} />
            {texte && <p className={cn(TEXTE, 'mt-4 max-w-[42ch]')}>{accentue(texte)}</p>}
            <div className="mt-7">
              <Bouton href={rdv}>{bouton}</Bouton>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 7. L'appel doux : une tasse qui fume, une phrase, un lien. Tout petit, tout calme. */
export function AppelDoux({ texte, bouton, rdv, id }: { texte: string; bouton: string; rdv: string; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <section id={id || undefined} className="py-16 md:py-20">
      <div ref={ref} className={cn(CONTENEUR, 'flex flex-col items-center gap-5 text-center md:flex-row md:justify-center md:gap-8 md:text-left')}>
        <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--ad-accent-pale)] text-[var(--ad-accent)]" style={apparait(vu, 0)}>
          <Vapeur className="absolute -top-7 left-1/2 h-8 w-7 -translate-x-1/2 text-[var(--ad-accent-trait)]" />
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
            <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
          </svg>
        </span>
        <p className={cn(ITALIQUE, 'max-w-[40ch] text-[clamp(20px,2.2vw,28px)] leading-[1.35] text-[var(--ad-nuit)]')} style={apparait(vu, 0.2)}>
          {accentue(texte)}
        </p>
        <div style={apparait(vu, 0.4)}>
          <Bouton href={rdv} discret>
            {bouton}
          </Bouton>
        </div>
      </div>
    </section>
  )
}
