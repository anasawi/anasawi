import Link from 'next/link'

/**
 * En-tête d'écran du CMS.
 *
 * Volontairement bas et discret : c'est un repère, pas une bannière. Le fond
 * est opaque — un en-tête translucide laisse voir le contenu défiler derrière
 * le titre, ce qui salit la lecture.
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
    /* Pas `sticky` : l'en-tête est un frère du conteneur défilant, il reste
       donc en haut naturellement, sans translucidité qui laisserait voir le
       contenu passer derrière le titre. */
    <header className="z-20 shrink-0 border-b border-border bg-background">
      <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-7 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          {back && (
            <>
              <Link
                href={back.href}
                className="shrink-0 text-[0.8rem] text-muted-foreground transition-colors hover:text-foreground"
              >
                {back.label}
              </Link>
              <span aria-hidden="true" className="text-muted-foreground/45">
                /
              </span>
            </>
          )}

          {/* Serif, comme sur le site. Une seule ligne suffit à faire
              exister la marque dans l'outil, sans rien ajouter. */}
          <h1 className="truncate font-serif text-[1.05rem] leading-none tracking-[-0.015em]">
            {title}
          </h1>

          {description && (
            <span className="hidden truncate text-[0.78rem] text-muted-foreground sm:inline">
              {description}
            </span>
          )}
        </div>

        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </header>
  )
}
