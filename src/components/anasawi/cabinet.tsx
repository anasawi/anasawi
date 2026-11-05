'use client'

import { Armchair, Coffee, Leaf, Sun } from 'lucide-react'
import Image from 'next/image'
import { useContext, useEffect, useState } from 'react'

import { accent, apparait, ARCHE, DOUX, reduit, useVu } from './accueil'
import { Edition } from './vivant'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * LE CABINET — cinq propositions, toutes dans l'esprit des deux pages
 * qu'Anne aime : la porte en arche, l'ivoire chaud, le calme. Chacune
 * tient dans un écran. Voir /moderne/cabinet pour les comparer.
 */

type Props = { photos: Media[]; titre: string; sousTitre: string; id?: string }

/** La photo qui change toute seule, toutes les `ms`, tant qu'on regarde et qu'on ne touche à rien. */
function useDiaporama(n: number, vu: boolean, ms = 6000) {
  const edition = useContext(Edition)
  const [i, setI] = useState(0)
  const [pause, setPause] = useState(false)
  useEffect(() => {
    if (!vu || pause || edition || n < 2 || reduit()) return
    const t = window.setInterval(() => setI((x) => (x + 1) % n), ms)
    return () => window.clearInterval(t)
  }, [vu, pause, edition, n, ms])
  return { i, setI, setPause }
}

/** Les photos empilées dans un cadre : la courante en fondu, avec un très lent mouvement de caméra. */
function Fondu({ photos, i, sizes }: { photos: Media[]; i: number; sizes: string }) {
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
          style={{
            opacity: k === i ? 1 : 0,
            transform: k === i ? 'scale(1)' : 'scale(1.08)',
            transition: `opacity 1.4s ease, transform ${k === i ? 7 : 1.4}s ${DOUX}`,
          }}
        />
      ))}
    </>
  )
}

