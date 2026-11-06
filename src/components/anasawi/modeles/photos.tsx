'use client'

import { Armchair, Coffee, Leaf, type LucideIcon, Sun } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { accentue, apparait, ARCHE, Arche, CONTENEUR, DOUX, Entete, Etiquette, Fondu, ITALIQUE, reduit, Section, TEXTE, Titre, useDiaporama, useVu, Video } from './socle'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/* PHOTOS & VIDÉOS — dix façons de montrer le cabinet. */

type Base = { etiquette: string; titre: string; texte: string; photos: Media[]; id?: string }

/* ── 1. Le lieu en trois portes : trois arches de hauteurs différentes, leur légende dessous. */
export function PhotosLieu({ etiquette, titre, texte, photos, id }: Base) {
  const [a, b, c] = photos
  const hauteurs = ['h-[min(40vh,370px)]', 'h-[min(50vh,460px)]', 'h-[min(35vh,330px)]']
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <div className="grid grid-cols-3 items-end gap-3 md:gap-8">
          {[a, b, c].map((p, i) => (
            <figure key={i}>
              <Arche media={p ?? null} delai={i * 0.2} chambranle={i === 1 ? 'droite' : 'aucun'} sizes="400px" className={cn(hauteurs[i], 'max-md:h-[34vh]')} />
              {p?.caption && <figcaption className={cn(ITALIQUE, 'mt-3 text-center text-[15px] text-[var(--ad-pierre)]')}>{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ── 2. Le mur de cadres : comme chez soi, des cadres de tailles différentes sur un mur sable. */
const MUR = [
  { l: 4, t: 8, w: 27, h: 74, r: ARCHE, v: -26 },
  { l: 35, t: 4, w: 19, h: 46, r: ARCHE, v: 14 },
  { l: 37.5, t: 60, w: 14, h: 24, r: '999px', v: -10 },
  { l: 58, t: 14, w: 20, h: 62, r: ARCHE, v: 20 },
  { l: 82, t: 6, w: 14, h: 38, r: ARCHE, v: -16 },
  { l: 82, t: 54, w: 14, h: 30, r: '18px', v: 10 },
]

export function PhotosMur({ etiquette, titre, texte, photos, id }: Base) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const [p, setP] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || reduit()) return
    let raf = 0
    const maj = () => {
      const r = el.getBoundingClientRect()
      setP(Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)))
      raf = 0
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(maj)
    }
    maj()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [ref])
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <div ref={ref} className="ad-mur rounded-[36px] bg-[var(--ad-sable)] px-[3%] py-10 max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-8 max-lg:px-5 max-lg:py-8 lg:relative lg:h-[min(52vh,490px)]">
          {photos.slice(0, 6).map((ph, k) => {
            const m = MUR[k]!
            return (
              <figure key={ph.id} className="group lg:absolute" style={{ '--l': `${m.l}%`, '--t': `${m.t}%`, '--w': `${m.w}%`, '--h': `${m.h}%`, transform: `translateY(${p * m.v}px)` } as React.CSSProperties}>
                <div
                  className="relative aspect-[3/4] bg-[var(--ad-ivoire)] p-[7px] shadow-[0_22px_40px_-26px_rgba(46,66,79,0.55)] transition-transform duration-700 ease-[var(--ad-ease)] group-hover:-translate-y-1.5 lg:aspect-auto lg:h-full"
                  style={{ borderRadius: m.r, opacity: vu ? 1 : 0, transition: `opacity 1.2s ${0.2 + k * 0.12}s, transform .7s ${DOUX}, translate .7s ${DOUX}`, ...(k === 2 ? { aspectRatio: '1' } : {}) }}
                >
                  <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: m.r }}>
                    <Image src={ph.url} alt={ph.alt} fill sizes="(max-width: 1024px) 45vw, 340px" className="object-cover transition-transform duration-[1400ms] ease-[var(--ad-ease)] group-hover:scale-[1.05]" />
                  </div>
                </div>
                {ph.caption && <figcaption className={cn(ITALIQUE, 'mt-2.5 text-center text-[14px] text-[var(--ad-pierre)] lg:absolute lg:inset-x-0 lg:top-full')}>{ph.caption}</figcaption>}
              </figure>
            )
          })}
        </div>
      </div>
      <style>{`@media (min-width:1024px){.ad-mur figure{left:var(--l);top:var(--t);width:var(--w);height:var(--h)}}`}</style>
    </Section>
  )
}

