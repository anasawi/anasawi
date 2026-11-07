'use client'

import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { MOTS_CLES, type Rubrique } from '@/lib/pages-legales'

const nouvelId = () => Math.random().toString(36).slice(2, 10)

/** Une zone de texte qui grandit avec ce qu'on écrit. */
function lignesDe(texte: string) {
  return Math.min(16, Math.max(3, texte.split('\n').length + Math.floor(texte.length / 90)))
}

/**
 * Le TEXTE d'une page légale, rubrique par rubrique : un titre, un texte.
 * On réordonne, on ajoute, on retire, on revient au texte d'origine. Les
 * mots-clés ({email}…) s'insèrent d'un clic là où l'on écrit.
 */
export function RubriquesEditor({
  rubriques,
  onChange,
  depart,
  page,
}: {
  rubriques: Rubrique[]
  onChange: (next: Rubrique[]) => void
  /** Le texte d'origine, pour « Rétablir ». */
  depart: Rubrique[]
  /** « mentions » ou « confidentialité » : pour les noms accessibles. */
  page: string
}) {
  /* La dernière zone de texte touchée, et où était le curseur. */
  const derniere = useRef<{ id: string; el: HTMLTextAreaElement } | null>(null)

  const maj = (id: string, patch: Partial<Rubrique>) => onChange(rubriques.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const bouger = (i: number, vers: number) => {
    const next = [...rubriques]
    const [r] = next.splice(i, 1)
    next.splice(vers, 0, r!)
    onChange(next)
  }
  const inserer = (cle: string) => {
    const cible = derniere.current
    const jeton = `{${cle}}`
    if (!cible || !rubriques.some((r) => r.id === cible.id)) {
      /* Aucune zone choisie : à la fin de la dernière rubrique. */
      const r = rubriques.at(-1)
      if (r) maj(r.id, { texte: `${r.texte}${r.texte.endsWith(' ') || !r.texte ? '' : ' '}${jeton}` })
      return
    }
    const { el, id } = cible
    const debut = el.selectionStart ?? el.value.length
    const fin = el.selectionEnd ?? debut
    const texte = el.value.slice(0, debut) + jeton + el.value.slice(fin)
    maj(id, { texte })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(debut + jeton.length, debut + jeton.length)
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] bg-white/70 px-3.5 py-3 text-[12.5px] leading-[19px] text-muted-foreground">
        Un paragraphe par ligne vide · une liste : des lignes qui commencent par « - » · <strong className="text-foreground">**gras**</strong> · un lien :
        [texte](https://…). Les mots-clés sont remplacés par vos Réglages ; si l’information manque, la ligne disparaît. Cliquez pour en insérer un :
        <span className="mt-2 flex flex-wrap gap-1.5">
          {MOTS_CLES.map((m) => (
            <button
              key={m.cle}
              type="button"
              title={m.aide}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserer(m.cle)}
              className="rounded-full bg-[#eef4f5] px-2.5 py-1 font-mono text-[11.5px] text-[#176c79] transition-colors hover:bg-[#ddeef0]"
            >
              {`{${m.cle}}`}
            </button>
          ))}
        </span>
      </div>

      <ol className="space-y-2.5">
        {rubriques.map((r, i) => (
          <li key={r.id} className="rounded-[16px] bg-white p-3.5 shadow-[0_1px_2px_rgba(22,73,81,0.06)]">
            <div className="flex items-center gap-2">
              <input
                value={r.titre}
                onChange={(e) => maj(r.id, { titre: e.target.value })}
                placeholder="Titre de la rubrique"
                aria-label={`Titre de la rubrique ${i + 1} (${page})`}
                className="h-9 min-w-0 flex-1 rounded-[9px] bg-[#f4f7f8] px-3 text-[14px] font-semibold text-foreground outline-none placeholder:font-normal focus:bg-white focus:shadow-[0_0_0_1.5px_#176c79]"
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Monter" disabled={i === 0} onClick={() => bouger(i, i - 1)}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Descendre" disabled={i === rubriques.length - 1} onClick={() => bouger(i, i + 1)}>
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Retirer la rubrique « ${r.titre || i + 1} »`}
                onClick={() => onChange(rubriques.filter((x) => x.id !== r.id))}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
            <textarea
              value={r.texte}
              rows={lignesDe(r.texte)}
              onChange={(e) => maj(r.id, { texte: e.target.value })}
              onFocus={(e) => (derniere.current = { id: r.id, el: e.currentTarget })}
              onSelect={(e) => (derniere.current = { id: r.id, el: e.currentTarget })}
              aria-label={`Texte de la rubrique ${i + 1} (${page})`}
              className="mt-2 w-full resize-y rounded-[9px] bg-[#f4f7f8] px-3 py-2.5 text-[13.5px] leading-[1.6] text-foreground outline-none focus:bg-white focus:shadow-[0_0_0_1.5px_#176c79]"
            />
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rubriques, { id: nouvelId(), titre: '', texte: '' }])}>
          <Plus />
          Ajouter une rubrique
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm('Revenir au texte d’origine de cette page ? Vos modifications de rubriques seront remplacées.')) onChange(depart.map((r) => ({ ...r })))
          }}
        >
          <RotateCcw />
          Rétablir le texte d’origine
        </Button>
      </div>
    </div>
  )
}
