import { navHref, toE164 } from '@/lib/utils'
import type { Settings, SocialLink } from '@/server/db/schema'
import type { NavItem } from './Header'

/**
 * Pied de page — style M de la planche V8.
 *
 * Les données réelles (contact, adresse, navigation) sont réorganisées
 * sobrement au-dessus, puis la grande signature AMASWI centrée, la ligne
 * « Anne Winzeried — thérapeute » en italique, et la ligne méta.
 */
export function Footer({
  settings,
  items,
}: {
  settings: Settings
  items: NavItem[]
}) {
  const year = new Date().getFullYear()
  const socials = (settings.socialLinks as SocialLink[]) ?? []

  const addressLine = [
    settings.addressStreet,
    [settings.addressPostalCode, settings.addressCity]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  const signatureLine = [settings.practitionerName, settings.practitionerTitle]
    .filter(Boolean)
    .join(' — ')

  const columnLabel =
    'text-[11px] font-semibold uppercase tracking-[0.24em] text-stone'

  return (
    <footer className="border-t border-line bg-ivory">
      <div className="container-editorial pb-14 pt-20 text-center">
        {/* ── Coordonnées réelles, réorganisées sobrement ─────────── */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-x-10 gap-y-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-4">
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
              <address className="mt-2.5 text-[13px] leading-[1.7] not-italic text-ink-soft">
                {addressLine}
              </address>
            </div>
          )}

          {(items.length > 0 || socials.length > 0) && (
            <nav aria-label="Navigation de pied de page">
              <p className={columnLabel}>Parcourir</p>
              <ul className="mt-2.5 space-y-1.5 text-[13px] leading-[1.7]">
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

        {settings.tagline && (
          <p className="mx-auto mt-16 max-w-[46ch] font-serif text-[17px] font-light italic text-ink-soft">
            {settings.tagline}
          </p>
        )}

        {/* ── Grande signature ────────────────────────────────────── */}
        <p className="mt-16 pl-[0.3em] font-serif text-[clamp(36px,4.8vw,76px)] font-light leading-none tracking-[0.3em] text-ink">
          AMASWI
        </p>
        {signatureLine && (
          <p className="mt-3 font-serif text-[16px] font-light italic text-stone">
            {signatureLine}
          </p>
        )}

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
          © {year}
          {settings.siteName ? ` · ${settings.siteName}` : ''} · Tous droits
          réservés
        </p>
      </div>
    </footer>
  )
}
