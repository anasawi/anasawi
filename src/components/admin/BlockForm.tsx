'use client'

import { GripVertical, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { MediaLibraryDialog, MediaPicker } from './MediaPicker'
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

/**
 * Formulaire généré à partir des descripteurs de champs du bloc.
 *
 * C'est ce qui évite d'écrire — et de maintenir — un éditeur React par type de
 * section. Ajouter un champ à un bloc se fait en une ligne dans sa définition ;
 * le formulaire suit.
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.name}
          className={cn(field.full && 'sm:col-span-2')}
        >
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
          />
        </Wrapper>
      )

    case 'boolean':
      return (
        <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-[7px]">
          <Label htmlFor={id} className="cursor-pointer">
            {field.label}
          </Label>
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      )

    case 'select':
      return (
        <Wrapper id={id} field={field}>
          <Select
            value={String(value ?? '')}
            onValueChange={(next) => onChange(next)}
          >
            <SelectTrigger id={id}>
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Wrapper>
      )

    case 'media':
      return (
        <MediaPicker
          label={field.label}
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
      <Label htmlFor={id} className="mb-1.5 block">
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
        <Label>{field.label}</Label>
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
        <p className="rounded-[5px] border border-dashed border-border px-3 py-5 text-center text-[0.72rem] text-muted-foreground">
          Aucun élément.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((item, index) => (
            <li
              key={index}
              className="rounded-[5px] border border-border bg-card p-3"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[0.7rem] tabular-nums text-muted-foreground">
                  <GripVertical className="h-3 w-3 opacity-50" />
                  {index + 1}
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label="Monter"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label="Descendre"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer"
                    onClick={() =>
                      onChange(value.filter((_, i) => i !== index))
                    }
                  >
                    <X className="text-destructive" />
                  </Button>
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {itemFields.map((sub) => (
                  <div
                    key={sub.name}
                    className={cn(sub.full && 'sm:col-span-2')}
                  >
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
        <Label>{field.label}</Label>
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
        <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
          Aucune image.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
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
