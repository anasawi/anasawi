import { z } from 'zod'

/**
 * Styles d'un nœud du page builder.
 *
 * Principe : un schéma UNIQUE pour tous les types d'éléments — c'est ce qui
 * permet un panneau Style universel plutôt qu'un éditeur par type. Tout est
 * optionnel : un nœud sans styles rend avec les défauts de son type.
 *
 * Le CSS est GÉNÉRÉ depuis ces données, jamais saisi : chaque propriété est
 * bornée par Zod (nombres clampés, couleurs en hexadécimal strict), donc
 * aucune injection possible — l'admin choisit des valeurs, pas du CSS.
 */

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((value) => value.toLowerCase())

export const stylePropsSchema = z
  .object({
    /* ── Boîte ─────────────────────────────────────────────────── */
    /** Espacement interne [haut, droite, bas, gauche] en px. */
    padding: z
      .tuple([
        z.number().min(0).max(240),
        z.number().min(0).max(240),
        z.number().min(0).max(240),
        z.number().min(0).max(240),
      ])
      .optional(),
    radius: z.number().min(0).max(120).optional(),
    opacity: z.number().min(0.1).max(1).optional(),
    background: hex.optional(),
    /** Bordure : largeur en px + couleur. */
    borderWidth: z.number().min(0).max(8).optional(),
    borderColor: hex.optional(),
    /** Ombre portée, en deux intensités de la charte. */
    shadow: z.enum(['douce', 'marquee']).optional(),

    /* ── Typographie — héritée par les descendants ─────────────── */
    font: z.enum(['serif', 'sans']).optional(),
    /** Taille en rem. */
    size: z.number().min(0.6).max(8).optional(),
    weight: z.union([z.literal(400), z.literal(500)]).optional(),
    color: hex.optional(),
    alignText: z.enum(['left', 'center', 'right']).optional(),
    lineHeight: z.number().min(0.9).max(2.4).optional(),
    /** Interlettrage en em. */
    tracking: z.number().min(-0.06).max(0.4).optional(),
  })
  .strict()

export const nodeStylesSchema = z
  .object({
    base: stylePropsSchema.default({}),
    /** Surcharges ≤ 1024 px. Prévu pour la phase 2 — déjà porté ici pour
        que le schéma ne change plus. */
    tablet: stylePropsSchema.optional(),
    /** Surcharges ≤ 640 px. */
    mobile: stylePropsSchema.optional(),
  })
  .strict()

export type StyleProps = z.infer<typeof stylePropsSchema>
export type NodeStyles = z.infer<typeof nodeStylesSchema>

export function parseNodeStyles(input: unknown): NodeStyles | null {
  if (!input) return null
  const parsed = nodeStylesSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}

/** Classe CSS d'un nœud — l'UUID est réduit à un segment sûr. */
export function nodeClass(id: string): string {
  return `n-${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`
}

function declarations(props: StyleProps): string {
  const out: string[] = []

  if (props.padding) {
    out.push(`padding:${props.padding.map((v) => `${v}px`).join(' ')}`)
  }
  if (props.radius !== undefined) {
    out.push(`border-radius:${props.radius}px`, 'overflow:hidden')
  }
  if (props.opacity !== undefined) out.push(`opacity:${props.opacity}`)
  if (props.background) out.push(`background-color:${props.background}`)

  if (props.borderWidth !== undefined && props.borderWidth > 0) {
    out.push(
      `border:${props.borderWidth}px solid ${props.borderColor ?? 'rgba(28,32,30,0.18)'}`,
    )
  }
  if (props.shadow === 'douce') {
    out.push('box-shadow:0 8px 30px rgba(20,20,19,0.07)')
  } else if (props.shadow === 'marquee') {
    out.push('box-shadow:0 14px 44px rgba(20,20,19,0.16)')
  }

  if (props.font) {
    out.push(
      `font-family:var(${props.font === 'serif' ? '--font-serif' : '--font-sans'})`,
    )
  }
  if (props.size !== undefined) out.push(`font-size:${props.size}rem`)
  if (props.weight !== undefined) out.push(`font-weight:${props.weight}`)
  if (props.color) out.push(`color:${props.color}`)
  if (props.alignText) out.push(`text-align:${props.alignText}`)
  if (props.lineHeight !== undefined) {
    out.push(`line-height:${props.lineHeight}`)
  }
  if (props.tracking !== undefined) {
    out.push(`letter-spacing:${props.tracking}em`)
  }

  return out.join(';')
}

/**
 * Feuille de styles d'une page, générée depuis les données.
 *
 * Les media queries n'existant pas en style inline, c'est le seul moyen de
 * porter des surcharges responsive par élément. Générée au rendu serveur et
 * mise en cache avec la page : zéro JavaScript de layout côté client.
 *
 * Sûre par construction : chaque valeur est passée par `nodeStylesSchema`
 * avant d'arriver ici — nombres bornés, couleurs hexadécimales, énumérations.
 */
export function generateCss(
  nodes: { id: string; styles: unknown }[],
  /**
   * Éditeur uniquement : émet les règles du breakpoint affiché, cascade
   * résolue, SANS media query. Le canvas de l'éditeur est un viewport
   * simulé à largeur fixe — les media queries du navigateur, calées sur
   * la fenêtre de l'admin, y mentiraient.
   */
  flattenTo?: 'base' | 'tablet' | 'mobile',
): string {
  if (flattenTo) {
    const out: string[] = []
    for (const node of nodes) {
      const styles = parseNodeStyles(node.styles)
      if (!styles) continue
      const merged: StyleProps = {
        ...styles.base,
        ...(flattenTo !== 'base' ? (styles.tablet ?? {}) : {}),
        ...(flattenTo === 'mobile' ? (styles.mobile ?? {}) : {}),
      }
      const decl = declarations(merged)
      if (decl) out.push(`.${nodeClass(node.id)}{${decl}}`)
    }
    return out.join('')
  }

  const base: string[] = []
  const tablet: string[] = []
  const mobile: string[] = []

  for (const node of nodes) {
    const styles = parseNodeStyles(node.styles)
    if (!styles) continue

    const cls = nodeClass(node.id)

    const baseDecl = declarations(styles.base)
    if (baseDecl) base.push(`.${cls}{${baseDecl}}`)

    if (styles.tablet) {
      const decl = declarations(styles.tablet)
      if (decl) tablet.push(`.${cls}{${decl}}`)
    }
    if (styles.mobile) {
      const decl = declarations(styles.mobile)
      if (decl) mobile.push(`.${cls}{${decl}}`)
    }
  }

  let css = base.join('')
  if (tablet.length > 0) {
    css += `@media (max-width:1024px){${tablet.join('')}}`
  }
  if (mobile.length > 0) {
    css += `@media (max-width:640px){${mobile.join('')}}`
  }
  return css
}
