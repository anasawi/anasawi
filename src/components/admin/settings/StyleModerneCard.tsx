'use client'

import { Check, RotateCcw } from 'lucide-react'

import { SectionCard } from '../form/SectionCard'
import { Button } from '@/components/ui/button'
import { TYPOS, variablesDe } from '@/components/anasawi/typos'
import { ANIMATIONS, COULEURS_MODERNES, typoDe, type CleCouleur, type StyleModerne } from '@/lib/style-moderne'
import { TEINTES, teinteHex } from '@/lib/teintes'
import { cn } from '@/lib/utils'

const BASE_DE: Record<CleCouleur, string> = { nuit: 'nuit', bleu: 'bleu', turquoise: 'turquoise', ivoire: 'ivoire', sable: 'sable' }

/**
 * Le style du SITE MODERNE dans Réglages › Apparence : ses cinq couleurs
 * (avec un aperçu qui les assemble), sa paire de polices, la vivacité des
 * animations. L'état vit dans `SettingsWorkbench`.
 */
export function StyleModerneCard({ style, onChange, nom }: { style: StyleModerne; onChange: (next: StyleModerne) => void; nom: string }) {
  const couleur = (k: CleCouleur) => style.couleurs?.[k] ?? COULEURS_MODERNES[k].defaut
  const setCouleur = (k: CleCouleur, v: string | null) => {
    const couleurs = { ...(style.couleurs ?? {}) }
    if (v && /^#[0-9a-f]{6}$/i.test(v)) couleurs[k] = v.toLowerCase()
    else delete couleurs[k]
    onChange({ ...style, couleurs })
  }
  const typo = typoDe(style)
  const [prenom, ...reste] = (nom || 'Anne Winzenried').split(' ')
  const modifiees = Object.keys(style.couleurs ?? {}).length > 0

  return (
    <>
      {/* Les polices proposées, pour les montrer dans leur vraie forme. */}
      {TYPOS.map((t) => (
        <link key={t.id} rel="stylesheet" href={t.url} precedence="default" />
      ))}

      <SectionCard
        id="couleurs-moderne"
        title="Palette"
        note="Les cinq couleurs du site. Sous chacune, ses nuances : ce sont elles qu’on retrouve dans le nuancier de chaque section (fond, panneaux)."
        layout="stack"
        actions={
          modifiees ? (
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...style, couleurs: {} })}>
              <RotateCcw />
              Revenir à la charte
            </Button>
          ) : null
        }
      >
        <div className="@container mt-4">
        <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1fr)_260px]">
          <ul className="grid gap-2.5">
            {(Object.keys(COULEURS_MODERNES) as CleCouleur[]).map((k) => {
              const c = COULEURS_MODERNES[k]
              const v = couleur(k)
              return (
                <li key={k} className="flex items-center gap-3 rounded-[14px] bg-white p-2.5 shadow-[0_1px_2px_rgba(22,73,81,0.06)]">
                  <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-[10px] ring-1 ring-black/10" style={{ background: v }}>
                    <input type="color" value={v} onChange={(e) => setCouleur(k, e.target.value)} aria-label={c.libelle} className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-foreground">{c.libelle}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{c.aide}</span>
                    {/* Les nuances de cette couleur, telles que le nuancier des sections les propose. */}
                    <span className="mt-1.5 flex gap-1">
                      {TEINTES.filter((t) => t.base === BASE_DE[k] && t.part !== 1).map((t) => (
                        <span key={t.id} title={t.nom} className="h-3.5 w-6 rounded-full ring-1 ring-black/5" style={{ background: teinteHex(t, style) }} />
                      ))}
                    </span>
                  </span>
                  <input
                    value={v}
                    onChange={(e) => setCouleur(k, e.target.value)}
                    aria-label={`${c.libelle} (code)`}
                    className="h-8 w-[84px] rounded-[8px] bg-[#f4f7f8] px-2 font-mono text-[12px] uppercase outline-none focus:bg-white focus:shadow-[0_0_0_1.5px_#176c79]"
                  />
                  {style.couleurs?.[k] && (
                    <button type="button" onClick={() => setCouleur(k, null)} aria-label={`Rétablir ${c.libelle}`} className="grid h-8 w-8 place-items-center rounded-[8px] text-muted-foreground hover:bg-muted">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {/* L'aperçu : un morceau du site avec ces couleurs et cette police. */}
          <div
            aria-hidden="true"
            className="overflow-hidden rounded-[18px] p-5 shadow-[0_1px_2px_rgba(22,73,81,0.08)]"
            style={{ background: couleur('ivoire'), color: couleur('nuit'), fontFamily: variablesDe(typo)['--ad-texte'] }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold" style={{ color: '#574d45' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: couleur('turquoise') }} />
              Aperçu
            </span>
            <p className="mt-3 text-[34px] leading-[1]" style={{ fontFamily: variablesDe(typo)['--ad-titre'], fontWeight: typo.poids }}>
              {prenom}
              <br />
              <span style={{ color: couleur('bleu'), fontStyle: typo.italique ? 'italic' : 'normal', fontWeight: typo.poidsEm }}>{reste.join(' ')}</span>
            </p>
            <div className="mt-4 rounded-[14px] p-3 text-[12.5px] leading-[1.5]" style={{ background: couleur('sable') }}>
              Un espace stable et confidentiel pour déposer ce qui pèse.
            </div>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 text-[12.5px] font-semibold text-white" style={{ background: couleur('nuit') }}>
              Prendre rendez-vous
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">↗</span>
            </span>
          </div>
        </div>
        </div>
      </SectionCard>

      <SectionCard id="typographie" title="Typographie" note="Une paire : une police pour les titres, une pour le texte. Toutes sont libres et gratuites." layout="stack">
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {TYPOS.map((t) => {
            const actif = t.id === typo.id
            const v = variablesDe(t)
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={actif}
                  onClick={() => onChange({ ...style, typo: t.id })}
                  className={cn(
                    'relative w-full rounded-[16px] bg-white p-4 text-left transition-shadow duration-300',
                    actif ? 'shadow-[0_0_0_2px_#176c79]' : 'shadow-[0_1px_2px_rgba(22,73,81,0.06)] hover:shadow-[0_0_0_1px_#cfd9db]',
                  )}
                >
                  {actif && (
                    <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#176c79] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="block text-[28px] leading-[1.05] text-[#2e424f]" style={{ fontFamily: v['--ad-titre'], fontWeight: t.poids, letterSpacing: t.espace }}>
                    {prenom} <span style={{ fontStyle: t.italique ? 'italic' : 'normal', color: '#46728a', fontWeight: t.poidsEm }}>{reste.join(' ')}</span>
                  </span>
                  <span className="mt-2 block text-[13.5px] leading-[1.5] text-[#574d45]" style={{ fontFamily: v['--ad-texte'] }}>
                    Un espace pour déposer ce qui pèse, et avancer à votre rythme.
                  </span>
                  <span className="mt-2.5 block text-[12px] font-medium text-muted-foreground">{t.nom}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </SectionCard>

      <SectionCard id="animations" title="Animations" note="La vivacité des mouvements, pour tout le site." layout="stack">
        <div role="radiogroup" aria-label="Animations" className="mt-4 grid gap-2 sm:grid-cols-3">
          {ANIMATIONS.map((a) => {
            const actif = (style.animations ?? 'normales') === a.value
            return (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => onChange({ ...style, animations: a.value })}
                className={cn('rounded-[14px] bg-white p-3.5 text-left transition-shadow', actif ? 'shadow-[0_0_0_2px_#176c79]' : 'shadow-[0_1px_2px_rgba(22,73,81,0.06)] hover:shadow-[0_0_0_1px_#cfd9db]')}
              >
                <span className="block text-[14px] font-semibold text-foreground">{a.label}</span>
                <span className="mt-1 block text-[12.5px] leading-[1.45] text-muted-foreground">{a.aide}</span>
              </button>
            )
          })}
        </div>
      </SectionCard>
    </>
  )
}
