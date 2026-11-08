import type { Media, ServiceWithMedia } from '@/server/db/schema'

/**
 * LES PHOTOS D'ATTENTE DES ACCOMPAGNEMENTS — choisies sur Unsplash (licence
 * libre), servies par leur CDN. Un accompagnement SANS photo choisie dans
 * l'admin en reçoit une, selon son titre ; dès qu'une photo est choisie
 * (Accompagnements › la fiche), c'est elle qui s'affiche.
 *
 * Valable partout (local, préprod, production) sans rien copier en base.
 */

type Attente = { motif: RegExp; id: string; alt: string; largeur: number; hauteur: number }

const ATTENTES: Attente[] = [
  { motif: /couple/i, id: '1604881991720-f91add269bed', alt: 'Deux mains qui se tiennent sur une table — photo d’attente', largeur: 1200, hauteur: 1800 },
  { motif: /coach/i, id: '1654124803453-5bb8819e1524', alt: 'Un carnet et un stylo sur une table en bois — photo d’attente', largeur: 1200, hauteur: 1800 },
  { motif: /supervis/i, id: '1758273240360-76b908e7582a', alt: 'Deux femmes qui échangent dans un bureau lumineux — photo d’attente', largeur: 1200, hauteur: 675 },
  { motif: /yoga|corps/i, id: '1552196527-bffef41ef674', alt: 'Une femme qui s’étire doucement, bras ouverts — photo d’attente', largeur: 1200, hauteur: 960 },
  { motif: /individ|th[ée]rapie|gestalt/i, id: '1758273241086-f3585ef8c2f8', alt: 'Une thérapeute à l’écoute, en séance — photo d’attente', largeur: 1200, hauteur: 675 },
]

const maintenant = new Date(0)

function versMedia(a: Attente): Media {
  return {
    id: `unsplash-${a.id}`,
    folderId: null,
    url: `https://images.unsplash.com/photo-${a.id}?auto=format&fit=crop&w=1400&q=80`,
    pathname: `unsplash/${a.id}`,
    filename: `unsplash-${a.id}.jpg`,
    alt: a.alt,
    caption: null,
    width: a.largeur,
    height: a.hauteur,
    blurDataUrl: null,
    mimeType: 'image/jpeg',
    size: 0,
    createdAt: maintenant,
    updatedAt: maintenant,
  }
}

/** Les accompagnements, chacun avec une photo : la sienne, sinon une photo d'attente. */
export function avecPhotosDAttente(services: ServiceWithMedia[]): ServiceWithMedia[] {
  return services.map((s) => {
    if (s.media) return s
    const a = ATTENTES.find((x) => x.motif.test(s.title))
    return a ? { ...s, media: versMedia(a) } : s
  })
}
