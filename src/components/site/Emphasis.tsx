import { Fragment } from 'react'

/**
 * Rend `*mot*` en italique serif.
 *
 * C'est le seul balisage inline autorisé dans les titres. L'italique n'est pas
 * décorative : elle porte le mot-pivot de la phrase (« un espace *intérieur*
 * où respirer »). Un unique motif, contrôlable depuis le CMS, sans ouvrir la
 * porte au HTML arbitraire.
 */
export function Emphasis({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <em key={i} className="italic">
              {part.slice(1, -1)}
            </em>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

/**
 * Version texte brut d'une ligne balisée.
 *
 * À utiliser dès qu'un titre saisi dans le CMS sert ailleurs qu'à l'affichage
 * — `<title>`, texte alternatif, JSON-LD — pour qu'aucune astérisque ne se
 * retrouve indexée.
 */
export function stripEmphasis(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1')
}
