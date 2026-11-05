'use client'

import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useState } from 'react'

import { apparait, ARCHE, DOUX, reduit, useVu } from '../accueil'
import { Edition, Lignes, Revele } from '../vivant'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * LE SOCLE DES MODÈLES MODERNES — les pièces communes à tous les modèles
 * de la bibliothèque, pour qu'ils parlent la même langue que le site :
 * la porte en arche et son chambranle sable, l'ivoire chaud, un titre en
 * deux tons (le mot clé entre *astérisques*), des apparitions lentes. Un
 * seul petit mouvement par section, aucune lueur. Chaque section tient
 * dans un écran (100vh au plus).
 */

export { apparait, ARCHE, DOUX, reduit, useVu, Revele }

export const CONTENEUR = 'mx-auto w-full max-w-[1240px] px-[6vw] lg:px-12'
export const TITRE = 'text-[clamp(38px,4.6vw,62px)] leading-[1.04]'
export const TEXTE = 'text-[16.5px] leading-[1.75] text-[var(--ad-pierre)]'
export const ITALIQUE = 'font-[family-name:var(--ad-titre)] italic'
export const CARTE = 'rounded-[28px] bg-white shadow-[0_1px_2px_rgba(46,66,79,0.05),0_20px_50px_-30px_rgba(46,66,79,0.25)]'

/** « Ce que je vous / *propose* » : une ligne par retour, le mot clé en accent. */
export function accentue(texte: string) {
  return texte.split('*').map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
}
export const lignesDe = (texte: string) => texte.split('\n').filter((l) => l.trim()).map((l, i) => <span key={i}>{accentue(l)}</span>)
export const paragraphes = (texte: string) => texte.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean)
export const sansEtoiles = (s: string) => s.replace(/\*/g, '')

export function Section({ id, children, className, serre = false }: { id?: string; children: React.ReactNode; className?: string; serre?: boolean }) {
  return (
    <section id={id || undefined} className={cn('relative scroll-mt-24', serre ? 'py-16 md:py-20' : 'py-20 md:py-24', className)}>
      {children}
    </section>
  )
}

export function Etiquette({ children, clair = false, className }: { children: React.ReactNode; clair?: boolean; className?: string }) {
  if (!children) return null
  return (
    <p
      className={cn(
        'mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold',
        clair ? 'bg-white/15 text-white backdrop-blur' : 'bg-white text-[var(--ad-pierre)] shadow-[0_1px_2px_rgba(46,66,79,0.06),0_4px_14px_-6px_rgba(46,66,79,0.12)]',
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
      {children}
    </p>
  )
}

/** Le titre d'une section : ses lignes sortent l'une après l'autre de leur masque. */
export function Titre({ texte, niveau = 2, className, delai = 0 }: { texte: string; niveau?: 1 | 2 | 3; className?: string; delai?: number }) {
  if (!texte?.trim()) return null
  const Balise = niveau === 1 ? 'h1' : niveau === 3 ? 'h3' : 'h2'
  /* Un titre long (une phrase entière) se fait plus petit, pour rester élégant. */
  const n = sansEtoiles(texte).length
  const taille = n > 70 ? 'text-[clamp(28px,2.9vw,40px)] leading-[1.15]' : n > 40 ? 'text-[clamp(32px,3.6vw,50px)] leading-[1.1]' : TITRE
  return (
    <Balise className={cn(niveau === 2 && taille, className)}>
      <Lignes lignes={lignesDe(texte)} delai={delai} />
    </Balise>
  )
}

/** En-tête de section : étiquette, titre et — à droite ou dessous — un texte court. */
export function Entete({
  etiquette,
  titre,
  texte,
  centre = false,
  className,
}: {
  etiquette?: string
  titre: string
  texte?: string
  centre?: boolean
  className?: string
}) {
  return (
    <div className={cn('mb-10 flex flex-wrap gap-x-10 gap-y-5 md:mb-12', centre ? 'flex-col items-center text-center' : 'items-end justify-between', className)}>
      <div className={cn(centre && 'flex flex-col items-center')}>
        <Etiquette>{etiquette}</Etiquette>
        <Titre texte={titre} />
      </div>
      {texte?.trim() && (
        <Revele delai={0.2}>
          <p className={cn('max-w-[40ch] text-[15.5px] leading-[1.7] text-[var(--ad-pierre)]', centre && 'mx-auto')}>{texte}</p>
        </Revele>
      )}
    </div>
  )
}

export function Bouton({ href, children, clair = false, discret = false, className }: { href: string; children: React.ReactNode; clair?: boolean; discret?: boolean; className?: string }) {
  if (!children) return null
  if (discret)
    return (
      <a href={href} className={cn('group inline-flex items-center gap-1.5 py-2 text-[15px] font-semibold text-[var(--ad-nuit)] [&_svg]:text-[var(--ad-accent)]', className)}>
        <span className="bg-[linear-gradient(var(--ad-accent),var(--ad-accent))] bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_2px]">{children}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>
    )
  return (
    <a
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full py-2 pl-6 pr-2 text-[15px] font-semibold shadow-[0_16px_32px_-18px_rgba(46,66,79,0.8)] transition-[transform,background-color] duration-500 hover:-translate-y-0.5',
        clair ? 'bg-white text-[var(--ad-nuit)]' : 'bg-[var(--ad-nuit)] text-white hover:bg-[var(--ad-accent)]',
        className,
      )}
    >
      {children}
      <span className={cn('grid h-9 w-9 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-45', clair ? 'bg-[var(--ad-accent)] text-white' : 'bg-white/15')}>
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </a>
  )
}

