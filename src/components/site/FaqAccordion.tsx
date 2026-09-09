'use client'

import { AnimatePresence, m } from 'motion/react'
import { useId, useState } from 'react'

import type { FaqItem } from '@/server/db/schema'

/**
 * Accordéon en pattern ARIA « disclosure » : un bouton par question, avec
 * `aria-expanded` et `aria-controls`, et la réponse dans une région
 * `role="region"` étiquetée par son bouton. Une seule réponse ouverte à la fois.
 *
 * Le contenu reste dans le DOM lorsqu'il est fermé côté SEO ? Non : on le
 * démonte. Les réponses sont déjà exposées à Google via le JSON-LD `FAQPage`,
 * qui est la source que le moteur utilise pour les rich results.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null)
  const baseId = useId()

  if (items.length === 0) return null

  return (
    <div className="border-t border-line-strong">
      {items.map((item) => {
        const isOpen = openId === item.id
        const buttonId = `${baseId}-b-${item.id}`
        const panelId = `${baseId}-p-${item.id}`

        return (
          <div key={item.id} className="border-b border-line">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="group flex w-full items-start justify-between gap-10 py-8 text-left transition-colors duration-500 hover:text-blue-deep"
              >
                <span className="font-serif text-[1.1rem] leading-[1.4] text-ink transition-colors duration-500 group-hover:text-blue-deep md:text-[1.25rem]">
                  {item.question}
                </span>

                {/* Croix qui pivote en trait — pas de chevron. */}
                <span
                  aria-hidden="true"
                  className="relative mt-2 block h-3 w-3 shrink-0"
                >
                  <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-ink transition-colors duration-500 group-hover:bg-blue-deep" />
                  <span
                    className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-ink transition-[transform,background-color] duration-500 ease-[var(--ease-out-soft)] group-hover:bg-blue-deep"
                    style={{
                      transform: `translateX(-50%) rotate(${isOpen ? 90 : 0}deg)`,
                    }}
                  />
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  key="panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[62ch] pb-8 pr-10 text-[0.95rem] leading-[1.8] text-ink-soft">
                    {item.answer}
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
