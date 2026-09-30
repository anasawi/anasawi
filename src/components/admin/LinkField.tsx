'use client'

import { useAnchors } from './anchors-context'
import { Choice } from '@/components/ui/choice'
import { Input } from '@/components/ui/input'
import { parseHref } from '@/lib/links'

/**
 * Le lien d'un bouton, sans rien taper de technique.
 *
 * Un lien peut mener vers une section de la page, vers le téléphone,
 * vers l'e-mail, ou vers une adresse web. Avant, c'était un champ texte
 * où il fallait savoir écrire « #contact » ou « mailto: » — une personne
 * qui ne connaît pas ces mots ne pouvait pas régler un bouton. Ici on
 * choisit la destination, et la valeur technique s'écrit toute seule.
 */

type Mode = 'section' | 'tel' | 'mail' | 'web'

/** Un bouton n'a pas de mode « autre page du site » : un chemin interne
    (`/approche`) s'édite comme une adresse web, tel quel. */
function lire(value: string): { mode: Mode; reste: string } {
  const { mode, rest } = parseHref(value)
  return { mode: mode === 'page' ? 'web' : mode, reste: rest }
}

export function LinkField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (next: string) => void
}) {
  const anchors = useAnchors()
  const { mode, reste } = lire(value)

  /* Une ancre absente de la page (section supprimée, renommée) reste
     proposée telle quelle, marquée : on ne la perd pas en silence. */
  const options = anchors.map((a) => ({ value: a.anchor, label: a.label }))
  if (mode === 'section' && reste && !anchors.some((a) => a.anchor === reste)) {
    options.push({ value: reste, label: `${reste} (section introuvable)` })
  }

  const changerDeMode = (m: Mode) => {
    if (m === 'section') onChange(options[0] ? `#${options[0].value}` : '')
    else if (m === 'tel') onChange('tel:')
    else if (m === 'mail') onChange('mailto:')
    else onChange('https://')
  }

  return (
    <div className="grid gap-2">
      <Choice
        id={`${id}-mode`}
        label="Où mène ce bouton ?"
        hideLabel
        value={mode}
        onChange={changerDeMode}
        options={[
          { value: 'section', label: 'Vers une section de la page' },
          { value: 'tel', label: 'Appeler un numéro' },
          { value: 'mail', label: 'Écrire un e-mail' },
          { value: 'web', label: 'Vers une adresse web' },
        ]}
      />
      {mode === 'section' &&
        (options.length > 0 ? (
          <Choice
            id={id}
            label="Quelle section ?"
            hideLabel
            value={reste || options[0]!.value}
            onChange={(a) => onChange(`#${a}`)}
            options={options}
          />
        ) : (
          <p className="text-[12.5px] leading-[1.5] text-stone">
            Aucune section de la page n’a encore de nom d’ancre (Options
            avancées de la section).
          </p>
        ))}
      {mode === 'tel' && (
        <Input
          id={id}
          type="tel"
          value={reste}
          placeholder="06 12 34 56 78"
          aria-label="Numéro de téléphone"
          onChange={(e) => onChange(`tel:${e.target.value.replace(/\s+/g, '')}`)}
        />
      )}
      {mode === 'mail' && (
        <Input
          id={id}
          type="email"
          value={reste}
          placeholder="nom@exemple.fr"
          aria-label="Adresse e-mail"
          onChange={(e) => onChange(`mailto:${e.target.value.trim()}`)}
        />
      )}
      {mode === 'web' && (
        <Input
          id={id}
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
