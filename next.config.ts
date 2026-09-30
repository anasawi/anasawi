import type { NextConfig } from 'next'

/**
 * Content-Security-Policy — EN MODE RAPPORT UNIQUEMENT (décision client).
 *
 * `Content-Security-Policy-Report-Only` ne bloque rien : le navigateur se
 * contente de signaler en console ce qu'une CSP stricte aurait refusé. C'est
 * la première marche : observer sur l'accueil, `/admin/accueil` et
 * `/templates`, ajuster, puis seulement basculer l'en-tête en
 * `Content-Security-Policy` (chantier nonce pour retirer `'unsafe-inline'`
 * de `script-src`).
 *
 * Notes :
 * - Les polices passent par `next/font/google` (auto-hébergées, voir
 *   `app/layout.tsx`) : les domaines Google de `style-src` / `font-src`
 *   sont superflus mais inoffensifs — gardés pour ne rien signaler à tort
 *   si une police devait un jour être chargée à la volée.
 * - `'unsafe-inline'` dans `style-src` couvre les trois
 *   `dangerouslySetInnerHTML` de style (identité, grilles, JSON-LD) et les
 *   styles inline de React.
 * - `frame-src` : les blocs Vidéo (YouTube nocookie, Vimeo) et Accès
 *   (Google Maps) sont des iframes — sans cette directive, `default-src`
 *   les aurait signalés à chaque page qui les contient.
 * - `img-src` reprend les `remotePatterns` ci-dessous ; à réduire avec eux
 *   quand les images de substitution (Picsum, `db:seed-images`) et celles
 *   des semis (Unsplash, `db:seed-site`) auront disparu. Les médias
 *   envoyés depuis le CMS sont servis par `/api/media/…`, donc couverts par
 *   `'self'`. L'hôte Vercel Blob de l'ancien stockage n'est plus référencé
 *   nulle part : retiré.
 * - En développement, le websocket de rechargement à chaud (`ws://`) sera
 *   signalé par `connect-src` : bruit attendu, absent en production.
 *
 * `report-to` N'EST PAS DÉCORATIF. Sans lui, Chrome refuse purement et
 * simplement d'appliquer une politique en mode rapport : « the policy will
 * have no effect ». L'en-tête était donc là depuis le début sans rien
 * observer du tout — une sécurité de façade. Le groupe est déclaré par
 * l'en-tête `Reporting-Endpoints` ci-dessous et reçu par
 * `/api/csp-report`, couvert par `connect-src 'self'`.
 */
const CSP_REPORT_GROUP = 'csp'
const CSP_REPORT_PATH = '/api/csp-report'
const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos",
  "connect-src 'self'",
  /* Vidéos : servies par /api/media ; `blob:` pour la recompression dans
     l'admin (la source lue depuis un objet blob) et l'aperçu. */
  "media-src 'self' blob:",
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `report-to ${CSP_REPORT_GROUP}`,
  /* Directive dépréciée, gardée pour Firefox et Safari qui ne lisent pas
     encore `report-to` : les deux cohabitent sans conflit. */
  `report-uri ${CSP_REPORT_PATH}`,
].join('; ')

const securityHeaders = [
  {
    key: 'Reporting-Endpoints',
    value: `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`,
  },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: CONTENT_SECURITY_POLICY_REPORT_ONLY,
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  /* Isole la fenêtre des pages ouvertes par d'autres origines (`window.
     opener`) : sans effet sur le site, une attaque de moins sur l'admin. */
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const PRIVATE_HEADERS = [
  { key: 'Cache-Control', value: 'no-store, private' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /* Un build de validation lancé pendant que `next dev` tourne efface le
     dossier `.next` que le serveur de dev est en train de servir : page
     sans styles, logo géant. Les scripts de validation construisent donc
     dans un dossier à part (`NEXT_DIST_DIR=.next-build`) ; Netlify et le
     dev gardent `.next`. */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',

  images: {
    formats: ['image/avif', 'image/webp'],
    /* Next ≥ 15.4 exige de déclarer chaque `quality` utilisée par
       `next/image` : 75 (défaut) et 88 (`BlockImage`). */
    qualities: [75, 88],
    remotePatterns: [
      /* Photographies des semis (npm run db:seed-site). */
      { protocol: 'https', hostname: 'images.unsplash.com' },
      /* Images de substitution (npm run db:seed-images).
         Picsum redirige vers son CDN Fastly : les deux hôtes sont requis.
         À retirer une fois les vraies photographies en place. */
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
    ],
    deviceSizes: [420, 640, 828, 1080, 1280, 1600, 1920, 2560],
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      /* Écrans privés : jamais mis en cache par un intermédiaire, jamais
         indexés. Le CDN de Netlify respecte `Cache-Control` ; sans
         `private`, une page d'administration rendue pour une personne
         pouvait être resservie à une autre. `/templates` est public
         (voir `middleware.ts`) mais reste un outil de revue : pas de
         cache, pas d'indexation. */
      {
        source: '/(admin|login|invitation|templates)/:path*',
        headers: PRIVATE_HEADERS,
      },
      { source: '/(admin|login|templates)', headers: PRIVATE_HEADERS },
      /* Le lien d'invitation porte son jeton dans l'adresse : aucun
         `Referer` ne doit l'emporter vers un autre site. */
      {
        source: '/invitation/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ]
  },

  /**
   * Anciennes adresses de l'administration. Redirections HTTP (301) : elles
   * remplacent quatre pages qui ne faisaient que `redirect()`, et la route
   * `/admin/edit` — le site est une page unique, « Modifier » c'est
   * `/admin/accueil`. Les fragments (`#menu`, `#referencement`) ne
   * voyagent pas dans une redirection serveur : ils sont ajoutés côté
   * client par la page des réglages si l'adresse les porte, sinon perdus
   * — acceptable pour des signets.
   */
  async redirects() {
    return [
      { source: '/admin/identite', destination: '/admin/reglages#palette', permanent: true },
      { source: '/admin/parametres', destination: '/admin/reglages#coordonnees', permanent: true },
      { source: '/admin/navigation', destination: '/admin/reglages#menu', permanent: true },
      { source: '/admin/seo', destination: '/admin/reglages#referencement', permanent: true },
      { source: '/admin/edit', destination: '/admin/accueil', permanent: true },
    ]
  },
}

export default nextConfig
