'use client'

import { AlertTriangle, ArrowRight, Check, DatabaseBackup, History, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { envoyerAction, envoyerFichiersAction, etatEnvoiAction, restaurerChezLAutreAction } from '@/server/actions/synchronisation'
import type { Comptes, ConfigSynchro, Etat } from '@/server/synchronisation'

/**
 * Réglages › Synchronisation : comparer, puis — avec beaucoup de
 * précautions — ENVOYER le contenu de ce site vers l'autre (préprod ⇄
 * production). Voir `server/synchronisation.ts` pour le principe
 * (l'autre site récupère, sauvegarde d'abord, remplace en une
 * transaction).
 */

type Etape = 'repos' | 'confirmer' | 'fichiers' | 'remplacement' | 'fini' | 'erreur'

const dateFr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 'jamais publiée'

function nomSauvegarde(nom: string) {
  const m = nom.match(/contenu-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})/)
  const quand = m ? `${m[3]}/${m[2]}/${m[1]} à ${m[4]}h${m[5]} (UTC)` : nom
  return nom.includes('avant-restauration') ? `${quand} — avant une restauration` : quand
}

function Colonne({ titre, comptes, ton }: { titre: string; comptes: Comptes | null; ton: 'source' | 'cible' }) {
  return (
    <div className={cn('flex-1 rounded-[20px] p-6', ton === 'source' ? 'bg-[#eaf4f1]' : 'bg-[#f4f1ea]')}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{ton === 'source' ? 'Ce site — envoyé' : 'Sera remplacé'}</p>
      <p className="mt-1 text-[20px] font-semibold capitalize text-foreground">{titre}</p>
      {comptes ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <dt className="text-muted-foreground">Sections</dt>
          <dd className="text-right font-medium tabular-nums">{comptes.sections}</dd>
          <dt className="text-muted-foreground">Médias</dt>
          <dd className="text-right font-medium tabular-nums">{comptes.medias}</dd>
          <dt className="text-muted-foreground">Accompagnements</dt>
          <dd className="text-right font-medium tabular-nums">{comptes.accompagnements}</dd>
          <dt className="text-muted-foreground">Questions</dt>
          <dd className="text-right font-medium tabular-nums">{comptes.questions}</dd>
          <dt className="col-span-2 mt-2 text-[13px] text-muted-foreground">Accueil publié le {dateFr(comptes.publieLe)}</dt>
        </dl>
      ) : (
        <p className="mt-4 text-[14px] text-muted-foreground">Illisible pour l’instant.</p>
      )}
    </div>
  )
}

