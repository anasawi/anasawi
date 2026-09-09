/**
 * Voile de bruit fixe de la maquette — opacité .05, aucun événement.
 * Le data-URI est celui de la planche V8 (feTurbulence fractalNoise .9).
 */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")"

export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed -inset-1/2 z-[90] h-[200%] w-[200%] opacity-[0.05]"
      style={{ backgroundImage: NOISE }}
    />
  )
}
