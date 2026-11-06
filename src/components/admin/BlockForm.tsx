'use client'

import { GripVertical, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { CLASSES_GLISSER, useGlisser } from './form/useGlisser'
import { LinkField } from './LinkField'
import { MediaLibraryDialog } from './MediaPicker'
import { MediaThumb } from './MediaThumb'
import type { FieldDescriptor } from '@/blocks/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { updateMedia } from '@/server/actions/media'
import type { Media } from '@/server/db/schema'

type Payload = Record<string, unknown>

/* Les valeurs exactes de la maquette (`.f`) : label 11,5 px encre douce,
   champ blanc bordé, rayon 8, texte 12,5 px, focus bleu profond. */
const LABEL_CLASS = 'mb-[7px] block text-[12.5px] font-medium leading-4 text-[#6b8186]'
const FIELD_CLASS =
  'h-auto min-h-0 rounded-[9px] px-2.5 py-2 text-[13.5px]'

/**
 * Formulaire généré à partir des descripteurs de champs du bloc.
 *
 * C'est ce qui évite d'écrire — et de maintenir — un éditeur React par type de
 * section. Ajouter un champ à un bloc se fait en une ligne dans sa définition ;
 * le formulaire suit. Il vit dans le panneau de droite (300 px) : une seule
 * colonne, toujours.
 */
export function BlockForm({
  fields,
  value,
  onChange,
  library,
  errors,
}: {
  fields: readonly FieldDescriptor[]
  value: Payload
  onChange: (next: Payload) => void
  library: Media[]
  /** Erreurs par champ renvoyées par le serveur — affichées SOUS le champ
      concerné, là où on peut corriger, et pas seulement dans un toast. */
  errors?: Record<string, string[]>
}) {
  const set = (name: string, next: unknown) =>
    onChange({ ...value, [name]: next })

  return (
    <div className="grid grid-cols-1 gap-3.5">
      {fields.map((field) => {
        const erreur = errors?.[field.name]?.[0]
        return (
          <div key={field.name}>
            <FieldControl
              field={field}
              value={value[field.name]}
              onChange={(next) => set(field.name, next)}
              library={library}
            />
            {erreur && (
              <p role="alert" className="mt-1.5 text-[12px] leading-snug text-destructive">
                {erreur}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldControl({
  field,
  value,
  onChange,
  library,
}: {
  field: FieldDescriptor
  value: unknown
  onChange: (next: unknown) => void
  library: Media[]
}) {
  const id = `field-${field.name}`

  switch (field.kind) {
    case 'textarea':
    case 'richtext':
      return (
        <Wrapper id={id} field={field}>
          <Textarea
            id={id}
            rows={field.kind === 'richtext' ? 8 : 3}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              FIELD_CLASS,
              'resize-none',
              /* La maquette fixe le champ texte à 64 px ; on garde plus
                 d'air pour les longs paragraphes. */
              field.kind === 'richtext' ? 'h-32' : 'h-16',
            )}
          />
        </Wrapper>
      )

    case 'number':
      return (
        <Wrapper id={id} field={field}>
          <Input
            id={id}
            type="number"
            value={Number(value ?? 0)}
            onChange={(e) => onChange(e.target.valueAsNumber || 0)}
            className={FIELD_CLASS}
          />
        </Wrapper>
      )

    case 'boolean':
      return (
        <div className="flex items-center justify-between gap-3 py-0.5">
          <Label
            htmlFor={id}
            className="cursor-pointer text-[13px] font-normal text-foreground/80"
          >
            {field.label}
          </Label>
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      )

    case 'select': {
      const options = field.options ?? []

      /* Deux ou trois choix : un contrôle segmenté se lit d'un coup d'œil,
         sans ouvrir de menu. Au-delà, le menu déroulant reste de mise. */
      if (options.length >= 2 && options.length <= 3) {
        return (
          <Wrapper id={id} field={field}>
            <div
              role="group"
              aria-label={field.label}
              className="flex overflow-hidden rounded-[8px] border border-line-strong"
            >
              {options.map((option, index) => {
                const selected = String(value ?? '') === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(option.value)}
                    className={cn(
                      'flex-1 py-[7px] text-[12.5px] transition-colors',
                      index > 0 && 'border-l border-line',
                      selected
                        ? 'bg-blue-mist font-medium text-blue-deep'
                        : 'bg-white text-ink-soft hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </Wrapper>
        )
      }

      return (
        <Wrapper id={id} field={field}>
          <Select
            value={String(value ?? '')}
            onValueChange={(next) => onChange(next)}
          >
            <SelectTrigger
              id={id}
              className="h-auto rounded-[9px] px-2.5 py-2 text-[13.5px]"
            >
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Wrapper>
      )
    }

    case 'media':
      return (
        <ImagePickField
          field={field}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          library={library}
        />
      )

    case 'mediaList':
      return (
        <MediaListField
          field={field}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          library={library}
        />
      )

    case 'list':
      return (
        <ListField
          field={field}
          value={Array.isArray(value) ? (value as Payload[]) : []}
          onChange={onChange}
          library={library}
        />
      )

    case 'text':
    default:
      /* Un champ « lien » se règle en choisissant sa destination, pas en
         tapant « #contact ». */
      if (field.name === 'href' || field.name.endsWith('Href')) {
        return (
          <Wrapper id={id} field={field}>
            <LinkField id={id} value={String(value ?? '')} onChange={onChange} />
          </Wrapper>
        )
      }
      return (
        <Wrapper id={id} field={field}>
          <Input
            id={id}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={FIELD_CLASS}
          />
        </Wrapper>
      )
  }
}

function Wrapper({
  id,
  field,
  children,
}: {
  id: string
  field: FieldDescriptor
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id} className={LABEL_CLASS}>
        {field.label}
      </Label>
      {children}
      {field.help && (
        <p className="mt-1.5 text-[12px] leading-[17px] text-muted-foreground">
          {field.help}
        </p>
      )}
    </div>
  )
}

/* ── Choix d'une image — la présentation compacte de la maquette ────── */

function ImagePickField({
  field,
  value,
  onChange,
  library,
}: {
  field: FieldDescriptor
  value: string | null
  onChange: (next: unknown) => void
  library: Media[]
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(library)
  const selected = items.find((m) => m.id === value) ?? null
  const kind = field.mediaKind ?? 'image'
  const nom = kind === 'video' ? 'la vidéo' : 'l’image'

  return (
    <Wrapper id={`field-${field.name}`} field={field}>
      <div className="flex items-center gap-2.5">
        {selected ? (
          <span className="relative block h-[42px] w-14 shrink-0 overflow-hidden rounded-[7px] bg-muted">
            <MediaThumb media={selected} sizes="56px" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="block h-[42px] w-14 shrink-0 rounded-[7px] bg-blue-mist"
          />
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[12px] text-blue-deep hover:underline"
        >
          {selected ? `Changer ${nom}` : `Choisir ${nom.replace('l’', 'une ').replace('la ', 'une ')}`}
        </button>

        {selected && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[12px] text-stone transition-colors hover:text-foreground"
          >
            Retirer
          </button>
        )}
      </div>

      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        kind={kind}
        items={items}
        onAdd={(media) => setItems((prev) => [media, ...prev])}
        onSelect={(mediaId) => {
          onChange(mediaId)
          setOpen(false)
        }}
      />
    </Wrapper>
  )
}

/* ── Liste d'éléments répétables ────────────────────────────────────── */

function ListField({
  field,
  value,
  onChange,
  library,
}: {
  field: FieldDescriptor
  value: Payload[]
  onChange: (next: Payload[]) => void
  library: Media[]
}) {
  const itemFields = field.itemFields ?? []

  /** Un seul champ texte par élément : rangée compacte, sans étiquette. */
  const singleTextItem =
    itemFields.length === 1 && itemFields[0]?.kind === 'text'

  /* Un choix vide n'existe pas : un nouvel élément prend la première
     option de chaque sélecteur, sans quoi le bloc serait invalide dès
     l'ajout d'une ligne. */
  const blank = () =>
    Object.fromEntries(
      itemFields.map((f) => [
        f.name,
        f.kind === 'select' ? (f.options?.[0]?.value ?? '') : '',
      ]),
    ) as Payload

  const glisser = useGlisser(value, onChange)
  const move = glisser.deplacer

  return (
    <div>
      <div className="mb-[7px] flex items-center justify-between gap-3">
        <Label className="text-[12.5px] font-medium leading-4 text-[#6b8186]">
          {field.label}
        </Label>
        {/* L'ajout de l'espace Qeeps : un lien, dont le + pivote. */}
        <button
          type="button"
          onClick={() => onChange([...value, blank()])}
          className="group/add inline-flex shrink-0 items-center gap-[7px] rounded-[8px] px-0.5 py-1.5 text-[13.5px] font-medium text-[#176c79] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/add:rotate-90" strokeWidth={2} />
          {field.addLabel ?? 'Ajouter'}
        </button>
      </div>

      {field.help && (
        <p className="mb-3 text-[12px] leading-[17px] text-muted-foreground">{field.help}</p>
      )}

      {value.length === 0 ? (
        <p className="rounded-[16px] border-[1.5px] border-dashed border-[#cfd9db] px-3 py-5 text-center text-[13px] text-muted-foreground">
          Aucun élément.
        </p>
      ) : singleTextItem ? (
        /* Liste à champ unique (ex. les lignes d'un titre) : une seule
           rangée compacte par élément — numéro, champ, flèches, croix. */
        <ul className="space-y-2">
          {value.map((item, index) => {
            const sub = itemFields[0]
            if (!sub) return null
            return (
              <li key={index} {...glisser.element(index)} className={cn('flex items-center gap-1.5 rounded-[10px]', CLASSES_GLISSER)}>
                <span {...glisser.poignee(index)} className="flex w-6 shrink-0 items-center justify-end gap-0.5 text-[12px] font-semibold tabular-nums text-[#8aa4a8]">
                  <GripVertical className="h-3.5 w-3.5 opacity-60" />
                  {index + 1}
                </span>
                <input
                  value={
                    typeof item[sub.name] === 'string'
                      ? (item[sub.name] as string)
                      : ''
                  }
                  placeholder={sub.label}
                  onChange={(e) => {
                    const copy = [...value]
                    copy[index] = { ...item, [sub.name]: e.target.value }
                    onChange(copy)
                  }}
                  className="h-[42px] min-w-0 flex-1 rounded-[10px] border-0 bg-white px-3.5 text-[14px] text-foreground shadow-field outline-none transition-shadow duration-200 placeholder:text-[#b0bec1] hover:shadow-[var(--admin-field-shadow),0_0_0_1px_#dfe5e7] focus:shadow-[0_0_0_1.5px_#176c79,0_4px_14px_rgba(22,73,81,0.08)]"
                />
                <RowControls
                  index={index}
                  count={value.length}
                  onMove={move}
                  onRemove={() => onChange(value.filter((_, i) => i !== index))}
                />
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="space-y-2">
          {value.map((item, index) => (
            <li
              key={index}
              {...glisser.element(index)}
              /* Une rangée blanche du répéteur Qeeps ; ses champs prennent
                 le liseré (fond blanc). On la déplace par sa poignée. */
              className={cn('field-on-white rounded-[16px] bg-white p-3.5 animate-[adm-pop_0.35s_cubic-bezier(0.22,1,0.36,1)]', CLASSES_GLISSER)}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span {...glisser.poignee(index)} className="-ml-1 flex items-center gap-1 rounded-[6px] px-1 py-0.5 text-[12px] font-semibold tabular-nums text-[#8aa4a8] hover:bg-muted">
                  <GripVertical className="h-3.5 w-3.5" />
                  {index + 1}
                </span>
                <RowControls
                  index={index}
                  count={value.length}
                  onMove={move}
                  onRemove={() => onChange(value.filter((_, i) => i !== index))}
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {itemFields.map((sub) => (
                  <div key={sub.name}>
                    <FieldControl
                      field={sub}
                      value={item[sub.name]}
                      onChange={(next) => {
                        const copy = [...value]
                        copy[index] = { ...item, [sub.name]: next }
                        onChange(copy)
                      }}
                      library={library}
                    />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Flèches et croix compactes d'un élément de liste — 24 px, discrètes. */
function RowControls({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  onMove: (from: number, to: number) => void
  onRemove: () => void
}) {
  const cls =
    'flex h-6 w-6 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-25'
  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label="Monter"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className={cls}
      >
        <span className="text-[11px] leading-none">↑</span>
      </button>
      <button
        type="button"
        aria-label="Descendre"
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        className={cls}
      >
        <span className="text-[11px] leading-none">↓</span>
      </button>
      <button
        type="button"
        aria-label="Retirer"
        onClick={onRemove}
        className="flex h-6 w-6 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

/* ── Liste d'images ─────────────────────────────────────────────────── */

function MediaListField({
  field,
  value,
  onChange,
  library,
}: {
  field: FieldDescriptor
  value: string[]
  onChange: (next: string[]) => void
  library: Media[]
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(library)
  const byId = new Map(items.map((m) => [m.id, m]))
  const glisser = useGlisser(value, onChange)

  /** La légende d'une photo (celle de la médiathèque : elle suit la photo partout). */
  const enregistrerLegende = async (media: Media, caption: string) => {
    const propre = caption.trim() || null
    if (propre === (media.caption ?? null)) return
    setItems((prev) => prev.map((m) => (m.id === media.id ? { ...m, caption: propre } : m)))
    await updateMedia(media.id, { alt: media.alt, caption: propre })
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label className="text-[12.5px] font-medium leading-4 text-[#6b8186]">
          {field.label}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Ajouter des photos
        </Button>
      </div>
      {field.help && <p className="mb-2.5 text-[12px] leading-[17px] text-muted-foreground">{field.help}</p>}

      {value.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-[16px] border-[1.5px] border-dashed border-[#cfd9db] px-3 py-6 text-center text-[13px] text-muted-foreground transition-colors hover:border-[#176c79] hover:text-foreground"
        >
          Aucune photo — cliquez pour en choisir.
        </button>
      ) : (
        <>
          <p className="mb-2 text-[12px] text-muted-foreground">Faites glisser les photos pour changer leur ordre.</p>
          <ul className="grid grid-cols-2 gap-2.5">
            {value.map((id, index) => {
              const media = byId.get(id)
              return (
                <li
                  key={`${id}-${index}`}
                  {...glisser.element(index)}
                  className="group relative rounded-[12px] bg-white p-1.5 shadow-[0_1px_2px_rgba(22,73,81,0.08)] transition-[opacity,box-shadow] duration-200 data-[cible]:shadow-[0_0_0_2px_#176c79] data-[glisse=oui]:opacity-40"
                >
                  <span {...glisser.poignee(index)} className="relative block aspect-[4/3] overflow-hidden rounded-[8px] bg-muted">
                    {media && <Image src={media.url} alt={media.alt} fill sizes="160px" draggable={false} className="pointer-events-none object-cover" />}
                    <span className="absolute left-1.5 top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-white/90 px-1 text-[11.5px] font-semibold tabular-nums text-foreground shadow-sm">
                      {index + 1}
                    </span>
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  {media && (
                    <input
                      defaultValue={media.caption ?? ''}
                      placeholder="Légende"
                      aria-label={`Légende de la photo ${index + 1}`}
                      onBlur={(e) => enregistrerLegende(media, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="mt-1.5 h-8 w-full rounded-[7px] border-0 bg-[#f4f7f8] px-2 text-[12.5px] outline-none placeholder:text-[#a5b4b7] focus:bg-white focus:shadow-[0_0_0_1.5px_#176c79]"
                    />
                  )}
                  <span className="mt-1 flex items-center justify-between">
                    <span className="flex">
                      <button type="button" aria-label="Avancer" disabled={index === 0} onClick={() => glisser.deplacer(index, index - 1)} className="grid h-6 w-6 place-items-center rounded-[5px] text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-25">
                        ←
                      </button>
                      <button type="button" aria-label="Reculer" disabled={index === value.length - 1} onClick={() => glisser.deplacer(index, index + 1)} className="grid h-6 w-6 place-items-center rounded-[5px] text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-25">
                        →
                      </button>
                    </span>
                    <button
                      type="button"
                      aria-label="Retirer la photo"
                      onClick={() => onChange(value.filter((_, i) => i !== index))}
                      className="grid h-6 w-6 place-items-center rounded-[5px] text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        items={items}
        multiple
        onAdd={(media) => setItems((prev) => [media, ...prev])}
        onSelect={(id) => {
          onChange([...value, id])
          setOpen(false)
        }}
        onSelectMany={(ids) => {
          onChange([...value, ...ids.filter((id) => !value.includes(id))])
          setOpen(false)
        }}
      />
    </div>
  )
}
