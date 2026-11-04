import { ArrowUpRight, Clock, Compass, Feather, HeartHandshake, Leaf, Lock, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition } from '../types'
import { contenuDe, Enveloppe } from './blocs'
import type { Contenu } from './contenu'
import { Surtitre } from '@/components/anasawi/sections'
import { Aimant, Carte, Compteur, Encre, Incline, Lignes, Revele, Semaine } from '@/components/anasawi/vivant'
import { Accordeon, CarteLumiere, Frise, ImageDevoilee, ListeVivante, Mosaique, Pile, PleinCadre, VideoCadre } from '@/components/anasawi/vivant2'
import { cn, toE164 } from '@/lib/utils'

/**
 * LES MODÈLES DE LA VERSION MODERNE — ce que la bibliothèque de l'éditeur
 * propose en plus des dix sections de départ, dans chaque catégorie :
 * ouverture, qui je suis, méthode, accompagnements, questions, photos,
 * textes, contact. Tous animés, tous dans la DA moderne, tous branchés
 * sur le contenu partagé (un champ laissé vide suit le site classique ou
 * les écrans du CMS). Vitrine : /moderne/modeles. Fond : celui du site,
 * le même pour toutes les sections ; accents turquoise. Responsifs, du
 * téléphone au grand écran.
 */

const t = z.string().default('')
const media = z.string().nullable().default(null)
const vide = (v: string | undefined) => !v || !v.trim()
const ou = (v: string | undefined, defaut: string) => (vide(v) ? defaut : v!)
const sansEtoiles = (s: string) => s.replace(/\*/g, '')

const BOUTON =
  'group inline-flex items-center gap-2.5 rounded-full bg-[var(--ad-nuit)] py-1.5 pl-5 pr-1.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(46,66,79,0.6)]'
const ROND = 'grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-transform duration-500 ease-[var(--ad-ease)] group-hover:rotate-45'
const TITRE = 'text-[36px] md:text-[54px]'
const SECTION = 'py-24 md:py-32'
const CONTENEUR = 'mx-auto max-w-[1200px] px-[5vw]'

function Action({ href, children, clair = false }: { href: string; children: React.ReactNode; clair?: boolean }) {
  return (
    <Aimant>
      <a href={href} className={cn(BOUTON, clair && 'bg-white text-[var(--ad-nuit)]')}>
        {children}
        <span className={cn(ROND, clair && 'bg-[var(--ad-nuit)] text-white')}>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </a>
    </Aimant>
  )
}


/** « Un lieu pour *se poser* » : les passages entre astérisques en accent. */
function emphase(texte: string, accent?: string) {
  return (
    <span key="t">
      {texte.split('*').map((morceau, i) =>
        i % 2 ? (
          <em key={i} className={accent}>
            {morceau}
          </em>
        ) : (
          morceau
        ),
      )}
    </span>
  )
}

const RDV = 'Prendre rendez-vous'

/** Les chiffres de départ : accompagnements, jours ouverts, questions. */
const chiffresDe = (c: Contenu) => [
  { valeur: c.services.length, suffixe: '', libelle: 'accompagnements' },
  { valeur: c.horaires.filter((h) => !/ferm/i.test(h.hours)).length, suffixe: '', libelle: 'jours de consultation' },
  { valeur: c.faq.length, suffixe: '', libelle: 'questions répondues' },
]

const base = { group: 'Sections' as const, theme: 'moderne' as const, bleed: true }

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

