/**
 * Descripteurs de champs.
 *
 * Chaque bloc décrit ses champs une seule fois. Le formulaire de l'admin est
 * généré à partir de cette description — il n'y a donc pas un éditeur React à
 * écrire et à maintenir par type de bloc. Ajouter un champ à un bloc, c'est
 * ajouter une ligne ici et une ligne dans son schéma Zod.
 */

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'media'
  | 'mediaList'
  | 'select'
  | 'list'

export type FieldDescriptor = {
  /** Clé dans le payload du bloc. */
  name: string
  label: string
  kind: FieldKind
  help?: string
  placeholder?: string
  /** Pour `select`. */
  options?: readonly { value: string; label: string }[]
  /** Pour `list` — champs de chaque élément de la liste. */
  itemFields?: readonly FieldDescriptor[]
  /** Étiquette du bouton d'ajout d'un élément de liste. */
  addLabel?: string
  /** Occupe toute la largeur du formulaire. */
  full?: boolean
}

export const field = {
  text: (
    name: string,
    label: string,
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({ name, label, kind: 'text', ...extra }),

  textarea: (
    name: string,
    label: string,
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({
    name,
    label,
    kind: 'textarea',
    full: true,
    ...extra,
  }),

  richtext: (
    name: string,
    label: string,
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({
    name,
    label,
    kind: 'richtext',
    full: true,
    help: 'Un paragraphe par ligne vide.',
    ...extra,
  }),

  media: (
    name: string,
    label: string,
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({ name, label, kind: 'media', ...extra }),

  mediaList: (
    name: string,
    label: string,
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({ name, label, kind: 'mediaList', full: true, ...extra }),

  boolean: (
    name: string,
    label: string,
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({ name, label, kind: 'boolean', ...extra }),

  number: (
    name: string,
    label: string,
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({ name, label, kind: 'number', ...extra }),

  select: (
    name: string,
    label: string,
    options: readonly { value: string; label: string }[],
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({ name, label, kind: 'select', options, ...extra }),

  list: (
    name: string,
    label: string,
    itemFields: readonly FieldDescriptor[],
    extra: Partial<FieldDescriptor> = {},
  ): FieldDescriptor => ({
    name,
    label,
    kind: 'list',
    itemFields,
    full: true,
    ...extra,
  }),
} as const
