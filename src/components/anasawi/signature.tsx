'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Mail, MapPin, Phone, X } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useRef, useState } from 'react'

import { useVu } from './exception'
import { Edition } from './vivant'
import { cn, toE164 } from '@/lib/utils'
import type { FaqItem, Media, ServiceWithMedia } from '@/server/db/schema'

/**
 * LA SÉRIE SIGNATURE — des sections plein écran (100 vh), chacune une
 * idée qu'on ne voit nulle part ailleurs, en TROIS couleurs seulement :
 * lagon, abricot, lavande — plus le bleu nuit et l'ivoire d'Anasawi.
 *
 *   L'aube · La constellation · Le portrait en ondes · Le chemin ·
 *   Les bulles · Les volets · Le tambour · La porte · Le fil de lumière
 *
 * Sobres : une idée, un geste, peu d'effets. Jamais plus d'un écran.
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
const trio = (i: number) => TRIO[((i % 3) + 3) % 3]!
const NUIT = '#2e424f'
const IVOIRE = '#fbf8f2'
const DOUX = 'cubic-bezier(0.22,1,0.36,1)'
const REBOND = 'cubic-bezier(0.34,1.56,0.64,1)'
const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const propre = (t: string) => t.replace(/\*/g, '')
/** Le cadre commun : exactement un écran. */
/* Un écran, jamais plus — sur ordinateur comme sur téléphone. */
export const PLEIN = 'relative h-[calc(var(--ad-vh)*100)] max-h-[calc(var(--ad-vh)*100)] w-full overflow-hidden'

/** Des mots, avec leurs accents « *mot* ». */
function decoupe(texte: string) {
  let dans = false
  return texte.split(/\s+/).filter(Boolean).map((m) => {
    if (m.startsWith('*')) dans = true
    const accent = dans
    if (m.slice(1).includes('*') || (m.endsWith('*') && m.length > 1)) dans = false
    return { mot: m.replace(/\*/g, ''), accent }
  })
}

/* ══════════════════════════════════════════════════════════════════════
   1. L'AUBE — on arrive de nuit. Un soleil abricot se lève derrière le
   titre, le ciel s'éclaircit jusqu'à l'ivoire, les mots s'allument un à
   un, des poussières de lumière montent. Le soleil suit un peu la souris.
   ══════════════════════════════════════════════════════════════════════ */

