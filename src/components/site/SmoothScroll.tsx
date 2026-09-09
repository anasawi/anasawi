'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Défilement inertiel façon maquette : le contenu vit dans un wrapper
 * `position:fixed` translaté à chaque frame vers -scrollY avec un lerp
 * de .085, pendant que le body garde la hauteur réelle du contenu.
 *
 * Le scroll natif de la fenêtre reste LA source de vérité : on ne fait
 * que lire `window.scrollY`. Les ancres (`#contact`), la molette, le
 * clavier et la restauration de position fonctionnent donc sans code.
 *
 * Désactivé sous prefers-reduced-motion et sur pointeur tactile — le
 * flux normal reprend (le wrapper redevient un simple div).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const wrap = wrapRef.current
    if (reduced || coarse || !wrap) return

    setActive(true)

    /* Le lissage natif (html { scroll-behavior:smooth }) s'additionnerait
       au lerp : on rend le scroll fenêtre instantané, le lerp fait le
       reste. Les ancres gardent leur inertie — celle du lerp. */
    const previousBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'

    let current = window.scrollY

    const setHeight = () => {
      document.body.style.height = `${wrap.scrollHeight}px`
    }
    setHeight()

    /* Les images qui chargent, les accordéons qui s'ouvrent : la hauteur
       du body suit le contenu, pas l'inverse. */
    const observer = new ResizeObserver(setHeight)
    observer.observe(wrap)

    let frame = 0
    const loop = () => {
      const target = window.scrollY
      current += (target - current) * 0.085
      if (Math.abs(target - current) < 0.05) current = target
      wrap.style.transform = `translate3d(0, ${-current}px, 0)`
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.body.style.height = ''
      document.documentElement.style.scrollBehavior = previousBehavior
      wrap.style.transform = ''
      setActive(false)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      className={cn(active && 'fixed left-0 top-0 w-full will-change-transform')}
    >
      {children}
    </div>
  )
}
