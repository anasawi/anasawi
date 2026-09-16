import { cn } from '@/lib/utils'

/**
 * Monogramme ANASAWI — ombelle de pissenlit au trait.
 *
 * Un point central, des tiges de longueurs inégales, quelques akènes en
 * dérive. Le tracé est inline plutôt que dans un fichier .svg importé : il
 * doit hériter de `currentColor` pour basculer entre fond ivoire et fond
 * anthracite sans deux fichiers à maintenir.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-9 w-9', className)}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
      >
        <path d="M32 26 21 26M32 26 19.44 21.92M32 26 22.29 18.94M32 26 23.53 14.35M32 26 28.11 14.02M32 26 32 11M32 26 35.96 13.82M32 26 40.35 14.51M32 26 41.55 19.07M32 26 44.37 21.98M32 26 42.6 26" />
        <path d="M32 26 25.32 22.6M32 26 28.19 18.52M32 26 33.25 18.09M32 26 37.09 20.91" />
        <path d="M32 26C32 36 30.4 46 30.6 58" />
        <path d="M30.9 41c-3.3-1.6-5.5-1.2-7.1.6" />
      </g>

      <g fill="currentColor">
        <circle cx="21" cy="26" r=".85" />
        <circle cx="19.44" cy="21.92" r=".85" />
        <circle cx="22.29" cy="18.94" r=".85" />
        <circle cx="23.53" cy="14.35" r=".85" />
        <circle cx="28.11" cy="14.02" r=".85" />
        <circle cx="32" cy="11" r=".85" />
        <circle cx="35.96" cy="13.82" r=".85" />
        <circle cx="40.35" cy="14.51" r=".85" />
        <circle cx="41.55" cy="19.07" r=".85" />
        <circle cx="44.37" cy="21.98" r=".85" />
        <circle cx="42.6" cy="26" r=".85" />
        <circle cx="32" cy="26" r="1.15" />
      </g>

      {/* Akènes détachés — le détail qui donne le souffle. */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth=".85"
        strokeLinecap="round"
        opacity=".75"
      >
        <path d="M12.4 12.2 9 8.4M49.6 9.4 53.4 6.2M47 20.4 50.2 18.6" />
      </g>
      <g fill="currentColor" opacity=".75">
        <circle cx="9" cy="8.4" r=".8" />
        <circle cx="53.4" cy="6.2" r=".8" />
        <circle cx="50.2" cy="18.6" r=".7" />
      </g>
    </svg>
  )
}

export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-3.5', className)}>
      <LogoMark />
      <span
        className={cn(
          'font-serif text-[1.02rem] tracking-[0.28em] text-current',
          wordmarkClassName,
        )}
      >
        ANASAWI
      </span>
    </span>
  )
}
