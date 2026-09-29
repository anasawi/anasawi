import Link from 'next/link'

/**
 * 404 de l'administration — rendue DANS le shell du CMS (rail, palette),
 * pas la 404 publique.
 *
 * Elle s'affiche quand un écran admin appelle `notFound()`. Une URL qui
 * ne correspond à aucune route (`/admin/nimporte-quoi`) reste servie par
 * `app/not-found.tsx`, c'est le fonctionnement de Next.
 */
export default function AdminNotFound() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ivory">
      <div className="mx-auto max-w-[600px] px-8 py-11 pb-24">
        <h1 className="font-serif text-2xl font-normal leading-tight tracking-[-0.01em]">
          Page introuvable
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Ce que vous cherchez n’existe pas, ou plus.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <p className="text-[13px] leading-[1.6]">
            La page a peut-être été supprimée, ou le lien que vous avez suivi
            est ancien.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex h-9 items-center rounded-lg bg-blue-deep px-4 text-[13px] text-white transition-colors hover:bg-blue-deep/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50"
            >
              Tableau de bord
            </Link>
            <Link
              href="/admin/accueil"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-4 text-[13px] transition-colors hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50"
            >
              Mon site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
