'use client'

import { ArrowUpRight, Sparkles } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { CONTENEUR } from './socle'
import { SectionsView, type SectionsViewData } from '@/components/site/SectionsView'
import { makeSectionRow } from '@/lib/snapshot'
import { cn } from '@/lib/utils'

/**
 * LE CATALOGUE — tous les modèles modernes présentés comme dans un
 * catalogue : une miniature vivante (le vrai rendu, réduit), le nom, ce
 * qu'on y voit, son mouvement, et un lien pour le voir en grand.
 */

export type Fiche = { type: string; label: string; description: string; mouvement: string; enPlace: boolean; lien: string }
export type Rayon = { categorie: string; indice: string; fiches: Fiche[] }

const LARGEUR = 1280
const HAUTEUR = 280

function Miniature({ type, data }: { type: string; data: SectionsViewData }) {
  const section = useMemo(() => makeSectionRow({ id: `catalogue-${type}`, pageId: 'catalogue', type, backgroundColor: '#fbf6ee', payload: {} }), [type])
  const cadre = useRef<HTMLDivElement>(null)
  const [echelle, setEchelle] = useState(0.3)
  /* Sur téléphone, les sections prennent leur mise en page de téléphone : la miniature la montre à sa largeur. */
  const [largeur, setLargeur] = useState(LARGEUR)
  useLayoutEffect(() => {
    const el = cadre.current
    if (!el) return
    const mesure = () => {
      const l = window.innerWidth < 768 ? 390 : LARGEUR
      setLargeur(l)
      if (el.clientWidth) setEchelle(el.clientWidth / l)
    }
    mesure()
    const ro = new ResizeObserver(mesure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={cadre} aria-hidden="true" className="pointer-events-none relative overflow-hidden rounded-[18px] bg-[var(--ad-ivoire)] ring-1 ring-[var(--ad-sable-fonce)]/60" style={{ height: HAUTEUR }}>
      <div style={{ width: largeur, transform: `scale(${echelle})`, transformOrigin: 'top left', ['--ad-vh' as string]: '8.6px' }}>
        <SectionsView sections={[section]} data={data} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--ad-ivoire)] to-transparent" />
    </div>
  )
}

export function Catalogue({ rayons, data }: { rayons: Rayon[]; data: SectionsViewData }) {
  const total = rayons.reduce((n, r) => n + r.fiches.length, 0)
  const nouveaux = rayons.reduce((n, r) => n + r.fiches.filter((f) => !f.enPlace).length, 0)
  let numero = 0
  return (
    <main className="pb-28">
      <header className={cn(CONTENEUR, 'pb-10 pt-36')}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Catalogue</p>
        <h1 className="mt-3 text-[clamp(44px,6vw,80px)] leading-[1]">
          Les modèles <em>modernes</em>
        </h1>
        <p className="mt-6 max-w-[64ch] text-[16.5px] leading-[1.75] text-[var(--ad-pierre)]">
          {total} modèles, tous dans la direction artistique du site moderne : la porte en arche, l’ivoire chaud, des mouvements lents, aucune
          lueur. {total - nouveaux} sont déjà sur le site, {nouveaux} sont nouveaux. Chaque miniature est le vrai rendu, avec le contenu d’Anne ;
          tous les textes et toutes les photos se modifient dans l’éditeur.
        </p>
        <nav aria-label="Catégories" className="mt-10 flex flex-wrap gap-2">
          {rayons.map((r) => (
            <a
              key={r.categorie}
              href={`#${encodeURIComponent(r.categorie)}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[var(--ad-nuit)] shadow-[0_1px_2px_rgba(46,66,79,0.06),0_4px_14px_-6px_rgba(46,66,79,0.12)] transition-colors duration-300 hover:bg-[var(--ad-nuit)] hover:text-white"
            >
              {r.categorie}
              <span className="rounded-full bg-[var(--ad-sable)] px-2 py-0.5 text-[12px] tabular-nums text-[var(--ad-pierre)]">{r.fiches.length}</span>
            </a>
          ))}
        </nav>
      </header>

      {rayons.map((r) => (
        <section key={r.categorie} id={encodeURIComponent(r.categorie)} className={cn(CONTENEUR, 'scroll-mt-24 pt-16')}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--ad-sable-fonce)] pb-5">
            <h2 className="text-[clamp(32px,3.4vw,46px)] leading-[1.05]">{r.categorie}</h2>
            <p className="max-w-[44ch] text-[15px] leading-[1.6] text-[var(--ad-gris)]">{r.indice}</p>
          </div>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {r.fiches.map((f) => {
              numero += 1
              return (
                <li key={f.type} className="group relative min-w-0">
                  <div>
                    <div className="transition-transform duration-500 ease-[var(--ad-ease)] group-hover:-translate-y-1">
                      <Miniature type={f.type} data={data} />
                    </div>
                    <div className="mt-4 flex items-center gap-2.5">
                      <span className="rounded-full bg-[var(--ad-nuit)] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-white">{String(numero).padStart(2, '0')}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', f.enPlace ? 'bg-[var(--ad-sable)] text-[var(--ad-pierre)]' : 'bg-[var(--ad-brume)] text-[var(--ad-bleu)]')}>
                        {f.enPlace ? 'Sur le site' : 'Nouveau'}
                      </span>
                    </div>
                    <p className="mt-3 flex items-center justify-between gap-3 font-[family-name:var(--ad-titre)] text-[24px] leading-[1.2] text-[var(--ad-nuit)]">
                      <a href={f.lien} className="after:absolute after:inset-0 after:content-['']">
                        {f.label}
                      </a>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--ad-gris)] transition-transform duration-500 group-hover:rotate-45 group-hover:text-[var(--ad-nuit)]" />
                    </p>
                    <p className="mt-2 text-[14.5px] leading-[1.6] text-[var(--ad-pierre)]">{f.description}</p>
                    <p className="mt-3 flex items-start gap-2 text-[13.5px] leading-[1.5] text-[var(--ad-bleu)]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                      {f.mouvement}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}
