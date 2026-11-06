'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { apparait, Bouton, CARTE, CONTENEUR, DOUX, Entete, Etiquette, ITALIQUE, paragraphes, Section, TEXTE, Titre, useVu } from './socle'
import { cn } from '@/lib/utils'
import type { FaqItem } from '@/server/db/schema'

/* QUESTIONS — trois façons de répondre à ce qu'on vous demande. */

type Base = { etiquette: string; titre: string; texte: string; bouton: string; rdv: string; faq: FaqItem[]; id?: string }
const reponse = (f: FaqItem) => paragraphes(f.answer.replace(/<[^>]+>/g, '\n'))

/* ── 1. Accordéon : le titre à gauche, les questions à droite qui s'ouvrent une à une. */
export function QuestionsAccordeon({ etiquette, titre, texte, bouton, rdv, faq, id }: Base) {
  const [ouvert, setOuvert] = useState(0)
  return (
    <Section id={id}>
      <div className={cn(CONTENEUR, 'grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20')}>
        <div>
          <Etiquette>{etiquette}</Etiquette>
          <Titre texte={titre} />
          {texte && <p className={cn(TEXTE, 'mt-6 max-w-[38ch]')}>{texte}</p>}
          <div className="mt-8">
            <Bouton href={rdv} discret>
              {bouton}
            </Bouton>
          </div>
        </div>
        <ul className="border-t border-[var(--ad-sable-fonce)]">
          {faq.slice(0, 7).map((f, i) => {
            const o = i === ouvert
            return (
              <li key={f.id} className="border-b border-[var(--ad-sable-fonce)]">
                <button type="button" onClick={() => setOuvert(o ? -1 : i)} aria-expanded={o} className="flex w-full items-center gap-4 py-4 text-left">
                  <span className="min-w-0 flex-1 text-[17px] font-semibold tracking-[-0.01em] text-[var(--ad-nuit)]">{f.question}</span>
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full transition-[background-color,rotate] duration-500 ease-[var(--ad-ease)]', o ? 'rotate-45 bg-[var(--ad-touche)] text-white' : 'bg-[var(--ad-touche-pale)] text-[var(--ad-touche-fonce)]')}>
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                <div className="grid transition-[grid-template-rows] duration-700 ease-[var(--ad-ease)]" style={{ gridTemplateRows: o ? '1fr' : '0fr', transitionTimingFunction: DOUX }}>
                  <div className="overflow-hidden">
                    <div className="max-w-[62ch] pb-5 pr-12">
                      {reponse(f).map((p, k) => (
                        <p key={k} className="mb-2 text-[15px] leading-[1.7] text-[var(--ad-pierre)]">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

/* ── 2. Éditoriale : les questions en grand à gauche ; la réponse se pose dans une carte sable. */
export function QuestionsEditoriale({ etiquette, titre, faq, id }: Base) {
  const [i, setI] = useState(0)
  const liste = faq.slice(0, 6)
  const f = liste[i]
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <ol className="flex flex-col">
            {liste.map((q, k) => (
              <li key={q.id}>
                <button type="button" onClick={() => setI(k)} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} className="group flex w-full items-baseline gap-4 py-2.5 text-left">
                  <span className="w-7 shrink-0 text-[13px] font-semibold tabular-nums text-[var(--ad-touche-fonce)]">{String(k + 1).padStart(2, '0')}</span>
                  <span className="font-[family-name:var(--ad-titre)] text-[clamp(19px,1.9vw,25px)] leading-[1.3] transition-colors duration-500 ease-[var(--ad-ease)]" style={{ color: k === i ? 'var(--ad-nuit)' : 'color-mix(in srgb, var(--ad-gris) 75%, transparent)' }}>
                    {q.question}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {f && (
            <div className="self-start rounded-[30px] bg-[var(--ad-sable)] p-8 lg:sticky lg:top-28">
              <div key={f.id} className="motion-safe:animate-[ad-legende_.7s_ease-out_backwards]">
                <p className={cn(ITALIQUE, 'text-[22px] leading-[1.35] text-[var(--ad-nuit)]')}>{f.question}</p>
                <div className="mt-4 max-h-[38vh] overflow-auto pr-1">
                  {reponse(f).map((p, k) => (
                    <p key={k} className="mb-3 text-[15px] leading-[1.75] text-[var(--ad-pierre)]">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

/* ── 3. En cartes : six questions ; un clic, et la carte se retourne sur sa réponse. */
export function QuestionsCartes({ etiquette, titre, texte, faq, id }: Base) {
  const [ref, vu] = useVu<HTMLUListElement>()
  const [retournees, setRetournees] = useState<Set<number>>(new Set())
  const basculer = (k: number) =>
    setRetournees((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  return (
    <Section id={id}>
      <div className={CONTENEUR}>
        <Entete etiquette={etiquette} titre={titre} texte={texte} />
        <ul ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {faq.slice(0, 6).map((f, k) => {
            const r = retournees.has(k)
            return (
              <li key={f.id} className="h-[188px] [perspective:1200px]" style={apparait(vu, k * 0.08)}>
                <button type="button" onClick={() => basculer(k)} aria-pressed={r} className="relative h-full w-full text-left [transform-style:preserve-3d]" style={{ transform: r ? 'rotateY(180deg)' : 'none', transition: `transform 1s ${DOUX}` }}>
                  <span className={cn(CARTE, 'absolute inset-0 flex flex-col justify-between p-6 [backface-visibility:hidden]')}>
                    <span className="text-[13px] font-semibold text-[var(--ad-or)]">Question {k + 1}</span>
                    <span className="font-[family-name:var(--ad-titre)] text-[22px] leading-[1.25] text-[var(--ad-nuit)]">{f.question}</span>
                    <span className="text-[13px] font-semibold text-[var(--ad-touche-fonce)]">Lire la réponse →</span>
                  </span>
                  <span className="absolute inset-0 overflow-auto rounded-[28px] bg-[var(--ad-nuit)] p-6 text-[14.5px] leading-[1.65] text-white/90 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    {reponse(f).join(' ')}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}