function Entete({ titre, sousTitre, vu, centre = false }: { titre: string; sousTitre: string; vu: boolean; centre?: boolean }) {
  return (
    <div className={cn('mb-10 flex flex-wrap items-end gap-6 lg:mb-12', centre ? 'flex-col items-center text-center' : 'justify-between')}>
      <h2 className="text-[clamp(40px,4.8vw,68px)] leading-[1.02]" style={apparait(vu, 0.1)}>
        {accent(titre)}
      </h2>
      {sousTitre && (
        <p className="max-w-[36ch] font-[family-name:var(--ad-titre)] text-[19px] italic leading-[1.5] text-[var(--ad-pierre)]" style={apparait(vu, 0.25)}>
          {sousTitre}
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   1. LA FENÊTRE — une grande arche, une seule photo à la fois. À côté, le
   nom des coins du cabinet, comme une hôtesse qui fait visiter : on en
   survole un, la photo change en fondu.
   ══════════════════════════════════════════════════════════════════════ */

export function CabinetFenetre({ photos, titre, sousTitre, id = 'cabinet' }: Props) {
  const [ref, vu] = useVu<HTMLElement>()
  const liste = photos.slice(0, 6)
  const { i, setI, setPause } = useDiaporama(liste.length, vu)
  return (
    <section ref={ref} id={id} className="scroll-mt-24 py-20 lg:py-24">
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-[6vw] lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-12">
        <div className="max-lg:order-2" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <h2 className="text-[clamp(40px,4.8vw,68px)] leading-[1.02] max-lg:hidden" style={apparait(vu, 0.1)}>
            {accent(titre)}
          </h2>
          <p className="mt-5 max-w-[34ch] font-[family-name:var(--ad-titre)] text-[19px] italic leading-[1.5] text-[var(--ad-pierre)] max-lg:hidden" style={apparait(vu, 0.2)}>
            {sousTitre}
          </p>
          <ul className="mt-10 flex flex-col gap-1 max-lg:mt-0 max-lg:flex-row max-lg:flex-wrap max-lg:gap-x-5">
            {liste.map((p, k) => (
              <li key={p.id} style={apparait(vu, 0.3 + k * 0.08)}>
                <button
                  type="button"
                  onMouseEnter={() => setI(k)}
                  onFocus={() => setI(k)}
                  onClick={() => setI(k)}
                  className="group flex items-center gap-4 py-1.5 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="h-px bg-[var(--ad-nuit)] transition-all duration-700 max-lg:hidden"
                    style={{ width: k === i ? 36 : 12, opacity: k === i ? 1 : 0.25, transitionTimingFunction: DOUX }}
                  />
                  <span
                    className="font-[family-name:var(--ad-titre)] text-[clamp(20px,2vw,28px)] transition-colors duration-500"
                    style={{ color: k === i ? 'var(--ad-nuit)' : 'color-mix(in srgb, var(--ad-gris) 70%, transparent)' }}
                  >
                    {p.caption || p.alt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="max-lg:order-1">
          <div className="mb-8 lg:hidden">
            <h2 className="text-[clamp(40px,4.8vw,68px)] leading-[1.02]" style={apparait(vu, 0.1)}>
              {accent(titre)}
            </h2>
            <p className="mt-4 font-[family-name:var(--ad-titre)] text-[18px] italic leading-[1.5] text-[var(--ad-pierre)]">{sousTitre}</p>
          </div>
          <div className="relative mx-auto h-[min(70vh,640px)] w-full max-w-[560px] max-lg:h-[58vh]">
            <span
              aria-hidden="true"
              className="absolute inset-0 border-[1.5px] border-[var(--ad-sable-fonce)]"
              style={{ borderRadius: ARCHE, transform: vu ? 'translate(18px, 18px)' : 'none', opacity: vu ? 1 : 0, transition: `transform 1.6s ${DOUX} .8s, opacity 1s .7s` }}
            />
            <div
              className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.45)]"
              style={{ borderRadius: ARCHE, clipPath: vu ? `inset(0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`, transition: `clip-path 1.6s ${DOUX}` }}
            >
              <Fondu photos={liste} i={i} sizes="(max-width: 1024px) 90vw, 560px" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2. LE MUR DE CADRES — comme chez soi : des cadres de tailles
   différentes accrochés sur un mur sable, chacun avec son passe-partout
   ivoire et sa petite légende. Ils glissent à peine, chacun à sa vitesse,
   quand on descend la page.
   ══════════════════════════════════════════════════════════════════════ */

const MUR = [
  { l: 4, t: 8, w: 27, h: 74, r: ARCHE, v: -26 },
  { l: 35, t: 4, w: 19, h: 46, r: ARCHE, v: 14 },
  { l: 37.5, t: 60, w: 14, h: 24, r: '999px', v: -10 },
  { l: 58, t: 14, w: 20, h: 62, r: ARCHE, v: 20 },
  { l: 82, t: 6, w: 14, h: 38, r: ARCHE, v: -16 },
  { l: 82, t: 54, w: 14, h: 30, r: '18px', v: 10 },
]

export function CabinetMur({ photos, titre, sousTitre, id = 'cabinet' }: Props) {
  const [ref, vu] = useVu<HTMLElement>()
  const liste = photos.slice(0, 6)
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
    const onScroll = () => (raf ||= requestAnimationFrame(maj))
    maj()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [ref])
  return (
    <section ref={ref} id={id} className="scroll-mt-24 py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        <Entete titre={titre} sousTitre={sousTitre} vu={vu} />
        <div className="ad-mur rounded-[36px] bg-[var(--ad-sable)] px-[3%] py-10 max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-8 max-lg:px-5 max-lg:py-8 lg:relative lg:h-[min(62vh,580px)]">
          {liste.map((ph, k) => {
            const m = MUR[k]!
            return (
              <figure
                key={ph.id}
                className="group lg:absolute"
                style={
                  {
                    '--l': `${m.l}%`,
                    '--t': `${m.t}%`,
                    '--w': `${m.w}%`,
                    '--h': `${m.h}%`,
                    transform: `translateY(${p * m.v}px)`,
                  } as React.CSSProperties
                }
              >
                <div
                  className="relative aspect-[3/4] bg-[var(--ad-ivoire)] p-[7px] shadow-[0_22px_40px_-26px_rgba(46,66,79,0.55)] transition-transform duration-700 group-hover:-translate-y-1.5 lg:aspect-auto lg:h-full"
                  style={{
                    borderRadius: m.r,
                    opacity: vu ? 1 : 0,
                    transform: vu ? undefined : 'translateY(18px)',
                    transition: `opacity 1.2s ${0.2 + k * 0.12}s, transform 1.2s ${DOUX} ${0.2 + k * 0.12}s`,
                    ...(k === 2 ? { aspectRatio: '1' } : {}),
                  }}
                >
                  <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: m.r }}>
                    <Image src={ph.url} alt={ph.alt} fill sizes="(max-width: 1024px) 45vw, 340px" className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
                  </div>
                </div>
                <figcaption className="mt-2.5 text-center font-[family-name:var(--ad-titre)] text-[14px] italic text-[var(--ad-pierre)] lg:absolute lg:inset-x-0 lg:top-full">
                  {ph.caption}
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
      <style>{`@media (min-width:1024px){.ad-mur figure{left:var(--l);top:var(--t);width:var(--w);height:var(--h)}}`}</style>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3. LES DEUX BATTANTS — une porte fermée, couleur sable, ses moulures et
   sa poignée. Quand on arrive, elle s'ouvre lentement vers l'intérieur et
   l'on découvre le cabinet, qui change ensuite en fondu.
   ══════════════════════════════════════════════════════════════════════ */

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

export function CabinetBattants({ photos, titre, sousTitre, id = 'cabinet' }: Props) {
  const [ref, vu] = useVu<HTMLElement>('-25%')
  const liste = photos.slice(0, 6)
  const { i, setI, setPause } = useDiaporama(liste.length, vu, 6500)
  return (
    <section ref={ref} id={id} className="scroll-mt-24 py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        <Entete titre={titre} sousTitre={sousTitre} vu={vu} centre />
        <div className="relative mx-auto h-[min(54vh,500px)] w-full max-w-[480px]" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <span aria-hidden="true" className="absolute -inset-3 border-[1.5px] border-[var(--ad-sable-fonce)]" style={{ borderRadius: '999px 999px 28px 28px' }} />
          <div className="absolute inset-0 overflow-hidden bg-[var(--ad-nuit)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.5)]" style={{ borderRadius: ARCHE }}>
            <Fondu photos={liste} i={i} sizes="(max-width: 1024px) 90vw, 520px" />
            <Battant cote="g" ouvert={vu} />
            <Battant cote="d" ouvert={vu} />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-1 gap-y-2" style={apparait(vu, 2.4)}>
          {liste.map((p, k) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setI(k)}
              onMouseEnter={() => setI(k)}
              className="rounded-full px-3.5 py-1.5 font-[family-name:var(--ad-titre)] text-[16px] italic transition-colors duration-500"
              style={{ background: k === i ? 'var(--ad-sable)' : 'transparent', color: k === i ? 'var(--ad-nuit)' : 'var(--ad-gris)' }}
            >
              {p.caption || p.alt}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   4. BIENVENUE — la grande porte d'un côté ; de l'autre, ce qui attend
   la personne qui vient : les petites attentions, et les vignettes pour
   regarder chaque coin. Plus chaleureux, plus « on vous reçoit ».
   ══════════════════════════════════════════════════════════════════════ */

const ATTENTIONS = [
  { Icone: Coffee, texte: 'Un thé ou un café vous attend' },
  { Icone: Armchair, texte: 'Un fauteuil confortable, à votre rythme' },
  { Icone: Sun, texte: 'Une pièce lumineuse et calme' },
  { Icone: Leaf, texte: 'Le jardin, juste à côté' },
]

export function CabinetBienvenue({ photos, titre, sousTitre, id = 'cabinet' }: Props) {
  const [ref, vu] = useVu<HTMLElement>()
  const liste = photos.slice(0, 6)
  const { i, setI, setPause } = useDiaporama(liste.length, vu)
  return (
    <section ref={ref} id={id} className="scroll-mt-24 py-20 lg:py-24">
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-[6vw] lg:grid-cols-[1fr_1fr] lg:gap-20 lg:px-12">
        <div className="relative h-[min(68vh,620px)] w-full max-w-[500px] max-lg:mx-auto max-lg:h-[54vh]">
          <span aria-hidden="true" className="absolute inset-0 border-[1.5px] border-[var(--ad-sable-fonce)]" style={{ borderRadius: ARCHE, transform: vu ? 'translate(-16px, 16px)' : 'none', transition: `transform 1.6s ${DOUX} .8s` }} />
          <div className="absolute inset-0 overflow-hidden bg-[var(--ad-sable)] shadow-[0_30px_60px_-34px_rgba(46,66,79,0.45)]" style={{ borderRadius: ARCHE, clipPath: vu ? `inset(0 round ${ARCHE})` : `inset(100% 0 0 0 round ${ARCHE})`, transition: `clip-path 1.6s ${DOUX}` }}>
            <Fondu photos={liste} i={i} sizes="(max-width: 1024px) 90vw, 500px" />
          </div>
          <p key={liste[i]?.id} className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 font-[family-name:var(--ad-titre)] text-[15px] italic text-[var(--ad-nuit)] shadow-[0_14px_30px_-16px_rgba(46,66,79,0.45)] motion-safe:animate-[ad-legende_.8s_ease-out_backwards]">
            {liste[i]?.caption}
          </p>
        </div>
        <div onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <h2 className="text-[clamp(40px,4.8vw,68px)] leading-[1.02]" style={apparait(vu, 0.1)}>
            {accent(titre)}
          </h2>
          <p className="mt-5 max-w-[38ch] font-[family-name:var(--ad-titre)] text-[19px] italic leading-[1.5] text-[var(--ad-pierre)]" style={apparait(vu, 0.2)}>
            {sousTitre}
          </p>
          <ul className="mt-9 grid gap-3.5 sm:grid-cols-2">
            {ATTENTIONS.map(({ Icone, texte }, k) => (
              <li key={texte} className="flex items-center gap-3.5 text-[15.5px] leading-[1.4] text-[var(--ad-pierre)]" style={apparait(vu, 0.35 + k * 0.1)}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ad-sable)] text-[var(--ad-nuit)]">
                  <Icone className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                {texte}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex gap-3" style={apparait(vu, 0.8)}>
            {liste.map((p, k) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setI(k)}
                onMouseEnter={() => setI(k)}
                aria-label={p.caption || p.alt}
                className="relative h-[76px] w-[56px] overflow-hidden transition-all duration-500"
                style={{ borderRadius: ARCHE, opacity: k === i ? 1 : 0.55, transform: k === i ? 'translateY(-4px)' : 'none', outline: k === i ? '1.5px solid var(--ad-sable-fonce)' : 'none', outlineOffset: 3 }}
              >
                <Image src={p.url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   5. LA PROMENADE LENTE — une rangée de portes qui glisse sans fin, très
   lentement, comme quand on marche dans un couloir. Elle s'arrête dès
   qu'on pose la souris dessus.
   ══════════════════════════════════════════════════════════════════════ */

export function CabinetDefile({ photos, titre, sousTitre, id = 'cabinet' }: Props) {
  const [ref, vu] = useVu<HTMLElement>()
  const liste = photos.slice(0, 8)
  const tour = [...liste, ...liste]
  return (
    <section ref={ref} id={id} className="scroll-mt-24 overflow-hidden py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        <Entete titre={titre} sousTitre={sousTitre} vu={vu} />
      </div>
      <div className="group" style={{ opacity: vu ? 1 : 0, transition: 'opacity 1.4s .3s' }}>
        <ul className="flex w-max gap-5 pl-5 motion-safe:animate-[ad-defiler_90s_linear_infinite] group-hover:[animation-play-state:paused] lg:gap-7 lg:pl-7">
          {tour.map((p, k) => (
            <li key={k} aria-hidden={k >= liste.length} className="shrink-0">
              <div
                className="relative overflow-hidden bg-[var(--ad-sable)] shadow-[0_26px_50px_-32px_rgba(46,66,79,0.45)]"
                style={{ borderRadius: ARCHE, height: 'min(52vh, 480px)', width: k % 2 ? 'min(26vh, 240px)' : 'min(36vh, 330px)', marginTop: k % 2 ? 40 : 0 }}
              >
                <Image src={p.url} alt={k < liste.length ? p.alt : ''} fill sizes="330px" className="object-cover transition-transform duration-[1400ms] hover:scale-[1.05]" />
              </div>
              <p className="mt-3 text-center font-[family-name:var(--ad-titre)] text-[15px] italic text-[var(--ad-pierre)]">{p.caption}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
