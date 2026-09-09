import Link from 'next/link'

import { LogoMark } from '@/components/site/Logo'

export default function NotFound() {
  return (
    <div className="grain flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-12 w-12 text-stone" />

      <p className="label-eyebrow mt-12 text-stone">Erreur 404</p>

      <h1 className="mt-7 max-w-[16ch] text-[clamp(2.2rem,5vw,4rem)] leading-[1.08]">
        Cette page n’existe <em className="italic">plus</em>.
      </h1>

      <p className="mt-7 max-w-[42ch] leading-[1.7] text-ink-soft">
        Le lien que vous avez suivi est peut-être ancien, ou l’adresse
        comporte une erreur.
      </p>

      <Link
        href="/"
        className="group mt-12 inline-flex items-center gap-3 rounded-[2px] border border-line px-7 py-4 text-[0.8rem] uppercase tracking-[0.14em] text-ink transition-colors duration-500 hover:border-ink hover:bg-ink hover:text-ivory"
      >
        Retour à l’accueil
        <span
          aria-hidden="true"
          className="transition-transform duration-500 group-hover:translate-x-1"
        >
          →
        </span>
      </Link>
    </div>
  )
}
