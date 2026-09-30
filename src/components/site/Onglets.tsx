'use client'

import { useState } from 'react'

import { Reveal } from '@/components/site/anim'
import { cn } from '@/lib/utils'

/**
 * Les onglets du bloc « Onglets » — la seule partie des composites qui a
 * besoin d'un état local (l'onglet actif). Isolée dans son propre fichier
 * client pour que le reste des composites reste rendu côté serveur : le
 * bloc lui-même ne fait que lui transmettre ses libellés et ses textes.
 */
export function Onglets({ tabs }: { tabs: { label: string; text: string }[] }) {
  const [active, setActive] = useState(0)
  if (tabs.length === 0) return null
  const current = tabs[Math.min(active, tabs.length - 1)]

  return (
    <Reveal>
      <div role="tablist" className="flex flex-wrap gap-x-6 border-b border-line">
        {tabs.map((tab, i) => (
          <button
            key={i}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'relative -mb-px pb-3 text-[0.8rem] uppercase tracking-[0.1em] transition-colors',
              i === active
                ? 'border-b border-ink text-ink'
                : 'text-stone hover:text-ink-soft',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current && (
        <p className="pt-5 text-[0.9rem] leading-[1.75] text-ink-soft">
          {current.text}
        </p>
      )}
    </Reveal>
  )
}
