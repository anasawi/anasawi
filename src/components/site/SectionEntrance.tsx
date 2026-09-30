'use client'

import { m, useReducedMotion } from 'motion/react'

import type { SectionSettings } from '@/lib/section-settings'

/**
 * Animation d'apparition d'une section — les presets du CMS.
 *
 * `aucune` (défaut) laisse chaque bloc gérer ses propres micro-animations ;
 * les presets animent la section entière, une seule fois, à l'entrée dans
 * le viewport. Sous `prefers-reduced-motion`, rien ne bouge.
 */
const ENTRANCE_INITIAL: Record<
  Exclude<SectionSettings['animation'], 'aucune'>,
  { opacity: number; y?: number; scale?: number }
> = {
  fade: { opacity: 0 },
  'fade-up': { opacity: 0, y: 44 },
  scale: { opacity: 0, scale: 0.96 },
}

export function SectionEntrance({
  settings,
  children,
}: {
  settings: SectionSettings
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()

  if (settings.animation === 'aucune' || reduced) return <>{children}</>

  return (
    <m.div
      initial={ENTRANCE_INITIAL[settings.animation]}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{
        duration: settings.duration,
        delay: settings.delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </m.div>
  )
}
