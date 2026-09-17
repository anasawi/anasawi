import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import {
  CircleText,
  Marquee,
  MaskLines,
  Reveal,
  SplitChars,
} from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis, stripEmphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Aster, SectionIndex } from '@/components/site/ornaments'
import type { Settings } from '@/server/db/schema'

/*
 * Les héros de la bibliothèque — les ouvertures de page.
 * Tous parlent la langue de la planche V8 : arche, serif Cormorant en
 * lettres qui montent, astérisque signature, boutons sobres.
 */

/** `*ligne*` entière → italique ; sinon on retire les astérisques (le
    SplitChars anime des lettres brutes, pas du balisage). */
function splitLine(line: string): { text: string; italic: boolean } {
  const trimmed = line.trim()
  const whole = /^\*(.+)\*$/.exec(trimmed)
  if (whole && whole[1]) return { text: whole[1], italic: true }
  return { text: stripEmphasis(trimmed), italic: false }
}

/** « anne winzeried · thérapeute · » — la couronne du texte circulaire. */
function ringText(settings: Settings): string {
  const parts = [
    settings.practitionerName || 'Anne Winzenried',
    settings.practitionerTitle || 'thérapeute',
  ].filter(Boolean)
  return `${parts.join(' · ').toLowerCase()} · `
}

/* ════════════════════════════════════════════════════════════════════
   Hero — L'arche (proposition A de la planche)
   Arche centrale, titre serif géant qui l'enlace lettre à lettre,
   texte circulaire qui tourne, méta ✳ au-dessus, boutons sobres.
   ════════════════════════════════════════════════════════════════════ */

export const heroPleinEcranSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  primaryLabel: z.string().default(''),
  primaryHref: z.string().default('#contact'),
  secondaryLabel: z.string().default(''),
  secondaryHref: z.string().default('#a-propos'),
  mediaId: z.string().uuid().nullable().default(null),
})

function HeroPleinEcran({
  data,
  ctx,
}: BlockProps<z.output<typeof heroPleinEcranSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)
  const first = ctx.index === 0

  return (
    <div className="relative overflow-x-clip px-[var(--spacing-gutter)] pb-[var(--spacing-section)] pt-[var(--spacing-hero-top)] text-center">
      <SectionIndex index={ctx.index} label="ouverture" />

      {data.eyebrow && (
        <Reveal>
          <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
        </Reveal>
      )}

      {/* L'arche et le titre qui l'enlace — le « contenu » sous le label. */}
      <div className="relative mx-auto mt-10 md:mt-12">
        {/* Pas de Reveal autour de l'image : c'est le LCP — le rideau
            (`ImageVeil`) ne joue que lorsqu'elle n'est pas la première
            section. */}
        <BlockImage
          media={image}
          instant={first}
          priority={first}
          sizes="(max-width: 640px) 80vw, 44vw"
          className="mx-auto aspect-[3/4.2] w-[min(300px,80vw)] rounded-arch sm:w-[min(360px,60vw)] lg:w-[min(360px,44vw)]"
        />

        {/* Mobile : taille et décalages ramenés pour que les deux lignes
            tiennent dans l'écran sans être coupées ; à partir de `md`,
            les valeurs validées de la maquette. */}
        {lines.length > 0 && (
          <h1 className="text-invert pointer-events-none absolute inset-0 grid content-center justify-items-center font-serif text-[clamp(52px,16vw,76px)] font-light leading-[0.98] md:text-[clamp(56px,9vw,150px)] md:leading-none">
            {lines.map((line, i) => {
              const { text, italic } = splitLine(line)
              return (
                <SplitChars
                  key={i}
                  text={text}
                  italic={italic}
                  delay={0.35 + i * 0.18}
                  className={
                    i % 2 === 0
                      ? '-translate-x-[4vw] md:-translate-x-[13vw]'
                      : 'translate-x-[3vw] md:translate-x-[9vw]'
                  }
                />
              )
            })}
          </h1>
        )}

        <CircleText
          text={ringText(ctx.settings)}
          center="✳"
          /* Sable soutenu : le sable de la charte (#f4eee3) est un fond,
             il disparaît sur l'ivoire. Même famille, assez foncé pour
             se lire. */
          textClassName="fill-[#cbb99c] text-[10.4px] tracking-[0.32em]"
          centerClassName="fill-[#cbb99c]"
          /* Hors de l'arche, à droite, alignée sur le bas de l'arche. */
          className="absolute -bottom-6 right-[max(4vw,calc(50%-min(300px,38vw)))] hidden h-auto w-[min(104px,11vw)] sm:block"
        />
      </div>

      {data.intro && (
        <Reveal delay={0.5}>
          <p className="mx-auto mt-10 max-w-[46ch] text-[16px] leading-[1.9] text-ink-soft md:mt-12">
            {data.intro}
          </p>
        </Reveal>
      )}

      {(data.primaryLabel || data.secondaryLabel) && (
        <Reveal delay={0.62}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-3.5">
            {data.primaryLabel && (
              <ActionLink
                href={data.primaryHref}
                variant="primary"
                className="max-sm:w-full"
              >
                {data.primaryLabel}
              </ActionLink>
            )}
            {data.secondaryLabel && (
              <ActionLink
                href={data.secondaryHref}
                variant="ghost"
                withArrow={false}
                className="max-sm:w-full"
              >
                {data.secondaryLabel}
              </ActionLink>
            )}
          </div>
        </Reveal>
      )}
    </div>
  )
}

