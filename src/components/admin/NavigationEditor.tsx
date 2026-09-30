'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import { useAnchors } from './anchors-context'
import { ActionMenu } from '@/components/ui/action-menu'
import { Button } from '@/components/ui/button'
import { Choice } from '@/components/ui/choice'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseHref, type HrefMode } from '@/lib/links'
import { anchorId } from '@/lib/utils'

export type NavigationItem = { label: string; href: string }
type Suggestion = { label: string; href: string; hint: string }

/**
 * Éditeur du menu du site.
 *
 * Des entrées ordonnées {texte du lien, destination}. Le composant ne
 * possède pas ses données : la liste vit dans l'écran Réglages
 * (`SettingsWorkbench`), qui l'enregistre depuis SA barre « Enregistrer ».
 * Ce qu'on tape ici survit donc au passage d'un onglet à l'autre.
 *
 * La destination ne se tape pas : on la CHOISIT — une section de la page
 * d'accueil (par son nom), une autre page du site, ou une adresse web.
 * La valeur technique (« /#contact ») s'écrit toute seule.
 */

/** Ce que reçoit l'écran Réglages depuis le serveur (voir page.tsx). */
export type NavigationEditorProps = {
  initial: NavigationItem[]
  suggestions: Suggestion[]
}

/** Chaque lien doit avoir un texte et une destination. */
export function menuComplet(items: NavigationItem[]): boolean {
  return items.every((i) => i.label.trim() && i.href.trim())
}

