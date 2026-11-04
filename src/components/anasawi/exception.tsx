'use client'

import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useRef, useState } from 'react'

import { Edition, useAvancement } from './vivant'
import { cn } from '@/lib/utils'
import type { Media, ServiceWithMedia } from '@/server/db/schema'

/**
 * LES MODÈLES D’EXCEPTION de la version moderne (suite : exception2.tsx). Vitrine : /moderne/exception. — chacun porte UNE idée
 * de mouvement, plus surprenante que la précédente, dans la même DA
 * (ivoire, nuit, bleu d'Anasawi, accents turquoise, serif douce).
 *
 * Même règle que `vivant.tsx` : le défilement et la souris n'écrivent
 * que des variables CSS ; tout le reste est du calc(). Rien ne bouge pour
 * qui a demandé moins d'animations, et l'éditeur fige les mises en scène.
 */

const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Le texte saisi, avec ses accents « *mot* ». */
function accent(texte: string) {
  return texte.split('*').map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
}

/** Une image optimisée en arrière-plan CSS (pour les découpes). */
const fond = (url: string, w = 1920) => `url("/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75")`

/* ══════════════════════════════════════════════════════════════════════
   1. LES LETTRES VIVANTES — un très grand titre dont les lettres arrivent
   en cascade, puis se soulèvent et s'épaississent à l'approche de la
   souris, comme une respiration qui suit le regard. Sur écran tactile :
   une vague lente les parcourt.
   ══════════════════════════════════════════════════════════════════════ */

