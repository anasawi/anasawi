'use client'

import { ArrowLeft, ArrowRight, ArrowUpRight, Compass, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useRef, useState } from 'react'

import { Edition, useAvancement } from './vivant'
import { cn, toE164 } from '@/lib/utils'
import type { FaqItem, Media, OpeningHour, ServiceWithMedia } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION, suite — de quoi couvrir chaque catégorie de
 * la bibliothèque : ouverture, qui je suis, méthode, accompagnements,
 * questions, photos, textes, contact. Mêmes règles que `exception.tsx`
 * (variables CSS, rien ne bouge en mouvement réduit, éditeur figé).
 */

const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const accent = (texte: string) => texte.split('*').map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
const fond = (url: string, w = 1920) => `url("/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75")`
const propre = (t: string) => t.replace(/\*/g, '')

/** Vrai une fois l'élément entré dans l'écran (toujours vrai dans l'éditeur). */
function useVu<T extends HTMLElement>(marge = '-12%') {
  const ref = useRef<T>(null)
  const edition = useContext(Edition)
  const [vu, setVu] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (edition || reduit()) return setVu(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVu(true)
          io.disconnect()
        }
      },
      { rootMargin: `0px 0px ${marge} 0px` },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [edition, marge])
  return [ref, vu] as const
}

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE — LES LAMES. La photo est découpée en lames verticales qui
   pivotent l'une après l'autre pour la révéler, comme des persiennes
   qu'on ouvre ; sous la souris, les lames voisines frémissent.
   ══════════════════════════════════════════════════════════════════════ */

export function Lames({ photo, children }: { photo: Media | null; children: React.ReactNode }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const N = 9
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--sx', ((e.clientX - r.left) / r.width).toFixed(3))
  }
  return (
    <div
      ref={ref}
      onPointerMove={bouge}
      onPointerLeave={(e) => e.currentTarget.style.setProperty('--sx', '-2')}
      className="relative isolate h-[calc(var(--ad-vh)*92)] min-h-[560px] overflow-hidden bg-[var(--ad-nuit)] [--sx:-2] [perspective:1600px]"
    >
      {photo &&
        Array.from({ length: N }, (_, i) => {
          const centre = (i + 0.5) / N
          return (
            <span
              key={i}
              aria-hidden="true"
              className="absolute inset-y-0 bg-cover bg-no-repeat [backface-visibility:hidden] [transition:transform_0.9s_cubic-bezier(0.22,1,0.36,1)]"
              style={{
                left: `${(i / N) * 100}%`,
                width: `${100 / N + 0.2}%`,
                backgroundImage: fond(photo.url),
                backgroundSize: `${N * 100}% 100%`,
                backgroundPosition: `${(i / (N - 1)) * 100}% 50%`,
                transform: vu
                  ? `rotateY(calc(max(0, 1 - abs(var(--sx) - ${centre.toFixed(3)}) * 6) * 14deg))`
                  : 'rotateY(90deg)',
                transitionDelay: vu ? `${0.15 + i * 0.07}s` : undefined,
              }}
            />
          )
        })}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(46,66,79,0.85),rgba(46,66,79,0.15)_55%,rgba(46,66,79,0.35))]" />
      <div className={cn('absolute inset-0 flex flex-col justify-end px-[5vw] pb-[8vh] text-white transition-[opacity,transform] delay-[900ms] duration-1000', vu ? 'opacity-100' : 'translate-y-6 opacity-0')}>
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE — LE MOT-FENÊTRE. Un très grand mot, rempli par la photo.
   On descend : le mot grandit, grandit, jusqu'à ce qu'on passe À TRAVERS
   une de ses lettres et qu'on se retrouve dans la photo.
   ══════════════════════════════════════════════════════════════════════ */

export function MotFenetre({ mot, phrase, photo }: { mot: string; phrase: string; photo: Media | null }) {
  const ref = useAvancement<HTMLElement>('colle', true)
  const edition = useContext(Edition)
  return (
    <section ref={ref} className={cn('relative [--e:0]', edition ? 'h-[calc(var(--ad-vh)*100)]' : 'h-[calc(var(--ad-vh)*260)]')}>
      <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center justify-center overflow-hidden">
        {photo && (
          <div className="absolute inset-0" style={{ opacity: 'clamp(0, calc((var(--e) - 0.72) * 4), 1)' }}>
            <Image src={photo.url} alt={photo.alt} fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(46,66,79,0.7),rgba(46,66,79,0.25)_60%)]" />
          </div>
        )}
        <p
          aria-label={mot}
          className="relative select-none whitespace-nowrap bg-cover bg-center bg-clip-text font-[family-name:var(--ad-titre)] text-[clamp(90px,22vw,340px)] font-semibold leading-none tracking-[-0.05em] text-transparent [-webkit-background-clip:text]"
          style={{
            backgroundImage: photo ? `linear-gradient(rgba(46,66,79,0.28),rgba(46,66,79,0.28)), ${fond(photo.url)}` : 'linear-gradient(120deg,#46728a,#4fa9a6)',
            transform: 'scale(calc(1 + var(--e) * var(--e) * var(--e) * 46))',
            opacity: 'clamp(0, calc(1 - (var(--e) - 0.82) * 6), 1)',
          }}
        >
          {mot}
        </p>
        <p
          className="absolute inset-x-0 bottom-[12vh] mx-auto max-w-[30ch] px-6 text-center text-[clamp(22px,3vw,40px)] leading-[1.2] font-[family-name:var(--ad-titre)] text-white [text-shadow:0_2px_24px_rgba(46,66,79,0.5)] [&_em]:text-[#bfe5e2]"
          style={{ opacity: 'clamp(0, calc((var(--e) - 0.85) * 7), 1)', transform: 'translateY(calc((1 - var(--e)) * 40px))' }}
        >
          {accent(phrase)}
        </p>
        <p
          className="absolute inset-x-0 bottom-[8vh] text-center text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--ad-gris)]"
          style={{ opacity: 'clamp(0, calc(1 - var(--e) * 6), 1)' }}
        >
          Descendez pour entrer
        </p>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS — LES POLAROÏDS. Des photos tombent sur la table, un peu de
   travers ; on peut les attraper et les déplacer. Celle qu'on prend passe
   au-dessus des autres.
   ══════════════════════════════════════════════════════════════════════ */

