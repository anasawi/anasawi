'use client'

import { ArrowUpRight, Plus } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { apparait, ARCHE, Arche, Bouton, CARTE, CONTENEUR, DOUX, Entete, Etiquette, Fondu, ITALIQUE, paragraphes, Section, TEXTE, Titre, useDiaporama, useVu } from './socle'
import { cn } from '@/lib/utils'
import type { Media, ServiceWithMedia } from '@/server/db/schema'

/* ACCOMPAGNEMENTS — sept façons de présenter ce que vous proposez. */

type Base = { etiquette: string; titre: string; texte: string; bouton: string; rdv: string; services: ServiceWithMedia[]; photos: Media[]; id?: string }
const num = (i: number) => String(i + 1).padStart(2, '0')
/** « 1 h 15 · 90 € » : la durée et le prix, sans la mention après le tiret. */
const duree = (s: ServiceWithMedia) => s.duration?.split(/[—–]/)[0]?.trim() ?? ''
const photoDe = (s: ServiceWithMedia, photos: Media[], i: number) => s.media ?? photos[i % Math.max(photos.length, 1)] ?? null

function Duree({ s, className }: { s: ServiceWithMedia; className?: string }) {
  const d = duree(s)
  if (!d) return null
  return <span className={cn('shrink-0 rounded-full bg-[var(--ad-sable)] px-3 py-1 text-[12.5px] font-semibold tabular-nums text-[var(--ad-pierre)]', className)}>{d}</span>
}

