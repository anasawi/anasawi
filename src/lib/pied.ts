import { z } from 'zod'

/**
 * LE PIED DE PAGE — ce que les Réglages y mettent, au-delà des
 * coordonnées : les organismes (logos cliquables), les engagements
 * déontologiques, les sites de collègues, et les informations des pages
 * légales (mentions légales, confidentialité).
 *
 * Tout tient dans une colonne `settings.pied` (jsonb). Absente ou
 * incomplète, elle est complétée par les valeurs de départ ci-dessous :
 * le site affiche toujours quelque chose de juste.
 *
 * Aucune dépendance Node : importable côté client (formulaire des
 * Réglages) comme côté serveur (pieds de page, pages légales).
 */

const texte = (max = 400) => z.string().trim().max(max).catch('')
const adresse = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v), 'Adresse web invalide (elle commence par https://).')

export const organismeSchema = z.object({
  id: z.string().min(1).max(40),
  /** Le sigle (EAGT) ou le nom court : c'est lui qui donne les initiales sans logo. */
  sigle: z.string().trim().max(40),
  nom: z.string().trim().max(160),
  url: adresse,
  logoMediaId: z.string().uuid().nullable().catch(null),
})
export type Organisme = z.infer<typeof organismeSchema>

export const amiSchema = z.object({
  id: z.string().min(1).max(40),
  nom: z.string().trim().max(120),
  /** Ce qu'il ou elle fait : « Psychologue à Rennes ». */
  description: z.string().trim().max(160).catch(''),
  url: adresse,
})
export type Ami = z.infer<typeof amiSchema>

export const piedSchema = z.object({
  organismesTitre: texte(120),
  organismes: z.array(organismeSchema).max(30),
  /** Le paragraphe déontologique, avec ses liens en [texte](https://…). */
  deontologie: texte(2000),
  amisTitre: texte(120),
  amis: z.array(amiSchema).max(40),
  /* Mentions légales. Le nom, l'adresse, le téléphone et l'e-mail viennent des Coordonnées. */
  statut: texte(200),
  siret: texte(40),
  adeli: texte(60),
  assurance: texte(300),
  mediateur: texte(400),
  hebergeur: texte(400),
  credits: texte(400),
  /* Confidentialité. */
  conservation: texte(300),
  complementConfidentialite: texte(4000),
  complementMentions: texte(4000),
})
export type Pied = z.infer<typeof piedSchema>

export const PIED_DEPART: Pied = {
  organismesTitre: 'Membre de',
  organismes: [
    { id: 'eap', sigle: 'EAP', nom: 'European Association for Psychotherapy', url: 'https://www.europsyche.org/', logoMediaId: null },
    { id: 'eagt', sigle: 'EAGT', nom: 'European Association for Gestalt Therapy', url: 'https://www.eagt.org/', logoMediaId: null },
    { id: 'ff2p', sigle: 'FF2P', nom: 'Fédération Française de Psychothérapie et de Psychanalyse', url: 'https://www.ff2p.fr/', logoMediaId: null },
    { id: 'fpgt', sigle: 'FPGT', nom: 'Fédération des Professionnels de la Gestalt-Thérapie', url: 'https://www.fpgt.fr/', logoMediaId: null },
  ],
  deontologie:
    'J’ai signé le Code de déontologie de l’[EAP](https://www.europsyche.org/) et de l’[EAGT](https://www.eagt.org/), la [Déclaration de Strasbourg](https://www.ff2p.fr/demander-le-cep/) et la [Charte des usagers de la psychothérapie](https://www.ff2p.fr/ethique-et-deontologie/). Membre individuelle de la [FF2P](https://www.ff2p.fr/) et de l’[EAGT](https://www.eagt.org/). Déclarée, assurée et habilitée à recevoir des chèques.',
  amisTitre: 'Des collègues que je recommande',
  amis: [],
  statut: 'Entrepreneure individuelle',
  siret: '',
  adeli: '',
  assurance: '',
  mediateur: '',
  hebergeur: 'Netlify, Inc. — 101 2nd Street, San Francisco, CA 94105, États-Unis — www.netlify.com',
  credits: '',
  conservation: '3 ans après notre dernier échange',
  complementConfidentialite: '',
  complementMentions: '',
}

/** Le pied de page enregistré, complété par les valeurs de départ (jamais d'erreur : une valeur abîmée retombe sur son départ). */
export function lirePied(brut: unknown): Pied {
  const objet = brut && typeof brut === 'object' ? (brut as Record<string, unknown>) : {}
  const sortie: Record<string, unknown> = { ...PIED_DEPART }
  for (const [cle, champ] of Object.entries(piedSchema.shape)) {
    if (!(cle in objet)) continue
    const lu = (champ as z.ZodTypeAny).safeParse(objet[cle])
    if (lu.success) sortie[cle] = lu.data
  }
  return sortie as Pied
}

/** « European Association for Psychotherapy » → « EAP » ; un sigle saisi passe tel quel. */
export function initiales(o: Pick<Organisme, 'sigle' | 'nom'>): string {
  const s = o.sigle.trim()
  if (s) return s.slice(0, 6)
  const mots = o.nom.split(/[\s’'-]+/).filter((m) => m.length > 2 || /^[A-Z]/.test(m))
  return mots
    .map((m) => m[0]!.toUpperCase())
    .join('')
    .slice(0, 4)
}

/** Un texte avec des liens « [texte](https://…) » en morceaux : du texte, ou un lien. */
export function morceaux(texte: string): ({ texte: string } | { texte: string; url: string })[] {
  const out: ({ texte: string } | { texte: string; url: string })[] = []
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  let dernier = 0
  for (const m of texte.matchAll(re)) {
    if (m.index! > dernier) out.push({ texte: texte.slice(dernier, m.index) })
    out.push({ texte: m[1]!, url: m[2]! })
    dernier = m.index! + m[0].length
  }
  if (dernier < texte.length) out.push({ texte: texte.slice(dernier) })
  return out
}

/** Le nom de domaine d'une adresse, sans « www. » : « eagt.org ». */
export const domaine = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