export const heroPleinEcranBlock: BlockDefinition<
  typeof heroPleinEcranSchema
> = {
  label: 'Hero — L’arche',
  description:
    'L’ouverture signature : arche centrale, grand titre qui l’enlace, texte circulaire.',
  group: 'Sections',
  schema: heroPleinEcranSchema,
  suggestedAnchor: 'accueil',
  navigable: true,
  bleed: true,
  fields: [
    field.text('eyebrow', 'Label supérieur', {
      placeholder: 'Thérapie — Cesson-Sévigné & visio',
    }),
    field.list(
      'titleLines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Deux lignes courtes, idéalement. Entourez une ligne d’astérisques pour l’italique : *son souffle*.',
      },
    ),
    field.textarea('intro', 'Phrase d’introduction'),
    field.text('primaryLabel', 'Bouton principal — libellé'),
    field.text('primaryHref', 'Bouton principal — lien'),
    field.text('secondaryLabel', 'Bouton discret — libellé'),
    field.text('secondaryHref', 'Bouton discret — lien'),
    field.media('mediaId', 'Image de l’arche'),
  ],
  defaults: {
    eyebrow: 'Thérapie — Cesson-Sévigné & visio',
    titleLines: [{ text: 'Retrouver' }, { text: '*son souffle.*' }],
    intro:
      'Un espace stable et confidentiel pour déposer ce qui pèse — et avancer à votre rythme.',
    primaryLabel: 'Prendre rendez-vous',
    primaryHref: '#contact',
    secondaryLabel: 'Découvrir l’approche',
    secondaryHref: '#approche',
    mediaId: null,
  },
  Component: HeroPleinEcran,
}

/* ════════════════════════════════════════════════════════════════════
   Hero — Éditorial
   Composition magazine : très grand titre qui traverse la page en
   lignes masquées, arche portrait décalée à droite qui remonte
   dessous, introduction et mention le long d'un filet.
   ════════════════════════════════════════════════════════════════════ */

export const heroEditorialSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  note: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
})

