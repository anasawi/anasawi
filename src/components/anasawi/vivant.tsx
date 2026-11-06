'use client'

import { ArrowUpRight, Check, Menu, Plus, Sparkles, X } from 'lucide-react'
import Image from 'next/image'
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { lettreParDefaut, type TextesLettre } from '@/blocks/moderne/textes'
import { BasculeVersion } from '@/components/site/BasculeVersion'
import { LogoMark } from '@/components/site/Logo'
import { cn } from '@/lib/utils'
import type { FaqItem, Media, OpeningHour, ServiceWithMedia } from '@/server/db/schema'

/**
 * Les composants VIVANTS de la nouvelle DA d’Anasawi (couleurs chaudes du classique, accents turquoise),
 * pensés pour le téléphone et la tablette autant que pour le grand écran
 * (rangées et mises en scène larges à partir de `lg`, 1024 px).
 * Les textes qui « s’encrent » sont entièrement lisibles avant que leur
 * section n’atteigne le milieu de l’écran.
 *
 * Un principe pour tous : le mouvement suit la lecture. Le défilement
 * écrit une seule variable CSS (`--p`, de 0 à 1) sur l'élément, une fois
 * par image ; tout le reste — tailles, rayons, opacités, tracés — est du
 * `calc()` dans le style. Pas de re-rendu React à chaque pixel, et rien
 * ne bouge pour qui a demandé moins d'animations.
 */

/* ══════════════════════════════════════════════════════════════════════
   MODE ÉDITION — dans l'aperçu de l'éditeur, le cadre est aussi haut que
   toute la page et ne défile pas : les mises en scène liées au
   défilement y sont FIGÉES (état de départ), les apparitions jouées
   d'emblée, et un « écran » vaut 860 px.
   ══════════════════════════════════════════════════════════════════════ */

export const Edition = createContext(false)

/** L'enveloppe de tout bloc moderne : la classe `ad` (jetons, police),
    et le mode édition pour ses composants. */
export function ModeEdition({ actif, children }: { actif: boolean; children: React.ReactNode }) {
  return (
    <Edition.Provider value={actif}>
      <div className="ad" style={actif ? ({ '--ad-vh': '8.6px' } as React.CSSProperties) : undefined}>
        {children}
      </div>
    </Edition.Provider>
  )
}

const reduit = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Écrit `--p` (avancement 0 → 1) sur l'élément.
 * - `colle` : pour une section haute à contenu collant — 0 quand son haut
 *   touche le haut de l'écran, 1 quand son bas touche le bas.
 * - `passage` : 0 quand l'élément entre par le bas, 1 quand il sort par
 *   le haut.
 */
export function useAvancement<T extends HTMLElement>(mode: 'colle' | 'passage', lisse = false) {
  const ref = useRef<T>(null)
  const edition = useContext(Edition)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduit() || edition) {
      el.style.setProperty('--p', mode === 'colle' ? '0' : '1')
      el.style.setProperty('--e', '0')
      return
    }
    /*
     * INERTIE. La valeur affichée ne saute pas à la position de la
     * molette : elle la rejoint, un peu à chaque image (12 % de l'écart),
     * comme un objet qui a du poids. C'est ce qui rend le mouvement
     * soyeux, même avec une molette qui avance par crans.
     */
    let cible = 0
    let affiche = -1
    let image = 0
    const mesure = () => {
      const r = el.getBoundingClientRect()
      const h = window.innerHeight
      const p = mode === 'colle' ? -r.top / Math.max(1, r.height - h) : (h - r.top) / (h + r.height)
      cible = Math.min(1, Math.max(0, p))
    }
    const peint = (v: number) => {
      el.style.setProperty('--p', v.toFixed(4))
      if (lisse) {
        /* Une courbe douce au départ et à l'arrivée. */
        const e = v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
        el.style.setProperty('--e', e.toFixed(4))
      }
    }
    const boucle = () => {
      const ecart = cible - affiche
      if (Math.abs(ecart) < 0.0004) {
        affiche = cible
        peint(affiche)
        image = 0
        return
      }
      affiche += ecart * 0.12
      peint(affiche)
      image = requestAnimationFrame(boucle)
    }
    const demande = () => {
      mesure()
      if (!image) image = requestAnimationFrame(boucle)
    }
    /* Premier rendu : en place tout de suite, sans glissement. */
    mesure()
    affiche = cible
    peint(affiche)
    window.addEventListener('scroll', demande, { passive: true })
    window.addEventListener('resize', demande)
    return () => {
      cancelAnimationFrame(image)
      window.removeEventListener('scroll', demande)
      window.removeEventListener('resize', demande)
    }
  }, [mode, lisse, edition])
  return ref
}

/* ══════════════════════════════════════════════════════════════════════
   RÉVÉLATION — trois façons d'entrer : monter (avec un léger flou qui se
   dissipe), sortir d'un masque ligne par ligne, ou lettre à lettre.
   ══════════════════════════════════════════════════════════════════════ */

