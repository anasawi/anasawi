'use client'

import { ArrowDown, ArrowUpRight, Coffee } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useRef, useState } from 'react'

import { Edition } from './vivant'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * L'ACCUEIL ET LA RENCONTRE, version « on se pose, on prend un café ».
 *
 * Anne aime le CADRE DE PORTE du site classique : les photos sont dans
 * une arche (le haut tout rond, le bas à peine arrondi). Ici, chaque
 * photo est une porte qui s'ouvre — elle se découvre de bas en haut —,
 * doublée d'un fin chambranle couleur sable, décalé, comme un encadrement.
 *
 * Tout est doux : l'ivoire crème, une tasse dont la vapeur monte, du texte à taille humaine, des
 * apparitions lentes. Rien de brut.
 */

/** La forme de la porte : le haut en plein cintre, le bas presque droit. */
export const ARCHE = '999px 999px 22px 22px'
export const DOUX = 'cubic-bezier(0.22,1,0.36,1)'
export const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Vrai une fois à l'écran (toujours vrai dans l'éditeur). */
export function useVu<T extends HTMLElement>(marge = '-10%') {
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

/** Les propriétés des survols (soulèvement, ombre, couleurs) : elles gardent leur douceur, sans le délai de l'apparition. */
const SURVOL = ['translate', 'scale', 'rotate', 'box-shadow', 'background-color', 'color', 'border-color', 'outline-color'].map((p) => `${p} .6s ${DOUX}`).join(', ')

export const apparait = (vu: boolean, delai = 0) => ({
  opacity: vu ? 1 : 0,
  transform: vu ? 'none' : 'translateY(14px)',
  transition: `opacity 1.2s ${delai}s, transform 1.4s ${DOUX} ${delai}s, ${SURVOL}`,
})

/** Un texte avec ses accents « *mot* » : le mot clé en italique. */
export function accent(texte: string) {
  return texte.split('*').map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
}

/* ══════════════════════════════════════════════════════════════════════
   LA PORTE — une photo dans une arche, son chambranle, et l'ouverture.
   ══════════════════════════════════════════════════════════════════════ */

export function Porte({
  media,
  vu,
  delai = 0,
  sizes,
  className,
  chambranle = 'droite',
  lente = false,
  priorite = false,
  lisere = false,
}: {
  media: Media | null | undefined
  vu: boolean
  delai?: number
  sizes: string
  className?: string
  /** De quel côté le chambranle (le cadre sable) dépasse. */
  chambranle?: 'droite' | 'gauche' | 'aucun'
  /** Un très lent mouvement de caméra dans la photo. */
  lente?: boolean
  priorite?: boolean
  /** Un liseré ivoire autour : la petite porte se détache de la grande. */
  lisere?: boolean
}) {
  return (
    <div className={cn('relative', className)}>
      {lisere && <span aria-hidden="true" className="absolute -inset-[7px] bg-[var(--ad-ivoire)] shadow-[0_24px_50px_-24px_rgba(46,66,79,0.5)]" style={{ borderRadius: ARCHE, opacity: vu ? 1 : 0, transition: `opacity .8s ${delai}s` }} />}
      {chambranle !== 'aucun' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 border-[1.5px] border-[var(--ad-sable-fonce)]"
          style={{
            borderRadius: ARCHE,
            transform: vu ? `translate(${chambranle === 'droite' ? 16 : -16}px, 16px)` : 'translate(0, 0)',
            opacity: vu ? 1 : 0,
            transition: `transform 1.6s ${DOUX} ${delai + 0.7}s, opacity 1s ${delai + 0.6}s`,
          }}
        />
      )}
      <div
        className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.45)]"
        style={{
          borderRadius: ARCHE,
          clipPath: vu ? `inset(0 0 0 0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`,
          transition: `clip-path 1.6s ${DOUX} ${delai}s`,
        }}
      >
        {media && (
          <Image
            src={media.url}
            alt={media.alt}
            fill
            sizes={sizes}
            priority={priorite}
            className={cn('object-cover', lente && 'motion-safe:animate-[ad-kenburns_18s_ease-out_both]')}
            style={lente ? undefined : { transform: vu ? 'scale(1)' : 'scale(1.1)', transition: `transform 2.2s ${DOUX} ${delai}s` }}
          />
        )}
      </div>
    </div>
  )
}

