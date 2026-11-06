import { styleModerneCss, typoDe, type StyleModerne } from '@/lib/style-moderne'

/**
 * Les polices et le style de la VERSION MODERNE, réglés dans
 * Réglages › Apparence (voir lib/style-moderne.ts) : la paire de polices
 * choisie (feuille Google Fonts, remontée dans <head> par React), et les
 * variables CSS des couleurs et des animations.
 *
 * Pourquoi pas `next/font` : pour ces polices, Google sert des adresses
 * de fichiers (`/l/font?kit=…`) que Turbopack ne sait pas télécharger.
 * Si la version moderne est retenue : auto-héberger les fichiers
 * (`next/font/local`). Dans l'éditeur, l'aperçu recopie les feuilles de
 * <head> : polices et couleurs y arrivent aussi.
 */
export function PoliceModerne({ style }: { style?: StyleModerne }): React.ReactElement {
  const typo = typoDe(style)
  const css = styleModerneCss(style)
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* Voulu : chargée sur /moderne et l'éditeur seulement (voir plus haut). */}
      <link rel="stylesheet" href={typo.url} precedence="default" />
      {css && (
        <style href={`style-moderne-${css.length}`} precedence="high">
          {css}
        </style>
      )}
    </>
  )
}
