import { redirect } from 'next/navigation'

/** Ancienne route de création — voir `/admin/pages/page.tsx`. */
export default function LegacyNewPageRedirect() {
  redirect('/admin/accueil')
}