const pleinCadreSchema = z.object({ surtitre: t, titre: t, phrase: t, bouton: t, mediaId: media })
export const mOuverturePleineBlock: BlockDefinition<typeof pleinCadreSchema> = {
  ...base,
  label: 'Moderne — Ouverture plein cadre',
  description: 'Une photo plein écran qui avance à peine, votre nom posé dessus.',
  schema: pleinCadreSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.text('titre', 'Titre'),
    field.textarea('phrase', 'Phrase'),
    field.text('bouton', 'Bouton'),
    field.media('mediaId', 'Photo'),
  ],
  defaults: { surtitre: '', titre: '', phrase: '', bouton: '', mediaId: null },
  preremplir: (c) => ({ surtitre: `${c.metier} · ${c.ville}`, titre: c.nom, phrase: c.accroche, bouton: RDV, mediaId: c.ambiance?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.ambiance
    const [premier, ...reste] = ou(data.titre, c.nom).split(' ')
    return (
      <Enveloppe ctx={ctx}>
        <PleinCadre photo={photo}>
          <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
            {ou(data.surtitre, `${c.metier} · ${c.ville}`)}
          </p>
          <h1 className="text-[clamp(52px,10vw,168px)] leading-[0.92] text-white">
            <Lignes lignes={[premier ?? '', reste.join(' ')].filter(Boolean)} />
          </h1>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-8">
            <Revele delai={0.3}>
              <p className="max-w-[44ch] text-[17px] leading-[1.6] text-white/85">{ou(data.phrase, c.accroche)}</p>
            </Revele>
            <Revele delai={0.45}>
              <Action href={c.rdv} clair>
                {ou(data.bouton, RDV)}
              </Action>
            </Revele>
          </div>
        </PleinCadre>
      </Enveloppe>
    )
  },
}

