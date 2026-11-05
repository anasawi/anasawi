import type { Metadata } from 'next'

import { photosPromenade, TEXTES } from '@/blocks/moderne/textes'
import { CabinetPortes } from '@/components/anasawi/accueil'
import { CabinetBattants, CabinetBienvenue, CabinetDefile, CabinetFenetre, CabinetMur } from '@/components/anasawi/cabinet'
import { chargerContenu } from '@/components/anasawi/charger'

export const revalidate = 3600

export const metadata: Metadata = { title: 'ANASAWI — le cabinet, propositions' }

/** Banc d'essai (temporaire) : les propositions pour la section « Le cabinet », sur les vraies photos. */
export default async function CabinetPage() {
  const c = await chargerContenu()
  const photos = photosPromenade(c)
  const t = TEXTES.mPromenade()
  const props = { photos, titre: t.titre, sousTitre: t.legende }
  const propositions = [
    { nom: 'La fenêtre', idee: 'Une grande arche, une photo à la fois. À côté, les coins du cabinet : on en survole un, la photo change en fondu.', C: CabinetFenetre },
    { nom: 'Le mur de cadres', idee: 'Comme chez soi : des cadres de tailles différentes accrochés sur un mur sable, qui glissent à peine quand on descend.', C: CabinetMur },
    { nom: 'Les deux battants', idee: 'Une vraie porte, fermée. Elle s’ouvre lentement quand on arrive, et l’on découvre le cabinet.', C: CabinetBattants },
    { nom: 'Bienvenue', idee: 'La porte d’un côté ; de l’autre, les petites attentions qui vous attendent et les vignettes de chaque coin.', C: CabinetBienvenue },
    { nom: 'La promenade lente', idee: 'Une rangée de portes qui glisse sans fin, très lentement, et s’arrête dès qu’on pose la souris dessus.', C: CabinetDefile },
  ]
  return (
    <main className="pb-24">
      <header className="mx-auto max-w-[1240px] px-[6vw] pt-20 lg:px-12">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Banc d’essai</p>
        <h1 className="mt-3 text-[44px] md:text-[64px]">
          Le <em>cabinet</em>, cinq idées
        </h1>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)]">
          Chaque proposition est montrée sur les vraies photos. Notez simplement le numéro de celle qui vous plaît, ou ce que vous
          aimeriez emprunter à l’une ou l’autre.
        </p>
      </header>
      {propositions.map(({ nom, idee, C }, k) => (
        <div key={nom} className="mt-16 border-t border-[var(--ad-sable-fonce)] pt-10">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-baseline gap-x-4 gap-y-1 px-[6vw] lg:px-12">
            <span className="rounded-full bg-[var(--ad-nuit)] px-3 py-1 text-[13px] font-semibold tabular-nums text-white">{k + 1}</span>
            <span className="text-[17px] font-semibold text-[var(--ad-nuit)]">{nom}</span>
            <span className="text-[15px] text-[var(--ad-gris)]">{idee}</span>
          </div>
          <C {...props} id={`cabinet-${k + 1}`} />
        </div>
      ))}
      <div className="mt-16 border-t border-[var(--ad-sable-fonce)] pt-10">
        <div className="mx-auto flex max-w-[1240px] items-baseline gap-4 px-[6vw] lg:px-12">
          <span className="rounded-full bg-[var(--ad-sable)] px-3 py-1 text-[13px] font-semibold text-[var(--ad-nuit)]">Actuelle</span>
          <span className="text-[15px] text-[var(--ad-gris)]">Le couloir de portes, pour comparer.</span>
        </div>
        <CabinetPortes photos={photos} titre={t.titre.replace(/\*/g, '')} sousTitre={t.legende} />
      </div>
    </main>
  )
}
