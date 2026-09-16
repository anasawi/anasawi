import type { Metadata } from 'next'

import { blockRegistry, templateLibrary } from '@/blocks/registry'
import { SectionsView } from '@/components/site/SectionsView'
import type { Section } from '@/server/db/schema'
import {
  getActiveFaq,
  getActiveServices,
  getAllMedia,
  getSettings,
} from '@/server/queries'

export const dynamic = 'force-dynamic'

/**
 * Page annexe — la bibliothèque entière, rendue en vrai.
 *
 * Chaque template est affiché avec son contenu par défaut, illustré par
 * les médias de la photothèque, dans le rendu et les animations du site
 * public. Ni indexée ni liée : un outil de revue, pas une page du site.
 */
export const metadata: Metadata = {
  title: 'Bibliothèque de templates — ANASAWI',
  robots: { index: false, follow: false },
}

/** Remplit récursivement tout champ image du payload par défaut. */
function illustrate(value: unknown, ids: string[]): unknown {
  if (ids.length === 0) return value
  if (Array.isArray(value)) return value.map((item) => illustrate(item, ids))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    let n = 0
    for (const [key, v] of Object.entries(value)) {
      if (key === 'mediaId' || key.endsWith('MediaId')) {
        out[key] = ids[n++ % ids.length] ?? null
      } else if (key === 'mediaIds' && Array.isArray(v)) {
        out[key] = ids.slice(0, 5)
      } else {
        out[key] = illustrate(v, ids)
      }
    }
    return out
  }
  return value
}

export default async function TemplatesPage() {
  const [settings, services, faqItems, media] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getActiveFaq(),
    getAllMedia(),
  ])

  const ids = media.map((m) => m.id)
  const now = new Date()
  let position = 0

  const groups = templateLibrary.map((group) => ({
    category: group.category,
    entries: group.options.map((option) => {
      const block = blockRegistry[option.type]
      const section: Section = {
        id: `preview-${option.type}`,
        pageId: 'preview',
        parentId: null,
        columnIndex: 0,
        placement: null,
        settings: null,
        styles: null,
        name: null,
        type: option.type,
        anchor: null,
        navLabel: null,
        showInNav: false,
        sortOrder: position++,
        isActive: true,
        backgroundColor: '#fbf8f2',
        payload: illustrate(block.defaults, ids) as Record<string, unknown>,
        createdAt: now,
        updatedAt: now,
      }
      return { option, section }
    }),
  }))

  return (
    <div className="pt-28">
      <div className="px-[var(--spacing-gutter)] pb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-deep">
          ✳ &nbsp;Bibliothèque
        </p>
        <h1 className="mt-5 font-serif text-[clamp(34px,4vw,56px)] font-light leading-[1.1]">
          Tous les templates, <em>en vrai</em>.
        </h1>
        <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.9] text-ink-soft">
          {groups.reduce((n, g) => n + g.entries.length, 0)} sections, avec leur
          contenu par défaut et les photos de la photothèque. Page de revue,
          non indexée.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.category}>
          <div className="border-y border-line bg-sand px-[var(--spacing-gutter)] py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
              {group.category} — {group.entries.length}
            </p>
          </div>

          {group.entries.map(({ option, section }) => (
            <div key={option.type} id={option.type}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-[var(--spacing-gutter)] py-3">
                <span className="font-serif text-[18px] font-light">
                  {option.label}
                </span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-stone">
                  {option.type}
                </span>
                <span className="text-[12.5px] text-ink-soft">
                  {option.description}
                </span>
              </div>
              <SectionsView
                sections={[section]}
                data={{ services, faqItems, settings, media }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