/* ── 3. Mosaïque : cinq photos, une grande porte et quatre cadres doux, qui apparaissent en cascade. */
export function PhotosMosaique({ etiquette, titre, texte, photos, id }: Base) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const cases = ['row-span-2', '', '', '', '']
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <div ref={ref} className="grid h-[min(54vh,500px)] grid-cols-2 grid-rows-2 gap-3 md:grid-cols-[1.3fr_1fr_1fr] md:gap-4 max-md:h-[70vh] max-md:grid-rows-3">
          {photos.slice(0, 5).map((p, i) => (
            <div
              key={p.id}
              className={cn('group relative overflow-hidden bg-[var(--ad-sable)]', cases[i], i === 0 && 'max-md:col-span-2 max-md:row-span-1', i > 2 && 'max-md:hidden')}
              style={{ borderRadius: i === 0 ? ARCHE : '24px', clipPath: vu ? `inset(0 round ${i === 0 ? ARCHE : '24px'})` : `inset(100% 0 0 0 round ${i === 0 ? ARCHE : '24px'})`, transition: `clip-path 1.4s ${DOUX} ${i * 0.14}s` }}
            >
              <Image src={p.url} alt={p.alt} fill sizes="(max-width: 768px) 50vw, 400px" className="object-cover transition-transform duration-[1400ms] ease-[var(--ad-ease)] group-hover:scale-[1.05]" />
              {p.caption && <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[12.5px] font-semibold text-[var(--ad-nuit)] opacity-0 transition-opacity duration-500 ease-[var(--ad-ease)] group-hover:opacity-100">{p.caption}</span>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ── 4. Pleine page : une seule photo, large, sous une arche ample, qui avance à peine. */
export function PhotosPleine({ etiquette, titre, legende, photo, id }: { etiquette: string; titre: string; legende: string; photo: Media | null; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        {titre && <Entete etiquette={etiquette} titre={titre} centre />}
        <div
          ref={ref}
          className="relative h-[min(68vh,640px)] overflow-hidden bg-[var(--ad-sable)] max-md:h-[50vh]"
          style={{ borderRadius: '999px 999px 32px 32px / 560px 560px 32px 32px', clipPath: vu ? 'inset(0)' : 'inset(100% 0 0 0)', transition: `clip-path 1.8s ${DOUX}` }}
        >
          {photo && <Image src={photo.url} alt={photo.alt} fill sizes="100vw" className="object-cover motion-safe:animate-[ad-kenburns_18s_ease-out_both]" />}
          {legende && <p className={cn(ITALIQUE, 'absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-5 py-2 text-[15px] text-[var(--ad-nuit)]')}>{legende}</p>}
        </div>
      </div>
    </Section>
  )
}

/* ── 5. Image et légende : la porte à gauche, ce qu'on y voit raconté à droite. */
export function PhotosLegende({ etiquette, titre, texte, photo, id, inverse }: { etiquette: string; titre: string; texte: string; photo: Media | null; id?: string; inverse?: boolean }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20')}>
        <Arche media={photo} lente chambranle={inverse ? 'droite' : 'gauche'} className={cn('mx-auto h-[min(66vh,600px)] w-full max-w-[460px] max-lg:h-[50vh]', inverse && 'lg:order-2')} />
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          <p className={cn(TEXTE, 'mt-6 max-w-[48ch]')} style={apparait(vu, 0.4)}>
            {accentue(texte)}
          </p>
          {photo?.caption && (
            <p className={cn(ITALIQUE, 'mt-8 flex items-center gap-3 text-[16px] text-[var(--ad-gris)]')} style={apparait(vu, 0.6)}>
              <span aria-hidden="true" className="h-px w-8 bg-[var(--ad-touche)]" />
              {photo.caption}
            </p>
          )}
        </div>
      </div>
    </Section>
  )
}

/* ── 6. Vidéo cinéma : un grand cadre doux, la vidéo du cabinet en boucle, sans le son. */
export function VideoCinema({ etiquette, titre, legende, video, photo, id }: { etiquette: string; titre: string; legende: string; video: Media | null; photo: Media | null; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id} serre>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} />
        <div ref={ref} className="relative aspect-[21/9] max-h-[54vh] w-full overflow-hidden rounded-[32px] bg-[var(--ad-sable)] max-md:aspect-[4/3]" style={{ clipPath: vu ? 'inset(0 round 32px)' : 'inset(8% 8% 8% 8% round 32px)', transition: `clip-path 1.6s ${DOUX}` }}>
          <Video video={video} photo={photo} />
        </div>
        {legende && <p className={cn(ITALIQUE, 'mt-4 text-center text-[16px] text-[var(--ad-pierre)]')}>{legende}</p>}
      </div>
    </Section>
  )
}

/* ── 7. Vidéo en arche : la vidéo dans une porte, un texte à côté. */
export function VideoArche({ etiquette, titre, texte, video, photo, id }: { etiquette: string; titre: string; texte: string; video: Media | null; photo: Media | null; id?: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          <p className={cn(TEXTE, 'mt-6 max-w-[46ch]')} style={apparait(vu, 0.4)}>
            {accentue(texte)}
          </p>
        </div>
        <div className="relative mx-auto h-[min(66vh,600px)] w-full max-w-[440px] max-lg:h-[52vh]">
          <span aria-hidden="true" className="absolute inset-0 border-[1.5px] border-[var(--ad-accent-trait)]" style={{ borderRadius: ARCHE, transform: vu ? 'translate(14px, 14px)' : 'none', transition: `transform 1.6s ${DOUX} .7s` }} />
          <div className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)]" style={{ borderRadius: ARCHE, clipPath: vu ? `inset(0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`, transition: `clip-path 1.6s ${DOUX}` }}>
            <Video video={video} photo={photo} />
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 8. La fenêtre : une grande arche, une photo à la fois ; à côté, le nom de chaque coin. */
export function PhotosFenetre({ etiquette, titre, texte, photos, id }: Base) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const liste = photos.slice(0, 6)
  const { i, setI, setPause } = useDiaporama(liste.length, vu)
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20')}>
        <div onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && <p className={cn(ITALIQUE, 'mt-5 max-w-[34ch] text-[19px] leading-[1.5] text-[var(--ad-pierre)]')}>{texte}</p>}
          <ul className="mt-8 flex flex-col gap-0.5 max-lg:flex-row max-lg:flex-wrap max-lg:gap-x-5">
            {liste.map((p, k) => (
              <li key={p.id} style={apparait(vu, 0.3 + k * 0.08)}>
                <button type="button" onMouseEnter={() => setI(k)} onFocus={() => setI(k)} onClick={() => setI(k)} className="flex items-center gap-4 py-1.5 text-left">
                  <span aria-hidden="true" className="h-px bg-[var(--ad-touche)] transition-all duration-700 ease-[var(--ad-ease)] max-lg:hidden" style={{ width: k === i ? 36 : 12, opacity: k === i ? 1 : 0.25, background: 'var(--ad-touche)' }} />
                  <span className="font-[family-name:var(--ad-titre)] text-[clamp(20px,2vw,28px)] transition-colors duration-500 ease-[var(--ad-ease)]" style={{ color: k === i ? 'var(--ad-nuit)' : 'color-mix(in srgb, var(--ad-gris) 70%, transparent)' }}>
                    {p.caption || p.alt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto h-[min(68vh,620px)] w-full max-w-[540px] max-lg:order-first max-lg:h-[54vh]">
          <span aria-hidden="true" className="absolute inset-0 border-[1.5px] border-[var(--ad-accent-trait)]" style={{ borderRadius: ARCHE, transform: vu ? 'translate(18px, 18px)' : 'none', opacity: vu ? 1 : 0, transition: `transform 1.6s ${DOUX} .8s, opacity 1s .7s` }} />
          <div className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.45)]" style={{ borderRadius: ARCHE, clipPath: vu ? `inset(0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`, transition: `clip-path 1.6s ${DOUX}` }}>
            <Fondu photos={liste} i={i} sizes="(max-width: 1024px) 90vw, 540px" />
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ── 9. Les deux battants : une porte fermée qui s'ouvre lentement, et le cabinet derrière. */
function Battant({ cote, ouvert }: { cote: 'g' | 'd'; ouvert: boolean }) {
  const g = cote === 'g'
  return (
    <div
      aria-hidden="true"
      className={cn('absolute inset-y-0 w-1/2 bg-[#ead9c2]', g ? 'left-0' : 'right-0')}
      style={{
        transformOrigin: g ? 'left center' : 'right center',
        transform: ouvert ? `perspective(1400px) rotateY(${g ? -104 : 104}deg)` : 'perspective(1400px) rotateY(0deg)',
        transition: `transform 2.6s ${DOUX} .5s`,
        boxShadow: g ? 'inset -1px 0 0 rgba(87,77,69,.18)' : 'inset 1px 0 0 rgba(87,77,69,.18)',
      }}
    >
      <span className={cn('absolute top-[16%] h-[34%] border-[1.5px] border-[#d8c3a5]', g ? 'left-[18%] right-[12%]' : 'left-[12%] right-[18%]')} style={{ borderRadius: g ? '999px 0 10px 10px' : '0 999px 10px 10px' }} />
      <span className={cn('absolute bottom-[8%] top-[56%] rounded-[10px] border-[1.5px] border-[#d8c3a5]', g ? 'left-[18%] right-[12%]' : 'left-[12%] right-[18%]')} />
      <span className={cn('absolute top-[53%] h-3.5 w-3.5 rounded-full bg-[#c9a77c] shadow-[0_2px_4px_rgba(87,77,69,.35)]', g ? 'right-[5%]' : 'left-[5%]')} />
    </div>
  )
}

export function PhotosBattants({ etiquette, titre, texte, photos, id }: Base) {
  const [ref, vu] = useVu<HTMLDivElement>('-25%')
  const liste = photos.slice(0, 6)
  const { i, setI, setPause } = useDiaporama(liste.length, vu, 6500)
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} centre />
        <div ref={ref} className="relative mx-auto h-[min(46vh,430px)] w-full max-w-[420px]" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <span aria-hidden="true" className="absolute -inset-3 border-[1.5px] border-[var(--ad-accent-trait)]" style={{ borderRadius: '999px 999px 28px 28px' }} />
          <div className="absolute inset-0 overflow-hidden bg-[var(--ad-nuit)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.5)]" style={{ borderRadius: ARCHE }}>
            <Fondu photos={liste} i={i} sizes="(max-width: 1024px) 90vw, 460px" />
            <Battant cote="g" ouvert={vu} />
            <Battant cote="d" ouvert={vu} />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-1 gap-y-2" style={apparait(vu, 2.4)}>
          {liste.map((p, k) => (
            <button key={p.id} type="button" onClick={() => setI(k)} onMouseEnter={() => setI(k)} className={cn(ITALIQUE, 'rounded-full px-3.5 py-1.5 text-[16px] transition-colors duration-500 ease-[var(--ad-ease)]')} style={{ background: k === i ? 'var(--ad-sable)' : 'transparent', color: k === i ? 'var(--ad-nuit)' : 'var(--ad-gris)' }}>
              {p.caption || p.alt}
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ── 10. Bienvenue : la porte d'un côté ; de l'autre, les petites attentions et une vignette par coin. */
const ICONES: LucideIcon[] = [Coffee, Armchair, Sun, Leaf]

export function PhotosBienvenue({ etiquette, titre, texte, photos, attentions, id }: Base & { attentions: string[] }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const liste = photos.slice(0, 6)
  const { i, setI, setPause } = useDiaporama(liste.length, vu)
  return (
    <Section id={id}>
      <div ref={ref} className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20')}>
        <div className="relative mx-auto h-[min(66vh,600px)] w-full max-w-[480px] max-lg:h-[50vh]">
          <span aria-hidden="true" className="absolute inset-0 border-[1.5px] border-[var(--ad-accent-trait)]" style={{ borderRadius: ARCHE, transform: vu ? 'translate(-16px, 16px)' : 'none', transition: `transform 1.6s ${DOUX} .8s` }} />
          <div className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.45)]" style={{ borderRadius: ARCHE, clipPath: vu ? `inset(0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`, transition: `clip-path 1.6s ${DOUX}` }}>
            <Fondu photos={liste} i={i} sizes="(max-width: 1024px) 90vw, 480px" />
          </div>
          {liste[i]?.caption && (
            <p key={liste[i]!.id} className={cn(ITALIQUE, 'absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-[15px] text-[var(--ad-nuit)] shadow-[0_14px_30px_-16px_rgba(46,66,79,0.45)] motion-safe:animate-[ad-legende_.8s_ease-out_backwards]')}>
              {liste[i]!.caption}
            </p>
          )}
        </div>
        <div onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && <p className={cn(ITALIQUE, 'mt-5 max-w-[38ch] text-[19px] leading-[1.5] text-[var(--ad-pierre)]')}>{texte}</p>}
          <ul className="mt-8 grid gap-3.5 sm:grid-cols-2">
            {attentions.slice(0, 4).map((a, k) => {
              const Icone = ICONES[k % ICONES.length]!
              return (
                <li key={a} className="flex items-center gap-3.5 text-[15px] leading-[1.4] text-[var(--ad-pierre)]" style={apparait(vu, 0.35 + k * 0.1)}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ad-touche-pale)] text-[var(--ad-touche-fonce)]">
                    <Icone className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  {a}
                </li>
              )
            })}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3" style={apparait(vu, 0.8)}>
            {liste.map((p, k) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setI(k)}
                onMouseEnter={() => setI(k)}
                aria-label={p.caption || p.alt}
                className="relative h-[72px] w-[54px] overflow-hidden transition-all duration-500 ease-[var(--ad-ease)]"
                style={{ borderRadius: ARCHE, opacity: k === i ? 1 : 0.55, transform: k === i ? 'translateY(-4px)' : 'none', outline: k === i ? '1.5px solid var(--ad-accent-trait)' : 'none', outlineOffset: 3 }}
              >
                <Image src={p.url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
