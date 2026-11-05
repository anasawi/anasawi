'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Mail, MapPin, Phone, X } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useRef, useState } from 'react'

import { useVu } from './exception'
import { Edition } from './vivant'
import { cn, toE164 } from '@/lib/utils'
import type { FaqItem, Media, ServiceWithMedia } from '@/server/db/schema'

/**
 * LA SÉRIE SIGNATURE — neuf sections plein écran, chacune une idée.
 *
 * LA DIRECTION ARTISTIQUE, en cinq règles :
 *  1. Un écran, jamais plus (ordinateur et téléphone).
 *  2. Trois couleurs — lagon, abricot, lavande — et UNE seule par section,
 *     en alternance ; le bleu nuit et l'ivoire pour tout le reste. Deux
 *     moments de nuit seulement (la constellation, le fil de lumière).
 *  3. Un seul système typographique : l'étiquette (point + capitales
 *     espacées), le titre serif qui monte mot à mot, le texte courant.
 *  4. Un seul bouton (pilule nuit, pastille flèche), un seul rayon (28 px),
 *     un même cadre (marges, hauteur de la barre de navigation).
 *  5. Un grain de papier très léger sur chaque fond : la matière.
 *
 * Vitrine : /moderne/signature. Rien ne bouge pour qui a demandé moins
 * d'animations ; dans l'éditeur, tout est figé à son état final.
 */

/* ── Les trois couleurs ─────────────────────────────────────────────── */
export const TRIO = [
  { nom: 'lagon', fond: '#d9f0ee', vif: '#8fd0ca', encre: '#2b7a77' },
  { nom: 'abricot', fond: '#f8e3d6', vif: '#f2b896', encre: '#a3582f' },
  { nom: 'lavande', fond: '#e6e2f6', vif: '#b9aee6', encre: '#5d4f9c' },
] as const
type Teinte = (typeof TRIO)[number]
const [LAGON, ABRICOT, LAVANDE] = TRIO
const NUIT = '#2e424f'
const IVOIRE = '#fbf8f2'
const DOUX = 'cubic-bezier(0.22,1,0.36,1)'
const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const propre = (t: string) => t.replace(/\*/g, '')

/** Un écran, jamais plus — sur ordinateur comme sur téléphone. */
export const PLEIN = 'relative isolate h-[calc(var(--ad-vh)*100)] max-h-[calc(var(--ad-vh)*100)] w-full overflow-hidden'
/** Le cadre intérieur commun : mêmes marges, place pour la navigation. */
const CADRE = 'relative z-10 mx-auto flex h-full w-full max-w-[1280px] flex-col px-[6vw] pb-8 pt-24 lg:px-12 lg:pb-12 lg:pt-28'

/** Des mots, avec leurs accents « *mot* ». */
function decoupe(texte: string) {
  let dans = false
  return texte
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => {
      if (m.startsWith('*')) dans = true
      const accent = dans
      if (m.slice(1).includes('*') || (m.endsWith('*') && m.length > 1)) dans = false
      return { mot: m.replace(/\*/g, ''), accent }
    })
}

/* ══════════════════════════════════════════════════════════════════════
   LE SYSTÈME — grain, étiquette, titre, texte, bouton
   ══════════════════════════════════════════════════════════════════════ */

const BRUIT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/** Le grain de papier, très léger. */
function Grain({ nuit = false }: { nuit?: boolean }) {
  return <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0 z-[1]', nuit ? 'opacity-[0.07] mix-blend-soft-light' : 'opacity-[0.05] mix-blend-multiply')} style={{ backgroundImage: BRUIT }} />
}

/** L'étiquette : un point de couleur, des capitales espacées. */
function Etiquette({ children, teinte, nuit = false, vu = true, className }: { children: React.ReactNode; teinte: Teinte; nuit?: boolean; vu?: boolean; className?: string }) {
  return (
    <p className={cn('inline-flex items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[0.22em]', className)} style={{ color: nuit ? 'rgba(255,255,255,0.7)' : teinte.encre, opacity: vu ? 1 : 0, transition: 'opacity 1s .1s' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: nuit ? teinte.vif : teinte.encre }} />
      {children}
    </p>
  )
}

/** Le titre : serif, les mots montent l'un après l'autre derrière un masque. */
function Titre({
  texte,
  teinte,
  vu,
  nuit = false,
  depart,
  as: Balise = 'h2',
  className,
  delai = 0.15,
}: {
  texte: string
  teinte: Teinte
  vu: boolean
  nuit?: boolean
  /** Une couleur de départ (l'aube : du blanc vers le nuit). */
  depart?: string
  as?: 'h1' | 'h2'
  className?: string
  delai?: number
}) {
  const mots = decoupe(texte)
  const couleur = nuit ? '#ffffff' : NUIT
  const accent = nuit ? teinte.vif : teinte.encre
  return (
    <Balise className={cn('text-[clamp(32px,4.6vw,68px)] leading-[1.06] tracking-[-0.025em]', className)}>
      {mots.map((m, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span
            className={cn('inline-block whitespace-pre', m.accent && 'italic')}
            style={{
              color: vu ? (m.accent ? accent : couleur) : (depart ?? (m.accent ? accent : couleur)),
              transform: vu ? 'none' : 'translateY(110%)',
              transition: `transform 1.1s ${DOUX} ${delai + i * 0.05}s, color 2.6s ${delai + 0.6 + i * 0.08}s`,
            }}
          >
            {m.mot}{' '}
          </span>
        </span>
      ))}
    </Balise>
  )
}

/** Le texte courant. */
function Texte({ children, vu, nuit = false, delai = 0.7, className }: { children: React.ReactNode; vu: boolean; nuit?: boolean; delai?: number; className?: string }) {
  return (
    <p className={cn('max-w-[46ch] text-[15px] leading-[1.7] lg:text-[16.5px]', nuit ? 'text-white/70' : 'text-[var(--ad-pierre)]', className)} style={{ opacity: vu ? 1 : 0, transform: vu ? 'none' : 'translateY(10px)', transition: `opacity 1s ${delai}s, transform 1s ${DOUX} ${delai}s` }}>
      {children}
    </p>
  )
}

