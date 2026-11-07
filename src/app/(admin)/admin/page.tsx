import { ChevronRight, Eye, HeartHandshake, Mail, PenLine, Settings } from 'lucide-react'
import { cookies } from 'next/headers'
import Link from 'next/link'

import { getBlock } from '@/blocks/registry'
import { AdminContent } from '@/components/admin/AdminContent'
import { ChoixVersion } from '@/components/admin/ChoixVersion'
import { PASTELS, toneOf } from '@/components/admin/editor/sectionTone'
import { MediaThumb } from '@/components/admin/MediaThumb'
import { buttonVariants } from '@/components/ui/button'
import { hasUnpublishedChanges } from '@/lib/publish'
import { cn, formatDate, truncate } from '@/lib/utils'
import { adresseSite, COOKIE_VERSION, lireVersion } from '@/lib/version-admin'
import type { Section } from '@/server/db/schema'
import {
  getAllServices,
  getHomePageForAdmin,
  getMessages,
  getModernPageForAdmin,
  getSettings,
  getUnreadCount,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

const pluriel = (n: number, un: string, plusieurs: string) =>
  `${n} ${n > 1 ? plusieurs : un}`

/* `labelOf` de SectionRail vit dans un module client : pas appelable ici. */
const labelOf = (s: Section) => s.name ?? getBlock(s.type)?.label ?? 'Section'

/** Le premier texte parlant d'une section — sa ligne de résumé. */
function resumeDe(section: Section): string | null {
  const payload = (section.payload ?? {}) as Record<string, unknown>
  for (const cle of ['title', 'heading', 'titre', 'nom', 'eyebrow', 'surtitre', 'subtitle', 'text', 'texte', 'body', 'intro', 'quote']) {
    const v = payload[cle]
    if (typeof v === 'string' && v.trim()) {
      return truncate(v.replace(/<[^>]+>/g, ' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim(), 70)
    }
  }
  return null
}

/** Une couleur stable par expéditrice — la même que dans « Messages ». */
function pastelDe(nom: string) {
  let h = 0
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PASTELS[h % PASTELS.length]!
}

/** En-tête d'une carte de la colonne : titre, compte, lien. */
function TeteCarte({
  titre,
  detail,
  href,
  lien,
}: {
  titre: string
  detail?: string
  href: string
  lien: string
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[16px] font-semibold text-foreground">
        {titre}
        {detail && <span className="ml-2 text-[13px] font-medium text-[#8aa4a8]">{detail}</span>}
      </h2>
      <Link
        href={href}
        className="group/lien inline-flex items-center gap-0.5 text-[13px] font-medium text-[#176c79] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {lien}
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/lien:translate-x-0.5" />
      </Link>
    </div>
  )
}

/**
 * Tableau de bord — l'accueil de l'espace Qeeps.
 *
 * Le bandeau (bonjour, l'état du site en pastilles, les deux actions),
 * puis un cadre gris à deux colonnes : à gauche « Votre page », le plan
 * du site section par section ; à droite ce qui bouge — les derniers
 * messages, et les accompagnements.
 */
export default async function DashboardPage() {
  /* Tout en parallèle, en un seul aller-retour : le compte des sections
     se lit sur la page elle-même, celui des accompagnements sur la liste. */
  /* La version sur laquelle on travaille (retenue depuis l'éditeur). */
  const version = lireVersion((await cookies()).get(COOKIE_VERSION)?.value)
  const [home, settings, messages, services, nonLus] = await Promise.all([
    version === 'moderne' ? getModernPageForAdmin() : getHomePageForAdmin(),
    getSettings(),
    getMessages(4),
    getAllServices(),
    getUnreadCount(),
  ])
  const stats = { nonLus, services: services.length }

  const prenom = settings.practitionerName?.split(' ')[0]
  const racines = (home?.sections ?? [])
    .filter((s) => !s.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  /* Le MÊME état que dans l'éditeur : en ligne, modifications à publier,
     ou jamais publié. */
  const etat = !home?.publishedAt
    ? { texte: 'Jamais publié', point: 'bg-muted-foreground/50', phrase: 'Votre site n’est pas encore publié.' }
    : hasUnpublishedChanges(home.sections, home.publishedSnapshot)
      ? { texte: 'Modifications à publier', point: 'bg-warning', phrase: 'Des modifications attendent d’être publiées.' }
      : { texte: 'Site en ligne', point: 'bg-success', phrase: 'Votre site est en ligne et à jour.' }

  const manque = [
    !settings.practitionerName,
    !settings.contactEmail,
    !settings.contactPhone,
    !settings.addressCity,
    !settings.defaultSeoDescription,
  ].filter(Boolean).length

  const chip = 'inline-flex h-[30px] items-center gap-[7px] rounded-full bg-white/70 px-3 text-[13px] font-medium'

  return (
    <AdminContent width="wide">
      {/* ── Le bandeau ─────────────────────────────────────────────── */}
      <section
        aria-label="État du site"
        className="relative isolate flex flex-wrap items-end justify-between gap-6 overflow-hidden rounded-[24px] bg-[#f6f8f8] px-6 py-7 sm:px-8"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-[40%] -z-10 bg-[radial-gradient(closest-side_at_18%_30%,rgba(221,247,247,1),transparent),radial-gradient(closest-side_at_62%_70%,rgba(209,237,224,0.8),transparent),radial-gradient(closest-side_at_92%_25%,rgba(243,221,226,0.85),transparent)] blur-[10px] motion-safe:animate-[adm-drift_18s_ease-in-out_infinite_alternate]"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[14px] font-medium leading-[17px] text-[#8aa4a8]">Tableau de bord</p>
            <ChoixVersion version={version} />
          </div>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[36px] sm:leading-[44px]">
            {prenom ? `Bonjour ${prenom}` : 'Bonjour'}{' '}
            <span
              aria-hidden="true"
              className="inline-block origin-[70%_70%] text-[30px] motion-safe:animate-[adm-wave_2.2s_ease-in-out_0.4s_1]"
            >
              👋
            </span>
          </h1>
          <p className="mt-1 text-[16px] leading-[22px] text-muted-foreground">{etat.phrase}</p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className={cn(chip, 'text-foreground')}>
              <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${etat.point}`} />
              {etat.texte}
            </span>
            {stats.nonLus > 0 && (
              <Link href="/admin/messages" className={cn(chip, 'text-[#176c79] transition-colors hover:bg-white')}>
                <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                {pluriel(stats.nonLus, 'non lu', 'non lus')}
              </Link>
            )}
            <span className={cn(chip, 'text-muted-foreground')}>
              {pluriel(stats.services, 'accompagnement', 'accompagnements')}
            </span>
            {home?.publishedAt && (
              <span className={cn(chip, 'text-muted-foreground')}>
                Publié le {formatDate(home.publishedAt)}
              </span>
            )}
            {manque > 0 && (
              <Link href="/admin/reglages" className={cn(chip, 'text-warning-ink transition-colors hover:bg-white')}>
                <Settings className="h-3.5 w-3.5" strokeWidth={2} />
                {pluriel(manque, 'information à compléter', 'informations à compléter')}
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={adresseSite(version)} className={buttonVariants({ variant: 'secondary' })}>
            <Eye strokeWidth={1.75} />
            Voir le site
          </Link>
          <Link href={`/admin/accueil?theme=${version}`} className={buttonVariants()}>
            <PenLine strokeWidth={1.75} />
            Modifier mon site
          </Link>
        </div>
      </section>

      {/* ── Le cadre gris, deux colonnes ───────────────────────────── */}
      <div className="grid gap-2 rounded-[24px] bg-block p-2 bloc-ecran lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Votre page */}
        <section aria-labelledby="votre-page" className="min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-[20px] [scrollbar-width:thin] bg-white p-5 sm:p-6">
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
            <h2 id="votre-page" className="text-[16px] font-semibold text-foreground">
              {version === 'moderne' ? 'Votre site moderne' : 'Votre site classique'}
              <span className="ml-2 text-[13px] font-medium text-[#8aa4a8]">
                {pluriel(racines.length, 'section', 'sections')}
              </span>
            </h2>
            <Link
              href={`/admin/accueil?theme=${version}`}
              className="group/lien inline-flex items-center gap-0.5 text-[13px] font-medium text-[#176c79] transition-colors hover:text-foreground"
            >
              Ouvrir l’éditeur
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/lien:translate-x-0.5" />
            </Link>
          </div>

          {racines.length === 0 ? (
            <p className="rounded-[16px] bg-block px-5 py-8 text-center text-[14px] text-muted-foreground">
              Aucune section pour l’instant — ajoutez la première depuis l’éditeur.
            </p>
          ) : (
            <ul className="flex flex-col">
              {racines.map((section, index) => {
                const tone = toneOf(section.type, index)
                const Icone = tone.icon
                const resume = resumeDe(section)
                return (
                  <li key={section.id}>
                    <Link
                      href={`/admin/accueil?theme=${version}&section=${section.id}`}
                      className={cn(
                        'group flex items-center gap-3.5 rounded-[14px] px-2 py-2.5 transition-colors duration-[250ms] hover:bg-[#f7f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        !section.isActive && 'opacity-50',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.06]"
                        style={{ background: tone.bg, color: tone.fg }}
                      >
                        <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-foreground">
                          {labelOf(section)}
                          {!section.isActive && (
                            <span className="ml-2 text-[12px] font-medium text-[#8aa4a8]">Masquée</span>
                          )}
                        </span>
                        {resume && (
                          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{resume}</span>
                        )}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#8aa4a8] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain rounded-[20px] [scrollbar-width:thin]">
          {/* Messages */}
          <section aria-label="Derniers messages" className="rounded-[20px] bg-white p-5 sm:p-6">
            <TeteCarte
              titre="Messages"
              detail={stats.nonLus > 0 ? pluriel(stats.nonLus, 'non lu', 'non lus') : undefined}
              href="/admin/messages"
              lien="Tout voir"
            />
            {messages.length === 0 ? (
              <p className="flex items-center gap-3 rounded-[16px] bg-block px-4 py-5 text-[14px] text-muted-foreground">
                <Mail className="h-[18px] w-[18px] text-[#8aa4a8]" strokeWidth={1.75} />
                Aucun message pour l’instant.
              </p>
            ) : (
              <ul className="flex flex-col">
                {messages.map((m) => {
                  const p = pastelDe(m.name)
                  return (
                    <li key={m.id}>
                      <Link
                        href="/admin/messages"
                        className="group flex items-center gap-3 rounded-[14px] px-2 py-2.5 transition-colors duration-[250ms] hover:bg-[#f7f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span aria-hidden="true" className="relative shrink-0">
                          <span
                            className="grid h-9 w-9 place-items-center rounded-full text-[14px] font-semibold"
                            style={{ background: p.bg, color: p.fg }}
                          >
                            {m.name.trim().charAt(0).toUpperCase() || '?'}
                          </span>
                          {!m.isRead && (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#176c79]" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span
                              className={cn(
                                'min-w-0 flex-1 truncate text-[14px]',
                                m.isRead ? 'font-medium text-[#46606c]' : 'font-semibold text-foreground',
                              )}
                            >
                              {m.name}
                            </span>
                            <time dateTime={m.createdAt.toISOString()} className="shrink-0 text-[12px] text-[#8aa4a8]">
                              {formatDate(m.createdAt)}
                            </time>
                          </span>
                          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                            {truncate(m.message, 80)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Accompagnements */}
          <section aria-label="Accompagnements" className="rounded-[20px] bg-white p-5 sm:p-6">
            <TeteCarte
              titre="Accompagnements"
              detail={services.length > 0 ? String(services.length) : undefined}
              href="/admin/accompagnements"
              lien="Gérer"
            />
            {services.length === 0 ? (
              <p className="flex items-center gap-3 rounded-[16px] bg-block px-4 py-5 text-[14px] text-muted-foreground">
                <HeartHandshake className="h-[18px] w-[18px] text-[#8aa4a8]" strokeWidth={1.75} />
                Aucun accompagnement pour l’instant.
              </p>
            ) : (
              <ul className="flex flex-col">
                {services.slice(0, 5).map((s, i) => {
                  const p = PASTELS[i % PASTELS.length]!
                  return (
                    <li key={s.id}>
                      <Link
                        href="/admin/accompagnements"
                        className="group flex items-center gap-3 rounded-[14px] px-2 py-2 transition-colors duration-[250ms] hover:bg-[#f7f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          aria-hidden="true"
                          className="relative grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-[10px]"
                          style={{ background: p.bg, color: p.fg }}
                        >
                          {s.media ? (
                            <MediaThumb media={s.media} sizes="56px" />
                          ) : (
                            <HeartHandshake className="h-[18px] w-[18px]" strokeWidth={1.75} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-foreground">{s.title}</span>
                          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                            {s.group?.label ?? s.method ?? s.duration ?? 'Présenté seul'}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium',
                            s.isActive ? 'bg-success-soft text-success-ink' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {s.isActive ? 'En ligne' : 'Masqué'}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminContent>
  )
}
