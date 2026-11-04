'use client'

import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useRef, useState } from 'react'

import { Edition, useAvancement } from './vivant'
import { cn, toE164 } from '@/lib/utils'
import type { FaqItem, Media, OpeningHour, ServiceWithMedia } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION de la version moderne — vitrine : /moderne/exception.
 *
 * Le parti pris : ÉPURÉ, minimaliste. Beaucoup d'air, des traits d'un pixel, la
 * typographie au premier plan, et UNE animation soignée par section —
 * lente, douce, qui sert le contenu au lieu de se montrer.
 *
 * Même règle que `vivant.tsx` : le défilement et la souris n'écrivent
 * que des variables CSS ; tout le reste est du calc(). Rien ne bouge pour
 * qui a demandé moins d'animations, et l'éditeur fige les mises en scène.
 */

const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const accent = (texte: string) => texte.split('*').map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
const propre = (t: string) => t.replace(/\*/g, '')
/** Une image optimisée en arrière-plan CSS (pour les découpes). */
const fond = (url: string, w = 1920) => `url("/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75")`
/** La courbe de toute la bibliothèque : un départ franc, une arrivée très douce. */
const DOUX = 'cubic-bezier(0.22,1,0.36,1)'
const n2 = (i: number) => String(i + 1).padStart(2, '0')

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
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

/** LA FENTE — une phrase coupée par un trait fin ; en descendant, elle
 *  s'écarte et la fente s'ouvre sur une photo plein écran. */
export function Fente({ haut, bas, legende, photo }: { haut: string; bas: string; legende: string; photo: Media | null }) {
  const ref = useAvancement<HTMLElement>('colle', true)
  const edition = useContext(Edition)
  const moitie = 'pointer-events-none absolute inset-x-0 px-5 text-center font-[family-name:var(--ad-titre)] text-[clamp(40px,8vw,128px)] leading-[0.95] tracking-[-0.03em] text-[var(--ad-nuit)]'
  return (
    <section ref={ref} className={cn('relative [--e:0]', edition ? 'h-[calc(var(--ad-vh)*100)]' : 'h-[calc(var(--ad-vh)*230)]')}>
      <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ clipPath: 'inset(calc((1 - var(--e)) * 49.5%) calc((1 - var(--e)) * 8%) round calc((1 - var(--e)) * 400px))' }}>
          {photo && <Image src={photo.url} alt={photo.alt} fill sizes="100vw" className="object-cover" style={{ transform: 'scale(calc(1.2 - var(--e) * 0.2))' }} />}
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(46,66,79,0.55),transparent_55%)]" style={{ opacity: 'var(--e)' }} />
          <p
            className="absolute inset-x-0 bottom-[10%] mx-auto max-w-[40ch] px-6 text-center text-[clamp(17px,1.8vw,22px)] leading-[1.5] text-white"
            style={{ opacity: 'clamp(0, calc((var(--e) - 0.75) * 4), 1)', transform: 'translateY(calc((1 - var(--e)) * 24px))' }}
          >
            {legende}
          </p>
        </div>
        <p className={cn(moitie, 'bottom-1/2 mb-[clamp(10px,1.4vw,20px)]')} style={{ transform: 'translateY(calc(var(--e) * var(--ad-vh) * -55))', opacity: 'clamp(0, calc(1 - var(--e) * 1.8), 1)' }}>
          {accent(haut)}
        </p>
        <p className={cn(moitie, 'top-1/2 mt-[clamp(10px,1.4vw,20px)]')} style={{ transform: 'translateY(calc(var(--e) * var(--ad-vh) * 55))', opacity: 'clamp(0, calc(1 - var(--e) * 1.8), 1)' }}>
          {accent(bas)}
        </p>
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-px w-[84%] -translate-x-1/2 bg-[var(--ad-sable-fonce)]" style={{ opacity: 'clamp(0, calc(1 - var(--e) * 8), 1)' }} />
      </div>
    </section>
  )
}

/** LES LAMES — la photo d'ouverture arrive en six bandes verticales qui
 *  montent l'une après l'autre ; le texte se pose ensuite. */
export function Lames({ photo, children }: { photo: Media | null; children: React.ReactNode }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const N = 6
  return (
    <div ref={ref} className="relative isolate h-[calc(var(--ad-vh)*90)] min-h-[540px] overflow-hidden bg-[var(--ad-sable)]">
      {photo &&
        Array.from({ length: N }, (_, i) => (
          <span key={i} aria-hidden="true" className="absolute inset-y-0 overflow-hidden" style={{ left: `${(i / N) * 100}%`, width: `${100 / N + 0.1}%` }}>
            <span
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: fond(photo.url),
                backgroundSize: `${N * 100}% 100%`,
                backgroundPosition: `${(i / (N - 1)) * 100}% 50%`,
                transform: vu ? 'translateY(0)' : 'translateY(101%)',
                transition: `transform 1.4s ${DOUX} ${0.1 + i * 0.09}s`,
              }}
            />
          </span>
        ))}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(46,66,79,0.7),rgba(46,66,79,0.1)_60%)]" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1.4s 0.6s' }} />
      <div
        className="absolute inset-0 flex flex-col justify-end px-[5vw] pb-[9vh] text-white"
        style={{ opacity: vu ? 1 : 0, transform: vu ? 'none' : 'translateY(16px)', transition: `opacity 1.2s 1s, transform 1.2s ${DOUX} 1s` }}
      >
        {children}
      </div>
    </div>
  )
}

