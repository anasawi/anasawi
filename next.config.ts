import type { NextConfig } from 'next'

const securityHeaders = [
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

  images: {
    formats: ['image/avif', 'image/webp'],
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