export function LettresVivantes({ texte, className }: { texte: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
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
      { rootMargin: '0px 0px -15% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [edition])

  /* La proximité de la souris, lettre par lettre, une fois par image. */
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
        if (!c || !pos) {
          l.style.setProperty('--r', '0')
          return l.style.setProperty('--f', '0')
        }
        const d = Math.hypot(c.x - pos.x, c.y - pos.y)
        const f = Math.max(0, 1 - d / rayon)
        l.style.setProperty('--f', (f * f).toFixed(3))
        /* Elles se penchent vers la souris, comme des fleurs vers la lumière. */
        l.style.setProperty('--r', (Math.max(-1, Math.min(1, (pos.x - c.x) / rayon)) * f).toFixed(3))
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
  }, [edition])

  let index = 0
  const mots = texte.split(' ')
  let dansAccent = false
  return (
    <h2 ref={ref} className={cn('leading-[0.98]', className)} aria-label={texte.replace(/\*/g, '')}>
      {mots.map((mot, m) => {
        const ouvre = mot.startsWith('*')
        if (ouvre) dansAccent = true
        const estAccent = dansAccent
        if (mot.endsWith('*')) dansAccent = false
        const propre = mot.replace(/\*/g, '')
        return (
          <span key={m} aria-hidden="true" className="inline-block whitespace-nowrap">
            {[...propre].map((ch) => {
              const i = index++
              return (
                <span
                  key={i}
                  data-l=""
                  className={cn(
                    'inline-block [--f:0] [--r:0] [transition:transform_0.6s_cubic-bezier(0.22,1,0.36,1),font-variation-settings_0.6s,color_0.6s]',
                    estAccent && 'text-[var(--ad-bleu)] italic',
                    vu ? 'motion-safe:animate-[ad-lettre_1.1s_cubic-bezier(0.22,1,0.36,1)_backwards] [@media(hover:none)]:motion-safe:animate-[ad-lettre_1.1s_cubic-bezier(0.22,1,0.36,1)_backwards,ad-vague_5s_ease-in-out_1.2s_infinite]' : 'opacity-0',
                  )}
                  style={{
                    animationDelay: vu ? `${i * 0.028}s, ${1.2 + i * 0.09}s` : undefined,
                    transform: 'translateY(calc(var(--f) * -0.16em)) rotate(calc(var(--r) * 9deg)) scale(calc(1 + var(--f) * 0.06))',
                    textShadow: '0 calc(var(--f) * 0.12em) calc(var(--f) * 0.3em) rgba(70,114,138,calc(var(--f) * 0.25))',
                    fontVariationSettings: '"wght" calc(380 + var(--f) * 260)',
                    color: estAccent ? undefined : 'color-mix(in srgb, var(--ad-bleu) calc(var(--f) * 70%), var(--ad-nuit))',
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

/* ══════════════════════════════════════════════════════════════════════
   2. LA FENTE — une phrase coupée en deux par un trait de lumière. On
   descend : les deux moitiés s'écartent, la fente s'ouvre en une photo
   qui finit par remplir l'écran, et la légende apparaît dedans.
   ══════════════════════════════════════════════════════════════════════ */

export function Fente({ haut, bas, legende, photo }: { haut: string; bas: string; legende: string; photo: Media | null }) {
  const ref = useAvancement<HTMLElement>('colle', true)
  const edition = useContext(Edition)
  return (
    <section ref={ref} className={cn('relative [--e:0]', edition ? 'h-[calc(var(--ad-vh)*100)]' : 'h-[calc(var(--ad-vh)*230)]')}>
      <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] items-center justify-center overflow-hidden">
        {/* La photo, derrière la fente. */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'inset(calc((1 - var(--e)) * 49.4%) calc((1 - var(--e)) * 6%) round calc((1 - var(--e)) * 400px))',
          }}
        >
          {photo && (
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              sizes="100vw"
              className="object-cover"
              style={{ transform: 'scale(calc(1.35 - var(--e) * 0.35))' }}
            />
          )}
          <div className="absolute inset-0 bg-[var(--ad-nuit)]" style={{ opacity: 'calc(var(--e) * 0.35)' }} />
          <p
            className="absolute inset-x-0 bottom-[12%] px-6 text-center text-[clamp(18px,2.2vw,26px)] text-white"
            style={{ opacity: 'clamp(0, calc((var(--e) - 0.7) * 4), 1)', transform: 'translateY(calc((1 - var(--e)) * 30px))' }}
          >
            {legende}
          </p>
        </div>
        {/* Les deux moitiés de la phrase, qui s'écartent. */}
        <p
          className="pointer-events-none absolute inset-x-0 bottom-1/2 mb-[clamp(10px,1.6vw,22px)] px-5 text-center font-[family-name:var(--ad-titre)] text-[clamp(40px,9vw,150px)] leading-[0.95] tracking-[-0.03em] text-[var(--ad-nuit)]"
          style={{ transform: 'translateY(calc(var(--e) * var(--ad-vh) * -60))', opacity: 'clamp(0, calc(1 - var(--e) * 1.6), 1)', letterSpacing: 'calc(-0.03em + var(--e) * 0.22em)', filter: 'blur(calc(var(--e) * 12px))' }}
        >
          {accent(haut)}
        </p>
        <p
          className="pointer-events-none absolute inset-x-0 top-1/2 mt-[clamp(10px,1.6vw,22px)] px-5 text-center font-[family-name:var(--ad-titre)] text-[clamp(40px,9vw,150px)] leading-[0.95] tracking-[-0.03em] text-[var(--ad-nuit)]"
          style={{ transform: 'translateY(calc(var(--e) * var(--ad-vh) * 60))', opacity: 'clamp(0, calc(1 - var(--e) * 1.6), 1)', letterSpacing: 'calc(-0.03em + var(--e) * 0.22em)', filter: 'blur(calc(var(--e) * 12px))' }}
        >
          {accent(bas)}
        </p>
        {/* Le trait de lumière, avant que la fente s'ouvre. */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-px w-[88%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,var(--ad-or),transparent)] motion-safe:animate-[ad-lueur-trait_3s_ease-in-out_infinite]"
          style={{ opacity: 'clamp(0, calc(1 - var(--e) * 8), 1)' }}
        />
        {/* Le halo : la lumière qui filtre déjà par la fente. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[30vh] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(79,169,166,0.22),transparent)] blur-2xl"
          style={{ opacity: 'clamp(0, calc(1 - var(--e) * 3), 1)', transform: 'translate(-50%, -50%) scaleY(calc(0.2 + var(--e) * 3))' }}
        />
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3. LA LAMPE — la photo est en noir et blanc ; là où passe la souris,
   une lumière ronde et douce lui rend ses couleurs. Sur écran tactile, la
   lumière se promène seule.
   ══════════════════════════════════════════════════════════════════════ */

export function Lampe({ photo, titre, texte }: { photo: Media | null; titre: string; texte: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [main, setMain] = useState(false)
  const bouge = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--lampe-x', `${((e.clientX - r.left) / r.width) * 100}%`)
    e.currentTarget.style.setProperty('--lampe-y', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  return (
    <div
      ref={ref}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setMain(true)}
      onPointerLeave={() => setMain(false)}
      onPointerMove={bouge}
      className={cn(
        'group/lampe relative isolate aspect-[4/5] w-full overflow-hidden rounded-[36px] bg-[var(--ad-sable-fonce)] [transition:--lampe-r_0.7s_ease] sm:aspect-[16/10]',
        !main && 'motion-safe:animate-[ad-errance_14s_ease-in-out_infinite]',
      )}
      style={{ ['--lampe-r' as string]: main ? '300px' : '200px' }}
    >
      {photo && (
        <>
          <Image src={photo.url} alt={photo.alt} fill sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover [filter:grayscale(1)_contrast(1.05)_brightness(0.92)]" />
          <Image
            src={photo.url}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 1024px) 100vw, 1100px"
            className="object-cover"
            style={{
              maskImage: 'radial-gradient(circle var(--lampe-r) at var(--lampe-x) var(--lampe-y), #000 35%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(circle var(--lampe-r) at var(--lampe-x) var(--lampe-y), #000 35%, transparent 100%)',
            }}
          />
        </>
      )}
      {/* Le bord de la lumière : un anneau très doux, comme sous un abat-jour. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{ background: 'radial-gradient(circle var(--lampe-r) at var(--lampe-x) var(--lampe-y), transparent 58%, rgba(191,229,226,0.22) 70%, transparent 82%)' }}
      />
      {/* Le grain, pour la matière de la photo. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.13] mix-blend-overlay [background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E&quot;)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(46,66,79,0.75),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
        <h3 className="max-w-[16ch] text-[clamp(30px,4vw,56px)] leading-[1.02] text-white [&_em]:[-webkit-text-fill-color:#bfe5e2] [&_em]:[background:none]">{accent(titre)}</h3>
        <p className="mt-3 max-w-[44ch] text-[15px] leading-[1.6] text-white/80 sm:text-[16px]">{texte}</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   4. L'ÉVENTAIL — les photos, empilées comme un jeu de cartes, s'ouvrent
   en éventail à mesure qu'on descend. Survolée, une carte se lève.
   ══════════════════════════════════════════════════════════════════════ */

export function Eventail({ photos }: { photos: Media[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const liste = photos.slice(0, 7)
  const n = liste.length
  const milieu = (n - 1) / 2
  return (
    <div
      ref={ref}
      className="relative mx-auto h-[clamp(300px,52vw,560px)] w-full max-w-[1100px] [--p:1] [--pas:42%] [perspective:1800px] sm:[--pas:62%]"
    >
      {liste.map((p, i) => {
        const k = i - milieu
        /* Chaque carte s'ouvre un peu après sa voisine plus centrale. */
        const ouv = `clamp(0, calc((var(--p) - ${(0.14 + Math.abs(k) * 0.035).toFixed(3)}) * 3.2), 1)`
        return (
          <figure
            key={p.id}
            className="group/carte absolute bottom-0 left-1/2 aspect-[3/4] w-[clamp(120px,20vw,230px)] origin-[50%_120%] [transform-style:preserve-3d]"
            style={{
              zIndex: 10 + i,
              ['--ouv' as string]: ouv,
              transform: `translateX(-50%) translateX(calc(var(--ouv) * ${k} * var(--pas))) rotate(calc(var(--ouv) * ${k * 7}deg)) rotateY(calc(var(--ouv) * ${-k * 6}deg)) translateY(calc(var(--ouv) * ${Math.abs(k) * 5}%)) translateZ(calc((1 - var(--ouv)) * ${-Math.abs(k) * 30}px))`,
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[var(--ad-sable-fonce)] shadow-[0_30px_60px_-30px_rgba(46,66,79,0.55)] ring-4 ring-[var(--ad-ivoire)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/carte:-translate-y-8 group-hover/carte:scale-[1.06]">
              <Image src={p.url} alt={p.alt} fill sizes="230px" className="object-cover" />
            </div>
            {p.caption && (
              <figcaption className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] text-[var(--ad-gris)] opacity-0 transition-opacity duration-300 group-hover/carte:opacity-100">
                {p.caption}
              </figcaption>
            )}
          </figure>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   5. L'ORBITE — les accompagnements tournent lentement autour du
   portrait. On en survole un : l'orbite s'arrête, il vient au centre.
   ══════════════════════════════════════════════════════════════════════ */

export function Orbite({ services, portrait, rdv, bouton }: { services: ServiceWithMedia[]; portrait: Media | null; rdv: string; bouton: string }) {
  const [choisi, setChoisi] = useState<number | null>(null)
  const liste = services.slice(0, 8)
  const n = Math.max(1, liste.length)
  const s = choisi !== null ? liste[choisi] : null
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="group/orbite relative aspect-square w-[var(--anneau)] [--anneau:min(620px,70vw)] sm:[--anneau:min(620px,80vw)]">
        {/* Les anneaux. */}
        <span aria-hidden="true" className="absolute inset-[6%] rounded-full border border-[var(--ad-sable-fonce)]" />
        <span aria-hidden="true" className="absolute inset-[22%] rounded-full border border-dashed border-[var(--ad-or)]/40 motion-safe:animate-[ad-tourner_90s_linear_infinite_reverse]" />
        {/* La comète : un point de lumière qui fait le tour, plus vite. */}
        <span aria-hidden="true" className="absolute inset-[6%] motion-safe:animate-[ad-tourner_14s_linear_infinite]">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ad-or)] shadow-[0_0_0_6px_rgba(79,169,166,0.18),0_0_24px_6px_rgba(79,169,166,0.45)]" />
        </span>
        {/* Un pouls autour du centre quand un accompagnement y vient. */}
        {s && <span key={`pouls-${s.id}`} aria-hidden="true" className="absolute inset-[27%] rounded-full border-2 border-[var(--ad-or)] motion-safe:animate-[ad-onde-large_1.4s_ease-out_backwards]" />}
        {/* Le centre : le portrait, ou l'accompagnement survolé. */}
        <div className="absolute inset-[27%] overflow-hidden rounded-full bg-[var(--ad-sable-fonce)] shadow-[0_40px_80px_-40px_rgba(46,66,79,0.6)]">
          {portrait && <Image src={portrait.url} alt={portrait.alt} fill sizes="340px" className={cn('object-cover transition-[transform,filter] duration-700', s && 'scale-110 blur-[3px]')} />}
          <div
            className={cn(
              'absolute inset-0 grid place-items-center bg-[rgba(46,66,79,0.78)] p-[12%] text-center text-white transition-opacity duration-500',
              s ? 'opacity-100' : 'opacity-0',
            )}
            aria-live="polite"
          >
            {s && (
              <div className="motion-safe:animate-[ad-bulle_0.5s_cubic-bezier(0.34,1.4,0.64,1)_backwards]" key={s.id}>
                <p className="font-[family-name:var(--ad-titre)] text-[clamp(16px,2.4vw,26px)] leading-[1.1]">{s.title}</p>
                {s.duration && <p className="mt-1.5 text-[clamp(11px,1.3vw,13px)] text-white/70">{s.duration}</p>}
              </div>
            )}
          </div>
        </div>
        {/* L'orbite. */}
        <ul
          className="absolute inset-0 motion-safe:animate-[ad-tourner_70s_linear_infinite] group-hover/orbite:[animation-play-state:paused]"
          onMouseLeave={() => setChoisi(null)}
        >
          {liste.map((sv, i) => {
            const angle = (i / n) * 360
            return (
              <li
                key={sv.id}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `rotate(${angle}deg) translateY(calc(var(--anneau) * -0.44)) rotate(${-angle}deg)` }}
              >
                {/* Contre-rotation : l'étiquette reste droite pendant que l'orbite tourne. */}
                <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                <span className="block motion-safe:animate-[ad-tourner_70s_linear_infinite_reverse] group-hover/orbite:[animation-play-state:paused]">
                  <button
                    type="button"
                    onMouseEnter={() => setChoisi(i)}
                    onFocus={() => setChoisi(i)}
                    onClick={() => setChoisi(i)}
                    className={cn(
                      'block max-w-[124px] rounded-full border px-3 py-1.5 text-center [text-wrap:balance] text-[11.5px] font-semibold leading-[1.2] sm:max-w-none sm:whitespace-nowrap shadow-[0_10px_30px_-16px_rgba(46,66,79,0.5)] transition-[background-color,color,transform] duration-300 sm:px-4 sm:py-2 sm:text-[14px]',
                      choisi === i
                        ? 'scale-110 border-[var(--ad-nuit)] bg-[var(--ad-nuit)] text-white'
                        : 'border-white bg-white/90 text-[var(--ad-nuit)] backdrop-blur hover:scale-105',
                    )}
                  >
                    {sv.title}
                  </button>
                </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="min-h-[86px] max-w-[54ch] text-center" aria-live="polite">
        {s ? (
          <>
            <p className="text-[16px] leading-[1.65] text-[var(--ad-pierre)]">{s.excerpt.replace(/\*/g, '')}</p>
            <a href={rdv} className="group mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ad-nuit)]">
              {bouton}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </>
        ) : (
          <p className="text-[14px] text-[var(--ad-gris)]">Survolez ou touchez un accompagnement.</p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   6. LE RUBAN — une phrase écrite en cercle, deux anneaux qui tournent en
   sens contraire au rythme du défilement, et la conviction au centre.
   ══════════════════════════════════════════════════════════════════════ */

export function Ruban({ ruban, phrase, auteur }: { ruban: string; phrase: string; auteur: string }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  /* Chaque anneau est rempli exactement : la phrase y est répétée autant
     de fois qu'il le faut, puis étirée au millimètre (textLength). */
  const anneau = (r: number, id: string, sens: 1 | -1, taille: number, classe: string) => {
    const tour = 2 * Math.PI * r
    const motif = `${ruban.trim()}  ·  `
    const largeur = motif.length * taille * 0.92
    const fois = Math.max(1, Math.round(tour / largeur))
    return (
      <svg
        viewBox="0 0 400 400"
        aria-hidden="true"
        className={cn('absolute inset-0 h-full w-full', classe)}
        style={{ transform: `rotate(calc(var(--p) * ${sens * 220}deg))` }}
      >
        <defs>
          <path id={id} d={`M200,200 m-${r},0 a${r},${r} 0 1,1 ${r * 2},0 a${r},${r} 0 1,1 -${r * 2},0`} />
        </defs>
        <text className="uppercase" style={{ fontSize: taille, letterSpacing: '0.18em' }}>
          <textPath href={`#${id}`} textLength={Math.floor(tour - 2)} lengthAdjust="spacing">
            {motif.repeat(fois)}
          </textPath>
        </text>
      </svg>
    )
  }
  return (
    <div ref={ref} className="relative mx-auto aspect-square w-[min(680px,92vw)] [--p:0.5]">
      {anneau(186, 'ad-ruban-ext', 1, 13, 'fill-[var(--ad-nuit)]')}
      {anneau(150, 'ad-ruban-int', -1, 11, 'fill-[var(--ad-or)]')}
      {anneau(122, 'ad-ruban-coeur', 1, 8, 'fill-[var(--ad-bleu-clair)] opacity-70')}
      <span aria-hidden="true" className="absolute inset-[24%] rounded-full bg-[radial-gradient(closest-side,rgba(79,169,166,0.16),transparent)] motion-safe:animate-[ad-respire_6s_ease-in-out_infinite]" />
      <blockquote className="absolute inset-[26%] flex flex-col items-center justify-center text-center">
        <p className="font-[family-name:var(--ad-titre)] text-[clamp(20px,3.2vw,38px)] leading-[1.15] tracking-[-0.02em] text-[var(--ad-nuit)]">{accent(phrase)}</p>
        {auteur && <footer className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[var(--ad-gris)]">{auteur}</footer>}
      </blockquote>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   7. LE CARNET — les étapes sont les pages d'un carnet ouvert ; en
   descendant, on les tourne une à une, en trois dimensions.
   ══════════════════════════════════════════════════════════════════════ */

export function Carnet({ etapes, titre }: { etapes: { titre: string; texte: string }[]; titre: React.ReactNode }) {
  const ref = useAvancement<HTMLElement>('colle')
  const edition = useContext(Edition)
  const n = etapes.length
  return (
    <section
      ref={ref}
      className="relative [--p:0]"
      style={{ height: edition ? 'calc(var(--ad-vh) * 100)' : `calc(var(--ad-vh) * ${60 + n * 70})` }}
    >
      <div className="sticky top-0 flex h-[calc(var(--ad-vh)*100)] flex-col items-center justify-center gap-10 overflow-hidden px-[5vw]">
        <h2 className="text-center text-[clamp(34px,5vw,64px)]">{titre}</h2>
        <div className="relative aspect-[4/3] w-[min(560px,88vw)] [perspective:2000px] sm:aspect-[16/10]">
          {etapes.map((e, i) => {
            /* Chaque page se tourne quand l'avancement atteint sa place. */
            /* Les n-1 premières pages se tournent l'une après l'autre entre 10 %
               et 90 % du défilement ; la dernière reste ouverte. */
            const tour = `clamp(0, calc((var(--p) - 0.1) * ${((Math.max(1, n - 1)) / 0.8).toFixed(3)} - ${i}), 1)`
            const derniere = i === n - 1
            return (
              <article
                key={i}
                className="absolute inset-0 origin-left [backface-visibility:hidden] [transform-style:preserve-3d]"
                style={{
                  zIndex: n - i,
                  /* À mi-tour, la page se courbe un peu (skew), comme du papier. */
                  transform: derniere ? undefined : `rotateY(calc(${tour} * -172deg)) skewY(calc(${tour} * (1 - ${tour}) * -10deg))`,
                }}
              >
                <div
                  className="relative flex h-full flex-col justify-between rounded-[6px_28px_28px_6px] border border-[var(--ad-sable-fonce)] bg-white p-7 shadow-[0_40px_80px_-40px_rgba(46,66,79,0.45)] sm:p-10"
                  style={{
                    background: `linear-gradient(90deg, rgba(46,66,79,${0.08}) 0%, transparent 6%), #fff`,
                    filter: derniere ? undefined : `brightness(calc(1 - ${tour} * 0.25))`,
                  }}
                >
                  <span className="font-[family-name:var(--ad-titre)] text-[clamp(56px,9vw,96px)] leading-none text-[var(--ad-sable-fonce)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-[clamp(24px,3vw,36px)]">{e.titre}</h3>
                    {e.texte && <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.65] text-[var(--ad-pierre)]">{e.texte}</p>}
                  </div>
                  <span className="text-right text-[12px] uppercase tracking-[0.2em] text-[var(--ad-gris)]">
                    {i + 1} / {n}
                  </span>
                  {/* L'ombre qui balaie la page pendant qu'elle se tourne. */}
                  {!derniere && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(90deg,rgba(46,66,79,0),rgba(46,66,79,0.2))]"
                      style={{ opacity: `calc(${tour} * (1 - ${tour}) * 4)` }}
                    />
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   8. LE PUZZLE — la photo arrive en morceaux éparpillés, tournés,
   flottants ; en descendant, ils se rassemblent et l'image se forme.
   ══════════════════════════════════════════════════════════════════════ */

const COLS = 5
const LIGNES = 4
/* Un désordre fixe (même rendu serveur et navigateur). */
const hasard = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  /* Arrondi : le serveur et le navigateur n'ont pas la même précision. */
  return Math.round((x - Math.floor(x)) * 1000) / 1000
}

export function Puzzle({ photo }: { photo: Media | null }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const n = COLS * LIGNES
  return (
    <div
      ref={ref}
      role="img"
      aria-label={photo?.alt ?? ''}
      className="relative mx-auto aspect-[5/4] w-full max-w-[880px] [--p:1] [perspective:1400px]"
      style={{ ['--ass' as string]: 'clamp(0, calc((var(--p) - 0.12) * 2.4), 1)' }}
    >
      {photo &&
        Array.from({ length: n }, (_, i) => {
          const c = i % COLS
          const l = Math.floor(i / COLS)
          const dx = Math.round((hasard(i, 1) - 0.5) * 140)
          const dy = Math.round((hasard(i, 2) - 0.5) * 120 + 30)
          const rot = Math.round((hasard(i, 3) - 0.5) * 70)
          const z = Math.round((0.55 + hasard(i, 4) * 0.4) * 100) / 100
          return (
            <span
              key={i}
              aria-hidden="true"
              className="absolute rounded-[calc((1-var(--ass))*14px)] bg-no-repeat shadow-[0_10px_30px_-18px_rgba(46,66,79,0.6)]"
              style={{
                left: `${(c / COLS) * 100}%`,
                top: `${(l / LIGNES) * 100}%`,
                width: `${100 / COLS + 0.15}%`,
                height: `${100 / LIGNES + 0.15}%`,
                backgroundImage: fond(photo.url),
                backgroundSize: `${COLS * 100}% ${LIGNES * 100}%`,
                backgroundPosition: `${Math.round((c / (COLS - 1)) * 1000) / 10}% ${Math.round((l / (LIGNES - 1)) * 1000) / 10}%`,
                opacity: `calc(0.25 + var(--ass) * 0.75)`,
                transform: `translate(calc((1 - var(--ass)) * ${dx}%), calc((1 - var(--ass)) * ${dy}%)) rotate(calc((1 - var(--ass)) * ${rot}deg)) rotateX(calc((1 - var(--ass)) * ${rot * 1.4}deg)) rotateY(calc((1 - var(--ass)) * ${-dx * 0.5}deg)) scale(calc(${z} + var(--ass) * ${1 - z}))`,
              }}
            />
          )
        })}
      {/* Assemblée : un trait de lumière la traverse, une seule fois. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
        <span
          className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.45),transparent)]"
          style={{
            transform: 'translateX(calc(-100% + clamp(0, calc((var(--ass) - 0.9) * 10), 1) * 300%)) skewX(-12deg)',
            opacity: 'calc(clamp(0, calc((var(--ass) - 0.9) * 10), 1) * (1 - clamp(0, calc((var(--ass) - 0.995) * 200), 1)))',
          }}
        />
      </span>
      {/* Assemblée, la photo reprend ses coins arrondis d'un seul tenant. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[32px] ring-[12px] ring-[var(--ad-ivoire)]"
        style={{ opacity: 'clamp(0, calc((var(--ass) - 0.9) * 10), 1)' }}
      />
    </div>
  )
}
