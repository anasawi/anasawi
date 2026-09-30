'use client'

import { ChevronDown, Plus, X } from 'lucide-react'
import { useState } from 'react'

import { Field } from '../form/Field'
import { FieldError } from '../form/FieldError'
import { SectionCard } from '../form/SectionCard'
import { LogoPreview } from '../LogoPreview'
import { MediaPicker } from '../MediaPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Media, OpeningHour, SocialLink } from '@/server/db/schema'

/** Les champs texte du formulaire Coordonnées, tels que tapés. */
export type CoordonneesForm = {
  siteName: string
  practitionerName: string
  practitionerTitle: string
  tagline: string
  contactEmail: string
  contactPhone: string
  addressStreet: string
  addressPostalCode: string
  addressCity: string
  addressCountry: string
  latitude: string
  longitude: string
  practicalInfo: string
  bookingUrl: string
}

/**
 * L'onglet Coordonnées : qui vous êtes, comment on vous joint, vos
 * horaires. Tout l'état vit dans `SettingsWorkbench` — ce composant ne
 * fait qu'afficher et remonter chaque frappe.
 */
export function CoordonneesTab({
  form,
  onField,
  errorOf,
  hours,
  onHours,
  socials,
  onSocials,
  logoMediaId,
  onLogo,
  library,
}: {
  form: CoordonneesForm
  onField: (key: keyof CoordonneesForm, value: string) => void
  errorOf: (key: string) => string | undefined
  hours: OpeningHour[]
  onHours: (next: OpeningHour[]) => void
  socials: SocialLink[]
  onSocials: (next: SocialLink[]) => void
  logoMediaId: string | null
  onLogo: (id: string | null) => void
  library: Media[]
}) {
  return (
    <>
      <SectionCard
        id="identite"
        title="Identité"
        note="Le nom du site et le vôtre, tels qu’ils apparaissent partout."
      >
        <Field
          label="Nom du site"
          value={form.siteName}
          onChange={(v) => onField('siteName', v)}
          error={errorOf('siteName')}
        />
        <Field
          label="Accroche"
          value={form.tagline}
          onChange={(v) => onField('tagline', v)}
          help="La phrase courte qui accompagne le nom."
          error={errorOf('tagline')}
        />
        <Field
          label="Votre nom"
          value={form.practitionerName}
          onChange={(v) => onField('practitionerName', v)}
          help="Permet aussi qu’on vous trouve par votre nom sur Google."
          error={errorOf('practitionerName')}
        />
        <Field
          label="Titre professionnel"
          value={form.practitionerTitle}
          onChange={(v) => onField('practitionerTitle', v)}
          placeholder="Thérapeute"
          error={errorOf('practitionerTitle')}
        />

        <MediaPicker
          label="Logo du site"
          value={logoMediaId}
          onChange={onLogo}
          library={library}
          className="max-w-xs"
        />
        <div className="self-end">
          <p className="text-[12px] leading-[1.6] text-muted-foreground">
            Il apparaît dans l’en-tête du site, dans l’onglet du
            navigateur et sur l’écran d’accueil d’un téléphone.
            Sans choix, le logo livré avec le site est utilisé.
          </p>
          <LogoPreview url={library.find((m) => m.id === logoMediaId)?.url} />
        </div>
      </SectionCard>

      <SectionCard
        id="coordonnees"
        title="Coordonnées"
        note="Utilisées par la section Contact et le pied de page. Un champ vide est simplement omis — rien n’est inventé."
      >
        <Field
          label="Téléphone"
          value={form.contactPhone}
          onChange={(v) => onField('contactPhone', v)}
          error={errorOf('contactPhone')}
        />
        <Field
          label="Adresse e-mail"
          value={form.contactEmail}
          onChange={(v) => onField('contactEmail', v)}
          error={errorOf('contactEmail')}
        />
        <Field
          label="Rue"
          value={form.addressStreet}
          onChange={(v) => onField('addressStreet', v)}
          full
          error={errorOf('addressStreet')}
        />
        <Field
          label="Code postal"
          value={form.addressPostalCode}
          onChange={(v) => onField('addressPostalCode', v)}
          error={errorOf('addressPostalCode')}
        />
        <Field
          label="Ville"
          value={form.addressCity}
          onChange={(v) => onField('addressCity', v)}
          error={errorOf('addressCity')}
        />
        <Field
          label="Lien de prise de rendez-vous"
          value={form.bookingUrl}
          onChange={(v) => onField('bookingUrl', v)}
          placeholder="https://…"
          help="Si vide, le bouton « Prendre rendez-vous » mène vers la section Contact."
          full
          error={errorOf('bookingUrl')}
        />

        <div className="sm:col-span-2">
          <Label htmlFor="reglage-informations-pratiques" className="mb-2 block">
            Informations pratiques
          </Label>
          <Textarea
            id="reglage-informations-pratiques"
            rows={4}
            value={form.practicalInfo}
            aria-invalid={errorOf('practicalInfo') ? true : undefined}
            aria-describedby={
              errorOf('practicalInfo')
                ? 'reglage-informations-pratiques-erreur'
                : undefined
            }
            onChange={(e) => onField('practicalInfo', e.target.value)}
          />
          <FieldError
            id="reglage-informations-pratiques-erreur"
            messages={errorOf('practicalInfo')}
            className="mt-1.5 text-xs text-destructive"
          />
        </div>

        <div className="sm:col-span-2">
          <Label className="mb-2 block">Réseaux sociaux</Label>
          <RepeatableList
            items={socials}
            onChange={onSocials}
            blank={{ label: '', url: '' }}
            addLabel="Ajouter un réseau"
            render={(item, update, index) => (
              <>
                <Input
                  value={item.label}
                  placeholder="Instagram"
                  aria-label={`Nom du réseau ${index + 1}`}
                  onChange={(e) => update({ ...item, label: e.target.value })}
                />
                <Input
                  value={item.url}
                  placeholder="https://…"
                  aria-label={`Adresse du réseau ${index + 1}`}
                  onChange={(e) => update({ ...item, url: e.target.value })}
                />
              </>
            )}
          />
        </div>

        {/* Latitude et longitude : utiles aux cartes, jamais tapées
            de tête — donc à l'écart, avec la marche à suivre. */}
        <OptionsAvancees
          id="coordonnees-avance"
          forcer={Boolean(errorOf('latitude') || errorOf('longitude'))}
          ouvertAuDepart={Boolean(form.latitude || form.longitude)}
          help="Facultatif — situe le cabinet sur les cartes (Google Maps, Apple Plans). Trouvez ces deux nombres sur Google Maps : clic droit sur le lieu, le premier nombre est la latitude, le second la longitude."
        >
          <Field
            label="Latitude"
            value={form.latitude}
            onChange={(v) => onField('latitude', v)}
            placeholder="48.1213"
            error={errorOf('latitude')}
          />
          <Field
            label="Longitude"
            value={form.longitude}
            onChange={(v) => onField('longitude', v)}
            placeholder="-1.6033"
            error={errorOf('longitude')}
          />
        </OptionsAvancees>
      </SectionCard>

      <SectionCard
        id="horaires"
        title="Horaires"
        note="Une ligne par plage — le libellé de gauche est affiché tel quel."
      >
        <RepeatableList
          items={hours}
          onChange={onHours}
          blank={{ day: '', hours: '' }}
          addLabel="Ajouter un horaire"
          render={(item, update, index) => (
            <>
              <Input
                value={item.day}
                placeholder="Lundi – Vendredi"
                aria-label={`Jours de la plage ${index + 1}`}
                onChange={(e) => update({ ...item, day: e.target.value })}
              />
              <Input
                value={item.hours}
                placeholder="09:00 – 19:00"
                aria-label={`Heures de la plage ${index + 1}`}
                onChange={(e) => update({ ...item, hours: e.target.value })}
              />
            </>
          )}
        />
      </SectionCard>
    </>
  )
}

