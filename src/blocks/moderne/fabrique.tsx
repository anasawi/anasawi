import { z } from 'zod'

import { field, type FieldDescriptor } from '../field'
import type { BlockContext, BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import type { Contenu } from './contenu'
import { estVide } from './textes'
import type { Media } from '@/server/db/schema'

/**
 * LA FABRIQUE DES MODÈLES MODERNES — un modèle de la bibliothèque se décrit
 * en quelques lignes : ses champs, leurs valeurs de départ (tirées du
 * contenu réel d'Anne : nom, accroche, photos, accompagnements…) et son
 * rendu. La fabrique s'occupe du reste, comme pour les sections du site :
 *
 *  - à la création, les champs sont PRÉREMPLIS avec ce qui s'affiche ;
 *  - tant qu'une section n'est pas préremplie, un champ vide suit la
 *    valeur de départ ; une fois préremplie, un champ vidé est voulu.
 */

const rempli = z.boolean().default(false)
export const t = z.string().default('')
export const media = z.string().nullable().default(null)
export const medias = z.array(z.string()).default([])
export const liste = <S extends z.ZodRawShape>(forme: S) => z.array(z.object(forme)).default([])

/** Aides communes. */
export const AIDE = {
  titre: 'Une ligne par retour à la ligne ; le mot clé entre *astérisques*.',
  lignes: 'Un élément par ligne.',
  photo: 'Vide : une photo de la photothèque.',
}

type Forme = z.ZodRawShape

export function modele<S extends Forme>(def: {
  label: string
  description: string
  forme: S
  champs: FieldDescriptor[]
  depart: (c: Contenu) => Partial<z.input<z.ZodObject<S>>>
  dataSource?: BlockDefinition<z.ZodObject<S>>['dataSource']
  rendu: (d: z.output<z.ZodObject<S>>, c: Contenu, outils: Outils) => React.ReactNode
}) {
  /* Chaque modèle a son entrée dans le menu du site : son nom se règle ici. */
  const schema = z.object({ rempli, menu: z.string().optional(), ...def.forme })
  const bloc: BlockDefinition<typeof schema> = {
    group: 'Sections',
    theme: 'moderne',
    bleed: true,
    label: def.label,
    description: def.description,
    schema,
    fields: [
      ...def.champs,
      field.text('menu', 'Dans le menu', { help: 'Toutes les sections sont dans le menu du haut, dans l’ordre de la page : ceci est le nom de son entrée. Vide : son étiquette.' }),
    ],
    defaults: schema.parse({}) as z.input<typeof schema>,
    preremplir: (c) => ({ rempli: true, menu: '', ...def.depart(c) }),
    dataSource: def.dataSource,
    Component: ({ data, ctx }) => {
      const c = contenuDe(ctx)
      const d = completer(data as Record<string, unknown>, def.depart(c) as Record<string, unknown>)
      return (
        <Enveloppe ctx={ctx}>
          <div className="ad-joie">{def.rendu(d as z.output<z.ZodObject<S>>, c, outils(ctx, c))}</div>
        </Enveloppe>
      )
    },
  }
  return bloc
}

/** Les valeurs affichées : la saisie, sinon la valeur de départ (mêmes règles que les sections du site). */
function completer(saisie: Record<string, unknown>, depart: Record<string, unknown>) {
  const r: Record<string, unknown> = { ...saisie }
  for (const k of Object.keys(depart)) {
    const v = saisie[k]
    const garder = saisie.rempli === true ? v !== undefined && v !== null : !estVide(v)
    if (!garder) r[k] = depart[k]
  }
  return r
}

export type Outils = {
  /** La photo d'un champ, sinon la n-ième de la photothèque (sans les substituts). */
  photo: (id: string | null | undefined, rang?: number) => Media | null
  /** Les photos d'un champ liste, sinon celles de la photothèque. */
  photos: (ids: string[] | undefined, n: number) => Media[]
  media: (id: string | null | undefined) => Media | null
}

function outils(ctx: BlockContext, c: Contenu): Outils {
  const fond = c.photos.filter((p) => !/substitution/i.test(p.alt) && p.mimeType?.startsWith('image'))
  const pool = fond.length ? fond : [c.ambiance, c.portrait].filter((m): m is Media => Boolean(m))
  return {
    media: (id) => (id ? ctx.resolveMedia(id) : null),
    photo: (id, rang = 0) => (id ? ctx.resolveMedia(id) : null) ?? pool[rang % Math.max(pool.length, 1)] ?? null,
    photos: (ids, n) => {
      const choisies = (ids ?? []).map((id) => ctx.resolveMedia(id)).filter((m): m is Media => Boolean(m))
      return (choisies.length ? choisies : pool).slice(0, n)
    },
  }
}

/** Le texte en lignes (champ « un élément par ligne »). */
export const enLignes = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)
