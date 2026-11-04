'use client'

import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Edition, useAvancement } from './vivant'
import { cn, toE164 } from '@/lib/utils'
import type { FaqItem, Media, OpeningHour, ServiceWithMedia } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION de la version moderne — vitrine : /moderne/exception.
 *
 * Le langage : DES OBJETS QUI BOUGENT. Photos et contenus sont posés sur
 * des cartes (coins arrondis, liseré ivoire, ombre douce), qui s'ouvrent,
 * glissent, s'empilent, se balancent — en continu ou au défilement, sans
 * qu'on ait à cliquer. C'est l'esprit de l'éventail et de la frise.
 *
 * Même règle que `vivant.tsx` : le défilement et la souris n'écrivent
 * que des variables CSS ; tout le reste est du calc(). Rien ne bouge pour
 * qui a demandé moins d'animations, et l'éditeur fige les mises en scène.
 */

const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const accent = (texte: string) => texte.split('*').map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
const propre = (t: string) => t.replace(/\*/g, '')
const n2 = (i: number) => String(i + 1).padStart(2, '0')
const DOUX = 'cubic-bezier(0.22,1,0.36,1)'

/** LA CARTE — l'objet de toute la bibliothèque. */
const CADRE = 'overflow-hidden rounded-[20px] bg-white ring-[6px] ring-[var(--ad-ivoire)] shadow-[0_24px_50px_-28px_rgba(46,66,79,0.45)]'
/** Un flottement continu, chacun à son rythme (durée, décalage). */
const flotte = (i: number) => ({ animation: `ad-flotter ${6 + (i % 4) * 1.4}s ease-in-out ${-(i * 1.7) % 5}s infinite` })

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

