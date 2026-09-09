import { and, count, eq, isNull } from 'drizzle-orm'
import {
  ExternalLink,
  Image as ImageIcon,
  Mail,
  PenLine,
} from 'lucide-react'
import Link from 'next/link'

import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { db } from '@/server/db'
import { contactMessages, media, sections } from '@/server/db/schema'
import { getHomePageForAdmin, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

async function counts(pageId: string | null) {
  const [sectionRows, mediaRows, unreadRows] = await Promise.all([
    pageId
      ? db
          .select({ n: count() })
          .from(sections)
          /* Seules les sections de premier niveau : les blocs placés dans
             une colonne ne sont pas des sections de la page. */
          .where(and(eq(sections.pageId, pageId), isNull(sections.parentId)))
      : Promise.resolve([{ n: 0 }]),
    db.select({ n: count() }).from(media),
    db
      .select({ n: count() })
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false)),
  ])

  return {
    sections: sectionRows[0]?.n ?? 0,
    media: mediaRows[0]?.n ?? 0,
    unread: unreadRows[0]?.n ?? 0,
  }
}

/**
 * Tableau de bord — un accueil, pas un cockpit.
 *
 * Quatre cartes qui répondent aux vraies questions du matin : mon site
 * est-il en ligne, quelqu'un m'a-t-il écrit, où reprendre la main.
 * Aucune donnée nouvelle : tout vient des requêtes déjà en place.
 */
export default async function DashboardPage() {
  const [home, settings] = await Promise.all([
    getHomePageForAdmin(),
    getSettings(),
  ])
  const stats = await counts(home?.id ?? null)

  const firstName = settings.practitionerName?.split(' ')[0]
  const homeOnline = home?.status === 'published'

  /* Signale les informations manquantes qui dégradent la présentation
     du site sur Google. Mieux vaut le dire ici, en douceur. */
  const missing = [
    !settings.practitionerName && 'votre nom',
    !settings.contactEmail && 'votre e-mail de contact',
    !settings.contactPhone && 'votre téléphone',
    !settings.addressCity && 'l’adresse du cabinet',
    !settings.defaultSeoDescription && 'la description pour Google',
  ].filter((w): w is string => Boolean(w))

  const cardClass =
    'group rounded-xl border border-border bg-white p-5 transition-colors duration-150 hover:border-blue-deep'
  const cardTitleClass = 'flex items-center gap-2.5'
  const cardLabelClass =
    'text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground'
  const iconClass = 'h-[17px] w-[17px] text-blue-deep'

  return (
    <AdminContent>
      <PageHeader
        title={firstName ? `Bonjour ${firstName}` : 'Bonjour'}
        description="Votre site se modifie ici, à votre rythme — voici où il en est aujourd’hui."
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Link href="/admin/accueil" className={cardClass}>
          <span className={cardTitleClass}>
            <PenLine className={iconClass} strokeWidth={1.6} />
            <span className={cardLabelClass}>Mon site</span>
            <span
              className={`ml-auto shrink-0 rounded-full px-2 py-px text-[0.65rem] font-medium ${
                homeOnline
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {homeOnline ? 'En ligne' : 'Brouillon'}
            </span>
          </span>
          <p className="mt-3 font-serif text-[1.3rem] leading-snug">
            Modifier mon site
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {stats.sections}{' '}
            {stats.sections > 1 ? 'sections' : 'section'} sur votre page
            d’accueil.
          </p>
        </Link>

        <Link href="/admin/messages" className={cardClass}>
          <span className={cardTitleClass}>
            <Mail className={iconClass} strokeWidth={1.6} />
            <span className={cardLabelClass}>Messages</span>
            {stats.unread > 0 && (
              <span className="ml-auto shrink-0 rounded-full bg-blue-mist px-2 py-px text-[0.65rem] font-medium text-blue-ink">
                {stats.unread} {stats.unread > 1 ? 'nouveaux' : 'nouveau'}
              </span>
            )}
          </span>
          <p className="mt-3 font-serif text-[1.3rem] leading-snug">
            {stats.unread > 0
              ? `${stats.unread} ${stats.unread > 1 ? 'messages à lire' : 'message à lire'}`
              : 'Tout est lu'}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {stats.unread > 0
              ? 'Quelqu’un vous a écrit depuis le site.'
              : 'Les prochains messages de vos visiteurs arriveront ici.'}
          </p>
        </Link>

        <Link href="/admin/medias" className={cardClass}>
          <span className={cardTitleClass}>
            <ImageIcon className={iconClass} strokeWidth={1.6} />
            <span className={cardLabelClass}>Photos</span>
          </span>
          <p className="mt-3 font-serif text-[1.3rem] leading-snug">
            Ajouter une photo
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {stats.media > 0
              ? `${stats.media} ${stats.media > 1 ? 'photos prêtes' : 'photo prête'} à être utilisées dans vos sections.`
              : 'Vos photos seront prêtes à être utilisées dans vos sections.'}
          </p>
        </Link>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className={cardClass}
        >
          <span className={cardTitleClass}>
            <ExternalLink className={iconClass} strokeWidth={1.6} />
            <span className={cardLabelClass}>Aperçu</span>
          </span>
          <p className="mt-3 font-serif text-[1.3rem] leading-snug">
            Voir le site
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Votre site, tel que vos visiteurs le découvrent.
          </p>
        </a>
      </div>

      {missing.length > 0 && (
        <div className="mt-[22px] rounded-xl border border-[#e8dcbe] bg-[#fcf8ee] px-[22px] py-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#6b551f]">
            À compléter quand vous aurez un moment
          </p>
          <p className="mt-2 text-[12.5px] leading-[1.6] text-[#6b551f]/90">
            Il manque encore {missing.join(', ')}. Renseigner ces informations
            aide Google à bien présenter votre site.
          </p>
          <Link
            href="/admin/parametres"
            className="mt-2.5 inline-block text-[12.5px] font-medium text-[#6b551f] underline underline-offset-2"
          >
            Compléter mes informations
          </Link>
        </div>
      )}
    </AdminContent>
  )
}