/** La vapeur qui monte d'une tasse : trois volutes qui ondulent et s'effacent. */
export function Vapeur({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 70" className={cn('pointer-events-none', className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      {[
        { d: 'M18 66 C 10 54, 26 46, 18 34 C 12 25, 22 18, 18 6', delai: 0 },
        { d: 'M31 66 C 23 54, 39 46, 31 34 C 25 25, 35 18, 31 6', delai: 1.2 },
        { d: 'M44 66 C 36 54, 52 46, 44 34 C 38 25, 48 18, 44 6', delai: 2.4 },
      ].map((v, i) => (
        <path key={i} d={v.d} className="motion-safe:animate-[ad-vapeur_3.6s_ease-in-out_infinite] motion-reduce:opacity-40" style={{ animationDelay: `${v.delai}s` }} pathLength={1} strokeDasharray="0.5 1" />
      ))}
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   L'ACCUEIL — sur l'ivoire crème : à gauche, le prénom,
   quelques mots, deux boutons et une invitation à s'installer ; à
   droite, la porte du cabinet, et une petite porte avec une tasse.
   ══════════════════════════════════════════════════════════════════════ */

export function Accueil({
  surtitre,
  prenom,
  nom,
  intro,
  photo,
  tasse,
  pastilles,
  rdv,
  bouton,
  bouton2,
  invitation,
  slogan = '',
}: {
  surtitre: string
  prenom: string
  nom: string
  intro: string
  photo: Media | null
  tasse: Media | null
  pastilles: string[]
  rdv: string
  bouton: string
  bouton2: string
  invitation: string
  /** La phrase près de la tasse (vide : masquée). */
  slogan?: string
}) {
  const [ref, vu] = useVu<HTMLElement>('0%')
  return (
    <section ref={ref} id="haut" className="relative isolate overflow-hidden">
      {/* Téléphone : la porte D'ABORD, large et basse (une arche d'entrée),
          puis le nom et les boutons — tout l'accueil tient dans l'écran. */}
      <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-[6vw] pb-12 pt-24 sm:gap-12 sm:pb-16 sm:pt-32 lg:min-h-[calc(var(--ad-vh)*100)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:px-12 lg:pb-20 lg:pt-28">
        <div>
          {surtitre && (
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ad-pierre)] shadow-[0_1px_2px_rgba(46,66,79,0.06),0_8px_20px_-12px_rgba(46,66,79,0.25)]" style={apparait(vu, 0.1)}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
              {surtitre}
            </p>
          )}
          <h1 className="mt-4 text-[clamp(46px,7.4vw,112px)] leading-[0.98] sm:mt-6">
            <span className="block" style={apparait(vu, 0.25)}>
              {prenom}
            </span>
            <em className="block" style={apparait(vu, 0.4)}>
              {nom}
            </em>
          </h1>
          {intro && (
            <p className="mt-4 max-w-[44ch] text-[16px] leading-[1.65] text-[var(--ad-pierre)] sm:mt-7 sm:text-[17px] sm:leading-[1.75] lg:text-[18px]" style={apparait(vu, 0.6)}>
              {intro}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-9 sm:gap-3" style={apparait(vu, 0.75)}>
            <a href={rdv} className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--ad-nuit)] py-2 pl-5 pr-2 text-[15px] sm:pl-6 font-semibold text-white shadow-[0_16px_32px_-18px_rgba(46,66,79,0.8)] transition-transform duration-500 hover:-translate-y-0.5">
              {bouton}
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 transition-transform duration-500 group-hover:rotate-45">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </a>
            {bouton2 && (
              <a href="#apres-accueil" className="rounded-full px-3.5 py-3 text-[15px] sm:px-5 font-semibold text-[var(--ad-nuit)] transition-colors hover:bg-white/70">
                {bouton2}
              </a>
            )}
          </div>
          {/* L'invitation à s'installer : une tasse, sa vapeur, une phrase. */}
          {slogan && (
          <p className="mt-12 hidden items-center gap-3 font-[family-name:var(--ad-titre)] text-[19px] italic text-[var(--ad-pierre)] sm:flex" style={apparait(vu, 1)}>
            <span className="relative grid h-11 w-11 place-items-center rounded-full bg-white/80 text-[var(--ad-bleu)] shadow-[0_8px_20px_-12px_rgba(46,66,79,0.3)]">
              <Vapeur className="absolute -top-5 left-1/2 h-6 w-5 -translate-x-1/2 text-[var(--ad-sable-fonce)]" />
              <Coffee className="h-5 w-5" />
            </span>
            {slogan}
          </p>
          )}
        </div>

        {/* Les portes. */}
        <div className="relative mx-auto w-full max-w-[460px] max-sm:order-first max-lg:max-w-[340px] max-sm:max-w-none lg:justify-self-end">
          <Porte media={photo} vu={vu} delai={0.2} lente priorite sizes="(max-width: 640px) 90vw, (max-width: 1024px) 80vw, 460px" className="aspect-[5/4] w-full sm:aspect-[4/5]" />
          {tasse && (
            <div className="absolute -bottom-6 -left-2 w-[30%] max-w-[190px] motion-safe:animate-[ad-flotter_7s_ease-in-out_infinite] sm:-bottom-8 sm:-left-3 sm:w-[40%] lg:-left-20">
              <Porte media={tasse} vu={vu} delai={0.9} chambranle="aucun" lisere sizes="190px" className="aspect-[3/4] w-full" />
              <Vapeur className="absolute -top-12 left-1/2 h-14 w-12 -translate-x-1/2 text-[var(--ad-sable-fonce)]" />
            </div>
          )}
          {pastilles.map((p, i) => (
            <span
              key={p}
              className={cn(
                'absolute inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-[var(--ad-nuit)] shadow-[0_14px_30px_-16px_rgba(46,66,79,0.45)] sm:px-3.5 sm:py-2 sm:text-[13px]',
                i === 0 ? 'right-2 top-[12%] sm:-right-2 sm:top-[18%] lg:-right-10' : 'bottom-[10%] right-2 sm:bottom-[14%] sm:-right-2 lg:-right-6',
              )}
              style={apparait(vu, 1.3 + i * 0.2)}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
              {p}
            </span>
          ))}
        </div>
      </div>
      {invitation && (
        <a href="#apres-accueil" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)] lg:flex" style={apparait(vu, 1.6)}>
          {invitation}
          <ArrowDown className="h-4 w-4 motion-safe:animate-[ad-flotter_2.6s_ease-in-out_infinite]" />
        </a>
      )}
      {/* La cible de « Découvrir » et de l'invitation : juste après l'accueil,
          quelle que soit la section suivante. */}
      <span id="apres-accueil" aria-hidden="true" className="absolute bottom-0 left-0 h-px w-px scroll-mt-0" />
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LA RENCONTRE — le portrait dans sa porte, une petite porte sur le
   cabinet glissée devant, et à côté une présentation à taille humaine,
   la citation sur un encart sable, et la signature qui s'écrit.
   ══════════════════════════════════════════════════════════════════════ */