/** Une photo dans sa carte. */
function CartePhoto({ p, className, sizes = '320px' }: { p: Media; className?: string; sizes?: string }) {
  return (
    <div className={cn(CADRE, 'relative bg-[var(--ad-sable)]', className)}>
      <Image src={p.url} alt={p.alt} fill sizes={sizes} className="object-cover" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

/** LA PILE — à côté du titre, quelques photos posées en tas, qui flottent
 *  doucement et s'écartent les unes des autres quand on descend. */
const TAS = [
  { x: -30, y: -12, r: -9, dx: -60, dy: -30 },
  { x: 22, y: -22, r: 7, dx: 50, dy: -50 },
  { x: -12, y: 20, r: -3, dx: -30, dy: 60 },
  { x: 28, y: 16, r: 11, dx: 70, dy: 40 },
]
export function Pile({ photos }: { photos: Media[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[560px] [--p:0.5]">
      {photos.slice(0, TAS.length).map((p, i) => {
        const t = TAS[i]!
        return (
          <div
            key={p.id}
            className="absolute left-1/2 top-1/2 w-[46%]"
            style={{
              zIndex: 10 + i,
              transform: `translate(-50%, -50%) translate(calc(${t.x}% + (var(--p) - 0.4) * ${t.dx}px * 2.2), calc(${t.y}% + (var(--p) - 0.4) * ${t.dy}px * 2.2)) rotate(calc(${t.r}deg + (var(--p) - 0.4) * ${t.r}deg))`,
            }}
          >
            <div style={flotte(i)}>
              <CartePhoto p={p} className="aspect-[3/4]" sizes="300px" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** LA ROUE — sous le titre, une grande roue de photos qui tourne
 *  lentement, sans fin ; on n'en voit que le haut, comme un horizon. */
export function Roue({ photos }: { photos: Media[] }) {
  const N = 20
  const liste = photos.length ? Array.from({ length: N }, (_, i) => photos[i % photos.length]!) : []
  return (
    <div className="group/roue relative h-[clamp(300px,34vw,460px)] overflow-hidden [--d:max(1500px,150vw)] [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]">
      <div
        className="absolute left-1/2 top-[150px] h-[var(--d)] w-[var(--d)] -translate-x-1/2 motion-safe:animate-[ad-tourner_220s_linear_infinite] group-hover/roue:[animation-play-state:paused]"
      >
        {liste.map((p, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 w-[clamp(130px,14vw,200px)]"
            style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / N)}deg) translateY(calc(var(--d) / -2))` }}
          >
            <CartePhoto p={p} className="aspect-[3/4] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-4" sizes="200px" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** L'ÉCART — les photos recouvrent le titre, en tas ; en descendant, elles
 *  glissent vers les bords et le titre apparaît au milieu. */
const COINS = [
  { x: -36, y: -26, r: -10 },
  { x: 36, y: -24, r: 8 },
  { x: -38, y: 26, r: 6 },
  { x: 38, y: 28, r: -7 },
  { x: 0, y: 40, r: 3 },
]
export function Ecart({ photos, children }: { photos: Media[]; children: React.ReactNode }) {
  const ref = useAvancement<HTMLElement>('colle', true)
  const edition = useContext(Edition)
  const o = edition ? '1' : 'clamp(0, calc(var(--e) * 1.3), 1)'
  return (
    <section ref={ref} className={cn('relative [--e:0]', edition ? 'h-[calc(var(--ad-vh)*100)]' : 'h-[calc(var(--ad-vh)*200)]')}>
      <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center justify-center overflow-hidden px-[5vw]">
        <div className="relative z-0 text-center" style={{ opacity: `calc(0.1 + ${o} * 0.9)`, transform: `scale(calc(0.94 + ${o} * 0.06))` }}>
          {children}
        </div>
        {photos.slice(0, COINS.length).map((p, i) => {
          const c = COINS[i]!
          return (
            <div
              key={p.id}
              className="absolute left-1/2 top-1/2 z-10 w-[clamp(130px,20vw,260px)]"
              style={{ transform: `translate(-50%, -50%) translate(calc(${o} * ${c.x}vw), calc(${o} * ${c.y}vh)) rotate(calc(${(i % 2 ? 4 : -4) * (i + 1) * 0.6}deg + ${o} * ${c.r}deg)) scale(calc(1.1 - ${o} * 0.25))` }}
            >
              <div style={flotte(i)}>
                <CartePhoto p={p} className="aspect-[3/4]" sizes="260px" />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

/** LE PORTRAIT ACCOMPAGNÉ — le portrait sur sa carte, deux petites photos
 *  glissées derrière, qui dépassent et dérivent à leur propre vitesse. */
export function PortraitAccompagne({ portrait, photos }: { portrait: Media | null; photos: Media[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const [a, b] = photos
  return (
    <div ref={ref} className="relative mx-auto aspect-[4/5] w-[min(440px,78vw)] [--p:0.5]">
      {a && (
        <div className="absolute -left-[22%] top-[6%] w-[46%]" style={{ transform: 'translateY(calc((var(--p) - 0.5) * -120px)) rotate(-8deg)' }}>
          <div style={flotte(1)}>
            <CartePhoto p={a} className="aspect-[3/4]" sizes="220px" />
          </div>
        </div>
      )}
      {b && (
        <div className="absolute -right-[18%] bottom-[4%] z-20 w-[42%]" style={{ transform: 'translateY(calc((var(--p) - 0.5) * 140px)) rotate(7deg)' }}>
          <div style={flotte(2)}>
            <CartePhoto p={b} className="aspect-square" sizes="200px" />
          </div>
        </div>
      )}
      {portrait && (
        <div className="relative z-10 h-full" style={{ transform: 'rotate(calc((var(--p) - 0.5) * -6deg))' }}>
          <CartePhoto p={portrait} className="h-full" sizes="440px" />
        </div>
      )}
    </div>
  )
}

/** LES COLONNES — trois colonnes de photos qui montent et descendent sans
 *  fin, en sens contraire ; survolées, elles s'arrêtent. */
export function Colonnes({ photos }: { photos: Media[] }) {
  const cols = [0, 1, 2].map((c) => {
    const l = photos.filter((_, i) => i % 3 === c)
    return l.length ? l : photos
  })
  return (
    <div className="group/col grid h-[clamp(520px,62vw,760px)] grid-cols-2 gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] sm:grid-cols-3">
      {cols.map((col, c) => (
        <div key={c} className={cn(c === 2 && 'hidden sm:block')}>
          <div
            className="flex flex-col gap-5 px-2 group-hover/col:[animation-play-state:paused]"
            style={{ animation: `${c % 2 ? 'ad-colonne-inverse' : 'ad-colonne'} ${46 + c * 9}s linear infinite` }}
          >
            {[0, 1].map((tour) =>
              col.map((p, k) => (
                <div key={`${tour}-${p.id}-${k}`} aria-hidden={tour === 1 || undefined}>
                  <CartePhoto p={p} className={(c + k) % 2 ? 'aspect-[4/5]' : 'aspect-[4/3]'} sizes="(max-width: 640px) 50vw, 380px" />
                </div>
              )),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** LES CHIFFRES EN CARTES — chaque chiffre sur sa carte ; empilées, elles
 *  s'ouvrent en éventail au défilement, et les chiffres roulent. */
export function ChiffresCartes({ chiffres }: { chiffres: { valeur: string; libelle: string }[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const [vuRef, vu] = useVu<HTMLDivElement>()
  const liste = chiffres.slice(0, 4)
  const milieu = (liste.length - 1) / 2
  return (
    <div ref={vuRef}>
      <div ref={ref} className="relative mx-auto h-[clamp(190px,34vw,380px)] w-full max-w-[1000px] [--p:1] [--pas:78%] sm:[--pas:108%]">
        {liste.map((c, i) => {
          const k = i - milieu
          const ouv = `clamp(0, calc((var(--p) - ${(0.12 + Math.abs(k) * 0.03).toFixed(2)}) * 3), 1)`
          return (
            <div
              key={i}
              className="absolute bottom-0 left-1/2 aspect-[4/5] w-[clamp(118px,22vw,260px)] origin-[50%_120%]"
              style={{ zIndex: 10 + i, transform: `translateX(-50%) translateX(calc(${ouv} * ${k} * var(--pas))) rotate(calc(${ouv} * ${k * 5}deg))` }}
            >
              <div className={cn(CADRE, 'flex h-full flex-col justify-between p-[9%]', i % 2 && 'bg-[var(--ad-sable)]')}>
                <span aria-label={c.valeur} className="flex font-[family-name:var(--ad-titre)] text-[clamp(44px,7vw,96px)] leading-none tracking-[-0.04em] text-[var(--ad-nuit)]">
                  {[...c.valeur].map((ch, j) =>
                    /\d/.test(ch) ? (
                      <span key={j} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden">
                        <span className="flex flex-col" style={{ transform: vu ? `translateY(-${Number(ch) + 10}em)` : 'none', transition: `transform 2s ${DOUX} ${0.3 + i * 0.15 + j * 0.1}s` }}>
                          {Array.from({ length: 20 }, (_, n) => (
                            <span key={n} className="block h-[1em]">
                              {n % 10}
                            </span>
                          ))}
                        </span>
                      </span>
                    ) : (
                      <span key={j} aria-hidden="true" className="self-end text-[0.4em] text-[var(--ad-gris)]">
                        {ch}
                      </span>
                    ),
                  )}
                </span>
                <span className="text-[clamp(12px,1.3vw,15px)] leading-[1.35] text-[var(--ad-pierre)]">{c.libelle}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MA MÉTHODE
   ══════════════════════════════════════════════════════════════════════ */

type Etape = { titre: string; texte: string }

function CarteEtape({ e, i, className }: { e: Etape; i: number; className?: string }) {
  return (
    <div className={cn(CADRE, 'flex h-full flex-col justify-between p-7 sm:p-9', className)}>
      <span className="font-[family-name:var(--ad-titre)] text-[clamp(44px,5vw,68px)] leading-none text-[var(--ad-sable-fonce)]">{n2(i)}</span>
      <div>
        <h3 className="text-[clamp(22px,2.4vw,30px)] leading-[1.15]">{e.titre}</h3>
        {e.texte && <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ad-pierre)]">{e.texte}</p>}
      </div>
    </div>
  )
}

/** LE PAQUET — on descend, et les étapes arrivent une à une du bas de
 *  l'écran pour se poser sur la pile, un peu de travers. */
const PENTES = [-2, 1.6, -1.2, 2.4, -1.8, 1]
export function Paquet({ etapes }: { etapes: Etape[] }) {
  const ref = useAvancement<HTMLElement>('colle')
  const edition = useContext(Edition)
  const n = etapes.length
  const t = `calc(var(--p) * ${Math.max(1, n - 1)} * 1.15)`
  return (
    <section ref={ref} className="relative [--p:0]" style={{ height: edition ? 'calc(var(--ad-vh) * 100)' : `calc(var(--ad-vh) * ${100 + n * 55})` }}>
      <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center justify-center overflow-hidden">
        <div className="relative h-[clamp(320px,44vh,400px)] w-[min(560px,86vw)]">
          {etapes.map((e, i) => {
            const arrivee = i === 0 ? '1' : `clamp(0, calc(${t} - ${i - 1}), 1)`
            const dessus = `clamp(0, calc(${t} - ${i}), ${n})`
            return (
              <div
                key={i}
                className="absolute inset-0"
                style={{
                  zIndex: i,
                  transform: `translateY(calc((1 - ${arrivee}) * 110vh + ${dessus} * -12px)) rotate(calc(${PENTES[i % PENTES.length]}deg + (1 - ${arrivee}) * 14deg)) scale(calc(1 - ${dessus} * 0.035))`,
                }}
              >
                <CarteEtape e={e} i={i} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** LE DÉFILÉ — sur grand écran, la page s'arrête et les cartes-étapes
 *  passent devant nous ; celle du centre se redresse, les autres se
 *  penchent et s'éloignent. En colonne sur téléphone. */
export function Defile({ etapes }: { etapes: Etape[] }) {
  const ref = useAvancement<HTMLElement>('colle')
  const edition = useContext(Edition)
  const n = etapes.length
  const pas = 400
  return (
    <>
      <div className="flex flex-col gap-6 lg:hidden">
        {etapes.map((e, i) => (
          <CarteEtape key={i} e={e} i={i} className="min-h-[240px]" />
        ))}
      </div>
      <section ref={ref} className="relative hidden [--p:0] lg:block" style={{ height: edition ? 'calc(var(--ad-vh) * 100)' : `calc(var(--ad-vh) * ${100 + n * 45})` }}>
        <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center overflow-hidden">
          <div className="relative h-[400px] w-full" style={{ transform: `translateX(calc(50vw - ${pas / 2}px - var(--p) * ${(n - 1) * pas}px))` }}>
            {etapes.map((e, i) => {
              const d = `(var(--p) * ${n - 1} - ${i})`
              const loin = `min(1, max(${d}, -1 * ${d}))`
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full w-[340px] px-0"
                  style={{
                    left: i * pas,
                    transform: `translateY(calc(${loin} * 40px)) rotate(calc(clamp(-1, ${d}, 1) * -7deg)) scale(calc(1 - ${loin} * 0.1))`,
                    opacity: `calc(1 - ${loin} * 0.35)`,
                  }}
                >
                  <CarteEtape e={e} i={i} />
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

/** L'ÉVENTAIL DES ÉTAPES — les étapes, des cartes empilées, s'ouvrent en
 *  éventail depuis le centre au défilement. En pile sur téléphone. */
export function EventailEtapes({ etapes }: { etapes: Etape[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const liste = etapes.slice(0, 5)
  const milieu = (liste.length - 1) / 2
  return (
    <>
      <div className="flex flex-col gap-6 md:hidden">
        {liste.map((e, i) => (
          <CarteEtape key={i} e={e} i={i} className="min-h-[220px]" />
        ))}
      </div>
      <div ref={ref} className="relative mx-auto hidden h-[clamp(380px,40vw,500px)] w-full max-w-[1100px] [--p:1] [--pas:92%] md:block">
        {liste.map((e, i) => {
          const k = i - milieu
          const ouv = `clamp(0, calc((var(--p) - ${(0.15 + Math.abs(k) * 0.03).toFixed(2)}) * 3), 1)`
          return (
            <div
              key={i}
              className="group/carte absolute bottom-0 left-1/2 h-[92%] w-[clamp(210px,24vw,290px)] origin-[50%_130%]"
              style={{ zIndex: 10 + i, transform: `translateX(-50%) translateX(calc(${ouv} * ${k} * var(--pas))) rotate(calc(${ouv} * ${k * 5}deg)) translateY(calc(${ouv} * ${Math.abs(k) * 4}%))` }}
            >
              <div className="h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/carte:-translate-y-5">
                <CarteEtape e={e} i={i} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS
   ══════════════════════════════════════════════════════════════════════ */

function CarteService({ s, rdv, className }: { s: ServiceWithMedia; rdv: string; className?: string }) {
  return (
    <article className={cn(CADRE, 'flex h-full flex-col', className)}>
      <div className="relative aspect-[4/3] shrink-0 bg-[var(--ad-sable)]">
        {s.media && <Image src={s.media.url} alt="" fill sizes="340px" className="object-cover" />}
        {s.duration && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-[var(--ad-nuit)]">{s.duration}</span>}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[23px] leading-[1.15]">{s.title}</h3>
        <p className="mt-2 line-clamp-3 text-[14.5px] leading-[1.6] text-[var(--ad-pierre)]">{propre(s.excerpt)}</p>
        <a href={rdv} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-[var(--ad-nuit)]">
          Prendre rendez-vous <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  )
}

/** LA FRISE DES ACCOMPAGNEMENTS — les cartes défilent lentement, sans
 *  fin ; survolée, la frise s'arrête et la carte pointée se lève. */
export function FriseServices({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  return (
    <div className="group/frise overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div className="flex w-max gap-7 px-4 group-hover/frise:[animation-play-state:paused] motion-safe:animate-[ad-defiler_60s_linear_infinite]">
        {[0, 1].map((tour) =>
          services.map((s, i) => (
            <div key={`${tour}-${s.id}`} aria-hidden={tour === 1 || undefined} className="w-[300px] shrink-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-3" style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
              <CarteService s={s} rdv={rdv} />
            </div>
          )),
        )}
      </div>
    </div>
  )
}

/** LA DONNE — les cartes arrivent en paquet au centre, puis se
 *  distribuent chacune à sa place, comme un jeu qu'on étale. */
export function Donne({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const grille = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const g = grille.current
    if (!g) return
    const placer = () => {
      const r = g.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      g.querySelectorAll<HTMLElement>('[data-carte]').forEach((el) => {
        const avant = el.style.transform
        el.style.transform = 'none'
        const c = el.getBoundingClientRect()
        el.style.transform = avant
        el.style.setProperty('--dx', `${Math.round(cx - (c.left + c.width / 2))}px`)
        el.style.setProperty('--dy', `${Math.round(cy - (c.top + c.height / 2))}px`)
      })
    }
    placer()
    window.addEventListener('resize', placer)
    return () => window.removeEventListener('resize', placer)
  }, [services.length])
  return (
    <div ref={ref} className="[--p:1]">
      <div ref={grille} className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => {
          const d = `clamp(0, calc((var(--p) - ${(0.14 + i * 0.035).toFixed(3)}) * 3.2), 1)`
          return (
            <div
              key={s.id}
              data-carte=""
              className="[--dx:0px] [--dy:0px]"
              style={{ zIndex: 20 - i, transform: `translate(calc((1 - ${d}) * var(--dx)), calc((1 - ${d}) * var(--dy))) rotate(calc((1 - ${d}) * ${(i % 2 ? 1 : -1) * (4 + i * 2)}deg))` }}
            >
              <CarteService s={s} rdv={rdv} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** LE MANÈGE — les cartes forment un cercle en trois dimensions qui
 *  tourne lentement ; survolé, il s'arrête. Au doigt : une rangée. */
export function Manege({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const n = Math.max(3, services.length)
  const largeur = 250
  const rayon = Math.max(420, Math.round(((largeur + 50) * n) / (2 * Math.PI)))
  return (
    <>
    {/* Téléphone : les cartes en rangée, qu'on fait glisser du doigt. */}
    <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-[7vw] pb-8 pt-2 [scrollbar-width:none] sm:hidden">
      {services.map((s, i) => (
        <div key={s.id} className="w-[76vw] shrink-0 snap-center" style={{ transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)` }}>
          <CarteService s={s} rdv={rdv} />
        </div>
      ))}
    </div>
    <div className="group/manege relative mx-auto hidden h-[500px] w-full overflow-x-clip [perspective:1700px] sm:block">
      <div
        className="absolute left-1/2 top-6 h-[440px] [transform-style:preserve-3d] motion-safe:animate-[ad-manege_48s_linear_infinite] group-hover/manege:[animation-play-state:paused]"
        style={{ width: largeur, marginLeft: -largeur / 2 }}
      >
        {services.map((s, i) => (
          <div key={s.id} className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: `rotateY(${(i * 360) / n}deg) translateZ(${rayon}px)` }}>
            <CarteService s={s} rdv={rdv} />
          </div>
        ))}
      </div>
    </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

function CarteQuestion({ f, className, ouverte = true }: { f: FaqItem; className?: string; ouverte?: boolean }) {
  return (
    <div className={cn(CADRE, 'p-7 sm:p-8', className)}>
      <p className="font-[family-name:var(--ad-titre)] text-[clamp(20px,2vw,24px)] leading-[1.25] text-[var(--ad-nuit)]">{f.question}</p>
      {ouverte && <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.7] text-[var(--ad-pierre)]">{propre(f.answer)}</p>}
    </div>
  )
}

/** LES FICHES — un paquet de fiches : toutes les quelques secondes, celle
 *  du dessus glisse de côté et repart derrière. */
export function Fiches({ faq }: { faq: FaqItem[] }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [tete, setTete] = useState(0)
  const [part, setPart] = useState(false)
  const [survol, setSurvol] = useState(false)
  const n = faq.length
  useEffect(() => {
    if (!vu || survol || n < 2 || reduit()) return
    const t = window.setTimeout(() => {
      setPart(true)
      window.setTimeout(() => {
        setTete((x) => (x + 1) % n)
        setPart(false)
      }, 650)
    }, 6500)
    return () => window.clearTimeout(t)
  }, [vu, survol, tete, n])
  if (!n) return null
  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[640px] flex-col items-center" onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}>
      <div className="relative h-[clamp(320px,40vh,380px)] w-full">
        {Array.from({ length: Math.min(4, n) }, (_, k) => {
          const i = (tete + k) % n
          const dessus = k === 0
          return (
            <div
              key={`${faq[i]!.id}-${k}`}
              className="absolute inset-x-0 top-0"
              style={{
                zIndex: 10 - k,
                transform: dessus && part ? 'translateX(115%) rotate(12deg)' : `translateY(${k * 16}px) scale(${1 - k * 0.045}) rotate(${k === 0 ? 0 : (k % 2 ? 2.2 : -2) * k * 0.7}deg)`,
                opacity: dessus && part ? 0 : k === 3 ? 0 : 1,
                transition: `transform 0.8s ${DOUX}, opacity 0.6s`,
              }}
            >
              <CarteQuestion f={faq[i]!} className="min-h-[clamp(260px,32vh,310px)]" ouverte={k === 0} />
            </div>
          )
        })}
      </div>
      <button type="button" onClick={() => setTete((x) => (x + 1) % n)} className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ad-nuit)]">
        Question suivante <ArrowRight className="h-4 w-4" />
        <span className="ml-2 text-[13px] font-normal tabular-nums text-[var(--ad-gris)]">
          {n2(tete)} / {n2(n - 1)}
        </span>
      </button>
    </div>
  )
}

/** LE MUR — deux rangées de questions qui défilent en sens contraire ;
 *  survolée, une carte s'arrête, se lève et montre sa réponse. */
export function Mur({ faq }: { faq: FaqItem[] }) {
  const moitie = Math.ceil(faq.length / 2)
  const rangees = [faq.slice(0, moitie), faq.slice(moitie).length ? faq.slice(moitie) : faq]
  return (
    <div className="flex flex-col gap-6 overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      {rangees.map((r, k) => (
        <div key={k} className="group/rang">
          <div
            className="flex w-max items-start gap-6 px-3 group-hover/rang:[animation-play-state:paused]"
            style={{ animation: `${k ? 'ad-defiler-inverse' : 'ad-defiler'} ${55 + k * 10}s linear infinite` }}
          >
            {[0, 1].map((tour) =>
              r.map((f, i) => (
                <div key={`${tour}-${f.id}`} aria-hidden={tour === 1 || undefined} className="group/q w-[320px] shrink-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2" style={{ transform: `rotate(${(i + k) % 2 ? 1.2 : -1.2}deg)` }}>
                  <div className={cn(CADRE, 'p-6')}>
                    <p className="font-[family-name:var(--ad-titre)] text-[19px] leading-[1.3] text-[var(--ad-nuit)]">{f.question}</p>
                    <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/q:grid-rows-[1fr]">
                      <div className="overflow-hidden">
                        <p className="pt-3 text-[14px] leading-[1.65] text-[var(--ad-pierre)]">{propre(f.answer)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** LA LIASSE — les questions-réponses sur des cartes qui, au défilement,
 *  viennent se poser les unes sur les autres en haut de l'écran. */
export function Liasse({ faq }: { faq: FaqItem[] }) {
  return (
    <ul className="mx-auto max-w-[760px]">
      {faq.map((f, i) => (
        <li key={f.id} className="sticky mb-[12vh] last:mb-0" style={{ top: `calc(104px + ${Math.min(i, 6) * 14}px)` }}>
          <div style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}>
            <div className={cn(CADRE, 'p-7 sm:p-9')}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Question {n2(i)}</p>
              <p className="mt-3 font-[family-name:var(--ad-titre)] text-[clamp(21px,2.2vw,27px)] leading-[1.25] text-[var(--ad-nuit)]">{f.question}</p>
              <p className="mt-4 whitespace-pre-line text-[15.5px] leading-[1.7] text-[var(--ad-pierre)]">{propre(f.answer)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS & VIDÉOS
   ══════════════════════════════════════════════════════════════════════ */

/** LE MOBILE — des photos suspendues à des fils, qui se balancent
 *  doucement, chacune à son rythme. */
const FILS = [70, 150, 40, 120, 90, 160, 60]
export function Mobile({ photos }: { photos: Media[] }) {
  const liste = photos.slice(0, 7)
  return (
    <div className="flex items-start justify-center gap-[clamp(10px,2.4vw,36px)] overflow-x-clip">
      {liste.map((p, i) => (
        <div
          key={p.id}
          className={cn('flex origin-top flex-col items-center', i > 4 && 'hidden lg:flex', i > 2 && 'max-sm:hidden')}
          style={{ animation: `ad-balancier ${5 + (i % 3) * 1.3}s ease-in-out ${-(i * 1.1)}s infinite alternate` }}
        >
          <span aria-hidden="true" className="w-px bg-[var(--ad-gris)]/50" style={{ height: FILS[i % FILS.length] }} />
          <span aria-hidden="true" className="-mb-1.5 h-3 w-3 rounded-full border border-[var(--ad-gris)]/60 bg-[var(--ad-ivoire)]" />
          <CartePhoto p={p} className={cn('w-[clamp(110px,14vw,190px)]', i % 2 ? 'aspect-[3/4]' : 'aspect-square')} sizes="190px" />
          {p.caption && <span className="mt-3 max-w-[16ch] text-center text-[12.5px] text-[var(--ad-gris)]">{p.caption}</span>}
        </div>
      ))}
    </div>
  )
}

/** L'ÉVENTAIL — les photos empilées s'ouvrent en éventail, depuis le
 *  centre, à mesure qu'on descend. */
export function Eventail({ photos }: { photos: Media[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const liste = photos.slice(0, 7)
  const milieu = (liste.length - 1) / 2
  return (
    <div ref={ref} className="relative mx-auto h-[clamp(300px,50vw,540px)] w-full max-w-[1100px] [--p:1] [--pas:40%] sm:[--pas:60%]">
      {liste.map((p, i) => {
        const k = i - milieu
        const ouv = `clamp(0, calc((var(--p) - ${(0.15 + Math.abs(k) * 0.03).toFixed(2)}) * 3), 1)`
        return (
          <figure
            key={p.id}
            className="group/carte absolute bottom-0 left-1/2 aspect-[3/4] w-[clamp(120px,19vw,220px)] origin-[50%_120%]"
            style={{
              zIndex: 10 + i,
              ['--ouv' as string]: ouv,
              transform: `translateX(-50%) translateX(calc(var(--ouv) * ${k} * var(--pas))) rotate(calc(var(--ouv) * ${k * 4}deg)) translateY(calc(var(--ouv) * ${Math.abs(k) * 3}%))`,
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-[var(--ad-sable)] shadow-[0_24px_50px_-30px_rgba(46,66,79,0.45)] ring-[6px] ring-[var(--ad-ivoire)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/carte:-translate-y-5">
              <Image src={p.url} alt={p.alt} fill sizes="220px" className="object-cover" />
            </div>
          </figure>
        )
      })}
    </div>
  )
}

/** LA FRISE — une seule rangée de photos qui défile très lentement, bords
 *  fondus ; survolée, elle s'arrête. */
export function Frise({ photos }: { photos: Media[] }) {
  return (
    <div className="group/frise overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="flex w-max gap-5 group-hover/frise:[animation-play-state:paused] motion-safe:animate-[ad-defiler_70s_linear_infinite]">
        {[0, 1].map((tour) =>
          photos.map((p, i) => (
            <figure key={`${tour}-${p.id}`} aria-hidden={tour === 1 || undefined} className="shrink-0">
              <div className={cn('relative h-[clamp(220px,28vw,340px)] overflow-hidden rounded-[20px] bg-[var(--ad-sable)]', i % 2 ? 'aspect-[4/5]' : 'aspect-[3/2]')}>
                <Image src={p.url} alt={tour === 0 ? p.alt : ''} fill sizes="480px" className="object-cover" />
              </div>
              {p.caption && <figcaption className="mt-2.5 text-[13px] text-[var(--ad-gris)]">{p.caption}</figcaption>}
            </figure>
          )),
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TEXTES
   ══════════════════════════════════════════════════════════════════════ */

/** LA CITATION POSÉE — la phrase sur une grande carte, deux photos glissées
 *  dessous qui dépassent et flottent ; au défilement, tout se décale un peu. */
export function CitationPosee({ phrase, auteur, photos }: { phrase: string; auteur: string; photos: Media[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const [a, b] = photos
  return (
    <div ref={ref} className="relative mx-auto max-w-[760px] px-[6%] py-[8%] [--p:0.5]">
      {a && (
        <div className="absolute left-0 top-0 w-[30%] max-w-[220px]" style={{ transform: 'translateY(calc((var(--p) - 0.5) * -90px)) rotate(-9deg)' }}>
          <div style={flotte(0)}>
            <CartePhoto p={a} className="aspect-[3/4]" sizes="220px" />
          </div>
        </div>
      )}
      {b && (
        <div className="absolute bottom-0 right-0 w-[28%] max-w-[200px]" style={{ transform: 'translateY(calc((var(--p) - 0.5) * 110px)) rotate(8deg)' }}>
          <div style={flotte(3)}>
            <CartePhoto p={b} className="aspect-square" sizes="200px" />
          </div>
        </div>
      )}
      <div className="relative z-10" style={{ transform: 'rotate(calc((var(--p) - 0.5) * -4deg))' }}>
        <blockquote className={cn(CADRE, 'px-8 py-12 text-center sm:px-14 sm:py-16')}>
          <span aria-hidden="true" className="block font-[family-name:var(--ad-titre)] text-[64px] leading-[0.5] text-[var(--ad-sable-fonce)]">
            “
          </span>
          <p className="mt-4 font-[family-name:var(--ad-titre)] text-[clamp(22px,3vw,36px)] leading-[1.25] text-[var(--ad-nuit)]">{accent(phrase)}</p>
          {auteur && <footer className="mt-6 text-[12px] uppercase tracking-[0.2em] text-[var(--ad-gris)]">{auteur}</footer>}
        </blockquote>
      </div>
    </div>
  )
}

/** LES ÉTIQUETTES — des mots sur de petites cartes, en rangées qui
 *  défilent en sens contraire, légèrement penchées. */
export function Etiquettes({ mots }: { mots: string[] }) {
  const rangees = [mots, [...mots].reverse(), mots.slice(Math.ceil(mots.length / 2)).concat(mots.slice(0, Math.ceil(mots.length / 2)))]
  const teintes = ['bg-white text-[var(--ad-nuit)]', 'bg-[var(--ad-sable)] text-[var(--ad-nuit)]', 'bg-[var(--ad-nuit)] text-white']
  return (
    <div className="flex flex-col gap-5 overflow-hidden py-8 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      {rangees.map((r, k) => (
        <div key={k} style={{ transform: `rotate(${k === 1 ? 2 : -1.5}deg)` }}>
          <div className="flex w-max gap-4" style={{ animation: `${k % 2 ? 'ad-defiler-inverse' : 'ad-defiler'} ${40 + k * 12}s linear infinite` }}>
            {[0, 1, 2, 3].map((tour) =>
              r.map((m, i) => (
                <span
                  key={`${tour}-${i}`}
                  aria-hidden={tour > 0 || undefined}
                  className={cn('shrink-0 rounded-full px-7 py-3.5 font-[family-name:var(--ad-titre)] text-[clamp(20px,2.6vw,34px)] ring-[5px] ring-[var(--ad-ivoire)] shadow-[0_18px_36px_-24px_rgba(46,66,79,0.5)]', teintes[(i + k) % 3], (i + tour) % 3 === 1 && 'italic')}
                >
                  {m}
                </span>
              )),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** LE MOT QUI CHANGE — « Un lieu pour [respirer] » : le dernier mot est
 *  posé sur une carte qui bascule pour laisser place au suivant. */
export function MotQuiChange({ debut, mots }: { debut: string; mots: string[] }) {
  const [ref, vu] = useVu<HTMLParagraphElement>('0%')
  const [k, setK] = useState(0)
  const mesure = useRef<HTMLSpanElement>(null)
  const [largeur, setLargeur] = useState<number | null>(null)
  useEffect(() => {
    if (!vu || mots.length < 2 || reduit()) return
    const t = window.setInterval(() => setK((x) => (x + 1) % mots.length), 2600)
    return () => window.clearInterval(t)
  }, [vu, mots.length])
  /* La largeur suit le mot affiché — et se remesure quand la police arrive. */
  useEffect(() => {
    const el = mesure.current
    if (!el) return
    const lire = () => setLargeur(el.getBoundingClientRect().width)
    lire()
    const ro = new ResizeObserver(lire)
    ro.observe(el)
    return () => ro.disconnect()
  }, [k])
  return (
    <p ref={ref} className="text-center font-[family-name:var(--ad-titre)] text-[clamp(40px,7vw,112px)] leading-[1.2] tracking-[-0.03em] text-[var(--ad-nuit)]">
      <span className="block sm:inline">{debut} </span>
      <span
        className={cn(CADRE, 'relative inline-block h-[1.25em] -rotate-2 align-middle transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [perspective:600px]')}
        style={{ width: largeur ? `${largeur}px` : undefined }}
      >
        {mots.map((m, i) => (
          <span
            key={i}
            aria-hidden={i !== k || undefined}
            className="absolute inset-0 grid place-items-center whitespace-nowrap pl-[0.35em] pr-[0.5em] italic text-[var(--ad-bleu)] [backface-visibility:hidden] [transform-origin:50%_100%] transition-[transform,opacity] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: i === k ? 'rotateX(0)' : i === (k - 1 + mots.length) % mots.length ? 'rotateX(80deg) translateY(-20%)' : 'rotateX(-80deg) translateY(20%)',
              opacity: i === k ? 1 : 0,
            }}
          >
            {m}
          </span>
        ))}
        <span ref={mesure} aria-hidden="true" className="invisible absolute left-0 top-0 whitespace-nowrap pl-[0.35em] pr-[0.5em] italic">
          {mots[k]}
        </span>
      </span>
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT & RENDEZ-VOUS
   ══════════════════════════════════════════════════════════════════════ */

/** LA CARTE POSTALE — l'adresse écrite sur une carte postale, posée de
 *  travers ; au défilement, elle se redresse ; elle flotte à peine. */
export function CartePostale({ photo, adresse, telephone, email, nom }: { photo: Media | null; adresse: string | null; telephone: string | null; email: string | null; nom: string }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const lignes = [adresse, telephone, email].filter((x): x is string => Boolean(x))
  return (
    <div ref={ref} className="mx-auto max-w-[920px] [--p:0.5]" style={{ transform: 'rotate(calc(clamp(0, calc(0.55 - var(--p)), 0.4) * -10deg)) translateY(calc(clamp(0, calc(0.55 - var(--p)), 0.4) * 120px))' }}>
      <div style={flotte(2)}>
        <div className={cn(CADRE, 'grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]')}>
          <div className="relative aspect-[4/3] bg-[var(--ad-sable)] md:aspect-auto">{photo && <Image src={photo.url} alt={photo.alt} fill sizes="460px" className="object-cover" />}</div>
          <div className="relative p-7 sm:p-10">
            <div aria-hidden="true" className="absolute right-6 top-6 grid h-16 w-14 place-items-center rounded-[6px] border-2 border-dashed border-[var(--ad-sable-fonce)] font-[family-name:var(--ad-titre)] text-[22px] italic text-[var(--ad-bleu)]">
              {nom.slice(0, 1)}
            </div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Le cabinet</p>
            <p className="mt-2 max-w-[14ch] font-[family-name:var(--ad-titre)] text-[clamp(24px,2.6vw,32px)] leading-[1.15] text-[var(--ad-nuit)]">{nom}</p>
            <ul className="mt-8">
              {lignes.map((l) => (
                <li key={l} className="border-b border-dashed border-[var(--ad-sable-fonce)] py-2.5 font-[family-name:var(--ad-titre)] text-[17px] italic text-[var(--ad-pierre)]">
                  {l === telephone ? <a href={`tel:${toE164(l)}`}>{l}</a> : l === email ? <a href={`mailto:${l}`}>{l}</a> : l}
                </li>
              ))}
            </ul>
            {adresse && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--ad-nuit)] px-5 py-3 text-[14px] font-semibold text-white transition-transform duration-500 hover:-translate-y-0.5">
                <MapPin className="h-4 w-4" /> Itinéraire
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
/** « 9 h – 17 h », « 14 h 30 - 19 h 30 » → [9, 17] / [14.5, 19.5]. */
function plage(h: string | undefined): [number, number] | null {
  if (!h || /ferm/i.test(h)) return null
  const n = [...h.matchAll(/(\d{1,2})\s*h\s*(\d{2})?/g)].map((m) => Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0))
  if (n.length >= 2) return [n[0]!, n[1]!]
  if (/matin/i.test(h)) return [9, 12.5]
  return null
}
const heureTexte = (h: number) => `${Math.floor(h)} h${h % 1 ? ` ${String(Math.round((h % 1) * 60)).padStart(2, '0')}` : ''}`

/** LA SEMAINE — sept cartes, une par jour, qui s'ouvrent en éventail ;
 *  celle d'aujourd'hui se lève, et l'on sait si c'est ouvert. */
export function Semaine({ horaires }: { horaires: OpeningHour[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const [maintenant, setMaintenant] = useState<Date | null>(null)
  useEffect(() => {
    setMaintenant(new Date())
    const t = window.setInterval(() => setMaintenant(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  const auj = maintenant ? (maintenant.getDay() + 6) % 7 : -1
  const heureDe = (j: number) => horaires.find((x) => x.day.toLowerCase().startsWith(JOURS[j]!.slice(0, 3)))?.hours
  const h = maintenant ? maintenant.getHours() + maintenant.getMinutes() / 60 : 0
  const pl = auj >= 0 ? plage(heureDe(auj)) : null
  const ouvert = pl ? h >= pl[0] && h < pl[1] : false
  const statut = (() => {
    if (!maintenant) return ' '
    if (ouvert) return 'Ouvert maintenant'
    for (let k = 0; k < 7; k++) {
      const j = (auj + k) % 7
      const p = plage(heureDe(j))
      if (p && (k > 0 || h < p[0])) return `Ouvre ${k === 0 ? 'aujourd’hui' : k === 1 ? 'demain' : JOURS[j]} à ${heureTexte(p[0])}`
    }
    return 'Sur rendez-vous'
  })()
  return (
    <div>
      <p className="mb-14 flex items-center justify-center gap-3 font-[family-name:var(--ad-titre)] text-[clamp(22px,2.6vw,30px)] text-[var(--ad-nuit)]">
        <span className={cn('h-2.5 w-2.5 rounded-full', ouvert ? 'bg-[var(--ad-or)] shadow-[0_0_0_5px_rgba(79,169,166,0.18)]' : 'bg-[var(--ad-sable-fonce)]')} />
        {statut}
      </p>
      <div className="-mx-[5vw] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[5vw] pb-6 pt-8 [scrollbar-width:none] sm:hidden">
        {JOURS.map((j, i) => {
          const heures = heureDe(i) ?? 'Fermé'
          const leve = i === auj
          return (
            <div key={j} className={cn(CADRE, 'flex aspect-[3/4] w-[132px] shrink-0 snap-center flex-col justify-between p-4', leve ? '-translate-y-4 bg-[var(--ad-nuit)] text-white' : /ferm/i.test(heures) && 'bg-[var(--ad-sable)]')}>
              <span className="font-[family-name:var(--ad-titre)] text-[22px] capitalize leading-none">{j}</span>
              <span className={cn('text-[13px] leading-[1.35]', leve ? 'text-white/80' : 'text-[var(--ad-pierre)]')}>{heures}</span>
            </div>
          )
        })}
      </div>
      <div ref={ref} className="relative mx-auto hidden h-[clamp(170px,20vw,250px)] w-full max-w-[1100px] [--p:1] [--pas:96%] sm:block">
        {JOURS.map((j, i) => {
          const k = i - 3
          const ouv = `clamp(0, calc((var(--p) - ${(0.12 + Math.abs(k) * 0.03).toFixed(2)}) * 3), 1)`
          const leve = i === auj
          const heures = heureDe(i) ?? 'Fermé'
          return (
            <div
              key={j}
              className="absolute bottom-0 left-1/2 aspect-[3/4] w-[clamp(84px,12vw,160px)] origin-[50%_130%]"
              style={{ zIndex: leve ? 30 : 10 + i, transform: `translateX(-50%) translateX(calc(${ouv} * ${k} * var(--pas))) rotate(calc(${ouv} * ${k * 3}deg))` }}
            >
              <div
                className={cn(CADRE, 'flex h-full flex-col justify-between p-[11%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]', leve ? '-translate-y-6 bg-[var(--ad-nuit)] text-white' : /ferm/i.test(heures) && 'bg-[var(--ad-sable)]')}
              >
                <span className="font-[family-name:var(--ad-titre)] text-[clamp(16px,1.9vw,24px)] capitalize leading-none">{j.slice(0, 3)}.</span>
                <span className={cn('text-[clamp(10px,1.05vw,13px)] leading-[1.3]', leve ? 'text-white/80' : 'text-[var(--ad-pierre)]')}>{heures}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** L'INVITATION — la phrase au centre, et autour, quelques photos qui
 *  flottent comme posées en l'air ; au défilement, elles dérivent. */
const AUTOUR = [
  { c: 'left-[2%] top-[6%] w-[clamp(90px,13vw,190px)]', r: -8, v: -90 },
  { c: 'right-[3%] top-[2%] w-[clamp(80px,11vw,160px)]', r: 7, v: -50 },
  { c: 'left-[8%] bottom-[2%] w-[clamp(80px,10vw,150px)] max-sm:hidden', r: 5, v: 80 },
  { c: 'right-[6%] bottom-[6%] w-[clamp(90px,13vw,180px)] max-sm:hidden', r: -6, v: 120 },
]
export function InvitationFlottante({ photos, children }: { photos: Media[]; children: React.ReactNode }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  return (
    <div ref={ref} className="relative flex min-h-[clamp(520px,70vh,720px)] items-center justify-center [--p:0.5]">
      {photos.slice(0, AUTOUR.length).map((p, i) => {
        const a = AUTOUR[i]!
        return (
          <div key={p.id} className={cn('absolute', a.c)} style={{ transform: `translateY(calc((var(--p) - 0.5) * ${a.v}px)) rotate(${a.r}deg)` }}>
            <div style={flotte(i)}>
              <CartePhoto p={p} className={i % 2 ? 'aspect-square' : 'aspect-[3/4]'} sizes="190px" />
            </div>
          </div>
        )
      })}
      <div className="relative z-10 px-6 text-center">{children}</div>
    </div>
  )
}

/** Le lien de l'invitation : le filet se trace sous le texte, la flèche avance. */
export function Invitation({ libelle, href }: { libelle: string; href: string }) {
  return (
    <a href={href} className="group inline-flex items-center gap-5 text-[var(--ad-nuit)]">
      <span className="relative font-[family-name:var(--ad-titre)] text-[clamp(24px,3vw,40px)] leading-none">
        {libelle}
        <span aria-hidden="true" className="absolute -bottom-2 left-0 h-px w-full bg-[var(--ad-sable-fonce)]" />
        <span aria-hidden="true" className="absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-[var(--ad-nuit)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      </span>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--ad-nuit)] text-white shadow-[0_18px_36px_-18px_rgba(46,66,79,0.7)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
        <ArrowRight className="h-5 w-5" />
      </span>
    </a>
  )
}
