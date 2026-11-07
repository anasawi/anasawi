import { ChevronDown } from 'lucide-react'

/**
 * Un volet REPLIÉ par défaut, pour ce qui sert rarement (les réglages du
 * site classique…) : visible, mais sans encombrer l'essentiel.
 */
export function Repli({ titre, note, children }: { titre: string; note?: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[20px] bg-block p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span>
          {titre}
          {note && <span className="mt-1 block text-[13px] font-normal text-muted-foreground">{note}</span>}
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-muted-foreground shadow-[0_1px_2px_rgba(22,73,81,0.06)]">
          <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  )
}
