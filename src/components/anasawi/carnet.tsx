'use client'

import { ArrowRight, Plus } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import type { Contenu } from './charger'
import { useVu } from './exception'
import { cn, toE164 } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * LA DIRECTION « CARNET » — la direction artistique d'Anasawi, inspirée
 * de la simplicité de Qeeps (une idée par section, beaucoup d'air, rien
 * de superflu) mais avec sa propre composition : celle d'un beau carnet.
 *
 *  - Des sections NUMÉROTÉES, avec leur ligne d'en-tête et un filet fin
 *    qui se trace (« 01 — Accompagnements ……… Anasawi »).
 *  - Des titres ronds et très gras (Nunito), alignés à gauche, qui
 *    finissent par un point turquoise : la signature.
 *  - Des listes RÉGLÉES (filets fins), des photos comme des tirages
 *    (angles presque droits, légende « fig. »).
 *  - La couleur n'est qu'un point : turquoise d'Anasawi pour l'accent,
 *    les pastels seulement en fond de rares encarts.
 *  - Ivoire chaud, bleu nuit ; animations calmes : le filet se trace, le
 *    texte apparaît, la photo se découvre.
 *  - Chaque section tient sur un écran.
 *
 * Vitrine : /moderne/carnet.
 */

const NUIT = '#2e424f'
const LAGON = '#2b7a77'
const FILET = '#d9cfbf'
const GRIS = '#6b7b84'
const DOUX = 'cubic-bezier(0.22,1,0.36,1)'
const propre = (t: string) => t.replace(/\*/g, '')
const n2 = (i: number) => String(i).padStart(2, '0')

/* ══════════════════════════════════════════════════════════════════════
   LES BRIQUES
   ══════════════════════════════════════════════════════════════════════ */