/**
 * LA PORTE EN ARCHE — une photo dans une arche qui s'ouvre de bas en
 * haut à l'arrivée, son chambranle sable décalé. `forme` : arche (par
 * défaut), rond (médaillon) ou doux (rectangle aux coins arrondis).
 */
export function Arche({
  media,
  className,
  sizes = '(max-width: 1024px) 90vw, 560px',
  delai = 0,
  chambranle = 'droite',
  forme = 'arche',
  lente = false,
  priorite = false,
  enfant,
}: {
  media: Media | null | undefined
  className?: string
  sizes?: string
  delai?: number
  chambranle?: 'droite' | 'gauche' | 'aucun'
  forme?: 'arche' | 'rond' | 'doux'
  lente?: boolean
  priorite?: boolean
  enfant?: React.ReactNode
}) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const rayon = forme === 'rond' ? '999px' : forme === 'doux' ? '28px' : ARCHE
  const dx = chambranle === 'gauche' ? -14 : 14
  return (
    <div ref={ref} className={cn('relative', className)}>
      {chambranle !== 'aucun' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 border-[1.5px] border-[var(--ad-accent-trait)]"
          style={{ borderRadius: rayon, transform: vu ? `translate(${dx}px, 14px)` : 'none', opacity: vu ? 1 : 0, transition: `transform 1.6s ${DOUX} ${delai + 0.7}s, opacity 1s ${delai + 0.6}s` }}
        />
      )}
      <div
        className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.45)]"
        style={{ borderRadius: rayon, clipPath: vu ? `inset(0 round ${rayon})` : `inset(100% 0 0 0 round ${rayon})`, transition: `clip-path 1.6s ${DOUX} ${delai}s` }}
      >
        {media && (
          <Image
            src={media.url}
            alt={media.alt}
            fill
            sizes={sizes}
            priority={priorite}
            className={cn('object-cover', lente && 'motion-safe:animate-[ad-kenburns_14s_ease-out_both]')}
          />
        )}
        {enfant}
      </div>
    </div>
  )
}

/** La photo qui change toute seule, toutes les `ms`, tant qu'on regarde et qu'on ne touche à rien. */
export function useDiaporama(n: number, vu: boolean, ms = 6000) {
  const edition = useContext(Edition)
  const [i, setI] = useState(0)
  const [pause, setPause] = useState(false)
  useEffect(() => {
    if (!vu || pause || edition || n < 2 || reduit()) return
    const t = window.setInterval(() => setI((x) => (x + 1) % n), ms)
    return () => window.clearInterval(t)
  }, [vu, pause, edition, n, ms])
  return { i: n ? i % n : 0, setI, setPause }
}

/** Les photos empilées : la courante en fondu, avec un très lent mouvement de caméra. */
export function Fondu({ photos, i, sizes }: { photos: Media[]; i: number; sizes: string }) {
  return (
    <>
      {photos.map((p, k) => (
        <Image
          key={p.id}
          src={p.url}
          alt={p.alt}
          fill
          sizes={sizes}
          className="object-cover"
          style={{ opacity: k === i ? 1 : 0, transform: k === i ? 'scale(1)' : 'scale(1.08)', transition: `opacity 1.4s ease, transform ${k === i ? 7 : 1.4}s ${DOUX}` }}
        />
      ))}
    </>
  )
}

/** Un élément qui apparaît (fondu + légère montée) quand `vu` passe à vrai. */
export function Parait({ vu, delai = 0, className, children, as: Balise = 'div' }: { vu: boolean; delai?: number; className?: string; children: React.ReactNode; as?: 'div' | 'li' | 'p' | 'span' }) {
  return (
    <Balise className={className} style={apparait(vu, delai)}>
      {children}
    </Balise>
  )
}

/** Une vidéo du cabinet (en boucle, muette) — ou, à défaut, une photo. */
export function Video({ video, photo, className }: { video: Media | null; photo: Media | null; className?: string }) {
  if (video && video.mimeType?.startsWith('video'))
    return <video src={video.url} className={cn('h-full w-full object-cover', className)} autoPlay muted loop playsInline aria-label={video.alt} />
  return photo ? <Image src={photo.url} alt={photo.alt} fill sizes="(max-width: 1024px) 90vw, 1100px" className={cn('object-cover motion-safe:animate-[ad-kenburns_16s_ease-out_both]', className)} /> : null
}
