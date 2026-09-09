import Link from 'next/link'

/**
 * En-tête d'écran du CMS — le même geste que la maquette Apparence/Médias :
 * un titre en serif, une phrase d'accompagnement en dessous, beaucoup d'air.
 *
 * Le composant vit DANS la colonne centrée (en premier enfant d'AdminContent) :
 * il partage donc naturellement la largeur du contenu qu'il annonce, et
 * défile avec lui — c'est un titre de page, pas une barre d'outils.
 */
export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-block text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {back.label}
        </Link>
      )}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-normal leading-tight tracking-[-0.01em]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
    </div>
  )
}
