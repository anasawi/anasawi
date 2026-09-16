import type { SectionEdge } from '@/lib/section-settings'

/* ══════════════════════════════════════════════════════════════════════
   Bords ondulés — la transition entre deux sections.

   Le motif est dessiné DANS la section du dessous, tout en haut, rempli
   de la couleur de la section du dessus : visuellement, c'est le fond
   d'au-dessus qui vient onduler dans celle d'en dessous. Tout reste à
   l'intérieur de la boîte — aucun débordement, aucun conflit de plan.

   viewBox large et `preserveAspectRatio="none"` : la vague s'étire sur
   toute la largeur quelle que soit la taille de l'écran, et garde une
   hauteur fixe et lisible.
   ══════════════════════════════════════════════════════════════════════ */

const SHAPES: Record<Exclude<SectionEdge, 'aucun'>, string> = {
  /* Deux ondulations franches — la « vague » classique. */
  vague: 'M0 0H1440V30C1200 92 1020 8 720 40 420 72 260 4 0 34Z',
  /* Une seule grande courbe creuse — très calme. */
  courbe: 'M0 0H1440V14C1080 96 360 96 0 14Z',
  /* La même, bombée : le fond du dessus pousse vers le bas. */
  arche: 'M0 0H1440V88C1080 4 360 4 0 88Z',
  /* Plusieurs vagues plus serrées — un frémissement. */
  ondulation:
    'M0 0H1440V34C1300 80 1200 10 1050 40 900 70 810 6 660 36 510 66 420 8 270 38 180 55 90 52 0 38Z',
  /* Diagonale douce — pour changer du courbe. */
  oblique: 'M0 0H1440V8L0 92Z',
}

export function EdgeWave({
  edge,
  color,
}: {
  edge: SectionEdge
  /** Couleur de la section du dessus. */
  color: string
}) {
  if (edge === 'aucun') return null

  return (
    <svg
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      /* z négatif : au-dessus du fond de la section, sous son contenu —
         la vague ne peut jamais recouvrir un texte. */
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[clamp(36px,5vw,84px)] w-full"
    >
      {/* +1 px de recouvrement : sans lui, un liseré du fond d'en dessous
          apparaît sur la première rangée de pixels. */}
      <path d={SHAPES[edge]} fill={color} transform="translate(0,-1)" />
    </svg>
  )
}
