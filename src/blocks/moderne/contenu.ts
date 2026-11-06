import { isVideoMimeType } from '@/lib/media-kind'
import { lirePied, type Pied } from '@/lib/pied'
import type {
  FaqItem,
  Media,
  MediaFolder,
  OpeningHour,
  Section,
  ServiceWithMedia,
  Settings,
} from '@/server/db/schema'

/* Les catégories de modèles, sans importer le registre (qui importe les
   blocs modernes, qui importent ce fichier) : on reçoit la fonction. */
export type Categorie = 'Ouverture' | 'Qui je suis' | 'Ma méthode' | 'Accompagnements' | 'Questions' | 'Photos & vidéos' | 'Textes' | 'Contact & rendez-vous'
type TemplateCategory = Categorie

/**
 * Le contenu RÉEL d'Anne, mis à plat pour les sections de la version
 * moderne — PUR : aucune requête, utilisable côté serveur comme dans
 * l'éditeur (navigateur).
 *
 * Rien n'est inventé quand la base a la réponse : réglages (nom, titre,
 * coordonnées, horaires), accompagnements, questions, photothèque et
 * dossiers, et les textes de la page d'accueil PUBLIÉE — lus section par
 * section selon la catégorie de leur modèle (Ouverture, Qui je suis…).
 * Un texte d'appoint ne sert que si la page n'en a pas.
 */

export type Etape = { titre: string; texte: string }

export type Contenu = {
  nom: string
  metier: string
  accroche: string
  ville: string
  adresse: string | null
  telephone: string | null
  email: string | null
  horaires: OpeningHour[]
  infoPratique: string | null
  rdv: string
  ouverture: { surtitre: string; titre: string; intro: string }
  apropos: { surtitre: string; titre: string; texte: string; citation: string | null }
  methode: { surtitre: string; titre: string; intro: string; etapes: Etape[] }
  citation: { texte: string; auteur: string }
  services: ServiceWithMedia[]
  faq: FaqItem[]
  photos: Media[]
  dossiers: MediaFolder[]
  portrait: Media | null
  ambiance: Media | null
  /** Le logo choisi dans les Réglages (adresse), sinon nul : celui livré. */
  logo: string | null
  /** Le menu du site moderne (sections qui y figurent), posé par la page. */
  menu?: { href: string; label: string }[]
  /** Le pied de page des Réglages (organismes, déontologie, collègues, pages légales). */
  pied: Pied
  /** Les logos des organismes, par identifiant d'organisme. */
  logosOrganismes: Record<string, Media>
}


/** Sans l'astérisque d'italique du CMS (`*son souffle*`) ni balise. */
const propre = (t: string) =>
  t.replace(/<[^>]+>/g, ' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim()

function texte(payload: Record<string, unknown>, cles: string[]): string | null {
  for (const cle of cles) {
    const v = payload[cle]
    if (typeof v === 'string' && v.trim()) return propre(v)
    /* Les titres en lignes du hero : `[{ text, align }]`. */
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
      const lignes = v
        .map((l) => (l && typeof l === 'object' ? (l as { text?: unknown }).text : null))
        .filter((l): l is string => typeof l === 'string' && Boolean(l.trim()))
      if (lignes.length) return propre(lignes.join(' '))
    }
  }
  return null
}

function etapes(payload: Record<string, unknown>): Etape[] {
  for (const cle of ['steps', 'items']) {
    const v = payload[cle]
    if (!Array.isArray(v)) continue
    const liste = v
      .map((e) => {
        if (!e || typeof e !== 'object') return null
        const o = e as Record<string, unknown>
        const titre = texte(o, ['title', 'label', 'name', 'value'])
        const corps = texte(o, ['text', 'body', 'description', 'intro'])
        return titre ? { titre, texte: corps ?? '' } : null
      })
      .filter((e): e is Etape => e !== null)
    if (liste.length >= 2) return liste
  }
  return []
}

export type SourcesContenu = {
  settings: Settings
  services: ServiceWithMedia[]
  faq: FaqItem[]
  media: Media[]
  dossiers: MediaFolder[]
  /** Les sections de la page CLASSIQUE : leurs textes nourrissent la
      version moderne tant qu'un bloc moderne ne les remplace pas. */
  sections: Section[]
  categorieDe: (type: string) => TemplateCategory | undefined
}

