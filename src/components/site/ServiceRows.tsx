'use client'

import { useMotionValue } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Reveal } from '@/components/site/anim'
import {
  ServiceHoverPreview,
  useCanHover,
} from '@/components/site/ServiceHoverPreview'
import { ServicePanel } from '@/components/site/ServicePanel'
import type { ServiceWithMedia } from '@/server/db/schema'

/*
 * Liste des accompagnements — les rangées et la fiche qu'elles ouvrent.
 *
 * Chaque rangée est un vrai lien vers `?accompagnement=<slug>` : le clic est
 * intercepté pour ouvrir le panneau sans recharger, mais l'adresse reste
 * partageable, un clic du milieu ouvre un onglet, et un moteur de recherche
 * y voit un lien. L'historique est tenu à jour pour que le bouton Retour
 * referme le panneau plutôt que de quitter la page.
 *
 * Dans l'aperçu du constructeur (`interactive` faux), les rangées restent
 * de simples lignes : on y sélectionne des sections, on n'y navigue pas.
 */

const PARAM = 'accompagnement'

const NUMBER_WORDS = [
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
] as const

function numberWord(i: number): string {
  return NUMBER_WORDS[i] ?? String(i + 1)
}

function slugFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM)
}

function writeLocation(slug: string | null, mode: 'push' | 'replace') {
  const url = new URL(window.location.href)
  if (slug) url.searchParams.set(PARAM, slug)
  else url.searchParams.delete(PARAM)
  const state = { ...(window.history.state ?? {}), servicePanel: slug }
  if (mode === 'push') window.history.pushState(state, '', url)
  else window.history.replaceState(state, '', url)
}