/** Le bouton unique : une pilule, une pastille flèche. */
function Bouton({ href, onClick, children, teinte, clair = false, className }: { href?: string; onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void; children: React.ReactNode; teinte: Teinte; clair?: boolean; className?: string }) {
  const classe = cn(
    'group inline-flex items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[14.5px] font-semibold transition-[transform,box-shadow] duration-500 hover:-translate-y-0.5',
    clair ? 'bg-white text-[var(--ad-nuit)] shadow-[0_18px_40px_-22px_rgba(0,0,0,0.6)]' : 'bg-[var(--ad-nuit)] text-white shadow-[0_18px_40px_-22px_rgba(46,66,79,0.9)]',
    className,
  )
  const contenu = (
    <>
      {children}
      <span className="grid h-9 w-9 place-items-center rounded-full transition-transform duration-500 group-hover:translate-x-0.5" style={{ background: clair ? teinte.encre : teinte.fond, color: clair ? '#fff' : teinte.encre }}>
        <ArrowRight className="h-4 w-4" />
      </span>
    </>
  )
  return href ? (
    <a href={href} onClick={onClick} className={classe}>
      {contenu}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={classe}>
      {contenu}
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   1. L'AUBE — abricot. On arrive de nuit ; un soleil se lève derrière le
   titre, le ciel s'éclaircit jusqu'à l'ivoire, les mots passent du blanc
   au bleu nuit. Le soleil suit un peu la souris.
   ══════════════════════════════════════════════════════════════════════ */

export function Aube({ surtitre, titre, intro, bouton, rdv }: { surtitre: string; titre: string; intro: string; bouton: string; rdv: string }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const t = ABRICOT
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--sx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    e.currentTarget.style.setProperty('--sy', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  return (
    <div ref={ref} onPointerMove={bouge} className={cn(PLEIN, '[--sx:0] [--sy:0]')} style={{ background: NUIT }}>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.fond} 0%, ${IVOIRE} 70%)`, opacity: vu ? 1 : 0, transition: 'opacity 3.6s cubic-bezier(0.4,0,0.2,1) 0.4s' }} />
      <div aria-hidden="true" className="absolute left-1/2 top-[70%]" style={{ transform: `translate(-50%, -50%) translateY(${vu ? '0' : '50vh'})`, transition: `transform 4s ${DOUX} 0.2s` }}>
        <div className="h-[44vmin] w-[44vmin] rounded-full transition-transform duration-[1400ms] ease-out" style={{ transform: 'translate(calc(var(--sx) * 40px), calc(var(--sy) * 24px))', background: `radial-gradient(circle, #fffaf1 0%, ${t.vif} 34%, ${t.fond} 56%, transparent 70%)` }} />
      </div>
      <div aria-hidden="true" className="absolute -bottom-[28vh] left-1/2 h-[42vh] w-[150vw] rounded-[50%]" style={{ background: `color-mix(in srgb, ${t.vif} 30%, ${t.fond})`, transform: `translateX(-50%) translateY(${vu ? 0 : 14}vh)`, transition: `transform 3s ${DOUX} 0.5s` }} />
      <Grain />
      <div className={cn(CADRE, 'items-center justify-center text-center')}>
        {surtitre && (
          <Etiquette teinte={t} vu={vu}>
            {surtitre}
          </Etiquette>
        )}
        <Titre as="h1" texte={titre} teinte={t} vu={vu} depart="#ffffff" delai={0.4} className="mt-6 max-w-[16ch] text-[clamp(42px,7.6vw,120px)] leading-[1.02]" />
        {intro && (
          <Texte vu={vu} delai={2.4} className="mt-7 text-center">
            {intro}
          </Texte>
        )}
        <div className="mt-9" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1.2s 2.8s' }}>
          <Bouton href={rdv} teinte={t}>
            {bouton}
          </Bouton>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2. LA CONSTELLATION — lavande, de nuit. Des milliers de points se
   rassemblent pour écrire un mot ; la souris les écarte, ils reviennent ;
   un clic les disperse doucement.
   ══════════════════════════════════════════════════════════════════════ */

type Point = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; r: number; c: string; ph: number }

export function Constellation({ mot, phrase, auteur, surtitre }: { mot: string; phrase: string; auteur: string; surtitre: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const toile = useRef<HTMLCanvasElement>(null)
  const police = useRef<HTMLParagraphElement>(null)
  const edition = useContext(Edition)
  const [vuRef, vu] = useVu<HTMLDivElement>('0%')
  const t = LAVANDE
  useEffect(() => {
    const el = zone.current
    const cv = toile.current
    const ctx = cv?.getContext('2d')
    if (!el || !cv || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const couleurs = [t.vif, t.vif, '#ffffff']
    let W = 0
    let H = 0
    let points: Point[] = []
    let image = 0
    let rassemble = false
    const souris = { x: -9999, y: -9999 }
    const fige = edition || reduit()
    const preparer = () => {
      W = el.clientWidth
      H = el.clientHeight
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const hors = document.createElement('canvas')
      hors.width = W
      hors.height = H
      const o = hors.getContext('2d')
      if (!o) return
      const famille = police.current ? getComputedStyle(police.current).fontFamily : 'serif'
      const taille = Math.min((W * 0.7) / Math.max(3, mot.length * 0.56), H * 0.26)
      o.font = `500 ${taille}px ${famille}`
      o.textAlign = 'center'
      o.textBaseline = 'middle'
      o.fillText(mot, W / 2, H * 0.4)
      const donnees = o.getImageData(0, 0, W, H).data
      const pas = Math.max(4, Math.round(Math.min(W, H) / 150))
      const places: { x: number; y: number }[] = []
      for (let y = 0; y < H; y += pas) for (let x = 0; x < W; x += pas) if ((donnees[(y * W + x) * 4 + 3] ?? 0) > 128) places.push({ x, y })
      points = places.map((p, i) => ({ x: fige ? p.x : Math.random() * W, y: fige ? p.y : Math.random() * H, tx: p.x, ty: p.y, vx: 0, vy: 0, r: 0.7 + Math.random() * 1.2, c: couleurs[i % couleurs.length]!, ph: Math.random() * 6.283 }))
    }
    const peindre = (temps: number) => {
      ctx.clearRect(0, 0, W, H)
      for (const p of points) {
        let ax = (rassemble || fige ? (p.tx - p.x) * 0.014 : Math.sin(temps / 2000 + p.ph) * 0.01)
        let ay = (rassemble || fige ? (p.ty - p.y) * 0.014 : Math.cos(temps / 2300 + p.ph) * 0.01)
        const dx = p.x - souris.x
        const dy = p.y - souris.y
        const d2 = dx * dx + dy * dy
        if (d2 < 110 * 110) {
          const d = Math.sqrt(d2) || 1
          const f = (1 - d / 110) * 1.3
          ax += (dx / d) * f
          ay += (dy / d) * f
        }
        p.vx = (p.vx + ax) * 0.86
        p.vy = (p.vy + ay) * 0.86
        p.x += p.vx
        p.y += p.vy
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(temps / 1500 + p.ph)
        ctx.fillStyle = p.c
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, 6.283)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      image = requestAnimationFrame(peindre)
    }
    preparer()
    const ro = new ResizeObserver(() => preparer())
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(image)
      if (e?.isIntersecting) {
        image = requestAnimationFrame(peindre)
        window.setTimeout(() => (rassemble = true), 400)
      }
    })
    io.observe(el)
    const bouge = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      souris.x = e.clientX - r.left
      souris.y = e.clientY - r.top
    }
    const sort = () => {
      souris.x = -9999
      souris.y = -9999
    }
    const clic = () => {
      for (const p of points) {
        const a = Math.random() * 6.283
        const v = 3 + Math.random() * 7
        p.vx += Math.cos(a) * v
        p.vy += Math.sin(a) * v
      }
    }
    el.addEventListener('pointermove', bouge)
    el.addEventListener('pointerleave', sort)
    el.addEventListener('click', clic)
    return () => {
      cancelAnimationFrame(image)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', bouge)
      el.removeEventListener('pointerleave', sort)
      el.removeEventListener('click', clic)
    }
  }, [mot, edition, t.vif])
  return (
    <div ref={zone} className={cn(PLEIN, 'cursor-crosshair')} style={{ background: NUIT }}>
      <canvas ref={toile} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <Grain nuit />
      <span className="sr-only">{mot}</span>
      <div ref={vuRef} className={cn(CADRE, 'pointer-events-none items-center justify-end text-center')}>
        {surtitre && (
          <Etiquette teinte={t} nuit vu={vu}>
            {surtitre}
          </Etiquette>
        )}
        <p ref={police} className="mt-5 max-w-[34ch] font-[family-name:var(--ad-titre)] text-[clamp(19px,2.2vw,28px)] leading-[1.4] text-white/90" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1.6s 1.6s' }}>
          {propre(phrase)}
        </p>
        {auteur && (
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: t.vif, opacity: vu ? 1 : 0, transition: 'opacity 1.6s 2s' }}>
            {auteur}
          </p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3. LE PORTRAIT EN ONDES — lagon. Le portrait arrive en bandes qui
   glissent des deux côtés ; survolé, une onde le traverse doucement.
   ══════════════════════════════════════════════════════════════════════ */

export function PortraitOndes({ portrait, surtitre, titre, texte, signature }: { portrait: Media | null; surtitre: string; titre: string; texte: string; signature: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const cadre = useRef<HTMLDivElement>(null)
  const t = LAGON
  const N = 12
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cadre.current
    if (!el || e.pointerType !== 'mouse' || reduit()) return
    const r = el.getBoundingClientRect()
    const m = ((e.clientY - r.top) / r.height) * N
    el.querySelectorAll<HTMLElement>('[data-bande]').forEach((b, i) => {
      const f = Math.exp(-((i + 0.5 - m) ** 2) / 3)
      b.style.translate = `${(i % 2 ? 1 : -1) * f * 9}px 0`
    })
  }
  const calme = () => cadre.current?.querySelectorAll<HTMLElement>('[data-bande]').forEach((b) => (b.style.translate = '0 0'))
  return (
    <div ref={ref} className={PLEIN} style={{ background: IVOIRE }}>
      <Grain />
      <div className={cn(CADRE, 'grid content-center items-center gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20')}>
        <div className="max-lg:order-2">
          {surtitre && (
            <Etiquette teinte={t} vu={vu}>
              {surtitre}
            </Etiquette>
          )}
          <Titre texte={titre} teinte={t} vu={vu} className="mt-4 text-[clamp(24px,3.6vw,54px)]" />
          {texte && (
            <Texte vu={vu} delai={0.9} className="mt-4 line-clamp-4 whitespace-pre-line lg:mt-7 lg:line-clamp-[6]">
              {texte}
            </Texte>
          )}
          {signature && (
            <p className="mt-4 font-[family-name:var(--ad-titre)] text-[20px] italic lg:mt-7 lg:text-[24px]" style={{ color: t.encre, opacity: vu ? 1 : 0, transition: 'opacity 1.4s 1.4s' }}>
              {signature}
            </p>
          )}
        </div>
        <div className="relative mx-auto h-[min(66vh,660px)] w-full max-w-[480px] max-lg:h-[32vh] max-lg:max-w-[250px]" onPointerMove={bouge} onPointerLeave={calme}>
          <span aria-hidden="true" className="absolute inset-0 rounded-[28px]" style={{ background: t.fond, transform: vu ? 'translate(18px, 18px)' : 'translate(0,0)', transition: `transform 1.4s ${DOUX} 0.9s` }} />
          <div ref={cadre} role="img" aria-label={portrait?.alt ?? ''} className="absolute inset-0 overflow-hidden rounded-[28px] bg-[var(--ad-sable)]">
            {portrait &&
              Array.from({ length: N }, (_, i) => (
                <span
                  key={i}
                  data-bande=""
                  className="absolute inset-x-0 overflow-hidden"
                  style={{ top: `${(i / N) * 100}%`, height: `${100 / N + 0.4}%`, transform: vu ? 'translateX(0)' : `translateX(${i % 2 ? 105 : -105}%)`, transition: `transform 1.3s ${DOUX} ${0.1 + i * 0.05}s, translate .5s ${DOUX}` }}
                >
                  <span className="absolute inset-x-0" style={{ top: `${-i * 100}%`, height: `${N * 100}%` }}>
                    <Image src={portrait.url} alt="" fill sizes="480px" className="object-cover" />
                  </span>
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   4. LE CHEMIN — abricot. Un sentier serpente ; une petite lumière le
   parcourt seule, le trace derrière elle et ouvre chaque étape.
   ══════════════════════════════════════════════════════════════════════ */

export function Chemin({ etapes, surtitre, titre }: { etapes: { titre: string; texte: string }[]; surtitre: string; titre: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const trace = useRef<SVGPathElement>(null)
  const lumiere = useRef<HTMLSpanElement>(null)
  const edition = useContext(Edition)
  const [vuRef, vu] = useVu<HTMLDivElement>('0%')
  const [taille, setTaille] = useState({ w: 1200, h: 600 })
  const [atteinte, setAtteinte] = useState(-1)
  const t = ABRICOT
  const n = Math.max(1, etapes.length)
  const vertical = taille.w < 768
  const pts = etapes.map((_, k) => {
    const f = n > 1 ? k / (n - 1) : 0.5
    return vertical ? { x: taille.w * (k % 2 ? 0.72 : 0.28), y: taille.h * (0.1 + f * 0.62) } : { x: taille.w * (0.15 + f * 0.7), y: taille.h * (k % 2 ? 0.66 : 0.34) }
  })
  let d = pts[0] ? `M ${vertical ? pts[0].x : -40} ${vertical ? -40 : pts[0].y} L ${pts[0].x} ${pts[0].y}` : ''
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1]!
    const b = pts[k]!
    d += vertical ? ` C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}` : ` C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`
  }
  useEffect(() => {
    const el = zone.current
    if (!el) return
    const ro = new ResizeObserver(() => setTaille({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const el = zone.current
    const p = trace.current
    const l = lumiere.current
    if (!el || !p || !l) return
    const total = p.getTotalLength()
    const reperes = pts.map((pt) => {
      let meilleur = 0
      let ecart = Infinity
      for (let s = 0; s <= total; s += 4) {
        const q = p.getPointAtLength(s)
        const e = (q.x - pt.x) ** 2 + (q.y - pt.y) ** 2
        if (e < ecart) {
          ecart = e
          meilleur = s
        }
      }
      return meilleur
    })
    const placer = (s: number) => {
      const q = p.getPointAtLength(s)
      l.style.transform = `translate(${q.x}px, ${q.y}px)`
      p.style.strokeDashoffset = String(total - s)
    }
    p.style.strokeDasharray = String(total)
    if (edition || reduit()) {
      placer(total)
      setAtteinte(pts.length - 1)
      return
    }
    placer(0)
    let image = 0
    let debut = 0
    const MARCHE = 2200
    const PAUSE = 1900
    const cycle = reperes.length * (MARCHE + PAUSE) + 2400
    const boucle = (temps: number) => {
      if (!debut) debut = temps
      const e = (temps - debut) % cycle
      let s = 0
      let k = -1
      for (let i = 0; i < reperes.length; i++) {
        const t0 = i * (MARCHE + PAUSE)
        const de = i === 0 ? 0 : reperes[i - 1]!
        if (e >= t0 && e < t0 + MARCHE) {
          const f = (e - t0) / MARCHE
          s = de + (reperes[i]! - de) * (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2)
          k = i - 1
          break
        }
        if (e >= t0 + MARCHE) {
          s = reperes[i]!
          k = i
        }
      }
      placer(s)
      setAtteinte((x) => (x === k ? x : k))
      image = requestAnimationFrame(boucle)
    }
    const io = new IntersectionObserver(([en]) => {
      cancelAnimationFrame(image)
      if (en?.isIntersecting) {
        debut = 0
        image = requestAnimationFrame(boucle)
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(image)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, edition])
  return (
    <div className={PLEIN} style={{ background: IVOIRE }}>
      <Grain />
      <div ref={vuRef} className={CADRE}>
        <div className="shrink-0">
          {surtitre && (
            <Etiquette teinte={t} vu={vu}>
              {surtitre}
            </Etiquette>
          )}
          <Titre texte={titre} teinte={t} vu={vu} className="mt-4 text-[clamp(26px,3.6vw,52px)]" />
        </div>
        <div ref={zone} className="relative min-h-0 flex-1">
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${taille.w} ${taille.h}`}>
            <path d={d} fill="none" stroke={t.vif} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="1 9" strokeLinecap="round" />
            <path ref={trace} d={d} fill="none" stroke={t.encre} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <span ref={lumiere} aria-hidden="true" className="absolute left-0 top-0 z-20 -ml-[7px] -mt-[7px] h-3.5 w-3.5 rounded-full bg-white" style={{ boxShadow: `0 0 0 3px ${t.encre}, 0 0 18px 4px ${t.vif}` }} />
          {pts.map((pt, k) => {
            const e = etapes[k]!
            const ok = k <= atteinte
            const actif = k === atteinte
            const dessous = vertical ? false : k % 2 === 1
            return (
              <div key={k} className="absolute z-10" style={{ left: pt.x, top: pt.y }}>
                <span className="absolute -left-[15px] -top-[15px] grid h-[30px] w-[30px] place-items-center rounded-full border text-[12px] font-semibold tabular-nums transition-colors duration-500" style={{ borderColor: t.encre, background: ok ? t.encre : IVOIRE, color: ok ? '#fff' : t.encre }}>
                  {k + 1}
                </span>
                <div
                  className={cn('absolute w-[clamp(190px,21vw,290px)] rounded-[28px] border p-5 transition-[opacity,background-color,border-color] duration-700', vertical ? (k % 2 ? 'right-7 top-[-30px]' : 'left-7 top-[-30px]') : dessous ? 'left-0 top-9 -translate-x-1/2' : 'bottom-9 left-0 -translate-x-1/2')}
                  style={{ background: actif ? t.fond : '#ffffffcc', borderColor: actif ? 'transparent' : 'var(--ad-sable)', opacity: ok ? 1 : 0.45 }}
                >
                  <p className="font-[family-name:var(--ad-titre)] text-[clamp(18px,1.7vw,23px)] leading-[1.2] text-[var(--ad-nuit)]">{e.titre}</p>
                  {e.texte && <p className={cn('mt-1.5 text-[13.5px] leading-[1.55] text-[var(--ad-pierre)]', !actif && 'line-clamp-2')}>{e.texte}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   5. LES BULLES — lavande. Les accompagnements flottent, bulles de verre
   clair qui s'évitent et fuient la souris ; on en touche une, elle
   éclate et sa fiche apparaît.
   ══════════════════════════════════════════════════════════════════════ */

export function Bulles({ services, rdv, surtitre, titre }: { services: ServiceWithMedia[]; rdv: string; surtitre: string; titre: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const bulles = useRef<(HTMLButtonElement | null)[]>([])
  const survol = useRef<number | null>(null)
  const edition = useContext(Edition)
  const [vuRef, vu] = useVu<HTMLDivElement>('0%')
  const [eclatee, setEclatee] = useState<number | null>(null)
  const [ouverte, setOuverte] = useState<number | null>(null)
  const pause = useRef(false)
  pause.current = ouverte !== null
  const t = LAVANDE

  useEffect(() => {
    const el = zone.current
    if (!el) return
    const n = services.length
    let W = el.clientWidth
    let H = el.clientHeight
    const taille = (i: number) => Math.round(Math.min(W, H) * (W < 640 ? 0.4 : 0.36) * (0.86 + (i % 3) * 0.09))
    const corps = services.map((_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4
      const c = taille(i)
      return { x: W / 2 + Math.cos(a) * W * 0.3 - c / 2, y: H / 2 + Math.sin(a) * H * 0.22 - c / 2, vx: Math.cos(a * 3) * 0.3, vy: Math.sin(a * 2) * 0.25, t: c }
    })
    const souris = { x: -9999, y: -9999 }
    const poser = () =>
      corps.forEach((c, i) => {
        const b = bulles.current[i]
        if (!b) return
        b.style.width = `${c.t}px`
        b.style.height = `${c.t}px`
        b.style.transform = `translate(${c.x}px, ${c.y}px)`
      })
    poser()
    if (edition || reduit()) return
    let image = 0
    const boucle = () => {
      if (!pause.current) {
        corps.forEach((c, i) => {
          if (survol.current === i) return
          const cx = c.x + c.t / 2
          const cy = c.y + c.t / 2
          const dx = cx - souris.x
          const dy = cy - souris.y
          const dd = Math.hypot(dx, dy) || 1
          if (dd < c.t) {
            c.vx += (dx / dd) * 0.05
            c.vy += (dy / dd) * 0.05
          }
          corps.forEach((o, j) => {
            if (j === i) return
            const ex = cx - (o.x + o.t / 2)
            const ey = cy - (o.y + o.t / 2)
            const de = Math.hypot(ex, ey) || 1
            if (de < (c.t + o.t) / 2) {
              c.vx += (ex / de) * 0.04
              c.vy += (ey / de) * 0.04
            }
          })
          const v = Math.hypot(c.vx, c.vy)
          if (v > 0.55) {
            c.vx *= 0.96
            c.vy *= 0.96
          } else if (v < 0.12) {
            c.vx *= 1.04
            c.vy *= 1.04
          }
          c.x += c.vx
          c.y += c.vy
          if (c.x < 0 || c.x + c.t > W) c.vx *= -1
          if (c.y < 0 || c.y + c.t > H) c.vy *= -1
          c.x = Math.max(0, Math.min(W - c.t, c.x))
          c.y = Math.max(0, Math.min(H - c.t, c.y))
        })
        poser()
      }
      image = requestAnimationFrame(boucle)
    }
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(image)
      if (e?.isIntersecting) image = requestAnimationFrame(boucle)
    })
    io.observe(el)
    const ro = new ResizeObserver(() => {
      W = el.clientWidth
      H = el.clientHeight
      corps.forEach((c, i) => (c.t = taille(i)))
      poser()
    })
    ro.observe(el)
    const bouge = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      souris.x = e.clientX - r.left
      souris.y = e.clientY - r.top
    }
    el.addEventListener('pointermove', bouge)
    return () => {
      cancelAnimationFrame(image)
      io.disconnect()
      ro.disconnect()
      el.removeEventListener('pointermove', bouge)
    }
  }, [services, edition])

  const eclater = (i: number) => {
    setEclatee(i)
    window.setTimeout(() => setOuverte(i), reduit() ? 0 : 360)
  }
  const fermer = () => {
    setOuverte(null)
    window.setTimeout(() => setEclatee(null), 200)
  }
  const s = ouverte !== null ? services[ouverte] : null
  return (
    <div className={PLEIN} style={{ background: IVOIRE }}>
      <Grain />
      <div ref={vuRef} className={CADRE}>
        <div className="shrink-0 text-center">
          {surtitre && (
            <Etiquette teinte={t} vu={vu}>
              {surtitre}
            </Etiquette>
          )}
          <Titre texte={titre} teinte={t} vu={vu} className="mt-4 text-[clamp(26px,3.6vw,52px)]" />
        </div>
        <div ref={zone} className="relative mt-4 min-h-0 flex-1">
          {services.map((sv, i) => (
            <button
              key={sv.id}
              ref={(b) => {
                bulles.current[i] = b
              }}
              type="button"
              onPointerEnter={() => (survol.current = i)}
              onPointerLeave={() => (survol.current = null)}
              onClick={() => eclater(i)}
              className={cn('group/bulle absolute left-0 top-0 grid place-items-center rounded-full p-[13%] text-center', eclatee === i && 'pointer-events-none')}
              style={{ width: 180, height: 180 }}
            >
              <span
                className={cn('absolute inset-0 rounded-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/bulle:scale-[1.04]', eclatee === i && 'motion-safe:animate-[ad-eclate_.4s_ease-out_forwards]')}
                style={{ background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0 3%, rgba(255,255,255,0) 12%), ${t.fond}99`, boxShadow: `inset 0 0 0 1px ${t.vif}, 0 22px 40px -30px rgba(46,66,79,0.35)` }}
              />
              {eclatee === i && <span aria-hidden="true" className="absolute inset-0 rounded-full border opacity-0 motion-safe:animate-[ad-ride_.8s_ease-out_forwards]" style={{ borderColor: t.vif }} />}
              <span className={cn('relative transition-opacity duration-200', eclatee === i && 'opacity-0')}>
                <span className="block font-[family-name:var(--ad-titre)] text-[clamp(15px,1.5vw,21px)] leading-[1.15] text-[var(--ad-nuit)]">{sv.title}</span>
                {sv.duration && <span className="mt-1.5 block text-[11px] text-[var(--ad-gris)]">{sv.duration}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
      {s && ouverte !== null && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[rgba(46,66,79,0.16)] p-5 backdrop-blur-[3px] motion-safe:animate-[ad-fondu_.3s_ease-out_backwards]" onClick={fermer}>
          <div onClick={(e) => e.stopPropagation()} className="relative grid w-[min(760px,100%)] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_80px_-40px_rgba(46,66,79,0.6)] motion-safe:animate-[ad-remonte_.6s_cubic-bezier(0.22,1,0.36,1)_backwards] sm:grid-cols-[0.9fr_1.1fr]">
            {s.media && (
              <div className="relative aspect-[16/9] sm:aspect-auto">
                <Image src={s.media.url} alt="" fill sizes="340px" className="object-cover" />
              </div>
            )}
            <div className="p-7 sm:p-9">
              <Etiquette teinte={t}>{s.duration ?? 'Accompagnement'}</Etiquette>
              <p className="mt-3 font-[family-name:var(--ad-titre)] text-[30px] leading-[1.1] text-[var(--ad-nuit)]">{s.title}</p>
              <p className="mt-3 text-[15px] leading-[1.7] text-[var(--ad-pierre)]">{propre(s.excerpt)}</p>
              <Bouton href={rdv} teinte={t} className="mt-6">
                Prendre rendez-vous
              </Bouton>
            </div>
            <button type="button" onClick={fermer} aria-label="Fermer" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--ad-nuit)] shadow">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   6. LES VOLETS — lagon. Un diaporama plein écran : la photo avance
   doucement, puis un volet de couleur balaie l'écran et découvre la
   suivante. Un clic à gauche ou à droite pour naviguer.
   ══════════════════════════════════════════════════════════════════════ */

export function Volets({ photos, surtitre, titre }: { photos: Media[]; surtitre: string; titre: string }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [i, setI] = useState(0)
  const [affichee, setAffichee] = useState(0)
  const [passage, setPassage] = useState(0)
  const t = LAGON
  const n = photos.length
  const aller = (d: number) => {
    if (!n) return
    setPassage((x) => x + 1)
    const suivante = (i + d + n) % n
    setI(suivante)
    window.setTimeout(() => setAffichee(suivante), reduit() ? 0 : 640)
  }
  const rappel = useRef(aller)
  useEffect(() => {
    rappel.current = aller
  })
  useEffect(() => {
    if (!vu || n < 2 || reduit()) return
    const minuteur = window.setInterval(() => rappel.current(1), 6500)
    return () => window.clearInterval(minuteur)
  }, [vu, n])
  const p = photos[affichee]
  return (
    <div ref={ref} className={PLEIN} style={{ background: NUIT }}>
      {p && (
        <div key={p.id} className="absolute inset-0 motion-safe:animate-[ad-kb_8s_ease-out_forwards]">
          <Image src={p.url} alt={p.alt} fill sizes="100vw" className="object-cover" />
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(46,66,79,0.7),rgba(46,66,79,0.05)_55%,rgba(46,66,79,0.25))]" />
      {passage > 0 && <span key={passage} aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-full motion-safe:animate-[ad-volet_1.3s_cubic-bezier(0.77,0,0.18,1)_forwards]" style={{ background: t.fond, transform: 'translateX(-101%)' }} />}
      <Grain nuit />
      <button type="button" onClick={() => aller(-1)} aria-label="Photo précédente" className="absolute inset-y-0 left-0 z-20 w-1/2 cursor-w-resize" />
      <button type="button" onClick={() => aller(1)} aria-label="Photo suivante" className="absolute inset-y-0 right-0 z-20 w-1/2 cursor-e-resize" />
      <div className={cn(CADRE, 'pointer-events-none z-20 justify-end')}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            {surtitre && (
              <Etiquette teinte={t} nuit vu={vu}>
                {surtitre}
              </Etiquette>
            )}
            <Titre texte={titre} teinte={t} vu={vu} nuit className="mt-4" />
            {photos[i]?.caption && <p className="mt-3 text-[15px] text-white/75">{photos[i]?.caption}</p>}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12.5px] tabular-nums text-white/70">
              {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </span>
            <span className="relative h-[2px] w-[clamp(70px,12vw,180px)] overflow-hidden rounded-full bg-white/25">
              {vu && <span key={`${i}-${passage}`} className="absolute inset-y-0 left-0 w-full origin-left bg-white motion-safe:animate-[ad-remplir_6.5s_linear_forwards]" />}
            </span>
            <span className="pointer-events-auto flex gap-2">
              <button type="button" onClick={() => aller(-1)} aria-label="Précédente" className="grid h-10 w-10 place-items-center rounded-full border border-white/40 text-white transition-colors hover:bg-white hover:text-[var(--ad-nuit)]">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => aller(1)} aria-label="Suivante" className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--ad-nuit)]">
                <ArrowRight className="h-4 w-4" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   7. LE TAMBOUR — lavande. Les questions sur un cylindre en 3D qui tourne
   comme une molette ; la question de face s'ouvre à côté.
   ══════════════════════════════════════════════════════════════════════ */

export function Tambour({ faq, surtitre, titre }: { faq: FaqItem[]; surtitre: string; titre: string }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [k, setK] = useState(0)
  const [main, setMain] = useState(false)
  const t = LAVANDE
  const n = Math.max(1, faq.length)
  const angle = 360 / n
  const H = 84
  const R = Math.round(H / 2 / Math.tan(Math.PI / n))
  const tirer = useRef<{ y: number; k: number } | null>(null)
  useEffect(() => {
    if (!vu || main || n < 2 || reduit()) return
    const minuteur = window.setInterval(() => setK((x) => x + 1), 5600)
    return () => window.clearInterval(minuteur)
  }, [vu, main, n])
  const ici = ((k % n) + n) % n
  const q = faq[ici]
  return (
    <div ref={ref} className={PLEIN} style={{ background: IVOIRE }}>
      <Grain />
      <div className={cn(CADRE, 'grid content-center gap-4 lg:grid-cols-2 lg:items-center lg:gap-16')}>
        <div>
          {surtitre && (
            <Etiquette teinte={t} vu={vu}>
              {surtitre}
            </Etiquette>
          )}
          <Titre texte={titre} teinte={t} vu={vu} className="mt-4 text-[clamp(26px,3.6vw,52px)]" />
          <div
            className="relative mt-2 h-[min(44vh,400px)] touch-none select-none [perspective:620px] max-lg:h-[26vh]"
            onMouseEnter={() => setMain(true)}
            onMouseLeave={() => setMain(false)}
            onPointerDown={(e) => {
              tirer.current = { y: e.clientY, k }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!tirer.current) return
              setK(tirer.current.k + Math.round((tirer.current.y - e.clientY) / 60))
            }}
            onPointerUp={() => (tirer.current = null)}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[84px] -translate-y-1/2 border-y" style={{ borderColor: t.vif }} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20" style={{ background: `linear-gradient(to bottom, ${IVOIRE}, transparent 32%, transparent 68%, ${IVOIRE})` }} />
            <div className="absolute inset-x-0 top-1/2 h-[84px] [transform-style:preserve-3d]" style={{ transform: `translateY(-50%) rotateX(${k * angle}deg)`, transition: `transform 1s cubic-bezier(0.34,1.3,0.64,1)` }}>
              {faq.map((f, i) => {
                let ecart = Math.abs(i - ici)
                ecart = Math.min(ecart, n - ecart)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setK(k + (((i - ici + n + Math.floor(n / 2)) % n) - Math.floor(n / 2)))}
                    className="absolute inset-0 flex items-center gap-4 px-3 text-left [backface-visibility:hidden]"
                    style={{ transform: `rotateX(${-i * angle}deg) translateZ(${R}px)`, opacity: 1 - ecart * 0.24 }}
                  >
                    <span className="w-7 shrink-0 text-[12px] tabular-nums" style={{ color: t.encre }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={cn('line-clamp-2 font-[family-name:var(--ad-titre)] text-[clamp(16px,1.7vw,22px)] leading-[1.25]', ecart === 0 ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-gris)]')}>{f.question}</span>
                  </button>
                )
              })}
            </div>
            <div className="absolute bottom-0 right-0 z-30 flex gap-2">
              <button type="button" onClick={() => setK(k - 1)} aria-label="Question précédente" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--ad-sable-fonce)] bg-white text-[var(--ad-nuit)]">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setK(k + 1)} aria-label="Question suivante" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ad-nuit)] text-white">
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-end rounded-[28px] p-[clamp(20px,3.6vw,48px)] lg:min-h-[min(56vh,480px)]" style={{ background: t.fond }} aria-live="polite">
          {q && (
            <div key={q.id} className="motion-safe:animate-[ad-remonte_.8s_cubic-bezier(0.22,1,0.36,1)_backwards]">
              <p className="font-[family-name:var(--ad-titre)] text-[clamp(20px,2.4vw,32px)] leading-[1.2] text-[var(--ad-nuit)]">{q.question}</p>
              <p className="mt-3 line-clamp-4 whitespace-pre-line text-[14.5px] leading-[1.7] text-[var(--ad-pierre)] lg:mt-5 lg:line-clamp-[8] lg:text-[16px]">{propre(q.answer)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   8. LA PORTE — abricot. Une porte en arche : survolée, elle s'entrouvre ;
   touchée, elle s'ouvre sur le cabinet et les coordonnées apparaissent.
   ══════════════════════════════════════════════════════════════════════ */

export function Porte({ photo, adresse, telephone, email, rdv, surtitre, titre }: { photo: Media | null; adresse: string | null; telephone: string | null; email: string | null; rdv: string; surtitre: string; titre: string }) {
  const edition = useContext(Edition)
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [ouverte, setOuverte] = useState(false)
  const [entrouverte, setEntrouverte] = useState(false)
  const ouvert = ouverte || edition
  const angle = ouvert ? -104 : entrouverte ? -14 : 0
  const t = ABRICOT
  return (
    <div ref={ref} className={PLEIN} style={{ background: IVOIRE }}>
      <Grain />
      <div className={cn(CADRE, 'grid content-center items-center gap-6 lg:grid-cols-[1fr_1fr] lg:gap-16')}>
        <div className="max-lg:text-center">
          {surtitre && (
            <Etiquette teinte={t} vu={vu}>
              {surtitre}
            </Etiquette>
          )}
          <Titre texte={titre} teinte={t} vu={vu} className="mt-4" />
          <Texte vu={vu} className="mt-3 max-lg:mx-auto lg:mt-6">
            {ouvert ? 'Entrez, installez-vous. Voici comment me trouver.' : 'Poussez la porte : elle s’ouvre sur le cabinet.'}
          </Texte>
          <div className="mt-5 lg:mt-8" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1s 1s' }}>
            <Bouton onClick={() => setOuverte((o) => !o)} teinte={t}>
              {ouvert ? 'Refermer' : 'Ouvrir la porte'}
            </Bouton>
          </div>
        </div>
        <div className="relative mx-auto h-[min(62vh,600px)] w-[min(420px,78vw)] max-lg:h-[44vh] max-lg:w-[min(280px,70vw)]">
          <span aria-hidden="true" className="absolute -bottom-[12%] left-1/2 h-[14%] w-[160%] -translate-x-1/2 [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)]" style={{ background: `linear-gradient(to bottom, ${t.vif}, transparent)`, opacity: ouvert ? 0.35 : entrouverte ? 0.12 : 0, transition: 'opacity 1.2s' }} />
          <div className="absolute inset-0 overflow-hidden rounded-t-full bg-[var(--ad-sable)] shadow-[0_0_0_8px_#fff,0_40px_80px_-40px_rgba(46,66,79,0.45)]">
            {photo && <Image src={photo.url} alt={photo.alt} fill sizes="420px" className="object-cover" style={{ transform: ouvert ? 'scale(1)' : 'scale(1.12)', transition: `transform 1.8s ${DOUX}` }} />}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.fond} 0%, ${t.fond}80 40%, transparent 70%)` }} />
            <ul className="absolute inset-x-4 bottom-4 flex flex-col gap-2 rounded-[22px] bg-white/95 p-4 text-[13.5px] text-[var(--ad-nuit)]" style={{ opacity: ouvert ? 1 : 0, transform: ouvert ? 'none' : 'translateY(16px)', transition: `opacity .8s .7s, transform 1s ${DOUX} .7s` }}>
              {adresse && (
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.encre }} /> {adresse}
                </li>
              )}
              {telephone && (
                <li>
                  <a href={`tel:${toE164(telephone)}`} className="flex gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.encre }} /> {telephone}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="flex gap-2 break-all">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.encre }} /> {email}
                  </a>
                </li>
              )}
              <li className="pt-1">
                <a href={rdv} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: t.encre }}>
                  Prendre rendez-vous <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
          <div className="absolute inset-0 [perspective:1800px]" style={{ pointerEvents: ouvert ? 'none' : 'auto' }}>
            <button
              type="button"
              aria-label="Ouvrir la porte"
              onClick={() => setOuverte(true)}
              onMouseEnter={() => setEntrouverte(true)}
              onMouseLeave={() => setEntrouverte(false)}
              className="absolute inset-0 origin-left rounded-t-full [transform-style:preserve-3d]"
              style={{ transform: `rotateY(${angle}deg)`, transition: `transform ${ouvert ? 1.6 : 0.9}s cubic-bezier(0.65,0,0.35,1)`, background: t.fond, boxShadow: `0 0 0 8px #fff${entrouverte && !ouvert ? `, 14px 0 40px -8px ${t.vif}` : ''}` }}
            >
              <span aria-hidden="true" className="absolute inset-x-[15%] top-[10%] h-[36%] rounded-t-full border" style={{ borderColor: `${t.encre}30` }} />
              <span aria-hidden="true" className="absolute inset-x-[15%] bottom-[8%] h-[34%] rounded-[16px] border" style={{ borderColor: `${t.encre}30` }} />
              <span aria-hidden="true" className="absolute right-[9%] top-[54%] h-4 w-4 rounded-full [backface-visibility:hidden]" style={{ background: t.encre }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   9. LE FIL DE LUMIÈRE — lagon, de nuit. La souris laisse un fil de
   lumière (au repos, il se dessine seul). Le bouton ouvre un cercle de
   couleur qui remplit l'écran, puis mène au rendez-vous.
   ══════════════════════════════════════════════════════════════════════ */

export function FilDeLumiere({ titre, texte, bouton, rdv, surtitre }: { titre: string; texte: string; bouton: string; rdv: string; surtitre: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const toile = useRef<HTMLCanvasElement>(null)
  const [vuRef, vu] = useVu<HTMLDivElement>('0%')
  const [cercle, setCercle] = useState<{ x: number; y: number } | null>(null)
  const t = LAGON
  useEffect(() => {
    const el = zone.current
    const cv = toile.current
    const ctx = cv?.getContext('2d')
    if (!el || !cv || !ctx || reduit()) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 0
    let H = 0
    const taille = () => {
      W = el.clientWidth
      H = el.clientHeight
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    taille()
    const pts: { x: number; y: number; t: number }[] = []
    let dernier = 0
    let image = 0
    const boucle = (temps: number) => {
      if (temps - dernier > 1400) {
        const a = temps / 1500
        pts.push({ x: W / 2 + Math.sin(a) * W * 0.34, y: H / 2 + Math.sin(a * 2) * H * 0.2, t: temps })
      }
      while (pts.length && temps - pts[0]!.t > 1200) pts.shift()
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = t.vif
      ctx.shadowColor = t.vif
      ctx.shadowBlur = 8
      for (let i = 1; i < pts.length; i++) {
        const f = i / pts.length
        ctx.globalAlpha = f * 0.9
        ctx.lineWidth = 0.6 + f * 3
        ctx.beginPath()
        ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y)
        ctx.lineTo(pts[i]!.x, pts[i]!.y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      image = requestAnimationFrame(boucle)
    }
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(image)
      if (e?.isIntersecting) image = requestAnimationFrame(boucle)
    })
    io.observe(el)
    const ro = new ResizeObserver(taille)
    ro.observe(el)
    const bouge = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      dernier = performance.now()
      pts.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: dernier })
    }
    el.addEventListener('pointermove', bouge)
    return () => {
      cancelAnimationFrame(image)
      io.disconnect()
      ro.disconnect()
      el.removeEventListener('pointermove', bouge)
    }
  }, [t.vif])
  const ouvrir = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (e.metaKey || e.ctrlKey || reduit()) return
    e.preventDefault()
    const r = zone.current!.getBoundingClientRect()
    setCercle({ x: e.clientX - r.left, y: e.clientY - r.top })
    window.setTimeout(() => window.location.assign(rdv), 1100)
  }
  return (
    <div ref={zone} className={PLEIN} style={{ background: NUIT }}>
      <canvas ref={toile} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <Grain nuit />
      <div ref={vuRef} className={cn(CADRE, 'items-center justify-center text-center')}>
        {surtitre && (
          <Etiquette teinte={t} nuit vu={vu}>
            {surtitre}
          </Etiquette>
        )}
        <Titre texte={titre} teinte={t} vu={vu} nuit className="mt-5 max-w-[16ch] text-[clamp(38px,6.4vw,96px)] leading-[1.02]" />
        {texte && (
          <Texte vu={vu} nuit className="mt-6 text-center">
            {texte}
          </Texte>
        )}
        <div className="mt-9" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1s 1.1s' }}>
          <Bouton href={rdv} onClick={ouvrir} teinte={t} clair>
            {bouton}
          </Bouton>
        </div>
      </div>
      {cercle && (
        <div className="absolute inset-0 z-30 grid place-items-center motion-safe:animate-[ad-cercle_1s_cubic-bezier(0.65,0,0.35,1)_forwards]" style={{ background: t.fond, ['--cx' as string]: `${cercle.x}px`, ['--cy' as string]: `${cercle.y}px` }}>
          <p className="font-[family-name:var(--ad-titre)] text-[clamp(40px,7vw,96px)] italic motion-safe:animate-[ad-remonte_.8s_cubic-bezier(0.22,1,0.36,1)_.35s_backwards]" style={{ color: t.encre }}>
            À très vite.
          </p>
        </div>
      )}
    </div>
  )
}