export function construireContenu({ settings, services, faq, media, dossiers, sections: brutes, categorieDe }: SourcesContenu): Contenu {
  const CATEGORIE = { get: categorieDe }
  const sections: Section[] = brutes
    .filter((s) => !s.parentId && s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  /** La première section d'une catégorie qui porte le texte cherché. */
  const lire = (categorie: TemplateCategory, cles: string[]) => {
    for (const s of sections) {
      if (CATEGORIE.get(s.type) !== categorie) continue
      const t = texte((s.payload ?? {}) as Record<string, unknown>, cles)
      if (t) return t
    }
    return null
  }
  const etapesDe = (categorie: TemplateCategory) => {
    for (const s of sections) {
      if (CATEGORIE.get(s.type) !== categorie) continue
      const e = etapes((s.payload ?? {}) as Record<string, unknown>)
      if (e.length) return e
    }
    return []
  }

  /* Les logos (dossier « Logos », logo du site) ne sont pas des photos du cabinet. */
  const dossierLogos = dossiers.find((d) => /^logos?$/i.test(d.name.trim()))
  const photos = media.filter((m) => !isVideoMimeType(m.mimeType) && m.id !== settings.logoMediaId && (!dossierLogos || m.folderId !== dossierLogos.id))
  const pied = lirePied(settings.pied)
  const logosOrganismes = Object.fromEntries(
    pied.organismes.flatMap((o) => {
      const m = o.logoMediaId ? media.find((x) => x.id === o.logoMediaId) : undefined
      return m ? [[o.id, m] as const] : []
    }),
  )
  const dossierPortraits = dossiers.find((d) => /portrait/i.test(d.name))
  const portrait =
    photos.find((m) => dossierPortraits && m.folderId === dossierPortraits.id && !/substitution/i.test(m.alt)) ??
    photos.find((m) => /portrait/i.test(m.alt)) ??
    photos[0] ??
    null
  const dossierInterieurs = dossiers.find((d) => /int[ée]rieur/i.test(d.name))
  const ambiance =
    photos.find((m) => dossierInterieurs && m.folderId === dossierInterieurs.id) ??
    photos.find((m) => m.id !== portrait?.id) ??
    null

  const nom = settings.practitionerName || settings.siteName
  const metier = settings.practitionerTitle || 'Thérapeute'
  const ville = settings.addressCity || 'Cesson-Sévigné'

  const methodeEtapes = etapesDe('Ma méthode')

  return {
    nom,
    metier,
    accroche: settings.tagline || 'Un espace stable et confidentiel pour déposer ce qui pèse.',
    ville,
    adresse:
      [settings.addressStreet, [settings.addressPostalCode, settings.addressCity].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ') || null,
    telephone: settings.contactPhone,
    email: settings.contactEmail,
    horaires: ((settings.openingHours as OpeningHour[]) ?? []).filter((h) => h.day && h.hours),
    infoPratique: settings.practicalInfo,
    rdv: settings.bookingUrl || '#contact',
    ouverture: {
      surtitre: lire('Ouverture', ['eyebrow']) ?? `${metier} · ${ville}`,
      titre: lire('Ouverture', ['titleLines', 'title']) ?? nom,
      intro: lire('Ouverture', ['intro', 'text', 'note']) ?? settings.tagline ?? '',
    },
    apropos: {
      surtitre: lire('Qui je suis', ['eyebrow']) ?? 'Qui je suis',
      titre: lire('Qui je suis', ['title', 'name']) ?? nom,
      texte:
        lire('Qui je suis', ['body', 'text', 'intro']) ??
        'Un accompagnement attentif, au rythme de chacun, pour remettre du mouvement là où les choses se sont figées.',
      citation: lire('Qui je suis', ['quote']),
    },
    methode: {
      surtitre: lire('Ma méthode', ['eyebrow']) ?? 'Ma méthode',
      titre: lire('Ma méthode', ['title']) ?? 'Comment se passe un accompagnement',
      intro: lire('Ma méthode', ['intro', 'text', 'body']) ?? '',
      etapes: methodeEtapes.length
        ? methodeEtapes.slice(0, 4)
        : [
            { titre: 'Un premier échange', texte: 'Au téléphone ou par écrit, pour faire connaissance et voir si nous pouvons travailler ensemble.' },
            { titre: 'La première séance', texte: 'On pose ce qui vous amène, sans obligation de tout dire, ni d’aller vite.' },
            { titre: 'Un rythme qui vous ressemble', texte: 'Chaque semaine ou tous les quinze jours, le temps qu’il faudra.' },
          ],
    },
    citation: {
      texte:
        lire('Textes', ['quote', 'statement', 'text', 'title']) ??
        'On ne répare pas les gens. On les écoute, jusqu’à ce qu’ils s’entendent.',
      auteur: lire('Textes', ['attribution', 'caption']) ?? nom,
    },
    services,
    faq,
    photos,
    dossiers: dossiers.filter((d) => photos.some((m) => m.folderId === d.id)),
    portrait,
    ambiance,
    logo: media.find((m) => m.id === settings.logoMediaId)?.url ?? null,
    pied,
    logosOrganismes,
  }
}
