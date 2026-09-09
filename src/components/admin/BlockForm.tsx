'use client'

import { Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { MediaLibraryDialog } from './MediaPicker'
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
import type { Media } from '@/server/db/schema'

type Payload = Record<string, unknown>

/* Les valeurs exactes de la maquette (`.f`) : label 11,5 px encre douce,
   champ blanc bordé, rayon 8, texte 12,5 px, focus bleu profond. */
const LABEL_CLASS = 'mb-[5px] block text-[11.5px] font-normal text-ink-soft'
const FIELD_CLASS =
  'h-auto min-h-0 rounded-[8px] border-line-strong bg-white px-2.5 py-2 text-[12.5px] focus-visible:border-blue-deep focus-visible:ring-0'

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
}: {
  fields: readonly FieldDescriptor[]
  value: Payload
  onChange: (next: Payload) => void
  library: Media[]
}) {
  const set = (name: string, next: unknown) =>
    onChange({ ...value, [name]: next })

  return (
    <div className="grid grid-cols-1 gap-3">
      {fields.map((field) => (
        <div key={field.name}>
          <FieldControl
            field={field}
            value={value[field.name]}
            onChange={(next) => set(field.name, next)}
            library={library}
          />
        </div>
      ))}
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
            className="cursor-pointer text-[11.5px] font-normal text-ink-soft"
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
                      'flex-1 py-[7px] text-[11.5px] transition-colors',
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
              className="h-auto rounded-[8px] border-line-strong bg-white px-2.5 py-2 text-[12.5px]"
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
        <p className="mt-1.5 text-[0.7rem] leading-[1.5] text-muted-foreground">
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

  return (
    <Wrapper id={`field-${field.name}`} field={field}>
      <div className="flex items-center gap-2.5">
        {selected ? (
          <span className="relative block h-[42px] w-14 shrink-0 overflow-hidden rounded-[7px] bg-muted">
            <Image
              src={selected.url}
              alt={selected.alt}
              fill
              sizes="56px"
              className="object-cover"
            />
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
          {selected ? 'Changer l’image' : 'Choisir une image'}
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

  const blank = () =>
    Object.fromEntries(itemFields.map((f) => [f.name, ''])) as Payload

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    if (item) next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-[11.5px] font-normal text-ink-soft">
          {field.label}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, blank()])}
        >
          <Plus />
          {field.addLabel ?? 'Ajouter'}
        </Button>
      </div>

      {field.help && (
        <p className="mb-3 text-xs text-muted-foreground">{field.help}</p>
      )}

      {value.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-line-strong px-3 py-5 text-center text-[0.72rem] text-muted-foreground">
          Aucun élément.
        </p>
      ) : singleTextItem ? (
        /* Liste à champ unique (ex. les lignes d'un titre) : une seule
           rangée compacte par élément — numéro, champ, flèches, croix. */
        <ul className="space-y-1.5">
          {value.map((item, index) => {
            const sub = itemFields[0]
            if (!sub) return null
            return (
              <li key={index} className="flex items-center gap-1.5">
                <span className="w-3.5 shrink-0 text-right text-[0.68rem] tabular-nums text-muted-foreground">
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
                  className="h-8 min-w-0 flex-1 rounded-[8px] border border-line-strong bg-white px-2.5 text-[12.5px] outline-none transition-colors focus:border-blue-deep"
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
              className="rounded-[8px] border border-border bg-card p-2.5"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.68rem] tabular-nums text-muted-foreground">
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

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-[11.5px] font-normal text-ink-soft">
          {field.label}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Plus />
          Ajouter une image
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-line-strong px-3 py-5 text-center text-xs text-muted-foreground">
          Aucune image.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5">
          {value.map((id, index) => {
            const media = byId.get(id)
            return (
              <li
                key={`${id}-${index}`}
                className="group relative overflow-hidden rounded-md border border-border"
              >
                <span className="relative block aspect-square bg-muted">
                  {media && (
                    <Image
                      src={media.url}
                      alt={media.alt}
                      fill
                      sizes="140px"
                      className="object-cover"
                    />
                  )}
                </span>
                <button
                  type="button"
                  aria-label="Retirer l’image"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        items={items}
        onAdd={(media) => setItems((prev) => [media, ...prev])}
        onSelect={(id) => {
          onChange([...value, id])
          setOpen(false)
        }}
      />
    </div>
  )
}
