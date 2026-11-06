import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'

import { Accueil, RencontreDouce } from './accueil'
import { CabinetDefile } from './cabinet'
import { Aimant, Arches, Carte, Chemin, Conversation, Conviction, Lettre, Lignes, Revele, Semaine, SemaineListe, Souffle } from './vivant'
import type { Contenu } from '@/blocks/moderne/contenu'
import { photosPromenade, TEXTES } from '@/blocks/moderne/textes'
import { LogoMark } from '@/components/site/Logo'
import { LiensLegaux, PiedExtras } from '@/components/site/PiedExtras'
import { cn, toE164 } from '@/lib/utils'

/**
 * Les sections de la nouvelle DA d’Anasawi (couleurs chaudes du classique), responsives. Chacune a une idée, une
 * seule, et un mouvement qui la sert :
 *
 *   Seuil          on passe la porte : l'arche s'ouvre sur le cabinet
 *   Respiration    un cercle qui respire — inspirez, expirez
 *   Rencontre      le portrait dans l'arche, son sceau qui tourne, un
 *                  texte qui s'encre à la lecture
 *   Chemin         les étapes reliées par un trait d'or qui se dessine
 *   Arches         les accompagnements, une arche chacun, qui s'ouvre
 *   Phrase         une conviction, en très grand
 *   Promenade      le cabinet pièce par pièce, en glissant de côté
 *   Conversation   les questions, comme une messagerie
 *   Rendez-vous    la semaine allumée, et une lettre plutôt qu'un
 *                  formulaire
 *   Horizon        le pied de page, arrondi comme l'arche
 */

type P = { c: Contenu }
type T<K extends keyof typeof TEXTES> = ReturnType<(typeof TEXTES)[K]>

const prenomDe = (nom: string) => nom.split(' ')[0] ?? nom
const nomDe = (nom: string) => nom.split(' ').slice(1).join(' ') || nom

/** Un texte saisi avec ses accents (« *mot* ») : le mot clé en <em>. */
export function accent(texte: string): React.ReactNode {
  const morceaux = texte.split('*')
  if (morceaux.length < 2) return texte
  return morceaux.map((m, i) => (i % 2 ? <em key={i}>{m}</em> : m))
}

/** Un titre saisi : une ligne par retour à la ligne, accents compris. */
export function enLignes(texte: string): React.ReactNode[] {
  return texte
    .split('\n')
    .filter((l) => l.trim())
    .map((l, i) => <span key={i}>{accent(l)}</span>)
}

/** Surtitre : un trait d'or et des petites capitales. */
export function Surtitre({ children, clair = false }: { children: React.ReactNode; clair?: boolean }) {
  return (
    <p
      className={cn(
        'mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold',
        clair ? 'bg-white/10 text-white/80' : 'bg-white text-[var(--ad-pierre)] shadow-[0_1px_2px_rgba(46,66,79,0.06),0_4px_14px_-6px_rgba(46,66,79,0.12)]',
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]" />
      {children}
    </p>
  )
}

/* ── Seuil ──────────────────────────────────────────────────────────── */

export function SectionSeuil({ c, t = TEXTES.mSeuil(c) }: P & { t?: T<'mSeuil'> }) {
  const photo = c.ambiance ?? c.portrait
  /* La petite porte : une tasse si la photothèque en a une, sinon une autre photo du cabinet. */
  const autres = c.photos.filter((p) => p.id !== photo?.id && p.id !== c.portrait?.id && !/substitution/i.test(p.alt))
  const tasse = autres.find((p) => /tasse|th[ée]|caf[ée]|tea|coffee|cup/i.test(p.alt)) ?? autres[0] ?? null
  return (
    <Accueil
      surtitre={t.surtitre}
      prenom={prenomDe(t.nom)}
      nom={nomDe(t.nom)}
      intro={t.intro}
      photo={photo}
      tasse={tasse}
      pastilles={[t.pastille2, t.pastille3].filter(Boolean)}
      rdv={c.rdv}
      bouton={t.bouton}
      bouton2={t.bouton2}
      invitation={t.invitation}
    />
  )
}

/* ── Respiration ────────────────────────────────────────────────────── */

export function Respiration({ t = TEXTES.mRespiration() }: Partial<P> & { t?: T<'mRespiration'> }) {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto grid max-w-[1240px] items-center gap-16 px-[6vw] lg:px-12 md:grid-cols-2">
        <div>
          {t.surtitre && <Surtitre>{t.surtitre}</Surtitre>}
          <h2 className="text-[clamp(38px,4.6vw,62px)] leading-[1.04]">
            <Lignes lignes={enLignes(t.titre)} />
          </h2>
          <Revele delai={0.3}>
            <p className="mt-8 max-w-[42ch] text-[17px] leading-[1.75] text-[var(--ad-pierre)]">{t.texte}</p>
          </Revele>
        </div>
        {/* Le cercle qui respire — et l'exercice guidé d'une minute. */}
        <Souffle bouton={t.bouton} />
      </div>
    </section>
  )
}