function HeroEditorial({
  data,
  ctx,
}: BlockProps<z.output<typeof heroEditorialSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)
  const first = ctx.index === 0

  return (
    <div className="relative flex min-h-[88svh] flex-col justify-center px-[var(--spacing-gutter)] pb-[var(--spacing-section)] pt-[var(--spacing-hero-top)]">
      <SectionIndex index={ctx.index} label="ouverture" />

      <div className="mx-auto w-full max-w-[1560px]">
        {data.eyebrow && (
          <Reveal>
            <Eyebrow>{data.eyebrow}</Eyebrow>
          </Reveal>
        )}

        {lines.length > 0 && (
          <h1 className="mt-5 font-serif text-[clamp(2.8rem,7vw,7.4rem)] font-light leading-[1.04] text-ink lg:max-w-[84%]">
            <MaskLines delay={0.15}>
              {lines.map((line, i) => (
                <span key={i}>
                  <Emphasis text={line} />
                </span>
              ))}
            </MaskLines>
          </h1>
        )}

        <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 md:gap-12 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-5">
            {data.intro && (
              <Reveal delay={0.3}>
                <p className="max-w-[34rem] text-[length:var(--text-lead)] leading-[1.75] text-ink-soft">
                  {data.intro}
                </p>
              </Reveal>
            )}

            {data.note && (
              <Reveal delay={0.4}>
                <div className="mt-8 flex items-start gap-5">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-16 w-px shrink-0 bg-line-strong"
                  />
                  <p className="max-w-[24rem] text-[0.85rem] leading-[1.75] text-stone">
                    {data.note}
                  </p>
                </div>
              </Reveal>
            )}
          </div>

          {/* Arche portrait, remontée sous le titre. */}
          <div className="relative lg:col-span-5 lg:col-start-8 lg:-mt-24">
            <BlockImage
              media={image}
              instant={first}
              priority={first}
              sizes="(max-width: 1024px) 88vw, 38vw"
              className="mx-auto aspect-[3/4] w-full max-w-[26rem] rounded-arch lg:mx-0"
            />
            <CircleText
              text={ringText(ctx.settings)}
              center="✳"
              className="absolute -bottom-6 -left-6 hidden h-auto w-[110px] lg:block"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const heroEditorialBlock: BlockDefinition<typeof heroEditorialSchema> =
  {
    label: 'Hero — Éditorial',
    description:
      'Grand titre magazine qui traverse la page, arche portrait décalée à droite.',
    group: 'Sections',
    schema: heroEditorialSchema,
    suggestedAnchor: 'accueil',
    navigable: true,
    bleed: true,
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.list(
        'titleLines',
        'Titre — une entrée par ligne',
        [field.text('text', 'Ligne', { full: true })],
        {
          addLabel: 'Ajouter une ligne',
          help: 'Astérisques pour l’italique : *mot*.',
        },
      ),
      field.textarea('intro', 'Texte d’introduction'),
      field.textarea('note', 'Mention descriptive', {
        help: 'Courte précision affichée le long du filet, sous l’introduction.',
      }),
      field.media('mediaId', 'Portrait'),
    ],
    defaults: {
      eyebrow: 'Cabinet de thérapie',
      titleLines: [
        { text: 'Avancer vers un' },
        { text: 'équilibre *durable*.' },
      ],
      intro:
        'Chaque chemin commence par une écoute. Nous prenons le temps de comprendre ce qui vous amène, avant d’avancer — ensemble, et à votre rythme.',
      note: 'Consultations au cabinet de Cesson-Sévigné ou en visio, sur rendez-vous uniquement.',
      mediaId: null,
    },
    Component: HeroEditorial,
  }

/* ════════════════════════════════════════════════════════════════════
   Hero — Minimal
   Typographie seule dans une immense respiration : le serif monte
   lettre à lettre, un filet vertical descend, rien d'autre.
   ════════════════════════════════════════════════════════════════════ */

export const heroMinimalSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  linkLabel: z.string().default(''),
  linkHref: z.string().default('#contact'),
})

function HeroMinimal({
  data,
  ctx,
}: BlockProps<z.output<typeof heroMinimalSchema>>) {
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)

  return (
    <div className="relative flex min-h-[85svh] flex-col items-center justify-center px-[var(--spacing-gutter)] pb-[var(--spacing-section)] pt-[var(--spacing-hero-top)] text-center">
      <SectionIndex index={ctx.index} label="ouverture" />

      {data.eyebrow && (
        <Reveal>
          <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
        </Reveal>
      )}

      {lines.length > 0 && (
        <h1 className="mt-5 max-w-[62rem] font-serif text-[clamp(2.9rem,7.5vw,7.8rem)] font-light leading-[1.05] text-ink">
          {lines.map((line, i) => {
            const { text, italic } = splitLine(line)
            return (
              <SplitChars
                key={i}
                text={text}
                italic={italic}
                delay={0.2 + i * 0.16}
              />
            )
          })}
        </h1>
      )}

      {data.intro && (
        <Reveal delay={0.5}>
          <p className="mx-auto mt-6 max-w-[44ch] text-[16px] leading-[1.9] text-ink-soft">
            {data.intro}
          </p>
        </Reveal>
      )}

      {data.linkLabel && (
        <Reveal delay={0.6}>
          <div className="mt-8">
            <ActionLink href={data.linkHref} variant="primary">
              {data.linkLabel}
            </ActionLink>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.7}>
        <span aria-hidden="true" className="mt-12 block h-20 w-px bg-line-strong" />
        <Aster className="mt-5 block text-[18px] text-blue-deep" />
      </Reveal>
    </div>
  )
}