/** Le filet fin, qui se trace de gauche à droite. */
function Filet({ vu, delai = 0, className }: { vu: boolean; delai?: number; className?: string }) {
  return <span aria-hidden="true" className={cn('block h-px origin-left', className)} style={{ background: FILET, transform: vu ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1.4s ${DOUX} ${delai}s` }} />
}

/** Une apparition simple : fondu et 12 px de montée. */
const monte = (vu: boolean, delai = 0) => ({ opacity: vu ? 1 : 0, transform: vu ? 'none' : 'translateY(12px)', transition: `opacity 1s ${delai}s, transform 1.2s ${DOUX} ${delai}s` })

/** La ligne d'en-tête d'une section : numéro, nom, et la marque. */
function EnTete({ numero, nom, vu }: { numero: number; nom: string; vu: boolean }) {
  return (
    <div className="mb-[clamp(28px,5vh,56px)]">
      <div className="flex items-baseline justify-between pb-3 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: GRIS, ...monte(vu) }}>
        <span>
          <span style={{ color: LAGON }}>{n2(numero)}</span> — {nom}
        </span>
        <span className="max-sm:hidden">Anasawi</span>
      </div>
      <Filet vu={vu} />
    </div>
  )
}

/** Le grand titre : rond, très gras, à gauche, fini par un point turquoise. */
function GrandTitre({ texte, vu, as: Balise = 'h2', className, delai = 0.15 }: { texte: string; vu: boolean; as?: 'h1' | 'h2'; className?: string; delai?: number }) {
  const t = propre(texte).trim()
  const fin = /[.?!…]$/.test(t) ? '' : '.'
  return (
    <Balise className={cn('text-[clamp(34px,5vw,72px)] text-balance', className)} style={{ fontFamily: 'var(--ad-texte)', fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.035em', color: NUIT, ...monte(vu, delai) }}>
      {t}
      <span style={{ color: LAGON }}>{fin}</span>
    </Balise>
  )
}

/** Le texte courant. */
function Texte({ children, vu, delai = 0.35, className }: { children: React.ReactNode; vu: boolean; delai?: number; className?: string }) {
  return (
    <p className={cn('max-w-[48ch] text-[15.5px] leading-[1.7] lg:text-[16.5px]', className)} style={{ color: GRIS, ...monte(vu, delai) }}>
      {children}
    </p>
  )
}

/** Le lien d'action : du texte, une flèche, un trait qui se trace au survol. */
function Lien({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} className={cn('group inline-flex items-center gap-2 text-[15px] font-bold', className)} style={{ color: LAGON }}>
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1.5px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_1.5px]">{children}</span>
      <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
    </a>
  )
}

/** Le bouton plein (un seul par écran). */
function Bouton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="group inline-flex items-center gap-3 rounded-[3px] px-5 py-3.5 text-[14.5px] font-bold text-white transition-colors duration-300 hover:bg-[#24353f]" style={{ background: NUIT }}>
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
    </a>
  )
}

/** Une photo comme un tirage : angles presque droits, elle se découvre de bas en haut. */
function Tirage({ media, vu, delai = 0.2, sizes, className, legende }: { media: Media | null | undefined; vu: boolean; delai?: number; sizes: string; className?: string; legende?: string }) {
  return (
    <figure className={cn('flex flex-col', className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2px] bg-[var(--ad-sable)]" style={{ clipPath: vu ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)', transition: `clip-path 1.4s ${DOUX} ${delai}s` }}>
        {media && <Image src={media.url} alt={media.alt} fill sizes={sizes} className="object-cover" style={{ transform: vu ? 'scale(1)' : 'scale(1.08)', transition: `transform 2s ${DOUX} ${delai}s` }} />}
      </div>
      {legende && (
        <figcaption className="mt-2 text-[12px]" style={{ color: GRIS, ...monte(vu, delai + 0.6) }}>
          {legende}
        </figcaption>
      )}
    </figure>
  )
}

/** Le cadre d'une section : jamais plus d'un écran. */
function Feuille({ id, children, className, refVu }: { id?: string; children: React.ReactNode; className?: string; refVu: React.Ref<HTMLElement> }) {
  return (
    <section ref={refVu} id={id} className={cn('relative mx-auto flex max-h-[100svh] w-full max-w-[1280px] scroll-mt-16 flex-col px-[6vw] py-[clamp(56px,10vh,112px)] lg:px-12', className)}>
      {children}
    </section>
  )
}

const sansSubstitution = (c: Contenu) => c.photos.filter((p) => !/substitution/i.test(p.alt))

/* ══════════════════════════════════════════════════════════════════════
   LA BARRE — la marque, quelques liens, le rendez-vous ; un filet dessous.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetBarre({ c }: { c: Contenu }) {
  const liens = [
    { href: '#qui', label: 'Qui je suis' },
    { href: '#methode', label: 'Méthode' },
    { href: '#accompagnements', label: 'Accompagnements' },
    { href: '#questions', label: 'Questions' },
  ]
  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--ad-ivoire)]/90 backdrop-blur" style={{ borderColor: FILET }}>
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-[6vw] lg:px-12">
        <a href="#couverture" className="text-[20px] font-extrabold tracking-[-0.03em]" style={{ color: NUIT }}>
          Anasawi<span style={{ color: LAGON }}>.</span>
        </a>
        <nav className="hidden gap-7 text-[14px] font-semibold lg:flex" style={{ color: GRIS }}>
          {liens.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-[var(--ad-nuit)]">
              {l.label}
            </a>
          ))}
        </nav>
        <Lien href={c.rdv}>Rendez-vous</Lien>
      </div>
    </header>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   01 — LA COUVERTURE : le nom en très grand, une photo en hauteur, et
   trois repères pratiques en bas, comme la couverture d'un carnet.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetCouverture({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  const auj = c.horaires.filter((h) => !/ferm/i.test(h.hours)).length
  const reperes = [
    { t: 'Où', v: c.ville ? `${c.ville} · en visio` : 'Au cabinet · en visio' },
    { t: 'Quand', v: `${auj} jours par semaine` },
    { t: 'Comment', v: 'Sur rendez-vous' },
  ]
  return (
    <Feuille id="couverture" refVu={ref} className="h-[calc(100svh-64px)] pt-[clamp(28px,6vh,64px)]">
      <EnTete numero={1} nom={c.metier || 'Le cabinet'} vu={vu} />
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
        <div className="flex flex-col justify-between">
          <div>
            <GrandTitre as="h1" texte={c.nom} vu={vu} className="text-[clamp(44px,8vw,128px)] leading-[0.95]" />
            <Texte vu={vu} className="mt-6">
              {c.ouverture.intro || c.accroche}
            </Texte>
            <div className="mt-8 flex flex-wrap items-center gap-6" style={monte(vu, 0.5)}>
              <Bouton href={c.rdv}>Prendre rendez-vous</Bouton>
              <Lien href="#accompagnements">Les accompagnements</Lien>
            </div>
          </div>
          <dl className="mt-8 grid grid-cols-3 gap-4 max-sm:hidden">
            {reperes.map((r, i) => (
              <div key={r.t}>
                <Filet vu={vu} delai={0.4 + i * 0.15} />
                <dt className="mt-3 text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: GRIS, ...monte(vu, 0.6 + i * 0.15) }}>
                  {r.t}
                </dt>
                <dd className="mt-1 text-[15px] font-bold" style={{ color: NUIT, ...monte(vu, 0.7 + i * 0.15) }}>
                  {r.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <Tirage media={c.ambiance} vu={vu} sizes="(max-width: 1024px) 100vw, 460px" className="min-h-[24vh] max-lg:hidden" legende="fig. 1 — Le cabinet" />
      </div>
    </Feuille>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   02 — QUI JE SUIS : le portrait en tirage, le texte en colonne, une
   phrase mise en exergue entre deux filets.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetQui({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>()
  return (
    <Feuille id="qui" refVu={ref}>
      <EnTete numero={2} nom={c.apropos.surtitre || 'Qui je suis'} vu={vu} />
      <div className="grid min-h-0 gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <Tirage media={c.portrait} vu={vu} sizes="(max-width: 1024px) 60vw, 420px" className="h-[min(58vh,560px)] max-lg:h-[30vh] max-lg:w-[60%]" legende={`fig. 2 — ${c.nom}`} />
        <div className="flex flex-col justify-center">
          <GrandTitre texte={c.apropos.titre} vu={vu} className="text-[clamp(28px,3.4vw,50px)] leading-[1.08]" />
          <Texte vu={vu} className="mt-5 line-clamp-5 whitespace-pre-line lg:line-clamp-6">
            {c.apropos.texte}
          </Texte>
          {c.apropos.citation && (
            <div className="mt-7 max-w-[52ch]" style={monte(vu, 0.6)}>
              <Filet vu={vu} delai={0.6} />
              <p className="py-4 text-[18px] font-bold leading-[1.45]" style={{ color: NUIT }}>
                « {propre(c.apropos.citation)} »
              </p>
              <Filet vu={vu} delai={0.8} />
            </div>
          )}
        </div>
      </div>
    </Feuille>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   03 — LA MÉTHODE : les étapes comme les lignes d'un carnet, chacune
   avec son grand numéro ; les filets se tracent l'un après l'autre.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetMethode({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>()
  const etapes = c.methode.etapes
  return (
    <Feuille id="methode" refVu={ref}>
      <EnTete numero={3} nom={c.methode.surtitre || 'Ma méthode'} vu={vu} />
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <GrandTitre texte="Comment ça se passe" vu={vu} />
          {c.methode.intro && (
            <Texte vu={vu} className="mt-5">
              {c.methode.intro}
            </Texte>
          )}
        </div>
        <ol>
          {etapes.map((e, i) => (
            <li key={i}>
              <Filet vu={vu} delai={0.2 + i * 0.2} />
              <div className="grid grid-cols-[64px_1fr] gap-4 py-5 lg:grid-cols-[96px_1fr]" style={monte(vu, 0.35 + i * 0.2)}>
                <span className="text-[clamp(32px,3.6vw,52px)] font-extrabold leading-none tracking-[-0.04em]" style={{ color: i === 0 ? LAGON : FILET }}>
                  {n2(i + 1)}
                </span>
                <div>
                  <h3 className="text-[19px] font-extrabold leading-[1.25] tracking-[-0.01em]" style={{ fontFamily: 'var(--ad-texte)', color: NUIT }}>
                    {e.titre}
                  </h3>
                  {e.texte && (
                    <p className="mt-1.5 max-w-[52ch] text-[15px] leading-[1.65]" style={{ color: GRIS }}>
                      {e.texte}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
          <Filet vu={vu} delai={0.2 + etapes.length * 0.2} />
        </ol>
      </div>
    </Feuille>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   04 — LES ACCOMPAGNEMENTS : un sommaire réglé (titre, durée) ; la ligne
   survolée prend le point turquoise et sa photo s'affiche à côté.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetAccompagnements({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>()
  const [i, setI] = useState(0)
  const photos = sansSubstitution(c).filter((p) => p.id !== c.portrait?.id)
  const services = c.services.map((s, k) => ({ ...s, media: s.media ?? photos[k % Math.max(1, photos.length)] ?? null }))
  const s = services[i]
  return (
    <Feuille id="accompagnements" refVu={ref}>
      <EnTete numero={4} nom="Accompagnements" vu={vu} />
      <div className="grid min-h-0 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
        <div>
          <GrandTitre texte="Un rythme qui vous ressemble" vu={vu} className="text-[clamp(30px,3.8vw,56px)]" />
          <ul className="mt-8">
            {services.map((sv, k) => (
              <li key={sv.id} onMouseEnter={() => setI(k)}>
                <Filet vu={vu} delai={0.2 + k * 0.1} />
                <button type="button" onClick={() => setI(k)} onFocus={() => setI(k)} className="flex w-full items-baseline gap-4 py-3.5 text-left" style={monte(vu, 0.3 + k * 0.1)}>
                  <span className="h-2 w-2 shrink-0 translate-y-[-2px] rounded-full transition-colors duration-300" style={{ background: k === i ? LAGON : 'transparent', boxShadow: `inset 0 0 0 1px ${k === i ? LAGON : FILET}` }} />
                  <span className="flex-1 text-[clamp(17px,1.6vw,21px)] font-bold transition-colors duration-300" style={{ color: k === i ? NUIT : GRIS }}>
                    {sv.title}
                  </span>
                  {sv.duration && (
                    <span className="hidden text-[13px] sm:block" style={{ color: GRIS }}>
                      {sv.duration}
                    </span>
                  )}
                </button>
              </li>
            ))}
            <Filet vu={vu} delai={0.2 + services.length * 0.1} />
          </ul>
        </div>
        {s && (
          <div className="flex flex-col max-lg:hidden" style={monte(vu, 0.5)}>
            <div className="relative h-[min(40vh,380px)] overflow-hidden rounded-[2px] bg-[var(--ad-sable)]">
              {services.map((sv, k) =>
                sv.media ? <Image key={sv.id} src={sv.media.url} alt={k === i ? sv.media.alt : ''} fill sizes="460px" className="object-cover transition-opacity duration-700" style={{ opacity: k === i ? 1 : 0 }} /> : null,
              )}
            </div>
            <p key={s.id} className="mt-4 line-clamp-3 text-[15px] leading-[1.65] motion-safe:animate-[ad-tuile_.6s_ease-out_backwards]" style={{ color: GRIS }}>
              {propre(s.excerpt)}
            </p>
            <Lien href={c.rdv} className="mt-4">
              Prendre rendez-vous
            </Lien>
          </div>
        )}
      </div>
    </Feuille>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   05 — LE CABINET : trois tirages en mise en page de revue, chacun avec
   sa légende numérotée.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetCabinet({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>()
  const photos = sansSubstitution(c).filter((p) => p.id !== c.portrait?.id && p.id !== c.ambiance?.id)
  /* D'autres photos que celles des accompagnements (qui prennent les premières). */
  const reste = photos.length > 6 ? photos.slice(c.services.length) : photos
  const [a, b, d] = [reste[0], reste[1], reste[2]]
  return (
    <Feuille id="cabinet" refVu={ref}>
      <EnTete numero={5} nom="Le cabinet" vu={vu} />
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Tirage media={a} vu={vu} delai={0.1} sizes="(max-width: 1024px) 100vw, 760px" className="h-[min(56vh,540px)] max-lg:h-[30vh]" legende={`fig. 3 — ${a?.caption ?? 'Le lieu'}`} />
        <div className="grid gap-5 max-lg:grid-cols-2">
          <Tirage media={b} vu={vu} delai={0.3} sizes="400px" className="h-[min(26vh,250px)] max-lg:h-[18vh]" legende={`fig. 4 — ${b?.caption ?? 'Un détail'}`} />
          <div className="flex flex-col justify-end max-lg:hidden">
            <GrandTitre texte="Un lieu calme, à l’écart du bruit" vu={vu} delai={0.4} className="text-[clamp(24px,2.4vw,36px)] leading-[1.1]" />
          </div>
          <Tirage media={d} vu={vu} delai={0.5} sizes="400px" className="h-[18vh] lg:hidden" legende={`fig. 5 — ${d?.caption ?? 'Un coin'}`} />
        </div>
      </div>
    </Feuille>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   06 — LES QUESTIONS : réglées et numérotées ; la réponse se déplie
   sous la question, le + devient ×.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetQuestions({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>()
  const [ouvert, setOuvert] = useState<number | null>(0)
  const faq = c.faq.slice(0, 6)
  return (
    <Feuille id="questions" refVu={ref}>
      <EnTete numero={6} nom="Questions" vu={vu} />
      <div className="grid min-h-0 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <GrandTitre texte="Ce qu’on se demande souvent" vu={vu} className="text-[clamp(30px,3.8vw,56px)]" />
        <ul className="min-h-0 overflow-hidden">
          {faq.map((f, k) => {
            const o = ouvert === k
            return (
              <li key={f.id}>
                <Filet vu={vu} delai={0.2 + k * 0.08} />
                <button type="button" onClick={() => setOuvert(o ? null : k)} aria-expanded={o} className="flex w-full items-baseline gap-4 py-3.5 text-left" style={monte(vu, 0.3 + k * 0.08)}>
                  <span className="w-6 shrink-0 text-[13px] font-bold tabular-nums" style={{ color: o ? LAGON : FILET }}>
                    {n2(k + 1)}
                  </span>
                  <span className="flex-1 text-[16.5px] font-bold" style={{ color: NUIT }}>
                    {f.question}
                  </span>
                  <Plus className={cn('h-4 w-4 shrink-0 transition-transform duration-500', o && 'rotate-45')} style={{ color: o ? LAGON : GRIS }} />
                </button>
                <div className={cn('grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', o ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden">
                    <p className="line-clamp-4 pb-4 pl-10 text-[14.5px] leading-[1.65]" style={{ color: GRIS }}>
                      {propre(f.answer)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
          <Filet vu={vu} delai={0.2 + faq.length * 0.08} />
        </ul>
      </div>
    </Feuille>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   07 — LA CITATION : une grande phrase, seule sur la page, avec son
   point turquoise ; dessous, la signature.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetCitation({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>()
  return (
    <Feuille refVu={ref}>
      <EnTete numero={7} nom="Une conviction" vu={vu} />
      <GrandTitre texte={c.citation.texte} vu={vu} className="max-w-[22ch] text-[clamp(30px,4.6vw,68px)] leading-[1.08]" />
      {c.citation.auteur && (
        <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: GRIS, ...monte(vu, 0.6) }}>
          — {c.citation.auteur}
        </p>
      )}
    </Feuille>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   08 — CONTACT : les coordonnées et les horaires en tableaux réglés, et
   l'appel au rendez-vous. Le jour d'aujourd'hui a son point turquoise.
   ══════════════════════════════════════════════════════════════════════ */

export function CarnetContact({ c }: { c: Contenu }) {
  const [ref, vu] = useVu<HTMLElement>()
  /* Le jour d'aujourd'hui, lu dans le navigateur (pas au rendu serveur). */
  const [auj, setAuj] = useState(-1)
  useEffect(() => setAuj((new Date().getDay() + 6) % 7), [])
  const JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
  const infos = [
    c.adresse && { t: 'Adresse', v: c.adresse, href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.adresse)}` },
    c.telephone && { t: 'Téléphone', v: c.telephone, href: `tel:${toE164(c.telephone)}` },
    c.email && { t: 'Courriel', v: c.email, href: `mailto:${c.email}` },
  ].filter((x): x is { t: string; v: string; href: string } => Boolean(x))
  return (
    <Feuille id="contact" refVu={ref}>
      <EnTete numero={8} nom="Contact" vu={vu} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <GrandTitre texte="Prenons le temps d’en parler" vu={vu} className="text-[clamp(30px,3.8vw,56px)]" />
          <div className="mt-8" style={monte(vu, 0.4)}>
            <Bouton href={c.rdv}>Prendre rendez-vous</Bouton>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <dl>
            {infos.map((x, k) => (
              <div key={x.t}>
                <Filet vu={vu} delai={0.2 + k * 0.1} />
                <div className="py-3" style={monte(vu, 0.3 + k * 0.1)}>
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: GRIS }}>
                    {x.t}
                  </dt>
                  <dd className="mt-1 break-words text-[15px] font-bold" style={{ color: NUIT }}>
                    <a href={x.href} className="hover:underline">
                      {x.v}
                    </a>
                  </dd>
                </div>
              </div>
            ))}
          </dl>
          <ul className="max-sm:hidden">
            {c.horaires.map((h, k) => {
              const ici = auj >= 0 && h.day.toLowerCase().startsWith(JOURS[auj]!)
              return (
                <li key={h.day}>
                  <Filet vu={vu} delai={0.2 + k * 0.06} />
                  <div className="flex items-baseline justify-between gap-3 py-2 text-[14px]" style={{ color: ici ? NUIT : GRIS, fontWeight: ici ? 700 : 400, ...monte(vu, 0.3 + k * 0.06) }}>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ici ? LAGON : 'transparent' }} />
                      {h.day}
                    </span>
                    <span className="text-right">{h.hours}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Feuille>
  )
}

/** Le pied de page : un filet, la marque, l'année. */
export function CarnetPied({ c }: { c: Contenu }) {
  return (
    <footer className="mx-auto max-w-[1280px] px-[6vw] pb-10 lg:px-12">
      <span aria-hidden="true" className="block h-px" style={{ background: FILET }} />
      <div className="flex flex-wrap items-baseline justify-between gap-4 pt-5 text-[13px]" style={{ color: GRIS }}>
        <span className="text-[18px] font-extrabold tracking-[-0.03em]" style={{ color: NUIT }}>
          Anasawi<span style={{ color: LAGON }}>.</span>
        </span>
        <span>
          {c.nom} · {c.metier}
        </span>
      </div>
    </footer>
  )
}