/* ── Rencontre ──────────────────────────────────────────────────────── */

export function Rencontre({ c, t = TEXTES.mRencontre(c) }: P & { t?: T<'mRencontre'> }) {
  /* Une petite porte sur le cabinet : une fenêtre, une plante, une lampe… */
  const autres = c.photos.filter((p) => p.id !== c.portrait?.id && p.id !== c.ambiance?.id && !/substitution|tasse|th[ée]/i.test(p.alt))
  const cabinet = autres.find((p) => /fen[eê]tre|plante|lampe|lumi[eè]re|porte|fauteuil/i.test(p.alt)) ?? autres[0] ?? null
  return (
    <RencontreDouce
      surtitre={t.surtitre}
      titre={t.titre}
      texte={t.texte}
      citation={t.citation}
      signature={prenomDe(c.nom)}
      portrait={c.portrait}
      cabinet={cabinet}
    />
  )
}

/* ── Chemin ─────────────────────────────────────────────────────────── */

export function SectionChemin({ c, t = TEXTES.mChemin(c) }: P & { t?: T<'mChemin'> }) {
  return (
    <section id="methode" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-[6vw] lg:px-12">
        <div className="mb-16 text-center md:mb-24">
          <div className="flex justify-center">
            {t.surtitre && <Surtitre>{t.surtitre}</Surtitre>}
          </div>
          <h2 className="text-[clamp(38px,4.6vw,62px)] leading-[1.04]">
            <Lignes lignes={enLignes(t.titre)} />
          </h2>
          {t.intro && (
            <Revele delai={0.2}>
              <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.7] text-[var(--ad-pierre)]">{t.intro}</p>
            </Revele>
          )}
        </div>
        <Chemin etapes={t.etapes.filter((e) => e.titre?.trim())} />
      </div>
    </section>
  )
}

/* ── Arches ─────────────────────────────────────────────────────────── */

export function SectionArches({ c, t = TEXTES.mArches(c) }: P & { t?: T<'mArches'> }) {
  return (
    <section id="accompagnements" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            {t.surtitre && <Surtitre>{t.surtitre}</Surtitre>}
            <h2 className="text-[clamp(38px,4.6vw,62px)] leading-[1.04]">
              <Lignes lignes={enLignes(t.titre)} />
            </h2>
          </div>
          {t.texte && (
            <Revele delai={0.2}>
              <p className="max-w-[34ch] text-[15px] leading-[1.7] text-[var(--ad-pierre)]">{t.texte}</p>
            </Revele>
          )}
        </div>
        <Revele>
          <Arches services={c.services} rdv={c.rdv} bouton={t.bouton} />
        </Revele>
      </div>
    </section>
  )
}

/* ── En pratique ────────────────────────────────────────────────────── */

/** Un « bento » : tout ce qu'on cherche avant d'appeler, en cartes
    vivantes — le plan qui bat, l'onde de la visio, les séances. */
