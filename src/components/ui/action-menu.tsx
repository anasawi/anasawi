'use client'

import { MoreHorizontal } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

/**
 * Menu d'actions « ⋯ » — LE menu du CMS, partout.
 *
 * Un bouton, une liste d'actions nommées. Rien au survol seulement : le
 * bouton est toujours visible, atteignable au clavier et au doigt. Le
 * menu suit les règles d'un vrai menu : flèches pour circuler, Entrée
 * pour choisir, Échap pour fermer, retour du focus sur le bouton, clic
 * ailleurs pour fermer. Posé en position fixe dans un portail : il sort
 * des colonnes qui défilent sans être rogné.
 *
 * Pas de bibliothèque : le projet n'embarque pas de menu Radix, et un
 * menu est petit.
 */

export type ActionMenuItem = {
  label: string
  icon?: React.ReactNode
  onSelect: () => void
  /** Action destructrice : en rouge, à la fin. */
  danger?: boolean
  disabled?: boolean
  /** Aide sous le libellé, en petit. */
  hint?: string
}

export function ActionMenu({
  label,
  items,
  align = 'end',
  size = 'sm',
  trigger,
  className,
}: {
  /** Nom du bouton pour les lecteurs d'écran, ex. « Actions de « À propos » ». */
  label: string
  items: ActionMenuItem[]
  align?: 'start' | 'end'
  size?: 'sm' | 'md'
  /** Contenu du bouton — par défaut les trois points. */
  trigger?: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; right: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }, [])

  /* Position : sous le bouton, alignée sur son bord. */
  useLayoutEffect(() => {
    if (!open || !button.current) return
    const r = button.current.getBoundingClientRect()
    setPosition({
      top: r.bottom + 4,
      left: r.left,
      right: window.innerWidth - r.right,
    })
  }, [open])

  /* Pas de place en dessous (ligne en bas de l'écran) : le menu s'ouvre
     AU-DESSUS du bouton. Mesuré une fois le menu rendu — sa hauteur
     dépend de ses entrées. */
  useLayoutEffect(() => {
    if (!open || !position || !menu.current || !button.current) return
    const hauteur = menu.current.offsetHeight
    if (position.top + hauteur > window.innerHeight - 8) {
      const r = button.current.getBoundingClientRect()
      const top = Math.max(8, r.top - 4 - hauteur)
      if (top !== position.top) setPosition({ ...position, top })
    }
  }, [open, position])

  /* Focus sur le premier élément (une fois le menu POSÉ : il n'est rendu
     qu'avec sa position), clic ailleurs, Échap. */
  useEffect(() => {
    if (!open || !position) return
    const first = menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
    first?.focus()

    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (menu.current?.contains(t) || button.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, position, close])

  /* Le menu fermé oublie sa position : la prochaine ouverture la recalcule
     et ne rend rien tant qu'elle n'est pas connue. */
  useEffect(() => {
    if (!open) setPosition(null)
  }, [open])

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = Array.from(
      menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [],
    )
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      els[(i + 1) % els.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      els[(i - 1 + els.length) % els.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      els[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      els[els.length - 1]?.focus()
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  const ordinary = items.filter((i) => !i.danger)
  const dangerous = items.filter((i) => i.danger)

  /* Le NOM accessible d'une entrée est son libellé seul ; l'aide est une
     description. Sinon le lecteur d'écran (et Playwright) lisent
     « Masquer La section reste ici, mais disparaît du site » d'un bloc. */
  const rendre = (item: ActionMenuItem, index: number) => (
    <button
      key={item.label}
      type="button"
      role="menuitem"
      aria-label={item.label}
      aria-describedby={item.hint ? `${id}-aide-${index}` : undefined}
      aria-disabled={item.disabled || undefined}
      tabIndex={-1}
      onClick={() => {
        if (item.disabled) return
        close()
        item.onSelect()
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
        /* Au clavier : le fond ET un anneau — le fond seul se confond
           avec le survol, et l'on ne voit plus où l'on est. */
        'focus-visible:outline-none focus-visible:bg-blue-mist/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-deep/60',
        item.danger
          ? 'text-red-700 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:ring-destructive/50'
          : 'text-foreground hover:bg-blue-mist/60',
        item.disabled && 'cursor-default opacity-40 hover:bg-transparent',
      )}
    >
      {item.icon && (
        <span aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center [&>svg]:h-[15px] [&>svg]:w-[15px]">
          {item.icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.label}</span>
        {item.hint && (
          <span id={`${id}-aide-${index}`} className="block text-[12.5px] leading-snug text-muted-foreground">
            {item.hint}
          </span>
        )}
      </span>
    </button>
  )

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-blue-mist/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50',
          size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
          open && 'bg-blue-mist/70 text-foreground',
          className,
        )}
      >
        {trigger ?? <MoreHorizontal className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={1.8} />}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            onClick={(e) => e.stopPropagation()}
            style={
              align === 'end'
                ? { top: position.top, right: position.right }
                : { top: position.top, left: position.left }
            }
            className="fixed z-[300] min-w-[200px] rounded-[10px] border border-border bg-white p-1.5 shadow-[0_10px_30px_rgba(28,32,30,0.16)]"
          >
            {ordinary.map((item, i) => rendre(item, i))}
            {dangerous.length > 0 && ordinary.length > 0 && (
              <div role="separator" className="mx-1 my-1 border-t border-border" />
            )}
            {dangerous.map((item, i) => rendre(item, ordinary.length + i))}
          </div>,
          document.body,
        )}
    </>
  )
}