export function Aube({ surtitre, titre, intro, bouton, rdv }: { surtitre: string; titre: string; intro: string; bouton: string; rdv: string }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--sx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    e.currentTarget.style.setProperty('--sy', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  const mots = decoupe(titre)
  return (
    <div ref={ref} onPointerMove={bouge} className={cn(PLEIN, 'grid place-items-center [--sx:0] [--sy:0]')} style={{ background: NUIT }}>
      {/* Le ciel qui s'éclaircit. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(to top, ${TRIO[1].fond} 0%, ${IVOIRE} 62%, ${TRIO[0].fond} 100%)`, opacity: vu ? 1 : 0, transition: 'opacity 4s cubic-bezier(0.4,0,0.2,1) 0.5s' }} />
      {/* Le soleil : il se lève, puis suit la souris. */}
      <div aria-hidden="true" className="absolute left-1/2 top-[64%]" style={{ transform: `translate(-50%, -50%) translateY(${vu ? '0' : '48vh'})`, transition: `transform 4.2s ${DOUX} 0.2s` }}>
        <div className="h-[46vmin] w-[46vmin] rounded-full transition-transform duration-[1200ms] ease-out" style={{ transform: 'translate(calc(var(--sx) * 50px), calc(var(--sy) * 30px))', background: `radial-gradient(circle, #fffaf1 0%, ${TRIO[1].vif}cc 30%, ${TRIO[1].fond} 52%, transparent 68%)` }} />
      </div>
      {/* Les collines. */}
      <div aria-hidden="true" className="absolute -bottom-[26vh] left-1/2 h-[40vh] w-[140vw] -translate-x-1/2 rounded-[50%]" style={{ background: TRIO[0].fond, transform: `translateY(${vu ? 0 : 12}vh)`, transition: `transform 3s ${DOUX} 0.6s, background-color 3s`, filter: 'saturate(1.1)' }} />
      <div className="relative z-10 max-w-[1100px] px-6 text-center" style={{ transform: 'translate(calc(var(--sx) * -16px), calc(var(--sy) * -10px))' }}>
        {surtitre && (
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em]" style={{ color: vu ? TRIO[0].encre : '#ffffff99', transition: 'color 3s 1s' }}>
            {surtitre}
          </p>
        )}
        <h1 className="mt-5 text-[clamp(46px,8.4vw,132px)] leading-[1.02] tracking-[-0.03em]">
          {mots.map((m, i) => (
            <span
              key={i}
              className={cn('inline-block whitespace-pre', m.accent && 'italic')}
              style={{
                color: vu ? (m.accent ? TRIO[0].encre : NUIT) : '#ffffff',
                opacity: vu ? 1 : 0,
                filter: vu ? 'blur(0)' : 'blur(12px)',
                transform: vu ? 'none' : 'translateY(36px)',
                transition: `color 3s ${1 + i * 0.12}s, opacity 1.3s ${0.3 + i * 0.12}s, filter 1.3s ${0.3 + i * 0.12}s, transform 1.5s ${DOUX} ${0.3 + i * 0.12}s`,
              }}
            >
              {m.mot}{' '}
            </span>
          ))}
        </h1>
        {intro && (
          <p className="mx-auto mt-7 max-w-[52ch] text-[clamp(16px,1.4vw,19px)] leading-[1.7] text-[var(--ad-pierre)]" style={{ opacity: vu ? 1 : 0, transform: vu ? 'none' : 'translateY(16px)', transition: `opacity 1.4s 2.6s, transform 1.4s ${DOUX} 2.6s` }}>
            {intro}
          </p>
        )}
        <a href={rdv} className="mt-9 inline-flex rounded-full px-7 py-4 text-[15px] font-semibold text-white shadow-[0_18px_40px_-18px_rgba(46,66,79,0.8)] transition-transform duration-500 hover:-translate-y-0.5" style={{ background: NUIT, opacity: vu ? 1 : 0, transition: 'opacity 1.4s 3s, transform .5s' }}>
          {bouton}
        </a>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2. LA CONSTELLATION — une nuit, des milliers de points de lumière aux
   trois couleurs, éparpillés ; quand on arrive, ils se rassemblent pour
   écrire un mot. La souris les écarte, ils reviennent. Un clic : ils
   s'envolent… et se reforment.
   ══════════════════════════════════════════════════════════════════════ */

type Point = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; r: number; c: string; ph: number }

export function Constellation({ mot, phrase, auteur }: { mot: string; phrase: string; auteur: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const toile = useRef<HTMLCanvasElement>(null)
  const police = useRef<HTMLParagraphElement>(null)
  const edition = useContext(Edition)
  useEffect(() => {
    const el = zone.current
    const cv = toile.current
    const ctx = cv?.getContext('2d')
    if (!el || !cv || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const couleurs = [TRIO[0].vif, TRIO[1].vif, TRIO[2].vif, '#ffffff']
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
      /* Le mot, dessiné hors écran, donne les places de chaque point. */
      const hors = document.createElement('canvas')
      hors.width = W
      hors.height = H
      const o = hors.getContext('2d')
      if (!o) return
      const famille = police.current ? getComputedStyle(police.current).fontFamily : 'serif'
      const taille = Math.min((W * 0.92) / Math.max(3, mot.length * 0.56), H * 0.36)
      o.font = `600 ${taille}px ${famille}`
      o.textAlign = 'center'
      o.textBaseline = 'middle'
      o.fillText(mot, W / 2, H * 0.42)
      const donnees = o.getImageData(0, 0, W, H).data
      const pas = Math.max(4, Math.round(Math.min(W, H) / 160))
      const places: { x: number; y: number }[] = []
      for (let y = 0; y < H; y += pas) for (let x = 0; x < W; x += pas) if ((donnees[(y * W + x) * 4 + 3] ?? 0) > 128) places.push({ x, y })
      points = places.map((p, i) => ({
        x: fige ? p.x : Math.random() * W,
        y: fige ? p.y : Math.random() * H,
        tx: p.x,
        ty: p.y,
        vx: 0,
        vy: 0,
        r: 0.8 + Math.random() * 1.5,
        c: couleurs[i % couleurs.length]!,
        ph: Math.random() * 6.283,
      }))
      /* Quelques étoiles de fond, qui ne rejoignent rien. */
      for (let k = 0; k < 30; k++) points.push({ x: Math.random() * W, y: Math.random() * H, tx: NaN, ty: NaN, vx: 0, vy: 0, r: 0.6 + Math.random(), c: '#ffffff', ph: Math.random() * 6.283 })
    }

    const peindre = (t: number) => {
      ctx.clearRect(0, 0, W, H)
      for (const p of points) {
        let ax = 0
        let ay = 0
        if (!Number.isNaN(p.tx) && (rassemble || fige)) {
          ax = (p.tx - p.x) * 0.014
          ay = (p.ty - p.y) * 0.014
        } else {
          ax = Math.sin(t / 2000 + p.ph) * 0.01
          ay = Math.cos(t / 2300 + p.ph) * 0.01
        }
        const dx = p.x - souris.x
        const dy = p.y - souris.y
        const d2 = dx * dx + dy * dy
        if (d2 < 120 * 120) {
          const d = Math.sqrt(d2) || 1
          const f = (1 - d / 120) * 1.4
          ax += (dx / d) * f
          ay += (dy / d) * f
        }
        p.vx = (p.vx + ax) * 0.86
        p.vy = (p.vy + ay) * 0.86
        p.x += p.vx
        p.y += p.vy
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t / 1400 + p.ph)
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
        window.setTimeout(() => (rassemble = true), 500)
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
        const v = 4 + Math.random() * 8
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
  }, [mot, edition])
  return (
    <div ref={zone} className={cn(PLEIN, 'cursor-crosshair')} style={{ background: `radial-gradient(ellipse at 50% 40%, #3a5262, ${NUIT} 70%)` }}>
      <canvas ref={toile} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <span className="sr-only">{mot}</span>
      <div className="pointer-events-none absolute inset-x-0 bottom-[11%] px-6 text-center">
        <p ref={police} className="mx-auto max-w-[36ch] font-[family-name:var(--ad-titre)] text-[clamp(20px,2.4vw,30px)] leading-[1.35] text-white/90">
          {propre(phrase)}
        </p>
        {auteur && <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/50">{auteur}</p>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3. LE PORTRAIT EN ONDES — le portrait arrive en douze bandes qui
   glissent des deux côtés pour se rejoindre ; trois bandes de couleur se
   glissent derrière. Survolé, une onde parcourt l'image à hauteur de la
   souris, comme la surface de l'eau.
   ══════════════════════════════════════════════════════════════════════ */

export function PortraitOndes({ portrait, surtitre, titre, texte, signature }: { portrait: Media | null; surtitre: string; titre: string; texte: string; signature: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const cadre = useRef<HTMLDivElement>(null)
  const N = 12
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cadre.current
    if (!el || e.pointerType !== 'mouse' || reduit()) return
    const r = el.getBoundingClientRect()
    const m = ((e.clientY - r.top) / r.height) * N
    el.querySelectorAll<HTMLElement>('[data-bande]').forEach((b, i) => {
      const f = Math.exp(-((i + 0.5 - m) ** 2) / 3)
      b.style.translate = `${(i % 2 ? 1 : -1) * f * 10}px 0`
    })
  }
  const calme = () => cadre.current?.querySelectorAll<HTMLElement>('[data-bande]').forEach((b) => (b.style.translate = '0 0'))
  const mots = decoupe(titre)
  return (
    <div ref={ref} className={cn(PLEIN, 'grid content-center items-center gap-6 px-[6vw] pb-8 pt-20 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:py-24')} style={{ background: IVOIRE }}>
      <div className="relative z-10 max-lg:order-2">
        {surtitre && (
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em]" style={{ color: TRIO[2].encre, opacity: vu ? 1 : 0, transition: 'opacity 1s .2s' }}>
            {surtitre}
          </p>
        )}
        <h2 className="mt-3 text-[clamp(24px,4vw,58px)] leading-[1.1]">
          {mots.map((m, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom">
              <span className={cn('inline-block whitespace-pre', m.accent && 'italic')} style={{ color: m.accent ? TRIO[2].encre : undefined, transform: vu ? 'none' : 'translateY(105%)', transition: `transform 1.1s ${DOUX} ${0.3 + i * 0.05}s` }}>
                {m.mot}{' '}
              </span>
            </span>
          ))}
        </h2>
        {texte && (
          <p className="mt-4 line-clamp-4 max-w-[52ch] whitespace-pre-line text-[15px] leading-[1.7] text-[var(--ad-pierre)] lg:mt-7 lg:line-clamp-[7] lg:text-[16.5px]" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1.4s 1.1s' }}>
            {texte}
          </p>
        )}
        {signature && (
          <p className="mt-4 font-[family-name:var(--ad-titre)] text-[20px] italic lg:mt-6 lg:text-[24px]" style={{ color: TRIO[0].encre, opacity: vu ? 1 : 0, transition: 'opacity 1.4s 1.5s' }}>
            {signature}
          </p>
        )}
      </div>
      <div className="relative mx-auto h-[min(72vh,700px)] w-full max-w-[500px] max-lg:h-[34vh] max-lg:max-w-[260px]" onPointerMove={bouge} onPointerLeave={calme}>
        {/* Une ombre de couleur, derrière. */}
        <span aria-hidden="true" className="absolute inset-0 rounded-[32px]" style={{ background: TRIO[0].fond, transform: vu ? 'translate(20px, 20px)' : 'translate(0,0)', transition: `transform 1.4s ${DOUX} 0.9s` }} />
        <div ref={cadre} role="img" aria-label={portrait?.alt ?? ''} className="absolute inset-0 overflow-hidden rounded-[32px] bg-[var(--ad-sable)]">
          {portrait &&
            Array.from({ length: N }, (_, i) => (
              <span
                key={i}
                data-bande=""
                className="absolute inset-x-0 overflow-hidden [transition:translate_.5s_cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  top: `${(i / N) * 100}%`,
                  height: `${100 / N + 0.4}%`,
                  transform: vu ? 'translateX(0)' : `translateX(${i % 2 ? 105 : -105}%)`,
                  transition: `transform 1.3s ${DOUX} ${0.1 + i * 0.05}s, translate .5s ${DOUX}`,
                }}
              >
                {/* Chaque bande montre sa tranche de la même image, cadrée sur tout le portrait. */}
                <span className="absolute inset-x-0" style={{ top: `${-i * 100}%`, height: `${N * 100}%` }}>
                  <Image src={portrait.url} alt="" fill sizes="520px" className="object-cover" />
                </span>
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   4. LE CHEMIN — un sentier serpente à travers l'écran ; une petite
   lumière le parcourt toute seule, trace le chemin derrière elle et, à
   chaque étape, la carte s'ouvre. Sur téléphone, le sentier descend.
   ══════════════════════════════════════════════════════════════════════ */

export function Chemin({ etapes }: { etapes: { titre: string; texte: string }[] }) {
  const zone = useRef<HTMLDivElement>(null)
  const trace = useRef<SVGPathElement>(null)
  const lumiere = useRef<HTMLSpanElement>(null)
  const edition = useContext(Edition)
  const [taille, setTaille] = useState({ w: 1200, h: 700 })
  const [atteinte, setAtteinte] = useState(-1)
  const n = Math.max(1, etapes.length)
  const vertical = taille.w < 768
  const pts = etapes.map((_, k) => {
    const f = n > 1 ? k / (n - 1) : 0.5
    return vertical ? { x: taille.w * (k % 2 ? 0.7 : 0.3), y: taille.h * (0.18 + f * 0.56) } : { x: taille.w * (0.12 + f * 0.76), y: taille.h * (k % 2 ? 0.66 : 0.4) }
  })
  let d = pts[0] ? `M ${vertical ? pts[0].x : -20} ${vertical ? -20 : pts[0].y} L ${pts[0].x} ${pts[0].y}` : ''
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
    /* La longueur du sentier à chaque étape. */
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
    const PAUSE = 1700
    const cycle = reperes.length * (MARCHE + PAUSE) + 2200
    const boucle = (t: number) => {
      if (!debut) debut = t
      const e = (t - debut) % cycle
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
    <div ref={zone} className={PLEIN} style={{ background: `linear-gradient(160deg, ${IVOIRE}, ${TRIO[0].fond})` }}>
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox={`0 0 ${taille.w} ${taille.h}`}>
        <path d={d} fill="none" stroke={TRIO[0].vif} strokeOpacity="0.35" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
        <path ref={trace} d={d} fill="none" stroke={TRIO[0].encre} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span ref={lumiere} aria-hidden="true" className="absolute left-0 top-0 z-20 -ml-2 -mt-2 h-4 w-4 rounded-full bg-white" style={{ boxShadow: `0 0 0 4px ${TRIO[0].vif}66, 0 0 16px 4px ${TRIO[0].vif}88` }} />
      {pts.map((pt, k) => {
        const e = etapes[k]!
        const t = trio(k)
        const ok = k <= atteinte
        const actif = k === atteinte
        const dessous = vertical ? false : k % 2 === 1
        return (
          <div key={k} className="absolute z-10" style={{ left: pt.x, top: pt.y }}>
            <span className="absolute -left-4 -top-4 grid h-8 w-8 place-items-center rounded-full border-2 text-[12px] font-semibold transition-[background-color,color,transform] duration-500" style={{ borderColor: t.encre, background: ok ? t.encre : 'white', color: ok ? 'white' : t.encre, transform: actif ? 'scale(1.25)' : 'scale(1)', transitionTimingFunction: REBOND }}>
              {k + 1}
            </span>
            <div
              className={cn('absolute w-[clamp(200px,22vw,300px)] rounded-[24px] p-5 transition-[opacity,transform,background-color,box-shadow] duration-700', vertical ? (k % 2 ? 'right-8 top-[-40px]' : 'left-8 top-[-40px]') : dessous ? 'left-1/2 top-10' : 'bottom-10 left-1/2')}
              style={{
                background: actif ? t.fond : 'rgba(255,255,255,0.75)',
                opacity: ok ? 1 : 0.4,
                transform: `${vertical ? '' : 'translateX(-50%)'} scale(${actif ? 1 : 0.94})`,
                boxShadow: actif ? '0 24px 50px -24px rgba(46,66,79,0.45)' : 'none',
                transitionTimingFunction: DOUX,
              }}
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.encre }}>
                Étape {k + 1}
              </p>
              <p className="mt-1 font-[family-name:var(--ad-titre)] text-[clamp(19px,1.8vw,24px)] leading-[1.2] text-[var(--ad-nuit)]">{e.titre}</p>
              {e.texte && <p className={cn('mt-2 text-[14px] leading-[1.55] text-[var(--ad-pierre)]', !actif && 'line-clamp-2')}>{e.texte}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   5. LES BULLES — les accompagnements flottent dans l'écran, bulles
   irisées aux trois couleurs, qui s'évitent et fuient doucement la
   souris. On en touche une : elle éclate, et sa fiche apparaît.
   ══════════════════════════════════════════════════════════════════════ */

export function Bulles({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const bulles = useRef<(HTMLButtonElement | null)[]>([])
  const survol = useRef<number | null>(null)
  const edition = useContext(Edition)
  const [eclatee, setEclatee] = useState<number | null>(null)
  const [ouverte, setOuverte] = useState<number | null>(null)
  const pause = useRef(false)
  pause.current = ouverte !== null

  useEffect(() => {
    const el = zone.current
    if (!el) return
    const n = services.length
    let W = el.clientWidth
    let H = el.clientHeight
    const taille = (i: number) => Math.round(Math.min(W, H) * (W < 640 ? 0.36 : 0.27) * (0.86 + (i % 3) * 0.1))
    /* Des places de départ sur une ellipse, des vitesses fixes : même rendu à chaque visite. */
    const corps = services.map((_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4
      const t = taille(i)
      return { x: W / 2 + Math.cos(a) * W * 0.28 - t / 2, y: H / 2 + Math.sin(a) * H * 0.22 - t / 2, vx: Math.cos(a * 3) * 0.35, vy: Math.sin(a * 2) * 0.3, t }
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
          /* La souris repousse doucement. */
          const cx = c.x + c.t / 2
          const cy = c.y + c.t / 2
          const dx = cx - souris.x
          const dy = cy - souris.y
          const d = Math.hypot(dx, dy) || 1
          if (d < c.t) {
            c.vx += (dx / d) * 0.06
            c.vy += (dy / d) * 0.06
          }
          /* Les bulles s'évitent. */
          corps.forEach((o, j) => {
            if (j === i) return
            const ex = cx - (o.x + o.t / 2)
            const ey = cy - (o.y + o.t / 2)
            const de = Math.hypot(ex, ey) || 1
            const min = (c.t + o.t) / 2
            if (de < min) {
              c.vx += (ex / de) * 0.04
              c.vy += (ey / de) * 0.04
            }
          })
          const v = Math.hypot(c.vx, c.vy)
          if (v > 0.6) {
            c.vx *= 0.96
            c.vy *= 0.96
          } else if (v < 0.15) {
            c.vx *= 1.04
            c.vy *= 1.04
          }
          c.x += c.vx
          c.y += c.vy
          if (c.x < 0 || c.x + c.t > W) c.vx *= -1
          if (c.y < 70 || c.y + c.t > H) c.vy *= -1
          c.x = Math.max(0, Math.min(W - c.t, c.x))
          c.y = Math.max(70, Math.min(H - c.t, c.y))
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
    window.setTimeout(() => setOuverte(i), reduit() ? 0 : 380)
  }
  const fermer = () => {
    setOuverte(null)
    window.setTimeout(() => setEclatee(null), 200)
  }
  const s = ouverte !== null ? services[ouverte] : null
  return (
    <div ref={zone} className={PLEIN} style={{ background: IVOIRE }}>
      <p className="pointer-events-none absolute inset-x-0 top-[10%] z-0 text-center font-[family-name:var(--ad-titre)] text-[clamp(26px,3.2vw,44px)] text-[var(--ad-nuit)]/70">
        Touchez une bulle.
      </p>
      {services.map((sv, i) => {
        const t = trio(i)
        return (
          <button
            key={sv.id}
            ref={(b) => {
              bulles.current[i] = b
            }}
            type="button"
            onPointerEnter={() => (survol.current = i)}
            onPointerLeave={() => (survol.current = null)}
            onClick={() => eclater(i)}
            className={cn(
              'group/bulle absolute left-0 top-0 grid place-items-center rounded-full p-[12%] text-center',
              eclatee === i ? 'pointer-events-none' : '',
            )}
            style={{ width: 200, height: 200 }}
          >
            <span
              className={cn('absolute inset-0 rounded-full transition-transform duration-500 group-hover/bulle:scale-105', eclatee === i ? 'motion-safe:animate-[ad-eclate_.4s_ease-out_forwards]' : eclatee === null && ouverte === null ? '' : '')}
              style={{
                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9) 0 4%, rgba(255,255,255,0) 14%), ${t.fond}b3`,
                boxShadow: `inset 0 0 0 1.5px ${t.vif}, 0 24px 44px -30px rgba(46,66,79,0.4)`,
                transitionTimingFunction: REBOND,
              }}
            />
            {eclatee === i &&
              [0, 1].map((k) => <span key={k} aria-hidden="true" className="absolute inset-0 rounded-full border-2 opacity-0 motion-safe:animate-[ad-ride_.8s_ease-out_forwards]" style={{ borderColor: t.vif, animationDelay: `${k * 0.12}s` }} />)}
            <span className={cn('relative transition-opacity duration-200', eclatee === i && 'opacity-0')}>
              <span className="block font-[family-name:var(--ad-titre)] text-[clamp(15px,1.6vw,22px)] leading-[1.15]" style={{ color: t.encre }}>
                {sv.title}
              </span>
              {sv.duration && <span className="mt-1 block text-[11.5px] text-[var(--ad-nuit)]/60">{sv.duration}</span>}
            </span>
          </button>
        )
      })}
      {s && ouverte !== null && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[rgba(46,66,79,0.18)] p-5 backdrop-blur-[3px] motion-safe:animate-[ad-fondu_.3s_ease-out_backwards]" onClick={fermer}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-[min(560px,100%)] overflow-hidden rounded-[32px] bg-white shadow-[0_40px_80px_-40px_rgba(46,66,79,0.6)] motion-safe:animate-[ad-mot-doux_.7s_cubic-bezier(0.34,1.4,0.64,1)_backwards]">
            {s.media && (
              <div className="relative aspect-[16/8]">
                <Image src={s.media.url} alt="" fill sizes="560px" className="object-cover" />
              </div>
            )}
            <div className="p-7" style={{ background: trio(ouverte).fond }}>
              {s.duration && <p className="text-[13px] font-semibold" style={{ color: trio(ouverte).encre }}>{s.duration}</p>}
              <p className="mt-1 font-[family-name:var(--ad-titre)] text-[30px] leading-[1.1]" style={{ color: trio(ouverte).encre }}>
                {s.title}
              </p>
              <p className="mt-3 text-[15.5px] leading-[1.7] text-[var(--ad-nuit)]/80">{propre(s.excerpt)}</p>
              <a href={rdv} className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white" style={{ background: trio(ouverte).encre }}>
                Prendre rendez-vous <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <button type="button" onClick={fermer} aria-label="Fermer" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--ad-nuit)] shadow">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   6. LES VOLETS — un diaporama plein écran : la photo avance doucement
   (Ken Burns) puis trois volets de couleur balaient l'écran l'un après
   l'autre et découvrent la suivante. Un clic à gauche ou à droite pour
   naviguer.
   ══════════════════════════════════════════════════════════════════════ */

export function Volets({ photos }: { photos: Media[] }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [i, setI] = useState(0)
  const [affichee, setAffichee] = useState(0)
  const [passage, setPassage] = useState(0)
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
    const t = window.setInterval(() => rappel.current(1), 6000)
    return () => window.clearInterval(t)
  }, [vu, n])
  const p = photos[affichee]
  return (
    <div ref={ref} className={cn(PLEIN, 'bg-[var(--ad-nuit)]')}>
      {p && (
        <div key={p.id} className="absolute inset-0 motion-safe:animate-[ad-kb_7s_ease-out_forwards]">
          <Image src={p.url} alt={p.alt} fill sizes="100vw" className="object-cover" priority={false} />
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(46,66,79,0.55),transparent_45%)]" />
      {/* Le volet : une seule couleur, à tour de rôle. */}
      {passage > 0 && <span key={passage} aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-full motion-safe:animate-[ad-volet_1.3s_cubic-bezier(0.77,0,0.18,1)_forwards]" style={{ background: trio(passage).fond, transform: 'translateX(-101%)' }} />}
      {/* Navigation : moitié gauche, moitié droite. */}
      <button type="button" onClick={() => aller(-1)} aria-label="Photo précédente" className="absolute inset-y-0 left-0 z-20 w-1/2 cursor-w-resize" />
      <button type="button" onClick={() => aller(1)} aria-label="Photo suivante" className="absolute inset-y-0 right-0 z-20 w-1/2 cursor-e-resize" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-6 p-[clamp(20px,4vw,48px)] text-white">
        <div>
          {photos[i]?.caption && <p className="font-[family-name:var(--ad-titre)] text-[clamp(20px,2.2vw,30px)] text-white">{photos[i]?.caption}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] tabular-nums text-white/70">
            {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <span className="relative h-[3px] w-[clamp(80px,14vw,200px)] overflow-hidden rounded-full bg-white/25">
            {vu && <span key={`${i}-${passage}`} className="absolute inset-y-0 left-0 w-full origin-left bg-white motion-safe:animate-[ad-remplir_6s_linear_forwards]" />}
          </span>
          <span className="pointer-events-auto flex gap-2">
            <button type="button" onClick={() => aller(-1)} aria-label="Précédente" className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-[var(--ad-nuit)]">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => aller(1)} aria-label="Suivante" className="grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--ad-nuit)]">
              <ArrowRight className="h-4 w-4" />
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   7. LE TAMBOUR — les questions sont gravées sur un cylindre en trois
   dimensions qui tourne comme une molette ; la question de face s'ouvre
   à côté, sur un bloc qui prend sa couleur. Il tourne seul, ou au doigt.
   ══════════════════════════════════════════════════════════════════════ */

export function Tambour({ faq }: { faq: FaqItem[] }) {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [k, setK] = useState(0)
  const [main, setMain] = useState(false)
  const n = Math.max(1, faq.length)
  const angle = 360 / n
  const H = 92
  const R = Math.round(H / 2 / Math.tan(Math.PI / n))
  const tirer = useRef<{ y: number; k: number } | null>(null)
  useEffect(() => {
    if (!vu || main || n < 2 || reduit()) return
    const t = window.setInterval(() => setK((x) => x + 1), 5200)
    return () => window.clearInterval(t)
  }, [vu, main, n])
  const ici = ((k % n) + n) % n
  const q = faq[ici]
  const t = trio(ici)
  return (
    <div ref={ref} className={cn(PLEIN, 'grid content-center items-center gap-4 px-[6vw] pb-8 pt-20 lg:grid-cols-2 lg:gap-12 lg:py-24')} style={{ background: IVOIRE }}>
      <div
        className="relative h-[min(64vh,560px)] touch-none select-none [perspective:640px] max-lg:h-[32vh]"
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
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[92px] -translate-y-1/2 border-y" style={{ borderColor: 'var(--ad-sable-fonce)' }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_bottom,var(--ad-ivoire),transparent_30%,transparent_70%,var(--ad-ivoire))]" />
        <div className="absolute inset-x-0 top-1/2 h-[92px] [transform-style:preserve-3d]" style={{ transform: `translateY(-50%) rotateX(${k * angle}deg)`, transition: `transform 1s ${REBOND}` }}>
          {faq.map((f, i) => {
            let ecart = Math.abs(i - ici)
            ecart = Math.min(ecart, n - ecart)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setK(k + (((i - ici + n + Math.floor(n / 2)) % n) - Math.floor(n / 2)))}
                className="absolute inset-0 flex items-center px-6 text-left [backface-visibility:hidden]"
                style={{ transform: `rotateX(${-i * angle}deg) translateZ(${R}px)`, opacity: 1 - ecart * 0.22 }}
              >
                <span className={cn('line-clamp-2 font-[family-name:var(--ad-titre)] text-[clamp(17px,1.8vw,24px)] leading-[1.2] transition-colors duration-500', ecart === 0 ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-gris)]')}>{f.question}</span>
              </button>
            )
          })}
        </div>
        <div className="absolute bottom-0 left-1/2 z-30 flex -translate-x-1/2 gap-2">
          <button type="button" onClick={() => setK(k - 1)} aria-label="Question précédente" className="grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--ad-nuit)] shadow">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setK(k + 1)} aria-label="Question suivante" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--ad-nuit)] text-white shadow">
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col justify-end rounded-[28px] p-[clamp(20px,4vw,52px)] transition-colors duration-700 lg:min-h-[min(54vh,460px)]" style={{ background: t.fond }} aria-live="polite">
        {q && (
          <div key={q.id} className="motion-safe:animate-[ad-remonte_.8s_cubic-bezier(0.22,1,0.36,1)_backwards]">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.encre }}>
              Question {String(ici + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </p>
            <p className="mt-2 font-[family-name:var(--ad-titre)] text-[clamp(20px,2.6vw,36px)] leading-[1.2]" style={{ color: t.encre }}>
              {q.question}
            </p>
            <p className="mt-3 line-clamp-4 whitespace-pre-line text-[14.5px] leading-[1.65] text-[var(--ad-nuit)]/80 lg:mt-5 lg:line-clamp-[8] lg:text-[16px]">{propre(q.answer)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   8. LA PORTE — une porte en arche, couleur abricot. Survolée, elle
   s'entrouvre et la lumière filtre ; un clic, elle s'ouvre en grand sur
   le cabinet, la lumière se répand au sol, et les coordonnées sont là.
   ══════════════════════════════════════════════════════════════════════ */

export function Porte({ photo, adresse, telephone, email, rdv, titre }: { photo: Media | null; adresse: string | null; telephone: string | null; email: string | null; rdv: string; titre: string }) {
  const edition = useContext(Edition)
  const [ouverte, setOuverte] = useState(false)
  const [entrouverte, setEntrouverte] = useState(false)
  const ouvert = ouverte || edition
  const angle = ouvert ? -104 : entrouverte ? -16 : 0
  const t = TRIO[1]
  const mots = decoupe(titre)
  return (
    <div className={cn(PLEIN, 'grid content-center items-center gap-6 px-[6vw] pb-8 pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:py-24')} style={{ background: IVOIRE }}>
      <div className="relative z-10 max-lg:text-center">
        <h2 className="text-[clamp(30px,5vw,72px)] leading-[1.05]">
          {mots.map((m, i) => (
            <span key={i} className={cn('whitespace-pre', m.accent && 'italic')} style={{ color: m.accent ? t.encre : undefined }}>
              {m.mot}{' '}
            </span>
          ))}
        </h2>
        <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.7] text-[var(--ad-pierre)] max-lg:mx-auto lg:mt-5 lg:text-[16.5px]">{ouvert ? 'Entrez, installez-vous. Voici comment me trouver.' : 'Touchez la porte : elle s’ouvre sur le cabinet.'}</p>
        <button type="button" onClick={() => setOuverte((o) => !o)} className="mt-4 inline-flex rounded-full px-6 py-3 text-[14.5px] font-semibold text-white lg:mt-7" style={{ background: NUIT }}>
          {ouvert ? 'Refermer la porte' : 'Ouvrir la porte'}
        </button>
      </div>
      <div className="relative mx-auto h-[min(68vh,620px)] w-[min(440px,78vw)] max-lg:h-[46vh] max-lg:w-[min(300px,74vw)]">
        {/* La lumière au sol. */}
        <span aria-hidden="true" className="absolute -bottom-[14%] left-1/2 h-[18%] w-[170%] -translate-x-1/2 [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)]" style={{ background: `linear-gradient(to bottom, ${t.vif}, transparent)`, opacity: ouvert ? 0.45 : entrouverte ? 0.15 : 0, transition: 'opacity 1.2s' }} />
        {/* Le cadre et la pièce derrière. */}
        <div className="absolute inset-0 overflow-hidden rounded-t-full border-[10px] bg-[var(--ad-sable)]" style={{ borderColor: '#fff', boxShadow: '0 40px 80px -40px rgba(46,66,79,0.5)' }}>
          {photo && <Image src={photo.url} alt={photo.alt} fill sizes="460px" className="object-cover" style={{ transform: ouvert ? 'scale(1)' : 'scale(1.15)', transition: `transform 1.8s ${DOUX}` }} />}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.fond}f0 0%, ${t.fond}66 45%, transparent 70%)` }} />
          <div className="absolute inset-x-0 bottom-0 p-5" style={{ opacity: ouvert ? 1 : 0, transform: ouvert ? 'none' : 'translateY(20px)', transition: `opacity .8s .7s, transform 1s ${DOUX} .7s` }}>
            <ul className="flex flex-col gap-2 rounded-[22px] bg-white/95 p-4 text-[14px] text-[var(--ad-nuit)]">
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
                <a href={rdv} className="inline-flex rounded-full px-4 py-2 text-[13.5px] font-semibold text-white" style={{ background: t.encre }}>
                  Prendre rendez-vous
                </a>
              </li>
            </ul>
          </div>
        </div>
        {/* Le battant. */}
        <div className="absolute inset-0 [perspective:1800px]" style={{ pointerEvents: ouvert ? 'none' : 'auto' }}>
          <button
            type="button"
            aria-label="Ouvrir la porte"
            onClick={() => setOuverte(true)}
            onMouseEnter={() => setEntrouverte(true)}
            onMouseLeave={() => setEntrouverte(false)}
            className="absolute inset-0 origin-left rounded-t-full border-[10px] border-white [transform-style:preserve-3d]"
            style={{ transform: `rotateY(${angle}deg)`, transition: `transform ${ouvert ? 1.6 : 0.9}s cubic-bezier(0.65,0,0.35,1)`, background: t.fond, boxShadow: entrouverte && !ouvert ? `12px 0 40px -6px ${t.vif}` : 'none' }}
          >
            {/* Les panneaux, la poignée. */}
            <span aria-hidden="true" className="absolute inset-x-[14%] top-[10%] h-[36%] rounded-t-full border-2" style={{ borderColor: `${t.encre}33` }} />
            <span aria-hidden="true" className="absolute inset-x-[14%] bottom-[8%] h-[34%] rounded-[14px] border-2" style={{ borderColor: `${t.encre}33` }} />
            <span aria-hidden="true" className="absolute right-[9%] top-[54%] h-5 w-5 rounded-full shadow-[inset_-2px_-3px_4px_rgba(0,0,0,0.2)] [backface-visibility:hidden]" style={{ background: t.encre }} />
            <span aria-hidden="true" className="absolute left-1/2 top-[50%] -translate-x-1/2 font-[family-name:var(--ad-titre)] text-[clamp(18px,2vw,24px)] italic [backface-visibility:hidden]" style={{ color: t.encre }}>
              Entrez
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   9. LE FIL DE LUMIÈRE — une nuit ; la souris laisse derrière elle un
   ruban de lumière aux trois couleurs (au repos, il se dessine tout
   seul). Le bouton, touché, ouvre un cercle de lagon qui remplit l'écran.
   ══════════════════════════════════════════════════════════════════════ */

export function FilDeLumiere({ titre, texte, bouton, rdv }: { titre: string; texte: string; bouton: string; rdv: string }) {
  const zone = useRef<HTMLDivElement>(null)
  const toile = useRef<HTMLCanvasElement>(null)
  const [cercle, setCercle] = useState<{ x: number; y: number } | null>(null)
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
    const couleurs = TRIO.map((x) => x.vif)
    const melange = (f: number) => couleurs[Math.min(2, Math.floor(f * 3))]!
    const boucle = (t: number) => {
      /* Au repos, le fil se dessine seul (une lemniscate lente). */
      if (t - dernier > 1400) {
        const a = t / 1400
        pts.push({ x: W / 2 + Math.sin(a) * W * 0.32, y: H / 2 + Math.sin(a * 2) * H * 0.18, t })
      }
      while (pts.length && t - pts[0]!.t > 1100) pts.shift()
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 1; i < pts.length; i++) {
        const f = i / pts.length
        const a = pts[i - 1]!
        const b = pts[i]!
        ctx.strokeStyle = melange(f)
        ctx.globalAlpha = f
        ctx.lineWidth = 1 + f * 5
        ctx.shadowColor = melange(f)
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
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
  }, [])
  const ouvrir = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || reduit()) return
    e.preventDefault()
    const r = zone.current!.getBoundingClientRect()
    setCercle({ x: e.clientX - r.left, y: e.clientY - r.top })
    window.setTimeout(() => window.location.assign(rdv), 1100)
  }
  const mots = decoupe(titre)
  return (
    <div ref={zone} className={PLEIN} style={{ background: `radial-gradient(ellipse at 50% 60%, #3a5262, ${NUIT} 70%)` }}>
      <canvas ref={toile} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 grid h-full place-items-center px-6 text-center">
        <div>
          <h2 className="text-[clamp(40px,7vw,104px)] leading-[1.02] text-white">
            {mots.map((m, i) => (
              <span key={i} className={cn('whitespace-pre', m.accent && 'italic')} style={{ color: m.accent ? TRIO[0].vif : undefined }}>
                {m.mot}{' '}
              </span>
            ))}
          </h2>
          {texte && <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-[1.7] text-white/70">{texte}</p>}
          <a href={rdv} onClick={ouvrir} className="group mt-10 inline-flex items-center gap-3 rounded-full bg-white py-2 pl-7 pr-2 text-[16px] font-semibold text-[var(--ad-nuit)] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-105">
            {bouton}
            <span className="grid h-11 w-11 place-items-center rounded-full text-white transition-transform duration-500 group-hover:rotate-[-45deg]" style={{ background: TRIO[0].encre }}>
              <ArrowRight className="h-5 w-5" />
            </span>
          </a>
        </div>
      </div>
      {cercle && (
        <div className="absolute inset-0 z-30 grid place-items-center motion-safe:animate-[ad-cercle_1s_cubic-bezier(0.65,0,0.35,1)_forwards]" style={{ background: TRIO[0].fond, ['--cx' as string]: `${cercle.x}px`, ['--cy' as string]: `${cercle.y}px` }}>
          <p className="font-[family-name:var(--ad-titre)] text-[clamp(40px,7vw,96px)] italic motion-safe:animate-[ad-remonte_.8s_cubic-bezier(0.22,1,0.36,1)_.35s_backwards]" style={{ color: TRIO[0].encre }}>
            À très vite.
          </p>
        </div>
      )}
    </div>
  )
}
