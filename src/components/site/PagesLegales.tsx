import { addressLines } from '@/lib/settings-helpers'
import { blocsDe, type Morceau, type Rubrique, type Valeurs } from '@/lib/pages-legales'
import { lirePied, type Pied } from '@/lib/pied'
import { cn } from '@/lib/utils'
import type { Settings } from '@/server/db/schema'

/**
 * LES PAGES LÉGALES — rédigées à partir des Réglages : le nom, l'adresse,
 * le téléphone et l'e-mail viennent des Coordonnées ; le statut, le
 * SIRET, l'assurance, l'hébergeur… de l'onglet « Pied de page ». Un
 * renseignement manquant n'est pas inventé : la ligne ne s'affiche pas.
 *
 * Mentions légales : loi pour la confiance dans l'économie numérique
 * (art. 6-III) et Code de la consommation (médiation, art. L612-1).
 * Confidentialité : RGPD (art. 13) et lignes directrices de la CNIL.
 */

type Ton = 'moderne' | 'classique'

function Cadre({ ton, surtitre, titre, majour, children }: { ton: Ton; surtitre: string; titre: string; majour: Date | string; children: React.ReactNode }) {
  const moderne = ton === 'moderne'
  return (
    <article
      className={cn(
        'mx-auto w-full max-w-[880px] px-6 pb-28 pt-36 sm:px-10',
        '[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:leading-[1.15] [&_p]:mt-3 [&_li]:mt-1.5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline [&_a]:underline-offset-[3px]',
        moderne
          ? '[&_h2]:text-[clamp(24px,2.6vw,32px)] [&_p]:text-[16px] [&_p]:leading-[1.75] [&_p]:text-[var(--ad-pierre)] [&_li]:text-[16px] [&_li]:leading-[1.7] [&_li]:text-[var(--ad-pierre)] [&_a]:decoration-[var(--ad-or)] [&_dt]:text-[var(--ad-gris)]'
          : 'font-sans [&_h2]:font-serif [&_h2]:text-[28px] [&_h2]:font-light [&_p]:text-[16px] [&_p]:leading-[1.75] [&_p]:text-ink-soft [&_li]:text-ink-soft [&_dt]:text-stone',
      )}
    >
      {surtitre && <p className={cn('text-[12px] font-semibold uppercase tracking-[0.2em]', moderne ? 'text-[var(--ad-or)]' : 'text-stone')}>{surtitre}</p>}
      <h1 className={cn('mt-3', moderne ? 'text-[clamp(40px,5.4vw,68px)] leading-[1.02]' : 'font-serif text-[clamp(38px,5vw,64px)] font-light leading-[1.05]')}>{titre}</h1>
      <p className={cn('!mt-5 text-[14px]', moderne ? '!text-[var(--ad-gris)]' : '!text-stone')}>
        Dernière mise à jour : {/* Les réglages passent par le cache de Next : la date y devient du texte. */}
        {new Date(majour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      {children}
    </article>
  )
}

/** Une ligne « intitulé — valeur » ; rien si la valeur manque. */
function Ligne({ k, v }: { k: string; v: React.ReactNode }) {
  if (!v) return null
  return (
    <div className="grid gap-1 border-b border-black/[0.07] py-3 sm:grid-cols-[220px_1fr] sm:gap-6">
      <dt className="text-[13px] font-semibold uppercase tracking-[0.08em]">{k}</dt>
      <dd className="text-[16px] leading-[1.6]">{v}</dd>
    </div>
  )
}

const identite = (s: Settings) => ({
  nom: s.practitionerName || s.siteName,
  metier: s.practitionerTitle,
  adresse: addressLines(s).join(', '),
  email: s.contactEmail,
  telephone: s.contactPhone,
})

/** Les valeurs des mots-clés ({nom}, {email}…) d'après les Réglages. */
function valeursDe(settings: Settings, p: Pied, ton: Ton): Valeurs {
  const i = identite(settings)
  return {
    nom: i.nom,
    metier: i.metier,
    adresse: i.adresse,
    telephone: i.telephone,
    email: i.email ? `[${i.email}](mailto:${i.email})` : '',
    hebergeur: p.hebergeur,
    mediateur: p.mediateur,
    deontologie: p.deontologie,
    credits: p.credits,
    conservation: p.conservation,
    prestataires: p.prestataires
      .split('\n')
      .map((l) => l.trim().replace(/[;.]$/, ''))
      .filter(Boolean),
    confidentialite: `[politique de confidentialité](${ton === 'moderne' ? '/moderne/confidentialite' : '/confidentialite'})`,
  }
}

function EnLigne({ morceaux }: { morceaux: Morceau[] }) {
  return (
    <>
      {morceaux.map((m, k) =>
        m.t === 'br' ? (
          <br key={k} />
        ) : m.t === 'gras' ? (
          <strong key={k}>{m.v}</strong>
        ) : m.t === 'lien' ? (
          <a key={k} href={m.url} {...(/^https?:/.test(m.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {m.v}
          </a>
        ) : (
          <span key={k}>{m.v}</span>
        ),
      )}
    </>
  )
}

/** Un texte saisi (paragraphes, listes, gras, liens, mots-clés), mis en page. */
function TexteLibre({ texte, valeurs }: { texte: string; valeurs: Valeurs }) {
  return (
    <>
      {blocsDe(texte, valeurs).map((b, k) =>
        b.t === 'ul' ? (
          <ul key={k}>
            {b.items.map((item, j) => (
              <li key={j}>
                <EnLigne morceaux={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={k}>
            <EnLigne morceaux={b.morceaux} />
          </p>
        ),
      )}
    </>
  )
}

/** Les rubriques d'une page : une rubrique dont tout le texte s'efface (informations manquantes) disparaît avec son titre. */
function Rubriques({ rubriques, valeurs }: { rubriques: Rubrique[]; valeurs: Valeurs }) {
  return (
    <>
      {rubriques.map((r) => {
        if (!r.titre && !r.texte.trim()) return null
        if (r.texte.trim() && blocsDe(r.texte, valeurs).length === 0) return null
        return (
          <section key={r.id}>
            {r.titre && <h2>{r.titre}</h2>}
            <TexteLibre texte={r.texte} valeurs={valeurs} />
          </section>
        )
      })}
    </>
  )
}

/** L'ancien « texte complémentaire » (avant les rubriques) : toujours affiché s'il existe. */
function Complement({ texte, valeurs }: { texte: string; valeurs: Valeurs }) {
  if (!texte.trim()) return null
  return (
    <>
      <h2>Informations complémentaires</h2>
      <TexteLibre texte={texte} valeurs={valeurs} />
    </>
  )
}

export function MentionsLegales({ settings, ton }: { settings: Settings; ton: Ton }) {
  const p: Pied = lirePied(settings.pied)
  const i = identite(settings)
  const valeurs = valeursDe(settings, p, ton)
  return (
    <Cadre ton={ton} surtitre={p.mentionsSurtitre} titre={p.mentionsTitre || 'Mentions légales'} majour={settings.updatedAt}>
      {p.editeurTitre && <h2>{p.editeurTitre}</h2>}
      <dl className="mt-4">
        <Ligne k="Nom" v={i.nom} />
        <Ligne k="Activité" v={i.metier} />
        <Ligne k="Statut" v={p.statut} />
        <Ligne k="SIRET" v={p.siret} />
        <Ligne k="N° ADELI / RPPS" v={p.adeli} />
        <Ligne k="Adresse" v={i.adresse} />
        <Ligne k="Téléphone" v={i.telephone} />
        <Ligne k="E-mail" v={i.email && <a href={`mailto:${i.email}`}>{i.email}</a>} />
        <Ligne k="Directrice de la publication" v={i.nom} />
        <Ligne k="Assurance professionnelle" v={p.assurance} />
      </dl>
      <Rubriques rubriques={p.mentionsRubriques} valeurs={valeurs} />
      <Complement texte={p.complementMentions} valeurs={valeurs} />
    </Cadre>
  )
}

export function Confidentialite({ settings, ton }: { settings: Settings; ton: Ton }) {
  const p: Pied = lirePied(settings.pied)
  const valeurs = valeursDe(settings, p, ton)
  return (
    <Cadre ton={ton} surtitre={p.confidentialiteSurtitre} titre={p.confidentialiteTitre || 'Politique de confidentialité'} majour={settings.updatedAt}>
      <TexteLibre texte={p.confidentialiteIntro} valeurs={valeurs} />
      <Rubriques rubriques={p.confidentialiteRubriques} valeurs={valeurs} />
      <Complement texte={p.complementConfidentialite} valeurs={valeurs} />
    </Cadre>
  )
}
