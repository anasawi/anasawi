'use client'

import { ArrowRight, ArrowUpRight, CalendarCheck, Check, Clock, Copy, Mail, MapPin, Phone, Video } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useRef, useState } from 'react'

import { Compteur, Edition, useAvancement } from './vivant'
import { cn, toE164 } from '@/lib/utils'
import type { FaqItem, Media, OpeningHour, ServiceWithMedia } from '@/server/db/schema'

/**
 * LES MODÈLES D'EXCEPTION de la version moderne — vitrine : /moderne/exception.
 *
 * L'esprit Qeeps, aux couleurs d'Anasawi :
 * - des blocs DROITS, alignés, arrondis — rien qui part dans tous les sens ;
 * - de la COULEUR : six teintes pastel, chacune avec son encre, qui
 *   habillent tuiles, pastilles, onglets et blocs ;
 * - des animations SIMPLES mais qui surprennent : une apparition qui
 *   monte de 20 px, une pastille qui « pop », une coche qui se dessine, un
 *   message qui s'écrit, une couleur qui change. Une idée par section.
 *
 * Rien ne bouge pour qui a demandé moins d'animations, et l'éditeur fige
 * les mises en scène (useVu → tout est visible d'emblée).
 */

const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const accent = (texte: string) => texte.split('*').map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
const propre = (t: string) => t.replace(/\*/g, '')
const n2 = (i: number) => String(i + 1).padStart(2, '0')

/** Les six teintes : un fond pastel, une encre assortie. */
export const TEINTES = [
  { fond: '#d9f0ee', encre: '#2b7a77' }, // lagon
  { fond: '#f8e3d6', encre: '#a3582f' }, // abricot
  { fond: '#e2eedb', encre: '#4c7a45' }, // sauge
  { fond: '#f5dfe4', encre: '#a24a62' }, // rose
  { fond: '#e6e2f6', encre: '#5d4f9c' }, // lavande
  { fond: '#dce8f6', encre: '#36628f' }, // ciel
] as const
const teinte = (i: number) => TEINTES[((i % TEINTES.length) + TEINTES.length) % TEINTES.length]!

/** Les courbes : l'apparition Qeeps (Framer) et le petit rebond. */
const APPARITION = 'cubic-bezier(0.02,0.45,0.56,1)'
const REBOND = 'cubic-bezier(0.34,1.56,0.64,1)'
const OMBRE = 'shadow-[0_1px_2px_rgba(46,66,79,0.06),0_18px_40px_-24px_rgba(46,66,79,0.35)]'

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

/** Un minuteur qui tourne tant que la section est à l'écran (et pas survolée). */
function useCadence(actif: boolean, ms: number, cb: () => void) {
  const rappel = useRef(cb)
  useEffect(() => {
    rappel.current = cb
  })
  useEffect(() => {
    if (!actif || reduit()) return
    const t = window.setInterval(() => rappel.current(), ms)
    return () => window.clearInterval(t)
  }, [actif, ms])
}

/** L'apparition Qeeps : 20 px de montée, en fondu, avec un délai. */
const monte = (vu: boolean, delai = 0) => ({
  opacity: vu ? 1 : 0,
  transform: vu ? 'none' : 'translateY(20px)',
  transition: `opacity 1.1s ${APPARITION} ${delai}s, transform 1.1s ${APPARITION} ${delai}s`,
})
/** Le « pop » : la pastille grandit avec un petit rebond. */
const pop = (vu: boolean, delai = 0) => ({
  opacity: vu ? 1 : 0,
  transform: vu ? 'none' : 'scale(0.6)',
  transition: `opacity 0.5s ${delai}s, transform 0.7s ${REBOND} ${delai}s`,
})

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

/** LES TUILES — à côté du titre, six tuiles en damier, photos et couleurs ;
 *  elles arrivent une à une avec un petit rebond, puis, de temps en temps,
 *  l'une d'elles change : une autre photo, une autre couleur, un autre mot. */