const PLACES = [
  { x: 8, y: 14, r: -8 },
  { x: 36, y: 4, r: 5 },
  { x: 62, y: 16, r: -4 },
  { x: 20, y: 46, r: 6 },
  { x: 52, y: 44, r: -6 },
  { x: 74, y: 40, r: 9 },
]

export function Polaroids({ photos }: { photos: Media[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const [deplace, setDeplace] = useState<Record<number, { x: number; y: number }>>({})
  const [haut, setHaut] = useState<number[]>([])
  const prise = useRef<{ i: number; x: number; y: number; ox: number; oy: number } | null>(null)
  const liste = photos.slice(0, PLACES.length)

  const attraper = (i: number, e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const d = deplace[i] ?? { x: 0, y: 0 }
    prise.current = { i, x: e.clientX, y: e.clientY, ox: d.x, oy: d.y }
    setHaut((h) => [...h.filter((k) => k !== i), i])
  }
  const glisser = (e: React.PointerEvent<HTMLElement>) => {
    const p = prise.current
    if (!p) return
    setDeplace((d) => ({ ...d, [p.i]: { x: p.ox + e.clientX - p.x, y: p.oy + e.clientY - p.y } }))
  }
  const lacher = () => {
    prise.current = null
  }

  return (
    <div ref={ref} className="relative mx-auto h-[clamp(520px,62vw,720px)] w-full max-w-[1100px] touch-none select-none">
      {liste.map((p, i) => {
        const place = PLACES[i]!
        const d = deplace[i] ?? { x: 0, y: 0 }
        const z = haut.indexOf(i)
        return (
          <figure
            key={p.id}
            onPointerDown={(e) => attraper(i, e)}
            onPointerMove={glisser}
            onPointerUp={lacher}
            onPointerCancel={lacher}
            className={cn(
              'absolute w-[clamp(150px,22vw,250px)] cursor-grab bg-white p-[3%] pb-[14%] shadow-[0_24px_50px_-24px_rgba(46,66,79,0.55)] active:cursor-grabbing',
              vu ? 'motion-safe:animate-[ad-tombe_1s_cubic-bezier(0.34,1.3,0.64,1)_backwards]' : 'opacity-0',
            )}
            style={{
              left: `${place.x}%`,
              top: `${place.y}%`,
              zIndex: 10 + (z === -1 ? i : 20 + z),
              transform: `translate(${d.x}px, ${d.y}px) rotate(${place.r}deg)`,
              animationDelay: `${0.12 + i * 0.14}s`,
              ['--rot' as string]: `${place.r}deg`,
            }}
          >
            <div className="relative aspect-square overflow-hidden bg-[var(--ad-sable-fonce)]">
              <Image src={p.url} alt={p.alt} fill sizes="250px" className="pointer-events-none object-cover" draggable={false} />
            </div>
            <figcaption className="absolute inset-x-0 bottom-[3%] text-center font-[family-name:var(--ad-titre)] text-[clamp(13px,1.4vw,17px)] italic text-[var(--ad-pierre)]">
              {p.caption ?? ''}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS — L'ODOMÈTRE. Des chiffres clés dont chaque chiffre roule,
   comme un compteur mécanique, quand on arrive dessus.
   ══════════════════════════════════════════════════════════════════════ */

export function Odometre({ chiffres }: { chiffres: { valeur: string; libelle: string }[] }) {
  const [ref, vu] = useVu<HTMLDListElement>()
  return (
    <dl ref={ref} className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {chiffres.map((c, k) => (
        <div key={k} className="border-t border-[var(--ad-sable-fonce)] pt-6">
          <dt className="sr-only">{c.libelle}</dt>
          <dd aria-label={c.valeur} className="flex items-baseline font-[family-name:var(--ad-titre)] text-[clamp(64px,9vw,128px)] leading-none tracking-[-0.04em] text-[var(--ad-nuit)]">
            {[...c.valeur].map((ch, i) =>
              /\d/.test(ch) ? (
                <span key={i} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden">
                  <span
                    className="flex flex-col [transition:transform_1.8s_cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      transform: vu ? `translateY(-${Number(ch) + 10}em)` : 'translateY(0)',
                      transitionDelay: `${k * 0.15 + i * 0.12}s`,
                    }}
                  >
                    {Array.from({ length: 20 }, (_, n) => (
                      <span key={n} className="block h-[1em] leading-none">
                        {n % 10}
                      </span>
                    ))}
                  </span>
                </span>
              ) : (
                <span key={i} aria-hidden="true" className="text-[0.45em] text-[var(--ad-bleu)]">
                  {ch}
                </span>
              ),
            )}
          </dd>
          <p aria-hidden="true" className="mt-4 text-[15px] text-[var(--ad-pierre)]">
            {c.libelle}
          </p>
        </div>
      ))}
    </dl>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MA MÉTHODE — LE VOYAGE. Sur grand écran, la page s'immobilise et le
   chemin se parcourt de côté : un trait ondulant se dessine et chaque
   étape s'allume quand il l'atteint. Sur téléphone, une colonne.
   ══════════════════════════════════════════════════════════════════════ */

export function Voyage({ etapes }: { etapes: { titre: string; texte: string }[] }) {
  const ref = useAvancement<HTMLElement>('colle')
  const edition = useContext(Edition)
  const n = etapes.length
  const largeur = n * 520
  let d = 'M 0 150'
  for (let i = 0; i < n; i++) {
    const x = i * 520
    d += ` C ${x + 130} 40, ${x + 260} 40, ${x + 260} 150 S ${x + 390} 260, ${x + 520} 150`
  }
  return (
    <>
      {/* Téléphone et tablette */}
      <ol className="flex flex-col gap-10 lg:hidden">
        {etapes.map((e, i) => (
          <li key={i} className="border-l-2 border-[var(--ad-or)] pl-6">
            <span className="font-[family-name:var(--ad-titre)] text-[44px] leading-none text-[var(--ad-sable-fonce)]">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-2 text-[26px]">{e.titre}</h3>
            {e.texte && <p className="mt-2 text-[15px] leading-[1.65] text-[var(--ad-pierre)]">{e.texte}</p>}
          </li>
        ))}
      </ol>
      {/* Grand écran */}
      <section
        ref={ref}
        className="relative hidden [--p:0] lg:block"
        style={{ height: edition ? 'calc(var(--ad-vh) * 100)' : `calc(var(--ad-vh) * ${100 + n * 45})` }}
      >
        <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center overflow-hidden">
          <div
            className="relative h-[300px] shrink-0 pl-[8vw]"
            style={{
              width: `calc(${largeur}px + 16vw)`,
              transform: `translateX(calc(var(--p) * (100vw - ${largeur}px - 16vw)))`,
            }}
          >
            <svg aria-hidden="true" viewBox={`0 0 ${largeur} 300`} className="absolute left-[8vw] top-0 h-[300px]" style={{ width: largeur }}>
              <path d={d} fill="none" stroke="var(--ad-sable-fonce)" strokeWidth="2" />
              <path
                d={d}
                fill="none"
                stroke="var(--ad-or)"
                strokeWidth="3"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                style={{ strokeDashoffset: 'calc(1 - var(--p))' }}
              />
            </svg>
            {etapes.map((e, i) => {
              const allume = `clamp(0, calc((var(--p) - ${((i + 0.5) / n - 0.12).toFixed(3)}) * 12), 1)`
              return (
                <article key={i} className="absolute top-0 h-[300px] w-[420px]" style={{ left: `calc(8vw + ${i * 520 + 260 - 210}px)` }}>
                  <span
                    className="absolute left-1/2 top-[150px] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--ad-or)] bg-[var(--ad-ivoire)] font-[family-name:var(--ad-titre)] text-[20px]"
                    style={{ background: `color-mix(in srgb, var(--ad-nuit) calc(${allume} * 100%), var(--ad-ivoire))`, color: `color-mix(in srgb, white calc(${allume} * 100%), var(--ad-nuit))`, transform: `translate(-50%,-50%) scale(calc(0.8 + ${allume} * 0.3))` }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className={cn('absolute left-0 w-full text-center', i % 2 ? 'top-[200px]' : 'bottom-[200px]')}
                    style={{ opacity: `calc(0.25 + ${allume} * 0.75)`, transform: `translateY(calc((1 - ${allume}) * ${i % 2 ? 20 : -20}px))` }}
                  >
                    <h3 className="text-[32px]">{e.titre}</h3>
                    {e.texte && <p className="mx-auto mt-2 max-w-[34ch] text-[15px] leading-[1.6] text-[var(--ad-pierre)]">{e.texte}</p>}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MA MÉTHODE — LES CARTES À RETOURNER. Chaque étape est une carte : le
   numéro et le titre d'un côté ; on la survole (ou on la touche), elle
   se retourne et montre l'explication. À l'arrivée, elles se retournent
   une fois, l'une après l'autre, pour montrer qu'elles le peuvent.
   ══════════════════════════════════════════════════════════════════════ */

export function Retourne({ etapes }: { etapes: { titre: string; texte: string }[] }) {
  const [ref, vu] = useVu<HTMLUListElement>()
  const [ouvertes, setOuvertes] = useState<Record<number, boolean>>({})
  return (
    <ul ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {etapes.map((e, i) => (
        <li key={i} className="group/carte h-[300px] [perspective:1400px]">
          <button
            type="button"
            onClick={() => setOuvertes((o) => ({ ...o, [i]: !o[i] }))}
            aria-pressed={Boolean(ouvertes[i])}
            className={cn(
              'relative h-full w-full text-left [transform-style:preserve-3d] [transition:transform_0.9s_cubic-bezier(0.34,1.3,0.64,1)] group-hover/carte:[transform:rotateY(180deg)]',
              ouvertes[i] && '[transform:rotateY(180deg)]',
              vu && 'motion-safe:animate-[ad-apercu_1.6s_cubic-bezier(0.65,0,0.35,1)_backwards]',
            )}
            style={{ animationDelay: `${0.3 + i * 0.25}s` }}
          >
            <span className="absolute inset-0 flex flex-col justify-between rounded-[28px] bg-white p-8 shadow-[0_1px_2px_rgba(46,66,79,0.05),0_24px_50px_-30px_rgba(46,66,79,0.35)] [backface-visibility:hidden]">
              <span className="font-[family-name:var(--ad-titre)] text-[72px] leading-none text-[var(--ad-sable-fonce)]">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="block font-[family-name:var(--ad-titre)] text-[28px] leading-[1.1] text-[var(--ad-nuit)]">{e.titre}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ad-or)]">
                  Retourner <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </span>
            </span>
            <span className="absolute inset-0 flex flex-col justify-center rounded-[28px] bg-[var(--ad-nuit)] p-8 text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <span className="font-[family-name:var(--ad-titre)] text-[22px] leading-[1.15]">{e.titre}</span>
              <span className="mt-3 text-[15px] leading-[1.65] text-white/80">{e.texte}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS — LE PROJECTEUR. Les noms, en très grand, en creux. On
   en survole un : il se remplit de lumière, et sa photo envahit tout le
   fond de la section, comme au cinéma.
   ══════════════════════════════════════════════════════════════════════ */

export function Projecteur({ services, rdv, bouton }: { services: ServiceWithMedia[]; rdv: string; bouton: string }) {
  const [choisi, setChoisi] = useState(0)
  const s = services[choisi]
  return (
    <div className="relative isolate overflow-hidden rounded-[36px] bg-[var(--ad-nuit)] px-[6vw] py-20 text-white md:py-28">
      {services.map((sv, i) =>
        sv.media ? (
          <div key={sv.id} aria-hidden="true" className={cn('absolute inset-0 -z-10 transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]', i === choisi ? 'scale-100 opacity-100' : 'scale-110 opacity-0')}>
            <Image src={sv.media.url} alt="" fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(46,66,79,0.92),rgba(46,66,79,0.55))]" />
          </div>
        ) : null,
      )}
      <ul className="flex flex-col">
        {services.map((sv, i) => (
          <li key={sv.id}>
            <button
              type="button"
              onMouseEnter={() => setChoisi(i)}
              onFocus={() => setChoisi(i)}
              onClick={() => setChoisi(i)}
              className="group flex w-full items-baseline gap-5 py-1.5 text-left"
            >
              <span className={cn('w-8 shrink-0 text-[13px] tabular-nums transition-colors', i === choisi ? 'text-[#bfe5e2]' : 'text-white/40')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={cn(
                  'font-[family-name:var(--ad-titre)] text-[clamp(32px,5vw,72px)] leading-[1.05] tracking-[-0.03em] transition-[color,-webkit-text-stroke-color,transform] duration-500 [-webkit-text-stroke:1px_rgba(255,255,255,0.5)]',
                  i === choisi ? 'translate-x-3 text-white [-webkit-text-stroke-color:transparent]' : 'text-transparent group-hover:[-webkit-text-stroke-color:#fff]',
                )}
              >
                {sv.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {s && (
        <div key={s.id} className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-white/15 pt-6 motion-safe:animate-[ad-monter_0.7s_cubic-bezier(0.22,1,0.36,1)_backwards]">
          <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/80">{propre(s.excerpt)}</p>
          <a href={rdv} className="group inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[14px] font-semibold text-[var(--ad-nuit)]">
            {bouton}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ad-nuit)] text-white transition-transform duration-500 group-hover:rotate-45">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </a>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS — LE JEU DE CARTES. Une pile : on attrape la carte du
   dessus et on la lance de côté (ou on clique les flèches) ; la suivante
   se redresse et vient au premier plan. Au doigt comme à la souris.
   ══════════════════════════════════════════════════════════════════════ */

export function JeuDeCartes({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const [tete, setTete] = useState(0)
  const [glisse, setGlisse] = useState(0)
  const [part, setPart] = useState<0 | 1 | -1>(0)
  const depart = useRef<number | null>(null)
  const n = services.length
  if (!n) return null

  const lancer = (sens: 1 | -1) => {
    setPart(sens)
    window.setTimeout(() => {
      setTete((t) => (t + 1) % n)
      setPart(0)
      setGlisse(0)
    }, 420)
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative h-[460px] w-[min(380px,84vw)] touch-pan-y select-none">
        {Array.from({ length: Math.min(4, n) }, (_, k) => {
          const i = (tete + k) % n
          const sv = services[i]!
          const dessus = k === 0
          const x = dessus ? (part ? part * 640 : glisse) : 0
          return (
            <article
              key={`${sv.id}-${k}`}
              onPointerDown={dessus ? (e) => ((depart.current = e.clientX), e.currentTarget.setPointerCapture(e.pointerId)) : undefined}
              onPointerMove={dessus ? (e) => depart.current !== null && setGlisse(e.clientX - depart.current) : undefined}
              onPointerUp={
                dessus
                  ? () => {
                      depart.current = null
                      if (Math.abs(glisse) > 90) lancer(glisse > 0 ? 1 : -1)
                      else setGlisse(0)
                    }
                  : undefined
              }
              className={cn('absolute inset-0 flex flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_30px_60px_-30px_rgba(46,66,79,0.5)]', dessus && 'cursor-grab active:cursor-grabbing')}
              style={{
                zIndex: 10 - k,
                transform: `translateX(${x}px) translateY(${k * 14}px) scale(${1 - k * 0.05}) rotate(${dessus ? x / 18 : (k % 2 ? 3 : -3) * k * 0.6}deg)`,
                opacity: k === 3 ? 0 : 1,
                transition: depart.current !== null && dessus ? 'none' : 'transform 0.5s cubic-bezier(0.34,1.3,0.64,1), opacity 0.4s',
              }}
            >
              <div className="relative h-[55%] bg-[var(--ad-sable-fonce)]">
                {sv.media && <Image src={sv.media.url} alt="" fill sizes="380px" className="pointer-events-none object-cover" draggable={false} />}
                {sv.duration && <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-[var(--ad-nuit)]">{sv.duration}</span>}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-[26px]">{sv.title}</h3>
                <p className="mt-2 line-clamp-3 text-[14.5px] leading-[1.6] text-[var(--ad-pierre)]">{propre(sv.excerpt)}</p>
                <a href={rdv} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-[var(--ad-nuit)]" onPointerDown={(e) => e.stopPropagation()}>
                  Prendre rendez-vous <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          )
        })}
      </div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => lancer(-1)} aria-label="Carte précédente" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--ad-sable-fonce)] bg-white transition-transform hover:-translate-x-0.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] tabular-nums text-[var(--ad-gris)]">
          {tete + 1} / {n}
        </span>
        <button type="button" onClick={() => lancer(1)} aria-label="Carte suivante" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--ad-nuit)] text-white transition-transform hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS — LES BULLES. Les questions flottent doucement, chacune à son
   rythme ; on en attrape une, elle grandit et sa réponse s'ouvre.
   ══════════════════════════════════════════════════════════════════════ */

export function Bulles({ faq }: { faq: FaqItem[] }) {
  const [choisie, setChoisie] = useState<number | null>(null)
  const q = choisie !== null ? faq[choisie] : null
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
      <ul className="flex flex-wrap justify-center gap-3 lg:gap-4">
        {faq.map((f, i) => (
          <li key={f.id} style={{ animation: `ad-flotter ${6 + (i % 4) * 1.3}s ease-in-out ${(i * 0.7) % 3}s infinite` }}>
            <button
              type="button"
              onClick={() => setChoisie(i)}
              aria-pressed={choisie === i}
              className={cn(
                'rounded-[999px] px-5 py-3 text-left text-[14.5px] leading-[1.35] shadow-[0_14px_30px_-18px_rgba(46,66,79,0.45)] transition-[transform,background-color,color] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]',
                choisie === i ? 'scale-110 bg-[var(--ad-nuit)] text-white' : 'bg-white text-[var(--ad-nuit)] hover:scale-105',
                choisie !== null && choisie !== i && 'opacity-60',
              )}
              style={{ maxWidth: `${200 + (i % 3) * 50}px` }}
            >
              {f.question}
            </button>
          </li>
        ))}
      </ul>
      <div className="relative min-h-[240px] rounded-[32px] bg-white p-8 shadow-[0_30px_60px_-36px_rgba(46,66,79,0.45)]" aria-live="polite">
        {q ? (
          <div key={q.id} className="motion-safe:animate-[ad-bulle_0.6s_cubic-bezier(0.34,1.3,0.64,1)_backwards]">
            <p className="font-[family-name:var(--ad-titre)] text-[24px] leading-[1.2] text-[var(--ad-nuit)]">{q.question}</p>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.7] text-[var(--ad-pierre)]">{propre(q.answer)}</p>
          </div>
        ) : (
          <p className="grid h-full min-h-[180px] place-items-center text-center font-[family-name:var(--ad-titre)] text-[22px] italic text-[var(--ad-gris)]">
            Attrapez une question.
          </p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS — LA MACHINE À ÉCRIRE. La question se tape lettre à lettre,
   avec son curseur ; puis la réponse apparaît. Elles défilent seules (en
   pause hors de l'écran), ou au clic sur les numéros.
   ══════════════════════════════════════════════════════════════════════ */

export function MachineAEcrire({ faq }: { faq: FaqItem[] }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [i, setI] = useState(0)
  const [lettres, setLettres] = useState(0)
  const q = faq[i]
  const total = q?.question.length ?? 0
  const fini = lettres >= total

  useEffect(() => {
    if (!vu || !q) return
    if (reduit()) return setLettres(total)
    if (!fini) {
      const t = window.setTimeout(() => setLettres((l) => l + 1), 34)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => {
      setI((k) => (k + 1) % faq.length)
      setLettres(0)
    }, 9000)
    return () => window.clearTimeout(t)
  }, [vu, lettres, fini, total, q, faq.length])

  if (!q) return null
  return (
    <div ref={ref} className="mx-auto max-w-[900px]">
      <p className="min-h-[2.3em] font-[family-name:var(--ad-titre)] text-[clamp(30px,4.6vw,60px)] leading-[1.12] tracking-[-0.02em] text-[var(--ad-nuit)]" aria-live="polite">
        {q.question.slice(0, lettres)}
        <span aria-hidden="true" className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] bg-[var(--ad-or)] motion-safe:animate-[ad-clignote_1s_steps(1)_infinite]" />
      </p>
      <p
        key={q.id}
        className={cn('mt-8 max-w-[62ch] whitespace-pre-line text-[17px] leading-[1.75] text-[var(--ad-pierre)] transition-[opacity,filter,transform] duration-700', fini ? 'opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-[6px]')}
      >
        {propre(q.answer)}
      </p>
      <div className="mt-10 flex flex-wrap gap-2">
        {faq.map((f, k) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setI(k)
              setLettres(0)
            }}
            aria-label={f.question}
            className={cn('h-2.5 rounded-full transition-[width,background-color] duration-500', k === i ? 'w-10 bg-[var(--ad-nuit)]' : 'w-2.5 bg-[var(--ad-sable-fonce)] hover:bg-[var(--ad-gris)]')}
          />
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS — L'INDEX. Les questions numérotées à gauche ; la réponse,
   à droite, se dévoile de bas en haut derrière un grand numéro en creux.
   ══════════════════════════════════════════════════════════════════════ */

export function Index({ faq }: { faq: FaqItem[] }) {
  const [i, setI] = useState(0)
  const q = faq[i]
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
      <ol className="flex flex-col">
        {faq.map((f, k) => (
          <li key={f.id}>
            <button
              type="button"
              onMouseEnter={() => setI(k)}
              onFocus={() => setI(k)}
              onClick={() => setI(k)}
              className="group flex w-full items-baseline gap-4 border-b border-[var(--ad-sable-fonce)] py-4 text-left"
            >
              <span className={cn('w-8 shrink-0 font-[family-name:var(--ad-titre)] text-[15px] tabular-nums transition-colors', k === i ? 'text-[var(--ad-or)]' : 'text-[var(--ad-gris)]')}>
                {String(k + 1).padStart(2, '0')}
              </span>
              <span className={cn('text-[17px] leading-[1.35] transition-[color,transform] duration-500', k === i ? 'translate-x-2 text-[var(--ad-nuit)]' : 'text-[var(--ad-pierre)] group-hover:translate-x-1')}>{f.question}</span>
            </button>
            {/* Téléphone : la réponse s'ouvre sous la question. */}
            {k === i && <p className="whitespace-pre-line pb-5 pl-12 text-[15px] leading-[1.7] text-[var(--ad-pierre)] lg:hidden">{propre(f.answer)}</p>}
          </li>
        ))}
      </ol>
      {q && (
        <div className="relative hidden overflow-hidden rounded-[32px] bg-white p-10 shadow-[0_30px_60px_-36px_rgba(46,66,79,0.45)] lg:block">
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-4 font-[family-name:var(--ad-titre)] text-[220px] leading-none text-transparent [-webkit-text-stroke:1.5px_var(--ad-sable-fonce)]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div key={q.id} className="relative motion-safe:animate-[ad-rideau_0.9s_cubic-bezier(0.77,0,0.18,1)_backwards] [--ad-rayon:0px]">
            <p className="font-[family-name:var(--ad-titre)] text-[28px] leading-[1.15] text-[var(--ad-nuit)]">{q.question}</p>
            <p className="mt-5 whitespace-pre-line text-[16px] leading-[1.75] text-[var(--ad-pierre)]">{propre(q.answer)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS — LA PELLICULE. Deux bandes de film, perforées, qui défilent en
   sens contraire, un peu de biais ; survolées, elles ralentissent et la
   photo pointée s'avance.
   ══════════════════════════════════════════════════════════════════════ */

export function Pellicule({ photos }: { photos: Media[] }) {
  const bande = (liste: Media[], sens: 1 | -1, k: number) => (
    <div
      className="group/film relative -mx-[4vw] bg-[#1f2a31] py-6"
      style={{ transform: `rotate(${sens * -2.5}deg)` }}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-1.5 h-3 bg-[radial-gradient(circle,rgba(251,248,242,0.85)_2.5px,transparent_3px)] bg-[length:22px_12px]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-1.5 h-3 bg-[radial-gradient(circle,rgba(251,248,242,0.85)_2.5px,transparent_3px)] bg-[length:22px_12px]" />
      <div className="overflow-hidden">
        <div
          className="flex w-max gap-4 group-hover/film:[animation-play-state:paused]"
          style={{ animation: `${sens > 0 ? 'ad-defiler' : 'ad-defiler-inverse'} ${40 + k * 8}s linear infinite` }}
        >
          {[0, 1].map((tour) =>
            liste.map((p) => (
              <div key={`${tour}-${p.id}`} aria-hidden={tour === 1 || undefined} className="relative h-[clamp(150px,20vw,240px)] w-[clamp(200px,27vw,320px)] shrink-0 overflow-hidden rounded-[6px] transition-transform duration-500 hover:z-10 hover:scale-[1.08]">
                <Image src={p.url} alt={tour === 0 ? p.alt : ''} fill sizes="320px" className="object-cover [filter:sepia(0.15)_saturate(0.9)] transition-[filter] duration-500 hover:[filter:none]" />
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  )
  const moitie = Math.ceil(photos.length / 2)
  return (
    <div className="flex flex-col gap-10 overflow-x-clip py-6">
      {bande(photos.slice(0, moitie).length ? photos.slice(0, moitie) : photos, 1, 0)}
      {bande(photos.slice(moitie).length ? photos.slice(moitie) : photos, -1, 1)}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TEXTES — LE MOT QUI CHANGE. « Un lieu pour [respirer] » : le dernier
   mot change toutes les deux secondes, glisse et se floute, et la phrase
   s'ajuste à sa longueur.
   ══════════════════════════════════════════════════════════════════════ */

export function MotQuiChange({ debut, mots }: { debut: string; mots: string[] }) {
  const [ref, vu] = useVu<HTMLParagraphElement>('0%')
  const [k, setK] = useState(0)
  const mesure = useRef<HTMLSpanElement>(null)
  const [largeur, setLargeur] = useState<number | null>(null)
  useEffect(() => {
    if (!vu || mots.length < 2 || reduit()) return
    const t = window.setInterval(() => setK((x) => (x + 1) % mots.length), 2200)
    return () => window.clearInterval(t)
  }, [vu, mots.length])
  useEffect(() => {
    if (mesure.current) setLargeur(mesure.current.getBoundingClientRect().width)
  }, [k])
  return (
    <p ref={ref} className="text-center font-[family-name:var(--ad-titre)] text-[clamp(44px,8vw,128px)] leading-[1.05] tracking-[-0.03em] text-[var(--ad-nuit)]">
      <span className="block sm:inline">{debut} </span>
      <span
        className="relative inline-block h-[1.15em] overflow-hidden align-bottom transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: largeur ? `${largeur}px` : undefined }}
      >
        {mots.map((m, i) => (
          <span
            key={i}
            aria-hidden={i !== k || undefined}
            className="absolute left-0 top-0 whitespace-nowrap italic text-[var(--ad-bleu)] transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: i === k ? 'translateY(0)' : i === (k - 1 + mots.length) % mots.length ? 'translateY(-100%)' : 'translateY(100%)',
              opacity: i === k ? 1 : 0,
              filter: i === k ? 'blur(0)' : 'blur(8px)',
            }}
          >
            {m}
          </span>
        ))}
        <span ref={mesure} aria-hidden="true" className="invisible whitespace-nowrap italic">
          {mots[k]}
        </span>
      </span>
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT — LA BOUSSOLE. Une boussole dont l'aiguille suit la souris ;
   au repos, elle indique le cabinet et tremble un peu. Autour : l'adresse,
   l'itinéraire, le téléphone.
   ══════════════════════════════════════════════════════════════════════ */

export function Boussole({ adresse, telephone }: { adresse: string | null; telephone: string | null }) {
  const cadran = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState<number | null>(null)
  useEffect(() => {
    if (reduit()) return
    const bouge = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !cadran.current) return
      const r = cadran.current.getBoundingClientRect()
      const a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90
      setAngle((prec) => {
        if (prec === null) return a
        /* Le plus court chemin : pas de tour complet en franchissant ±180°. */
        let d = a - (((prec % 360) + 360) % 360)
        if (d > 180) d -= 360
        if (d < -180) d += 360
        return prec + d
      })
    }
    window.addEventListener('pointermove', bouge, { passive: true })
    return () => window.removeEventListener('pointermove', bouge)
  }, [])
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div ref={cadran} className="relative mx-auto aspect-square w-[min(440px,80vw)]">
        <div className="absolute inset-0 rounded-full bg-white shadow-[0_40px_80px_-40px_rgba(46,66,79,0.55)]" />
        <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute inset-0">
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="100" y1="10" x2="100" y2={i % 9 === 0 ? 22 : 15} stroke={i % 18 === 0 ? 'var(--ad-nuit)' : 'var(--ad-sable-fonce)'} strokeWidth={i % 18 === 0 ? 1.6 : 1} transform={`rotate(${i * 5} 100 100)`} />
          ))}
          {['N', 'E', 'S', 'O'].map((l, i) => {
            const a = (i * Math.PI) / 2
            return (
              <text key={l} x={Math.round(100 + 66 * Math.sin(a))} y={Math.round(100 - 66 * Math.cos(a)) + 3.5} textAnchor="middle" className={cn('text-[10px] font-semibold', l === 'N' ? 'fill-[var(--ad-or)]' : 'fill-[var(--ad-gris)]')}>
                {l}
              </text>
            )
          })}
        </svg>
        <div
          className={cn('absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)]', angle === null && 'motion-safe:animate-[ad-tremble_4s_ease-in-out_infinite]')}
          style={angle !== null ? { transform: `rotate(${angle}deg)` } : undefined}
        >
          <span className="absolute left-1/2 top-[14%] h-[36%] w-4 -translate-x-1/2 bg-[var(--ad-or)] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
          <span className="absolute bottom-[14%] left-1/2 h-[36%] w-4 -translate-x-1/2 bg-[var(--ad-sable-fonce)] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
        </div>
        <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[var(--ad-nuit)] shadow" />
      </div>
      <div>
        <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--ad-gris)]">
          <MapPin className="h-4 w-4 text-[var(--ad-or)]" /> Le cabinet
        </p>
        <p className="mt-3 font-[family-name:var(--ad-titre)] text-[clamp(28px,3.4vw,44px)] leading-[1.15] text-[var(--ad-nuit)]">{adresse}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {adresse && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[var(--ad-nuit)] px-5 py-3 text-[14px] font-semibold text-white">
              <Compass className="h-4 w-4" /> Itinéraire
            </a>
          )}
          {telephone && (
            <a href={`tel:${toE164(telephone)}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--ad-sable-fonce)] bg-white px-5 py-3 text-[14px] font-semibold text-[var(--ad-nuit)]">
              <Phone className="h-4 w-4" /> {telephone}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT — L'HORLOGE. Un cadran de 24 heures : les heures d'ouverture du
   jour en arc turquoise, l'aiguille à l'heure qu'il est, et en clair :
   « Ouvert maintenant » ou « Ouvre à … ».
   ══════════════════════════════════════════════════════════════════════ */

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
/** « 9 h – 17 h », « 14 h 30 - 19 h 30 » → [9, 17] / [14.5, 19.5]. */
function plage(h: string | undefined): [number, number] | null {
  if (!h || /ferm/i.test(h)) return null
  const n = [...h.matchAll(/(\d{1,2})\s*h\s*(\d{2})?/g)].map((m) => Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0))
  if (n.length >= 2) return [n[0]!, n[1]!]
  if (/matin/i.test(h)) return [9, 12.5]
  return null
}

export function Horloge({ horaires }: { horaires: OpeningHour[] }) {
  const [maintenant, setMaintenant] = useState<Date | null>(null)
  useEffect(() => {
    setMaintenant(new Date())
    const t = window.setInterval(() => setMaintenant(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const jourIndex = maintenant ? (maintenant.getDay() + 6) % 7 : 0
  const heureDe = (j: number) => horaires.find((x) => x.day.toLowerCase().startsWith(JOURS[j]!.slice(0, 3)))?.hours
  const auj = plage(heureDe(jourIndex))
  const h = maintenant ? maintenant.getHours() + maintenant.getMinutes() / 60 : 12
  const ouvert = auj ? h >= auj[0] && h < auj[1] : false
  const R = 84
  const arc = (a: number, b: number) => {
    const p = (t: number) => {
      const ang = ((t / 24) * 360 - 90) * (Math.PI / 180)
      return `${100 + R * Math.cos(ang)} ${100 + R * Math.sin(ang)}`
    }
    return `M ${p(a)} A ${R} ${R} 0 ${b - a > 12 ? 1 : 0} 1 ${p(b)}`
  }
  const prochain = (() => {
    for (let k = 0; k < 7; k++) {
      const j = (jourIndex + k) % 7
      const pl = plage(heureDe(j))
      if (pl && (k > 0 || h < pl[0])) return `Ouvre ${k === 0 ? 'aujourd’hui' : k === 1 ? 'demain' : JOURS[j]} à ${String(Math.floor(pl[0])).padStart(1)} h${pl[0] % 1 ? ` ${Math.round((pl[0] % 1) * 60)}` : ''}`
    }
    return 'Sur rendez-vous'
  })()
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className="relative mx-auto aspect-square w-[min(420px,80vw)]">
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={ouvert ? 'Ouvert maintenant' : prochain}>
          <circle cx="100" cy="100" r="96" fill="#fff" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--ad-sable)" strokeWidth="10" />
          {auj && <path d={arc(auj[0], auj[1])} fill="none" stroke="var(--ad-or)" strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="motion-safe:animate-[ad-tracer_1.6s_cubic-bezier(0.22,1,0.36,1)_backwards] [--ad-longueur:1]" />}
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * 2 * Math.PI
            const x = Math.round((100 + 62 * Math.sin(a)) * 10) / 10
            const y = Math.round((100 - 62 * Math.cos(a)) * 10) / 10
            return i % 3 === 0 ? (
              <text key={i} x={x} y={y + 2.5} textAnchor="middle" className={cn('text-[7px]', i % 6 === 0 ? 'fill-[var(--ad-nuit)] font-semibold' : 'fill-[var(--ad-gris)]')}>
                {i}
              </text>
            ) : (
              <circle key={i} cx={x} cy={y} r="0.9" className="fill-[var(--ad-sable-fonce)]" />
            )
          })}
          {maintenant && (
            <g style={{ transform: `rotate(${(h / 24) * 360}deg)`, transformOrigin: '100px 100px', transition: 'transform 1s' }}>
              <line x1="100" y1="100" x2="100" y2="22" stroke="var(--ad-nuit)" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}
          <circle cx="100" cy="100" r="5" fill="var(--ad-nuit)" />
        </svg>
      </div>
      <div>
        <p className="flex items-center gap-3 text-[18px] text-[var(--ad-nuit)]">
          <span className="relative grid h-3 w-3 place-items-center">
            {ouvert && <span className="absolute inset-0 rounded-full bg-[#6e9a6b] motion-safe:animate-[ad-pouls_1.8s_ease-out_infinite]" />}
            <span className={cn('relative h-2.5 w-2.5 rounded-full', ouvert ? 'bg-[#6e9a6b]' : 'bg-[var(--ad-gris)]')} />
          </span>
          {maintenant ? (ouvert ? 'Ouvert maintenant' : prochain) : ' '}
        </p>
        <ul className="mt-8 divide-y divide-[var(--ad-sable-fonce)] border-y border-[var(--ad-sable-fonce)]">
          {JOURS.map((j, i) => (
            <li key={j} className={cn('flex justify-between py-3 text-[15px] capitalize', i === jourIndex && maintenant ? 'font-semibold text-[var(--ad-nuit)]' : 'text-[var(--ad-pierre)]')}>
              <span>{j}</span>
              <span className="normal-case">{heureDe(i) ?? 'Fermé'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT — LE GRAND APPEL. Un bouton rond, immense, qui suit la souris
   dans toute la section comme attiré par elle, cerclé d'un texte qui
   tourne et d'ondes qui partent de lui.
   ══════════════════════════════════════════════════════════════════════ */

export function GrandAppel({ titre, libelle, href }: { titre: string; libelle: string; href: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || reduit()) return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--gx', `${(e.clientX - r.left - r.width / 2) * 0.22}px`)
    e.currentTarget.style.setProperty('--gy', `${(e.clientY - r.top - r.height / 2) * 0.22}px`)
  }
  /* Le cercle exactement rempli : répété autant qu'il faut, puis étiré. */
  const motif = `${libelle} · `
  const texte = motif.repeat(Math.max(1, Math.round(490 / (motif.length * 11 * 0.95))))
  return (
    <div
      ref={zone}
      onPointerMove={bouge}
      onPointerLeave={(e) => (e.currentTarget.style.setProperty('--gx', '0px'), e.currentTarget.style.setProperty('--gy', '0px'))}
      className="relative isolate flex min-h-[calc(var(--ad-vh)*80)] flex-col items-center justify-center overflow-hidden rounded-[40px] bg-[var(--ad-sable)] px-6 py-20 [--gx:0px] [--gy:0px]"
    >
      <p aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 text-center font-[family-name:var(--ad-titre)] text-[clamp(70px,16vw,260px)] leading-none tracking-[-0.04em] text-white">
        {propre(titre)}
      </p>
      <a
        href={href}
        className="group relative grid aspect-square w-[clamp(200px,26vw,320px)] place-items-center rounded-full bg-[var(--ad-nuit)] text-white shadow-[0_40px_80px_-30px_rgba(46,66,79,0.7)] [transition:transform_0.6s_cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: 'translate(var(--gx), var(--gy))' }}
      >
        {[0, 1, 2].map((k) => (
          <span key={k} aria-hidden="true" className="absolute inset-0 rounded-full border border-[var(--ad-or)] motion-safe:animate-[ad-onde-large_3.6s_ease-out_infinite]" style={{ animationDelay: `${k * 1.2}s` }} />
        ))}
        <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute inset-[7%] motion-safe:animate-[ad-tourner_18s_linear_infinite] group-hover:[animation-duration:6s]">
          <defs>
            <path id="ad-appel-cercle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
          </defs>
          <text className="fill-white/80 text-[11px] uppercase">
            <textPath href="#ad-appel-cercle" textLength={488} lengthAdjust="spacing">
              {texte}
            </textPath>
          </text>
        </svg>
        <span className="relative grid h-[34%] w-[34%] place-items-center rounded-full bg-[var(--ad-or)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-45">
          <ArrowUpRight className="h-[40%] w-[40%]" />
        </span>
        <span className="sr-only">{libelle}</span>
      </a>
    </div>
  )
}
