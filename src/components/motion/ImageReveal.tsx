'use client'

import { m, useInView, useReducedMotion } from 'motion/react'
import Image from 'next/image'
import { useRef } from 'react'

import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

type ImageRevealProps = {
  media: Media | null
  className?: string
  imageClassName?: string
  sizes: string
  /** Uniquement pour l'image du hero — jamais ailleurs. */
  priority?: boolean
  /** Désactive l'animation d'entrée (hero : on ne retarde pas le LCP). */
  instant?: boolean
  delay?: number
}

/**
 * Image révélée par un volet (`clip-path`) couplé à une très légère
 * dé-zoom. Les deux propriétés sont composited — aucun reflow.
 *
 * `instant` sert au hero : l'image du LCP est peinte immédiatement, sans
 * animation d'entrée. Une animation ne doit jamais coûter des millisecondes
 * de Largest Contentful Paint.
 */
export function ImageReveal({
  media,
  className,
  imageClassName,
  sizes,
  priority = false,
  instant = false,
  delay = 0,
}: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduced = useReducedMotion()

  if (!media) {
    return (
      <div
        ref={ref}
        className={cn('bg-ivory-warm', className)}
        aria-hidden="true"
      />
    )
  }

  const img = (
    <Image
      src={media.url}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={88}
      className={cn('object-cover', imageClassName)}
      {...(media.blurDataUrl
        ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
        : {})}
    />
  )

  if (reduced || instant) {
    return (
      <div ref={ref} className={cn('relative overflow-hidden', className)}>
        {img}
      </div>
    )
  }

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <m.div
        className="absolute inset-0"
        initial={{ clipPath: 'inset(0 0 100% 0)', scale: 1.06 }}
        animate={
          inView
            ? { clipPath: 'inset(0 0 0% 0)', scale: 1 }
            : { clipPath: 'inset(0 0 100% 0)', scale: 1.06 }
        }
        transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {img}
      </m.div>
    </div>
  )
}
