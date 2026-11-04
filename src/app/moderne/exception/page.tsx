import type { Metadata } from 'next'

import { EXCEPTION_PAR_CATEGORIE, MODELES_EXCEPTION } from '@/blocks/moderne/exception'
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
 * Vitrine des modèles d’exception : chacun présenté par son numéro et son
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
  const numero = (type: string) => String(MODELES_EXCEPTION.indexOf(type as never) + 1).padStart(2, '0')
  const parType = new Map(sections.map((s) => [s.type, s]))

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
            {MODELES_EXCEPTION.length} sections, trois par catégorie, dans l’esprit de l’éventail et de la frise : des cartes qui bougent comme de
            vrais objets, en continu ou au défilement. Toutes s’ajoutent depuis l’éditeur du site moderne et se modifient entièrement.
          </p>
          <nav aria-label="Sommaire" className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {EXCEPTION_PAR_CATEGORIE.map((g) => (
              <div key={g.categorie}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ad-gris)]">{g.categorie}</p>
                <ol className="mt-3 flex flex-col gap-1 text-[14px] text-[var(--ad-pierre)]">
                  {g.types.map((type) => (
                    <li key={type}>
                      <a href={`#${type}`} className="inline-flex items-baseline gap-3 py-0.5 transition-colors hover:text-[var(--ad-nuit)]">
                        <span className="tabular-nums text-[var(--ad-or)]">{numero(type)}</span>
                        {getBlock(type)?.label.replace('Exception — ', '')}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </nav>
        </header>

        {EXCEPTION_PAR_CATEGORIE.map((g) => (
          <section key={g.categorie} aria-label={g.categorie}>
            {/* Le chapitre : la catégorie de la bibliothèque. */}
            <div className="mx-auto mt-32 max-w-[1200px] px-[5vw]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--ad-or)]">Catégorie</p>
              <h2 className="mt-2 text-[clamp(36px,5vw,72px)] leading-none">{g.categorie}</h2>
            </div>
            {g.types.map((type) => {
              const s = parType.get(type)
              const bloc = getBlock(type)
              if (!s) return null
              return (
                <div key={s.id} id={type} className="scroll-mt-20">
                  {/* Le cartouche : numéro, nom, idée. */}
                  <div className="mx-auto mt-16 flex max-w-[1200px] items-baseline gap-5 border-t border-[var(--ad-sable-fonce)] px-[5vw] pt-6">
                    <span className="font-[family-name:var(--ad-titre)] text-[42px] leading-none text-[var(--ad-or)]">{numero(type)}</span>
                    <div>
                      <p className="text-[18px] font-semibold text-[var(--ad-nuit)]">{bloc?.label.replace('Exception — ', '')}</p>
                      <p className="mt-1 max-w-[70ch] text-[14px] leading-[1.6] text-[var(--ad-gris)]">{bloc?.description}</p>
                    </div>
                  </div>
                  <SectionsView sections={[s]} data={data} />
                </div>
              )
            })}
          </section>
        ))}
      </main>
      <Horizon c={c} liens={[{ href: '/moderne', label: 'Le site moderne' }]} />
    </>
  )
}
