import { and, count, eq, isNull } from 'drizzle-orm'
import {
  HelpCircle,
  Image as ImageIcon,
  LayoutTemplate,
  Mail,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

import { getBlock } from '@/blocks/registry'
import { AdminContent } from '@/components/admin/AdminContent'
import { PageHeader } from '@/components/admin/PageHeader'
import { Badge } from '@/components/ui/badge'
import { db } from '@/server/db'
import {
  contactMessages,
  faqItems,
  media,
  sections,
  services,
} from '@/server/db/schema'
import { getHomePageForAdmin, getSettings } from '@/server/queries'

export const dynamic = 'force-dynamic'

async function counts(pageId: string | null) {
  const [sectionRows, serviceRows, faqRows, mediaRows, unreadRows] =
    await Promise.all([
      pageId
        ? db
            .select({ n: count() })
            .from(sections)
            /* Seules les sections de premier niveau : les blocs placés dans
               une colonne ne sont pas des sections de la page. */
            .where(
              and(eq(sections.pageId, pageId), isNull(sections.parentId)),
            )
        : Promise.resolve([{ n: 0 }]),
      db.select({ n: count() }).from(services),
      db.select({ n: count() }).from(faqItems),
      db.select({ n: count() }).from(media),
      db
        .select({ n: count() })
        .from(contactMessages)
        .where(eq(contactMessages.isRead, false)),
    ])

  return {
    sections: sectionRows[0]?.n ?? 0,
    services: serviceRows[0]?.n ?? 0,
    faq: faqRows[0]?.n ?? 0,
    media: mediaRows[0]?.n ?? 0,
    unread: unreadRows[0]?.n ?? 0,
  }
}

export default async function DashboardPage() {
  const [home, settings] = await Promise.all([
    getHomePageForAdmin(),
    getSettings(),
  ])
  const stats = await counts(home?.id ?? null)

  const cards = [
    {
      href: '/admin/accueil',
      label: 'Sections',
      value: stats.sections,
      icon: LayoutTemplate,
    },
    {
      href: '/admin/accompagnements',
      label: 'Accompagnements',
      value: stats.services,
      icon: Sparkles,
    },
    { href: '/admin/faq', label: 'Questions', value: stats.faq, icon: HelpCircle },
    { href: '/admin/medias', label: 'Médias', value: stats.media, icon: ImageIcon },
    {
      href: '/admin/messages',
      label: 'Messages non lus',
      value: stats.unread,
      icon: Mail,
    },
  ]

  /* Signale les réglages manquants qui dégradent le SEO ou le JSON-LD.
     Mieux vaut le dire ici que laisser une donnée absente passer en prod. */
  const warnings = [
    !settings.practitionerName && 'le nom de la praticienne',
    !settings.contactEmail && 'l’e-mail de contact',
    !settings.contactPhone && 'le téléphone',
    !settings.addressCity && 'l’adresse du cabinet',
    !settings.defaultSeoDescription && 'la description SEO par défaut',
  ].filter((w): w is string => Boolean(w))

  return (
    <>
      <PageHeader title="Tableau de bord" />

      <AdminContent>
        <div className="mb-7">
          <p className="font-serif text-[1.5rem] leading-tight tracking-[-0.02em]">
            {settings.practitionerName
              ? `Le site d’${settings.practitionerName}`
              : 'Votre site'}
          </p>
          <p className="mt-1.5 text-[0.82rem] text-muted-foreground">
            Tout le contenu public se modifie ici — aucune ligne de code à
            toucher.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[6px] border border-border bg-card p-3.5 transition-colors duration-150 hover:border-input"
            >
              <card.icon
                className="h-[15px] w-[15px] text-blue-deep/70 transition-colors group-hover:text-blue-deep"
                strokeWidth={1.75}
              />
              {/* Chiffre en serif : c'est le seul endroit du CMS où une
                  donnée mérite d'être regardée plutôt que lue. */}
              <p className="mt-3 font-serif text-[1.75rem] leading-none tabular-nums">
                {card.value}
              </p>
              <p className="mt-2 text-[0.73rem] text-muted-foreground">
                {card.label}
              </p>
            </Link>
          ))}
        </div>

        {warnings.length > 0 && (
          <div className="mt-7 rounded-[6px] border border-[#e8dcbe] bg-[#fcf8ee] px-4 py-3.5">
            <p className="text-[0.8rem] font-medium text-[#6b551f]">
              Réglages à compléter
            </p>
            <p className="mt-1 text-[0.78rem] leading-[1.6] text-[#6b551f]/85">
              Ces champs restent vides et sont donc omis des données
              structurées transmises à Google : {warnings.join(', ')}.
            </p>
            <Link
              href="/admin/parametres"
              className="mt-2.5 inline-block text-[0.78rem] font-medium text-[#6b551f] underline underline-offset-2"
            >
              Compléter les paramètres
            </Link>
          </div>
        )}

        {home && (
          <section className="mt-9">
            <h2 className="mb-2.5 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Sections de la page
            </h2>

            <ul className="divide-y divide-border overflow-hidden rounded-[6px] border border-border bg-card">
              {home.sections
                .filter((section) => !section.parentId)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((section) => (
                  <li key={section.id}>
                    <Link
                      href="/admin/accueil"
                      className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors duration-150 hover:bg-secondary/50"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 rounded-[3px] ring-1 ring-inset ring-black/10"
                          style={{ backgroundColor: section.backgroundColor }}
                        />
                        <span className="truncate text-[0.82rem]">
                          {section.navLabel ?? getBlock(section.type)?.label ?? section.type}
                        </span>
                        {section.anchor && (
                          <span className="shrink-0 text-[0.73rem] text-muted-foreground">
                            #{section.anchor}
                          </span>
                        )}
                      </span>

                      <Badge variant={section.isActive ? 'success' : 'muted'}>
                        {section.isActive ? 'Visible' : 'Masquée'}
                      </Badge>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </AdminContent>
    </>
  )
}
