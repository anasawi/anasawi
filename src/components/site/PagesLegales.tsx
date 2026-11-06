import { GererCookies } from './consentement'
import { addressLines } from '@/lib/settings-helpers'
import { lirePied, morceaux, type Pied } from '@/lib/pied'
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

function Texte({ texte }: { texte: string }) {
  return (
    <>
      {morceaux(texte).map((m, i) =>
        'url' in m ? (
          <a key={i} href={m.url} target="_blank" rel="noopener noreferrer">
            {m.texte}
          </a>
        ) : (
          <span key={i}>{m.texte}</span>
        ),
      )}
    </>
  )
}

function Cadre({ ton, surtitre, titre, majour, children }: { ton: Ton; surtitre: string; titre: string; majour: Date; children: React.ReactNode }) {
  const moderne = ton === 'moderne'
  return (
    <article
      className={cn(
        'mx-auto w-full max-w-[820px] px-[6vw] pb-28 pt-36 md:px-0',
        '[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:leading-[1.15] [&_p]:mt-3 [&_li]:mt-1.5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline [&_a]:underline-offset-[3px]',
        moderne
          ? '[&_h2]:text-[clamp(24px,2.6vw,32px)] [&_p]:text-[16px] [&_p]:leading-[1.75] [&_p]:text-[var(--ad-pierre)] [&_li]:text-[16px] [&_li]:leading-[1.7] [&_li]:text-[var(--ad-pierre)] [&_a]:decoration-[var(--ad-or)] [&_dt]:text-[var(--ad-gris)]'
          : 'font-sans [&_h2]:font-serif [&_h2]:text-[28px] [&_h2]:font-light [&_p]:text-[16px] [&_p]:leading-[1.75] [&_p]:text-ink-soft [&_li]:text-ink-soft [&_dt]:text-stone',
      )}
    >
      <p className={cn('text-[12px] font-semibold uppercase tracking-[0.2em]', moderne ? 'text-[var(--ad-or)]' : 'text-stone')}>{surtitre}</p>
      <h1 className={cn('mt-3', moderne ? 'text-[clamp(40px,5.4vw,68px)] leading-[1.02]' : 'font-serif text-[clamp(38px,5vw,64px)] font-light leading-[1.05]')}>{titre}</h1>
      <p className={cn('!mt-5 text-[14px]', moderne ? '!text-[var(--ad-gris)]' : '!text-stone')}>
        Dernière mise à jour : {majour.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
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

export function MentionsLegales({ settings, ton }: { settings: Settings; ton: Ton }) {
  const p: Pied = lirePied(settings.pied)
  const i = identite(settings)
  return (
    <Cadre ton={ton} surtitre="Informations légales" titre="Mentions légales" majour={settings.updatedAt}>
      <h2>Éditrice du site</h2>
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

      <h2>Hébergement</h2>
      <p>{p.hebergeur || 'Netlify, Inc. — 101 2nd Street, San Francisco, CA 94105, États-Unis.'}</p>

      {p.mediateur && (
        <>
          <h2>Médiation de la consommation</h2>
          <p>
            Conformément aux articles L611-1 et suivants du Code de la consommation, en cas de litige non résolu à l’amiable, vous pouvez recourir gratuitement au médiateur suivant :{' '}
            <Texte texte={p.mediateur} />
          </p>
        </>
      )}

      <h2>Déontologie</h2>
      <p>
        <Texte texte={p.deontologie || 'Je respecte le code de déontologie de ma profession.'} />
      </p>
      <p>Le site présente une activité d’accompagnement psychothérapeutique ; il ne remplace en aucun cas une consultation médicale. En cas d’urgence, composez le 15 ou le 112, ou le 3114 (numéro national de prévention du suicide).</p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, photographies et éléments graphiques de ce site sont protégés par le droit d’auteur. Toute reproduction, même partielle, est soumise à l’accord préalable de l’éditrice. Les logos des organismes cités appartiennent à leurs titulaires respectifs.
      </p>
      {p.credits && (
        <p>
          Crédits : <Texte texte={p.credits} />
        </p>
      )}

      <h2>Liens vers d’autres sites</h2>
      <p>Les liens vers d’autres sites (organismes, collègues) sont proposés à titre d’information ; leur contenu relève de la seule responsabilité de leurs éditeurs.</p>

      <h2>Données personnelles et cookies</h2>
      <p>
        Leur traitement est décrit dans la <a href={ton === 'moderne' ? '/moderne/confidentialite' : '/confidentialite'}>politique de confidentialité</a>.
      </p>

      {p.complementMentions && (
        <>
          <h2>Informations complémentaires</h2>
          {p.complementMentions.split(/\n\s*\n/).map((par, k) => (
            <p key={k}>
              <Texte texte={par} />
            </p>
          ))}
        </>
      )}
    </Cadre>
  )
}

export function Confidentialite({ settings, ton }: { settings: Settings; ton: Ton }) {
  const p: Pied = lirePied(settings.pied)
  const i = identite(settings)
  return (
    <Cadre ton={ton} surtitre="Vos données" titre="Politique de confidentialité" majour={settings.updatedAt}>
      <p>
        Le respect de votre vie privée est au cœur de mon métier. Cette page explique, simplement, quelles données ce site recueille, pourquoi, combien de temps, et comment exercer vos droits — conformément au Règlement général sur la protection des données (RGPD) et à la loi
        Informatique et Libertés.
      </p>

      <h2>Qui est responsable de vos données ?</h2>
      <p>
        {i.nom}
        {i.metier ? `, ${i.metier.toLowerCase()}` : ''}
        {i.adresse ? `, ${i.adresse}` : ''}
        {i.email ? (
          <>
            {' '}
            — <a href={`mailto:${i.email}`}>{i.email}</a>
          </>
        ) : null}
        .
      </p>

      <h2>Ce que le site recueille</h2>
      <p>
        <strong>Le formulaire de contact</strong> : votre nom, votre adresse e-mail, votre téléphone si vous le donnez, et votre message. Ils servent uniquement à vous répondre et, si vous le souhaitez, à convenir d’un rendez-vous. Le formulaire n’est envoyé qu’avec votre accord explicite (case à cocher).
      </p>
      <p>
        Merci de ne pas détailler votre situation de santé dans ce message : quelques mots suffisent, nous en parlerons de vive voix. Si vous choisissez d’en dire davantage, ces informations sont traitées avec la même confidentialité que le reste de nos échanges, et uniquement pour vous répondre.
      </p>
      <p>
        <strong>La sécurité du site</strong> : pour limiter les envois abusifs, l’adresse IP de l’expéditeur est transformée en une empreinte irréversible (elle n’est jamais conservée en clair).
      </p>
      <p>
        Le site ne mesure pas votre visite (aucun outil de statistiques), n’affiche aucune publicité et ne revend aucune donnée.
      </p>

      <h2>Sur quelle base ?</h2>
      <ul>
        <li>Votre consentement, donné en envoyant le formulaire (article 6.1.a du RGPD, et 9.2.a pour d’éventuelles informations de santé).</li>
        <li>L’intérêt légitime à protéger le site contre les abus (article 6.1.f).</li>
      </ul>

      <h2>Combien de temps ?</h2>
      <p>Vos messages sont conservés {p.conservation || '3 ans après notre dernier échange'}, puis supprimés. Vous pouvez demander leur suppression à tout moment.</p>

      <h2>Qui y a accès ?</h2>
      <p>Moi seule. Pour fonctionner, le site s’appuie sur des prestataires techniques, qui n’utilisent pas vos données pour leur propre compte :</p>
      <ul>
        <li>Netlify (hébergement du site), États-Unis ;</li>
        <li>Neon (base de données où sont enregistrés les messages), serveurs situés dans l’Union européenne (Francfort) ;</li>
        <li>Resend (envoi de l’e-mail qui m’avertit d’un nouveau message), États-Unis.</li>
      </ul>
      <p>Les transferts vers les États-Unis sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) ou par les clauses contractuelles types de la Commission européenne.</p>

      <h2>Cookies et contenus d’autres sites</h2>
      <p>
        Ce site ne dépose aucun cookie de mesure d’audience ni de publicité : il n’y a donc pas de bandeau à accepter. Seuls deux types de contenus, fournis par d’autres sites, peuvent déposer des cookies : le plan d’accès (Google Maps) et, le cas échéant, une vidéo (YouTube ou Vimeo). Ils ne se chargent qu’après un clic de votre part ; votre choix est retenu dans votre navigateur, et vous pouvez le modifier à tout moment :{' '}
        <GererCookies className="font-semibold underline underline-offset-[3px]" libelle="gérer les cookies" />.
      </p>
      <p>Un cookie strictement nécessaire est utilisé uniquement pour l’espace d’administration du site (connexion de l’éditrice) ; il ne concerne pas les visiteurs.</p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, leur portabilité, la limitation de leur traitement, ou vous y opposer, et retirer votre consentement à tout moment
        {i.email ? (
          <>
            , en écrivant à <a href={`mailto:${i.email}`}>{i.email}</a>
          </>
        ) : null}
        . Je vous réponds dans un délai d’un mois.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL :{' '}
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
        .
      </p>

      <h2>Et en séance ?</h2>
      <p>Ce que vous confiez en séance relève du secret professionnel et n’est en aucun cas enregistré sur ce site.</p>

      {p.complementConfidentialite && (
        <>
          <h2>Informations complémentaires</h2>
          {p.complementConfidentialite.split(/\n\s*\n/).map((par, k) => (
            <p key={k}>
              <Texte texte={par} />
            </p>
          ))}
        </>
      )}
    </Cadre>
  )
}