/**
 * Un bloc replié « Options avancées » : ce qu'on ne touche presque
 * jamais, à l'écart mais à portée. S'ouvre tout seul si quelque chose y
 * est déjà renseigné ou si le serveur y signale une erreur.
 */
function OptionsAvancees({
  id,
  help,
  forcer,
  ouvertAuDepart,
  children,
}: {
  id: string
  help: string
  forcer: boolean
  ouvertAuDepart: boolean
  children: React.ReactNode
}) {
  const [ouvert, setOuvert] = useState(ouvertAuDepart)
  const visible = ouvert || forcer

  return (
    <div className="sm:col-span-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={visible}
        aria-controls={id}
        onClick={() => setOuvert((v) => !v)}
        className="-ml-2"
      >
        <ChevronDown
          className={cn('transition-transform', visible && 'rotate-180')}
        />
        {visible ? 'Masquer' : 'Afficher'} les options avancées
      </Button>
      {visible && (
        <div id={id} className="mt-2 rounded-lg border border-border bg-ivory/50 p-4">
          <p className="mb-4 text-xs leading-[1.6] text-muted-foreground">
            {help}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </div>
      )}
    </div>
  )
}

function RepeatableList<T>({
  items,
  onChange,
  blank,
  addLabel,
  render,
}: {
  items: T[]
  onChange: (next: T[]) => void
  blank: T
  addLabel: string
  render: (item: T, update: (next: T) => void, index: number) => React.ReactNode
}) {
  return (
    <div className="sm:col-span-2">
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                {render(
                  item,
                  (next) => {
                    const copy = [...items]
                    copy[index] = next
                    onChange(copy)
                  },
                  index,
                )}
              </div>
              {/* Retirer une ligne : un bouton nommé, pas une icône seule. */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Retirer la ligne ${index + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X />
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, structuredClone(blank)])}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}