export function Revele({
  children,
  className,
  delai = 0,
  as: Balise = 'div',
}: {
  children: React.ReactNode
  className?: string
  delai?: number
  as?: 'div' | 'li' | 'p' | 'span'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const edition = useContext(Edition)
  const [etat, setEtat] = useState<'ssr' | 'cache' | 'vu'>('ssr')
  useLayoutEffect(() => {
    const el = ref.current
    if (edition) return
    if (!el || reduit()) return setEtat('vu')
    if (el.getBoundingClientRect().top < window.innerHeight * 0.88) return setEtat('vu')
    setEtat('cache')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setEtat('vu')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [edition])
  return (
    <Balise
      ref={ref as never}
      className={cn(
        etat === 'cache' && 'opacity-0',
        etat === 'vu' && 'motion-safe:animate-[ad-monter_1.2s_var(--ad-ease)_backwards]',
        className,
      )}
      style={etat === 'vu' && delai ? { animationDelay: `${delai}s` } : undefined}
    >
      {children}
    </Balise>
  )
}

/** Des lignes qui sortent chacune de leur masque, l'une après l'autre. */
export function Lignes({
  lignes,
  className,
  ligneClassName,
  delai = 0,
}: {
  lignes: React.ReactNode[]
  className?: string
  ligneClassName?: string
  delai?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const edition = useContext(Edition)
  const [vu, setVu] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || edition) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVu(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [edition])
  return (
    <span ref={ref} className={cn('block', className)}>
      {lignes.map((l, i) => (
        /* Le masque déborde un peu en haut (et à droite) de la ligne : les
           hampes de la serif (« d », « l ») dépassent la hauteur de ligne. */
        <span key={i} className="-mt-[0.16em] block overflow-hidden pb-[0.08em] pr-[0.32em] pt-[0.16em]">
          <span
            className={cn(
              'block origin-[0%_100%]',
              edition ? '' : vu ? 'motion-safe:animate-[ad-sortir_1.2s_var(--ad-ease)_backwards]' : 'motion-safe:translate-y-[108%]',
              ligneClassName,
            )}
            style={vu ? { animationDelay: `${delai + i * 0.12}s` } : undefined}
          >
            {l}
          </span>
        </span>
      ))}
    </span>
  )
}

export type TextesSeuil = {
  surtitre: string
  pastille2: string
  pastille3: string
  bouton: string
  bouton2: string
  lienDecouvrir?: string
  invitation: string
}

/* ══════════════════════════════════════════════════════════════════════
   LE SEUIL — l'ouverture. Au premier écran, le nom d'Anne, centré, au
   PREMIER PLAN ; juste dessous, une fenêtre sur le cabinet. On fait
   défiler : le nom s'élève et s'efface, la fenêtre monte au centre et
   s'élargit jusqu'à remplir l'écran — on entre dans la pièce — et la
   phrase d'accueil apparaît dedans.
   ══════════════════════════════════════════════════════════════════════ */

export function Seuil({
  prenom,
  nom,
  metier,
  ville,
  accroche,
  photo,
  rdv,
  horaires,
  intro,
  textes,
}: {
  prenom: string
  nom: string
  metier: string
  ville: string
  accroche: string
  photo: Media | null
  rdv: string
  horaires: OpeningHour[]
  /** Une phrase de présentation, sous le nom (repli : l’accroche). */
  intro: string
  /** Les petits textes de l’ouverture, tous modifiables dans l’éditeur. */
  textes: TextesSeuil
}) {
  const ref = useAvancement<HTMLElement>('colle', true)
  const edition = useContext(Edition)
  /* « Ouvert aujourd'hui » se calcule chez le visiteur (son jour) : après
     l'hydratation, jamais au rendu serveur. */
  const [jour, setJour] = useState<string | null>(null)
  useEffect(() => {
    const j = JOURS[(new Date().getDay() + 6) % 7]!
    const h = horaires.find((x) => x.day.toLowerCase().startsWith(j.slice(0, 3)))?.hours
    setJour(h && !/ferm/i.test(h) ? h : '')
  }, [horaires])

  /* Ce qui habille le premier écran s'efface dès qu'on entre. */
  const sFondu = { opacity: 'clamp(0, calc(1 - var(--e) * 7), 1)' }
  const sEfface = { ...sFondu, transform: 'translateY(calc(var(--e) * -24px))' }
  const pastille =
    'flex items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-white/55 px-3 py-1.5 text-[12px] font-medium text-[var(--ad-pierre)] shadow-[0_8px_24px_-14px_rgba(46,66,79,0.35)] backdrop-blur-md'
  /* La fenêtre : sous le nom au départ, plein écran à l'arrivée. */
  const larg = 'min(460px, 64vw)'
  /* Plus basse sur les écrans peu hauts : elle ne doit jamais toucher les
     boutons du bas. */
  const haut = 'min(400px, var(--ad-vh) * 34)'
  return (
    <section ref={ref} id="haut" className={cn('relative [--e:0] [--p:0]', edition ? 'h-[calc(var(--ad-vh)*100)]' : 'h-[calc(var(--ad-vh)*240)]')}>
      <div className="sticky top-0 h-[calc(var(--ad-vh)*100)] overflow-hidden">
        {/* Un halo très doux, derrière tout. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[30%] h-[calc(var(--ad-vh)*70)] w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(79,169,166,0.14),rgba(70,114,138,0.08)_55%,transparent)] blur-2xl"
          style={sFondu}
        />

        {/* Le métier, au-dessus du nom. */}
        <div className="absolute inset-x-0 top-[calc(var(--ad-vh)*13)] z-30 flex justify-center md:top-[calc(var(--ad-vh)*14)]" style={sEfface}>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ad-pierre)] shadow-[0_1px_2px_rgba(46,66,79,0.06),0_6px_18px_-8px_rgba(46,66,79,0.18)] motion-safe:animate-[ad-monter_1.1s_var(--ad-ease)_0.1s_backwards]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
            {textes.surtitre || `${metier} · ${ville}`}
          </span>
        </div>

        {/* Le nom : centré, AU PREMIER PLAN, jusqu'à ce qu'on fasse défiler. */}
        <h1
          className="pointer-events-none absolute inset-x-0 top-[calc(var(--ad-vh)*19)] z-30 px-5 text-center text-[clamp(52px,9.4vw,156px)] leading-[0.95] text-[var(--ad-nuit)] md:top-[calc(var(--ad-vh)*20)]"
          style={{
            transform: 'translateY(calc(var(--e) * var(--ad-vh) * -16)) scale(calc(1 - var(--e) * 0.25))',
            opacity: 'clamp(0, calc(1 - var(--e) * 2.2), 1)',
          }}
        >
          <span className="-mr-[0.24em] -mt-[0.16em] block overflow-hidden pb-[0.06em] pr-[0.32em] pt-[0.16em] md:inline-block">
            <span className="block motion-safe:animate-[ad-resserrer_1.6s_var(--ad-ease)_0.15s_backwards]">{prenom}</span>
          </span>{' '}
          <span className="-mr-[0.24em] -mt-[0.16em] block overflow-hidden pb-[0.06em] pr-[0.32em] pt-[0.16em] md:inline-block">
            <em className="block motion-safe:animate-[ad-resserrer_1.6s_var(--ad-ease)_0.32s_backwards]">{nom}</em>
          </span>
        </h1>

        {/* Sous le nom : la présentation, et les deux actions. */}
        <div
          className="absolute inset-x-0 top-[calc(var(--ad-vh)*19+clamp(120px,21vw,330px))] z-30 hidden flex-col items-center px-6 text-center md:top-[calc(var(--ad-vh)*20+clamp(68px,11vw,180px))] md:flex"
          style={sEfface}
        >
          <p className="max-w-[54ch] text-[16px] leading-[1.6] text-[var(--ad-pierre)] motion-safe:animate-[ad-monter_1.2s_var(--ad-ease)_0.45s_backwards]">{intro}</p>
        </div>

        {/* La fenêtre sur le cabinet : sous le nom, puis plein écran.
            Deux étages : le cadre extérieur suit le défilement (place,
            taille) ; l'intérieur bascule vers la souris (inclinaison),
            avec son propre ressort — et n'incline plus une fois entré. */}
        <Incline
          variables
          className="absolute left-1/2 z-10 [perspective:1400px] motion-safe:animate-[ad-monter_1.4s_var(--ad-ease)_0.35s_backwards]"
          style={{
            top: 'calc(62% - 12% * var(--e))',
            width: `calc(${larg} + (100vw - ${larg}) * var(--e))`,
            height: `calc(${haut} + (var(--ad-vh) * 100 - ${haut}) * var(--e))`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden bg-[var(--ad-sable-fonce)] shadow-[0_50px_120px_-50px_rgba(46,66,79,0.55)] transition-[transform,box-shadow,translate,scale,rotate] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[survol=oui]/incline:duration-200 group-data-[survol=oui]/incline:shadow-[0_60px_120px_-40px_rgba(46,66,79,0.6)]"
            style={{
              borderRadius: 'calc((1 - var(--e)) * 32px)',
              transform: 'rotateX(calc(var(--rx) * (1 - var(--e)))) rotateY(calc(var(--ry) * (1 - var(--e))))',
            }}
          >
            {photo && (
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                priority
                sizes="100vw"
                className="object-cover"
                style={{ transform: 'scale(calc(1.15 - var(--e) * 0.15))' }}
              />
            )}
            <Reflet />
            <div aria-hidden="true" className="absolute inset-0 bg-[var(--ad-nuit)]" style={{ opacity: 'calc(var(--e) * 0.5)' }} />
            {/* La phrase d'accueil, dans la pièce. */}
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center text-white"
              style={{
                opacity: 'clamp(0, calc((var(--e) - 0.55) * 3), 1)',
                transform: 'translateY(calc((1 - var(--e)) * 40px))',
              }}
            >
              <p className="max-w-[18ch] text-balance text-[clamp(34px,5.2vw,80px)] font-semibold leading-[1.04] tracking-[-0.035em]">{accroche}</p>
              <a
                href={rdv}
                className="group mt-10 inline-flex items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-[15px] font-semibold text-[var(--ad-nuit)]"
              >
                {textes.bouton}
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ad-nuit)] text-white transition-transform duration-500 ease-[var(--ad-ease)] group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </div>
        </Incline>

        {/* Autour de la fenêtre : trois petites pastilles de verre, posées
            sur ses bords, qui flottent à peine — discrètes, pas des cartes. */}
        <div
          aria-hidden={jour === null || undefined}
          className="pointer-events-none absolute left-1/2 top-[62%] z-20 max-sm:hidden"
          style={{ ...sFondu, width: larg, height: haut, transform: 'translate(-50%, -50%)' }}
        >
          {jour !== null && (
            <span className="absolute -left-[88px] top-[14%] motion-safe:animate-[ad-monter_1.2s_var(--ad-ease)_0.8s_backwards]">
              <span className={pastille} style={{ animation: 'ad-flotter 7s ease-in-out infinite' }}>
                <span className="relative grid h-2.5 w-2.5 place-items-center">
                  {jour && <span className="absolute inset-0 rounded-full bg-[#6e9a6b] motion-safe:animate-[ad-pouls_2.2s_ease-out_infinite]" />}
                  <span className={cn('relative h-1.5 w-1.5 rounded-full', jour ? 'bg-[#6e9a6b]' : 'bg-[var(--ad-gris)]')} />
                </span>
                {jour ? `Ouvert aujourd’hui · ${jour}` : 'Fermé aujourd’hui'}
              </span>
            </span>
          )}
          {textes.pastille2 && <span className="absolute -right-[72px] top-[44%] motion-safe:animate-[ad-monter_1.2s_var(--ad-ease)_0.95s_backwards]">
            <span className={pastille} style={{ animation: 'ad-flotter 8s ease-in-out 1.4s infinite' }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
              {textes.pastille2}
            </span>
          </span>}
          {textes.pastille3 && <span className="absolute -left-[40px] bottom-[10%] motion-safe:animate-[ad-monter_1.2s_var(--ad-ease)_1.1s_backwards]">
            <span className={pastille} style={{ animation: 'ad-flotter 9s ease-in-out 0.6s infinite' }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-bleu)]" />
              {textes.pastille3}
            </span>
          </span>}
        </div>

        {/* En bas : les deux actions, et l'invitation à entrer. */}
        <div className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-5 px-6" style={sEfface}>
          <div className="flex flex-wrap justify-center gap-2 motion-safe:animate-[ad-monter_1.2s_var(--ad-ease)_0.6s_backwards]">
            <Aimant>
            <a
              href={rdv}
              className="pointer-events-auto group inline-flex items-center gap-2.5 rounded-full bg-[var(--ad-nuit)] py-1.5 pl-5 pr-1.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(46,66,79,0.6)]"
            >
              {textes.bouton}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-transform duration-500 ease-[var(--ad-ease)] group-hover:rotate-45">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </a>
            </Aimant>
            <a
              href={textes.lienDecouvrir || '#accompagnements'}
              className="pointer-events-auto inline-flex items-center rounded-full border border-[var(--ad-sable-fonce)] bg-white px-5 text-[14px] font-semibold text-[var(--ad-nuit)] transition-colors hover:border-[var(--ad-nuit)]"
            >
              {textes.bouton2}
            </a>
          </div>
          <span className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ad-gris)] max-md:hidden">
            {textes.invitation}
            <span className="relative block h-8 w-px overflow-hidden bg-[var(--ad-sable-fonce)]">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-[var(--ad-or)] motion-safe:animate-[ad-descendre_2.2s_var(--ad-ease-lent)_infinite]" />
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   L'ENCRE — un texte dont les mots se teintent à mesure qu'on le lit.
   ══════════════════════════════════════════════════════════════════════ */