/** LE MOT-PHOTO — un très grand mot taillé dans la photo ; il se resserre
 *  en arrivant, puis la photo glisse doucement dans les lettres au
 *  défilement. */
export function MotPhoto({ mot, photo }: { mot: string; photo: Media | null }) {
  const [vuRef, vu] = useVu<HTMLParagraphElement>()
  const ref = useAvancement<HTMLDivElement>('passage')
  return (
    <div ref={ref} className="[--p:0.5]">
      <p
        ref={vuRef}
        aria-label={mot}
        className="select-none whitespace-nowrap bg-clip-text text-center font-[family-name:var(--ad-titre)] text-[clamp(64px,19vw,300px)] font-semibold leading-[0.9] text-transparent [-webkit-background-clip:text]"
        style={{
          backgroundImage: photo ? fond(photo.url) : 'linear-gradient(120deg,#46728a,#4fa9a6)',
          backgroundSize: 'cover',
          backgroundPosition: '50% calc(var(--p) * 100%)',
          letterSpacing: vu ? '-0.045em' : '0.06em',
          opacity: vu ? 1 : 0,
          transition: `letter-spacing 1.8s ${DOUX}, opacity 1.2s`,
        }}
      >
        {mot}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

/** LE DÉVOILEMENT — le portrait se découvre de bas en haut, lentement,
 *  pendant que l'image se pose (léger recul du zoom). */
export function Devoilement({ photo }: { photo: Media | null }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-[var(--ad-sable)]"
      style={{ clipPath: vu ? 'inset(0 0 0 0 round 28px)' : 'inset(100% 0 0 0 round 28px)', transition: `clip-path 1.6s ${DOUX}` }}
    >
      {photo && (
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover"
          style={{ transform: vu ? 'scale(1)' : 'scale(1.18)', transition: `transform 2.4s ${DOUX}` }}
        />
      )}
    </div>
  )
}

/** LA PLANCHE — des photos en trois colonnes qui glissent à des vitesses
 *  différentes au défilement : une profondeur à peine perceptible. */
export function Planche({ photos }: { photos: Media[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const colonnes = [0, 1, 2].map((c) => photos.filter((_, i) => i % 3 === c))
  const vitesses = [40, -30, 70]
  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 [--p:0.5] sm:grid-cols-3 sm:gap-6">
      {colonnes.map((col, c) => (
        <div
          key={c}
          className={cn('flex flex-col gap-4 sm:gap-6', c === 1 && 'mt-16', c === 2 && 'hidden sm:flex sm:mt-8')}
          style={{ transform: `translateY(calc((var(--p) - 0.5) * ${vitesses[c]}px * -2))` }}
        >
          {col.map((p, k) => (
            <figure key={p.id}>
              <div className={cn('relative overflow-hidden rounded-[20px] bg-[var(--ad-sable)]', (c + k) % 2 ? 'aspect-[4/5]' : 'aspect-[4/3]')}>
                <Image src={p.url} alt={p.alt} fill sizes="(max-width: 640px) 50vw, 380px" className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04]" />
              </div>
              {p.caption && <figcaption className="mt-2.5 text-[13px] text-[var(--ad-gris)]">{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      ))}
    </div>
  )
}

/** L'ODOMÈTRE — chaque chiffre roule comme un compteur, puis s'arrête. */
export function Odometre({ chiffres }: { chiffres: { valeur: string; libelle: string }[] }) {
  const [ref, vu] = useVu<HTMLDListElement>()
  return (
    <dl ref={ref} className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {chiffres.map((c, k) => (
        <div key={k} className="border-t border-[var(--ad-sable-fonce)] pt-6">
          <dt className="sr-only">{c.libelle}</dt>
          <dd aria-label={c.valeur} className="flex items-baseline font-[family-name:var(--ad-titre)] text-[clamp(64px,8vw,112px)] leading-none tracking-[-0.04em] text-[var(--ad-nuit)]">
            {[...c.valeur].map((ch, i) =>
              /\d/.test(ch) ? (
                <span key={i} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden">
                  <span
                    className="flex flex-col"
                    style={{ transform: vu ? `translateY(-${Number(ch) + 10}em)` : 'translateY(0)', transition: `transform 2s ${DOUX} ${k * 0.15 + i * 0.1}s` }}
                  >
                    {Array.from({ length: 20 }, (_, n) => (
                      <span key={n} className="block h-[1em] leading-none">
                        {n % 10}
                      </span>
                    ))}
                  </span>
                </span>
              ) : (
                <span key={i} aria-hidden="true" className="text-[0.4em] text-[var(--ad-gris)]">
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
   MA MÉTHODE
   ══════════════════════════════════════════════════════════════════════ */

type Etape = { titre: string; texte: string }

/** LE FIL — un trait vertical se dessine au défilement ; chaque étape
 *  s'éclaire quand il l'atteint. */
export function Fil({ etapes }: { etapes: Etape[] }) {
  const ref = useAvancement<HTMLOListElement>('passage')
  const n = Math.max(1, etapes.length)
  const trait = 'clamp(0, calc((var(--p) - 0.18) * 1.9), 1)'
  return (
    <ol ref={ref} className="relative mx-auto max-w-[760px] [--p:1]">
      <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 w-px bg-[var(--ad-sable-fonce)]" />
      <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 w-px origin-top bg-[var(--ad-nuit)]" style={{ transform: `scaleY(${trait})` }} />
      {etapes.map((e, i) => {
        const allume = `clamp(0, calc((${trait} - ${(i / n).toFixed(3)}) * ${n * 3}), 1)`
        return (
          <li key={i} className="relative pb-14 pl-12 last:pb-0" style={{ opacity: `calc(0.3 + ${allume} * 0.7)` }}>
            <span
              aria-hidden="true"
              className="absolute left-0 top-2 h-[15px] w-[15px] rounded-full border border-[var(--ad-nuit)] bg-[var(--ad-ivoire)]"
              style={{ background: `color-mix(in srgb, var(--ad-nuit) calc(${allume} * 100%), var(--ad-ivoire))` }}
            />
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Étape {n2(i)}</p>
            <h3 className="mt-2 text-[clamp(26px,3vw,36px)]" style={{ transform: `translateX(calc((1 - ${allume}) * -8px))` }}>
              {e.titre}
            </h3>
            {e.texte && <p className="mt-3 max-w-[52ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)]">{e.texte}</p>}
          </li>
        )
      })}
    </ol>
  )
}

/** LE VOYAGE — sur grand écran, la page s'immobilise et le chemin défile
 *  de côté sur un trait fin qui se trace. En colonne sur téléphone. */
export function Voyage({ etapes }: { etapes: Etape[] }) {
  const ref = useAvancement<HTMLElement>('colle')
  const edition = useContext(Edition)
  const n = etapes.length
  const pas = 440
  const largeur = n * pas
  return (
    <>
      <ol className="flex flex-col gap-10 lg:hidden">
        {etapes.map((e, i) => (
          <li key={i} className="border-t border-[var(--ad-sable-fonce)] pt-5">
            <span className="text-[13px] tabular-nums text-[var(--ad-gris)]">{n2(i)}</span>
            <h3 className="mt-2 text-[26px]">{e.titre}</h3>
            {e.texte && <p className="mt-2 text-[15px] leading-[1.65] text-[var(--ad-pierre)]">{e.texte}</p>}
          </li>
        ))}
      </ol>
      <section ref={ref} className="relative hidden [--p:0] lg:block" style={{ height: edition ? 'calc(var(--ad-vh) * 100)' : `calc(var(--ad-vh) * ${100 + n * 40})` }}>
        <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center overflow-hidden">
          <div className="relative h-[320px] shrink-0" style={{ width: `calc(${largeur}px + 20vw)`, transform: `translateX(calc(var(--p) * (100vw - ${largeur}px - 20vw)))` }}>
            <span aria-hidden="true" className="absolute left-[10vw] top-[60px] h-px bg-[var(--ad-sable-fonce)]" style={{ width: largeur }} />
            <span aria-hidden="true" className="absolute left-[10vw] top-[60px] h-px origin-left bg-[var(--ad-nuit)]" style={{ width: largeur, transform: 'scaleX(var(--p))' }} />
            {etapes.map((e, i) => {
              const allume = `clamp(0, calc((var(--p) - ${(i / n - 0.05).toFixed(3)}) * 10), 1)`
              return (
                <article key={i} className="absolute top-0 w-[340px]" style={{ left: `calc(10vw + ${i * pas}px)`, opacity: `calc(0.25 + ${allume} * 0.75)` }}>
                  <span className="block font-[family-name:var(--ad-titre)] text-[28px] leading-none text-[var(--ad-gris)]">{n2(i)}</span>
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[54px] h-[13px] w-[13px] rounded-full border border-[var(--ad-nuit)]"
                    style={{ background: `color-mix(in srgb, var(--ad-nuit) calc(${allume} * 100%), var(--ad-ivoire))` }}
                  />
                  <h3 className="mt-[70px] text-[30px] leading-[1.1]" style={{ transform: `translateY(calc((1 - ${allume}) * 12px))` }}>
                    {e.titre}
                  </h3>
                  {e.texte && <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.65] text-[var(--ad-pierre)]">{e.texte}</p>}
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

/** LES VOLETS — les étapes en colonnes ; celle qu'on survole s'élargit
 *  doucement et laisse lire son texte. Empilées sur téléphone. */
export function Volets({ etapes }: { etapes: Etape[] }) {
  const [actif, setActif] = useState(0)
  return (
    <ol className="flex flex-col gap-3 lg:h-[460px] lg:flex-row">
      {etapes.map((e, i) => {
        const ouvert = i === actif
        return (
          <li
            key={i}
            onMouseEnter={() => setActif(i)}
            onFocus={() => setActif(i)}
            tabIndex={0}
            className={cn(
              'relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[24px] border p-7 outline-none transition-[flex-grow,background-color,border-color] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:p-9',
              ouvert ? 'border-transparent bg-[var(--ad-sable)] lg:flex-[2.6]' : 'border-[var(--ad-sable-fonce)] bg-transparent lg:flex-1',
            )}
          >
            <span className="font-[family-name:var(--ad-titre)] text-[clamp(44px,5vw,72px)] leading-none text-[var(--ad-sable-fonce)]">{n2(i)}</span>
            <div className="mt-8 lg:mt-0">
              <h3 className="text-[clamp(22px,2.2vw,30px)] leading-[1.15]">{e.titre}</h3>
              {e.texte && (
                <p
                  className={cn(
                    'mt-3 max-w-[44ch] text-[15px] leading-[1.65] text-[var(--ad-pierre)] transition-[opacity,transform] duration-700',
                    ouvert ? 'delay-300 lg:translate-y-0 lg:opacity-100' : 'lg:translate-y-2 lg:opacity-0',
                  )}
                >
                  {e.texte}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS
   ══════════════════════════════════════════════════════════════════════ */

/** LES LIGNES — une liste à filets ; la ligne survolée s'ouvre et laisse
 *  apparaître sa photo et son texte. */
export function LignesServices({ services, rdv, bouton }: { services: ServiceWithMedia[]; rdv: string; bouton: string }) {
  const [ouvert, setOuvert] = useState(0)
  return (
    <ul className="border-t border-[var(--ad-sable-fonce)]">
      {services.map((s, i) => {
        const o = i === ouvert
        return (
          <li key={s.id} className="border-b border-[var(--ad-sable-fonce)]" onMouseEnter={() => setOuvert(i)}>
            <button type="button" onClick={() => setOuvert(i)} onFocus={() => setOuvert(i)} aria-expanded={o} className="flex w-full items-baseline gap-5 py-6 text-left">
              <span className="w-8 shrink-0 text-[13px] tabular-nums text-[var(--ad-gris)]">{n2(i)}</span>
              <span className={cn('flex-1 font-[family-name:var(--ad-titre)] text-[clamp(24px,3.2vw,40px)] leading-[1.1] transition-colors duration-500', o ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-pierre)]')}>
                {s.title}
              </span>
              {s.duration && <span className="hidden shrink-0 text-[13px] text-[var(--ad-gris)] sm:block">{s.duration}</span>}
            </button>
            <div className={cn('grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]', o ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <div className={cn('flex flex-col gap-6 pb-8 pl-[52px] transition-opacity duration-700 sm:flex-row sm:items-start', o ? 'opacity-100 delay-150' : 'opacity-0')}>
                  {s.media && (
                    <div className="relative aspect-[4/3] w-full max-w-[240px] shrink-0 overflow-hidden rounded-[16px] bg-[var(--ad-sable)]">
                      <Image src={s.media.url} alt="" fill sizes="240px" className={cn('object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)]', o ? 'scale-100' : 'scale-110')} />
                    </div>
                  )}
                  <div>
                    <p className="max-w-[52ch] text-[15.5px] leading-[1.7] text-[var(--ad-pierre)]">{propre(s.excerpt)}</p>
                    <a href={rdv} className="group mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ad-nuit)]">
                      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">{bouton}</span>
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** LE SOMMAIRE — les noms à gauche, en grand et en retrait ; celui qu'on
 *  survole s'affirme, un filet se trace dessous et sa photo se pose à
 *  droite en fondu. */
export function Sommaire({ services, rdv, bouton }: { services: ServiceWithMedia[]; rdv: string; bouton: string }) {
  const [choisi, setChoisi] = useState(0)
  const s = services[choisi]
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-20">
      <ul className="flex flex-col gap-2">
        {services.map((sv, i) => (
          <li key={sv.id}>
            <button type="button" onMouseEnter={() => setChoisi(i)} onFocus={() => setChoisi(i)} onClick={() => setChoisi(i)} className="group relative py-2 text-left">
              <span className={cn('font-[family-name:var(--ad-titre)] text-[clamp(30px,4vw,56px)] leading-[1.1] tracking-[-0.02em] transition-colors duration-500', i === choisi ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-sable-fonce)] group-hover:text-[var(--ad-gris)]')}>
                {sv.title}
              </span>
              <span aria-hidden="true" className={cn('absolute bottom-1 left-0 h-px w-full origin-left bg-[var(--ad-nuit)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]', i === choisi ? 'scale-x-100' : 'scale-x-0')} />
            </button>
          </li>
        ))}
      </ul>
      <div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[var(--ad-sable)]">
          {services.map((sv, i) =>
            sv.media ? (
              <Image
                key={sv.id}
                src={sv.media.url}
                alt={i === choisi ? sv.media.alt : ''}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className={cn('object-cover transition-[opacity,transform] duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)]', i === choisi ? 'scale-100 opacity-100' : 'scale-[1.05] opacity-0')}
              />
            ) : null,
          )}
        </div>
        {s && (
          <div key={s.id} className="mt-6 motion-safe:animate-[ad-monter_0.8s_cubic-bezier(0.22,1,0.36,1)_backwards]">
            <p className="text-[15.5px] leading-[1.7] text-[var(--ad-pierre)]">{propre(s.excerpt)}</p>
            <a href={rdv} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ad-nuit)]">
              {bouton} <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/** LES CHAPITRES — un accompagnement à la fois, comme les chapitres d'un
 *  livre : la photo se découvre, le texte monte, un filet marque où l'on
 *  en est. */
export function Chapitres({ services, rdv, bouton }: { services: ServiceWithMedia[]; rdv: string; bouton: string }) {
  const [i, setI] = useState(0)
  const n = services.length
  const s = services[i]
  if (!s) return null
  const aller = (d: number) => setI((k) => (k + d + n) % n)
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[var(--ad-sable)]">
        {s.media && (
          <div key={s.id} className="absolute inset-0 motion-safe:animate-[ad-rideau_1.2s_cubic-bezier(0.77,0,0.18,1)_backwards] [--ad-rayon:0px]">
            <Image src={s.media.url} alt={s.media.alt} fill sizes="(max-width: 1024px) 100vw, 560px" className="object-cover" />
          </div>
        )}
      </div>
      <div>
        <p className="text-[13px] tabular-nums tracking-[0.12em] text-[var(--ad-gris)]">
          {n2(i)} <span className="text-[var(--ad-sable-fonce)]">/ {n2(n - 1)}</span>
        </p>
        <div key={s.id} className="mt-6">
          <h3 className="text-[clamp(32px,4vw,52px)] leading-[1.05] motion-safe:animate-[ad-monter_0.9s_cubic-bezier(0.22,1,0.36,1)_0.15s_backwards]">{s.title}</h3>
          {s.duration && <p className="mt-3 text-[14px] text-[var(--ad-gris)] motion-safe:animate-[ad-monter_0.9s_cubic-bezier(0.22,1,0.36,1)_0.25s_backwards]">{s.duration}</p>}
          <p className="mt-5 max-w-[46ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)] motion-safe:animate-[ad-monter_0.9s_cubic-bezier(0.22,1,0.36,1)_0.35s_backwards]">{propre(s.excerpt)}</p>
          <a href={rdv} className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ad-nuit)] motion-safe:animate-[ad-monter_0.9s_cubic-bezier(0.22,1,0.36,1)_0.45s_backwards]">
            {bouton} <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-12 flex items-center gap-6">
          <span className="relative h-px flex-1 bg-[var(--ad-sable-fonce)]">
            <span className="absolute inset-y-0 left-0 bg-[var(--ad-nuit)] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${((i + 1) / n) * 100}%` }} />
          </span>
          <button type="button" onClick={() => aller(-1)} aria-label="Précédent" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--ad-sable-fonce)] transition-colors hover:border-[var(--ad-nuit)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => aller(1)} aria-label="Suivant" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--ad-sable-fonce)] transition-colors hover:border-[var(--ad-nuit)]">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

/** LE PLI — des questions à filets ; la réponse se déplie en douceur et
 *  la croix tourne d'un quart de tour. */
export function Pli({ faq }: { faq: FaqItem[] }) {
  const [ouvert, setOuvert] = useState<number | null>(0)
  return (
    <ul className="mx-auto max-w-[820px] border-t border-[var(--ad-sable-fonce)]">
      {faq.map((f, i) => {
        const o = ouvert === i
        return (
          <li key={f.id} className="border-b border-[var(--ad-sable-fonce)]">
            <button type="button" onClick={() => setOuvert(o ? null : i)} aria-expanded={o} className="flex w-full items-center justify-between gap-6 py-6 text-left">
              <span className="font-[family-name:var(--ad-titre)] text-[clamp(19px,2vw,24px)] leading-[1.3] text-[var(--ad-nuit)]">{f.question}</span>
              <span aria-hidden="true" className="relative h-4 w-4 shrink-0">
                <span className="absolute left-0 top-1/2 h-px w-4 bg-[var(--ad-nuit)]" />
                <span className={cn('absolute left-0 top-1/2 h-px w-4 bg-[var(--ad-nuit)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', o ? 'rotate-0' : 'rotate-90')} />
              </span>
            </button>
            <div className={cn('grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]', o ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <p className={cn('max-w-[62ch] whitespace-pre-line pb-7 text-[16px] leading-[1.75] text-[var(--ad-pierre)] transition-[opacity,transform] duration-700', o ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')}>
                  {propre(f.answer)}
                </p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** LA MACHINE À ÉCRIRE — la question se tape, avec son curseur fin ;
 *  la réponse apparaît, puis la suivante. En pause hors de l'écran. */
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
      const t = window.setTimeout(() => setLettres((l) => l + 1), 38)
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
    <div ref={ref} className="mx-auto max-w-[880px]">
      <p className="min-h-[2.3em] font-[family-name:var(--ad-titre)] text-[clamp(30px,4.4vw,56px)] leading-[1.15] tracking-[-0.02em] text-[var(--ad-nuit)]" aria-live="polite">
        {q.question.slice(0, lettres)}
        <span aria-hidden="true" className="ml-1 inline-block h-[0.85em] w-[1.5px] translate-y-[0.1em] bg-[var(--ad-nuit)] motion-safe:animate-[ad-clignote_1.1s_steps(1)_infinite]" />
      </p>
      <p key={q.id} className={cn('mt-8 max-w-[60ch] whitespace-pre-line text-[17px] leading-[1.75] text-[var(--ad-pierre)] transition-[opacity,transform] duration-1000', fini ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0')}>
        {propre(q.answer)}
      </p>
      <div className="mt-12 flex flex-wrap gap-x-5 gap-y-2">
        {faq.map((f, k) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setI(k)
              setLettres(0)
            }}
            aria-label={f.question}
            className={cn('text-[13px] tabular-nums transition-colors', k === i ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-sable-fonce)] hover:text-[var(--ad-gris)]')}
          >
            {n2(k)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** L'INDEX — les questions numérotées ; la réponse se dévoile à côté. En
 *  accordéon sur téléphone. */
export function Index({ faq }: { faq: FaqItem[] }) {
  const [i, setI] = useState(0)
  const q = faq[i]
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
      <ol className="border-t border-[var(--ad-sable-fonce)]">
        {faq.map((f, k) => (
          <li key={f.id} className="border-b border-[var(--ad-sable-fonce)]">
            <button type="button" onMouseEnter={() => setI(k)} onFocus={() => setI(k)} onClick={() => setI(k)} className="flex w-full items-baseline gap-4 py-4 text-left">
              <span className={cn('w-7 shrink-0 text-[13px] tabular-nums transition-colors', k === i ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-gris)]')}>{n2(k)}</span>
              <span className={cn('text-[16.5px] leading-[1.4] transition-[color,transform] duration-500', k === i ? 'translate-x-1.5 text-[var(--ad-nuit)]' : 'text-[var(--ad-pierre)]')}>{f.question}</span>
            </button>
            {k === i && <p className="whitespace-pre-line pb-5 pl-11 text-[15px] leading-[1.7] text-[var(--ad-pierre)] lg:hidden">{propre(f.answer)}</p>}
          </li>
        ))}
      </ol>
      {q && (
        <div className="hidden lg:block">
          <div key={q.id} className="sticky top-28 motion-safe:animate-[ad-monter_0.8s_cubic-bezier(0.22,1,0.36,1)_backwards]">
            <p className="font-[family-name:var(--ad-titre)] text-[30px] leading-[1.15] text-[var(--ad-nuit)]">{q.question}</p>
            <p className="mt-6 whitespace-pre-line text-[16px] leading-[1.8] text-[var(--ad-pierre)]">{propre(q.answer)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS
   ══════════════════════════════════════════════════════════════════════ */

/** LA LAMPE — la photo est en noir et blanc ; là où passe la souris, une
 *  lumière douce lui rend ses couleurs. Sur tactile, elle se promène seule. */
export function Lampe({ photo, titre, texte }: { photo: Media | null; titre: string; texte: string }) {
  const [main, setMain] = useState(false)
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--lampe-x', `${((e.clientX - r.left) / r.width) * 100}%`)
    e.currentTarget.style.setProperty('--lampe-y', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  const masque = 'radial-gradient(circle var(--lampe-r) at var(--lampe-x) var(--lampe-y), #000 30%, transparent 100%)'
  return (
    <div
      onPointerEnter={(e) => e.pointerType === 'mouse' && setMain(true)}
      onPointerLeave={() => setMain(false)}
      onPointerMove={bouge}
      className={cn(
        'relative isolate aspect-[4/5] w-full overflow-hidden rounded-[32px] bg-[var(--ad-sable)] [transition:--lampe-r_0.8s_ease] sm:aspect-[16/10]',
        !main && 'motion-safe:animate-[ad-errance_16s_ease-in-out_infinite]',
      )}
      style={{ ['--lampe-r' as string]: main ? '320px' : '220px' }}
    >
      {photo && (
        <>
          <Image src={photo.url} alt={photo.alt} fill sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover [filter:grayscale(1)_brightness(0.95)]" />
          <Image src={photo.url} alt="" aria-hidden="true" fill sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover" style={{ maskImage: masque, WebkitMaskImage: masque }} />
        </>
      )}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(46,66,79,0.65),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
        <h3 className="max-w-[16ch] text-[clamp(28px,3.6vw,48px)] leading-[1.05] text-white [&_em]:[-webkit-text-fill-color:#dff1ef] [&_em]:[background:none]">{accent(titre)}</h3>
        {texte && <p className="mt-3 max-w-[44ch] text-[15px] leading-[1.6] text-white/80">{texte}</p>}
      </div>
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

/** LES LETTRES VIVANTES — les lettres arrivent en cascade, puis se
 *  soulèvent et s'épaississent à peine sous la souris. */
export function LettresVivantes({ texte, className }: { texte: string; className?: string }) {
  const [ref, vu] = useVu<HTMLHeadingElement>('-15%')
  const edition = useContext(Edition)

  useEffect(() => {
    const el = ref.current
    if (!el || edition || reduit()) return
    const lettres = [...el.querySelectorAll<HTMLElement>('[data-l]')]
    let centres: { x: number; y: number }[] = []
    let image = 0
    let pos: { x: number; y: number } | null = null
    const mesurer = () => {
      centres = lettres.map((l) => {
        const r = l.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      })
    }
    const peindre = () => {
      image = 0
      const rayon = Math.max(140, el.getBoundingClientRect().height * 0.9)
      lettres.forEach((l, i) => {
        const c = centres[i]
        if (!c || !pos) return l.style.setProperty('--f', '0')
        const f = Math.max(0, 1 - Math.hypot(c.x - pos.x, c.y - pos.y) / rayon)
        l.style.setProperty('--f', (f * f).toFixed(3))
      })
    }
    const bouge = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!pos) mesurer()
      pos = { x: e.clientX, y: e.clientY }
      if (!image) image = requestAnimationFrame(peindre)
    }
    const sort = () => {
      pos = null
      if (!image) image = requestAnimationFrame(peindre)
    }
    el.addEventListener('pointerenter', mesurer)
    el.addEventListener('pointermove', bouge)
    el.addEventListener('pointerleave', sort)
    window.addEventListener('scroll', mesurer, { passive: true })
    return () => {
      cancelAnimationFrame(image)
      el.removeEventListener('pointerenter', mesurer)
      el.removeEventListener('pointermove', bouge)
      el.removeEventListener('pointerleave', sort)
      window.removeEventListener('scroll', mesurer)
    }
  }, [edition, ref])

  let index = 0
  const mots = texte.split(' ')
  let dansAccent = false
  return (
    <h2 ref={ref} className={cn('leading-[0.98]', className)} aria-label={propre(texte)}>
      {mots.map((mot, m) => {
        if (mot.startsWith('*')) dansAccent = true
        const estAccent = dansAccent
        if (mot.endsWith('*')) dansAccent = false
        return (
          <span key={m} aria-hidden="true" className="inline-block whitespace-nowrap">
            {[...mot.replace(/\*/g, '')].map((ch) => {
              const i = index++
              return (
                <span
                  key={i}
                  data-l=""
                  className={cn(
                    'inline-block [--f:0] [transition:transform_0.7s_cubic-bezier(0.22,1,0.36,1),font-variation-settings_0.7s]',
                    estAccent && 'italic text-[var(--ad-bleu)]',
                    vu ? 'motion-safe:animate-[ad-lettre_1.2s_cubic-bezier(0.22,1,0.36,1)_backwards]' : 'opacity-0',
                  )}
                  style={{
                    animationDelay: vu ? `${i * 0.03}s` : undefined,
                    transform: 'translateY(calc(var(--f) * -0.1em))',
                    fontVariationSettings: '"wght" calc(380 + var(--f) * 200)',
                  }}
                >
                  {ch}
                </span>
              )
            })}
            {m < mots.length - 1 && <span className="inline-block w-[0.26em]" />}
          </span>
        )
      })}
    </h2>
  )
}

/** LE RUBAN — une phrase écrite en cercle, qui tourne doucement au
 *  défilement, la conviction au centre. */
export function Ruban({ ruban, phrase, auteur }: { ruban: string; phrase: string; auteur: string }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const r = 180
  const tour = 2 * Math.PI * r
  const motif = `${ruban.trim()}  ·  `
  const fois = Math.max(1, Math.round(tour / (motif.length * 12 * 0.92)))
  return (
    <div ref={ref} className="relative mx-auto aspect-square w-[min(620px,90vw)] [--p:0.5]">
      <svg viewBox="0 0 400 400" aria-hidden="true" className="absolute inset-0 h-full w-full fill-[var(--ad-gris)]" style={{ transform: 'rotate(calc(var(--p) * 160deg))' }}>
        <defs>
          <path id="ad-ruban" d={`M200,200 m-${r},0 a${r},${r} 0 1,1 ${r * 2},0 a${r},${r} 0 1,1 -${r * 2},0`} />
        </defs>
        <text className="uppercase" style={{ fontSize: 12, letterSpacing: '0.2em' }}>
          <textPath href="#ad-ruban" textLength={Math.floor(tour - 2)} lengthAdjust="spacing">
            {motif.repeat(fois)}
          </textPath>
        </text>
      </svg>
      <span aria-hidden="true" className="absolute inset-[14%] rounded-full border border-[var(--ad-sable-fonce)]" />
      <blockquote className="absolute inset-[22%] flex flex-col items-center justify-center text-center">
        <p className="font-[family-name:var(--ad-titre)] text-[clamp(20px,3vw,34px)] leading-[1.2] tracking-[-0.01em] text-[var(--ad-nuit)]">{accent(phrase)}</p>
        {auteur && <footer className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[var(--ad-gris)]">{auteur}</footer>}
      </blockquote>
    </div>
  )
}

/** LE MOT QUI CHANGE — « Un lieu pour [respirer] » : le dernier mot
 *  change, glisse et se floute ; la phrase s'ajuste à sa longueur. */
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
  useEffect(() => {
    if (mesure.current) setLargeur(mesure.current.getBoundingClientRect().width)
  }, [k])
  return (
    <p ref={ref} className="text-center font-[family-name:var(--ad-titre)] text-[clamp(44px,7.5vw,120px)] leading-[1.05] tracking-[-0.03em] text-[var(--ad-nuit)]">
      <span className="block sm:inline">{debut} </span>
      <span className="relative inline-block h-[1.15em] overflow-hidden align-bottom transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: largeur ? `${largeur}px` : undefined }}>
        {mots.map((m, i) => (
          <span
            key={i}
            aria-hidden={i !== k || undefined}
            className="absolute left-0 top-0 whitespace-nowrap italic text-[var(--ad-bleu)] transition-[transform,opacity,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: i === k ? 'translateY(0)' : i === (k - 1 + mots.length) % mots.length ? 'translateY(-70%)' : 'translateY(70%)',
              opacity: i === k ? 1 : 0,
              filter: i === k ? 'blur(0)' : 'blur(6px)',
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
   CONTACT & RENDEZ-VOUS
   ══════════════════════════════════════════════════════════════════════ */

/** L'ADRESSE — l'adresse en grand ; un filet se trace dessous et les
 *  coordonnées s'y posent une à une. */
export function Adresse({ adresse, telephone, email, acces }: { adresse: string | null; telephone: string | null; email: string | null; acces: string | null }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const infos = [
    telephone && { label: 'Téléphone', valeur: telephone, href: `tel:${toE164(telephone)}` },
    email && { label: 'Courriel', valeur: email, href: `mailto:${email}` },
    adresse && { label: 'Itinéraire', valeur: 'Ouvrir dans Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}` },
    acces && { label: 'Accès', valeur: acces, href: null },
  ].filter((x): x is { label: string; valeur: string; href: string | null } => Boolean(x))
  return (
    <div ref={ref}>
      <p className="max-w-[18ch] font-[family-name:var(--ad-titre)] text-[clamp(36px,5.5vw,80px)] leading-[1.05] tracking-[-0.02em] text-[var(--ad-nuit)]">{adresse}</p>
      <span aria-hidden="true" className="mt-12 block h-px origin-left bg-[var(--ad-sable-fonce)]" style={{ transform: vu ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1.6s ${DOUX} 0.2s` }} />
      <dl className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {infos.map((x, i) => (
          <div key={x.label} style={{ opacity: vu ? 1 : 0, transform: vu ? 'none' : 'translateY(10px)', transition: `opacity 1s ${0.6 + i * 0.12}s, transform 1s ${DOUX} ${0.6 + i * 0.12}s` }}>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ad-gris)]">{x.label}</dt>
            <dd className="mt-2 text-[16px] leading-[1.55] text-[var(--ad-nuit)]">
              {x.href ? (
                <a href={x.href} target={x.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 hover:bg-[length:100%_1px]">
                  {x.valeur}
                </a>
              ) : (
                x.valeur
              )}
            </dd>
          </div>
        ))}
      </dl>
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

/** L'HORLOGE — un cadran de 24 heures au trait : les heures du jour en
 *  arc, l'aiguille à l'heure qu'il est, et « Ouvert maintenant » en clair. */
export function Horloge({ horaires }: { horaires: OpeningHour[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
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
  const R = 86
  const point = (t: number, r = R) => {
    const a = ((t / 24) * 360 - 90) * (Math.PI / 180)
    return [Math.round((100 + r * Math.cos(a)) * 100) / 100, Math.round((100 + r * Math.sin(a)) * 100) / 100] as const
  }
  const arc = (a: number, b: number) => `M ${point(a).join(' ')} A ${R} ${R} 0 ${b - a > 12 ? 1 : 0} 1 ${point(b).join(' ')}`
  const prochain = (() => {
    for (let k = 0; k < 7; k++) {
      const j = (jourIndex + k) % 7
      const pl = plage(heureDe(j))
      if (pl && (k > 0 || h < pl[0])) return `Ouvre ${k === 0 ? 'aujourd’hui' : k === 1 ? 'demain' : JOURS[j]} à ${heureTexte(pl[0])}`
    }
    return 'Sur rendez-vous'
  })()
  return (
    <div ref={ref} className="grid items-center gap-14 lg:grid-cols-2">
      <div className="relative mx-auto aspect-square w-[min(400px,78vw)]">
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={ouvert ? 'Ouvert maintenant' : prochain}>
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--ad-sable-fonce)" strokeWidth="1" />
          {auj && (
            <path
              d={arc(auj[0], auj[1])}
              fill="none"
              stroke="var(--ad-nuit)"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              style={{ strokeDashoffset: vu ? 0 : 1, transition: `stroke-dashoffset 2s ${DOUX} 0.3s` }}
            />
          )}
          {Array.from({ length: 24 }, (_, i) => {
            const [x, y] = point(i, 70)
            return i % 6 === 0 ? (
              <text key={i} x={x} y={y + 2.5} textAnchor="middle" className="fill-[var(--ad-gris)] text-[7px]">
                {i}
              </text>
            ) : (
              <circle key={i} cx={x} cy={y} r="0.8" className="fill-[var(--ad-sable-fonce)]" />
            )
          })}
          {maintenant && (
            <g style={{ transform: `rotate(${(h / 24) * 360}deg)`, transformOrigin: '100px 100px', transition: 'transform 1s' }}>
              <line x1="100" y1="100" x2="100" y2="30" stroke="var(--ad-or)" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}
          <circle cx="100" cy="100" r="3" fill="var(--ad-nuit)" />
        </svg>
      </div>
      <div>
        <p className="flex items-center gap-3 font-[family-name:var(--ad-titre)] text-[clamp(24px,2.6vw,32px)] text-[var(--ad-nuit)]">
          <span className={cn('h-2 w-2 rounded-full', ouvert ? 'bg-[var(--ad-or)]' : 'bg-[var(--ad-sable-fonce)]')} />
          {maintenant ? (ouvert ? 'Ouvert maintenant' : prochain) : ' '}
        </p>
        <ul className="mt-8 border-t border-[var(--ad-sable-fonce)]">
          {JOURS.map((j, i) => (
            <li key={j} className={cn('flex justify-between border-b border-[var(--ad-sable-fonce)] py-3 text-[15px] capitalize', i === jourIndex && maintenant ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-pierre)]')}>
              <span>{j}</span>
              <span className="normal-case">{heureDe(i) ?? 'Fermé'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** L'INVITATION — un lien seul, très grand : le filet se trace sous le
 *  texte et la flèche avance quand on le survole. */
export function Invitation({ libelle, href }: { libelle: string; href: string }) {
  return (
    <a href={href} className="group inline-flex items-center gap-5 text-[var(--ad-nuit)]">
      <span className="relative font-[family-name:var(--ad-titre)] text-[clamp(26px,3.2vw,44px)] leading-none">
        {libelle}
        <span aria-hidden="true" className="absolute -bottom-2 left-0 h-px w-full bg-[var(--ad-sable-fonce)]" />
        <span aria-hidden="true" className="absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-[var(--ad-nuit)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      </span>
      <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-[var(--ad-sable-fonce)] transition-colors duration-500 group-hover:border-[var(--ad-nuit)] group-hover:bg-[var(--ad-nuit)] group-hover:text-white">
        <ArrowRight className="h-5 w-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
      </span>
    </a>
  )
}
