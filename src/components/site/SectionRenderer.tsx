import { SectionsView } from './SectionsView'
import {
  getActiveFaq,
  getActiveServices,
  getMediaByIds,
  getSettings,
} from '@/server/queries'
import type { Section } from '@/server/db/schema'

/**
 * Collecte tous les identifiants de médias référencés dans les payloads.
 * Inspection récursive du JSON plutôt qu'une déclaration par bloc : ajouter
 * un champ image à un bloc ne demande aucune mise à jour ici.
 */
function collectMediaIds(payload: unknown, found: Set<string> = new Set()) {
  if (Array.isArray(payload)) {
    for (const item of payload) collectMediaIds(item, found)
    return found
  }

  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      /* `mediaId`, `ogMediaId`, `secondMediaId`… — tout champ image se
         termine par « MediaId » ou est exactement `mediaId`. */
      if (
        (key === 'mediaId' || key.endsWith('MediaId')) &&
        typeof value === 'string'
      ) {
        found.add(value)
      } else if (key === 'mediaIds' && Array.isArray(value)) {
        for (const id of value) if (typeof id === 'string') found.add(id)
      } else {
        collectMediaIds(value, found)
      }
    }
  }

  return found
}

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
  for (const section of visible) collectMediaIds(section.payload, mediaIds)

  const [settings, services, faqItems, media] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getActiveFaq(),
    getMediaByIds([...mediaIds]),
  ])

  return (
    <SectionsView
      sections={sections}
      data={{ services, faqItems, settings, media }}
      editable={editable}
    />
  )
}
