import type { Metadata } from 'next'

import { sectionsEnMemoire } from '@/blocks/moderne/defaut'
import { MODELES_SIGNATURE, SIGNATURE } from '@/blocks/moderne/signature'
import { getBlock } from '@/blocks/registry'
import { chargerContenu } from '@/components/anasawi/charger'
import { Horizon } from '@/components/anasawi/sections'
import { Fil } from '@/components/anasawi/vivant'
import { SectionsView } from '@/components/site/SectionsView'
import { getActiveFaq, getActiveServices, getAllMedia, getSettings } from '@/server/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ANASAWI — la série signature',
}

/**
 * La série signature : neuf sections plein écran, présentées l'une après
 * l'autre comme un vrai site — une pastille discrète dit laquelle on voit.
 */
export default async function SignaturePage() {
  const [c, settings, services, faqItems, media] = await Promise.all([chargerContenu(), getSettings(), getActiveServices(), getActiveFaq(), getAllMedia()])
  const sections = sectionsEnMemoire(MODELES_SIGNATURE, 'signature').map((s) => {
    const bloc = getBlock(s.type)
    return { ...s, payload: { ...((bloc?.defaults ?? {}) as Record<string, unknown>), ...(bloc?.preremplir?.(c) ?? {}) } }
  })
  const data = { services, faqItems, settings, media, partage: c }
  const categorie = (type: string) => SIGNATURE.find((x) => x.type === type)?.categorie

  return (
    <>
      <Fil liens={[{ href: '/moderne', label: 'Le site moderne' }, { href: '/moderne/imagination', label: 'Le laboratoire' }]} rdv="#contact" logo={c.logo} />
      <main>
        {sections.map((s, i) => (
          <div key={s.id} id={s.type} className="relative">
            {/* La pastille : numéro, nom, catégorie. */}
            <p className="pointer-events-none absolute right-[3vw] top-24 z-40 inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--ad-nuit)] shadow-[0_6px_20px_-10px_rgba(46,66,79,0.5)] backdrop-blur">
              <span className="tabular-nums text-[var(--ad-or)]">{String(i + 1).padStart(2, '0')}</span>
              {getBlock(s.type)?.label.replace('Signature — ', '')}
              <span className="font-normal text-[var(--ad-gris)]">· {categorie(s.type)}</span>
            </p>
            <SectionsView sections={[s]} data={data} />
          </div>
        ))}
      </main>
      <Horizon c={c} liens={[{ href: '/moderne', label: 'Le site moderne' }, { href: '/moderne/imagination', label: 'Le laboratoire' }, { href: '/moderne/exception', label: 'Les modèles d’exception' }]} />
    </>
  )
}
