import { redirect } from 'next/navigation'

/**
 * Ancienne adresse des coordonnées — tout vit désormais dans `/admin/reglages`.
 * La redirection garde les signets et les liens internes fonctionnels.
 */
export default function SettingsRedirectPage() {
  redirect('/admin/reglages#coordonnees')
}
