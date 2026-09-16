import { AdminContent } from '@/components/admin/AdminContent'

/**
 * Squelette d'attente d'un écran du CMS — rendu par les `loading.tsx` des
 * segments qui chargent leurs données depuis Neon (`force-dynamic`).
 *
 * Sobre : la place de l'en-tête, puis trois cartes grises qui pulsent.
 * Volontairement posé segment par segment (réglages, médias, messages…)
 * et NON à la racine `/admin` : un `loading.tsx` racine envelopperait aussi
 * l'éditeur de page (`/admin/accueil`, `/admin/pages/[id]`) dans un
 * `Suspense`, et l'éditeur conserve un état local important (brouillon,
 * historique, sélection). Tant que le comportement au `router.refresh()`
 * (Publier / Annuler) n'a pas été vérifié en navigateur, on ne prend pas
 * ce risque.
 */
export function AdminLoading({
  width = 'default',
}: {
  width?: 'narrow' | 'default' | 'wide'
}) {
  return (
    <AdminContent width={width}>
      <div
        role="status"
        aria-label="Chargement"
        aria-busy="true"
        className="animate-pulse"
      >
        {/* En-tête : titre + phrase d'accompagnement */}
        <div className="mb-6">
          <div className="h-7 w-48 rounded-md bg-foreground/[0.08]" />
          <div className="mt-2.5 h-3.5 w-80 max-w-full rounded bg-foreground/[0.06]" />
        </div>

        {/* Trois cartes, comme les blocs blancs des écrans réels */}
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-white p-5"
            >
              <div className="h-3.5 w-40 rounded bg-foreground/[0.08]" />
              <div className="mt-3 h-3 w-full rounded bg-foreground/[0.05]" />
              <div className="mt-2 h-3 w-4/5 rounded bg-foreground/[0.05]" />
            </div>
          ))}
        </div>

        <span className="sr-only">Chargement…</span>
      </div>
    </AdminContent>
  )
}
