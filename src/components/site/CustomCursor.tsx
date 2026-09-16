'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Curseur personnalisé de la maquette : un point de 8px collé au pointeur,
 * un anneau de 34px qui suit avec retard (lerp .16). Sur un lien ou un
 * bouton, l'anneau s'accroche à l'élément : il en prend la taille et
 * l'arrondi (la pilule devient son contour), le suit, et garde un léger
 * jeu vers la souris ; le point s'efface. Sur une zone portant
 * `data-cursor` (« glisser »), il devient une pastille bleue légendée.
 *
 * Monté uniquement si (hover:hover) et (pointer:fine), jamais sous
 * prefers-reduced-motion. Tant qu'il est actif, `html.anasawi-cursor`
 * masque le curseur natif (voir globals.css).
 */
export function CustomCursor() {
  const [active, setActive] = useState(false)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!fine || reduced) return

    setActive(true)
    document.documentElement.classList.add('anasawi-cursor')

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let rx = mx
    let ry = my

    /* L'élément cliquable auquel l'anneau est accroché — il en épouse la
       forme (taille + arrondi) et le suit, avec un léger jeu vers la
       souris pour garder de la vie. */
    let stuck: HTMLElement | null = null
    /* Marge autour du bouton, en pixels. */
    const PAD = 6
    /* Amplitude du jeu : fraction du décalage souris / centre du bouton. */
    const PLAY = 0.12

    const onMove = (event: MouseEvent) => {
      mx = event.clientX
      my = event.clientY
    }

    /* Ton du fond sous la souris : premier ancêtre qui peint un fond
       opaque, luminance mesurée. Une image ou une vidéo compte comme
       sombre. Bleu sur clair, ivoire sur sombre — deux couleurs, c'est
       tout. */
    const toneOf = (el: Element | null): 'light' | 'dark' => {
      let node: Element | null = el
      while (node && node !== document.documentElement) {
        if (node instanceof HTMLImageElement || node.tagName === 'VIDEO') {
          return 'dark'
        }
        const bg = getComputedStyle(node).backgroundColor
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(bg)
        if (m) {
          const alpha = m[4] === undefined ? 1 : Number(m[4])
          if (alpha > 0.5) {
            const r = Number(m[1]) / 255
            const g = Number(m[2]) / 255
            const b = Number(m[3]) / 255
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            return lum < 0.55 ? 'dark' : 'light'
          }
        }
        node = node.parentElement
      }
      return 'light'
    }

    const onOver = (event: MouseEvent) => {
      const ring = ringRef.current
      const label = labelRef.current
      const dot = dotRef.current
      if (!ring || !label || !dot) return

      const target =
        event.target instanceof Element ? event.target : null

      const tone = toneOf(target)
      ring.dataset.tone = tone
      dot.dataset.tone = tone
      const zone = target?.closest<HTMLElement>('[data-cursor]') ?? null
      const interactive =
        target?.closest<HTMLElement>(
          'a, button, [role="button"], summary, label, input, select, textarea, [data-clickable]',
        ) ?? null

      /* Trois états :
         — « label » : une pastille pleine qui annonce un geste (glisser…) ;
         — « stuck » : l'anneau s'accroche au bouton et prend sa forme ;
         — repos : point + anneau bleus. */
      if (zone) {
        stuck = null
        ring.dataset.big = 'label'
        delete dot.dataset.big
        label.textContent = zone.dataset.cursor ?? ''
      } else if (interactive && interactive.closest('header, [data-cursor-stick]')) {
        /* Accroche réservée à la barre de navigation (et aux éléments
           qui la demandent explicitement). */
        stuck = interactive
        ring.dataset.big = 'stuck'
        dot.dataset.big = 'stuck'
        label.textContent = ''
      } else if (interactive) {
        /* Ailleurs : l'anneau s'ouvre et se teinte, le point grossit —
           le signal « c'est cliquable », lisible sur tous les fonds. */
        stuck = null
        ring.dataset.big = 'hover'
        dot.dataset.big = 'hover'
        label.textContent = ''
      } else {
        stuck = null
        delete ring.dataset.big
        delete dot.dataset.big
        label.textContent = ''
      }

      if (!stuck) {
        ring.style.width = ''
        ring.style.height = ''
        ring.style.borderRadius = ''
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver)

    let frame = 0
    const loop = () => {
      const dot = dotRef.current
      const ring = ringRef.current

      let tx = mx
      let ty = my

      if (stuck && ring) {
        if (!stuck.isConnected) {
          stuck = null
        } else {
          const r = stuck.getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          /* Cible : le centre du bouton, tiré légèrement vers la souris. */
          tx = cx + (mx - cx) * PLAY
          ty = cy + (my - cy) * PLAY
          const w = r.width + PAD * 2
          const h = r.height + PAD * 2
          ring.style.width = `${w}px`
          ring.style.height = `${h}px`
          /* Jamais d'angle vif : un lien sans arrondi (le logo) donnerait
             un rectangle sec. On remonte au minimum à la capsule. */
          const own = Number.parseFloat(getComputedStyle(stuck).borderRadius)
          const pill = h / 2
          ring.style.borderRadius =
            Number.isFinite(own) && own > pill ? `${own}px` : `${pill}px`
        }
      }

      /* Accroché : suit vite pour coller au bouton ; libre : retard doux. */
      const ease = stuck ? 0.24 : 0.16
      rx += (tx - rx) * ease
      ry += (ty - ry) * ease

      if (dot) {
        dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`
      }
      if (ring) {
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.documentElement.classList.remove('anasawi-cursor')
      setActive(false)
    }
  }, [])

  if (!active) return null

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        /* Bleu au repos ; il s'efface quand l'anneau s'ouvre sur un
           élément cliquable — seul le halo reste. */
        /* Bleu sur fond clair, ivoire sur fond sombre. */
        className="pointer-events-none fixed left-0 top-0 z-[210] size-2 rounded-full bg-blue-deep transition-[opacity,width,height,background-color] duration-[350ms] ease-[var(--ease)] data-[tone=dark]:bg-ivory data-[big=stuck]:opacity-0"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className={[
          'group pointer-events-none fixed left-0 top-0 z-[209] grid size-[34px] place-items-center rounded-full',
          /* Bleu sur fond clair, ivoire sur fond sombre. */
          'border border-[rgba(70,114,138,0.5)] data-[tone=dark]:border-[rgba(251,248,242,0.7)]',
          'transition-[width,height,border-radius,background-color,border-color] duration-[350ms] ease-[var(--ease)]',
          /* Pastille informative : aplat bleu, libellé ivoire. */
          'data-[big=label]:size-[76px] data-[big=label]:border-blue-deep data-[big=label]:bg-blue-deep',
          /* Accroché à un bouton de la nav : taille et arrondi posés en
             inline par la boucle ; ici seulement le trait, fin et net. */
          'data-[big=stuck]:border-blue-deep data-[big=stuck]:bg-transparent',
          /* Autres éléments cliquables : rien de plus pour l'instant —
             c'est le bouton qui réagit (remplissage liquide). */
        ].join(' ')}
      >
        <span
          ref={labelRef}
          className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ivory opacity-0 transition-opacity duration-[250ms] group-data-[big=label]:opacity-100"
        />
      </div>
    </>
  )
}
