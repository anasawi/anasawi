import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import type { Contenu } from './contenu'
import { BoiteAMots, Cairn, CairnLegende, CielDuJour, Jardin, Lettre, Meteo, Nuancier, Respiration, RendezVous, Ricochets } from '@/components/anasawi/imagination'
import { enLignes, Surtitre } from '@/components/anasawi/sections'
import { Lignes, Revele } from '@/components/anasawi/vivant'

/**
 * LE LABORATOIRE D'IMAGINATION — dix modèles qui inventent une petite
 * expérience propre au métier d'Anne. Vitrine : /moderne/imagination.
 * Comme les autres blocs modernes : préremplis, tout modifiable.
 */

const t = z.string().default('')
const commun = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }
const TITRE = 'Une ligne par retour à la ligne ; le mot clé entre *astérisques*.'
const SECTION = 'overflow-x-clip py-24 md:py-32'
const CONTENEUR = 'mx-auto max-w-[1200px] px-[5vw]'
const lignesDe = (s: string) => s.split('\n').map((m) => m.trim()).filter(Boolean)

const teteSchema = { surtitre: t, titre: t, texte: t }
const champsTete = [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre', { help: TITRE }), field.textarea('texte', 'Texte')]

/** En-tête commun, centré. */
function Tete({ surtitre, titre, texte }: { surtitre: string; titre: string; texte: string }) {
  if (!surtitre && !titre && !texte) return null
  return (
    <div className="mx-auto mb-14 max-w-[760px] text-center">
      {surtitre && (
        <div className="flex justify-center">
          <Surtitre>{surtitre}</Surtitre>
        </div>
      )}
      {titre && (
        <h2 className="text-[clamp(34px,4.6vw,60px)]">
          <Lignes lignes={enLignes(titre)} />
        </h2>
      )}
      {texte && (
        <Revele delai={0.2}>
          <p className="mt-6 text-[16.5px] leading-[1.7] text-[var(--ad-pierre)]">{texte}</p>
        </Revele>
      )}
    </div>
  )
}

/** Un bloc « en-tête + expérience » : le gabarit des dix modèles. */
function bloc<S extends z.ZodRawShape>(def: {
  label: string
  description: string
  extra?: S
  champs?: ReturnType<typeof field.text>[]
  defauts: { surtitre: string; titre: string; texte: string } & { [K in keyof S]: z.infer<S[K]> }
  preremplir?: (c: Contenu) => Partial<{ surtitre: string; titre: string; texte: string } & { [K in keyof S]: z.infer<S[K]> }>
  source?: { label: string; href: string }
  rendu: (c: Contenu, data: { surtitre: string; titre: string; texte: string } & { [K in keyof S]: z.infer<S[K]> }) => React.ReactNode
}) {
  const schema = z.object({ ...teteSchema, ...(def.extra ?? ({} as S)) })
  const b: BlockDefinition<typeof schema> = {
    ...commun,
    label: def.label,
    description: def.description,
    schema,
    fields: [...champsTete, ...(def.champs ?? [])],
    defaults: def.defauts as z.infer<typeof schema>,
    preremplir: (c) => ({ ...def.defauts, ...(def.preremplir?.(c) ?? {}) }),
    ...(def.source ? { dataSource: def.source } : {}),
    Component: ({ data, ctx }) => {
      const c = contenuDe(ctx)
      const d = data as Parameters<typeof def.rendu>[1]
      return (
        <Enveloppe ctx={ctx}>
          <section className={SECTION}>
            <div className={CONTENEUR}>
              <Tete surtitre={d.surtitre} titre={d.titre} texte={d.texte} />
              {def.rendu(c, d)}
            </div>
          </section>
        </Enveloppe>
      )
    },
  }
  return b
}

const PHRASES = [
  'Vous avez le droit de prendre votre temps.',
  'Ce que vous ressentez a du sens.',
  'Demander de l’aide, c’est déjà avancer.',
  'Un pas, même petit, reste un pas.',
  'Vous n’avez pas à tout porter seul·e.',
  'Aujourd’hui, soyez doux avec vous-même.',
  'Il n’y a pas une bonne façon d’aller mieux : il y a la vôtre.',
].join('\n')

export const mImRespirationBlock = bloc({
  label: 'Imagination — La respiration',
  description: 'Un grand cercle qui inspire et expire avec le visiteur (4 s, 4 s), la couleur qui change, et un compteur de respirations.',
  defauts: { surtitre: 'Une pause', titre: 'Respirez *avec nous*', texte: '' },
  preremplir: (c) => ({ texte: c.accroche }),
  rendu: () => <Respiration />,
})

export const mImMeteoBlock = bloc({
  label: 'Imagination — La météo intérieure',
  description: '« Comment ça va, aujourd’hui ? » On choisit un temps : le bloc prend sa couleur, le ciel s’anime, et un mot doux répond.',
  defauts: { surtitre: 'Et vous ?', titre: 'Quel temps fait-il *en vous* ?', texte: '' },
  rendu: (c) => <Meteo rdv={c.rdv} />,
})

export const mImCairnBlock = bloc({
  label: 'Imagination — Le cairn',
  description: 'Les étapes sont des galets de couleur : au défilement, ils descendent un à un et s’empilent, en équilibre.',
  extra: { etapes: z.array(z.object({ titre: t, texte: t })).default([]) },
  champs: [field.list('etapes', 'Étapes', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' }) as ReturnType<typeof field.text>],
  defauts: { surtitre: 'Ma méthode', titre: 'Pierre après *pierre*', texte: '', etapes: [] },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, etapes: c.methode.etapes }),
  rendu: (c, d) => {
    const e = d.etapes.filter((x) => x.titre.trim())
    const etapes = e.length ? e : c.methode.etapes
    return (
      <>
        <Cairn etapes={etapes} />
        <CairnLegende etapes={etapes} />
      </>
    )
  },
})

export const mImBoiteBlock = bloc({
  label: 'Imagination — La boîte à mots doux',
  description: 'On appuie sur la boîte : un mot doux sort sur une carte de couleur et se pose sur la pile des précédents.',
  extra: { phrases: t },
  champs: [field.textarea('phrases', 'Mots doux', { help: 'Un par ligne.' })],
  defauts: { surtitre: 'Pour vous', titre: 'Un mot *doux*', texte: '', phrases: PHRASES },
  rendu: (_c, d) => <BoiteAMots phrases={lignesDe(d.phrases || PHRASES)} />,
})

export const mImJardinBlock = bloc({
  label: 'Imagination — Le jardin',
  description: 'Chaque accompagnement est une fleur : les tiges poussent, les pétales s’ouvrent, tout se balance au vent ; survolée, une fleur dit son nom.',
  defauts: { surtitre: 'Accompagnements', titre: 'Ce qui peut *pousser*', texte: '' },
  source: { label: 'Les accompagnements', href: '/admin/accompagnements' },
  rendu: (c) => <Jardin services={c.services} rdv={c.rdv} />,
})

export const mImCielBlock = bloc({
  label: 'Imagination — Le ciel du jour',
  description: 'Le ciel tel qu’il est maintenant au cabinet — aube, journée, soir ou nuit, le soleil ou la lune à sa place —, l’heure et si c’est ouvert.',
  defauts: { surtitre: 'En ce moment', titre: 'Au cabinet, *maintenant*', texte: '' },
  source: { label: 'Les horaires', href: '/admin/reglages' },
  rendu: (c) => <CielDuJour horaires={c.horaires} ville={c.ville} />,
})

export const mImRicochetsBlock = bloc({
  label: 'Imagination — Les ricochets',
  description: 'Les questions sont des galets sur l’eau : on en touche un, des ronds s’élargissent et la réponse remonte à la surface.',
  defauts: { surtitre: 'Questions', titre: 'Faites *des ricochets*', texte: '' },
  source: { label: 'Les questions', href: '/admin/questions' },
  rendu: (c) => <Ricochets faq={c.faq} />,
})

export const mImLettreBlock = bloc({
  label: 'Imagination — La lettre',
  description: 'Une enveloppe de couleur : en arrivant, le rabat s’ouvre et la lettre remonte, avec son texte et sa signature.',
  extra: { lettre: t, signature: t },
  champs: [field.textarea('lettre', 'La lettre'), field.text('signature', 'Signature')],
  defauts: { surtitre: 'Qui je suis', titre: 'Un mot *pour vous*', texte: '', lettre: '', signature: '' },
  preremplir: (c) => ({ surtitre: c.apropos.surtitre, lettre: c.apropos.texte, signature: c.nom }),
  rendu: (c, d) => <Lettre texte={d.lettre || c.apropos.texte} signature={d.signature || c.nom} />,
})

export const mImRendezVousBlock = bloc({
  label: 'Imagination — Le rendez-vous en trois gestes',
  description: 'Quel accompagnement, au cabinet ou en visio, et c’est prêt : la carte confirme avec quelques confettis et mène au vrai lien de rendez-vous.',
  defauts: { surtitre: 'Rendez-vous', titre: 'En *trois gestes*', texte: '' },
  source: { label: 'Les accompagnements', href: '/admin/accompagnements' },
  rendu: (c) => <RendezVous services={c.services} rdv={c.rdv} />,
})

export const mImNuancierBlock = bloc({
  label: 'Imagination — Le nuancier',
  description: 'Des lames de couleur, comme chez le peintre, chacune portant une valeur : elles s’ouvrent en éventail, et celle qu’on survole sort du paquet.',
  extra: { mots: t },
  champs: [field.textarea('mots', 'Valeurs', { help: 'Une par ligne, sept au plus.' })],
  defauts: { surtitre: 'Ce qui m’anime', titre: 'Mes *couleurs*', texte: '', mots: 'Écoute\nConfiance\nPrésence\nRespect\nLien\nDouceur\nClarté' },
  rendu: (_c, d) => <Nuancier mots={lignesDe(d.mots || 'Écoute')} />,
})

/** Les modèles du laboratoire, avec leur catégorie de bibliothèque. */
export const IMAGINATION = [
  { type: 'mImRespiration', categorie: 'Textes' },
  { type: 'mImMeteo', categorie: 'Accompagnements' },
  { type: 'mImCairn', categorie: 'Ma méthode' },
  { type: 'mImBoite', categorie: 'Textes' },
  { type: 'mImJardin', categorie: 'Accompagnements' },
  { type: 'mImCiel', categorie: 'Contact & rendez-vous' },
  { type: 'mImRicochets', categorie: 'Questions' },
  { type: 'mImLettre', categorie: 'Qui je suis' },
  { type: 'mImRendezVous', categorie: 'Contact & rendez-vous' },
  { type: 'mImNuancier', categorie: 'Qui je suis' },
] as const

export const MODELES_IMAGINATION = IMAGINATION.map((x) => x.type)