export const heroMinimalBlock: BlockDefinition<typeof heroMinimalSchema> = {
  label: 'Hero — Minimal',
  description: 'Typographie seule, centrée, immense respiration.',
  group: 'Sections',
  schema: heroMinimalSchema,
  suggestedAnchor: 'accueil',
  navigable: true,
  bleed: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.list(
      'titleLines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Entourez une ligne d’astérisques pour l’italique : *s’apaiser*.',
      },
    ),
    field.textarea('intro', 'Ligne d’introduction'),
    field.text('linkLabel', 'Bouton — libellé'),
    field.text('linkHref', 'Bouton — lien'),
  ],
  defaults: {
    eyebrow: 'Thérapie · Écoute',
    titleLines: [{ text: 'Ce qui se dépose' }, { text: '*peut s’apaiser.*' }],
    intro:
      'Un espace de parole confidentiel, pour traverser ce qui pèse et retrouver un souffle.',
    linkLabel: 'Prendre rendez-vous',
    linkHref: '#contact',
  },
  Component: HeroMinimal,
}

/* ════════════════════════════════════════════════════════════════════
   Hero — Avec bandeau
   Ouverture typographique centrée, refermée par le bandeau défilant
   de la maquette (proposition B) : les mots-souffle en serif italique,
   séparés d'astérisques, sur fond sable.
   ════════════════════════════════════════════════════════════════════ */

export const heroBandeauSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  primaryLabel: z.string().default(''),
  primaryHref: z.string().default('#contact'),
  marqueeWords: z.string().default(''),
})

function HeroBandeau({
  data,
  ctx,
}: BlockProps<z.output<typeof heroBandeauSchema>>) {
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)
  const words = data.marqueeWords
    .split(/[,;·]/)
    .map((w) => w.trim())
    .filter(Boolean)

  return (
    <div className="relative">
      <SectionIndex index={ctx.index} label="ouverture" />

      <div className="flex min-h-[74svh] flex-col items-center justify-center px-[var(--spacing-gutter)] pb-[var(--spacing-section)] pt-[var(--spacing-hero-top)] text-center">
        {data.eyebrow && (
          <Reveal>
            <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
          </Reveal>
        )}

        {lines.length > 0 && (
          <h1 className="mt-5 max-w-[58rem] font-serif text-[clamp(2.8rem,6.8vw,7rem)] font-light leading-[1.06] text-ink">
            <MaskLines delay={0.15}>
              {lines.map((line, i) => (
                <span key={i}>
                  <Emphasis text={line} />
                </span>
              ))}
            </MaskLines>
          </h1>
        )}

        {data.intro && (
          <Reveal delay={0.35}>
            <p className="mx-auto mt-6 max-w-[46ch] text-[16px] leading-[1.9] text-ink-soft">
              {data.intro}
            </p>
          </Reveal>
        )}

        {data.primaryLabel && (
          <Reveal delay={0.45}>
            <div className="mt-8">
              <ActionLink href={data.primaryHref} variant="primary">
                {data.primaryLabel}
              </ActionLink>
            </div>
          </Reveal>
        )}
      </div>

      {words.length > 0 && (
        <div className="bg-sand py-[var(--spacing-band)]">
          <Marquee duration={38}>
            {words.map((word, i) => (
              <span
                key={i}
                className="flex items-center font-serif text-[clamp(22px,3vw,46px)] font-light italic leading-none text-ink-soft"
              >
                <span className="px-[max(10px,1.25vw)]">{word}</span>
                <Aster className="text-[20px] not-italic text-blue-deep" />
              </span>
            ))}
          </Marquee>
        </div>
      )}
    </div>
  )
}

export const heroBandeauBlock: BlockDefinition<typeof heroBandeauSchema> = {
  label: 'Hero — Avec bandeau',
  description:
    'Titre centré, refermé par le bandeau de mots qui défilent sur fond sable.',
  group: 'Sections',
  schema: heroBandeauSchema,
  suggestedAnchor: 'accueil',
  navigable: true,
  bleed: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.list(
      'titleLines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Astérisques pour l’italique : *mot*.',
      },
    ),
    field.textarea('intro', 'Phrase d’introduction'),
    field.text('primaryLabel', 'Bouton — libellé'),
    field.text('primaryHref', 'Bouton — lien'),
    field.text('marqueeWords', 'Mots du bandeau', {
      full: true,
      help: 'Séparés par des virgules — ils défilent en boucle.',
    }),
  ],
  defaults: {
    eyebrow: 'Thérapie — Cesson-Sévigné & visio',
    titleLines: [{ text: 'Un espace pour' }, { text: 'déposer ce qui *pèse*.' }],
    intro:
      'Un accompagnement à votre rythme, dans un cadre calme et confidentiel.',
    primaryLabel: 'Prendre rendez-vous',
    primaryHref: '#contact',
    marqueeWords: 'respirer, déposer, traverser, s’apaiser',
  },
  Component: HeroBandeau,
}
