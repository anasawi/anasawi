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
 *   quand les images de substitution auront disparu (lot 11). Les médias
 *   envoyés depuis le CMS sont servis par `/api/media/…`, donc couverts par
 *   `'self'` : seul l'historique justifie encore l'hôte Vercel Blob.
 * - En développement, le websocket de rechargement à chaud (`ws://`) sera
 *   signalé par `connect-src` : bruit attendu, absent en production.
 */
const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos",
  "connect-src 'self'",
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy-Report-Only',
    value: CONTENT_SECURITY_POLICY_REPORT_ONLY,
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
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
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
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
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