export function ServiceRows({
  items,
  bookingHref,
  ctaLabel,
  interactive = true,
}: {
  items: ServiceWithMedia[]
  bookingHref: string
  ctaLabel?: string
  interactive?: boolean
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  /* Survol : l'aperçu flottant suit le curseur sur la rangée survolée.
     Pointeurs fins seulement, et jamais pendant que la fiche est ouverte. */
  const canHover = useCanHover()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  /* Le curseur vit dans des valeurs de mouvement : les mettre à jour ne
     re-rend rien, l'aperçu les suit directement. */
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)

  const openIndex = useMemo(
    () => items.findIndex((item) => item.slug === openSlug),
    [items, openSlug],
  )
  const openService = openIndex >= 0 ? (items[openIndex] ?? null) : null

  /* Lien profond : `?accompagnement=…` à l'arrivée ouvre la fiche. */
  useEffect(() => {
    if (!interactive) return
    const initial = slugFromLocation()
    if (initial && items.some((item) => item.slug === initial)) {
      setOpenSlug(initial)
    }
  }, [interactive, items])

  /* Retour / Avancer du navigateur : l'URL fait foi. */
  useEffect(() => {
    if (!interactive) return
    const onPop = () => setOpenSlug(slugFromLocation())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [interactive])

  const open = useCallback(
    (slug: string) => {
      /* Déjà ouverte (double clic) : rien à faire — surtout pas une
         deuxième entrée d'historique, que Retour devrait consommer deux
         fois. Une autre fiche déjà ouverte : on remplace l'entrée, pour
         que Retour ferme au lieu de revenir à la fiche précédente. */
      if (openSlug === slug) return
      writeLocation(slug, openSlug ? 'replace' : 'push')
      setOpenSlug(slug)
    },
    [openSlug],
  )

  const close = useCallback(() => {
    /* Si l'ouverture a poussé une entrée, revenir en arrière la consomme ;
       sinon (lien profond direct), on nettoie l'adresse sur place. */
    if (window.history.state?.servicePanel) window.history.back()
    else writeLocation(null, 'replace')
    setOpenSlug(null)
  }, [])

  const showPreview = interactive && canHover && openSlug === null
  const hovered = hoverIndex !== null ? (items[hoverIndex] ?? null) : null

  return (
    <>
      <div
        className="mt-10 md:mt-12"
        onMouseMove={
          showPreview
            ? (event) => {
                pointerX.set(event.clientX)
                pointerY.set(event.clientY)
              }
            : undefined
        }
        onMouseLeave={showPreview ? () => setHoverIndex(null) : undefined}
      >
        {items.map((service, i) => {
          const last = i === items.length - 1
          const rowClass = `group grid grid-cols-1 gap-y-2 border-t border-line px-[var(--spacing-gutter)] py-7 text-left transition-[background-color,color,border-radius] duration-[450ms] ease-[var(--ease)] hover:rounded-[28px] hover:bg-night hover:text-ivory md:py-9 lg:grid-cols-12 lg:items-baseline lg:gap-x-5 ${
            last ? 'border-b' : ''
          }`

          const inner = (
            <>
              <span className="font-serif text-[16px] font-light italic text-blue-deep transition-colors duration-[450ms] group-hover:text-blue lg:col-span-1">
                {numberWord(i)}
              </span>

              <h3 className="font-serif text-[clamp(28px,3.8vw,62px)] font-light leading-none transition-transform duration-[450ms] ease-[var(--ease)] group-hover:translate-x-4 group-hover:italic lg:col-span-7">
                {service.title}
              </h3>

              {/* Mobile : description toujours visible (pas de survol au
                  doigt). Large : elle se révèle avec la rangée — sauf quand
                  la carte flottante prend le relais, pour ne pas donner
                  deux choses à lire en même temps. */}
              <p
                className={`mt-1 max-w-[40ch] text-[14.5px] leading-[1.75] text-stone transition-[opacity,transform,color] duration-[450ms] group-hover:text-ivory/75 lg:mt-0 lg:col-span-3 lg:translate-y-1.5 lg:text-[14px] lg:opacity-0 ${
                  showPreview ? '' : 'lg:group-hover:translate-y-0 lg:group-hover:opacity-100'
                }`}
              >
                {service.excerpt}
                {service.duration ? (
                  <span className="mt-2 block text-[10.5px] font-semibold uppercase tracking-[0.2em] opacity-80">
                    {service.duration}
                  </span>
                ) : null}
              </p>

              <span
                aria-hidden="true"
                className="mt-1 block text-left font-serif text-[22px] opacity-35 transition-[opacity,transform,color] duration-[450ms] ease-[var(--ease)] group-hover:translate-x-[5px] group-hover:text-blue group-hover:opacity-100 lg:mt-0 lg:col-span-1 lg:text-right"
              >
                →
              </span>
            </>
          )

          return (
            <Reveal key={service.id} delay={Math.min(i * 0.07, 0.35)}>
              {interactive ? (
                <a
                  href={`?${PARAM}=${encodeURIComponent(service.slug)}`}
                  onClick={(event) => {
                    /* Clic modifié (nouvel onglet, etc.) : on laisse faire. */
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    ) {
                      return
                    }
                    event.preventDefault()
                    open(service.slug)
                  }}
                  onMouseEnter={
                    showPreview
                      ? (event) => {
                          /* Position posée avant l'apparition : l'aperçu
                             naît sous le curseur, pas au coin de l'écran. */
                          pointerX.set(event.clientX)
                          pointerY.set(event.clientY)
                          setHoverIndex(i)
                        }
                      : undefined
                  }
                  aria-haspopup="dialog"
                  aria-expanded={openSlug === service.slug}
                  className={`${rowClass} cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ivory`}
                >
                  {inner}
                </a>
              ) : (
                <article className={rowClass}>{inner}</article>
              )}
            </Reveal>
          )
        })}
      </div>

      {showPreview && (
        <ServiceHoverPreview
          service={hovered}
          index={hoverIndex ?? 0}
          pointerX={pointerX}
          pointerY={pointerY}
        />
      )}

      {interactive && (
        <ServicePanel
          service={openService}
          index={Math.max(openIndex, 0)}
          onClose={close}
          bookingHref={bookingHref}
          ctaLabel={ctaLabel}
        />
      )}
    </>
  )
}