export function SynchroWorkbench({
  config,
  phrase,
  proprietaire,
}: {
  /** Du point de vue de CE site : `cible` = ce site, `source` = l'autre. */
  config: ConfigSynchro | null
  phrase: string
  proprietaire: boolean
}) {
  const router = useRouter()
  const [etat, setEtat] = useState<Etat | null>(null)
  const [chargement, setChargement] = useState<string | null>(null)
  const recharger = async () => {
    const r = await etatEnvoiAction()
    if (r.ok) {
      setEtat(r.data)
      setChargement(null)
    } else setChargement(r.error)
  }
  useEffect(() => {
    if (config && proprietaire) void recharger()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois, à l'ouverture
  }, [])
  const [etape, setEtape] = useState<Etape>('repos')
  const [compris, setCompris] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [progres, setProgres] = useState<{ fait: number; total: number } | null>(null)
  const [absents, setAbsents] = useState<string[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [sauvegarde, setSauvegarde] = useState<string | null>(null)
  const [aRestaurer, setARestaurer] = useState<string | null>(null)
  const [saisieRestauration, setSaisieRestauration] = useState('')
  const [restauration, setRestauration] = useState<'repos' | 'en cours' | 'faite'>('repos')

  const pret = Boolean(config && etat?.source && etat.memeSchema && !etat.erreur)

  async function lancer() {
    setErreur(null)
    /* 1. Les fichiers médias, par lots (chaque appel reste court). */
    setEtape('fichiers')
    let depart: number | null = 0
    const manquants: string[] = []
    while (depart !== null) {
      const r = await envoyerFichiersAction(depart)
      if (!r.ok) {
        setErreur(r.error)
        setEtape('erreur')
        return
      }
      setProgres({ fait: r.data.suivant ?? r.data.total, total: r.data.total })
      manquants.push(...r.data.absents)
      depart = r.data.suivant
    }
    /* 2. Sauvegarde du contenu actuel, puis remplacement en une transaction. */
    setEtape('remplacement')
    const r = await envoyerAction(saisie)
    if (!r.ok) {
      setErreur(r.error)
      setEtape('erreur')
      return
    }
    setSauvegarde(r.data.sauvegarde)
    setAbsents(manquants)
    setEtape('fini')
    void recharger()
  }

  async function restaurerLa() {
    if (!aRestaurer) return
    setRestauration('en cours')
    setErreur(null)
    const r = await restaurerChezLAutreAction(aRestaurer, saisieRestauration)
    if (!r.ok) {
      setErreur(r.error)
      setRestauration('repos')
      return
    }
    setRestauration('faite')
    setARestaurer(null)
    setSaisieRestauration('')
    void recharger()
    router.refresh()
  }

  if (!proprietaire) {
    return (
      <p className="text-[14px] leading-[1.6] text-muted-foreground">
        Réservé aux comptes <strong className="font-semibold text-foreground">propriétaires</strong>. Une personne propriétaire peut vous donner ce rôle dans l’onglet{' '}
        <a href="#utilisateurs" className="font-medium text-[#176c79] underline-offset-2 hover:underline">
          Utilisateurs
        </a>
        .
      </p>
    )
  }

  if (!config) {
    return (
      <div>
        <p className="text-[15px] font-semibold text-foreground">La synchronisation n’est pas encore configurée.</p>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-[1.6] text-muted-foreground">
          Elle se configure une fois pour toutes, depuis l’ordinateur de la personne qui gère le site, avec la commande{' '}
          <code className="rounded bg-[#f2f3f4] px-1.5 py-0.5 text-[13px]">npm run sync:configurer</code>, puis un nouveau déploiement.
        </p>
      </div>
    )
  }

  if (!etat) {
    return (
      <div className="text-[14px] text-muted-foreground" aria-live="polite">
        {chargement ? (
          <p role="alert" className="rounded-[14px] bg-[#fbf0ee] px-5 py-4 text-[#9a3a2c]">
            {chargement}{' '}
            <button type="button" className="underline" onClick={() => void recharger()}>
              Réessayer
            </button>
          </p>
        ) : (
          <p className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Comparaison avec {config.source}…
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Comparaison */}
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <Colonne titre={config.cible} comptes={etat.source} ton="source" />
        <ArrowRight className="mx-auto h-6 w-6 shrink-0 rotate-90 text-muted-foreground md:rotate-0" />
        <Colonne titre={config.source} comptes={etat.cible} ton="cible" />
      </div>

      {etat.erreur && (
        <p role="alert" className="rounded-[14px] bg-[#fbf0ee] px-5 py-4 text-[14px] text-[#9a3a2c]">
          {etat.erreur}
        </p>
      )}

      {/* L'action, et ses garde-fous */}
      <section className="rounded-[20px] border-2 border-[#e9c9c3] bg-white p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fbf0ee] text-[#b4342c]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-semibold text-foreground">
              Envoyer le contenu de {config.cible} vers {config.source}
            </h2>
            <p className="mt-2 max-w-[72ch] text-[14px] leading-[1.65] text-muted-foreground">
              Opération délicate : le contenu de {config.source} sera <strong className="text-foreground">remplacé</strong> par celui d’ici. Tout ce qui a été
              modifié sur {config.source} et pas ici sera perdu — sauf à restaurer la sauvegarde faite automatiquement juste avant.
            </p>
            <div className="mt-5 grid gap-4 text-[14px] md:grid-cols-2">
              <div>
                <p className="font-semibold text-foreground">Remplacé</p>
                <p className="mt-1 leading-[1.6] text-muted-foreground">
                  Pages et versions publiées (site classique et moderne), sections, médias et dossiers, accompagnements, questions, réglages
                  (coordonnées, horaires, apparence, menu, référencement), modèles enregistrés.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Jamais touché</p>
                <p className="mt-1 leading-[1.6] text-muted-foreground">Les comptes et invitations, et les messages reçus par le formulaire.</p>
              </div>
            </div>

            {etape === 'repos' && (
              <Button variant="destructive" className="mt-6" disabled={!pret} onClick={() => setEtape('confirmer')}>
                Préparer l’envoi…
              </Button>
            )}

            {etape === 'confirmer' && (
              <div className="mt-6 rounded-[16px] bg-[#fbf7f6] p-5">
                <label className="flex items-start gap-3 text-[14px] leading-[1.55] text-foreground">
                  <input type="checkbox" checked={compris} onChange={(e) => setCompris(e.target.checked)} className="mt-1 h-4 w-4 accent-[#b4342c]" />
                  J’ai compris que le contenu actuel de {config.source} sera remplacé, et qu’une sauvegarde est faite juste avant.
                </label>
                <label className="mt-4 block text-[14px] text-foreground">
                  Pour confirmer, tapez <strong className="font-mono">{phrase}</strong>
                  <input
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="mt-2 block h-10 w-full max-w-[420px] rounded-[8px] bg-white px-3 font-mono text-[14px] shadow-field outline-none focus-visible:ring-2 focus-visible:ring-[#b4342c]"
                  />
                </label>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="destructive" disabled={!compris || saisie.trim() !== phrase} onClick={() => void lancer()}>
                    Envoyer maintenant
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEtape('repos')
                      setSaisie('')
                      setCompris(false)
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {(etape === 'fichiers' || etape === 'remplacement') && (
              <div className="mt-6 flex flex-col gap-2 text-[14px]" aria-live="polite">
                <p className="flex items-center gap-2">
                  {etape === 'fichiers' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#3e9e6f]" />}
                  Copie des fichiers médias{progres ? ` — ${progres.fait} / ${progres.total}` : '…'}
                </p>
                <p className={cn('flex items-center gap-2', etape === 'fichiers' && 'opacity-40')}>
                  {etape === 'remplacement' ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-4 w-4" />}
                  Sauvegarde du contenu actuel, puis remplacement (tout ou rien)
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">Ne fermez pas cette page.</p>
              </div>
            )}

            {etape === 'fini' && (
              <p className="mt-6 flex items-start gap-2 rounded-[14px] bg-[#e8f4ec] px-5 py-4 text-[14px] text-[#256b47]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                C’est fait : {config.source} affiche maintenant le contenu d’ici. Son contenu d’avant est sauvegardé
                {sauvegarde ? ` (${nomSauvegarde(sauvegarde)})` : ''} — vous pouvez le restaurer ci-dessous.
              </p>
            )}
            {etape === 'fini' && absents.length > 0 && (
              <p className="mt-3 rounded-[14px] bg-[#fdf4e4] px-5 py-4 text-[14px] text-[#8a5f1e]">
                {absents.length} fichier{absents.length > 1 ? 's' : ''} manquai{absents.length > 1 ? 'ent' : 't'} déjà ici (médias cassés, sans
                incidence sur l’envoi) : {absents.join(', ')}. Vous pouvez les supprimer ou les remplacer dans Médias.
              </p>
            )}

            {etape === 'erreur' && erreur && (
              <div className="mt-6 rounded-[14px] bg-[#fbf0ee] px-5 py-4 text-[14px] text-[#9a3a2c]" role="alert">
                <p className="font-semibold">L’opération s’est arrêtée.</p>
                <p className="mt-1">{erreur}</p>
                <p className="mt-2 text-[13px]">
                  Le remplacement se fait en une seule transaction : s’il a échoué, le contenu de {config.source} n’a pas changé.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setEtape('repos')}>
                  Revenir
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Les sauvegardes */}
      <section className="rounded-[20px] bg-white p-7 shadow-[0_1px_2px_rgba(22,73,81,0.06)]">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-[16px] font-semibold text-foreground">Sauvegardes de {config.source}</h2>
        </div>
        <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">
          Faites automatiquement avant chaque remplacement et chaque restauration. Restaurer remet le contenu tel qu’il était à ce moment.
        </p>
        {restauration === 'faite' && (
          <p className="mt-4 rounded-[14px] bg-[#e8f4ec] px-5 py-3 text-[14px] text-[#256b47]">Sauvegarde restaurée.</p>
        )}
        {erreur && etape !== 'erreur' && (
          <p role="alert" className="mt-4 rounded-[14px] bg-[#fbf0ee] px-5 py-3 text-[14px] text-[#9a3a2c]">
            {erreur}
          </p>
        )}
        {etat.sauvegardes.length === 0 ? (
          <p className="mt-4 text-[14px] text-muted-foreground">Aucune sauvegarde pour l’instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#eef1f2]">
            {etat.sauvegardes.slice(0, 10).map((nom) => (
              <li key={nom} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[14px] text-foreground">
                    <DatabaseBackup className="h-4 w-4 text-muted-foreground" />
                    {nomSauvegarde(nom)}
                  </span>
                  {aRestaurer !== nom && (
                    <Button variant="outline" size="sm" onClick={() => setARestaurer(nom)}>
                      Restaurer…
                    </Button>
                  )}
                </div>
                {aRestaurer === nom && (
                  <div className="mt-3 rounded-[14px] bg-[#fbf7f6] p-4 text-[14px]">
                    <p>
                      Le contenu actuel de {config.source} sera remplacé par cette sauvegarde (il est lui-même sauvegardé avant). Tapez{' '}
                      <strong className="font-mono">RESTAURER</strong> :
                    </p>
                    <input
                      value={saisieRestauration}
                      onChange={(e) => setSaisieRestauration(e.target.value)}
                      autoComplete="off"
                      className="mt-2 block h-9 w-full max-w-[240px] rounded-[8px] bg-white px-3 font-mono text-[14px] shadow-field outline-none"
                    />
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={saisieRestauration.trim() !== 'RESTAURER' || restauration === 'en cours'}
                        onClick={() => void restaurerLa()}
                      >
                        {restauration === 'en cours' ? 'Restauration…' : 'Restaurer'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setARestaurer(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
