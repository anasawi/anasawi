import { cache } from 'react'

import { construireContenu, type Categorie, type Contenu } from '@/blocks/moderne/contenu'
import { templateLibrary } from '@/blocks/registry'
import {
  getActiveFaq,
  getActiveServices,
  getAllMedia,
  getHomePageForAdmin,
  getMediaFolders,
  getPublishedHome,
  getSettings,
} from '@/server/queries'

export type { Contenu, Etape } from '@/blocks/moderne/contenu'

const CATEGORIES = new Map<string, string>(
  templateLibrary.flatMap((g) => g.options.map((o) => [o.type, o.category] as const)),
)

/**
 * Le contenu partagé, chargé depuis la base. `brouillon` : les sections
 * VIVANTES de la page classique (éditeur), sinon celles publiées (site).
 */
export function chargerContenu({ brouillon = false }: { brouillon?: boolean } = {}): Promise<Contenu> {
  return charger(brouillon)
}

/* Mis en cache le temps d'une requête (`cache` de React, clé : le booléen) :
   l'éditeur le demande deux fois (préremplissage, puis la page), une seule
   lecture. */
const charger = cache(async (brouillon: boolean): Promise<Contenu> => {
  const [settings, services, faq, media, dossiers, home] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getActiveFaq(),
    getAllMedia(),
    getMediaFolders(),
    brouillon ? getHomePageForAdmin() : getPublishedHome(),
  ])
  return construireContenu({
    settings,
    services,
    faq,
    media,
    dossiers,
    sections: home?.sections ?? [],
    categorieDe: (t) => CATEGORIES.get(t) as Categorie | undefined,
  })
})
