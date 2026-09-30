import { SectionsView } from './SectionsView'
import { collectMediaIds } from '@/blocks/media-fields'
import {
  getActiveFaq,
  getActiveServices,
  getMediaByIds,
  getSettings,
} from '@/server/queries'
import type { Section } from '@/server/db/schema'

/**
 * Wrapper serveur du rendu de page : charge une fois les données partagées
 * (accompagnements, FAQ, réglages, médias référencés) puis délègue tout le
 * rendu à `SectionsView` — le même composant que le canvas de l'éditeur.
 * Un seul moteur de rendu : ce que l'admin compose est ce que le site sert.
 */
export async function SectionRenderer({
  sections,
  editable = false,
}: {
  sections: Section[]
  editable?: boolean
}) {
  const visible = editable ? sections : sections.filter((s) => s.isActive)
  if (visible.length === 0) return null

  const mediaIds = new Set<string>()
  for (const section of visible) {
    collectMediaIds(section.type, section.payload, mediaIds)
  }

  const [settings, services, faqItems, media] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getActiveFaq(),
    getMediaByIds([...mediaIds]),
  ])

  /* Les sections désactivées ne sont pas transmises au rendu public : le
     composant les filtrait déjà, mais elles voyageaient jusqu'au
     navigateur — un brouillon retiré du site restait lisible dans le
     HTML. Dans l'éditeur, elles sont voulues (rendues estompées). */
  return (
    <SectionsView
      sections={editable ? sections : visible}
      data={{ services, faqItems, settings, media }}
      editable={editable}
    />
  )
}
