import { toE164 } from '@/lib/utils'
import type { Settings } from '@/server/db/schema'

/**
 * Petits dérivés des Réglages partagés entre le site, les blocs et
 * l'aperçu — une seule définition pour l'adresse et le lien de prise de
 * rendez-vous, au lieu d'une copie par consommateur.
 */

/**
 * Lignes d'adresse : la rue, puis « code postal ville ». Une ligne vide ou
 * faite d'espaces est omise ; le tableau peut donc être vide.
 */
export function addressLines(settings: Settings): string[] {
  return [
    settings.addressStreet,
    [settings.addressPostalCode, settings.addressCity]
      .filter(Boolean)
      .join(' '),
  ].filter((line): line is string => Boolean(line && line.trim()))
}

/**
 * Lien de prise de rendez-vous : l'URL renseignée dans les Réglages
 * (nettoyée), sinon `fallback` — par défaut l'ancre de la section contact.
 */
export function bookingHref(
  settings: Settings,
  fallback: string = '/#contact',
): string {
  return settings.bookingUrl?.trim() || fallback
}

/**
 * Contact direct : le téléphone (au format E.164) s'il existe, sinon
 * l'e-mail. Sert de repli à `bookingHref` dans les blocs Contact, où un
 * bouton « Prendre rendez-vous » sans URL doit rester utile.
 */
export function directContactHref(settings: Settings): string {
  if (settings.contactPhone) return `tel:${toE164(settings.contactPhone)}`
  return `mailto:${settings.contactEmail ?? ''}`
}