/* ── 1. En liste : une ligne par accompagnement ; au survol, sa petite porte apparaît. */
export function ServicesListe({ etiquette, titre, texte, rdv, services, photos, id }: Base) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={id} serre>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <ul ref={ref} className="border-t border-[var(--ad-sable-fonce)]">
          {services.slice(0, 6).map((s, i) => (
            <li key={s.id} className="border-b border-[var(--ad-sable-fonce)]" style={apparait(vu, i * 0.08)}>
              <a href={rdv} className="group relative isolate flex items-center gap-5 py-4 transition-[padding] duration-500 hover:px-4 md:gap-8 md:py-[18px]">
                <span aria-hidden="true" className="absolute inset-0 -z-10 scale-y-75 rounded-[20px] bg-[var(--ad-touche-pale)] opacity-0 transition-[opacity,transform] duration-500 group-hover:scale-y-100 group-hover:opacity-100" />
                <span className="w-8 shrink-0 text-[13px] font-semibold tabular-nums text-[var(--ad-gris)]">{num(i)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-[family-name:var(--ad-titre)] text-[clamp(22px,2.4vw,32px)] leading-[1.15] text-[var(--ad-nuit)]">{s.title}</span>
                  {s.excerpt && <span className="mt-1 block truncate text-[14.5px] text-[var(--ad-pierre)] max-md:hidden">{s.excerpt}</span>}
                </span>
                <span
                  aria-hidden="true"
                  className="relative hidden h-[60px] w-[46px] shrink-0 overflow-hidden opacity-0 transition-[opacity,transform] duration-500 group-hover:-translate-y-1 group-hover:opacity-100 md:block"
                  style={{ borderRadius: ARCHE }}
                >
                  {photoDe(s, photos, i) && <Image src={photoDe(s, photos, i)!.url} alt="" fill sizes="60px" className="object-cover" />}
                </span>
                <Duree s={s} className="max-sm:hidden" />
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--ad-nuit)] transition-[transform,color] duration-500 group-hover:rotate-45 group-hover:text-[var(--ad-touche-fonce)]" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/* ── 2. En portes : chaque accompagnement derrière sa porte en arche, son nom dessous. */
export function ServicesPortes({ etiquette, titre, texte, rdv, services, photos, id }: Base) {
  const liste = services.slice(0, 5)
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <ul className={cn('grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6', liste.length >= 5 ? 'lg:grid-cols-5' : liste.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {liste.map((s, i) => (
            <li key={s.id}>
              <a href={rdv} className="group block">
                <Arche media={photoDe(s, photos, i)} delai={i * 0.12} chambranle="aucun" sizes="280px" className="h-[min(36vh,330px)] transition-transform max-md:h-[26vh] duration-700 group-hover:-translate-y-1.5" />
                <p className="mt-4 font-[family-name:var(--ad-titre)] text-[22px] leading-[1.2] text-[var(--ad-nuit)]">{s.title}</p>
                <p className="mt-1 text-[13.5px] text-[var(--ad-gris)]">{duree(s)}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/* ── 3. En grille : des cartes blanches, une petite porte, quelques mots et la durée. */
export function ServicesGrille({ etiquette, titre, texte, bouton, rdv, services, photos, id }: Base) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={id} serre>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <ul ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((s, i) => (
            <li key={s.id} className={cn(CARTE, 'group flex flex-col p-5 transition-transform duration-500 hover:-translate-y-1')} style={apparait(vu, i * 0.08)}>
              <div className="flex items-start justify-between gap-4">
                <span className="relative h-[52px] w-[40px] overflow-hidden" style={{ borderRadius: ARCHE }}>
                  {photoDe(s, photos, i) && <Image src={photoDe(s, photos, i)!.url} alt="" fill sizes="50px" className="object-cover" />}
                </span>
                <Duree s={s} />
              </div>
              <p className="mt-4 font-[family-name:var(--ad-titre)] text-[23px] leading-[1.15] text-[var(--ad-nuit)]">{s.title}</p>
              {s.method && <p className="mt-1 text-[13px] font-semibold text-[var(--ad-or)]">{s.method}</p>}
              <p className="mt-2 line-clamp-2 text-[14.5px] leading-[1.6] text-[var(--ad-pierre)]">{s.excerpt}</p>
              <a href={rdv} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-[var(--ad-accent)]">
                {bouton}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/* ── 4. Numérotés : deux colonnes, de grands numéros dessinés au trait. */
export function ServicesNumerotes({ etiquette, titre, texte, rdv, services, id }: Base) {
  const [ref, vu] = useVu<HTMLUListElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <ul ref={ref} className="grid gap-x-16 md:grid-cols-2">
          {services.slice(0, 6).map((s, i) => (
            <li key={s.id} className="border-t border-[var(--ad-sable-fonce)]" style={apparait(vu, i * 0.1)}>
              <a href={rdv} className="group flex gap-6 py-6">
                <span className="font-[family-name:var(--ad-titre)] text-[54px] leading-[0.9] text-transparent transition-colors duration-500 [-webkit-text-stroke:1.2px_var(--ad-accent-trait)] group-hover:text-[var(--ad-touche-pale)] group-hover:[-webkit-text-stroke:1.2px_var(--ad-touche)]">{num(i)}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-[family-name:var(--ad-titre)] text-[24px] leading-[1.2] text-[var(--ad-nuit)]">{s.title}</span>
                    <span className="text-[13px] text-[var(--ad-gris)]">{duree(s)}</span>
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-[14.5px] leading-[1.6] text-[var(--ad-pierre)]">{s.excerpt}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/* ── 5. La fenêtre : les noms à gauche ; à droite, une grande arche dont la photo change en fondu. */
export function ServicesFenetre({ etiquette, titre, bouton, rdv, services, photos, id }: Base) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const liste = services.slice(0, 6)
  const { i, setI, setPause } = useDiaporama(liste.length, vu, 6500)
  const actif = liste[i]
  const images = liste.map((s, k) => photoDe(s, photos, k)).filter((m): m is Media => Boolean(m))
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20')}>
        <div onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          <ul className="mt-9 flex flex-col">
            {liste.map((s, k) => (
              <li key={s.id}>
                <button type="button" onMouseEnter={() => setI(k)} onFocus={() => setI(k)} onClick={() => setI(k)} className="flex w-full items-center gap-4 py-2 text-left">
                  <span aria-hidden="true" className="h-px bg-[var(--ad-touche)] transition-all duration-700" style={{ width: k === i ? 32 : 10, opacity: k === i ? 1 : 0.25, background: 'var(--ad-touche)' }} />
                  <span className="font-[family-name:var(--ad-titre)] text-[clamp(20px,2vw,27px)] transition-colors duration-500" style={{ color: k === i ? 'var(--ad-nuit)' : 'color-mix(in srgb, var(--ad-gris) 70%, transparent)' }}>
                    {s.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto h-[min(66vh,600px)] w-full max-w-[500px] max-lg:h-[54vh]">
          <div className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.45)]" style={{ borderRadius: ARCHE, clipPath: vu ? `inset(0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`, transition: `clip-path 1.6s ${DOUX}` }}>
            <Fondu photos={images} i={i} sizes="500px" />
          </div>
          {actif && (
            <div key={actif.id} className="absolute inset-x-4 bottom-4 rounded-[22px] bg-[var(--ad-ivoire)]/95 p-5 backdrop-blur motion-safe:animate-[ad-legende_.8s_ease-out_backwards]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-[var(--ad-or)]">{actif.method || num(i)}</p>
                <Duree s={actif} />
              </div>
              <p className="mt-2 line-clamp-2 text-[14.5px] leading-[1.55] text-[var(--ad-pierre)]">{actif.excerpt}</p>
              <a href={rdv} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ad-nuit)]">
                {bouton} <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

/* ── 6. En détail : chaque accompagnement s'ouvre comme un tiroir, avec son texte complet. */
export function ServicesDetail({ etiquette, titre, texte, bouton, rdv, services, photos, id }: Base) {
  const [ouvert, setOuvert] = useState(0)
  return (
    <Section id={id}>
      <div className={cn(CONTENEUR, 'grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && <p className={cn(TEXTE, 'mt-6 max-w-[40ch]')}>{texte}</p>}
        </div>
        <ul className="border-t border-[var(--ad-sable-fonce)]">
          {services.slice(0, 6).map((s, i) => {
            const o = i === ouvert
            const corps = paragraphes(s.body.replace(/<[^>]+>/g, '\n')).slice(0, 2)
            return (
              <li key={s.id} className="border-b border-[var(--ad-sable-fonce)]">
                <button type="button" onClick={() => setOuvert(o ? -1 : i)} aria-expanded={o} className="flex w-full items-center gap-4 py-5 text-left">
                  <span className="min-w-0 flex-1 font-[family-name:var(--ad-titre)] text-[clamp(21px,2.2vw,28px)] text-[var(--ad-nuit)]">{s.title}</span>
                  <Duree s={s} className="max-sm:hidden" />
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[background,transform] duration-500', o ? 'rotate-45 bg-[var(--ad-touche)] text-white' : 'bg-[var(--ad-touche-pale)] text-[var(--ad-touche-fonce)]')}>
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                <div className="grid transition-[grid-template-rows] duration-700" style={{ gridTemplateRows: o ? '1fr' : '0fr', transitionTimingFunction: DOUX }}>
                  <div className="overflow-hidden">
                    <div className="flex gap-6 pb-6">
                      <span className="relative hidden h-[110px] w-[82px] shrink-0 overflow-hidden sm:block" style={{ borderRadius: ARCHE }}>
                        {photoDe(s, photos, i) && <Image src={photoDe(s, photos, i)!.url} alt="" fill sizes="90px" className="object-cover" />}
                      </span>
                      <div>
                        {(corps.length ? corps : [s.excerpt]).map((p, k) => (
                          <p key={k} className="mb-2 max-w-[60ch] text-[15px] leading-[1.7] text-[var(--ad-pierre)]">
                            {p}
                          </p>
                        ))}
                        <Bouton href={rdv} discret className="mt-1">
                          {bouton}
                        </Bouton>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

/* ── 7. Tarifs : une carte comme celle d'un salon de thé, les prix au bout de points de conduite. */
export function ServicesTarifs({ etiquette, titre, texte, bouton, rdv, services, id, note }: Base & { note: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id} serre>
      <div className={CONTENEUR}>
        <div ref={ref} className="mx-auto max-w-[760px] rounded-[36px] bg-[var(--ad-sable)] px-6 py-9 text-center md:px-14 md:py-11">
          <div className="flex flex-col items-center">
            <Etiquette>{etiquette}</Etiquette>
            <Titre texte={titre} />
            {texte && <p className={cn(TEXTE, 'mx-auto mt-4 max-w-[48ch]')}>{texte}</p>}
          </div>
          <ul className="mt-7 text-left">
            {services.slice(0, 7).map((s, i) => (
              <li key={s.id} className="py-2" style={apparait(vu, 0.2 + i * 0.08)}>
                <div className="flex items-baseline gap-3">
                  <span className="font-[family-name:var(--ad-titre)] text-[21px] text-[var(--ad-nuit)]">{s.title}</span>
                  <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-4px] border-b-2 border-dotted border-[var(--ad-touche)]/50" />
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--ad-nuit)]">{duree(s) || '—'}</span>
                </div>
                {s.method && <p className={cn(ITALIQUE, 'text-[14px] text-[var(--ad-gris)]')}>{s.method}</p>}
              </li>
            ))}
          </ul>
          {note && <p className="mx-auto mt-6 max-w-[52ch] text-[14px] leading-[1.6] text-[var(--ad-gris)]">{note}</p>}
          <div className="mt-7">
            <Bouton href={rdv}>{bouton}</Bouton>
          </div>
        </div>
      </div>
    </Section>
  )
}
