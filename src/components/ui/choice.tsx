'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * Un choix parmi plusieurs — LE menu déroulant du CMS.
 *
 * Enveloppe le `Select` (Radix) avec son libellé et son aide, pour que
 * chaque liste déroulante de l'administration se ressemble et se manie
 * pareil (clavier, lecteur d'écran, focus). Les `<select>` natifs, stylés
 * à la main ici et là, disparaissent au profit de celui-ci.
 */
export function Choice<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  help,
  className,
  hideLabel = false,
}: {
  id: string
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  help?: string
  className?: string
  /** Libellé pour le lecteur d'écran seulement (deux choix côte à côte). */
  hideLabel?: boolean
}) {
  return (
    <div className={className}>
      <Label
        htmlFor={id}
        className={cn(
          'mb-[5px] block text-[12px] font-normal text-ink-soft',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id} aria-label={hideLabel ? label : undefined} className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help && <p className="mt-1.5 text-[11.5px] leading-[1.5] text-stone">{help}</p>}
    </div>
  )
}
