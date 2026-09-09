import { cn } from '@/lib/utils'
import { toParagraphs } from '@/blocks/types'

/**
 * Rend un champ « richtext » (paragraphes séparés par une ligne vide).
 * Volontairement sans HTML arbitraire : le CMS ne stocke que du texte, ce
 * qui supprime toute surface d'injection et garantit une typographie stable.
 */
export function Prose({
  text,
  className,
  size = 'base',
}: {
  text: string
  className?: string
  size?: 'base' | 'lead'
}) {
  const paragraphs = toParagraphs(text)
  if (paragraphs.length === 0) return null

  return (
    <div
      className={cn(
        'text-ink-soft',
        size === 'lead'
          ? 'text-[length:var(--text-lead)] leading-[1.65]'
          : 'text-[0.975rem] leading-[1.78]',
        className,
      )}
    >
      {paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? 'mt-[1.1em]' : undefined}>
          {p}
        </p>
      ))}
    </div>
  )
}
