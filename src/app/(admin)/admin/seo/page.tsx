import { redirect } from 'next/navigation'

/** Le référencement est un onglet des Réglages. */
export default function SeoAdminPage() {
  redirect('/admin/reglages#referencement')
}
