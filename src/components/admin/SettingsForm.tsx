'use client'

import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { MediaPicker } from './MediaPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateSettings } from '@/server/actions/content'
import type {
  Media,
  OpeningHour,
  Settings,
  SocialLink,
} from '@/server/db/schema'

export function SettingsForm({
  settings,
  library,
}: {
  settings: Settings
  library: Media[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    siteName: settings.siteName,
    practitionerName: settings.practitionerName,
    practitionerTitle: settings.practitionerTitle ?? '',
    tagline: settings.tagline ?? '',
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    addressStreet: settings.addressStreet ?? '',
    addressPostalCode: settings.addressPostalCode ?? '',
    addressCity: settings.addressCity ?? '',
    addressCountry: settings.addressCountry ?? 'FR',
    latitude: settings.latitude ?? '',
    longitude: settings.longitude ?? '',
    practicalInfo: settings.practicalInfo ?? '',
    bookingUrl: settings.bookingUrl ?? '',
    defaultSeoTitle: settings.defaultSeoTitle ?? '',
    defaultSeoDescription: settings.defaultSeoDescription ?? '',
  })

  const [hours, setHours] = useState<OpeningHour[]>(
    (settings.openingHours as OpeningHour[]) ?? [],
  )
  const [socials, setSocials] = useState<SocialLink[]>(
    (settings.socialLinks as SocialLink[]) ?? [],
  )
  const [ogMediaId, setOgMediaId] = useState(settings.defaultOgMediaId)
  const [pending, start] = useTransition()

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  function save() {
    start(async () => {
      const result = await updateSettings({
        ...form,
        practitionerTitle: form.practitionerTitle || null,
        tagline: form.tagline || null,
        contactPhone: form.contactPhone || null,
        addressStreet: form.addressStreet || null,
        addressPostalCode: form.addressPostalCode || null,
        addressCity: form.addressCity || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        practicalInfo: form.practicalInfo || null,
        defaultSeoTitle: form.defaultSeoTitle || null,
        defaultSeoDescription: form.defaultSeoDescription || null,
        openingHours: hours.filter((h) => h.day && h.hours),
        socialLinks: socials.filter((s) => s.label && s.url),
        defaultOgMediaId: ogMediaId,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Paramètres enregistrés.')
      router.refresh()
    })
  }

  return (
    <div className="max-w-3xl space-y-10">
      <Section
        title="Identité"
        note="Ces informations alimentent le pied de page et les données structurées Schema.org."
      >
        <Field label="Nom du site" value={form.siteName} onChange={(v) => set('siteName', v)} />
        <Field
          label="Nom de la praticienne"
          value={form.practitionerName}
          onChange={(v) => set('practitionerName', v)}
          help="Apparaît dans le JSON-LD Person — essentiel pour la recherche du nom."
        />
        <Field
          label="Titre professionnel"
          value={form.practitionerTitle}
          onChange={(v) => set('practitionerTitle', v)}
          placeholder="Thérapeute"
        />
        <Field
          label="Accroche"
          value={form.tagline}
          onChange={(v) => set('tagline', v)}
          full
        />
      </Section>

      <Section
        title="Contact"
        note="Utilisé par la section Contact du site, le pied de page et le JSON-LD LocalBusiness. Un champ vide est simplement omis — rien n’est inventé."
      >
        <Field label="E-mail" value={form.contactEmail} onChange={(v) => set('contactEmail', v)} />
        <Field label="Téléphone" value={form.contactPhone} onChange={(v) => set('contactPhone', v)} />
        <Field label="Rue" value={form.addressStreet} onChange={(v) => set('addressStreet', v)} full />
        <Field label="Code postal" value={form.addressPostalCode} onChange={(v) => set('addressPostalCode', v)} />
        <Field label="Ville" value={form.addressCity} onChange={(v) => set('addressCity', v)} />
        <Field label="Latitude" value={form.latitude} onChange={(v) => set('latitude', v)} placeholder="48.1213" />
        <Field label="Longitude" value={form.longitude} onChange={(v) => set('longitude', v)} placeholder="-1.6033" />
        <Field
          label="Lien de prise de rendez-vous"
          value={form.bookingUrl}
          onChange={(v) => set('bookingUrl', v)}
          placeholder="https://…"
          help="Si vide, le bouton « Prendre rendez-vous » pointe vers la section Contact."
          full
        />

        <div className="sm:col-span-2">
          <Label className="mb-2 block">Informations pratiques</Label>
          <Textarea
            rows={4}
            value={form.practicalInfo}
            onChange={(e) => set('practicalInfo', e.target.value)}
          />
        </div>
      </Section>

      <Section title="Horaires">
        <RepeatableList
          items={hours}
          onChange={setHours}
          blank={{ day: '', hours: '' }}
          addLabel="Ajouter un horaire"
          render={(item, update) => (
            <>
              <Input
                value={item.day}
                placeholder="Lundi – Vendredi"
                onChange={(e) => update({ ...item, day: e.target.value })}
              />
              <Input
                value={item.hours}
                placeholder="09:00 – 19:00"
                onChange={(e) => update({ ...item, hours: e.target.value })}
              />
            </>
          )}
        />
      </Section>

      <Section title="Réseaux">
        <RepeatableList
          items={socials}
          onChange={setSocials}
          blank={{ label: '', url: '' }}
          addLabel="Ajouter un lien"
          render={(item, update) => (
            <>
              <Input
                value={item.label}
                placeholder="Instagram"
                onChange={(e) => update({ ...item, label: e.target.value })}
              />
              <Input
                value={item.url}
                placeholder="https://…"
                onChange={(e) => update({ ...item, url: e.target.value })}
              />
            </>
          )}
        />
      </Section>

      <Section
        title="SEO par défaut"
        note="Valeurs de repli quand une page ne définit pas les siennes."
      >
        <Field
          label="Titre par défaut"
          value={form.defaultSeoTitle}
          onChange={(v) => set('defaultSeoTitle', v)}
          full
        />
        <div className="sm:col-span-2">
          <Label className="mb-2 block">Description par défaut</Label>
          <Textarea
            rows={3}
            value={form.defaultSeoDescription}
            onChange={(e) => set('defaultSeoDescription', e.target.value)}
          />
        </div>
        <MediaPicker
          label="Image de partage par défaut"
          value={ogMediaId}
          onChange={setOgMediaId}
          library={library}
          className="max-w-xs"
        />
      </Section>

      <div className="sticky bottom-0 flex justify-end border-t border-border bg-background/90 py-4 backdrop-blur">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </Button>
      </div>
    </div>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      {note && (
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{note}</p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
  full,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  help?: string
  full?: boolean
}) {
  const id = `setting-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`

  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <Label htmlFor={id} className="mb-2 block">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
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
  render: (item: T, update: (next: T) => void) => React.ReactNode
}) {
  return (
    <div className="sm:col-span-2">
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                {render(item, (next) => {
                  const copy = [...items]
                  copy[index] = next
                  onChange(copy)
                })}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retirer"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X className="text-destructive" />
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
