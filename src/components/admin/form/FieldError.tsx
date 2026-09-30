/**
 * Message d'erreur sous un champ — annoncé au lecteur d'écran.
 *
 * Une seule couleur (`text-destructive`) pour toutes les erreurs de
 * l'admin, et un `id` obligatoire : le champ concerné le cite dans son
 * `aria-describedby`, ainsi l'erreur est lue avec le champ, pas seulement
 * au moment où elle apparaît. Rien n'est rendu sans message.
 */
export function FieldError({
  id,
  messages,
  className,
}: {
  id: string
  /** Le premier message est affiché — les autres disent la même chose
      autrement. */
  messages?: string[] | string
  className?: string
}) {
  const message = Array.isArray(messages) ? messages[0] : messages
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className={className ?? 'mt-1.5 text-xs leading-[1.5] text-destructive'}
    >
      {message}
    </p>
  )
}
