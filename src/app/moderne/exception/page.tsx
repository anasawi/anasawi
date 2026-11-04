import type { Metadata } from 'next'

import { MODELES_EXCEPTION } from '@/blocks/moderne/exception'
import { sectionsEnMemoire } from '@/blocks/moderne/defaut'
import { getBlock } from '@/blocks/registry'
import { chargerContenu } from '@/components/anasawi/charger'
import { Horizon } from '@/components/anasawi/sections'
import { Fil } from '@/components/anasawi/vivant'
import { SectionsView } from '@/components/site/SectionsView'
import { getActiveFaq, getActiveServices, getAllMedia, getSettings } from '@/server/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ANASAWI — modèles d’exception',
}

/**
 * Vitrine des modèles d'exception : chacun présenté par son numéro et son
 * idée, puis vivant, avec le vrai contenu (préremplissage).
 */
export default async function ExceptionPage() {
  const [c, settings, services, faqItems, media] = await Promise.all([
    chargerContenu(),
    getSettings(),
    getActiveServices(),
    getActiveFaq(),
    getAllMedia(),
  ])
  const sections = sectionsEnMemoire(MODELES_EXCEPTION, 'exception').map((s) => {
    const bloc = getBlock(s.type)
    return {
      ...s,
      payload: { ...((bloc?.defaults ?? {}) as Record<string, unknown>), ...(bloc?.preremplir?.(c) ?? {}) },
    }
  })
  const data = { services, faqItems, settings, media, partage: c }

  return (
    <>
      <Fil liens={[{ href: '/moderne', label: 'Le site moderne' }, { href: '/moderne/modeles', label: 'Les modèles' }]} rdv="#contact" logo={c.logo} />
      <main>
        <header className="mx-auto max-w-[1200px] px-[5vw] pb-10 pt-40 md:pt-48">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Vitrine</p>
          <h1 className="mt-3 text-[clamp(48px,8vw,120px)] leading-[0.95]">
            Modèles <em>d’exception</em>
          </h1>
          <p className="mt-6 max-w-[56ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">
            Huit sections dont le mouvement est l’idée même. Faites défiler lentement, passez la souris : chacune réagit à sa façon. Toutes
            s’ajoutent depuis l’éditeur du site moderne et se modifient entièrement.
          </p>
          <ol className="mt-10 grid gap-x-8 gap-y-2 text-[14px] text-[var(--ad-pierre)] sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.type}`} className="group inline-flex items-baseline gap-3 py-1 transition-colors hover:text-[var(--ad-nuit)]">
                  <span className="tabular-nums text-[var(--ad-or)]">{String(i + 1).padStart(2, '0')}</span>
                  {getBlock(s.type)?.label.replace('Exception — ', '')}
                </a>
              </li>
            ))}
          </ol>
        </header>

        {sections.map((s, i) => {
          const bloc = getBlock(s.type)
          return (
            <div key={s.id} id={s.type} className="scroll-mt-20">
              {/* Le cartouche : numéro, nom, idée. */}
              <div className="mx-auto mt-20 flex max-w-[1200px] items-baseline gap-5 border-t border-[var(--ad-sable-fonce)] px-[5vw] pt-6">
                <span className="font-[family-name:var(--ad-titre)] text-[42px] leading-none text-[var(--ad-or)]">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="text-[18px] font-semibold text-[var(--ad-nuit)]">{bloc?.label.replace('Exception — ', '')}</p>
                  <p className="mt-1 max-w-[70ch] text-[14px] leading-[1.6] text-[var(--ad-gris)]">{bloc?.description}</p>
                </div>
              </div>
              <SectionsView sections={[s]} data={data} />
            </div>
          )
        })}
      </main>
      <Horizon c={c} liens={[{ href: '/moderne', label: 'Le site moderne' }]} />
    </>
  )
}
