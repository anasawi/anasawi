'use client'

import { ArrowLeft, ArrowRight, Check, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Monitor, Sofa, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

import { teinte, TEINTES, useCadence, useVu } from './exception'
import { Aimant, Lueur, useAvancement } from './vivant'
import { cn } from '@/lib/utils'
import type { FaqItem, OpeningHour, ServiceWithMedia } from '@/server/db/schema'

/**
 * LE LABORATOIRE D'IMAGINATION — dix modèles qui inventent quelque chose,
 * chacun une petite expérience propre au métier d'Anne : respirer avec le
 * site, dire sa météo intérieure, empiler des galets, tirer un mot doux,
 * regarder pousser un jardin, voir le ciel tel qu'il est à Cesson-Sévigné,
 * faire des ricochets, ouvrir une lettre, préparer un rendez-vous, feuilleter
 * un nuancier. Même langage que les modèles d'exception (blocs droits, six
 * teintes, animations simples) — vitrine : /moderne/imagination.
 */

const propre = (t: string) => t.replace(/\*/g, '')
const OMBRE = 'shadow-[0_1px_2px_rgba(46,66,79,0.06),0_18px_40px_-24px_rgba(46,66,79,0.35)]'
const DOUX = 'cubic-bezier(0.22,1,0.36,1)'

/* ══════════════════════════════════════════════════════════════════════
   1. LA RESPIRATION — un grand cercle qui inspire et expire avec vous
   (4 s, 4 s), la couleur qui passe du lagon à la lavande, et un compteur
   discret : « Vous avez respiré 3 fois avec nous. »
   ══════════════════════════════════════════════════════════════════════ */

export function Respiration() {
  const [ref, vu] = useVu<HTMLDivElement>('0%')
  const [temps, setTemps] = useState(0)
  useCadence(vu, 4000, () => setTemps((x) => x + 1))
  const inspire = temps % 2 === 0
  const souffles = Math.floor(temps / 2)
  const t = teinte(inspire ? 0 : 4)
  return (
    <div ref={ref} className="relative isolate grid place-items-center overflow-hidden rounded-[40px] py-[clamp(56px,8vw,96px)] transition-colors duration-[4000ms]" style={{ background: inspire ? TEINTES[0].fond : TEINTES[4].fond }}>
      <Lueur couleur="rgba(255,255,255,0.55)" taille={600} />
      <div className="relative grid aspect-square w-[min(360px,70vw)] place-items-center">
        {[0, 1, 2].map((k) => (
          <span
            key={k}
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 opacity-40"
            style={{ borderColor: t.encre, transform: `scale(${inspire ? 1 - k * 0.12 : 0.62 - k * 0.06})`, transition: `transform 4s cubic-bezier(0.45,0,0.55,1) ${k * 0.15}s, border-color 4s` }}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute inset-[14%] rounded-full shadow-[0_30px_60px_-30px_rgba(46,66,79,0.5)]"
          style={{ background: 'white', transform: `scale(${inspire ? 1 : 0.6})`, transition: 'transform 4s cubic-bezier(0.45,0,0.55,1)' }}
        />
        <p key={temps} className="relative font-[family-name:var(--ad-titre)] text-[clamp(30px,4vw,48px)] italic motion-safe:animate-[ad-tuile_1s_ease-out_backwards]" style={{ color: t.encre }} aria-live="polite">
          {inspire ? 'Inspirez…' : 'Expirez…'}
        </p>
      </div>
      <p className="relative mt-8 text-[15px] font-semibold" style={{ color: t.encre, transition: 'color 4s' }}>
        {souffles === 0 ? 'Suivez le cercle, à votre rythme.' : `Vous avez respiré ${souffles} fois avec nous.`}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2. LA MÉTÉO INTÉRIEURE — « Comment ça va, aujourd'hui ? » On choisit
   un temps ; le bloc prend sa couleur, son ciel s'anime (soleil qui
   tourne, pluie qui tombe, éclair…), un mot doux et une piste.
   ══════════════════════════════════════════════════════════════════════ */

const METEOS = [
  { nom: 'Soleil', Icone: Sun, teinte: 1, mot: 'Belle journée ! C’est aussi le bon moment pour prendre soin de ce qui va bien.' },
  { nom: 'Éclaircies', Icone: CloudSun, teinte: 0, mot: 'Ça va, ça vient. C’est souvent le bon moment pour faire le point.' },
  { nom: 'Nuageux', Icone: Cloud, teinte: 5, mot: 'Un peu gris ? Mettre des mots dessus, c’est déjà s’alléger.' },
  { nom: 'Pluie', Icone: CloudRain, teinte: 4, mot: 'Les jours de pluie existent. Vous n’avez pas à les traverser seul·e.' },
  { nom: 'Orage', Icone: CloudLightning, teinte: 3, mot: 'Quand tout s’agite, un espace calme et confidentiel peut faire du bien.' },
  { nom: 'Brouillard', Icone: CloudFog, teinte: 2, mot: 'On n’y voit pas clair ? On peut avancer à deux, pas à pas.' },
] as const

export function Meteo({ rdv }: { rdv: string }) {
  const [i, setI] = useState<number | null>(null)
  const m = i !== null ? METEOS[i] : null
  const t = m ? teinte(m.teinte) : { fond: 'var(--ad-sable)', encre: 'var(--ad-nuit)' }
  return (
    <div className="relative isolate overflow-hidden rounded-[40px] p-[clamp(24px,5vw,56px)] transition-colors duration-700" style={{ background: t.fond }}>
      <Lueur couleur="rgba(255,255,255,0.5)" taille={520} />
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {METEOS.map((x, k) => {
          const tk = teinte(x.teinte)
          const actif = k === i
          return (
            <li key={x.nom}>
              <button
                type="button"
                onClick={() => setI(k)}
                aria-pressed={actif}
                className="flex w-full flex-col items-center gap-2 rounded-[22px] bg-white p-4 text-[13.5px] font-semibold transition-[transform,box-shadow] duration-500 hover:-translate-y-1"
                style={{ color: tk.encre, transform: actif ? 'translateY(-6px) scale(1.04)' : undefined, boxShadow: actif ? `0 0 0 3px ${tk.encre}` : undefined, transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }}
              >
                <x.Icone className={cn('h-8 w-8', actif && x.nom === 'Soleil' && 'motion-safe:animate-[ad-tourner_12s_linear_infinite]')} />
                {x.nom}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="relative mt-8 min-h-[190px] overflow-hidden rounded-[28px] bg-white/60 p-[clamp(22px,4vw,40px)]">
        {/* Le ciel : la pluie qui tombe, l'éclair qui passe. */}
        {m && (m.nom === 'Pluie' || m.nom === 'Orage') &&
          Array.from({ length: 22 }, (_, k) => (
            <span
              key={k}
              aria-hidden="true"
              className="absolute top-0 h-5 w-[2px] rounded-full opacity-40 motion-safe:animate-[ad-goutte_1.1s_linear_infinite]"
              style={{ left: `${(k * 37) % 100}%`, background: t.encre, animationDelay: `${((k * 0.23) % 1.1).toFixed(2)}s` }}
            />
          ))}
        {m?.nom === 'Orage' && <span aria-hidden="true" className="absolute inset-0 bg-white motion-safe:animate-[ad-eclair_5s_linear_infinite]" />}
        {m ? (
          <div key={m.nom} className="relative motion-safe:animate-[ad-tuile_0.7s_cubic-bezier(0.22,1,0.36,1)_backwards]">
            <p className="max-w-[40ch] font-[family-name:var(--ad-titre)] text-[clamp(22px,2.6vw,32px)] leading-[1.25]" style={{ color: t.encre }}>
              {m.mot}
            </p>
            <a href={rdv} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold" style={{ color: t.encre }}>
              En parler ensemble <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <p className="relative font-[family-name:var(--ad-titre)] text-[clamp(22px,2.6vw,32px)] italic text-[var(--ad-gris)]">Choisissez le temps qu’il fait, en vous.</p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3. LE CAIRN — les étapes sont des galets de couleur : au défilement,
   ils descendent un à un et s'empilent, en équilibre.
   ══════════════════════════════════════════════════════════════════════ */

export function Cairn({ etapes }: { etapes: { titre: string; texte: string }[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const n = Math.max(1, etapes.length)
  const pentes = [-2, 3, -4, 2, -1]
  return (
    <div ref={ref} className="relative mx-auto flex max-w-[820px] flex-col-reverse items-center pb-6 [--p:1]">
      <span aria-hidden="true" className="absolute bottom-0 h-3 w-[60%] rounded-[50%] bg-[var(--ad-sable-fonce)] opacity-60 blur-[6px]" />
      {etapes.map((e, i) => {
        const a = `clamp(0, calc((var(--p) - 0.18) * ${(n * 2.2).toFixed(1)} - ${i}), 1)`
        const t = teinte(i * 2)
        const largeur = 300 - i * (150 / n)
        return (
          <div key={i} className="relative flex w-full items-center justify-center" style={{ zIndex: 10 + i }}>
            <div
              className="grid h-[clamp(64px,8vw,92px)] place-items-center rounded-[50%] shadow-[inset_0_-10px_20px_rgba(46,66,79,0.12),0_14px_24px_-14px_rgba(46,66,79,0.5)]"
              style={{
                width: `clamp(${Math.round(largeur * 0.62)}px, ${(largeur / 12).toFixed(1)}vw, ${largeur}px)`,
                background: t.fond,
                color: t.encre,
                marginBottom: -8,
                transform: `translateY(calc((1 - ${a}) * -70vh)) rotate(calc(${pentes[i % pentes.length]}deg + (1 - ${a}) * 18deg))`,
                opacity: `calc(0.2 + ${a} * 0.8)`,
              }}
            >
              <span className="font-[family-name:var(--ad-titre)] text-[clamp(22px,2.6vw,32px)]">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className={cn('absolute top-1/2 w-[clamp(140px,26vw,260px)] -translate-y-1/2 max-sm:hidden', i % 2 ? 'right-[calc(50%+170px)] text-right' : 'left-[calc(50%+170px)]')} style={{ opacity: a }}>
              <p className="text-[17px] font-semibold text-[var(--ad-nuit)]">{e.titre}</p>
              {e.texte && <p className="mt-1 line-clamp-2 text-[14px] leading-[1.5] text-[var(--ad-pierre)]">{e.texte}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Le cairn sur téléphone : la liste des étapes, sous les galets. */
export function CairnLegende({ etapes }: { etapes: { titre: string; texte: string }[] }) {
  return (
    <ol className="mt-10 flex flex-col gap-3 sm:hidden">
      {etapes.map((e, i) => {
        const t = teinte(i * 2)
        return (
          <li key={i} className="flex gap-3 rounded-[18px] p-4" style={{ background: t.fond }}>
            <span className="font-[family-name:var(--ad-titre)] text-[20px]" style={{ color: t.encre }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>
              <span className="block font-semibold text-[var(--ad-nuit)]">{e.titre}</span>
              {e.texte && <span className="mt-1 block text-[14px] text-[var(--ad-pierre)]">{e.texte}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   4. LA BOÎTE À MOTS DOUX — on appuie, un mot sort de la boîte sur une
   carte de couleur et vient se poser sur la pile des précédents.
   ══════════════════════════════════════════════════════════════════════ */

export function BoiteAMots({ phrases }: { phrases: string[] }) {
  const [tirees, setTirees] = useState<number[]>([])
  const tirer = () => setTirees((t) => [...t, t.length].slice(-4))
  const n = phrases.length
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className="relative mx-auto h-[300px] w-full max-w-[460px]">
        {tirees.length === 0 && (
          <p className="absolute inset-0 grid place-items-center text-center font-[family-name:var(--ad-titre)] text-[24px] italic text-[var(--ad-gris)]">Un mot vous attend.</p>
        )}
        {tirees.map((k, pos) => {
          const t = teinte(k)
          const dessus = pos === tirees.length - 1
          const recul = tirees.length - 1 - pos
          return (
            <div
              key={k}
              className={cn('absolute inset-x-0 top-6 grid min-h-[220px] place-items-center rounded-[28px] p-8 text-center', OMBRE, dessus && 'motion-safe:animate-[ad-mot-doux_0.9s_cubic-bezier(0.34,1.4,0.64,1)_backwards]')}
              style={{ background: t.fond, transform: `translateY(${-recul * 14}px) scale(${1 - recul * 0.05}) rotate(${dessus ? 0 : (k % 2 ? 2 : -2)}deg)`, zIndex: pos, transition: `transform 0.6s ${DOUX}` }}
            >
              <p className="font-[family-name:var(--ad-titre)] text-[clamp(22px,2.6vw,30px)] leading-[1.3]" style={{ color: t.encre }}>
                {n ? phrases[k % n] : ''}
              </p>
            </div>
          )
        })}
      </div>
      <div className="text-center lg:text-left">
        <Aimant force={0.25}>
          <button
            type="button"
            onClick={tirer}
            className="group relative grid h-40 w-56 place-items-center rounded-[32px] text-[16px] font-semibold text-white shadow-[0_24px_40px_-20px_rgba(46,66,79,0.8)] transition-transform duration-300 active:scale-95"
            style={{ background: 'var(--ad-nuit)' }}
          >
            <span aria-hidden="true" className="absolute inset-x-6 top-5 h-2 rounded-full bg-white/20" />
            <span className="mt-4">Tirer un mot doux</span>
          </button>
        </Aimant>
        <p className="mt-5 text-[14px] text-[var(--ad-gris)]">{tirees.length ? `${tirees.length < 4 ? tirees.length : 'Quelques'} mot${tirees.length > 1 ? 's' : ''} pour vous.` : 'Appuyez sur la boîte.'}</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   5. LE JARDIN — chaque accompagnement est une fleur : les tiges
   poussent, les pétales s'ouvrent, et tout se balance au vent. Une fleur
   survolée se redresse et dit son nom.
   ══════════════════════════════════════════════════════════════════════ */

export function Jardin({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const [ref, vu] = useVu<HTMLDivElement>()
  const hauteurs = [190, 250, 160, 230, 200, 140]
  return (
    <div ref={ref} className="relative overflow-hidden rounded-[40px] px-4 pt-10" style={{ background: `linear-gradient(to bottom, ${TEINTES[5].fond}, ${TEINTES[0].fond} 70%)` }}>
      <div className="flex items-end justify-center gap-[clamp(10px,4vw,56px)]">
        {services.slice(0, 6).map((s, i) => {
          const t = teinte(i + 1)
          const h = hauteurs[i % hauteurs.length]!
          return (
            <a key={s.id} href={rdv} className="group/fleur relative flex w-[clamp(52px,10vw,110px)] origin-bottom flex-col items-center" style={{ animation: vu ? `ad-balancier ${4 + (i % 3)}s ease-in-out ${-i * 0.7}s infinite alternate` : undefined }}>
              {/* Le nom, qui apparaît au survol. */}
              <span className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold opacity-0 shadow transition-[opacity,transform] duration-300 group-hover/fleur:translate-y-0 group-hover/fleur:opacity-100" style={{ color: t.encre }}>
                {s.title}
              </span>
              {/* La fleur : cinq pétales et un cœur. */}
              <span className="relative block aspect-square w-full transition-transform duration-500 group-hover/fleur:scale-110" style={{ transform: vu ? undefined : 'scale(0)', transition: `transform 0.8s cubic-bezier(0.34,1.56,0.64,1) ${0.9 + i * 0.15}s` }}>
                {Array.from({ length: 5 }, (_, k) => (
                  <span key={k} className="absolute left-1/2 top-1/2 h-[46%] w-[34%] rounded-[50%]" style={{ background: `color-mix(in srgb, ${t.encre} 38%, ${t.fond})`, transform: `translate(-50%, -100%) rotate(${k * 72}deg)`, transformOrigin: '50% 100%', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)' }} />
                ))}
                <span className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-white/70" style={{ background: t.encre }} />
              </span>
              {/* La tige, qui pousse. */}
              <span className="block w-[3px] origin-bottom rounded-full bg-[#7fae86]" style={{ height: `clamp(${Math.round(h * 0.5)}px, ${(h / 9).toFixed(1)}vw, ${h}px)`, transform: vu ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 1s ${DOUX} ${0.2 + i * 0.15}s` }}>
                <span className="absolute left-0 top-[45%] h-3 w-6 origin-left -rotate-[30deg] rounded-[50%] bg-[#9cc6a2]" />
              </span>
              <span className="mt-2 hidden max-w-[12ch] text-center text-[12px] font-semibold leading-tight text-[var(--ad-pierre)] sm:block">{s.title}</span>
            </a>
          )
        })}
      </div>
      <div className="mx-[-1rem] mt-4 h-10 bg-[#cfe3c8]" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   6. LE CIEL DU JOUR — le ciel tel qu'il est maintenant au cabinet :
   aube, journée, soir ou nuit, le soleil (ou la lune) à sa place, des
   étoiles la nuit ; et en clair, l'heure et si c'est ouvert.
   ══════════════════════════════════════════════════════════════════════ */

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
function plage(h: string | undefined): [number, number] | null {
  if (!h || /ferm/i.test(h)) return null
  const n = [...h.matchAll(/(\d{1,2})\s*h\s*(\d{2})?/g)].map((m) => Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0))
  if (n.length >= 2) return [n[0]!, n[1]!]
  if (/matin/i.test(h)) return [9, 12.5]
  return null
}
const heureTexte = (h: number) => `${Math.floor(h)} h${h % 1 ? ` ${String(Math.round((h % 1) * 60)).padStart(2, '0')}` : ''}`

export function CielDuJour({ horaires, ville }: { horaires: OpeningHour[]; ville: string }) {
  const [maintenant, setMaintenant] = useState<Date | null>(null)
  useEffect(() => {
    setMaintenant(new Date())
    const t = window.setInterval(() => setMaintenant(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  const h = maintenant ? maintenant.getHours() + maintenant.getMinutes() / 60 : 14
  const nuit = h < 6.5 || h >= 20.5
  const ciel = nuit
    ? ['#2e424f', '#46607a']
    : h < 9
      ? [TEINTES[3].fond, TEINTES[1].fond]
      : h < 17.5
        ? [TEINTES[5].fond, TEINTES[0].fond]
        : [TEINTES[1].fond, TEINTES[3].fond]
  /* Le soleil (de 6 h à 21 h) ou la lune (le reste) sur un arc. */
  const course = nuit ? ((h + 24 - 20.5) % 24) / 10 : (h - 6.5) / 14
  const x = 8 + course * 84
  const y = 78 - Math.sin(course * Math.PI) * 58
  const auj = maintenant ? (maintenant.getDay() + 6) % 7 : 0
  const heureDe = (j: number) => horaires.find((o) => o.day.toLowerCase().startsWith(JOURS[j]!.slice(0, 3)))?.hours
  const pl = plage(heureDe(auj))
  const ouvert = pl ? h >= pl[0] && h < pl[1] : false
  const statut = (() => {
    if (ouvert && pl) return `Le cabinet est ouvert jusqu’à ${heureTexte(pl[1])}.`
    for (let k = 0; k < 7; k++) {
      const j = (auj + k) % 7
      const p = plage(heureDe(j))
      if (p && (k > 0 || h < p[0])) return `Le cabinet ouvre ${k === 0 ? 'aujourd’hui' : k === 1 ? 'demain' : JOURS[j]} à ${heureTexte(p[0])}.`
    }
    return 'Sur rendez-vous.'
  })()
  return (
    <div className="relative isolate h-[clamp(380px,46vw,520px)] overflow-hidden rounded-[40px] transition-[background] duration-1000" style={{ background: `linear-gradient(to bottom, ${ciel[0]}, ${ciel[1]})` }}>
      {nuit &&
        Array.from({ length: 40 }, (_, k) => (
          <span key={k} aria-hidden="true" className="absolute h-[3px] w-[3px] rounded-full bg-white motion-safe:animate-[ad-scintille_3s_ease-in-out_infinite]" style={{ left: `${(k * 47) % 100}%`, top: `${(k * 29) % 60}%`, animationDelay: `${((k * 0.37) % 3).toFixed(2)}s` }} />
        ))}
      {/* L'astre. */}
      <span
        aria-hidden="true"
        className="absolute h-[clamp(56px,7vw,88px)] w-[clamp(56px,7vw,88px)] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,top] duration-1000"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          background: nuit ? '#f4f1e6' : '#ffd99a',
          boxShadow: nuit ? '0 0 40px 10px rgba(244,241,230,0.25)' : '0 0 80px 30px rgba(255,217,154,0.55)',
        }}
      >
        {nuit && <span className="absolute -right-2 -top-2 h-[85%] w-[85%] rounded-full" style={{ background: ciel[0] }} />}
      </span>
      {/* Les collines. */}
      <span aria-hidden="true" className="absolute -bottom-24 -left-[10%] h-48 w-[70%] rounded-[50%]" style={{ background: nuit ? '#24343f' : '#cfe3c8' }} />
      <span aria-hidden="true" className="absolute -bottom-28 -right-[10%] h-56 w-[75%] rounded-[50%]" style={{ background: nuit ? '#1e2c35' : '#b9d6b1' }} />
      <div className={cn('absolute inset-x-0 bottom-0 p-[clamp(24px,4vw,48px)]', nuit ? 'text-white' : 'text-[var(--ad-nuit)]')}>
        <p className="font-[family-name:var(--ad-titre)] text-[clamp(28px,4vw,52px)] leading-[1.1]">
          {maintenant ? `Il est ${maintenant.getHours()} h ${String(maintenant.getMinutes()).padStart(2, '0')}` : '\u00a0'}
          <span className="block text-[0.55em] opacity-80">à {ville || 'Cesson-Sévigné'}</span>
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[14px] font-semibold text-[var(--ad-nuit)]">
          <span className={cn('h-2 w-2 rounded-full', ouvert ? 'bg-[#5fae7b]' : 'bg-[var(--ad-gris)]')} />
          {maintenant ? statut : ' '}
        </p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   7. LES RICOCHETS — les questions sont des galets sur l'eau ; on en
   touche un, des ronds s'élargissent à l'endroit du clic, et la réponse
   remonte à la surface.
   ══════════════════════════════════════════════════════════════════════ */

export function Ricochets({ faq }: { faq: FaqItem[] }) {
  const [choisie, setChoisie] = useState<number | null>(null)
  const [ondes, setOndes] = useState<{ x: number; y: number; id: number }[]>([])
  const toucher = (k: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const eau = e.currentTarget.closest('[data-eau]')!.getBoundingClientRect()
    const id = Date.now()
    setOndes((o) => [...o.slice(-3), { x: e.clientX - eau.left, y: e.clientY - eau.top, id }])
    window.setTimeout(() => setOndes((o) => o.filter((x) => x.id !== id)), 1800)
    setChoisie(k)
  }
  const q = choisie !== null ? faq[choisie] : null
  return (
    <div data-eau="" className="relative isolate overflow-hidden rounded-[40px] p-[clamp(20px,4vw,48px)]" style={{ background: `linear-gradient(160deg, ${TEINTES[0].fond}, ${TEINTES[5].fond})` }}>
      <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-50 [background:repeating-radial-gradient(circle_at_30%_40%,transparent_0_22px,rgba(255,255,255,0.35)_23px_24px)] motion-safe:animate-[ad-flotter_9s_ease-in-out_infinite]" />
      {ondes.map((o) =>
        [0, 1, 2].map((k) => (
          <span key={`${o.id}-${k}`} aria-hidden="true" className="pointer-events-none absolute h-10 w-10 rounded-full border-2 border-white opacity-0 motion-safe:animate-[ad-ride_1.6s_ease-out_forwards]" style={{ left: o.x - 20, top: o.y - 20, animationDelay: `${k * 0.18}s` }} />
        )),
      )}
      <ul className="flex flex-wrap justify-center gap-3">
        {faq.map((f, k) => (
          <li key={f.id} style={{ animation: `ad-flotter ${5 + (k % 3)}s ease-in-out ${-k * 0.8}s infinite` }}>
            <button
              type="button"
              onClick={(e) => toucher(k, e)}
              className={cn('rounded-[999px] px-5 py-3 text-[14.5px] font-semibold shadow-[0_10px_24px_-14px_rgba(46,66,79,0.55)] transition-[transform,opacity,background-color] duration-500', k === choisie ? 'scale-90 opacity-50' : 'bg-white hover:-translate-y-1')}
              style={{ color: teinte(k).encre, background: k === choisie ? teinte(k).fond : undefined }}
            >
              {f.question}
            </button>
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-8 min-h-[150px] max-w-[720px]" aria-live="polite">
        {q ? (
          <div key={q.id} className={cn('rounded-[28px] bg-white p-7 motion-safe:animate-[ad-remonte_0.9s_cubic-bezier(0.22,1,0.36,1)_0.25s_backwards]', OMBRE)}>
            <p className="font-[family-name:var(--ad-titre)] text-[22px] leading-[1.25]" style={{ color: teinte(choisie ?? 0).encre }}>
              {q.question}
            </p>
            <p className="mt-3 whitespace-pre-line text-[15.5px] leading-[1.7] text-[var(--ad-pierre)]">{propre(q.answer)}</p>
          </div>
        ) : (
          <p className="pt-10 text-center font-[family-name:var(--ad-titre)] text-[22px] italic text-[var(--ad-nuit)]/60">Lancez un galet.</p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   8. LA LETTRE — une enveloppe de couleur ; en arrivant, le rabat
   s'ouvre et la lettre remonte, avec son texte et sa signature.
   ══════════════════════════════════════════════════════════════════════ */

export function Lettre({ texte, signature, couleur = 3 }: { texte: string; signature: string; couleur?: number }) {
  const [ref, vu] = useVu<HTMLDivElement>('-20%')
  const t = teinte(couleur)
  return (
    <div ref={ref} className="relative mx-auto mt-[clamp(200px,24vw,320px)] w-[min(640px,92vw)]">
      <div className="relative aspect-[16/10]">
        {/* Le fond de l'enveloppe. */}
        <span className="absolute inset-0 rounded-[18px]" style={{ background: t.encre, opacity: 0.85 }} />
        {/* La lettre, qui remonte. */}
        <div
          className={cn('absolute inset-x-[6%] bottom-[6%] top-[6%] overflow-hidden rounded-[14px] bg-white p-[clamp(18px,4vw,36px)] text-left', OMBRE)}
          style={{ transform: vu ? 'translateY(-62%)' : 'translateY(0)', transition: `transform 1.3s ${DOUX} 0.9s`, zIndex: 1 }}
        >
          <p className="line-clamp-[7] whitespace-pre-line text-[clamp(14px,1.5vw,16.5px)] leading-[1.75] text-[var(--ad-pierre)]">{texte}</p>
          <p className="mt-3 font-[family-name:var(--ad-titre)] text-[20px] italic" style={{ color: t.encre }}>
            {signature}
          </p>
        </div>
        {/* La poche de devant. */}
        <span className="absolute inset-0 rounded-[18px] [clip-path:polygon(0_0,50%_55%,100%_0,100%_100%,0_100%)]" style={{ background: t.fond, zIndex: 2 }} />
        {/* Le rabat, qui s'ouvre. */}
        <span
          className="absolute inset-x-0 top-0 h-[58%] origin-top [clip-path:polygon(0_0,100%_0,50%_100%)]"
          style={{
            background: `color-mix(in srgb, ${t.fond} 70%, ${t.encre})`,
            transform: vu ? 'rotateX(180deg)' : 'rotateX(0)',
            transition: `transform 0.9s ${DOUX} 0.2s, z-index 0s 0.65s`,
            zIndex: vu ? 0 : 3,
          }}
        />
        {/* Le cachet. */}
        <span className="absolute left-1/2 top-[52%] z-[4] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-[family-name:var(--ad-titre)] text-[20px] italic text-white shadow-md transition-opacity duration-300" style={{ background: t.encre, opacity: vu ? 0 : 1 }}>
          A
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   9. LE RENDEZ-VOUS EN TROIS GESTES — un petit parcours : quel
   accompagnement, au cabinet ou en visio, et c'est prêt — la carte se
   retourne, quelques confettis, et le vrai lien pour choisir un créneau.
   ══════════════════════════════════════════════════════════════════════ */

const ECLATS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  return { dx: Math.round(Math.cos(a) * (90 + (i % 3) * 30)), dy: Math.round(Math.sin(a) * (70 + (i % 2) * 30)), c: TEINTES[i % 6]!.encre }
})

export function RendezVous({ services, rdv }: { services: ServiceWithMedia[]; rdv: string }) {
  const [etape, setEtape] = useState(0)
  const [service, setService] = useState<number | null>(null)
  const [lieu, setLieu] = useState<'cabinet' | 'visio' | null>(null)
  const s = service !== null ? services[service] : null
  const t = teinte(service ?? 0)
  const titres = ['Quel accompagnement ?', 'Où vous sentez-vous le mieux ?', 'C’est prêt.']
  return (
    <div className={cn('relative mx-auto max-w-[760px] overflow-hidden rounded-[36px] bg-white', OMBRE)}>
      <div className="flex items-center justify-between border-b border-[var(--ad-sable)] px-6 py-4">
        <button type="button" onClick={() => setEtape((e) => Math.max(0, e - 1))} disabled={etape === 0} aria-label="Retour" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ad-sable)] text-[var(--ad-nuit)] transition-opacity disabled:opacity-30">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2">
          {[0, 1, 2].map((k) => (
            <span key={k} className="h-2 rounded-full transition-[width,background-color] duration-500" style={{ width: k === etape ? 28 : 8, background: k <= etape ? t.encre : 'var(--ad-sable-fonce)' }} />
          ))}
        </div>
        <span className="w-9" />
      </div>
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-700" style={{ transform: `translateX(-${etape * 100}%)`, transitionTimingFunction: DOUX }}>
          {/* 1. L'accompagnement. */}
          <div className="w-full shrink-0 p-[clamp(22px,4vw,40px)]">
            <p className="font-[family-name:var(--ad-titre)] text-[26px] text-[var(--ad-nuit)]">{titres[0]}</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {services.map((x, k) => {
                const tk = teinte(k)
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => {
                      setService(k)
                      window.setTimeout(() => setEtape(1), 350)
                    }}
                    className="rounded-full px-5 py-3 text-[14.5px] font-semibold transition-transform duration-300 hover:scale-105"
                    style={{ background: tk.fond, color: tk.encre, boxShadow: service === k ? `0 0 0 3px ${tk.encre}` : undefined }}
                  >
                    {x.title}
                  </button>
                )
              })}
            </div>
          </div>
          {/* 2. Le lieu. */}
          <div className="w-full shrink-0 p-[clamp(22px,4vw,40px)]">
            <p className="font-[family-name:var(--ad-titre)] text-[26px] text-[var(--ad-nuit)]">{titres[1]}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  { cle: 'cabinet', Icone: Sofa, nom: 'Au cabinet', detail: 'Un lieu calme, à l’écart du bruit' },
                  { cle: 'visio', Icone: Monitor, nom: 'En visio', detail: 'De chez vous, en toute confidentialité' },
                ] as const
              ).map((l, k) => {
                const tk = teinte(k ? 4 : 2)
                return (
                  <button
                    key={l.cle}
                    type="button"
                    onClick={() => {
                      setLieu(l.cle)
                      window.setTimeout(() => setEtape(2), 350)
                    }}
                    className="flex items-center gap-4 rounded-[22px] p-5 text-left transition-transform duration-300 hover:-translate-y-1"
                    style={{ background: tk.fond, boxShadow: lieu === l.cle ? `0 0 0 3px ${tk.encre}` : undefined }}
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-[15px] bg-white" style={{ color: tk.encre }}>
                      <l.Icone className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block text-[16px] font-semibold" style={{ color: tk.encre }}>
                        {l.nom}
                      </span>
                      <span className="block text-[13.5px] text-[var(--ad-nuit)]/70">{l.detail}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {/* 3. C'est prêt. */}
          <div className="relative w-full shrink-0 p-[clamp(22px,4vw,40px)] text-center">
            {etape === 2 &&
              ECLATS.map((c, k) => (
                <span key={k} aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[45%] h-2.5 w-2.5 rounded-full opacity-0 motion-safe:animate-[ad-confetti_1.2s_cubic-bezier(0.22,1,0.36,1)_0.5s_forwards]" style={{ background: c.c, ['--dx' as string]: `${c.dx}px`, ['--dy' as string]: `${c.dy}px` }} />
              ))}
            <span key={`ok-${etape}`} className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white motion-safe:animate-[ad-mot-doux_0.8s_cubic-bezier(0.34,1.56,0.64,1)_0.3s_backwards]" style={{ background: t.encre }}>
              <Check className="h-8 w-8" />
            </span>
            <p className="mt-5 font-[family-name:var(--ad-titre)] text-[26px] text-[var(--ad-nuit)]">{titres[2]}</p>
            <p className="mx-auto mt-2 max-w-[40ch] text-[15.5px] text-[var(--ad-pierre)]">
              {s ? s.title : 'Un accompagnement'}, {lieu === 'visio' ? 'en visio' : 'au cabinet'}. Il ne reste qu’à choisir le moment.
            </p>
            <a href={rdv} className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14.5px] font-semibold text-white" style={{ background: t.encre }}>
              Choisir mon créneau <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   10. LE NUANCIER — des lames de couleur, comme chez le peintre, chacune
   portant une valeur ; empilées, elles s'ouvrent en éventail au
   défilement, et celle qu'on survole sort du paquet.
   ══════════════════════════════════════════════════════════════════════ */

export function Nuancier({ mots }: { mots: string[] }) {
  const ref = useAvancement<HTMLDivElement>('passage')
  const liste = mots.slice(0, 7)
  const milieu = (liste.length - 1) / 2
  return (
    <div ref={ref} className="relative mx-auto h-[clamp(320px,40vw,460px)] w-full max-w-[900px] [--p:1]">
      {liste.map((m, i) => {
        const k = i - milieu
        const t = teinte(i)
        const ouv = `clamp(0, calc((var(--p) - ${(0.15 + Math.abs(k) * 0.025).toFixed(3)}) * 3), 1)`
        return (
          <div
            key={m + i}
            className="group/lame absolute bottom-[6%] left-1/2 h-[88%] w-[clamp(72px,10vw,110px)] origin-[50%_92%]"
            style={{ zIndex: 10 + i, transform: `translateX(-50%) rotate(calc(${ouv} * ${k * 12}deg))` }}
          >
            <div className={cn('flex h-full flex-col justify-between overflow-hidden rounded-[16px] bg-white transition-transform duration-500 group-hover/lame:-translate-y-8', OMBRE)} style={{ transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div className="px-3 pb-2.5 pt-3">
                <p className="font-[family-name:var(--ad-titre)] text-[clamp(13px,1.4vw,17px)] leading-tight" style={{ color: t.encre }}>
                  {m}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--ad-gris)]">{t.fond.replace('#', 'N° ')}</p>
              </div>
              {/* La couleur, en dégradé du clair au soutenu, comme une vraie lame de nuancier. */}
              <div className="flex flex-1 flex-col">
                {[0.15, 0.35, 0.6].map((f) => (
                  <span key={f} className="flex-1" style={{ background: `color-mix(in srgb, ${t.encre} ${Math.round(f * 100)}%, ${t.fond})` }} />
                ))}
              </div>
            </div>
          </div>
        )
      })}
      <span aria-hidden="true" className="absolute bottom-[8%] left-1/2 z-50 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white bg-[var(--ad-nuit)] shadow" />
    </div>
  )
}
