import { ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { chargerContenu } from '@/components/anasawi/charger'
import { TYPOS, variablesDe } from '@/components/anasawi/typos'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ANASAWI — typographies à essayer',
}

/**
 * Banc d'essai typographique : chaque paire de `typos.ts`, posée sur le
 * vrai contenu (nom, accroche, présentation), avec un lien pour l'essayer
 * sur tout le site moderne.
 */
export default async function TyposPage() {
  const c = await chargerContenu()
  const [prenom, ...reste] = c.nom.split(' ')
  const extrait = c.apropos.texte.replace(/\*/g, '').split(/(?<=[.!?])\s/).slice(0, 2).join(' ')

  return (
    <main className="mx-auto max-w-[1200px] px-[5vw] py-20">
      {TYPOS.map((t) => (
        <link key={t.id} rel="stylesheet" href={t.url} precedence="default" />
      ))}
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--ad-gris)]">Banc d’essai</p>
      <h1 className="mt-3 text-[44px] md:text-[64px]">
        Typographies <em>douces</em>
      </h1>
      <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-[var(--ad-pierre)]">
        {TYPOS.length} associations choisies pour leur douceur, toutes gratuites et libres. Chacune est montrée sur votre vrai
        contenu. Le choix se fait dans Réglages › Apparence : il s’applique alors à toute la version moderne, pour tous les visiteurs.
      </p>

      <ul className="mt-14 grid gap-6 md:grid-cols-2">
        {TYPOS.map((t, i) => (
          <li
            key={t.id}
            className="flex flex-col rounded-[28px] bg-white p-8 shadow-[0_1px_2px_rgba(46,66,79,0.05),0_20px_50px_-30px_rgba(46,66,79,0.25)]"
            style={variablesDe(t) as React.CSSProperties}
          >
            <div className="flex items-baseline justify-between gap-4 text-[12px] text-[var(--ad-gris)]" style={{ fontFamily: 'system-ui' }}>
              <span>
                {String(i + 1).padStart(2, '0')} · {t.nom}
              </span>
              {i === 0 && <span className="rounded-full bg-[var(--ad-brume)] px-2.5 py-0.5 text-[var(--ad-bleu)]">actuelle</span>}
            </div>
            <h2 className="mt-6 text-[46px] leading-[1.02] md:text-[54px]" style={{ fontFamily: 'var(--ad-titre)' }}>
              {prenom} <em>{reste.join(' ')}</em>
            </h2>
            <p className="mt-4 text-[22px] leading-[1.3]" style={{ fontFamily: 'var(--ad-titre)', fontWeight: 'var(--ad-titre-poids)' as never }}>
              {c.accroche}
            </p>
            <p className="mt-4 text-[15.5px] leading-[1.7] text-[var(--ad-pierre)]" style={{ fontFamily: 'var(--ad-texte)' }}>
              {extrait}
            </p>
            <p className="mt-6 text-[13px] italic text-[var(--ad-gris)]" style={{ fontFamily: 'system-ui' }}>
              {t.esprit}
            </p>
            <Link
              href="/admin/reglages#apparence"
              className="group mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--ad-nuit)] py-1.5 pl-4 pr-1.5 text-[13px] font-semibold text-white"
              style={{ fontFamily: 'var(--ad-texte)' }}
            >
              Choisir dans les Réglages
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 transition-transform duration-500 group-hover:rotate-45">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
