import { PAGE_MODERNE_PAR_DEFAUT } from './blocs'
import type { Section } from '@/server/db/schema'

/** Des sections en mémoire, payloads vides (les valeurs par défaut des
    blocs s'appliquent, le reste suit le contenu partagé). */
export function sectionsEnMemoire(types: readonly string[], prefixe = 'moderne'): Section[] {
  const maintenant = new Date(0)
  return types.map((type, i) => ({
    id: `${prefixe}-${type}`,
    pageId: prefixe,
    parentId: null,
    columnIndex: 0,
    placement: null,
    settings: null,
    styles: null,
    name: null,
    type,
    anchor: null,
    navLabel: null,
    showInNav: false,
    sortOrder: i,
    isActive: true,
    backgroundColor: '#fbf6ee',
    payload: {},
    createdAt: maintenant,
    updatedAt: maintenant,
  }))
}

/** La page moderne avant sa création en base : les dix sections par défaut. */
export function sectionsModernesParDefaut(): Section[] {
  return sectionsEnMemoire(PAGE_MODERNE_PAR_DEFAUT)
}