export function EnPratique({ c, t = TEXTES.mEnPratique() }: P & { t?: T<'mEnPratique'> }) {
  const carte =
    'relative isolate overflow-hidden rounded-[28px] bg-white p-7 shadow-[0_1px_2px_rgba(46,66,79,0.05),0_20px_50px_-30px_rgba(46,66,79,0.25)] transition-[box-shadow,translate] duration-500 ease-[var(--ad-ease)] hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(46,66,79,0.06),0_30px_60px_-30px_rgba(46,66,79,0.35)]'
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        {t.surtitre && <Surtitre>{t.surtitre}</Surtitre>}
        <h2 className="mb-12 text-[clamp(38px,4.6vw,62px)] leading-[1.04]">
          <Lignes lignes={enLignes(t.titre)} />
        </h2>
        <div className="grid gap-4 md:auto-rows-[minmax(220px,auto)] md:grid-cols-4">
          {/* Le plan : une vraie carte, teintée aux couleurs du site. */}
          <Revele className={cn(carte, 'relative overflow-hidden p-0 md:col-span-2 md:row-span-2')}>
            {c.adresse ? (
              <Carte adresse={c.adresse} className="h-[260px] sm:h-[320px] md:absolute md:inset-0 md:h-auto" />
            ) : (
              <div aria-hidden="true" className="h-[200px] bg-[var(--ad-brume)] md:absolute md:inset-0 md:h-auto" />
            )}
            {/* Téléphone : l'adresse SOUS la carte (l'épingle reste visible).
                Grand écran : posée dessus, en bas. */}
            <div className="relative p-3 md:pointer-events-none md:flex md:h-full md:min-h-[340px] md:flex-col md:justify-end md:p-5">
              <div className="pointer-events-auto rounded-[20px] bg-white/90 p-5 shadow-[0_14px_40px_-20px_rgba(46,66,79,0.4)] backdrop-blur">
                <p className="text-[13px] font-semibold text-[var(--ad-gris)]">{t.cabinet}</p>
                <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">{c.adresse ?? c.ville}</p>
                {c.adresse && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.adresse)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group -my-1 mt-2 inline-flex items-center gap-1.5 py-2 text-[14px] font-semibold text-[var(--ad-bleu)]"
                  >
                    {t.itineraire}
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                )}
              </div>
            </div>
          </Revele>

          {/* Les séances. */}
          <Revele delai={0.08} className={cn(carte, 'md:col-span-2')}>
            <p className="text-[13px] font-semibold text-[var(--ad-gris)]">{t.seances}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {c.services.slice(0, 4).map((s) => (
                <li key={s.id} className="group/seance flex items-center justify-between gap-4 text-[15px]">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <span aria-hidden="true" className="h-1.5 w-0 shrink-0 rounded-full bg-[var(--ad-or)] transition-[width] duration-500 ease-[var(--ad-ease)] group-hover/seance:w-3" />
                    <span className="truncate transition-transform duration-500 ease-[var(--ad-ease)]">{s.title}</span>
                  </span>
                  {s.duration && (
                    <span className="shrink-0 rounded-full bg-[var(--ad-sable)] px-3 py-1 text-[12.5px] font-semibold tabular-nums text-[var(--ad-pierre)] transition-colors duration-500 group-hover/seance:bg-[var(--ad-nuit)] group-hover/seance:text-white">
                      {s.duration.split(/[—–]/)[0]!.trim()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Revele>

          {/* La visio, et son onde. */}
          <Revele delai={0.16} className={cn(carte, 'flex flex-col justify-between')}>
            <div aria-hidden="true" className="flex h-12 items-center gap-1">
              {[0.1, 0.35, 0.6, 0.2, 0.45, 0.7, 0.3].map((d, i) => (
                <span
                  key={i}
                  className="h-full w-1.5 origin-center rounded-full bg-gradient-to-t from-[#46728a] to-[#7ba3b6] motion-safe:animate-[ad-onde_1.2s_ease-in-out_infinite]"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>
            <div>
              <p className="text-[18px] font-semibold tracking-[-0.02em]">{t.visioTitre}</p>
              <p className="mt-1 text-[14px] leading-[1.5] text-[var(--ad-gris)]">{t.visioTexte}</p>
            </div>
          </Revele>

          {/* Les jours : toute la semaine, aujourd'hui surligné. */}
          <Revele delai={0.24} className={cn(carte, 'flex flex-col gap-3 px-6 py-6')}>
            <p className="text-[13px] font-semibold text-[var(--ad-gris)]">{t.consultations}</p>
            <SemaineListe horaires={c.horaires} />
          </Revele>
        </div>
      </div>
    </section>
  )
}

/* ── Phrase ─────────────────────────────────────────────────────────── */

export function Phrase({ c, t = TEXTES.mPhrase(c) }: P & { t?: T<'mPhrase'> }) {
  /* « *mot* » : les mots entre astérisques sont en accent. */
  let dansAccent = false
  const mots = t.texte
    .split(/\s+/)
    .filter(Boolean)
    .map((brut) => {
      const ouvre = brut.startsWith('*')
      const ferme = brut.endsWith('*') && brut.length > 1
      if (ouvre) dansAccent = true
      const mot = { mot: brut.replace(/\*/g, ''), accent: dansAccent }
      if (ferme || (ouvre && brut.length > 1 && brut.slice(1).includes('*'))) dansAccent = false
      return mot
    })
  return (
    <section className="py-28 md:py-44">
      <div className="mx-auto max-w-[1240px] px-[6vw] text-center lg:px-12">
        <span aria-hidden="true" className="mx-auto mb-10 block h-16 w-px bg-gradient-to-b from-transparent to-[var(--ad-or)]" />
        <blockquote>
          {/* Les mots s'allument un à un, à la vitesse où l'on descend. */}
          <Conviction
            mots={mots}
            className="mx-auto max-w-[22ch] text-balance font-[family-name:var(--ad-titre)] text-[clamp(34px,5vw,80px)] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--ad-nuit)]"
          />
          <Revele delai={0.4}>
            <footer className="mt-10 text-[12px] uppercase tracking-[0.22em] text-[var(--ad-gris)]">{t.auteur}</footer>
          </Revele>
        </blockquote>
      </div>
    </section>
  )
}

/* ── Promenade ──────────────────────────────────────────────────────── */

export function SectionPromenade({
  c,
  t = TEXTES.mPromenade(),
  photos = photosPromenade(c),
}: P & { t?: T<'mPromenade'>; photos?: Contenu['photos'] }) {
  /* L'ancienne légende (« pièces · défilez ») n'a plus de sens : une phrase d'accueil à la place. */
  const sousTitre = !t.legende || /d[ée]filez/i.test(t.legende) ? TEXTES.mPromenade().legende : t.legende
  return <CabinetDefile photos={photos} surtitre={t.surtitre ?? TEXTES.mPromenade().surtitre} titre={t.titre} sousTitre={sousTitre} />
}

/* ── Conversation ───────────────────────────────────────────────────── */

export function SectionConversation({ c, t = TEXTES.mConversation(c) }: P & { t?: T<'mConversation'> }) {
  if (!c.faq.length) return null
  return (
    <section id="questions" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        {t.surtitre && <Surtitre>{t.surtitre}</Surtitre>}
        <h2 className="mb-14 text-[clamp(38px,4.6vw,62px)] leading-[1.04]">
          <Lignes lignes={enLignes(t.titre)} />
        </h2>
        <Revele>
          <Conversation faq={c.faq} prenom={prenomDe(c.nom)} portrait={c.portrait} signature={t.signature} suivante={t.suivante} />
        </Revele>
      </div>
    </section>
  )
}

/* ── Rendez-vous ────────────────────────────────────────────────────── */

export function RendezVous({ c, t = TEXTES.mRendezVous(c) }: P & { t?: T<'mRendezVous'> }) {
  const lignes = [
    c.telephone && { icone: <Phone />, texte: c.telephone, href: `tel:${toE164(c.telephone)}` },
    c.email && { icone: <Mail />, texte: c.email, href: `mailto:${c.email}` },
    c.adresse && { icone: <MapPin />, texte: c.adresse, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.adresse)}` },
  ].filter(Boolean) as { icone: React.ReactNode; texte: string; href: string }[]
  return (
    <section id="contact" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-16 px-[6vw] lg:px-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          {t.surtitre && <Surtitre>{t.surtitre}</Surtitre>}
          <h2 className="text-[clamp(38px,4.6vw,62px)] leading-[1.04]">
            <Lignes lignes={enLignes(t.titre)} />
          </h2>
          <Revele delai={0.2} className="mt-12">
            <Semaine horaires={c.horaires} />
          </Revele>
          <Revele delai={0.3}>
            <ul className="mt-10 divide-y divide-[var(--ad-sable-fonce)] border-y border-[var(--ad-sable-fonce)]">
              {lignes.map((l) => (
                <li key={l.texte}>
                  <a href={l.href} className="group flex items-center gap-4 py-4 text-[15px] text-[var(--ad-nuit)] [&_svg]:h-4 [&_svg]:w-4">
                    <span className="text-[var(--ad-or)]">{l.icone}</span>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{l.texte}</span>
                    <ArrowUpRight className="opacity-0 transition-[opacity,transform,translate,scale,rotate] duration-500 ease-[var(--ad-ease)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </Revele>
        </div>
        <Revele delai={0.15}>
          <Lettre prenom={prenomDe(c.nom)} textes={t} />
        </Revele>
      </div>
    </section>
  )
}

/* ── Horizon ────────────────────────────────────────────────────────── */

export function Horizon({
  c,
  liens,
  t = TEXTES.mHorizon(),
}: P & { liens: { href: string; label: string }[]; t?: T<'mHorizon'> }) {
  return (
    /* Derrière la courbe du pied de page : le fond du site, le même partout. */
    <div className="bg-[var(--ad-ivoire)]">
    <footer className="relative isolate overflow-hidden rounded-t-[40px] bg-[var(--ad-nuit)] px-[5vw] pb-10 pt-28 text-white md:rounded-t-[56px] md:pt-40">
      <div className="relative mx-auto max-w-[1200px]">
        <p className="text-center font-[family-name:var(--ad-titre)] font-semibold tracking-[-0.03em] text-[clamp(48px,8.5vw,136px)] leading-[0.98] ad-em-miel">
          <Lignes lignes={enLignes(t.titre)} />
        </p>
        <Revele delai={0.3} className="mt-12 flex justify-center">
          <Aimant>
          <a
            href={c.rdv}
            className="group inline-flex items-center gap-3 rounded-full bg-white py-2 pl-7 pr-2 text-[16px] font-medium text-[var(--ad-nuit)]"
          >
            {t.bouton}
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ad-nuit)] text-white transition-transform duration-500 ease-[var(--ad-ease)] group-hover:rotate-45">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </a>
          </Aimant>
        </Revele>
        <Revele delai={0.4} className="mt-8 flex flex-wrap justify-center gap-2">
          {c.telephone && (
            <a href={`tel:${toE164(c.telephone)}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white/85 transition-colors hover:bg-white/15">
              <Phone className="h-3.5 w-3.5" />
              {c.telephone}
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white/85 transition-colors hover:bg-white/15">
              <Mail className="h-3.5 w-3.5" />
              {c.email}
            </a>
          )}
        </Revele>
        {/* Organismes, déontologie, collègues : tout se règle dans Réglages › Pied de page. */}
        <PiedExtras pied={c.pied} logos={c.logosOrganismes} ton="sombre" className="mt-24" />
        <div className="mt-16 flex flex-wrap items-end justify-between gap-8 border-t border-white/15 pt-8 text-[14px] text-white/60">
          <span className="flex items-center gap-3 text-[26px] font-bold tracking-[-0.03em] text-white">
            <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-white">
              <LogoMark src={c.logo} className="h-9 w-9" />
            </span>
            <span>
              Anasawi<span className="text-[var(--ad-or)]">.</span>
            </span>
          </span>
          <nav aria-label="Pied de page" className="flex flex-wrap gap-x-6 gap-y-2">
            {liens.map((l) => (
              <a key={l.href} href={l.href} className="-my-1.5 py-1.5 transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <span>
            © {new Date().getFullYear()} {c.nom} ·{' '}
            <Link href="/" className="underline-offset-2 hover:text-white hover:underline">
              {t.mention}
            </Link>
          </span>
        </div>
        <LiensLegaux base="/moderne" ton="sombre" className="mt-5 justify-center text-[13px] text-white/45 md:justify-end" />
      </div>
    </footer>
    </div>
  )
}
