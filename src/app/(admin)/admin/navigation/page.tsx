import { redirect } from 'next/navigation'

/** Le menu du site est un onglet des Réglages. */
export default function NavigationAdminPage() {
  redirect('/admin/reglages#menu')
}