const partageeSchema = z.object({ surtitre: t, titre: t, intro: t, bouton: t, mention: t, pastille: t, mediaId: media })
export const mOuverturePartageeBlock: BlockDefinition<typeof partageeSchema> = {
  ...base,
  label: 'Moderne — Ouverture partagée',
  description: 'Le texte d’un côté, votre portrait de l’autre, qui s’incline vers la souris.',
  schema: partageeSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.text('titre', 'Titre', { help: 'Le premier mot en noir, la suite en accent.' }),
    field.textarea('intro', 'Présentation'),
    field.text('bouton', 'Bouton'),
    field.text('mention', 'Mention à côté du bouton'),
    field.media('mediaId', 'Portrait'),
    field.text('pastille', 'Pastille sur le portrait', { help: 'Vide : pas de pastille.' }),
  ],
  defaults: { surtitre: '', titre: '', intro: '', bouton: '', mention: '', pastille: '', mediaId: null },
  preremplir: (c) => ({
    surtitre: `${c.metier} · ${c.ville}`,
    titre: c.nom,
    intro: c.ouverture.intro || c.accroche,
    bouton: RDV,
    mention: `${c.services.length} accompagnements · au cabinet ou en visio`,
    pastille: 'Nouveaux patients bienvenus',
    mediaId: c.portrait?.id ?? null,
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.portrait
    const [premier, ...reste] = ou(data.titre, c.nom).split(' ')
    return (
      <Enveloppe ctx={ctx}>
        <section className="relative overflow-hidden pb-24 pt-36 md:pb-32 md:pt-44">
          <div aria-hidden="true" className="absolute -right-[10%] top-[10%] h-[60%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgba(79,169,166,0.16),transparent)] blur-2xl" />
          <div className={cn(CONTENEUR, 'relative grid items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]')}>
            <div>
              <Surtitre>{ou(data.surtitre, `${c.metier} · ${c.ville}`)}</Surtitre>
              <h1 className="text-[clamp(48px,7.5vw,112px)] leading-[0.95]">
                <Lignes lignes={[premier ?? '', <em key="n">{reste.join(' ')}</em>]} />
              </h1>
              <Revele delai={0.3}>
                <p className="mt-7 max-w-[46ch] text-[17px] leading-[1.65] text-[var(--ad-pierre)]">{ou(data.intro, c.ouverture.intro || c.accroche)}</p>
              </Revele>
              <Revele delai={0.45} className="mt-9 flex flex-wrap items-center gap-6">
                <Action href={c.rdv}>{ou(data.bouton, RDV)}</Action>
                <span className="text-[14px] text-[var(--ad-gris)]">{ou(data.mention, `${c.services.length} accompagnements · au cabinet ou en visio`)}</span>
              </Revele>
            </div>
            <Revele delai={0.15} className="relative mx-auto w-full max-w-[460px]">
              <Incline max={9} className="aspect-[4/5]">
                <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-[var(--ad-sable-fonce)] shadow-[0_50px_100px_-50px_rgba(46,66,79,0.55)]">
                  {photo && <Image src={photo.url} alt={photo.alt} fill priority sizes="460px" className="object-cover" />}
                </div>
              </Incline>
              {(data.pastille || !data.titre) && <span className="absolute bottom-6 left-3 flex sm:-left-6 sm:bottom-12 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 py-2 text-[12.5px] font-semibold text-[var(--ad-nuit)] shadow-[0_14px_30px_-16px_rgba(46,66,79,0.4)] backdrop-blur-md motion-safe:animate-[ad-flotter_7s_ease-in-out_infinite]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6e9a6b]" />
                {ou(data.pastille, 'Nouveaux patients bienvenus')}
              </span>}
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

const chiffresSchema = z.object({
  surtitre: t,
  titre: t,
  texte: t,
  mediaId: media,
  chiffres: z.array(z.object({ valeur: z.number().default(0), suffixe: t, libelle: t })).default([]),
})
export const mPortraitChiffresBlock: BlockDefinition<typeof chiffresSchema> = {
  ...base,
  label: 'Moderne — Portrait & chiffres',
  description: 'Votre portrait, votre présentation, et des chiffres qui montent quand on les voit.',
  schema: chiffresSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre'),
    field.richtext('texte', 'Présentation'),
    field.media('mediaId', 'Portrait'),
    field.list('chiffres', 'Chiffres', [field.number('valeur', 'Nombre'), field.text('suffixe', 'Après le nombre'), field.text('libelle', 'Légende')], {
      addLabel: 'Ajouter un chiffre',
    }),
  ],
  defaults: { surtitre: '', titre: '', texte: '', mediaId: null, chiffres: [] },
  preremplir: (c) => ({
    surtitre: c.apropos.surtitre,
    titre: c.nom,
    texte: c.apropos.texte,
    mediaId: c.portrait?.id ?? null,
    chiffres: chiffresDe(c),
  }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.portrait
    const chiffres = data.chiffres.length ? data.chiffres : chiffresDe(c)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={cn(CONTENEUR, 'grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20')}>
            <Revele className="mx-auto w-full max-w-[440px] lg:max-w-none">
              <Incline max={8} className="aspect-[4/5]">
                <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-[var(--ad-sable-fonce)]">
                  {photo && <Image src={photo.url} alt={photo.alt} fill sizes="460px" className="object-cover" />}
                </div>
              </Incline>
            </Revele>
            <div>
              <Surtitre>{ou(data.surtitre, c.apropos.surtitre)}</Surtitre>
              <h2 className={TITRE}>
                <Lignes lignes={[ou(data.titre, c.nom)]} />
              </h2>
              <Encre texte={ou(data.texte, c.apropos.texte)} className="mt-8 text-[19px] font-medium leading-[1.6] tracking-[-0.01em] text-[var(--ad-nuit)]" />
              <dl className="mt-10 grid grid-cols-3 gap-2.5 sm:mt-12 sm:gap-4">
                {chiffres.slice(0, 3).map((ch, i) => (
                  <Revele key={i} delai={i * 0.1}>
                    <div className="h-full rounded-[20px] bg-white p-3.5 sm:rounded-[24px] sm:p-5 shadow-[0_1px_2px_rgba(46,66,79,0.05),0_20px_50px_-30px_rgba(46,66,79,0.25)]">
                      <dt className="sr-only">{ch.libelle}</dt>
                      <dd className="text-[30px] font-semibold leading-none sm:text-[40px] tracking-[-0.04em] text-[var(--ad-nuit)]">
                        <Compteur valeur={ch.valeur} />
                        <span className="text-[var(--ad-bleu)]">{ch.suffixe}</span>
                      </dd>
                      <p aria-hidden="true" className="mt-2 text-[12px] leading-[1.35] text-[var(--ad-gris)] [hyphens:auto] sm:text-[13px]">
                        {ch.libelle}
                      </p>
                    </div>
                  </Revele>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const parcoursSchema = z.object({
  surtitre: t,
  titre: t,
  etapes: z.array(z.object({ annee: t, titre: t, texte: t })).default([]),
})
export const mParcoursBlock: BlockDefinition<typeof parcoursSchema> = {
  ...base,
  label: 'Moderne — Parcours',
  description: 'Votre parcours en frise : le trait se remplit et chaque étape s’allume à la lecture.',
  schema: parcoursSchema,
  fields: [
    field.text('surtitre', 'Étiquette'),
    field.textarea('titre', 'Titre'),
    field.list('etapes', 'Étapes', [field.text('annee', 'Année ou période'), field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], {
      addLabel: 'Ajouter une étape',
    }),
  ],
  defaults: {
    surtitre: 'Mon parcours',
    titre: 'D’où *je viens*',
    etapes: [
      { annee: 'Formation', titre: 'Se former à l’écoute', texte: 'Décrivez ici votre formation principale.' },
      { annee: 'Pratique', titre: 'Ouvrir le cabinet', texte: 'Ce qui vous a amenée à recevoir.' },
      { annee: 'Aujourd’hui', titre: 'Accompagner', texte: 'Ce que vous proposez maintenant.' },
    ],
  },
  Component: ({ data, ctx }) => {
    const titre = ou(data.titre, 'Mon *parcours*')
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <Surtitre>{ou(data.surtitre, 'Mon parcours')}</Surtitre>
            <h2 className={cn(TITRE, 'mb-16')}>
              <Lignes lignes={[emphase(titre)]} />
            </h2>
            <Frise etapes={data.etapes} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   MA MÉTHODE
   ══════════════════════════════════════════════════════════════════════ */

const pileSchema = z.object({ surtitre: t, titre: t })
export const mPileBlock: BlockDefinition<typeof pileSchema> = {
  ...base,
  label: 'Moderne — Étapes empilées',
  description: 'Vos étapes en grandes cartes qui viennent se poser l’une sur l’autre au défilement.',
  schema: pileSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre')],
  defaults: { surtitre: '', titre: '' },
  preremplir: (c) => ({ surtitre: c.methode.surtitre, titre: c.methode.titre }),
  dataSource: { label: 'Les étapes : celles de « Ma méthode » du site classique', href: '/admin/accueil' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className="mx-auto max-w-[980px] px-[5vw]">
            <Surtitre>{ou(data.surtitre, c.methode.surtitre)}</Surtitre>
            <h2 className={cn(TITRE, 'mb-14')}>
              <Lignes lignes={[ou(data.titre, c.methode.titre)]} />
            </h2>
            <Pile etapes={c.methode.etapes} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const ICONES = [Lock, HeartHandshake, Clock, Leaf, MessageCircle, Feather]
const engagementsSchema = z.object({ surtitre: t, titre: t, items: z.array(z.object({ titre: t, texte: t })).default([]) })
export const mEngagementsBlock: BlockDefinition<typeof engagementsSchema> = {
  ...base,
  label: 'Moderne — Engagements',
  description: 'Ce que vous garantissez, en cartes dont la lumière suit la souris.',
  schema: engagementsSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre'), field.list('items', 'Engagements', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter un engagement' })],
  defaults: {
    surtitre: 'Engagements',
    titre: 'Ce sur quoi vous *pouvez compter*',
    items: [
      { titre: 'La confidentialité', texte: 'Ce qui se dit au cabinet y reste.' },
      { titre: 'L’absence de jugement', texte: 'Vous venez comme vous êtes, avec ce qui est là.' },
      { titre: 'Votre rythme', texte: 'Rien ne presse : on avance quand vous êtes prêt.' },
    ],
  },
  Component: ({ data, ctx }) => {
    const titre = data.titre
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <h2 className={cn(TITRE, 'mb-14')}>
              <Lignes lignes={[emphase(titre)]} />
            </h2>
            <ul className="grid gap-5 md:grid-cols-3">
              {data.items.map((it, i) => {
                const Icone = ICONES[i % ICONES.length]!
                return (
                  <Revele as="li" key={i} delai={i * 0.08}>
                    <CarteLumiere className="h-full">
                      <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[linear-gradient(140deg,#46728a,#7ba3b6)] text-white shadow-[0_14px_30px_-14px_rgba(70,114,138,0.7)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/lumiere:-rotate-6 group-hover/lumiere:scale-110">
                        <Icone className="h-5 w-5" />
                      </span>
                      <h3 className="mt-6 text-[22px]">{it.titre}</h3>
                      <p className="mt-2 text-[15px] leading-[1.65] text-[var(--ad-pierre)]">{it.texte}</p>
                    </CarteLumiere>
                  </Revele>
                )
              })}
            </ul>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS
   ══════════════════════════════════════════════════════════════════════ */

const listeSchema = z.object({ surtitre: t, titre: t })
export const mServicesListeBlock: BlockDefinition<typeof listeSchema> = {
  ...base,
  label: 'Moderne — Accompagnements en liste',
  description: 'De grandes lignes ; au survol, la photo flotte et suit la souris.',
  schema: listeSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre')],
  defaults: { surtitre: 'Accompagnements', titre: 'Ce que je vous *propose*' },
  dataSource: { label: 'Vos accompagnements', href: '/admin/accompagnements' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <h2 className={cn(TITRE, 'mb-12')}>
              <Lignes lignes={[emphase(titre)]} />
            </h2>
            <ListeVivante
              rdv={c.rdv}
              lignes={c.services.map((s) => ({
                id: s.id,
                titre: s.title,
                extrait: sansEtoiles(s.excerpt),
                duree: s.duration?.split(/[—–·]/)[0]?.trim() || null,
                photo: s.media,
                famille: s.group?.label ?? null,
              }))}
            />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const grilleSchema = z.object({ surtitre: t, titre: t, bouton: t })
export const mServicesGrilleBlock: BlockDefinition<typeof grilleSchema> = {
  ...base,
  label: 'Moderne — Accompagnements en grille',
  description: 'Des cartes photo qui s’inclinent vers la souris, avec un reflet de lumière.',
  schema: grilleSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre'), field.text('bouton', 'Lien de chaque carte')],
  defaults: { surtitre: 'Accompagnements', titre: 'Trouver *l’accompagnement juste*', bouton: RDV },
  dataSource: { label: 'Vos accompagnements', href: '/admin/accompagnements' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    const teintes = ['#efe6d8', '#e6edef', '#f2e8dc', '#e8ebe4', '#ede3d3', '#e4eaec']
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <h2 className={cn(TITRE, 'mb-12')}>
              <Lignes lignes={[emphase(titre)]} />
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {c.services.map((s, i) => (
                <Revele as="li" key={s.id} delai={(i % 3) * 0.08}>
                  <Incline max={6} className="h-full">
                    <a href={c.rdv} className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(46,66,79,0.05),0_24px_50px_-30px_rgba(46,66,79,0.3)]">
                      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: teintes[i % teintes.length] }}>
                        {s.media ? (
                          <Image src={s.media.url} alt="" fill sizes="(max-width: 640px) 100vw, 380px" className="object-cover transition-transform duration-[1200ms] ease-[var(--ad-ease)] group-data-[survol=oui]/incline:scale-[1.06]" />
                        ) : (
                          <HeartHandshake aria-hidden="true" className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-[var(--ad-bleu)]/50" />
                        )}
                        {s.duration && (
                          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[12px] font-semibold text-[var(--ad-nuit)] backdrop-blur">
                            <Clock className="h-3 w-3" />
                            {s.duration.split(/[—–·]/)[0]?.trim()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        {s.group && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--ad-bleu)]">{s.group.label}</p>}
                        <h3 className="mt-2 text-[24px]">{s.title}</h3>
                        <p className="mt-2 line-clamp-3 text-[15px] leading-[1.6] text-[var(--ad-pierre)]">{sansEtoiles(s.excerpt)}</p>
                        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold text-[var(--ad-nuit)]">
                          {ou(data.bouton, RDV)}
                          <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-data-[survol=oui]/incline:-translate-y-0.5 group-data-[survol=oui]/incline:translate-x-0.5" />
                        </span>
                      </div>
                    </a>
                  </Incline>
                </Revele>
              ))}
            </ul>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

const accordeonSchema = z.object({ surtitre: t, titre: t, texte: t, bouton: t })
export const mQuestionsAccordeonBlock: BlockDefinition<typeof accordeonSchema> = {
  ...base,
  label: 'Moderne — Questions en accordéon',
  description: 'Le titre reste à gauche pendant qu’on parcourt les réponses, qui s’ouvrent en douceur.',
  schema: accordeonSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre'), field.textarea('texte', 'Texte sous le titre'), field.text('bouton', 'Bouton')],
  defaults: { surtitre: 'Questions fréquentes', titre: 'Les questions *qu’on se pose*', texte: 'Une autre question ? Écrivez-moi, je réponds personnellement.', bouton: 'Me poser une question' },
  dataSource: { label: 'Vos questions fréquentes', href: '/admin/faq' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={cn(CONTENEUR, 'grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20')}>
            <div className="lg:sticky lg:top-32 lg:self-start">
              {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
              <h2 className={TITRE}>
                <Lignes lignes={[emphase(titre)]} />
              </h2>
              <Revele delai={0.2}>
                {data.texte && <p className="mt-6 max-w-[34ch] text-[16px] leading-[1.65] text-[var(--ad-pierre)]">{data.texte}</p>}
                {data.bouton && (
                  <div className="mt-6">
                    <Action href="#contact">{data.bouton}</Action>
                  </div>
                )}
              </Revele>
            </div>
            <Revele delai={0.1}>
              <Accordeon faq={c.faq} />
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS & VIDÉOS
   ══════════════════════════════════════════════════════════════════════ */

const mosaiqueSchema = z.object({ surtitre: t, titre: t })
export const mMosaiqueBlock: BlockDefinition<typeof mosaiqueSchema> = {
  ...base,
  label: 'Moderne — Mosaïque',
  description: 'Vos photos en mosaïque ; chaque tuile a sa profondeur et s’incline vers la souris.',
  schema: mosaiqueSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre')],
  defaults: { surtitre: 'Le lieu', titre: 'Le *cabinet*' },
  dataSource: { label: 'Les photos de votre médiathèque', href: '/admin/medias' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    const photos = c.photos.filter((p) => !/substitution/i.test(p.alt))
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <h2 className={cn(TITRE, 'mb-12')}>
              <Lignes lignes={[emphase(titre)]} />
            </h2>
            <Mosaique photos={photos} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const videoSchema = z.object({ titre: t, videoId: media, afficheId: media })
export const mVideoBlock: BlockDefinition<typeof videoSchema> = {
  ...base,
  label: 'Moderne — Vidéo',
  description: 'Une vidéo dans un grand cadre qui s’élargit en arrivant ; elle se lance seule, sans le son.',
  schema: videoSchema,
  fields: [field.textarea('titre', 'Titre'), field.media('videoId', 'Vidéo', { mediaKind: 'video' }), field.media('afficheId', 'Image d’attente')],
  defaults: { titre: 'Un instant *au cabinet*', videoId: null, afficheId: null },
  preremplir: (c) => ({ afficheId: c.ambiance?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    const video = data.videoId ? ctx.resolveMedia(data.videoId) : null
    const affiche = (data.afficheId ? ctx.resolveMedia(data.afficheId) : null) ?? c.ambiance
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            <div className="mb-12 text-center">
              <h2 className={TITRE}>
                <Lignes lignes={[emphase(titre)]} />
              </h2>
            </div>
            <VideoCadre video={video} affiche={affiche} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   TEXTES
   ══════════════════════════════════════════════════════════════════════ */

const defilantSchema = z.object({ mots: t })
export const mDefilantBlock: BlockDefinition<typeof defilantSchema> = {
  ...base,
  label: 'Moderne — Mots qui défilent',
  description: 'De grands mots qui défilent en deux rangs, en sens contraire.',
  schema: defilantSchema,
  fields: [field.textarea('mots', 'Les mots', { help: 'Séparés par des virgules.' })],
  defaults: { mots: '' },
  preremplir: (c) => ({ mots: [...c.services.map((s) => s.title), 'Écoute', 'Présence'].join(', ') }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const mots = vide(data.mots) ? [...c.services.map((s) => s.title), 'Écoute', 'Présence'] : data.mots.split(',').map((m) => m.trim()).filter(Boolean)
    const rang = (inverse: boolean) => (
      <div className="flex w-max" style={{ animation: `${inverse ? 'ad-defiler-inverse' : 'ad-defiler'} 40s linear infinite` }}>
        {[0, 1].map((tour) => (
          <ul key={tour} aria-hidden={tour === 1 || undefined} className="flex items-center gap-10 pr-10">
            {mots.map((m, i) => (
              <li key={`${tour}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
                <span
                  className={cn(
                    'text-[clamp(44px,7vw,110px)] font-semibold leading-none tracking-[-0.045em]',
                    (i + (inverse ? 1 : 0)) % 2 ? 'text-transparent [-webkit-text-stroke:1.5px_var(--ad-nuit)]' : 'text-[var(--ad-nuit)]',
                  )}
                >
                  {m}
                </span>
                <Sparkles aria-hidden="true" className="h-8 w-8 shrink-0 text-[var(--ad-or)]" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    )
    return (
      <Enveloppe ctx={ctx}>
        <section className="flex flex-col gap-6 overflow-hidden py-20 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
          {rang(false)}
          {rang(true)}
        </section>
      </Enveloppe>
    )
  },
}

const texteImageSchema = z.object({ surtitre: t, titre: t, texte: t, mediaId: media })
export const mTexteImageBlock: BlockDefinition<typeof texteImageSchema> = {
  ...base,
  label: 'Moderne — Texte & image',
  description: 'Un texte qui s’encre à la lecture, une image qui se dévoile de bas en haut.',
  schema: texteImageSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre'), field.richtext('texte', 'Texte'), field.media('mediaId', 'Image')],
  defaults: {
    surtitre: 'Le cabinet',
    titre: 'Un lieu pour *se poser*',
    texte: 'Un cabinet calme, lumineux, à l’écart du bruit. On y vient comme on est, on y dépose ce qui pèse, et l’on repart un peu plus léger.',
    mediaId: null,
  },
  preremplir: (c) => ({ mediaId: c.ambiance?.id ?? null }),
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    const photo = (data.mediaId ? ctx.resolveMedia(data.mediaId) : null) ?? c.ambiance
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={cn(CONTENEUR, 'grid items-center gap-14 md:grid-cols-2 md:gap-20')}>
            <div>
              <Surtitre>{data.surtitre}</Surtitre>
              <h2 className={TITRE}>
                <Lignes lignes={[emphase(titre)]} />
              </h2>
              <Encre texte={data.texte} className="mt-8 text-[20px] font-medium leading-[1.6] tracking-[-0.01em] text-[var(--ad-nuit)]" />
            </div>
            <ImageDevoilee photo={photo} />
          </div>
        </section>
      </Enveloppe>
    )
  },
}

/* ══════════════════════════════════════════════════════════════════════
   CONTACT & RENDEZ-VOUS
   ══════════════════════════════════════════════════════════════════════ */

const carteSchema = z.object({ surtitre: t, titre: t, etiquette: t, itineraire: t, appeler: t })
export const mCarteBlock: BlockDefinition<typeof carteSchema> = {
  ...base,
  label: 'Moderne — Plan d’accès',
  description: 'Une vraie carte aux couleurs du site, avec votre adresse, vos jours et l’itinéraire.',
  schema: carteSchema,
  fields: [field.text('surtitre', 'Étiquette'), field.textarea('titre', 'Titre'), field.text('etiquette', 'Étiquette de l’adresse'), field.text('itineraire', 'Bouton itinéraire'), field.text('appeler', 'Bouton appeler')],
  defaults: { surtitre: 'Accès', titre: 'Venir *au cabinet*', etiquette: 'Le cabinet', itineraire: 'Itinéraire', appeler: 'Appeler' },
  dataSource: { label: 'Votre adresse et vos horaires', href: '/admin/reglages' },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    return (
      <Enveloppe ctx={ctx}>
        <section className={SECTION}>
          <div className={CONTENEUR}>
            {data.surtitre && <Surtitre>{data.surtitre}</Surtitre>}
            <h2 className={cn(TITRE, 'mb-12')}>
              <Lignes lignes={[emphase(titre)]} />
            </h2>
            <Revele className="relative overflow-hidden rounded-[36px] shadow-[0_50px_100px_-60px_rgba(46,66,79,0.55)]">
              {/* Téléphone : la carte, puis la fiche dessous (l'épingle reste visible).
                  Grand écran : la fiche posée sur la carte, à gauche. */}
              {c.adresse ? (
                <Carte adresse={c.adresse} className="h-[300px] sm:h-[400px] md:h-[560px] md:[--centre:68%]" />
              ) : (
                <div className="h-[300px] bg-[var(--ad-brume)] md:h-[560px]" />
              )}
              <div className="relative p-3 md:pointer-events-none md:absolute md:inset-0 md:flex md:items-center md:p-10">
                <div className="pointer-events-auto w-full rounded-[24px] border border-white/70 bg-white/85 p-5 sm:p-7 md:max-w-[380px] md:rounded-[28px] shadow-[0_30px_60px_-30px_rgba(46,66,79,0.45)] backdrop-blur-xl">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ad-gris)]">
                    <MapPin className="h-4 w-4 text-[var(--ad-or)]" />
                    {data.etiquette}
                  </p>
                  <p className="mt-2 text-[22px] font-semibold leading-[1.25] tracking-[-0.02em]">{c.adresse ?? c.ville}</p>
                  <div className="mt-6">
                    <Semaine horaires={c.horaires} />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {c.adresse && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.adresse)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ad-nuit)] px-4 py-2 text-[13px] font-semibold text-white"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        {ou(data.itineraire, 'Itinéraire')}
                      </a>
                    )}
                    {c.telephone && (
                      <a href={`tel:${toE164(c.telephone)}`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ad-sable-fonce)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--ad-nuit)]">
                        <Phone className="h-3.5 w-3.5" />
                        {ou(data.appeler, 'Appeler')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}

const appelSchema = z.object({ titre: t, texte: t, bouton: t })
export const mAppelBlock: BlockDefinition<typeof appelSchema> = {
  ...base,
  label: 'Moderne — Appel',
  description: 'Un grand bandeau sombre aux halos qui dérivent, et le bouton de rendez-vous.',
  schema: appelSchema,
  fields: [field.textarea('titre', 'Titre'), field.textarea('texte', 'Texte'), field.text('bouton', 'Bouton')],
  defaults: { titre: 'Et si on commençait *par en parler* ?', texte: 'Un premier échange, sans engagement, pour voir ensemble ce qui vous conviendrait.', bouton: RDV },
  Component: ({ data, ctx }) => {
    const c = contenuDe(ctx)
    const titre = data.titre
    return (
      <Enveloppe ctx={ctx}>
        <section className="px-[3vw] py-16">
          <div className="relative isolate overflow-hidden rounded-[44px] bg-[var(--ad-nuit)] px-[6vw] py-24 text-center text-white md:py-32">
            <span aria-hidden="true" className="absolute -left-[10%] -top-[30%] -z-10 h-[80%] w-[55%] rounded-full bg-[#46728a]/60 blur-[90px] motion-safe:animate-[ad-aurore_14s_ease-in-out_infinite]" />
            <span aria-hidden="true" className="absolute -bottom-[35%] -right-[10%] -z-10 h-[85%] w-[55%] rounded-full bg-[#7ba3b6]/45 blur-[90px] motion-safe:animate-[ad-aurore_18s_ease-in-out_-6s_infinite_reverse]" />
            <h2 className="mx-auto max-w-[16ch] text-[clamp(40px,6vw,88px)] leading-[1] text-white">
              <Lignes lignes={[emphase(titre, '[-webkit-text-fill-color:#bfe5e2]! [background:none]!')]} />
            </h2>
            <Revele delai={0.3}>
              <p className="mx-auto mt-6 max-w-[44ch] text-[17px] leading-[1.6] text-white/75">{data.texte}</p>
              <div className="mt-10 flex justify-center">
                <Action href={c.rdv} clair>
                  {ou(data.bouton, RDV)}
                </Action>
              </div>
            </Revele>
          </div>
        </section>
      </Enveloppe>
    )
  },
}
