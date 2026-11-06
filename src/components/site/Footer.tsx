import { addressLines } from '@/lib/settings-helpers'
import { navHref, toE164 } from '@/lib/utils'
import type { Settings, SocialLink } from '@/server/db/schema'
import type { NavItem } from './Header'
import { LogoMark } from './Logo'
import { Collegues, LiensLegaux, Organismes } from './PiedExtras'
import type { Pied } from '@/lib/pied'
import type { Media } from '@/server/db/schema'

/**
 * Pied de page — style M de la planche V8.
 *
 * Les données réelles (contact, adresse, navigation) sont réorganisées
 * sobrement au-dessus, puis la grande signature ANASAWI centrée, la ligne
 * « Anne Winzenried — thérapeute » en italique, et la ligne méta.
 */
export function Footer({
  settings,
  items,
  logoUrl = null,
  pied,
  logos = {},
}: {
  settings: Settings
  items: NavItem[]
  /** Logo choisi dans les Réglages (absent : celui livré avec le site). */
  logoUrl?: string | null
  /** Organismes, déontologie, collègues (Réglages › Pied de page). */
  pied?: Pied
  logos?: Record<string, Media>
}) {
  const year = new Date().getFullYear()
  const socials = (settings.socialLinks as SocialLink[]) ?? []

  /* Sur une seule ligne : « rue, code postal ville ». */
  const addressLine = addressLines(settings).join(', ')

  const signatureLine = [settings.practitionerName, settings.practitionerTitle]
    .filter(Boolean)
    .join(' — ')

  const columnLabel =
    'text-[11px] font-semibold uppercase tracking-[0.24em] text-stone'

  return (
    <footer className="border-t border-line bg-ivory">
      {/* Gouttière = container-editorial ; vertical = section-tight. */}
      <div className="container-editorial py-[var(--spacing-section-tight)] text-center">
        {/* ── Coordonnées réelles, réorganisées sobrement ─────────── */}
        <div className="mx-auto grid max-w-4xl min-w-0 grid-cols-1 gap-x-10 gap-y-8 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-4">
          {settings.contactEmail && (
            <div>
              <p className={columnLabel}>Écrire</p>
              <p className="mt-2.5 font-serif text-[18px] font-light">
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="break-all transition-colors duration-300 hover:text-blue-deep"
                >
                  {settings.contactEmail}
                </a>
              </p>
            </div>
          )}

          {settings.contactPhone && (
            <div>
              <p className={columnLabel}>Appeler</p>
              <p className="mt-2.5 font-serif text-[18px] font-light">
                <a
                  href={`tel:${toE164(settings.contactPhone)}`}
                  className="transition-colors duration-300 hover:text-blue-deep"
                >
                  {settings.contactPhone}
                </a>
              </p>
            </div>
          )}

          {addressLine && (
            <div>
              <p className={columnLabel}>Le cabinet</p>
              <address className="mt-2.5 text-[14.5px] leading-[1.7] not-italic text-ink-soft">
                {addressLine}
              </address>
            </div>
          )}

          {(items.length > 0 || socials.length > 0) && (
            <nav aria-label="Navigation de pied de page">
              <p className={columnLabel}>Parcourir</p>
              <ul className="mt-2.5 space-y-1.5 text-[14.5px] leading-[1.7]">
                {items.map((item) => (
                  <li key={item.anchor}>
                    <a
                      href={navHref(item.anchor)}
                      className="text-ink-soft transition-colors duration-300 hover:text-blue-deep"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                {socials.map((social) => (
                  <li key={social.url}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-soft transition-colors duration-300 hover:text-blue-deep"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        {/* Organismes et collègues (Réglages › Pied de page). */}
        {pied && pied.organismes.length > 0 && (
          <div className="mx-auto mt-12 flex max-w-4xl flex-col items-center gap-4 border-t border-line pt-10">
            {pied.organismesTitre && <p className={columnLabel}>{pied.organismesTitre}</p>}
            <Organismes pied={pied} logos={logos} ton="clair" className="justify-center" />
          </div>
        )}
        {pied && pied.amis.some((a) => a.nom && a.url) && (
          <div className="mx-auto mt-8 flex max-w-4xl flex-col items-center gap-3">
            {pied.amisTitre && <p className={columnLabel}>{pied.amisTitre}</p>}
            <Collegues pied={pied} ton="clair" className="flex flex-wrap justify-center gap-x-6 space-y-0 text-[14.5px]" />
          </div>
        )}

        {settings.tagline && (
          <p className="mx-auto mt-10 max-w-[46ch] font-serif text-[18px] font-light italic text-ink-soft md:mt-12">
            {settings.tagline}
          </p>
        )}

        {/* ── Grande signature ──────────────────────────────────────
            L'ombelle au-dessus du nom : la marque n'apparaissait que dans
            la capsule, en 28 px — on ne la voyait pas. */}
        <LogoMark src={logoUrl} className="mx-auto mt-12 h-14 w-14 md:mt-14 md:h-16 md:w-16" />
        <p className="mt-6 max-w-full overflow-hidden pl-[0.3em] font-serif text-[clamp(36px,4.8vw,76px)] font-light leading-none tracking-[0.3em] text-ink md:mt-7">
          ANASAWI
        </p>
        {signatureLine && (
          <p className="mt-3 font-serif text-[17px] font-light italic text-stone">
            {signatureLine}
          </p>
        )}

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
          © {year}
          {settings.siteName ? ` · ${settings.siteName}` : ''} · Tous droits
          réservés
        </p>
        <LiensLegaux ton="clair" className="mt-3 justify-center text-[12px] text-stone" />
      </div>
    </footer>
  )
}
