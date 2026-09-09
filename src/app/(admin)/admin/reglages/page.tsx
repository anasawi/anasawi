import {
  Compass,
  HelpCircle,
  Mail,
  Phone,
  Search,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * Hub des paramètres — l'entrée « Paramètres » du rail.
 *
 * Une grille de cartes calmes qui mènent vers les écrans existants :
 * rien ne se règle ici, tout se choisit d'un regard.
 */

const CARDS = [
  {
    href: '/admin/parametres',
    icon: Phone,
    title: 'Coordonnées & horaires',
    description: 'Téléphone, adresse e-mail, lieu et disponibilités.',
  },
  {
    href: '/admin/navigation',
    icon: Compass,
    title: 'Menu du site',
    description: 'Les liens affichés en haut de chaque page.',
  },
  {
    href: '/admin/seo',
    icon: Search,
    title: 'Référencement',
    description: 'Comment le site apparaît sur Google.',
  },
  {
    href: '/admin/messages',
    icon: Mail,
    title: 'Messages reçus',
    description: 'Les demandes envoyées depuis le formulaire de contact.',
  },
  {
    href: '/admin/accompagnements',
    icon: Sparkles,
    title: 'Accompagnements',
    description: 'La liste de vos accompagnements et leur ordre.',
  },
  {
    href: '/admin/faq',
    icon: HelpCircle,
    title: 'Questions fréquentes',
    description: 'Les questions-réponses affichées sur le site.',
  },
] as const

export default function ReglagesHubPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ivory">
      <div className="mx-auto max-w-[680px] px-8 py-11">
        <h1 className="font-serif text-2xl font-normal">Paramètres</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Tout ce qui fait vivre le site autour des pages : coordonnées,
          menu, référencement et contenus partagés.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {CARDS.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border bg-white p-5 transition-colors hover:border-blue-deep"
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className="h-[17px] w-[17px] text-blue-deep"
                  strokeWidth={1.6}
                />
                <span className="text-[13.5px] font-medium text-foreground">
                  {title}
                </span>
              </span>
              <p className="mt-2 truncate text-[12px] text-muted-foreground">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