export function Encre({ texte, className }: { texte: string; className?: string }) {
  const ref = useAvancement<HTMLParagraphElement>('passage')
  const mots = texte.split(/\s+/).filter(Boolean)
  const n = mots.length
  return (
    <p ref={ref} className={cn('[--p:1]', className)}>
      {mots.map((m, i) => (
        <span
          key={i}
          className="transition-[opacity] duration-200"
          style={{ opacity: `clamp(0.16, calc((var(--p) * 3.2 - 0.25 - ${i / n}) * 9), 1)` }}
        >
          {m}{' '}
        </span>
      ))}
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LE CHEMIN — les étapes reliées par un trait qui se dessine au fil de
   la lecture ; chaque étape s'allume quand le trait l'atteint.
   ══════════════════════════════════════════════════════════════════════ */

export function Chemin({ etapes }: { etapes: { titre: string; texte: string }[] }) {
  const ref = useAvancement<HTMLOListElement>('passage')
  const n = etapes.length
  /* Une onde douce qui croise l'axe au centre de chaque étape. */
  const pas = 1000 / n
  let d = `M 50 0`
  for (let i = 0; i < n; i++) {
    const y0 = i * pas
    const sens = i % 2 ? -1 : 1
    d += ` C ${50 + 30 * sens} ${y0 + pas * 0.25}, ${50 + 30 * sens} ${y0 + pas * 0.25}, 50 ${y0 + pas * 0.5}`
    d += ` C ${50 - 30 * sens} ${y0 + pas * 0.75}, ${50 - 30 * sens} ${y0 + pas * 0.75}, 50 ${y0 + pas}`
  }
  const avance = 'calc((var(--p) - 0.08) * 2.2)'
  return (
    <ol ref={ref} className="relative [--p:1]">
      <svg
        aria-hidden="true"
        viewBox="0 0 100 1000"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-[18px] top-0 h-full w-[60px] -translate-x-1/2 md:left-1/2 md:w-[160px]"
      >
        <path d={d} fill="none" stroke="var(--ad-sable-fonce)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path
          d={d}
          fill="none"
          stroke="var(--ad-or)"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: `calc(1 - clamp(0, ${avance}, 1))` }}
        />
      </svg>
      {etapes.map((e, i) => {
        const seuil = (i + 0.5) / n
        const allume = `clamp(0, calc((${avance} - ${seuil}) * 14), 1)`
        const gauche = i % 2 === 0
        return (
          <li key={e.titre} className="relative grid min-h-[220px] items-center pl-14 md:grid-cols-2 md:gap-28 md:pl-0">
            {/* Le jalon, sur le trait. */}
            <span
              aria-hidden="true"
              className="absolute left-[18px] top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--ad-sable-fonce)] bg-[var(--ad-ivoire)] font-[family-name:var(--ad-titre)] font-semibold tracking-[-0.03em] text-[20px] text-[var(--ad-gris)] md:left-1/2"
            >
              {/* Le halo d'arrivée : un anneau qui s'élargit quand le trait atteint l'étape. */}
              <span
                className="absolute -inset-2 rounded-full border border-[var(--ad-or)]"
                style={{ transform: `scale(calc(0.7 + ${allume} * 0.4))`, opacity: `calc(${allume} * 0.5)` }}
              />
              <span
                className="absolute inset-0 rounded-full bg-[var(--ad-nuit)]"
                style={{ transform: `scale(${allume})`, opacity: allume }}
              />
              <span className="relative" style={{ color: `color-mix(in srgb, white calc(${allume} * 100%), var(--ad-gris))` }}>
                {i + 1}
              </span>
            </span>
            <div
              className={cn('py-8', gauche ? 'md:col-start-1 md:text-right' : 'md:col-start-2')}
              style={{
                opacity: `clamp(0.25, calc(0.25 + ${allume} * 0.75), 1)`,
                transform: `translateX(calc((1 - ${allume}) * ${gauche ? '-' : ''}16px))`,
              }}
            >
              <h3 className="text-[34px] md:text-[44px]">{e.titre}</h3>
              {e.texte && <p className={cn('mt-3 max-w-[38ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)]', gauche && 'md:ml-auto')}>{e.texte}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LES ARCHES — les accompagnements côte à côte, chacun dans une arche.
   On en survole (ou on en touche) une : elle s'ouvre, les autres se
   resserrent, et sa fiche apparaît.
   ══════════════════════════════════════════════════════════════════════ */

const TEINTES = ['#efe6d8', '#e6edef', '#f2e8dc', '#e8ebe4', '#ede3d3', '#e4eaec']

/* La courbe des arches : un départ et une arrivée très doux, un milieu
   franc : le rideau glisse, il ne rebondit pas. */
const RIDEAU = 'cubic-bezier(0.83,0,0.17,1)'
const SORTIE = 'cubic-bezier(0.16,1,0.3,1)'
const OUVERTURE = 3.4

export function Arches({ services, rdv, bouton = 'Réserver cet accompagnement' }: { services: ServiceWithMedia[]; rdv: string; bouton?: string }) {
  const [ouverte, setOuverte] = useState(0)
  const liste = useRef<HTMLUListElement>(null)
  const attente = useRef<number | null>(null)

  /* La largeur d'une arche ouverte, mesurée une fois pour toutes (et au
     redimensionnement) : photo et fiche sont posées à cette largeur dès le
     départ. L'arche qui s'ouvre les DÉVOILE comme un rideau — rien ne se
     recompose, aucun texte ne saute pendant l'animation. */
  useEffect(() => {
    const ul = liste.current
    if (!ul) return
    const mesurer = () => {
      const n = services.length
      const gap = parseFloat(getComputedStyle(ul).columnGap) || 0
      const utile = ul.clientWidth - gap * (n - 1)
      ul.style.setProperty('--ouvert', `${(utile * OUVERTURE) / (OUVERTURE + n - 1)}px`)
    }
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(ul)
    return () => ro.disconnect()
  }, [services.length])

  /* Survol avec intention : traverser la rangée en diagonale n'ouvre pas
     chaque arche au passage. */
  const viser = (i: number) => {
    if (attente.current) window.clearTimeout(attente.current)
    attente.current = window.setTimeout(() => setOuverte(i), 110)
  }
  const renoncer = () => {
    if (attente.current) window.clearTimeout(attente.current)
  }
  useEffect(() => () => renoncer(), [])

  /* La photo de l'arche ouverte suit la souris, d'un rien. */
  const suivre = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }

  return (
    <ul ref={liste} onMouseLeave={renoncer} className="flex flex-col gap-3 lg:h-[580px] lg:flex-row lg:gap-3 [--ouvert:100%]">
      {services.map((s, i) => {
        const actif = ouverte === i
        const mots = s.title.split(' ')
        const sombre = Boolean(s.media)
        return (
          <li
            key={s.id}
            onMouseEnter={() => viser(i)}
            onPointerMove={actif ? suivre : undefined}
            className={cn(
              /* Téléphone : une pile, chaque arche a sa hauteur (l'ouverte
                 plus haute). Grand écran : une rangée, les largeurs se
                 partagent (flex-grow) — jamais de flex-basis nul en
                 colonne, qui écraserait les hauteurs. */
              'relative isolate shrink-0 overflow-hidden rounded-[30px] [--mx:0] [--my:0] motion-reduce:!transition-none lg:shrink lg:[flex-basis:0px] lg:[flex-grow:var(--grow)]',
              actif ? 'h-[min(520px,calc(var(--ad-vh)*72))] lg:h-auto' : 'h-[88px] lg:h-auto',
            )}
            style={{
              ['--grow' as string]: actif ? OUVERTURE : 1,
              background: TEINTES[i % TEINTES.length],
              transition: `flex-grow 1.05s ${RIDEAU}, height 1.05s ${RIDEAU}`,
            }}
          >
            <button
              type="button"
              onClick={() => setOuverte(i)}
              onFocus={() => setOuverte(i)}
              aria-expanded={actif}
              className="absolute inset-0 z-10 text-left focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-[var(--ad-nuit)]"
            >
              <span className="sr-only">{s.title}</span>
            </button>

            {/* LA PHOTO — à la largeur de l'arche ouverte, centrée : fermée,
                on n'en voit qu'une tranche ; l'arche s'ouvre comme un rideau. */}
            {s.media && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 w-full -translate-x-1/2 lg:w-[var(--ouvert)]"
              >
                <div
                  className="absolute -inset-6"
                  style={{
                    transform: actif
                      ? 'translate3d(calc(var(--mx) * -18px), calc(var(--my) * -12px), 0) scale(1.02)'
                      : 'translate3d(0,0,0) scale(1.14)',
                    filter: actif ? 'saturate(1) brightness(1)' : 'saturate(0.35) brightness(1.08)',
                    transition: `transform ${actif ? '1.6s' : '1.05s'} ${SORTIE}, filter 1s ${RIDEAU}`,
                  }}
                >
                  <Image src={s.media.url} alt="" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
                </div>
              </div>
            )}

            {/* Fermée : un voile de la teinte de l'arche, qui se lève à l'ouverture. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: TEINTES[i % TEINTES.length],
                opacity: actif ? 0 : sombre ? 0.78 : 1,
                transition: `opacity ${actif ? '0.9s' : '0.7s'} ${RIDEAU} ${actif ? '0.1s' : '0s'}`,
              }}
            />
            {/* Ouverte : la nuit monte du bas pour porter le texte. */}
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(46,66,79,0.92),rgba(46,66,79,0.35)_45%,transparent_75%)] transition-opacity duration-[900ms]',
                actif && sombre ? 'opacity-100' : 'opacity-0',
              )}
            />

            {/* Un trait de lumière traverse l'arche quand elle s'ouvre. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-[60%] -skew-x-[18deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)] mix-blend-overlay lg:w-[calc(var(--ouvert)*0.5)]"
              style={{
                transform: actif ? 'translateX(260%) skewX(-18deg)' : 'translateX(-120%) skewX(-18deg)',
                transition: actif ? `transform 1.5s ${SORTIE} 0.25s` : 'none',
              }}
            />

            {/* Le grand numéro, en creux, qui glisse dans le fond. */}
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute left-7 top-5 z-[6] font-[family-name:var(--ad-titre)] text-[clamp(90px,11vw,170px)] font-semibold leading-none tracking-[-0.06em] text-transparent max-lg:hidden',
                sombre ? '[-webkit-text-stroke:1.5px_rgba(255,255,255,0.45)]' : '[-webkit-text-stroke:1.5px_rgba(46,66,79,0.18)]',
              )}
              style={{
                opacity: actif ? 1 : 0,
                transform: actif ? 'translate3d(0,0,0)' : 'translate3d(-40px,0,0)',
                transition: `opacity 0.8s ${SORTIE} ${actif ? '0.35s' : '0s'}, transform 1.3s ${SORTIE} ${actif ? '0.3s' : '0s'}`,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Le repère : « + » fermé, il tourne en « × » et s'assombrit. */}
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute right-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full backdrop-blur-md max-lg:hidden',
                actif ? 'bg-white text-[var(--ad-nuit)]' : 'bg-white/70 text-[var(--ad-nuit)]',
              )}
              style={{
                transform: actif ? 'rotate(135deg) scale(1)' : 'rotate(0deg) scale(0.92)',
                transition: 'transform 0.9s cubic-bezier(0.34,1.56,0.64,1), background-color 0.5s',
              }}
            >
              <Plus className="h-4 w-4" />
            </span>

            {/* Fermée : le numéro et le titre, debout. */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] flex items-end gap-3 p-6 text-[var(--ad-nuit)] lg:flex-col-reverse lg:items-center lg:gap-4 lg:px-0"
              style={{
                opacity: actif ? 0 : 1,
                transform: actif ? 'translate3d(0,24px,0)' : 'translate3d(0,0,0)',
                transition: actif
                  ? `opacity 0.25s ease-out, transform 0.4s ${RIDEAU}`
                  : `opacity 0.6s ${SORTIE} 0.45s, transform 0.9s ${SORTIE} 0.4s`,
              }}
            >
              <span className="font-[family-name:var(--ad-titre)] text-[18px] font-semibold tracking-[-0.03em] opacity-60">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-[family-name:var(--ad-titre)] text-[24px] font-semibold leading-[1.05] tracking-[-0.03em] lg:rotate-180 lg:[writing-mode:vertical-rl]">{s.title}</span>
            </div>

            {/* Ouverte : la fiche, posée à la largeur finale (aucune
                recomposition), qui se dévoile ligne à ligne. */}
            <div
              className={cn(
                'absolute bottom-0 left-0 z-20 w-full p-7 lg:w-[var(--ouvert)] lg:p-9',
                sombre ? 'text-white' : 'text-[var(--ad-nuit)]',
                !actif && 'pointer-events-none',
              )}
            >
              <div
                className="mb-4 flex flex-wrap gap-2 text-[12px] font-medium uppercase tracking-[0.14em]"
                style={{
                  opacity: actif ? 1 : 0,
                  transform: actif ? 'none' : 'translate3d(0,14px,0)',
                  transition: actif ? `opacity 0.7s ${SORTIE} 0.4s, transform 0.9s ${SORTIE} 0.4s` : 'opacity 0.2s, transform 0.3s',
                }}
              >
                {s.group && <span className="rounded-full border border-current/40 px-3 py-1 backdrop-blur-sm">{s.group.label}</span>}
                {s.duration && <span className="rounded-full border border-current/40 px-3 py-1 backdrop-blur-sm">{s.duration.split(/[·—]/)[0]}</span>}
              </div>
              <h3 className="max-w-[14ch] text-[40px] leading-[0.98] lg:text-[58px]">
                {mots.map((mot, k) => (
                  <span key={k} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                    <span
                      className="inline-block"
                      style={{
                        transform: actif ? 'translate3d(0,0,0) rotate(0)' : 'translate3d(0,110%,0) rotate(4deg)',
                        transformOrigin: 'left bottom',
                        transition: actif ? `transform 1.1s ${SORTIE} ${0.42 + k * 0.07}s` : `transform 0.35s ${RIDEAU}`,
                      }}
                    >
                      {mot}
                      {k < mots.length - 1 && ' '}
                    </span>
                  </span>
                ))}
              </h3>
              <p
                className="mt-4 max-w-[46ch] text-[15px] leading-[1.65] opacity-85"
                style={{
                  opacity: actif ? 0.85 : 0,
                  transform: actif ? 'none' : 'translate3d(0,16px,0)',
                  filter: actif ? 'blur(0)' : 'blur(6px)',
                  transition: actif
                    ? `opacity 0.9s ${SORTIE} 0.62s, transform 1s ${SORTIE} 0.62s, filter 0.9s ${SORTIE} 0.62s`
                    : 'opacity 0.2s, transform 0.3s, filter 0.2s',
                }}
              >
                {s.excerpt.replace(/\*/g, '')}
              </p>
              <a
                href={rdv}
                tabIndex={actif ? 0 : -1}
                className="group/lien relative z-30 mt-7 inline-flex items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[14px] font-semibold text-[var(--ad-nuit)] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
                style={{
                  opacity: actif ? 1 : 0,
                  transform: actif ? 'none' : 'translate3d(0,16px,0) scale(0.96)',
                  transition: actif ? `opacity 0.8s ${SORTIE} 0.75s, transform 1s cubic-bezier(0.34,1.56,0.64,1) 0.75s` : 'opacity 0.2s, transform 0.3s',
                }}
              >
                {bouton}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ad-nuit)] text-white transition-transform duration-500 ease-[var(--ad-ease)] group-hover/lien:rotate-45">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA PROMENADE — le cabinet, pièce après pièce. Sur grand écran, la
   page s'immobilise et le défilement fait glisser les photos de côté,
   chacune avec sa profondeur ; sur téléphone, on les fait glisser au
   doigt.
   ══════════════════════════════════════════════════════════════════════ */

export function Promenade({ photos, titre, legende = 'pièces · défilez' }: { photos: Media[]; titre: React.ReactNode; legende?: string }) {
  const ref = useAvancement<HTMLElement>('colle')
  const edition = useContext(Edition)
  const piste = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const mesure = () => {
      const p = piste.current
      const s = ref.current
      if (!p || !s) return
      s.style.setProperty('--decal', `${Math.max(0, p.scrollWidth - window.innerWidth)}px`)
    }
    mesure()
    window.addEventListener('resize', mesure)
    return () => window.removeEventListener('resize', mesure)
  }, [ref])
  const formes = ['rounded-[28px]', 'rounded-[20px]', 'rounded-[36px]', 'rounded-[24px]']
  return (
    <section ref={ref} id="cabinet" className={cn('relative [--p:0]', !edition && 'md:h-[calc(var(--ad-vh)*320)]')}>
      <div className={cn('py-20', !edition && 'md:sticky md:top-0 md:flex md:h-[calc(var(--ad-vh)*100)] md:flex-col md:justify-center md:overflow-hidden md:py-0')}>
        <div className="mb-10 flex items-end justify-between gap-6 px-[5vw]">
          <h2 className="text-[48px] md:text-[80px]">{titre}</h2>
          <p className="pb-3 text-[12px] uppercase tracking-[0.2em] text-[var(--ad-gris)] max-md:hidden">
            <span className="tabular-nums">{photos.length}</span> {legende}
          </p>
        </div>
        <div className="overflow-x-auto [scrollbar-width:none] md:overflow-visible">
          <div
            ref={piste}
            className="flex w-max items-center gap-6 px-[5vw] md:gap-10"
            style={{ transform: 'translateX(calc(var(--p) * var(--decal, 0px) * -1))' }}
          >
            {photos.map((p, i) => (
              <figure key={p.id} className={cn('shrink-0', i % 2 ? 'md:mt-24' : 'md:-mt-16')}>
                <div
                  className={cn(
                    'relative overflow-hidden bg-[var(--ad-sable-fonce)]',
                    formes[i % formes.length],
                    i % 3 === 0
                      ? 'h-[300px] w-[240px] md:h-[calc(var(--ad-vh)*52)] md:w-[calc(var(--ad-vh)*30)]'
                      : 'h-[240px] w-[300px] md:h-[calc(var(--ad-vh)*40)] md:w-[calc(var(--ad-vh)*52)]',
                  )}
                >
                  <Image src={p.url} alt={p.alt} fill sizes="(max-width: 768px) 300px, 50vh" className="object-cover" />
                </div>
                {p.caption && (
                  <figcaption className="mt-3 text-[14px] font-medium text-[var(--ad-gris)]">{p.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
        {/* La barre d'avancement de la promenade. */}
        <div aria-hidden="true" className="mx-[5vw] mt-12 h-px bg-[var(--ad-sable-fonce)] max-md:hidden">
          <div className="h-px origin-left bg-[var(--ad-nuit)]" style={{ transform: 'scaleX(var(--p))' }} />
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA CONVERSATION — on choisit une question ; elle part comme un
   message, Anne « écrit »… et sa réponse arrive.
   ══════════════════════════════════════════════════════════════════════ */

export function Conversation({
  faq,
  prenom,
  portrait,
  signature = `${prenom} · répond en personne`,
  suivante = 'Question suivante',
}: {
  faq: FaqItem[]
  prenom: string
  portrait: Media | null
  signature?: string
  suivante?: string
}) {
  const [choisie, setChoisie] = useState(0)
  const [ecrit, setEcrit] = useState(false)
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    if (reduit()) return
    setEcrit(true)
    const t = window.setTimeout(() => setEcrit(false), 900)
    return () => window.clearTimeout(t)
  }, [choisie])
  const q = faq[choisie]
  /* La question choisie reste visible dans la ligne défilante (téléphone). */
  const rangee = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const ul = rangee.current
    if (!ul || ul.scrollWidth <= ul.clientWidth) return
    const actif = ul.querySelector<HTMLElement>('[aria-pressed="true"]')?.parentElement
    if (actif) ul.scrollTo({ left: actif.offsetLeft - 20, behavior: 'smooth' })
  }, [choisie])
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      {/* Téléphone : les questions défilent en une ligne, au doigt, pour que
          la réponse reste à portée d'œil. Grand écran : un nuage. */}
      <ul ref={rangee} className="-mx-[5vw] flex snap-x snap-mandatory scroll-px-[5vw] gap-2.5 overflow-x-auto px-[5vw] pb-1 [scrollbar-width:none] lg:mx-0 lg:snap-none lg:flex-wrap lg:content-start lg:overflow-visible lg:px-0 lg:pb-0">
        {faq.map((f, i) => (
          <li key={f.id} className="shrink-0 snap-start max-lg:max-w-[78vw]">
            <button
              type="button"
              onClick={() => setChoisie(i)}
              aria-pressed={choisie === i}
              className={cn(
                'rounded-full border px-4 py-2.5 text-left text-[14.5px] leading-[1.35] transition-[background-color,border-color,color,transform,translate,scale,rotate] duration-500 ease-[var(--ad-ease)] hover:-translate-y-0.5 active:scale-[0.96] active:duration-150',
                choisie === i
                  ? 'border-[var(--ad-nuit)] bg-[var(--ad-nuit)] text-white'
                  : 'border-[var(--ad-sable-fonce)] bg-transparent text-[var(--ad-nuit)] hover:border-[var(--ad-nuit)]',
              )}
            >
              {f.question}
            </button>
          </li>
        ))}
      </ul>
      <div className="relative flex min-h-[340px] flex-col rounded-[36px] bg-[var(--ad-sable)] p-6 sm:p-9" aria-live="polite">
        {q && (
          <div key={q.id} className="flex flex-1 flex-col gap-5">
            <p className="ml-auto max-w-[80%] rounded-[22px] rounded-br-[6px] bg-white px-5 py-3.5 text-[15px] leading-[1.5] text-[var(--ad-nuit)] shadow-[0_8px_24px_-12px_rgba(46,66,79,0.25)] origin-bottom-right motion-safe:animate-[ad-bulle_0.55s_cubic-bezier(0.34,1.4,0.64,1)_backwards]">
              {q.question}
            </p>
            <div className="flex items-end gap-3">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[12px] bg-[var(--ad-sable-fonce)]">
                {portrait && <Image src={portrait.url} alt="" fill sizes="40px" className="object-cover" />}
              </span>
              {ecrit ? (
                <span className="flex h-12 items-center gap-1.5 rounded-[22px] rounded-bl-[6px] bg-[var(--ad-nuit)] px-5" aria-label={`${prenom} écrit…`}>
                  {[0, 0.15, 0.3].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-[ad-points_1s_ease-in-out_infinite]" style={{ animationDelay: `${d}s` }} />
                  ))}
                </span>
              ) : (
                <p className="max-w-[88%] whitespace-pre-line rounded-[22px] rounded-bl-[6px] bg-[var(--ad-nuit)] px-5 py-4 text-[15px] leading-[1.65] text-white/90 origin-bottom-left motion-safe:animate-[ad-bulle_0.6s_cubic-bezier(0.34,1.3,0.64,1)_backwards]">
                  {/* La réponse s'écrit : les mots arrivent l'un après l'autre. */}
                  {q.answer
                    .replace(/\*/g, '')
                    .split(/(\s+)/)
                    .map((m, k) =>
                      /^\s+$/.test(m) ? (
                        m
                      ) : (
                        <span
                          key={k}
                          className="inline-block motion-safe:animate-[ad-mot_0.5s_var(--ad-ease)_backwards]"
                          style={{ animationDelay: `${0.15 + Math.min(k, 120) * 0.012}s` }}
                        >
                          {m}
                        </span>
                      ),
                    )}
                </p>
              )}
            </div>
            <p className="pl-[52px] text-[12px] uppercase tracking-[0.18em] text-[var(--ad-gris)]">{signature}</p>
            <div className="mt-auto flex items-center justify-between gap-4 border-t border-[var(--ad-sable-fonce)] pt-5">
              <span className="text-[13px] tabular-nums text-[var(--ad-gris)]">
                {choisie + 1} / {faq.length}
              </span>
              <button
                type="button"
                onClick={() => setChoisie((choisie + 1) % faq.length)}
                className="group inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ad-nuit)]"
              >
                {suivante}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white transition-transform duration-500 ease-[var(--ad-ease)] group-hover:translate-x-1">
                  <ArrowUpRight className="h-4 w-4 rotate-45" />
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA SEMAINE — les jours de consultation, aujourd'hui allumé, avec un
   pouls s'il est ouvert.
   ══════════════════════════════════════════════════════════════════════ */

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export function Semaine({ horaires }: { horaires: OpeningHour[] }) {
  const [aujourdhui, setAujourdhui] = useState<number | null>(null)
  useEffect(() => setAujourdhui((new Date().getDay() + 6) % 7), [])
  const horaireDe = (j: string) => horaires.find((h) => h.day.toLowerCase().startsWith(j.slice(0, 3)))?.hours ?? null
  const ferme = (h: string | null) => !h || /ferm/i.test(h)
  const duJour = aujourdhui !== null ? horaireDe(JOURS[aujourdhui]!) : null
  return (
    <div>
      <p className="mb-5 flex items-center gap-3 text-[15px] text-[var(--ad-nuit)]">
        {aujourdhui !== null && (
          <>
            <span className="relative grid h-3 w-3 place-items-center">
              {!ferme(duJour) && <span className="absolute inset-0 rounded-full bg-[#6e9a6b] motion-safe:animate-[ad-pouls_1.8s_ease-out_infinite]" />}
              <span className={cn('relative h-2 w-2 rounded-full', ferme(duJour) ? 'bg-[var(--ad-gris)]' : 'bg-[#6e9a6b]')} />
            </span>
            {ferme(duJour) ? 'Le cabinet est fermé aujourd’hui' : `Ouvert aujourd’hui · ${duJour}`}
          </>
        )}
      </p>
      <ol className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {JOURS.map((j, i) => {
          const h = horaireDe(j)
          const actif = i === aujourdhui
          return (
            <li
              key={j}
              title={h ?? 'Fermé'}
              className={cn(
                'flex min-w-0 flex-col items-center gap-2 rounded-full px-0.5 py-4 text-center transition-colors duration-500 sm:px-1',
                actif ? 'bg-[var(--ad-nuit)] text-white' : ferme(h) ? 'bg-transparent text-[var(--ad-gris)]/60' : 'bg-[var(--ad-sable)] text-[var(--ad-nuit)]',
              )}
            >
              <span className="font-[family-name:var(--ad-titre)] text-[17px] font-semibold capitalize leading-none tracking-[-0.03em] sm:text-[20px]">{j.slice(0, 2)}</span>
              <span className={cn('h-1 w-1 rounded-full', ferme(h) ? 'bg-current/30' : actif ? 'bg-[var(--ad-or)]' : 'bg-[var(--ad-bleu)]')} />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * La semaine en liste courte (carte « Consultations ») : chaque jour et ses
 * heures. À l'arrivée, les jours se posent l'un après l'autre ; puis le
 * surlignage sable glisse sous aujourd'hui, et son point vert respire.
 */
export function SemaineListe({ horaires }: { horaires: OpeningHour[] }) {
  const ref = useRef<HTMLOListElement>(null)
  const edition = useContext(Edition)
  const [vu, setVu] = useState(false)
  const [aujourdhui, setAujourdhui] = useState<number | null>(null)
  useEffect(() => setAujourdhui((new Date().getDay() + 6) % 7), [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (edition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setVu(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVu(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [edition])
  const horaireDe = (j: string) => horaires.find((h) => h.day.toLowerCase().startsWith(j.slice(0, 3)))?.hours ?? null
  const doux = 'cubic-bezier(0.22,1,0.36,1)'
  const fin = 0.25 + JOURS.length * 0.07
  return (
    <ol ref={ref} className="-mx-2 flex flex-col">
      {JOURS.map((j, i) => {
        const h = horaireDe(j)
        const ferme = !h || /ferm/i.test(h)
        const actif = i === aujourdhui
        const entree = { opacity: vu ? 1 : 0, transform: vu ? 'none' : 'translateY(6px)', transition: `opacity .9s ${0.25 + i * 0.07}s, transform 1s ${doux} ${0.25 + i * 0.07}s` }
        return (
          <li
            key={j}
            className={cn(
              'group/jour relative flex items-start justify-between gap-3 rounded-[12px] px-2 py-[3px] text-[13.5px] leading-[1.35]',
              ferme ? 'text-[var(--ad-gris)]/70' : 'text-[var(--ad-nuit)]',
            )}
          >
            {/* Le surlignage d'aujourd'hui : il glisse de gauche à droite, une fois les jours posés. */}
            {actif && (
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-[12px] bg-[var(--ad-brume)]"
                style={{ transformOrigin: 'left center', transform: vu ? 'scaleX(1)' : 'scaleX(0)', opacity: vu ? 1 : 0, transition: `transform 1.1s ${doux} ${fin}s, opacity .4s ${fin}s` }}
              />
            )}
            <span className="flex shrink-0 items-center gap-2 capitalize" style={entree}>
              {actif && (
                <span aria-hidden="true" className="relative grid h-1.5 w-1.5 place-items-center">
                  {!ferme && vu && <span className="absolute inset-0 rounded-full bg-[var(--ad-bleu)] motion-safe:animate-[ad-pouls_2.4s_ease-out_infinite]" style={{ animationDelay: `${fin + 0.8}s` }} />}
                  <span className={cn('relative h-1.5 w-1.5 rounded-full', ferme ? 'bg-[var(--ad-gris)]' : 'bg-[var(--ad-bleu)]')} />
                </span>
              )}
              <span className={cn('transition-transform duration-500 group-hover/jour:translate-x-0.5', actif && 'font-semibold')}>{j.slice(0, 3)}.</span>
            </span>
            <span
              title={ferme ? undefined : (h ?? undefined)}
              className={cn('line-clamp-2 min-w-0 text-right tabular-nums [overflow-wrap:anywhere]', !ferme && 'text-[var(--ad-bleu)]', actif && !ferme && 'font-semibold')}
              style={{ ...entree, transition: `opacity .9s ${0.32 + i * 0.07}s, transform 1s ${doux} ${0.32 + i * 0.07}s` }}>
              {ferme ? 'Fermé' : h}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA LETTRE —le formulaire, comme une lettre : des lignes, pas des
   cases. Envoyée, elle s'envole ; une enveloppe se dessine à sa place.
   Le VRAI envoi : elle arrive dans « Messages » de l'administration.
   ══════════════════════════════════════════════════════════════════════ */

/* Sous chaque ligne, un trait d'encre qui se tire de gauche à droite
   quand on y écrit. */
function Trait() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] origin-left scale-x-0 bg-[linear-gradient(90deg,#46728a,#7ba3b6)] transition-transform duration-700 ease-[var(--ad-ease)] peer-focus:scale-x-100"
    />
  )
}

const LIGNE =
  'peer w-full border-0 border-b border-[var(--ad-sable-fonce)] bg-transparent px-0 py-3 font-[family-name:var(--ad-titre)] font-medium tracking-[-0.01em] text-[18px] text-[var(--ad-nuit)] outline-none transition-[border-color] duration-300 placeholder:text-[var(--ad-gris)]/50 focus:border-[var(--ad-nuit)]'

export function Lettre({ prenom, textes }: { prenom: string; textes?: Partial<TextesLettre> }) {
  const t = { ...lettreParDefaut(prenom), ...Object.fromEntries(Object.entries(textes ?? {}).filter(([, v]) => v && String(v).trim())) } as TextesLettre
  const [merciDebut, merciAccent, merciFin] = t.merciTitre.split('*')
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'envole' | 'ok'>('repos')
  const [longueur, setLongueur] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEtat('envoi')
    setErreur(null)
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.get('name'),
          email: f.get('email'),
          phone: f.get('phone'),
          message: f.get('message'),
          consent: f.get('consent') === 'on',
          website: f.get('website'),
        }),
      })
      if (!r.ok) {
        const corps = (await r.json().catch(() => null)) as { error?: string } | null
        setErreur(corps?.error ?? 'La lettre n’est pas partie. Réessayez dans un instant.')
        return setEtat('repos')
      }
      setEtat('envole')
      window.setTimeout(() => setEtat('ok'), reduit() ? 0 : 750)
    } catch {
      setErreur('Connexion interrompue. Réessayez dans un instant.')
      setEtat('repos')
    }
  }

  if (etat === 'ok') {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[36px] bg-white p-10 text-center shadow-[0_30px_80px_-40px_rgba(46,66,79,0.35)]">
        <svg viewBox="0 0 120 84" className="h-24 w-32" aria-hidden="true">
          {['M6 10 h108 v64 h-108 z', 'M6 10 L60 50 L114 10', 'M6 74 L46 40', 'M114 74 L74 40'].map((d, i) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke={i === 1 ? 'var(--ad-or)' : 'var(--ad-nuit)'}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              className="[--ad-longueur:1] motion-safe:animate-[ad-tracer_1.2s_var(--ad-ease)_backwards]"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </svg>
        <p className="mt-8 font-[family-name:var(--ad-titre)] font-semibold tracking-[-0.03em] text-[40px] leading-none text-[var(--ad-nuit)]">
          {merciDebut}
          {merciAccent && <em>{merciAccent}</em>}
          {merciFin}
        </p>
        <p className="mt-4 max-w-[36ch] text-[15px] leading-[1.6] text-[var(--ad-pierre)]">
          {t.merciTexte}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={envoyer}
      className={cn(
        'relative rounded-[36px] bg-white p-7 shadow-[0_30px_80px_-40px_rgba(46,66,79,0.35)] sm:p-12',
        etat === 'envole' && 'motion-safe:animate-[ad-envol_0.75s_var(--ad-ease)_forwards]',
      )}
    >
      <p className="font-[family-name:var(--ad-titre)] font-semibold tracking-[-0.03em] text-[30px] text-[var(--ad-nuit)]">{t.salutation}</p>
      <div className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <label className="relative block">
          <span className="sr-only">Votre nom</span>
          <input name="name" required minLength={2} autoComplete="name" placeholder={t.nom} className={LIGNE} />
          <Trait />
        </label>
        <label className="relative block">
          <span className="sr-only">Votre téléphone (facultatif)</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder={t.telephone} className={LIGNE} />
          <Trait />
        </label>
        <label className="relative block sm:col-span-2">
          <span className="sr-only">Votre adresse e-mail</span>
          <input name="email" type="email" required autoComplete="email" placeholder={t.email} className={LIGNE} />
          <Trait />
        </label>
        <label className="block sm:col-span-2">
          <span className="sr-only">Votre message</span>
          <textarea
            name="message"
            required
            minLength={20}
            rows={5}
            placeholder={t.message}
            onChange={(e) => setLongueur(e.currentTarget.value.trim().length)}
            aria-describedby="lettre-longueur"
            className={cn(
              LIGNE,
              'resize-none border-b-0 bg-[linear-gradient(transparent_calc(2.4em_-_1px),var(--ad-sable-fonce)_calc(2.4em_-_1px),var(--ad-sable-fonce)_2.4em,transparent_2.4em)] bg-[length:100%_2.4em] leading-[2.4em] [background-attachment:local]',
            )}
          />
          <span
            id="lettre-longueur"
            className={cn(
              'mt-2 flex items-center gap-1.5 text-[12px] transition-colors duration-300',
              longueur >= 20 ? 'text-[var(--ad-or)]' : 'text-[var(--ad-gris)]',
            )}
          >
            <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full transition-colors', longueur >= 20 ? 'bg-[var(--ad-or)] text-white' : 'border border-current')}>
              {longueur >= 20 && <Check className="h-2.5 w-2.5" />}
            </span>
            {longueur >= 20 ? 'C’est parfait.' : `Encore ${20 - longueur} caractère${20 - longueur > 1 ? 's' : ''} au moins`}
          </span>
        </label>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className="mt-6 flex items-start gap-3 text-[13px] leading-[1.5] text-[var(--ad-gris)]">
        <input name="consent" type="checkbox" required className="peer sr-only" />
        <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-[var(--ad-sable-fonce)] transition-colors peer-checked:border-[var(--ad-nuit)] peer-checked:bg-[var(--ad-nuit)] peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--ad-bleu)] [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100">
          <Check className="h-3 w-3 text-white" />
        </span>
        {t.consentement}
      </label>
      {erreur && (
        <p role="alert" className="mt-4 rounded-[16px] bg-[#f3e1db] px-4 py-3 text-[14px] text-[#9a5a48]">
          {erreur}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <span className="text-[15px] font-medium text-[var(--ad-gris)]">{t.signature}</span>
        <button
          type="submit"
          disabled={etat !== 'repos'}
          className="group inline-flex items-center gap-3 rounded-full bg-[var(--ad-nuit)] py-2 pl-6 pr-2 text-[15px] font-medium text-white transition-opacity disabled:opacity-60"
        >
          {etat === 'repos' ? t.bouton : 'Envoi…'}
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ad-or)] transition-transform duration-500 ease-[var(--ad-ease)] group-hover:rotate-45">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    </form>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LE FIL — la navigation : une pilule flottante qui se resserre quand on
   descend, et un fil d'or qui mesure la lecture. Sur téléphone, un
   rideau ivoire aux grands liens.
   ══════════════════════════════════════════════════════════════════════ */

export function Fil({ liens, rdv, logo }: { liens: { href: string; label: string }[]; rdv: string; logo: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [serre, setSerre] = useState(false)
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState<string | null>(null)
  const [survol, setSurvol] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const [pastille, setPastille] = useState<{ left: number; width: number } | null>(null)
  /* La pastille glisse sous le lien survolé, sinon sous celui de la
     section qu'on lit — avec un léger rebond à l'arrivée. */
  const cible = survol ?? actif
  useLayoutEffect(() => {
    const a = cible ? navRef.current?.querySelector<HTMLElement>(`a[href="${cible}"]`) : null
    setPastille(a ? { left: a.offsetLeft, width: a.offsetWidth } : null)
  }, [cible, serre])
  /* Le lien de la section qu'on lit s'allume. */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entrees) => {
        /* Une section qui sort éteint son lien (en haut de page, ou entre deux sections sans lien, rien n'est allumé). */
        for (const e of entrees) if (!e.isIntersecting) setActif((a) => (a === `#${e.target.id}` ? null : a))
        for (const e of entrees) if (e.isIntersecting) setActif(`#${e.target.id}`)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const l of liens) {
      const el = document.getElementById(l.href.slice(1))
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [liens])
  useEffect(() => {
    let image = 0
    const calcule = () => {
      image = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      ref.current?.style.setProperty('--lu', String(max > 0 ? window.scrollY / max : 0))
      /* L'avancement DANS la section en cours : la pastille se remplit. */
      let sec = 0
      for (const l of liens) {
        const el = document.getElementById(l.href.slice(1))
        if (!el) continue
        const r = el.getBoundingClientRect()
        const milieu = window.innerHeight * 0.5
        if (r.top <= milieu && r.bottom > milieu) sec = (milieu - r.top) / r.height
      }
      ref.current?.style.setProperty('--sec', String(Math.min(1, Math.max(0, sec))))
      setSerre(window.scrollY > 80)
    }
    const demande = () => {
      if (!image) image = requestAnimationFrame(calcule)
    }
    calcule()
    window.addEventListener('scroll', demande, { passive: true })
    return () => {
      cancelAnimationFrame(image)
      window.removeEventListener('scroll', demande)
    }
  }, [liens])
  useEffect(() => {
    document.body.style.overflow = ouvert ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [ouvert])

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <div
          ref={ref}
          className={cn(
            'pointer-events-auto relative flex items-center gap-2 overflow-hidden rounded-full border border-white/60 bg-white/75 shadow-[0_10px_40px_-20px_rgba(46,66,79,0.3)] backdrop-blur-xl transition-[padding,gap,box-shadow] duration-700 ease-[var(--ad-ease)] [--lu:0] [--sec:0]',
            serre ? 'py-1.5 pl-2 pr-1.5' : 'py-2 pl-2.5 pr-2.5',
          )}
        >
          <a href="#haut" className="group/logo mr-3 flex items-center gap-2.5 text-[20px] font-bold leading-none tracking-[-0.03em] text-[var(--ad-nuit)]">
            {/* Le logo, cerclé d'un anneau qui se dessine à mesure qu'on lit. */}
            <span className="relative grid h-10 w-10 place-items-center">
              <svg aria-hidden="true" viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
                <defs>
                  <linearGradient id="ad-anneau" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#46728a" />
                    <stop offset="100%" stopColor="#7ba3b6" />
                  </linearGradient>
                </defs>
                <circle cx="20" cy="20" r="18.5" fill="none" stroke="var(--ad-sable-fonce)" strokeWidth="1.5" />
                <circle
                  cx="20"
                  cy="20"
                  r="18.5"
                  fill="none"
                  stroke="url(#ad-anneau)"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  style={{ strokeDashoffset: 'calc(1 - var(--lu))' }}
                />
              </svg>
              <LogoMark src={logo} priority className="h-7 w-7 transition-transform duration-700 ease-[var(--ad-ease)] group-hover/logo:rotate-[-12deg]" />
            </span>
            <span className={cn('transition-[opacity,max-width] duration-700 ease-[var(--ad-ease)]', serre ? 'max-w-0 opacity-0 sm:max-w-[120px] sm:opacity-100' : 'max-w-[120px]')}>
              Anasawi<span className="text-[var(--ad-or)]">.</span>
            </span>
          </a>
          <nav ref={navRef} aria-label="Sections" className="relative flex items-center max-lg:hidden" onMouseLeave={() => setSurvol(null)}>
            {/* La pastille qui glisse d'un lien à l'autre, et qui se
                remplit d'un dégradé pendant qu'on lit la section. */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-0 overflow-hidden rounded-full bg-[var(--ad-sable)] transition-[left,width,opacity] duration-[650ms] ease-[cubic-bezier(0.34,1.45,0.64,1)]',
                pastille ? 'opacity-100' : 'opacity-0',
              )}
              style={pastille ? { left: pastille.left, width: pastille.width } : { left: 0, width: 0 }}
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-full origin-left bg-[linear-gradient(90deg,rgba(70,114,138,0.16),rgba(79,169,166,0.26))] transition-opacity duration-300',
                  survol && survol !== actif ? 'opacity-0' : 'opacity-100',
                )}
                style={{ transform: 'scaleX(var(--sec))' }}
              />
            </span>
            {liens.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onMouseEnter={() => setSurvol(l.href)}
                onFocus={() => setSurvol(l.href)}
                onBlur={() => setSurvol(null)}
                aria-current={actif === l.href ? 'location' : undefined}
                className={cn(
                  'relative z-[1] whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] transition-colors duration-300',
                  cible === l.href ? 'text-[var(--ad-nuit)]' : 'text-[var(--ad-pierre)]',
                )}
              >
                {l.label}
              </a>
            ))}
          </nav>
          {/* TEMPORAIRE : accès au catalogue des modèles, le temps de les choisir. À retirer ensuite. */}
          <a
            href="/moderne/catalogue"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#e2f3f1] px-3.5 py-2 text-[13px] font-semibold text-[#2f8582] transition-colors duration-500 ease-[var(--ad-ease)] hover:bg-[#4fa9a6] hover:text-white max-lg:hidden"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
            Modèles
          </a>
          <BasculeVersion actuelle="moderne" className="mr-1 text-[var(--ad-pierre)] max-lg:hidden" />
          <Aimant force={0.25} className="max-lg:hidden">
          <a
            href={rdv}
            className={cn(
              'whitespace-nowrap rounded-full bg-[var(--ad-nuit)] text-[14px] font-medium text-white transition-[padding] duration-700 ease-[var(--ad-ease)] max-lg:hidden',
              serre ? 'px-4 py-2' : 'px-5 py-2.5',
            )}
          >
            Rendez-vous
          </a>
          </Aimant>
          <button
            type="button"
            onClick={() => setOuvert(true)}
            aria-label="Ouvrir le menu"
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ad-nuit)] text-white lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Le rideau du téléphone. */}
      <div
        className={cn(
          'fixed inset-0 z-[60] flex flex-col bg-[var(--ad-ivoire)] px-7 pb-10 pt-6 transition-[clip-path] duration-[800ms] ease-[var(--ad-ease)] lg:hidden',
          ouvert ? '[clip-path:circle(150%_at_calc(100%-44px)_44px)]' : 'pointer-events-none [clip-path:circle(0%_at_calc(100%-44px)_44px)]',
        )}
        aria-hidden={!ouvert}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-[24px] font-bold tracking-[-0.03em]">
            <LogoMark src={logo} className="h-9 w-9" />
            Anasawi<span className="-ml-2.5 text-[var(--ad-or)]">.</span>
          </span>
          <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer le menu" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--ad-sable-fonce)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav aria-label="Sections" className="mt-auto flex flex-col gap-1">
          {liens.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOuvert(false)}
              tabIndex={ouvert ? 0 : -1}
              className={cn(
                'font-[family-name:var(--ad-titre)] font-semibold tracking-[-0.03em] text-[46px] leading-[1.15] text-[var(--ad-nuit)] transition-[opacity,transform,translate,scale,rotate] duration-700 ease-[var(--ad-ease)]',
                ouvert ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
              )}
              style={{ transitionDelay: ouvert ? `${0.15 + i * 0.06}s` : '0s' }}
            >
              <span className="mr-3 align-top text-[14px] text-[var(--ad-or)]">{String(i + 1).padStart(2, '0')}</span>
              {l.label}
            </a>
          ))}
        </nav>
        <BasculeVersion actuelle="moderne" className="mt-8 self-start text-[var(--ad-pierre)]" />
        {/* TEMPORAIRE : le catalogue des modèles. */}
        <a href="/moderne/catalogue" tabIndex={ouvert ? 0 : -1} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#e2f3f1] py-3.5 text-[15px] font-semibold text-[#2f8582]">
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          Voir tous les modèles
        </a>
        <a href={rdv} onClick={() => setOuvert(false)} tabIndex={ouvert ? 0 : -1} className="mt-3 rounded-full bg-[var(--ad-nuit)] py-4 text-center text-[16px] font-medium text-white">
          Prendre rendez-vous
        </a>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LE SOUFFLE — le cercle qui respire, et un exercice guidé d'une minute :
   un anneau qui se remplit, le nombre de respirations, l'arrêt à tout
   moment.
   ══════════════════════════════════════════════════════════════════════ */

const DUREE_EXERCICE = 64 // 8 respirations de 8 s

export function Souffle({ bouton = 'Respirer une minute' }: { bouton?: string }) {
  const [debut, setDebut] = useState<number | null>(null)
  const [ecoule, setEcoule] = useState(0)
  useEffect(() => {
    if (debut === null) return
    const t = window.setInterval(() => {
      const s = (Date.now() - debut) / 1000
      if (s >= DUREE_EXERCICE) {
        setDebut(null)
        setEcoule(DUREE_EXERCICE)
      } else setEcoule(s)
    }, 200)
    return () => window.clearInterval(t)
  }, [debut])
  const enCours = debut !== null
  const fini = !enCours && ecoule >= DUREE_EXERCICE
  const respirations = Math.min(8, Math.floor(ecoule / 8) + (enCours ? 1 : 0))

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative grid aspect-square w-full max-w-[400px] place-items-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-[var(--ad-sable-fonce)]" />
        {/* L'anneau de l'exercice. */}
        <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="49.4"
            fill="none"
            stroke="var(--ad-or)"
            strokeWidth="0.8"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            style={{ strokeDashoffset: 1 - ecoule / DUREE_EXERCICE, transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <span aria-hidden="true" className="absolute inset-[13%] rounded-full border border-dashed border-[var(--ad-or)]/40 motion-safe:animate-[ad-tourner_60s_linear_infinite]" />
        {/* La clé `debut` relance l'animation : l'exercice démarre sur une inspiration. */}
        <span
          key={`c-${debut ?? 'repos'}`}
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_34%,#fbf8f2_0%,var(--ad-brume)_58%,#dfe9ed_100%)] shadow-[0_26px_50px_-32px_rgba(46,66,79,0.35)] motion-safe:animate-[ad-souffle_8s_var(--ad-ease-lent)_infinite]"
        />
        <span key={`t-${debut ?? 'repos'}`} className="relative grid place-items-center font-[family-name:var(--ad-titre)] text-[32px] italic text-[var(--ad-nuit)]">
          <span className="col-start-1 row-start-1 motion-safe:animate-[ad-inspirez_8s_linear_infinite]">Inspirez</span>
          <span className="col-start-1 row-start-1 opacity-0 motion-safe:animate-[ad-expirez_8s_linear_infinite]">Expirez</span>
        </span>
      </div>
      <div className="flex flex-col items-center gap-3 text-center xl:flex-row xl:gap-4 xl:text-left" aria-live="polite">
        <button
          type="button"
          onClick={() => {
            if (enCours) setDebut(null)
            else {
              setEcoule(0)
              setDebut(Date.now())
            }
          }}
          className="group inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-[var(--ad-nuit)] py-2 pl-5 pr-2 text-[14px] font-semibold text-white"
        >
          {enCours ? 'Arrêter' : fini ? 'Recommencer' : bouton}
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
            {enCours ? <X className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-45" />}
          </span>
        </button>
        <span className="text-[13px] tabular-nums text-[var(--ad-gris)]">
          {enCours ? `Respiration ${respirations} / 8` : fini ? 'Bravo. Prenez ce calme avec vous.' : '8 respirations · 4 s · 4 s'}
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   L'AIMANT — un bouton qui se laisse attirer par le pointeur, de
   quelques pixels, et revient en place avec un léger ressort.
   ══════════════════════════════════════════════════════════════════════ */

export function Aimant({ children, force = 0.3, className }: { children: React.ReactNode; force?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const bouge = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse' || reduit()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * force
    const y = (e.clientY - (r.top + r.height / 2)) * force * 1.2
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
  }
  const relache = () => {
    if (ref.current) ref.current.style.transform = ''
  }
  return (
    <span
      ref={ref}
      onPointerMove={bouge}
      onPointerLeave={relache}
      className={cn('inline-flex transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform', className)}
    >
      {children}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   L'INCLINAISON — une image (ou une carte) qui bascule légèrement vers la
   souris, le coin le plus proche s'enfonçant, avec un reflet de lumière
   qui suit le pointeur. Revient en place avec un ressort.
   L'élément reçoit --rx / --ry (degrés) et --mx / --my (% du reflet) :
   `Incline` les applique elle-même ; `variables` les laisse à l'enfant.
   ══════════════════════════════════════════════════════════════════════ */

export function Incline({
  children,
  className,
  max = 7,
  reflet = true,
  variables = false,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Bascule maximale, en degrés. */
  max?: number
  reflet?: boolean
  /** Ne pose que les variables : l'enfant compose sa propre transformation. */
  variables?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const edition = useContext(Edition)
  const bouge = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse' || edition || reduit()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    el.dataset.survol = 'oui'
  }
  const relache = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    delete el.dataset.survol
  }
  return (
    <div
      ref={ref}
      onPointerMove={bouge}
      onPointerLeave={relache}
      style={style}
      className={cn('group/incline relative [--rx:0deg] [--ry:0deg] [--mx:50%] [--my:50%] [perspective:1100px]', className)}
    >
      {variables ? (
        children
      ) : (
        <div className="relative h-full w-full transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] [transform:rotateX(var(--rx))_rotateY(var(--ry))] [transform-style:preserve-3d] group-data-[survol=oui]/incline:duration-150">
          {children}
          {reflet && <Reflet />}
        </div>
      )}
    </div>
  )
}

/** Le reflet de lumière, à poser dans un élément qui suit `Incline`. */
export function Reflet({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-500 [background:radial-gradient(circle_at_var(--mx)_var(--my),rgba(255,255,255,0.55),transparent_55%)] group-data-[survol=oui]/incline:opacity-100',
        className,
      )}
    />
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LE COMPTEUR — un nombre qui monte jusqu'à sa valeur quand il apparaît
   (courbe qui ralentit à l'arrivée). Affiché d'emblée dans l'éditeur et
   pour qui réduit les animations.
   ══════════════════════════════════════════════════════════════════════ */

export function Compteur({ valeur, duree = 1600 }: { valeur: number; duree?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const edition = useContext(Edition)
  const [affiche, setAffiche] = useState(valeur)
  useEffect(() => {
    const el = ref.current
    if (!el || edition || reduit()) return
    setAffiche(0)
    let image = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return
        io.disconnect()
        const debut = performance.now()
        const pas = (t: number) => {
          const k = Math.min(1, (t - debut) / duree)
          setAffiche(Math.round(valeur * (1 - Math.pow(1 - k, 4))))
          if (k < 1) image = requestAnimationFrame(pas)
        }
        image = requestAnimationFrame(pas)
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(image)
    }
  }, [valeur, duree, edition])
  return (
    <span ref={ref} className="tabular-nums">
      {affiche}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA CARTE — une vraie carte Google, fondue dans la DA : désaturée et
   teintée aux couleurs du site, l'épingle qui bat au centre. Chargée
   seulement à l'approche (pas de tiers tant qu'on ne la voit pas), et
   inerte jusqu'au clic — la molette fait défiler la page, pas la carte.
   ══════════════════════════════════════════════════════════════════════ */

export function Carte({ adresse, zoom = 15, className }: { adresse: string; zoom?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [proche, setProche] = useState(false)
  /* `active` : la carte reçoit la souris. `decalee` : on l'a déplacée,
     l'épingle du site ne tombe plus sur l'adresse — on la cache jusqu'au
     recentrage. Sortir de la carte ne recharge rien : la vue reste où on
     l'a laissée, sans flash ni saut. */
  const [active, setActive] = useState(false)
  const [decalee, setDecalee] = useState(false)
  /* Recentrer = recharger la carte. La nouvelle se charge, invisible,
     par-dessus l'ancienne, et ne la remplace qu'une fois prête. */
  const [vue, setVue] = useState(0)
  const [prochaine, setProchaine] = useState<number | null>(null)
  const src = `https://www.google.com/maps?q=${encodeURIComponent(adresse)}&z=${zoom}&output=embed`

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setProche(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const explorer = () => {
    setActive(true)
    setDecalee(true)
  }
  const recentrer = () => {
    setActive(false)
    setProchaine(vue + 1)
  }

  /* Plus haute que le cadre de 300 px, centrée : la fiche que Google pose
     en haut à gauche et ses boutons du bas sortent du cadre. */
  const cadre =
    'absolute left-0 top-[-150px] h-[calc(100%+300px)] w-[calc(var(--centre,50%)*2)] max-w-none border-0 [filter:grayscale(1)_contrast(1.05)_brightness(1.04)]'
  const bouton =
    'rounded-full bg-white/85 px-3.5 py-1.5 text-[12px] font-semibold text-[var(--ad-nuit)] shadow-[0_6px_18px_-10px_rgba(46,66,79,0.5)] backdrop-blur transition-colors hover:bg-white'

  return (
    <div ref={ref} className={cn('relative isolate overflow-hidden bg-[var(--ad-brume)]', className)} onMouseLeave={() => setActive(false)}>
      {proche && (
        <iframe key={vue} title={`Plan d’accès : ${adresse}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className={cn(cadre, !active && 'pointer-events-none')} />
      )}
      {prochaine !== null && (
        <iframe
          key={prochaine}
          aria-hidden="true"
          tabIndex={-1}
          title="Plan d’accès (rechargement)"
          src={src}
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => {
            // Laisse Google dessiner ses tuiles avant d'échanger.
            window.setTimeout(() => {
              setVue(prochaine)
              setProchaine(null)
              setDecalee(false)
            }, 600)
          }}
          className={cn(cadre, 'pointer-events-none opacity-0')}
        />
      )}
      {/* La teinte du site, posée sur le gris de la carte — même en exploration. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,#46728a,#7ba3b6)] opacity-60 mix-blend-color" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(246,247,249,0.55))]" />
      {/* L'épingle, au centre — là où la carte place l'adresse. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-[var(--centre,50%)] top-1/2 grid -translate-x-1/2 -translate-y-full place-items-center transition-opacity duration-500',
          decalee && 'opacity-0',
        )}
      >
        <span className="absolute top-full h-20 w-20 -translate-y-1/2 rounded-full bg-[var(--ad-or)]/35 motion-safe:animate-[ad-pouls_2.4s_ease-out_infinite]" />
        <span className="relative grid h-12 w-12 place-items-center rounded-full rounded-br-none bg-[var(--ad-nuit)] text-white shadow-[0_14px_30px_-10px_rgba(46,66,79,0.6)] [transform:rotate(45deg)]">
          <span className="h-3 w-3 rounded-full bg-[var(--ad-or)] [transform:rotate(-45deg)]" />
        </span>
      </span>
      {proche && (
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          {decalee && (
            <button type="button" onClick={recentrer} disabled={prochaine !== null} className={bouton}>
              {prochaine !== null ? 'Recentrage…' : 'Recentrer'}
            </button>
          )}
          {!active && (
            <button type="button" onClick={explorer} className={bouton}>
              Explorer la carte
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LE RIDEAU — une image qui se dévoile de bas en haut en entrant dans
   l'écran, pendant que la photo, un peu trop grande, se pose.
   ══════════════════════════════════════════════════════════════════════ */

export function Rideau({ children, className, rayon = 32 }: { children: React.ReactNode; className?: string; rayon?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const edition = useContext(Edition)
  const [etat, setEtat] = useState<'ssr' | 'cache' | 'vu'>('ssr')
  useLayoutEffect(() => {
    const el = ref.current
    if (edition) return
    if (!el || reduit()) return setEtat('vu')
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return setEtat('vu')
    setEtat('cache')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setEtat('vu')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [edition])
  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden', etat === 'vu' && 'motion-safe:animate-[ad-rideau_1.5s_cubic-bezier(0.77,0,0.18,1)_backwards]', className)}
      style={{
        borderRadius: rayon,
        ['--ad-rayon' as string]: `${rayon}px`,
        clipPath: etat === 'cache' ? `inset(100% 0 0 0 round ${rayon}px)` : undefined,
      }}
    >
      <div className={cn('absolute inset-0', etat === 'vu' && 'motion-safe:animate-[ad-poser_2.2s_var(--ad-ease)_backwards]')}>{children}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA PARALLAXE — le contenu glisse un peu moins vite que la page : la
   photo semble posée plus loin, derrière son cadre.
   ══════════════════════════════════════════════════════════════════════ */

export function Parallaxe({ children, amplitude = 60, className }: { children: React.ReactNode; amplitude?: number; className?: string }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  return (
    <div ref={ref} className={cn('absolute inset-x-0 [--p:0.5]', className)} style={{ top: -amplitude / 2, bottom: -amplitude / 2 }}>
      <div className="absolute inset-0 will-change-transform" style={{ transform: `translate3d(0, calc((var(--p) - 0.5) * ${-amplitude}px), 0)` }}>
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA LUEUR — une lumière douce qui suit la souris sur une carte. À poser
   dans un parent `relative isolate overflow-hidden` (elle passe sous
   son contenu, au-dessus de son fond).
   ══════════════════════════════════════════════════════════════════════ */

export function Lueur({ couleur = 'rgba(79,169,166,0.13)', taille = 380 }: { couleur?: string; taille?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent || reduit()) return
    const bouge = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = parent.getBoundingClientRect()
      el.style.setProperty('--lx', `${e.clientX - r.left}px`)
      el.style.setProperty('--ly', `${e.clientY - r.top}px`)
      el.style.opacity = '1'
    }
    const sort = () => {
      el.style.opacity = '0'
    }
    parent.addEventListener('pointermove', bouge)
    parent.addEventListener('pointerleave', sort)
    return () => {
      parent.removeEventListener('pointermove', bouge)
      parent.removeEventListener('pointerleave', sort)
    }
  }, [])
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500"
      style={{ background: `radial-gradient(${taille}px circle at var(--lx, 50%) var(--ly, 50%), ${couleur}, transparent 60%)` }}
    />
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA CONVICTION — une phrase en très grand dont les mots s'allument un à
   un, au rythme de la lecture : on la lit à la vitesse où on descend.
   ══════════════════════════════════════════════════════════════════════ */

export function Conviction({ mots, className }: { mots: { mot: string; accent?: boolean }[]; className?: string }) {
  const ref = useAvancement<HTMLParagraphElement>('passage')
  const n = mots.length
  return (
    <p ref={ref} className={cn('[--p:1]', className)}>
      {mots.map((m, i) => {
        const allume = `clamp(0, calc((var(--p) * 3.4 - 0.35 - ${i / n}) * 7), 1)`
        const style = {
          opacity: `calc(0.1 + ${allume} * 0.9)`,
          transform: `translate3d(0, calc((1 - ${allume}) * 0.12em), 0)`,
        }
        return (
          <span key={i}>
            <span className="inline-block" style={style}>
              {m.accent ? <em>{m.mot}</em> : m.mot}
            </span>{' '}
          </span>
        )
      })}
    </p>
  )
}
