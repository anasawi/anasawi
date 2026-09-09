import { Logo } from './Logo'
import { toE164 } from '@/lib/utils'
import type { Settings, SocialLink } from '@/server/db/schema'
import { navHref } from '@/lib/utils'
import type { NavItem } from './Header'

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

  return (
    <footer className="border-t border-line-strong bg-ivory-warm">
      <div className="container-editorial py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo className="text-ink" />
            {settings.practitionerName && (
              <p className="mt-7 font-serif text-[1.15rem] text-ink">
                {settings.practitionerName}
              </p>
            )}
            {settings.practitionerTitle && (
              <p className="mt-1 text-[0.86rem] text-ink-soft">
                {settings.practitionerTitle}
              </p>
            )}
            {settings.tagline && (
              <p className="mt-6 max-w-[34ch] text-[0.88rem] leading-[1.75] text-ink-soft">
                {settings.tagline}
              </p>
            )}
          </div>

          {items.length > 0 && (
            <nav
              aria-label="Navigation de pied de page"
              className="md:col-span-3"
            >
              <p className="label-eyebrow text-stone">Navigation</p>
              <ul className="mt-6 space-y-3">
                {items.map((item) => (
                  <li key={item.anchor}>
                    <a
                      href={navHref(item.anchor)}
                      className="text-[0.9rem] text-ink-soft transition-colors duration-500 hover:text-ink"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="md:col-span-4">
            <p className="label-eyebrow text-stone">Contact</p>
            <ul className="mt-6 space-y-3 text-[0.9rem] text-ink-soft">
              {settings.contactPhone && (
                <li>
                  <a
                    href={`tel:${toE164(settings.contactPhone)}`}
                    className="transition-colors duration-500 hover:text-ink"
                  >
                    {settings.contactPhone}
                  </a>
                </li>
              )}
              {settings.contactEmail && (
                <li>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="break-all transition-colors duration-500 hover:text-ink"
                  >
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {addressLine && (
                <li>
                  <address className="not-italic">{addressLine}</address>
                </li>
              )}
            </ul>

            {socials.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
                {socials.map((social) => (
                  <li key={social.url}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.8rem] uppercase tracking-[0.14em] text-ink-soft transition-colors duration-500 hover:text-ink"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-24 flex flex-col justify-between gap-4 border-t border-line pt-8 text-[0.76rem] text-stone sm:flex-row">
          <p>
            © {year} {settings.siteName}
            {settings.practitionerName ? ` — ${settings.practitionerName}` : ''}
          </p>
          <p className="pb-16 lg:pb-0">Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
