'use client'

import { ArrowUpRight, HelpCircle, Image as ImageIcon, MousePointerClick, Palette, Phone, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'

import type { PublishState } from './usePublish'
import { cn } from '@/lib/utils'

/**
 * Le panneau de l'éditeur quand aucune section n'est choisie : pas un
 * vide, un POINT DE DÉPART. Comment modifier, où en est la publication,
 * et les raccourcis vers tout ce qui ne se règle pas dans une section
 * (couleurs, coordonnées, accompagnements, questions, photos).
 */
export function EditorAccueil({
  theme,
  publishState,
  onAdd,
}: {
  theme: 'classique' | 'moderne'
  publishState: PublishState
  onAdd: () => void
}) {
  const etat =
    publishState === 'pending'
      ? { point: 'bg-warning', texte: 'Des modifications attendent : vos visiteurs les verront après « Publier », en haut à droite.' }
      : publishState === 'never'
        ? { point: 'bg-muted-foreground/50', texte: 'Cette page n’est pas encore publiée : « Publier », en haut à droite, la met en ligne.' }
        : { point: 'bg-success', texte: 'Tout est en ligne : vos visiteurs voient exactement cet aperçu.' }

  const raccourcis = [
    { href: '/admin/reglages#apparence', icone: Palette, titre: 'Couleurs et polices', texte: 'La palette et la typographie du site' },
    { href: '/admin/reglages', icone: Phone, titre: 'Coordonnées et horaires', texte: 'Téléphone, adresse, jours de consultation' },
    { href: '/admin/accompagnements', icone: Sparkles, titre: 'Accompagnements', texte: 'Titres, textes, durées, photos' },
    { href: '/admin/faq', icone: HelpCircle, titre: 'Questions fréquentes', texte: 'Les questions et leurs réponses' },
    { href: '/admin/medias', icone: ImageIcon, titre: 'Photos', texte: 'Ajouter, ranger, décrire vos photos' },
  ]

  return (
    <div className="adm-page flex flex-1 flex-col overflow-y-auto px-6 py-8 [scrollbar-width:thin] xl:px-10">
      <span className="mb-4 grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-accent text-[#176c79] animate-[adm-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
        <MousePointerClick className="h-[21px] w-[21px]" strokeWidth={1.8} />
      </span>
      <p className="text-[14px] font-medium text-[#8aa4a8]">{theme === 'moderne' ? 'Votre site moderne' : 'Votre site classique'}</p>
      <h2 className="mt-1.5 text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">Que voulez-vous modifier ?</h2>
      <p className="mt-2 max-w-[44ch] text-[15px] leading-[22px] text-muted-foreground">
        Cliquez sur une section, dans la liste à gauche ou directement dans l’aperçu : ses textes, ses photos et ses couleurs s’ouvrent ici.
      </p>

      <p className="mt-5 flex max-w-[52ch] items-start gap-2.5 rounded-[14px] bg-block px-4 py-3 text-[13.5px] leading-[20px] text-foreground">
        <span aria-hidden="true" className={cn('mt-[6px] h-2 w-2 shrink-0 rounded-full', etat.point)} />
        <span>
          {etat.texte}
          <span className="block text-muted-foreground">Chaque changement est enregistré tout seul, au fur et à mesure.</span>
        </span>
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium text-[#176c79] shadow-[0_0_0_1px_#dfe7e9] transition-shadow hover:shadow-[0_0_0_1.5px_#176c79]"
      >
        <Plus className="h-4 w-4" />
        {/* Pas « Ajouter une section » : c'est le nom du bouton de la liste, à gauche. */}
        Nouvelle section
      </button>

      <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8aa4a8]">Ailleurs dans l’administration</p>
      <ul className="mt-2.5 grid gap-1.5">
        {raccourcis.map((r) => {
          const Icone = r.icone
          return (
            <li key={r.href}>
              <Link
                href={r.href}
                className="group flex items-center gap-3 rounded-[14px] px-2.5 py-2 transition-colors duration-200 hover:bg-[#f4f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-block text-[#46606c]">
                  <Icone className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-foreground">{r.titre}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">{r.texte}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[#8aa4a8] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
