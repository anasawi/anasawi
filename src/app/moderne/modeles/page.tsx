import type { Metadata } from 'next'

import { sectionsEnMemoire } from '@/blocks/moderne/defaut'
import { MODELES, MODELES_ORDRE } from '@/blocks/moderne/modeles'
import { getBlock, TEMPLATE_CATEGORIES } from '@/blocks/registry'
import { chargerContenu } from '@/components/anasawi/charger'
import { Horizon } from '@/components/anasawi/sections'
import { Fil } from '@/components/anasawi/vivant'
import { SectionsView } from '@/components/site/SectionsView'
import { getActiveFaq, getActiveServices, getAllMedia, getSettings } from '@/server/queries'

export const revalidate = 3600

export const metadata: Metadata = { title: 'ANASAWI — les modèles de la version moderne' }

/**
 * Vitrine : tous les modèles de la bibliothèque moderne, par catégorie,
 * avec le vrai contenu — exactement ce que l'on obtient en les ajoutant
 * depuis l'éditeur.
 */
export default async function ModelesModernesPage() {
  const [c, settings, services, faqItems, media] = await Promise.all([chargerContenu(), getSettings(), getActiveServices(), getActiveFaq(), getAllMedia()])
  const data = { services, faqItems, settings, media, partage: c }
  const sections = sectionsEnMemoire(MODELES_ORDRE, 'vitrine').map((s) => ({
    ...s,
    payload: (getBlock(s.type)?.defaults ?? {}) as Record<string, unknown>,
  }))
  const groupes = TEMPLATE_CATEGORIES.map((cat) => ({
    cat,
    sections: sections.filter((s) => MODELES[s.type as keyof typeof MODELES]?.[1] === cat),
  })).filter((g) => g.sections.length)

  let n = 0
  return (
    <>
      <Fil liens={groupes.map((g) => ({ href: `#cat-${g.cat}`, label: g.cat }))} rdv="#contact" logo={c.logo} />
      <main>
        <header className="mx-auto max-w-[1240px] px-[6vw] pb-6 pt-36 lg:px-12">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Bibliothèque</p>
          <h1 className="mt-3 text-[44px] md:text-[64px]">
            Les modèles <em>modernes</em>
          </h1>
          <p className="mt-4 max-w-[62ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)]">
            {sections.length} modèles, tous dans la direction artistique du site moderne, montrés avec votre vrai contenu. Chacun se trouve
            dans la bibliothèque de l’éditeur ; tous ses textes et ses photos se modifient.
          </p>
        </header>
        {groupes.map((g) => (
          <div key={g.cat} id={`cat-${g.cat}`} className="scroll-mt-24">
            <h2 className="mx-auto mt-16 max-w-[1240px] px-[6vw] text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-or)] lg:px-12" style={{ fontFamily: 'inherit' }}>
              {g.cat}
            </h2>
            {g.sections.map((s) => {
              n += 1
              return (
                <div key={s.id} className="mt-8 border-t border-[var(--ad-sable-fonce)]">
                  <div className="mx-auto flex max-w-[1240px] flex-wrap items-baseline gap-x-4 gap-y-1 px-[6vw] pt-6 lg:px-12">
                    <span className="rounded-full bg-[var(--ad-nuit)] px-3 py-1 text-[13px] font-semibold tabular-nums text-white">{n}</span>
                    <span className="text-[17px] font-semibold text-[var(--ad-nuit)]">{getBlock(s.type)?.label.replace('Moderne — ', '')}</span>
                    <span className="text-[15px] text-[var(--ad-gris)]">{getBlock(s.type)?.description}</span>
                  </div>
                  <SectionsView sections={[s]} data={data} />
                </div>
              )
            })}
          </div>
        ))}
      </main>
      <Horizon c={c} liens={[]} />
    </>
  )
}
