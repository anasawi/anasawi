'use client'

/**
 * Filet de sécurité ultime — remplace le layout racine quand celui-ci (ou
 * un layout de groupe : site, admin) échoue au rendu.
 *
 * Il doit fournir ses propres `<html>` et `<body>` ; aucune feuille de style
 * n'est garantie ici, d'où les styles inline. Volontairement minimal et sans
 * dépendance : c'est l'écran qu'on voit quand plus rien d'autre ne marche.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#fbf8f2',
          color: '#1c201e',
          fontFamily:
            'Georgia, "Times New Roman", "Cormorant Garamond", serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '40ch' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 400,
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Le site est momentanément indisponible.
          </h1>
          <p
            style={{
              marginTop: '1.25rem',
              fontSize: '1rem',
              lineHeight: 1.7,
              opacity: 0.75,
            }}
          >
            Une erreur inattendue s’est produite. Vous pouvez réessayer dans
            un instant.
          </p>
          {error.digest && (
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.5 }}>
              Référence : {error.digest}
            </p>
          )}
          <div
            style={{
              marginTop: '2.5rem',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: 'pointer',
                border: '1px solid #1c201e',
                background: '#1c201e',
                color: '#fbf8f2',
                padding: '0.9rem 1.6rem',
                fontSize: '0.8rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              Réessayer
            </button>
            {/* Rechargement complet volontaire : le layout racine a échoué,
                le routeur client n'est plus un terrain sûr. */}
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              style={{
                cursor: 'pointer',
                border: '1px solid rgba(28,32,30,0.25)',
                background: 'transparent',
                color: '#1c201e',
                padding: '0.9rem 1.6rem',
                fontSize: '0.8rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              Retour à l’accueil
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
