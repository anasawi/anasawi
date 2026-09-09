/**
 * Injecte un graphe Schema.org.
 *
 * Le JSON est sérialisé en amont et les `<` sont échappés : c'est la seule
 * séquence capable de fermer prématurément la balise script depuis une
 * chaîne saisie dans le CMS.
 */
export function JsonLd({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json.replace(/</g, '\\u003c') }}
    />
  )
}
