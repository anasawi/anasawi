import { and, count, eq, isNull } from 'drizzle-orm'
import {
  HelpCircle,
  Image as ImageIcon,
  Mail,
  PenLine,
  Settings,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { hasUnpublishedChanges } from '@/lib/publish'
import { db } from '@/server/db'
import { contactMessages, faqItems, media, sections, services } from '@/server/db/schema'
import { getHomePageForAdmin, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

async function compter(pageId: string | null) {
  const [sectionRows, mediaRows, unreadRows, serviceRows, faqRows] = await Promise.all([
    pageId
      ? db
          .select({ n: count() })
          .from(sections)
          .where(and(eq(sections.pageId, pageId), isNull(sections.parentId)))
      : Promise.resolve([{ n: 0 }]),
    db.select({ n: count() }).from(media),
    db.select({ n: count() }).from(contactMessages).where(eq(contactMessages.isRead, false)),
    db.select({ n: count() }).from(services),
    db.select({ n: count() }).from(faqItems),
  ])
  return {
    sections: sectionRows[0]?.n ?? 0,
    media: mediaRows[0]?.n ?? 0,
    nonLus: unreadRows[0]?.n ?? 0,
    services: serviceRows[0]?.n ?? 0,
    faq: faqRows[0]?.n ?? 0,
  }
}

const pluriel = (n: number, un: string, plusieurs: string) =>
  `${n} ${n > 1 ? plusieurs : un}`

/**
 * Tableau de bord — un accueil, pas un cockpit.
 *
 * Une carte par endroit où Anne peut agir, dans l'ordre de la navigation,
 * chacune avec l'état qui compte (le site est-il en ligne ? combien de
 * messages à lire ?) et UNE action. Rien ici ne se modifie : on choisit
 * où aller.
 */
export default async function DashboardPage() {
  const [home, settings] = await Promise.all([getHomePageForAdmin(), getSettings()])
  const stats = await compter(home?.id ?? null)

  const prenom = settings.practitionerName?.split(' ')[0]

  /* Le MÊME état que dans l'éditeur : en ligne, modifications à publier,
     ou jamais publié. Le tableau de bord disait « En ligne » avec des
     modifications en attente — deux vérités pour une seule page. */
  const etatSite = !home?.publishedAt
    ? { texte: 'Jamais publié', classe: 'bg-muted text-muted-foreground' }
    : hasUnpublishedChanges(home.sections, home.publishedSnapshot)
      ? { texte: 'Modifications à publier', classe: 'bg-[#fdf4e4] text-[#8a5f1e]' }
      : { texte: 'En ligne', classe: 'bg-[#e8f4ec] text-[#256b47]' }

  const manque = [
    !settings.practitionerName && 'votre nom',
    !settings.contactEmail && 'votre e-mail de contact',
    !settings.contactPhone && 'votre téléphone',
    !settings.addressCity && 'l’adresse du cabinet',
    !settings.defaultSeoDescription && 'la description pour Google',
  ].filter((w): w is string => Boolean(w))

  const cartes = [
    {
      href: '/admin/accueil',
      icone: PenLine,
      label: 'Mon site',
      titre: 'Modifier mon site',
      detail: `${pluriel(stats.sections, 'section', 'sections')} sur la page.`,
      badge: etatSite,
    },
    {
      href: '/admin/accompagnements',
      icone: Sparkles,
      label: 'Accompagnements',
      titre: stats.services > 0 ? pluriel(stats.services, 'accompagnement', 'accompagnements') : 'Décrire mes accompagnements',
      detail: 'Ce que vous proposez, avec les textes que le site affiche.',
    },
    {
      href: '/admin/faq',
      icone: HelpCircle,
      label: 'Questions fréquentes',
      titre: stats.faq > 0 ? pluriel(stats.faq, 'question', 'questions') : 'Répondre aux questions courantes',
      detail: 'Les questions que vos visiteurs se posent avant de venir.',
    },
    {
      href: '/admin/medias',
      icone: ImageIcon,
      label: 'Médias',
      titre: stats.media > 0 ? pluriel(stats.media, 'média', 'médias') : 'Ajouter des photos',
      detail: 'Photos et vidéos, prêtes à être utilisées dans vos sections.',
    },
    {
      href: '/admin/messages',
      icone: Mail,
      label: 'Messages',
      titre: stats.nonLus > 0 ? pluriel(stats.nonLus, 'message à lire', 'messages à lire') : 'Tout est lu',
      detail:
        stats.nonLus > 0
          ? 'Quelqu’un vous a écrit depuis le site.'
          : 'Les prochains messages de vos visiteurs arriveront ici.',
      badge:
        stats.nonLus > 0
          ? { texte: pluriel(stats.nonLus, 'nouveau', 'nouveaux'), classe: 'bg-blue-mist text-blue-ink' }
          : undefined,
    },
    {
      href: '/admin/reglages',
      icone: Settings,
      label: 'Réglages',
      titre: 'Coordonnées, apparence, menu',
      detail: 'Tout ce qui vaut pour le site entier.',
    },
  ]

  return (
    <AdminContent width="wide">
      <PageHeader
        title={prenom ? `Bonjour ${prenom}` : 'Bonjour'}
        description="Votre site se modifie ici, à votre rythme — voici où il en est aujourd’hui."
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {cartes.map((carte) => {
          const Icone = carte.icone
          return (
            <Link
              key={carte.href}
              href={carte.href}
              className="group rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="flex items-center gap-2.5">
                <Icone className="h-[17px] w-[17px] text-primary" strokeWidth={1.6} />
                <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {carte.label}
                </span>
                {carte.badge && (
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2 py-px text-[11px] font-medium ${carte.badge.classe}`}
                  >
                    {carte.badge.texte}
                  </span>
                )}
              </span>
              <p className="mt-3 font-serif text-[1.3rem] leading-snug">{carte.titre}</p>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">{carte.detail}</p>
            </Link>
          )
        })}
      </div>

      {manque.length > 0 && (
        <div className="mt-[22px] rounded-xl border border-[#e8dcbe] bg-[#fcf8ee] px-[22px] py-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#6b551f]">
            À compléter quand vous aurez un moment
          </p>
          <p className="mt-2 text-[12.5px] leading-[1.6] text-[#6b551f]/90">
            Il manque encore {manque.join(', ')}. Renseigner ces informations aide
            Google à bien présenter votre site.
          </p>
          <Link
            href="/admin/reglages"
            className="mt-2.5 inline-block text-[12.5px] font-medium text-[#6b551f] underline underline-offset-2"
          >
            Compléter mes informations
          </Link>
        </div>
      )}
    </AdminContent>
  )
}