export function Tuiles({ photos, mots }: { photos: Media[]; mots: string[] }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [etat, setEtat] = useState([0, 0, 0, 0, 0, 0])
  const tour = useRef(0)
  useCadence(vu && photos.length > 0, 2200, () => {
    const i = [0, 4, 2, 3, 1, 5][tour.current++ % 6]!
    setEtat((e) => e.map((v, k) => (k === i ? v + 1 : v)))
  })
  return (
    <div ref={ref} className="grid grid-cols-3 gap-3 sm:gap-4">
      {etat.map((n, i) => {
        const estPhoto = (i + Math.floor(i / 3)) % 2 === 0
        const p = photos.length ? photos[(i + n * 3) % photos.length] : null
        const t = teinte(i + n)
        const mot = mots.length ? mots[(i + n) % mots.length] : ''
        return (
          <div key={i} className="relative aspect-square overflow-hidden rounded-[22px]" style={pop(vu, 0.15 + i * 0.08)}>
            {estPhoto && p ? (
              <Image key={`${p.id}-${n}`} src={p.url} alt={n === 0 ? p.alt : ''} fill sizes="240px" className="object-cover motion-safe:animate-[ad-tuile_0.9s_cubic-bezier(0.22,1,0.36,1)_backwards]" />
            ) : (
              <div key={n} className="absolute inset-0 grid place-items-center p-3 text-center motion-safe:animate-[ad-tuile_0.9s_cubic-bezier(0.22,1,0.36,1)_backwards]" style={{ background: t.fond, color: t.encre }}>
                <span className="font-[family-name:var(--ad-titre)] text-[clamp(15px,1.9vw,24px)] italic leading-tight">{mot}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** LE SURLIGNÉ — un grand titre centré ; le mot clé est surligné d'une
 *  couleur qui se pose, puis change doucement, de teinte en teinte. */
export function Surligne({ titre }: { titre: string }) {
  const [ref, vu] = useVu<HTMLHeadingElement>('0%')
  const [k, setK] = useState(0)
  useCadence(vu, 2600, () => setK((x) => x + 1))
  const t = teinte(k)
  return (
    <h1 ref={ref} className="text-center text-[clamp(44px,7.5vw,112px)] leading-[1.05] tracking-[-0.03em] [&_em]:not-italic" style={monte(vu)}>
      {titre.split('\n').map((ligne, l) => (
        <span key={l} className="block">
          {ligne.split('*').map((m, i) =>
            i % 2 ? (
              <span key={i} className="relative isolate inline-block px-[0.12em] italic">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-[0.06em] top-[0.2em] origin-left rounded-[0.2em]"
                  style={{ background: t.fond, transform: vu ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 0.9s ${APPARITION} 0.5s, background-color 0.9s` }}
                />
                <span className="relative" style={{ color: t.encre, transition: 'color 0.9s' }}>{m}</span>
              </span>
            ) : (
              m
            ),
          )}
        </span>
      ))}
    </h1>
  )
}

/** Des pastilles colorées qui « pop » l'une après l'autre. */
export function Pastilles({ mots, delai = 0.6, className }: { mots: string[]; delai?: number; className?: string }) {
  const [ref, vu] = useVu<HTMLUListElement>('0%')
  return (
    <ul ref={ref} className={cn('flex flex-wrap gap-2.5', className)}>
      {mots.map((m, i) => {
        const t = teinte(i)
        return (
          <li key={m + i} className="rounded-full px-4 py-2 text-[14px] font-semibold" style={{ background: t.fond, color: t.encre, ...pop(vu, delai + i * 0.08) }}>
            {m}
          </li>
        )
      })}
    </ul>
  )
}

/** LA FENÊTRE — la photo dans une fenêtre d'application qui s'élargit au
 *  défilement ; deux petites notifications viennent s'y poser. */
export function Fenetre({ photo, notes }: { photo: Media | null; notes: { titre: string; texte: string }[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const [vuRef, vu] = useVu<HTMLDivElement>()
  const icones = [CalendarCheck, Video]
  return (
    <div ref={ref} className="[--p:0.5]">
      <div ref={vuRef} className="relative mx-auto" style={{ width: 'calc(78% + clamp(0, calc((var(--p) - 0.15) * 1.6), 1) * 22%)' }}>
        <div className={cn('overflow-hidden rounded-[28px] bg-white', OMBRE)}>
          <div className="flex items-center gap-2 border-b border-[var(--ad-sable)] px-5 py-3.5">
            {['#f0b9a8', '#f3d9a4', '#bfe0c3'].map((c) => (
              <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            ))}
            <span className="mx-auto rounded-full bg-[var(--ad-sable)] px-4 py-1 text-[12px] text-[var(--ad-gris)]">anasawi.fr</span>
          </div>
          <div className="relative aspect-[16/8] bg-[var(--ad-sable)]">{photo && <Image src={photo.url} alt={photo.alt} fill sizes="1200px" className="object-cover" />}</div>
        </div>
        {notes.slice(0, 2).map((n, i) => {
          const Icone = icones[i] ?? CalendarCheck
          const t = teinte(i * 2)
          return (
            <div
              key={i}
              className={cn('absolute flex items-center gap-3 rounded-[18px] bg-white py-3 pl-3 pr-5', OMBRE, i === 0 ? '-left-[3%] bottom-[12%]' : '-right-[3%] top-[22%] max-sm:hidden')}
              style={pop(vu, 0.9 + i * 0.35)}
            >
              <span className="relative grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: t.fond, color: t.encre }}>
                <Icone className="h-5 w-5" />
                {i === 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white" style={{ background: t.encre }} />}
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-[var(--ad-nuit)]">{n.titre}</span>
                <span className="block text-[12.5px] text-[var(--ad-gris)]">{n.texte}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

/** LA CARTE DE VISITE — sur un bloc coloré, une carte : le portrait avec
 *  son point « disponible » qui pulse, puis les pastilles qui poppent et
 *  les coordonnées qui glissent en place. */
export function CarteVisite({ portrait, nom, metier, tags, infos }: { portrait: Media | null; nom: string; metier: string; tags: string[]; infos: string[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const icones = [MapPin, Phone, Clock]
  return (
    <div ref={ref} className="rounded-[32px] p-[clamp(20px,5vw,56px)]" style={{ background: teinte(0).fond }}>
      <div className={cn('mx-auto max-w-[400px] rounded-[24px] bg-white p-6', OMBRE)} style={monte(vu)}>
        <div className="flex items-center gap-4">
          <span className="relative h-16 w-16 shrink-0">
            <span className="block h-full w-full overflow-hidden rounded-[18px] bg-[var(--ad-sable)]">
              {portrait && <Image src={portrait.url} alt={portrait.alt} width={64} height={64} className="h-full w-full object-cover" />}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white">
              <span className="absolute h-2.5 w-2.5 rounded-full bg-[#5fae7b] motion-safe:animate-[ad-pouls_1.8s_ease-out_infinite]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#5fae7b]" />
            </span>
          </span>
          <span>
            <span className="block font-[family-name:var(--ad-titre)] text-[22px] leading-tight text-[var(--ad-nuit)]">{nom}</span>
            <span className="block text-[14px] text-[var(--ad-gris)]">{metier}</span>
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.slice(0, 4).map((m, i) => {
            const t = teinte(i + 1)
            return (
              <span key={m} className="rounded-full px-3 py-1 text-[12.5px] font-semibold" style={{ background: t.fond, color: t.encre, ...pop(vu, 0.5 + i * 0.1) }}>
                {m}
              </span>
            )
          })}
        </div>
        <ul className="mt-5 flex flex-col gap-2 border-t border-[var(--ad-sable)] pt-4">
          {infos.map((x, i) => {
            const Icone = icones[i] ?? MapPin
            return (
              <li key={x} className="flex items-center gap-3 text-[14px] text-[var(--ad-pierre)]" style={{ opacity: vu ? 1 : 0, transform: vu ? 'none' : 'translateX(-12px)', transition: `all 0.8s ${APPARITION} ${0.9 + i * 0.12}s` }}>
                <Icone className="h-4 w-4 shrink-0 text-[var(--ad-gris)]" />
                {x}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** LES CHIFFRES EN COULEUR — chaque chiffre dans son bloc : la couleur
 *  monte du bas pour le remplir, et le nombre compte jusqu'à sa valeur. */
export function ChiffresCouleur({ chiffres }: { chiffres: { valeur: string; libelle: string }[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {chiffres.map((c, i) => {
        const t = teinte(i * 2)
        const m = c.valeur.match(/^(\d+)(.*)$/)
        return (
          <div key={i} className="relative overflow-hidden rounded-[28px] bg-white p-8" style={{ color: t.encre }}>
            <span aria-hidden="true" className="absolute inset-0 origin-bottom" style={{ background: t.fond, transform: vu ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 1.2s ${APPARITION} ${0.1 + i * 0.15}s` }} />
            <span className="relative block font-[family-name:var(--ad-titre)] text-[clamp(64px,8vw,104px)] leading-none tracking-[-0.04em]">
              {m ? (
                <>
                  {vu ? <Compteur valeur={Number(m[1])} /> : '0'}
                  <span className="text-[0.45em]">{m[2]}</span>
                </>
              ) : (
                c.valeur
              )}
            </span>
            <span className="relative mt-6 block text-[15px] font-semibold">{c.libelle}</span>
          </div>
        )
      })}
    </div>
  )
}

/** LA MOSAÏQUE — photos et tuiles de couleur en grille ; chaque case
 *  s'ouvre comme un volet coloré qui s'efface, l'une après l'autre. */
export function Mosaique({ photos, mots }: { photos: Media[]; mots: string[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const cases = [
    { type: 'photo', c: 'col-span-2 row-span-2' },
    { type: 'mot', c: '' },
    { type: 'photo', c: '' },
    { type: 'photo', c: '' },
    { type: 'mot', c: '' },
  ] as const
  let ip = 0
  let im = 0
  return (
    <div ref={ref} className="grid auto-rows-[clamp(130px,16vw,210px)] grid-cols-2 gap-4 md:grid-cols-4">
      {cases.map((k, i) => {
        const t = teinte(i + 1)
        const p = k.type === 'photo' ? photos[ip++ % Math.max(1, photos.length)] : null
        const mot = k.type === 'mot' ? mots[im++ % Math.max(1, mots.length)] : null
        return (
          <div key={i} className={cn('relative overflow-hidden rounded-[24px]', k.c)} style={{ background: t.fond }}>
            {p && <Image src={p.url} alt={p.alt} fill sizes="600px" className="object-cover" style={{ transform: vu ? 'scale(1)' : 'scale(1.15)', transition: `transform 1.6s ${APPARITION} ${0.2 + i * 0.12}s` }} />}
            {mot && (
              <span className="absolute inset-0 grid place-items-center p-4 text-center font-[family-name:var(--ad-titre)] text-[clamp(18px,2vw,26px)] italic" style={{ color: t.encre, ...monte(vu, 0.5 + i * 0.12) }}>
                {mot}
              </span>
            )}
            {/* Le volet de couleur qui s'efface. */}
            {p && <span aria-hidden="true" className="absolute inset-0 origin-right" style={{ background: t.fond, transform: vu ? 'scaleX(0)' : 'scaleX(1)', transition: `transform 1s ${APPARITION} ${0.15 + i * 0.12}s` }} />}
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MA MÉTHODE
   ══════════════════════════════════════════════════════════════════════ */

type Etape = { titre: string; texte: string }

/** LES ÉTAPES À COCHER — une liste façon application : au défilement,
 *  chaque étape se coche, sa coche se dessine et sa ligne se colore. */
export function Coche({ etapes }: { etapes: Etape[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const n = Math.max(1, etapes.length)
  const avance = 'clamp(0, calc((var(--p) - 0.22) * 2.4), 1)'
  return (
    <div ref={ref} className="mx-auto max-w-[720px] rounded-[32px] bg-[var(--ad-sable)] p-3 [--p:1] sm:p-4">
      <div className="flex items-center justify-between px-4 pb-4 pt-3">
        <span className="text-[13px] font-semibold text-[var(--ad-pierre)]">Votre parcours</span>
        <span className="relative h-1.5 w-32 overflow-hidden rounded-full bg-white">
          <span className="absolute inset-y-0 left-0 w-full origin-left rounded-full" style={{ background: teinte(2).encre, transform: `scaleX(${avance})` }} />
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {etapes.map((e, i) => {
          const t = teinte(i * 2 + 2)
          const fait = `clamp(0, calc((${avance} - ${(i / n).toFixed(3)}) * ${n * 4}), 1)`
          return (
            <li key={i} className="flex items-start gap-4 rounded-[20px] p-5" style={{ background: `color-mix(in srgb, ${t.fond} calc(${fait} * 100%), white)` }}>
              <span className="relative mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: t.encre, background: `color-mix(in srgb, ${t.encre} calc(${fait} * 100%), white)` }}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: `calc(1 - ${fait})` }} />
                </svg>
              </span>
              <span>
                <span className="block text-[18px] font-semibold text-[var(--ad-nuit)]">{e.titre}</span>
                {e.texte && <span className="mt-1 block text-[15px] leading-[1.6] text-[var(--ad-pierre)]">{e.texte}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** LES ONGLETS — des onglets de couleur qui avancent seuls, comme des
 *  « stories » : une barre se remplit dans l'onglet actif, puis le
 *  suivant prend le relais et le panneau change de couleur. */
export function Onglets({ etapes }: { etapes: Etape[] }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [i, setI] = useState(0)
  const [pause, setPause] = useState(false)
  const DUREE = 5200
  useCadence(vu && !pause && etapes.length > 1, DUREE, () => setI((x) => (x + 1) % etapes.length))
  const e = etapes[i]
  const t = teinte(i * 2 + 1)
  if (!e) return null
  return (
    <div ref={ref} onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
      <div className="flex flex-wrap gap-2">
        {etapes.map((x, k) => {
          const tk = teinte(k * 2 + 1)
          return (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              className="relative overflow-hidden rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors duration-500"
              style={k === i ? { background: tk.fond, color: tk.encre } : { background: 'var(--ad-sable)', color: 'var(--ad-pierre)' }}
            >
              {k === i && !pause && vu && <span key={i} aria-hidden="true" className="absolute inset-y-0 left-0 w-full origin-left opacity-25 motion-safe:animate-[ad-remplir_linear_forwards]" style={{ background: tk.encre, animationDuration: `${DUREE}ms` }} />}
              <span className="relative">
                {n2(k)} · {x.titre}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-5 grid min-h-[300px] items-end rounded-[32px] p-[clamp(28px,5vw,56px)] transition-colors duration-700" style={{ background: t.fond, color: t.encre }}>
        <div key={i} className="motion-safe:animate-[ad-tuile_0.8s_cubic-bezier(0.22,1,0.36,1)_backwards]">
          <span className="font-[family-name:var(--ad-titre)] text-[clamp(64px,9vw,120px)] leading-none opacity-40">{n2(i)}</span>
          <h3 className="mt-4 text-[clamp(28px,3.4vw,44px)] leading-[1.1]" style={{ color: t.encre }}>
            {e.titre}
          </h3>
          {e.texte && <p className="mt-3 max-w-[52ch] text-[16.5px] leading-[1.65] text-[var(--ad-nuit)]/80">{e.texte}</p>}
        </div>
      </div>
    </div>
  )
}

/** LA PILE DE COULEURS — chaque étape sur un grand bloc de couleur ; au
 *  défilement, ils viennent se poser les uns sur les autres. */
export function PileCouleurs({ etapes }: { etapes: Etape[] }) {
  return (
    <ol className="mx-auto max-w-[920px]">
      {etapes.map((e, i) => {
        const t = teinte(i * 2 + 3)
        return (
          <li key={i} className="sticky mb-[14vh] last:mb-0" style={{ top: `calc(100px + ${Math.min(i, 5) * 18}px)` }}>
            <div className={cn('grid min-h-[300px] gap-6 rounded-[32px] p-[clamp(28px,5vw,56px)] sm:grid-cols-[auto_1fr] sm:items-end', OMBRE)} style={{ background: t.fond, color: t.encre }}>
              <span className="font-[family-name:var(--ad-titre)] text-[clamp(72px,10vw,140px)] leading-none">{n2(i)}</span>
              <div>
                <h3 className="text-[clamp(26px,3vw,38px)] leading-[1.1]" style={{ color: t.encre }}>
                  {e.titre}
                </h3>
                {e.texte && <p className="mt-3 max-w-[48ch] text-[16px] leading-[1.65] text-[var(--ad-nuit)]/80">{e.texte}</p>}
              </div>
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

/** LES CARTES DE COULEUR — une carte par accompagnement, chacune dans sa
 *  teinte ; elles montent l'une après l'autre et la photo se pose. */
export function CartesCouleur({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <div ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s, i) => {
        const t = teinte(i)
        return (
          <a key={s.id} href={rdv} className="group flex flex-col rounded-[28px] p-3 transition-transform duration-500 hover:-translate-y-1.5" style={{ background: t.fond, ...monte(vu, 0.1 + i * 0.1) }}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-white/50">
              {s.media && <Image src={s.media.url} alt="" fill sizes="380px" className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" style={{ transform: vu ? undefined : 'scale(1.15)' }} />}
              {s.duration && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[var(--ad-nuit)]">{s.duration}</span>}
            </div>
            <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
              <h3 className="text-[24px] leading-[1.15]" style={{ color: t.encre }}>
                {s.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-[14.5px] leading-[1.6] text-[var(--ad-nuit)]/75">{propre(s.excerpt)}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold" style={{ color: t.encre }}>
                Prendre rendez-vous <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
              </span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

/** LA LISTE QUI DÉFILE — les accompagnements en rangées, chacune avec sa
 *  pastille de couleur, qui montent sans fin dans un bloc ; survolée, la
 *  liste s'arrête. */
export function ListeDefilante({ services }: { services: ServiceWithMedia[] }) {
  return (
    <div className="group/liste h-[460px] overflow-hidden rounded-[32px] bg-[var(--ad-sable)] px-4 [mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent)]">
      <ul className="flex flex-col gap-3 py-3 group-hover/liste:[animation-play-state:paused] motion-safe:animate-[ad-colonne_26s_linear_infinite]">
        {[0, 1, 2].map((tour) =>
          services.map((s, i) => {
            const t = teinte(i)
            return (
              <li key={`${tour}-${s.id}`} aria-hidden={tour > 0 || undefined} className="flex items-center gap-4 rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgba(46,66,79,0.06)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] font-[family-name:var(--ad-titre)] text-[18px]" style={{ background: t.fond, color: t.encre }}>
                  {s.title.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-[var(--ad-nuit)]">{s.title}</span>
                  <span className="block truncate text-[13px] text-[var(--ad-gris)]">{s.duration ?? propre(s.excerpt)}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--ad-gris)]" />
              </li>
            )
          }),
        )}
      </ul>
    </div>
  )
}

/** LE SÉLECTEUR — des pastilles en haut ; elles s'enchaînent seules (ou au
 *  clic), et le grand bloc dessous change de couleur et de photo. */
export function Selecteur({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [i, setI] = useState(0)
  const [pause, setPause] = useState(false)
  useCadence(vu && !pause && services.length > 1, 4200, () => setI((x) => (x + 1) % services.length))
  const s = services[i]
  const t = teinte(i)
  if (!s) return null
  return (
    <div ref={ref} onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
      <div className="flex flex-wrap justify-center gap-2">
        {services.map((x, k) => {
          const tk = teinte(k)
          return (
            <button key={x.id} type="button" onClick={() => setI(k)} className="rounded-full px-5 py-2.5 text-[14px] font-semibold transition-[background-color,color,transform] duration-500" style={k === i ? { background: tk.fond, color: tk.encre, transform: 'scale(1.06)' } : { background: 'white', color: 'var(--ad-pierre)' }}>
              {x.title}
            </button>
          )
        })}
      </div>
      <div className="mt-8 grid overflow-hidden rounded-[36px] transition-colors duration-700 md:grid-cols-2" style={{ background: t.fond }}>
        <div key={`t-${s.id}`} className="flex flex-col justify-center p-[clamp(28px,5vw,60px)] motion-safe:animate-[ad-tuile_0.8s_cubic-bezier(0.22,1,0.36,1)_backwards]">
          {s.duration && <span className="w-fit rounded-full bg-white px-3 py-1 text-[12.5px] font-semibold" style={{ color: t.encre }}>{s.duration}</span>}
          <h3 className="mt-5 text-[clamp(30px,3.6vw,48px)] leading-[1.05]" style={{ color: t.encre }}>
            {s.title}
          </h3>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.7] text-[var(--ad-nuit)]/80">{propre(s.excerpt)}</p>
          <a href={rdv} className="mt-7 inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5" style={{ background: t.encre }}>
            Prendre rendez-vous <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="relative min-h-[280px]">
          {s.media && (
            <div key={`p-${s.id}`} className="absolute inset-3 overflow-hidden rounded-[26px] motion-safe:animate-[ad-tuile_0.9s_cubic-bezier(0.22,1,0.36,1)_backwards] md:inset-4">
              <Image src={s.media.url} alt={s.media.alt} fill sizes="600px" className="object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

/** LA CONVERSATION — une fenêtre de messagerie : la question arrive en
 *  bulle colorée, trois petits points, puis la réponse. Et la suivante. */
export function Conversation({ faq, nom }: { faq: FaqItem[]; nom: string }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [etape, setEtape] = useState(0)
  useCadence(vu && faq.length > 0, 1500, () => setEtape((x) => x + 1))
  /* Chaque échange dure 5 temps : question (1), points (2), réponse (3-5). */
  const echange = Math.floor(etape / 5)
  const phase = etape % 5
  const messages: { cote: 'moi' | 'elle' | 'points'; texte: string; cle: string }[] = []
  for (let k = Math.max(0, echange - 1); k <= echange; k++) {
    const f = faq[k % Math.max(1, faq.length)]
    if (!f) break
    messages.push({ cote: 'moi', texte: f.question, cle: `q${k}` })
    if (k < echange || phase >= 2) messages.push({ cote: 'elle', texte: propre(f.answer), cle: `r${k}` })
    else if (phase === 1) messages.push({ cote: 'points', texte: '', cle: `p${k}` })
  }
  const t = teinte(echange)
  return (
    <div ref={ref} className={cn('mx-auto max-w-[680px] overflow-hidden rounded-[28px] bg-white', OMBRE)}>
      <div className="flex items-center gap-3 border-b border-[var(--ad-sable)] px-5 py-4">
        <span className="relative grid h-10 w-10 place-items-center rounded-full font-[family-name:var(--ad-titre)] text-[18px]" style={{ background: teinte(0).fond, color: teinte(0).encre }}>
          {nom.slice(0, 1)}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#5fae7b]" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-[var(--ad-nuit)]">{nom}</span>
          <span className="block text-[12.5px] text-[var(--ad-gris)]">Répond à vos questions</span>
        </span>
      </div>
      <div className="flex h-[440px] flex-col justify-end gap-3 overflow-hidden bg-[var(--ad-ivoire)] p-5">
        {messages.map((m) => (
          <div key={m.cle} className={cn('max-w-[82%] motion-safe:animate-[ad-bulle_0.5s_cubic-bezier(0.34,1.4,0.64,1)_backwards]', m.cote === 'moi' ? 'self-end' : 'self-start')}>
            {m.cote === 'points' ? (
              <span className="flex gap-1 rounded-[18px] rounded-bl-[6px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(46,66,79,0.08)]">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 rounded-full bg-[var(--ad-gris)] motion-safe:animate-[ad-points_1.2s_ease-in-out_infinite]" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </span>
            ) : (
              <p
                className={cn('whitespace-pre-line px-4 py-3 text-[15px] leading-[1.55]', m.cote === 'moi' ? 'rounded-[18px] rounded-br-[6px] font-semibold' : 'rounded-[18px] rounded-bl-[6px] bg-white text-[var(--ad-pierre)] shadow-[0_1px_2px_rgba(46,66,79,0.08)]')}
                style={m.cote === 'moi' ? { background: t.fond, color: t.encre } : undefined}
              >
                {m.texte}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** L'ACCORDÉON EN COULEUR — chaque question a sa pastille ; ouverte, sa
 *  ligne entière prend la couleur et la réponse se déplie. */
export function AccordeonCouleur({ faq }: { faq: FaqItem[] }) {
  const [ouvert, setOuvert] = useState<number | null>(0)
  return (
    <ul className="mx-auto flex max-w-[820px] flex-col gap-2.5">
      {faq.map((f, i) => {
        const o = ouvert === i
        const t = teinte(i)
        return (
          <li key={f.id} className="rounded-[22px] transition-colors duration-500" style={{ background: o ? t.fond : 'white' }}>
            <button type="button" onClick={() => setOuvert(o ? null : i)} aria-expanded={o} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-[13px] font-semibold tabular-nums transition-colors duration-500" style={o ? { background: 'white', color: t.encre } : { background: t.fond, color: t.encre }}>
                {n2(i)}
              </span>
              <span className="flex-1 text-[16.5px] font-semibold leading-[1.35]" style={{ color: o ? t.encre : 'var(--ad-nuit)' }}>
                {f.question}
              </span>
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[18px] transition-transform duration-500', o && 'rotate-45')} style={{ color: t.encre }}>
                +
              </span>
            </button>
            <div className={cn('grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', o ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <p className="whitespace-pre-line px-5 pb-6 text-[15.5px] leading-[1.7] text-[var(--ad-nuit)]/80 sm:pl-[76px]">{propre(f.answer)}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** LES QUESTIONS QUI DÉFILENT — à droite, les questions montent sans fin
 *  sur des pastilles de couleur ; on en touche une, sa réponse s'affiche. */
export function QuestionsDefilantes({ faq }: { faq: FaqItem[] }) {
  const [i, setI] = useState(0)
  const q = faq[i]
  const t = teinte(i)
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex min-h-[320px] flex-col justify-end rounded-[32px] p-[clamp(28px,4vw,48px)] transition-colors duration-700" style={{ background: t.fond }}>
        {q && (
          <div key={q.id} className="motion-safe:animate-[ad-tuile_0.7s_cubic-bezier(0.22,1,0.36,1)_backwards]">
            <p className="font-[family-name:var(--ad-titre)] text-[clamp(24px,2.6vw,32px)] leading-[1.2]" style={{ color: t.encre }}>
              {q.question}
            </p>
            <p className="mt-4 whitespace-pre-line text-[15.5px] leading-[1.7] text-[var(--ad-nuit)]/80">{propre(q.answer)}</p>
          </div>
        )}
      </div>
      <div className="group/q h-[440px] overflow-hidden rounded-[32px] bg-[var(--ad-sable)] px-4 [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]">
        <ul className="flex flex-col gap-2.5 py-3 group-hover/q:[animation-play-state:paused] motion-safe:animate-[ad-colonne_34s_linear_infinite]">
          {[0, 1].map((tour) =>
            faq.map((f, k) => {
              const tk = teinte(k)
              return (
                <li key={`${tour}-${f.id}`}>
                  <button type="button" tabIndex={tour ? -1 : 0} aria-hidden={tour ? true : undefined} onClick={() => setI(k)} className="flex w-full items-center gap-3 rounded-[16px] bg-white p-3.5 text-left text-[15px] font-semibold text-[var(--ad-nuit)] transition-transform duration-300 hover:scale-[1.02]">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: tk.encre }} />
                    {f.question}
                  </button>
                </li>
              )
            }),
          )}
        </ul>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS & VIDÉOS
   ══════════════════════════════════════════════════════════════════════ */

/** LA GALERIE QUI FAIT LE POINT — une grille droite ; on en survole une,
 *  les autres s'effacent en douceur et sa légende apparaît en pastille. */
export function GalerieFocus({ photos }: { photos: Media[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <div ref={ref} className="group/g grid grid-cols-2 gap-4 md:grid-cols-3">
      {photos.slice(0, 6).map((p, i) => {
        const t = teinte(i)
        return (
          <figure key={p.id} className="group/p relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[var(--ad-sable)] transition-[opacity,filter,transform] duration-500 group-hover/g:opacity-40 group-hover/g:grayscale hover:!opacity-100 hover:!grayscale-0 hover:scale-[1.02]" style={pop(vu, 0.1 + i * 0.08)}>
            <Image src={p.url} alt={p.alt} fill sizes="(max-width: 768px) 50vw, 400px" className="object-cover" />
            {p.caption && (
              <figcaption className="absolute bottom-3 left-3 translate-y-2 rounded-full px-3 py-1.5 text-[13px] font-semibold opacity-0 transition-[opacity,transform] duration-500 group-hover/p:translate-y-0 group-hover/p:opacity-100" style={{ background: t.fond, color: t.encre }}>
                {p.caption}
              </figcaption>
            )}
          </figure>
        )
      })}
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
            style={{ zIndex: 10 + i, transform: `translateX(-50%) translateX(calc(${ouv} * ${k} * var(--pas))) rotate(calc(${ouv} * ${k * 4}deg)) translateY(calc(${ouv} * ${Math.abs(k) * 3}%))` }}
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
 *  fondus ; survolée, elle s'arrête. Les légendes en pastilles colorées. */
export function Frise({ photos }: { photos: Media[] }) {
  return (
    <div className="group/frise overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="flex w-max gap-5 group-hover/frise:[animation-play-state:paused] motion-safe:animate-[ad-defiler_70s_linear_infinite]">
        {[0, 1].map((tour) =>
          photos.map((p, i) => {
            const t = teinte(i)
            return (
              <figure key={`${tour}-${p.id}`} aria-hidden={tour === 1 || undefined} className="shrink-0">
                <div className={cn('relative h-[clamp(220px,28vw,340px)] overflow-hidden rounded-[24px] bg-[var(--ad-sable)]', i % 2 ? 'aspect-[4/5]' : 'aspect-[3/2]')}>
                  <Image src={p.url} alt={tour === 0 ? p.alt : ''} fill sizes="480px" className="object-cover" />
                </div>
                {p.caption && (
                  <figcaption className="mt-3 w-fit rounded-full px-3 py-1 text-[12.5px] font-semibold" style={{ background: t.fond, color: t.encre }}>
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            )
          }),
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TEXTES
   ══════════════════════════════════════════════════════════════════════ */

/** LA LECTURE — une grande phrase dont les mots s'encrent au fil du
 *  défilement, comme si on la lisait ; les mots clés se surlignent. */
export function Lecture({ phrase, auteur }: { phrase: string; auteur: string }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const mots = phrase.split(/\s+/).filter(Boolean)
  const n = mots.length
  let dansAccent = false
  let rang = 0
  return (
    <div ref={ref} className="mx-auto max-w-[980px] text-center [--p:1]">
      <p className="font-[family-name:var(--ad-titre)] text-[clamp(30px,4.6vw,64px)] leading-[1.2] tracking-[-0.02em]">
        {mots.map((m, i) => {
          if (m.startsWith('*')) dansAccent = true
          const estAccent = dansAccent
          /* Le mot clé se ferme sur l'astérisque, même suivi d'une ponctuation (« *écoute*, »). */
          if (m.slice(1).includes('*')) dansAccent = false
          const lu = `clamp(0, calc((var(--p) - 0.2) * ${(n * 2.2).toFixed(1)} - ${i}), 1)`
          const t = teinte(rang)
          if (estAccent) rang++
          return (
            <span key={i}>
              <span
                className="relative inline-block rounded-[0.18em] px-[0.06em]"
                style={{
                  color: `color-mix(in srgb, ${estAccent ? t.encre : 'var(--ad-nuit)'} calc(${lu} * 100%), var(--ad-sable-fonce))`,
                  backgroundImage: estAccent ? `linear-gradient(${t.fond}, ${t.fond})` : undefined,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: estAccent ? `calc(${lu} * 100%) 100%` : undefined,
                }}
              >
                {m.replace(/\*/g, '')}
              </span>{' '}
            </span>
          )
        })}
      </p>
      {auteur && <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">{auteur}</p>}
    </div>
  )
}

/** LES ÉTIQUETTES — des mots sur des pastilles de couleur, en deux
 *  rangées droites qui défilent en sens contraire. */
export function Etiquettes({ mots }: { mots: string[] }) {
  const rangees = [mots, [...mots].reverse()]
  return (
    <div className="flex flex-col gap-4 overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      {rangees.map((r, k) => (
        <div key={k} className="flex w-max gap-4" style={{ animation: `${k ? 'ad-defiler-inverse' : 'ad-defiler'} ${44 + k * 10}s linear infinite` }}>
          {[0, 1, 2, 3].map((tour) =>
            r.map((m, i) => {
              const t = teinte(i + k * 3)
              return (
                <span key={`${tour}-${i}`} aria-hidden={tour > 0 || undefined} className="shrink-0 rounded-full px-7 py-4 font-[family-name:var(--ad-titre)] text-[clamp(20px,2.6vw,34px)]" style={{ background: t.fond, color: t.encre }}>
                  {m}
                </span>
              )
            }),
          )}
        </div>
      ))}
    </div>
  )
}

/** LE MOT QUI CHANGE — « Un lieu pour [respirer] » : le dernier mot est
 *  sur une pastille dont la couleur change avec lui ; il bascule. */
export function MotQuiChange({ debut, mots }: { debut: string; mots: string[] }) {
  const [ref, vu] = useVu<HTMLParagraphElement>('0%')
  const [k, setK] = useState(0)
  const mesure = useRef<HTMLSpanElement>(null)
  const [largeur, setLargeur] = useState<number | null>(null)
  useCadence(vu && mots.length > 1, 2400, () => setK((x) => (x + 1) % mots.length))
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
  const t = teinte(k)
  return (
    <p ref={ref} className="text-center font-[family-name:var(--ad-titre)] text-[clamp(40px,7vw,112px)] leading-[1.25] tracking-[-0.03em] text-[var(--ad-nuit)]">
      <span className="block sm:inline">{debut} </span>
      <span
        className="relative inline-block h-[1.2em] overflow-hidden rounded-[0.3em] align-middle transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [perspective:600px]"
        style={{ width: largeur ? `${largeur}px` : undefined, background: t.fond }}
      >
        {mots.map((m, i) => (
          <span
            key={i}
            aria-hidden={i !== k || undefined}
            className="absolute inset-0 grid place-items-center whitespace-nowrap pl-[0.3em] pr-[0.42em] italic [backface-visibility:hidden] transition-[transform,opacity] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              color: teinte(i).encre,
              transform: i === k ? 'translateY(0)' : i === (k - 1 + mots.length) % mots.length ? 'translateY(-100%)' : 'translateY(100%)',
              opacity: i === k ? 1 : 0,
            }}
          >
            {m}
          </span>
        ))}
        <span ref={mesure} aria-hidden="true" className="invisible absolute left-0 top-0 whitespace-nowrap pl-[0.3em] pr-[0.42em] italic">
          {mots[k]}
        </span>
      </span>
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT & RENDEZ-VOUS
   ══════════════════════════════════════════════════════════════════════ */

/** LA FICHE CONTACT — un bloc, une carte, des lignes avec leur pastille ;
 *  un clic sur le téléphone ou le courriel le copie (« Copié ! »). */
export function FicheContact({ adresse, telephone, email, acces }: { adresse: string | null; telephone: string | null; email: string | null; acces: string | null }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const [copie, setCopie] = useState<string | null>(null)
  const lignes = [
    adresse && { cle: 'adresse', Icone: MapPin, label: 'Adresse', valeur: adresse, href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`, copier: false },
    telephone && { cle: 'tel', Icone: Phone, label: 'Téléphone', valeur: telephone, href: `tel:${toE164(telephone)}`, copier: true },
    email && { cle: 'mail', Icone: Mail, label: 'Courriel', valeur: email, href: `mailto:${email}`, copier: true },
    acces && { cle: 'acces', Icone: Clock, label: 'Accès', valeur: acces, href: null, copier: false },
  ].filter((x): x is { cle: string; Icone: typeof MapPin; label: string; valeur: string; href: string | null; copier: boolean } => Boolean(x))
  const copier = async (cle: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v)
      setCopie(cle)
      window.setTimeout(() => setCopie(null), 1600)
    } catch {
      /* Le presse-papiers peut être refusé : le lien reste utilisable. */
    }
  }
  return (
    <div ref={ref} className="rounded-[36px] bg-[var(--ad-sable)] p-3 sm:p-4">
      <ul className={cn('flex flex-col divide-y divide-[var(--ad-sable)] rounded-[28px] bg-white', OMBRE)}>
        {lignes.map((l, i) => {
          const t = teinte(i * 2)
          return (
            <li key={l.cle} className="flex items-center gap-4 p-5" style={monte(vu, 0.1 + i * 0.12)}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px]" style={{ background: t.fond, color: t.encre, ...pop(vu, 0.3 + i * 0.12) }}>
                <l.Icone className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ad-gris)]">{l.label}</span>
                {l.href ? (
                  <a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block text-[16px] leading-[1.45] text-[var(--ad-nuit)] hover:underline">
                    {l.valeur}
                  </a>
                ) : (
                  <span className="block text-[15px] leading-[1.5] text-[var(--ad-pierre)]">{l.valeur}</span>
                )}
              </span>
              {l.copier && (
                <button type="button" onClick={() => copier(l.cle, l.valeur)} aria-label={`Copier : ${l.label}`} className="relative grid h-10 min-w-10 place-items-center rounded-full bg-[var(--ad-sable)] px-3 text-[13px] font-semibold text-[var(--ad-nuit)] transition-colors hover:bg-[var(--ad-sable-fonce)]">
                  {copie === l.cle ? (
                    <span className="flex items-center gap-1 motion-safe:animate-[ad-bulle_0.4s_cubic-bezier(0.34,1.4,0.64,1)_backwards]" style={{ color: t.encre }}>
                      <Check className="h-4 w-4" /> Copié
                    </span>
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </li>
          )
        })}
      </ul>
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

/** LA SEMAINE — sept tuiles de couleur, une par jour ; celle d'aujourd'hui
 *  se lève avec son point qui pulse, et l'on sait si c'est ouvert. */
export function Semaine({ horaires }: { horaires: OpeningHour[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
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
    <div ref={ref}>
      <p className="mx-auto mb-10 flex w-fit items-center gap-3 rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold text-[var(--ad-nuit)] shadow-[0_1px_2px_rgba(46,66,79,0.08)]" style={pop(vu)}>
        <span className="relative grid h-3 w-3 place-items-center">
          {ouvert && <span className="absolute inset-0 rounded-full bg-[#5fae7b] motion-safe:animate-[ad-pouls_1.8s_ease-out_infinite]" />}
          <span className={cn('relative h-2.5 w-2.5 rounded-full', ouvert ? 'bg-[#5fae7b]' : 'bg-[var(--ad-sable-fonce)]')} />
        </span>
        {statut}
      </p>
      <div className="-mx-[5vw] flex snap-x gap-3 overflow-x-auto px-[5vw] pb-4 pt-6 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0">
        {JOURS.map((j, i) => {
          const heures = heureDe(i) ?? 'Fermé'
          const ferme = /ferm/i.test(heures)
          const leve = i === auj
          const t = teinte(i)
          return (
            <div key={j} className="w-[124px] shrink-0 snap-center md:w-auto" style={monte(vu, 0.15 + i * 0.07)}>
              <div
                className={cn('flex aspect-[3/4] flex-col justify-between rounded-[22px] p-4 transition-transform duration-700', leve && '-translate-y-4 shadow-[0_24px_40px_-24px_rgba(46,66,79,0.6)]')}
                style={leve ? { background: 'var(--ad-nuit)', color: 'white' } : ferme ? { background: 'white', color: 'var(--ad-gris)' } : { background: t.fond, color: t.encre }}
              >
                <span className="font-[family-name:var(--ad-titre)] text-[clamp(18px,1.7vw,24px)] capitalize leading-none">{j}</span>
                <span className="text-[13px] font-semibold leading-[1.35]">{heures}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** L'APPEL EN COULEUR — un grand bloc dont la couleur glisse lentement de
 *  teinte en teinte ; le bouton a un halo discret qui respire. */
export function AppelCouleur({ titre, libelle, href, texte }: { titre: string; libelle: string; href: string; texte: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const degrade = `linear-gradient(120deg, ${TEINTES.map((t) => t.fond).join(', ')}, ${TEINTES[0].fond})`
  return (
    <div ref={ref} className="relative overflow-hidden rounded-[40px] px-6 py-[clamp(72px,10vw,128px)] text-center motion-safe:animate-[ad-degrade_16s_ease-in-out_infinite_alternate]" style={{ backgroundImage: degrade, backgroundSize: '400% 100%' }}>
      <h2 className="mx-auto max-w-[16ch] text-[clamp(40px,6.4vw,92px)] leading-[1.02]" style={monte(vu)}>
        {accent(titre)}
      </h2>
      {texte && (
        <p className="mx-auto mt-6 max-w-[46ch] text-[17px] leading-[1.7] text-[var(--ad-nuit)]/75" style={monte(vu, 0.15)}>
          {texte}
        </p>
      )}
      <div className="mt-10 flex justify-center" style={pop(vu, 0.4)}>
        <a href={href} className="group relative inline-flex items-center gap-2.5 rounded-full bg-[var(--ad-nuit)] px-7 py-4 text-[15px] font-semibold text-white">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[var(--ad-nuit)] motion-safe:animate-[ad-halo_2.4s_ease-out_infinite]" />
          <span className="relative">{libelle}</span>
          <ArrowRight className="relative h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  )
}
