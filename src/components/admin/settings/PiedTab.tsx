'use client'

import { ArrowDown, ArrowUp, Download, ExternalLink, GripVertical, ImageOff, Loader2, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

import { Field } from '../form/Field'
import { SectionCard } from '../form/SectionCard'
import { CLASSES_GLISSER, useGlisser } from '../form/useGlisser'
import { MediaPicker } from '../MediaPicker'
import { RubriquesEditor } from './RubriquesEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { initiales, PIED_DEPART, type Ami, type Organisme, type Pied } from '@/lib/pied'
import { recupererLogo } from '@/server/actions/pied'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * L'onglet « Pied de page » des Réglages : les organismes (et leurs
 * logos, récupérés automatiquement sur leur site), le paragraphe
 * déontologique, les sites de collègues, et ce qu'il faut pour les pages
 * légales. Tout l'état vit dans `SettingsWorkbench`.
 */

const nouvelId = () => Math.random().toString(36).slice(2, 10)

function Zone({ label, value, onChange, help, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; help?: string; rows?: number }) {
  return (
    <div className="sm:col-span-2">
      <Label className="mb-2 block">{label}</Label>
      <Textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
      {help && <p className="mt-1.5 text-[12px] leading-[17px] text-muted-foreground">{help}</p>}
    </div>
  )
}

function Deplacer<T>({ liste, index, onChange }: { liste: T[]; index: number; onChange: (next: T[]) => void }) {
  const bouger = (vers: number) => {
    const copie = [...liste]
    const [el] = copie.splice(index, 1)
    copie.splice(vers, 0, el!)
    onChange(copie)
  }
  return (
    <span className="flex gap-1">
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Monter" disabled={index === 0} onClick={() => bouger(index - 1)}>
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Descendre" disabled={index === liste.length - 1} onClick={() => bouger(index + 1)}>
        <ArrowDown />
      </Button>
    </span>
  )
}