export function NavigationEditor({
  items,
  onChange,
  suggestions,
  fieldErrors,
}: {
  items: NavigationItem[]
  onChange: (next: NavigationItem[]) => void
  suggestions: Suggestion[]
  /** Erreurs de validation renvoyées par l'action, clés `<index>.<champ>`
      (« 2.href ») — affichées sous l'entrée concernée en plus du toast. */
  fieldErrors: Record<string, string[]>
}) {
  const errorOf = (index: number, field: keyof NavigationItem) =>
    fieldErrors[`${index}.${field}`]?.[0]

  /* Les sections vers lesquelles un lien peut mener : celles de l'accueil
     (passées par l'écran), sinon celles fournies par le contexte. */
  const contexte = useAnchors()
  const sections: { anchor: string; label: string }[] =
    suggestions.length > 0
      ? suggestions.map((s) => ({ anchor: anchorId(s.href), label: s.label }))
      : contexte

  const move = (index: number, delta: -1 | 1) => {
    const next = [...items]
    const target = index + delta
    const a = next[index]
    const b = next[target]
    if (!a || !b) return
    next[index] = b
    next[target] = a
    onChange(next)
  }

  const update = (index: number, patch: Partial<NavigationItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const remove = (index: number) =>
    onChange(items.filter((_, i) => i !== index))

  const remaining = suggestions.filter(
    (s) => !items.some((item) => anchorId(item.href) === anchorId(s.href)),
  )

  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-[13px] text-muted-foreground">
            Votre menu est vide pour l’instant — ajoutez des sections
            ci-dessous.
          </li>
        )}
        {items.map((item, i) => {
          const nom = item.label.trim() || `Lien ${i + 1}`
          return (
            <li
              key={i}
              className="rounded-xl border border-border bg-white px-[18px] py-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {i + 1}. {nom}
                </p>
                <ActionMenu
                  label={`Actions de « ${nom} »`}
                  items={[
                    {
                      label: 'Monter',
                      icon: <ArrowUp />,
                      disabled: i === 0,
                      onSelect: () => move(i, -1),
                    },
                    {
                      label: 'Descendre',
                      icon: <ArrowDown />,
                      disabled: i === items.length - 1,
                      onSelect: () => move(i, 1),
                    },
                    {
                      label: 'Supprimer',
                      icon: <Trash2 />,
                      danger: true,
                      hint: 'Le lien disparaît du menu à l’enregistrement.',
                      onSelect: () => remove(i),
                    },
                  ]}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor={`menu-${i}-texte`}
                    className="mb-[5px] block text-[12px] font-normal text-ink-soft"
                  >
                    Texte du lien
                  </Label>
                  <Input
                    id={`menu-${i}-texte`}
                    value={item.label}
                    placeholder="Contact"
                    aria-invalid={errorOf(i, 'label') ? true : undefined}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  {errorOf(i, 'label') && (
                    <p role="alert" className="mt-1.5 text-xs text-destructive">
                      {errorOf(i, 'label')}
                    </p>
                  )}
                </div>
                <div>
                  <Destination
                    id={`menu-${i}`}
                    value={item.href}
                    sections={sections}
                    onChange={(href) => update(i, { href })}
                  />
                  {errorOf(i, 'href') && (
                    <p role="alert" className="mt-1.5 text-xs text-destructive">
                      {errorOf(i, 'href')}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Ajouter : les sections de l'accueil pas encore dans le menu, et
          un lien libre. */}
      <div>
        <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Ajouter au menu
        </p>
        <div className="flex flex-wrap gap-2">
          {remaining.map((s) => (
            <Button
              key={s.href}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange([...items, { label: s.label, href: s.href }])
              }
            >
              <Plus />
              {s.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange([...items, { label: '', href: '' }])}
          >
            <Plus />
            Un autre lien
          </Button>
        </div>
        {items.length >= 12 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Le menu accepte 12 liens au plus.
          </p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   La destination d'un lien — choisie, jamais tapée en jargon
   ══════════════════════════════════════════════════════════════════════ */

/* Les cinq destinations que `parseHref` sait lire — le schéma serveur
   (`safeHrefSchema`) accepte aussi `tel:` et `mailto:` dans le menu. */

function Destination({
  id,
  value,
  sections,
  onChange,
}: {
  id: string
  value: string
  sections: { anchor: string; label: string }[]
  onChange: (next: string) => void
}) {
  const { mode, rest: reste } = parseHref(value)

  /* Une ancre absente de la page (section supprimée, renommée) reste
     proposée telle quelle, marquée : on ne la perd pas en silence. */
  const options = sections.map((s) => ({ value: s.anchor, label: s.label }))
  if (mode === 'section' && reste && !sections.some((s) => s.anchor === reste)) {
    options.push({ value: reste, label: `${reste} (section introuvable)` })
  }

  const changerDeMode = (m: HrefMode) => {
    if (m === 'section') onChange(options[0] ? `/#${options[0].value}` : '')
    else if (m === 'page') onChange('/')
    else if (m === 'tel') onChange('tel:')
    else if (m === 'mail') onChange('mailto:')
    else onChange('https://')
  }

  return (
    <div className="grid gap-2">
      <Choice
        id={`${id}-mode`}
        label="Où mène ce lien ?"
        value={mode}
        onChange={changerDeMode}
        options={[
          { value: 'section', label: 'Vers une section de la page d’accueil' },
          { value: 'page', label: 'Vers une autre page du site' },
          { value: 'tel', label: 'Appeler un numéro' },
          { value: 'mail', label: 'Écrire un e-mail' },
          { value: 'web', label: 'Vers une adresse web' },
        ]}
      />
      {mode === 'section' &&
        (options.length > 0 ? (
          <Choice
            id={`${id}-section`}
            label="Quelle section ?"
            hideLabel
            value={reste || options[0]!.value}
            onChange={(a) => onChange(`/#${a}`)}
            options={options}
          />
        ) : (
          <p className="text-xs leading-[1.5] text-muted-foreground">
            Aucune section de la page d’accueil ne peut encore recevoir un
            lien. Donnez un nom d’ancre à une section (Options avancées de
            la section) dans l’éditeur du site.
          </p>
        ))}
      {mode === 'page' && (
        <Input
          id={`${id}-page`}
          value={reste}
          placeholder="/mentions-legales"
          aria-label="Adresse de la page"
          onChange={(e) => {
            const v = e.target.value.trim()
            onChange(v.startsWith('/') ? v : `/${v}`)
          }}
        />
      )}
      {mode === 'tel' && (
        <Input
          id={`${id}-tel`}
          type="tel"
          value={reste}
          placeholder="06 12 34 56 78"
          aria-label="Numéro de téléphone"
          onChange={(e) => onChange(`tel:${e.target.value.replace(/\s+/g, '')}`)}
        />
      )}
      {mode === 'mail' && (
        <Input
          id={`${id}-mail`}
          type="email"
          value={reste}
          placeholder="nom@exemple.fr"
          aria-label="Adresse e-mail"
          onChange={(e) => onChange(`mailto:${e.target.value.trim()}`)}
        />
      )}
      {mode === 'web' && (
        <Input
          id={`${id}-web`}
          type="url"
          value={reste}
          placeholder="https://…"
          aria-label="Adresse web"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
