'use client'

import { domAnimation, LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Charge le sous-ensemble « domAnimation » de Motion (~5 ko) au lieu du bundle
 * complet (~34 ko). Toutes les primitives du site utilisent `m.*`, jamais
 * `motion.*` — c'est ce qui rend le tree-shaking effectif.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