export function PiedTab({ pied, onChange, library }: { pied: Pied; onChange: (next: Pied) => void; library: Media[] }) {
  const [medias, setMedias] = useState(library)
  const [enCours, setEnCours] = useState<Set<string>>(new Set())
  const set = <K extends keyof Pied>(cle: K, valeur: Pied[K]) => onChange({ ...pied, [cle]: valeur })
  const setOrganisme = (id: string, patch: Partial<Organisme>) =>
    set(
      'organismes',
      pied.organismes.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    )
  const setAmi = (id: string, patch: Partial<Ami>) =>
    set(
      'amis',
      pied.amis.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    )

  /** Va chercher le logo sur le site de l'organisme ; renvoie l'id du média, ou null. */
  const recuperer = async (o: Organisme): Promise<string | null> => {
    if (!o.url) {
      toast.error(`Renseignez d’abord l’adresse du site de ${o.sigle || o.nom || 'cet organisme'}.`)
      return null
    }
    setEnCours((s) => new Set(s).add(o.id))
    try {
      const r = await recupererLogo(o.url, o.sigle || o.nom)
      if (!r.ok) {
        toast.error(r.error)
        return null
      }
      setMedias((m) => [r.data, ...m])
      return r.data.id
    } finally {
      setEnCours((s) => {
        const n = new Set(s)
        n.delete(o.id)
        return n
      })
    }
  }

  const recupererManquants = async () => {
    let organismes = pied.organismes
    let trouves = 0
    for (const o of pied.organismes.filter((x) => !x.logoMediaId && x.url)) {
      const id = await recuperer(o)
      if (id) {
        trouves += 1
        organismes = organismes.map((x) => (x.id === o.id ? { ...x, logoMediaId: id } : x))
        onChange({ ...pied, organismes })
      }
    }
    if (trouves) toast.success(`${trouves} logo${trouves > 1 ? 's' : ''} récupéré${trouves > 1 ? 's' : ''} — pensez à enregistrer.`)
  }

  const manquants = pied.organismes.filter((o) => !o.logoMediaId && o.url).length
  const glisserOrganismes = useGlisser(pied.organismes, (next) => set('organismes', next))
  const glisserAmis = useGlisser(pied.amis, (next) => set('amis', next))

  return (
    <>
      <SectionCard
        id="organismes"
        title="Organismes"
        note="Les fédérations et associations dont vous êtes membre. Leur logo mène à leur site ; sans logo, leurs initiales s’affichent."
        layout="stack"
        actions={
          manquants > 0 ? (
            <Button type="button" variant="secondary" size="sm" onClick={recupererManquants} disabled={enCours.size > 0}>
              {enCours.size > 0 ? <Loader2 className="animate-spin" /> : <Download />}
              Récupérer les logos manquants ({manquants})
            </Button>
          ) : null
        }
      >
        <div className="mt-4 grid gap-4">
          <Field label="Titre au-dessus des logos" value={pied.organismesTitre} onChange={(v) => set('organismesTitre', v)} placeholder="Membre de" />
          <ul className="grid gap-3">
            {pied.organismes.map((o, index) => {
              const logo = medias.find((m) => m.id === o.logoMediaId)
              const charge = enCours.has(o.id)
              return (
                <li key={o.id} {...glisserOrganismes.element(index)} className={cn('rounded-[16px] bg-white p-4 shadow-[0_1px_2px_rgba(22,73,81,0.06)]', CLASSES_GLISSER)}>
                  <div className="flex flex-wrap items-start gap-4">
                    <span {...glisserOrganismes.poignee(index)} className="-ml-1 mt-6 grid h-8 w-6 shrink-0 place-items-center rounded-[6px] text-muted-foreground hover:bg-muted">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div className="grid h-[72px] w-[120px] shrink-0 place-items-center overflow-hidden rounded-[12px] border border-border bg-white p-2">
                      {logo ? (
                        <Image src={logo.url} alt={logo.alt} width={logo.width || 120} height={logo.height || 60} className="max-h-full w-auto object-contain" />
                      ) : (
                        <span className="grid h-11 min-w-11 place-items-center rounded-full bg-[#e2f3f1] px-2 text-[13px] font-bold text-[#2f8582]">{initiales(o) || '?'}</span>
                      )}
                    </div>
                    <div className="grid min-w-[240px] flex-1 gap-2 sm:grid-cols-[120px_1fr]">
                      <Input value={o.sigle} placeholder="Sigle (EAGT)" aria-label={`Sigle de l’organisme ${index + 1}`} onChange={(e) => setOrganisme(o.id, { sigle: e.target.value })} />
                      <Input value={o.nom} placeholder="Nom complet" aria-label={`Nom de l’organisme ${index + 1}`} onChange={(e) => setOrganisme(o.id, { nom: e.target.value })} />
                      <Input
                        className="sm:col-span-2"
                        value={o.url}
                        placeholder="https://www.site-de-l-organisme.org"
                        aria-label={`Site de l’organisme ${index + 1}`}
                        onChange={(e) => setOrganisme(o.id, { url: e.target.value })}
                      />
                    </div>
                    <Deplacer liste={pied.organismes} index={index} onChange={(next) => set('organismes', next)} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={charge}
                      onClick={async () => {
                        const id = await recuperer(o)
                        if (id) {
                          setOrganisme(o.id, { logoMediaId: id })
                          toast.success('Logo récupéré — pensez à enregistrer.')
                        }
                      }}
                    >
                      {charge ? <Loader2 className="animate-spin" /> : <Download />}
                      {charge ? 'Recherche du logo…' : logo ? 'Récupérer à nouveau' : 'Récupérer le logo sur son site'}
                    </Button>
                    {logo && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setOrganisme(o.id, { logoMediaId: null })}>
                        <ImageOff />
                        Retirer le logo
                      </Button>
                    )}
                    {o.url && (
                      <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 text-[13px] text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Voir le site
                      </a>
                    )}
                    <Button type="button" variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => set('organismes', pied.organismes.filter((x) => x.id !== o.id))}>
                      <Trash2 />
                      Retirer l’organisme
                    </Button>
                  </div>
                  <details className="mt-2 text-[13px] text-muted-foreground">
                    <summary className="cursor-pointer select-none py-1">Choisir le logo dans la médiathèque</summary>
                    <MediaPicker value={o.logoMediaId} onChange={(id) => setOrganisme(o.id, { logoMediaId: id })} library={medias} label="Logo" className="mt-2 max-w-[280px]" />
                  </details>
                </li>
              )
            })}
          </ul>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => set('organismes', [...pied.organismes, { id: nouvelId(), sigle: '', nom: '', url: '', logoMediaId: null }])}>
              <Plus />
              Ajouter un organisme
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard id="deontologie" title="Déontologie" note="Vos engagements, votre adhésion, votre assurance : affichés dans les mentions légales." layout="stack">
        <div className="mt-4">
          <Zone
            label="Texte"
            value={pied.deontologie}
            onChange={(v) => set('deontologie', v)}
            rows={6}
            help="Pour un lien : [texte affiché](https://adresse.fr). Vide : le paragraphe n’apparaît pas."
          />
        </div>
      </SectionCard>

      <SectionCard id="collegues" title="Sites de collègues" note="Les sites de vos amis et collègues, présentés dans le pied de page. Chacun s’ouvre dans un nouvel onglet." layout="stack">
        <div className="mt-4 grid gap-3">
          <Field label="Titre" value={pied.amisTitre} onChange={(v) => set('amisTitre', v)} placeholder="Des collègues que je recommande" />
          {pied.amis.length > 0 && (
            <ul className="grid gap-2">
              {pied.amis.map((a, index) => (
                <li key={a.id} {...glisserAmis.element(index)} className={cn('flex flex-wrap items-center gap-2 rounded-[14px] bg-white p-3 shadow-[0_1px_2px_rgba(22,73,81,0.06)]', CLASSES_GLISSER)}>
                  <span {...glisserAmis.poignee(index)} className="grid h-8 w-6 shrink-0 place-items-center rounded-[6px] text-muted-foreground hover:bg-muted">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <Input className="min-w-[160px] flex-1" value={a.nom} placeholder="Nom" aria-label={`Nom du collègue ${index + 1}`} onChange={(e) => setAmi(a.id, { nom: e.target.value })} />
                  <Input className="min-w-[160px] flex-1" value={a.description} placeholder="Psychologue à Rennes" aria-label={`Métier du collègue ${index + 1}`} onChange={(e) => setAmi(a.id, { description: e.target.value })} />
                  <Input className="min-w-[200px] flex-[1.4]" value={a.url} placeholder="https://…" aria-label={`Site du collègue ${index + 1}`} onChange={(e) => setAmi(a.id, { url: e.target.value })} />
                  <Deplacer liste={pied.amis} index={index} onChange={(next) => set('amis', next)} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Retirer le collègue ${index + 1}`} onClick={() => set('amis', pied.amis.filter((x) => x.id !== a.id))}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => set('amis', [...pied.amis, { id: nouvelId(), nom: '', description: '', url: '' }])}>
              <Plus />
              Ajouter un collègue
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="mentions"
        title="Mentions légales"
        note="Votre nom, votre adresse, votre téléphone et votre e-mail viennent de l’onglet Coordonnées. Une ligne laissée vide n’apparaît pas."
        actions={
          <a href="/moderne/mentions-legales" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#176c79] hover:underline">
            Voir la page <ExternalLink className="h-3.5 w-3.5" />
          </a>
        }
      >
        <Field label="Statut" value={pied.statut} onChange={(v) => set('statut', v)} placeholder="Entrepreneure individuelle" />
        <Field label="SIRET" value={pied.siret} onChange={(v) => set('siret', v)} placeholder="123 456 789 00012" help="Obligatoire pour une activité déclarée." />
        <Field label="N° ADELI / RPPS (si vous en avez un)" value={pied.adeli} onChange={(v) => set('adeli', v)} />
        <Field label="Assurance professionnelle" value={pied.assurance} onChange={(v) => set('assurance', v)} placeholder="Nom de l’assureur — n° de contrat" />
        <Zone
          label="Médiateur de la consommation"
          value={pied.mediateur}
          onChange={(v) => set('mediateur', v)}
          rows={2}
          help="Obligatoire pour toute activité auprès de particuliers : le nom et le site du médiateur auquel vous avez adhéré, par ex. [CM2C](https://www.cm2c.net)."
        />
        <Zone label="Hébergeur" value={pied.hebergeur} onChange={(v) => set('hebergeur', v)} rows={2} />
        <Zone label="Crédits (photos, réalisation)" value={pied.credits} onChange={(v) => set('credits', v)} rows={2} help="Par ex. : Photos : Unsplash. Pour un lien : [texte](https://…)." />
        {pied.complementMentions && (
          <Zone label="Texte complémentaire (ancien)" value={pied.complementMentions} onChange={(v) => set('complementMentions', v)} rows={3} help="Ajouté à la fin de la page. Vous pouvez le déplacer dans une rubrique ci-dessous, puis vider ce champ." />
        )}
      </SectionCard>

      <SectionCard id="texte-mentions" title="Texte des mentions légales" note="Toute la page se modifie ici : son titre, et chaque rubrique sous le tableau de vos informations." layout="stack">
        <div className="mt-1 grid gap-3.5 sm:grid-cols-3">
          <Field label="Petit titre" value={pied.mentionsSurtitre} onChange={(v) => set('mentionsSurtitre', v)} placeholder="Informations légales" />
          <Field label="Titre de la page" value={pied.mentionsTitre} onChange={(v) => set('mentionsTitre', v)} placeholder="Mentions légales" />
          <Field label="Titre du tableau" value={pied.editeurTitre} onChange={(v) => set('editeurTitre', v)} placeholder="Éditrice du site" />
        </div>
        <div className="mt-4">
          <RubriquesEditor page="mentions légales" rubriques={pied.mentionsRubriques} depart={PIED_DEPART.mentionsRubriques} onChange={(v) => set('mentionsRubriques', v)} />
        </div>
      </SectionCard>

      <SectionCard
        id="confidentialite"
        title="Confidentialité et cookies"
        note="La politique de confidentialité est rédigée pour vous. Le site ne dépose aucun cookie de statistiques ni de publicité : pas de bandeau à afficher. Le plan Google Maps et les vidéos ne se chargent qu’au clic du visiteur."
        actions={
          <a href="/moderne/confidentialite" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#176c79] hover:underline">
            Voir la page <ExternalLink className="h-3.5 w-3.5" />
          </a>
        }
      >
        <Field label="Durée de conservation des messages" value={pied.conservation} onChange={(v) => set('conservation', v)} help="Le mot-clé {conservation} : « Vos messages sont conservés … »." />
        <Zone
          label="Prestataires techniques"
          value={pied.prestataires}
          onChange={(v) => set('prestataires', v)}
          rows={4}
          help="Ceux qui hébergent le site et transmettent les messages : un par ligne, avec leur rôle et leur pays."
        />
        {pied.complementConfidentialite && (
          <Zone label="Texte complémentaire (ancien)" value={pied.complementConfidentialite} onChange={(v) => set('complementConfidentialite', v)} rows={3} help="Ajouté à la fin de la page. Vous pouvez le déplacer dans une rubrique ci-dessous, puis vider ce champ." />
        )}
      </SectionCard>

      <SectionCard id="texte-confidentialite" title="Texte de la politique de confidentialité" note="Toute la page se modifie ici : son titre, son introduction et chaque rubrique." layout="stack">
        <div className="mt-1 grid gap-3.5 sm:grid-cols-2">
          <Field label="Petit titre" value={pied.confidentialiteSurtitre} onChange={(v) => set('confidentialiteSurtitre', v)} placeholder="Vos données" />
          <Field label="Titre de la page" value={pied.confidentialiteTitre} onChange={(v) => set('confidentialiteTitre', v)} placeholder="Politique de confidentialité" />
        </div>
        <div className="mt-3.5">
          <Zone label="Introduction" value={pied.confidentialiteIntro} onChange={(v) => set('confidentialiteIntro', v)} rows={4} />
        </div>
        <div className="mt-4">
          <RubriquesEditor
            page="confidentialité"
            rubriques={pied.confidentialiteRubriques}
            depart={PIED_DEPART.confidentialiteRubriques}
            onChange={(v) => set('confidentialiteRubriques', v)}
          />
        </div>
      </SectionCard>

      <SectionCard id="liens-legaux" title="Liens en bas de page" note="Les deux liens de la dernière ligne du pied de page, vers les pages ci-dessus. Ils en sont aussi le titre d’onglet.">
        <Field label="Lien des mentions légales" value={pied.lienMentions} onChange={(v) => set('lienMentions', v)} placeholder="Mentions légales" />
        <Field label="Lien de la confidentialité" value={pied.lienConfidentialite} onChange={(v) => set('lienConfidentialite', v)} placeholder="Confidentialité" />
      </SectionCard>
    </>
  )
}
