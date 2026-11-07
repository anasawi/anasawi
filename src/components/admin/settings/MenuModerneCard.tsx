'use client'

import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { Field } from '../form/Field'
import { SectionCard } from '../form/SectionCard'
import type { Pied } from '@/lib/pied'

/**
 * Le menu du SITE MODERNE dans Réglages › Menu. Ses entrées ne se tapent
 * pas ici : chaque section a son champ « Dans le menu » (l'ordre du menu
 * suit celui des sections). Ici, ce qui n'appartient à aucune section :
 * le bouton de la barre et celui du menu du téléphone.
 */
export function MenuModerneCard({ pied, onChange }: { pied: Pied; onChange: (next: Pied) => void }) {
  return (
    <SectionCard
      id="menu-moderne"
      title="Menu du site"
      note="Le menu se fait tout seul : chaque section affichée y a son entrée, dans l’ordre de la page (sauf l’accueil, auquel mène votre nom, et le pied de page). Le nom de chaque entrée se change dans la section, champ « Dans le menu »."
      actions={
        <Link
          href="/admin/accueil?theme=moderne"
          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-[#176c79] shadow-[0_1px_2px_rgba(22,73,81,0.06)] hover:underline"
        >
          Renommer les entrées dans l’éditeur <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <Field
        label="Bouton de la barre"
        value={pied.boutonMenu}
        onChange={(v) => onChange({ ...pied, boutonMenu: v })}
        placeholder="Rendez-vous"
        help="À droite de la barre du haut, sur ordinateur."
      />
      <Field
        label="Bouton du menu (téléphone)"
        value={pied.boutonMenuTelephone}
        onChange={(v) => onChange({ ...pied, boutonMenuTelephone: v })}
        placeholder="Prendre rendez-vous"
        help="En bas du menu qui s’ouvre sur téléphone."
      />
    </SectionCard>
  )
}
