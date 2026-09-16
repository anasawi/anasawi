import { redirect } from 'next/navigation'

/**
 * Ancienne adresse de l'apparence — la palette et les formes vivent
 * désormais dans `/admin/reglages`.
 */
export default function IdentityRedirectPage() {
  redirect('/admin/reglages#palette')
}