export function RencontreDouce({
  surtitre,
  titre,
  texte,
  citation,
  signature,
  portrait,
  cabinet,
  legendeCabinet = 'Le cabinet, le matin',
}: {
  surtitre: string
  titre: string
  texte: string
  citation: string
  signature: string
  portrait: Media | null
  cabinet: Media | null
  /** La légende sous la petite porte du cabinet (vide : pas de légende). */
  legendeCabinet?: string
}) {
  const [ref, vu] = useVu<HTMLElement>()
  const lignes = titre.split('\n').filter((l) => l.trim())
  const paragraphes = texte.replace(/<[^>]+>/g, '\n').split(/\n+/).map((p) => p.trim()).filter(Boolean)
  return (
    <section ref={ref} id="a-propos" className="relative isolate scroll-mt-24 overflow-hidden py-14 sm:py-24 lg:py-32">
      {/* Un mur sable, comme une alcôve derrière les portes. */}
      <div aria-hidden="true" className="absolute inset-y-10 left-0 -z-10 w-[58%] bg-[var(--ad-sable)] max-lg:inset-x-0 max-lg:bottom-auto max-lg:h-[46%] max-lg:w-full" style={{ borderRadius: '0 48px 48px 0', opacity: vu ? 1 : 0, transition: 'opacity 1.4s' }} />
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-[6vw] sm:gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24 lg:px-12">
        <div className="relative mx-auto w-full max-w-[420px] max-lg:max-w-[300px] max-sm:max-w-[250px]">
          <Porte media={portrait} vu={vu} delai={0.1} sizes="(max-width: 1024px) 70vw, 420px" className="aspect-[3/4] w-full" />
          {cabinet && (
            <figure className="absolute -bottom-10 -right-3 w-[42%] max-w-[180px] lg:-right-16" style={apparait(vu, 1)}>
              <Porte media={cabinet} vu={vu} delai={0.8} chambranle="aucun" lisere sizes="180px" className="aspect-[3/4] w-full" />
              {legendeCabinet && <figcaption className="mt-3 whitespace-nowrap text-center font-[family-name:var(--ad-titre)] text-[15px] italic text-[var(--ad-pierre)]">{legendeCabinet}</figcaption>}
            </figure>
          )}
        </div>
        <div>
          {surtitre && (
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ad-pierre)] shadow-[0_1px_2px_rgba(46,66,79,0.06),0_8px_20px_-12px_rgba(46,66,79,0.25)]" style={apparait(vu, 0.1)}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
              {surtitre}
            </p>
          )}
          <h2 className="mt-6 text-[clamp(38px,4.6vw,62px)] leading-[1.04]">
            {lignes.map((l, i) => (
              <span key={i} className="block" style={apparait(vu, 0.25 + i * 0.12)}>
                {accent(l)}
              </span>
            ))}
          </h2>
          <div className="mt-6 flex max-w-[52ch] flex-col gap-4 text-[16px] leading-[1.7] text-[var(--ad-pierre)] sm:mt-8 sm:text-[17px] sm:leading-[1.8]">
            {paragraphes.map((p, i) => (
              <p key={i} style={apparait(vu, 0.5 + i * 0.12)}>
                {p.replace(/\*/g, '')}
              </p>
            ))}
          </div>
          {citation && (
            <blockquote className="relative mt-8 max-w-[52ch] rounded-[24px] bg-[var(--ad-sable)] px-6 py-6 sm:mt-10 sm:rounded-[28px] sm:px-8 sm:py-7" style={apparait(vu, 0.8)}>
              <span aria-hidden="true" className="absolute -top-6 left-6 font-[family-name:var(--ad-titre)] text-[84px] leading-none text-[var(--ad-sable-fonce)]">
                “
              </span>
              <p className="relative font-[family-name:var(--ad-titre)] text-[19px] italic leading-[1.5] text-[var(--ad-nuit)] sm:text-[21px]">{citation.replace(/\*/g, '')}</p>
            </blockquote>
          )}
          {signature && (
            <div className="mt-8 flex items-center gap-4" style={apparait(vu, 1.1)}>
              <span className="font-[family-name:var(--ad-titre)] text-[30px] italic text-[var(--ad-bleu)]">{signature}</span>
              {/* Le trait de plume, qui s'écrit. */}
              <svg aria-hidden="true" viewBox="0 0 160 24" className="h-6 w-40" fill="none">
                <path d="M2 16 C 30 4, 52 22, 80 12 S 130 6, 158 14" stroke="var(--ad-or)" strokeWidth="2" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: vu ? 0 : 1, transition: `stroke-dashoffset 1.8s ${DOUX} 1.4s` }} />
              </svg>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
