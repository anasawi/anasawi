import type { Metadata } from 'next'
import Link from 'next/link'

import { InvitationForm } from '@/components/admin/InvitationForm'
import { LogoMark } from '@/components/site/Logo'
import { readInvitation } from '@/server/actions/users'

export const metadata: Metadata = {
  title: 'Choisir mon mot de passe — ANASAWI',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * La page du lien d'invitation : la personne invitée y choisit son mot de
 * passe. Un lien périmé ou déjà utilisé le dit en clair, sans dévoiler
 * pour qui il était.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await readInvitation(token)

  return (
    <main className="grain flex min-h-svh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <LogoMark className="h-10 w-10 text-ink" />
          <p className="mt-5 font-serif text-[0.95rem] tracking-[0.28em] text-ink">ANASAWI</p>
          <p className="mt-2 text-[0.78rem] uppercase tracking-[0.16em] text-stone">Administration</p>
        </div>

        {invitation ? (
          <>
            <h1 className="font-serif text-[1.5rem] leading-tight text-ink">
              Bienvenue, {invitation.name}.
            </h1>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
              Choisissez le mot de passe qui vous servira à vous connecter avec
              l’adresse <strong className="font-medium text-ink">{invitation.email}</strong>.
            </p>
            <div className="mt-8">
              <InvitationForm token={token} email={invitation.email} />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-serif text-[1.5rem] leading-tight text-ink">Ce lien n’est plus valable.</h1>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
              Il a peut-être déjà servi, ou il a plus de sept jours. Demandez un
              nouveau lien à la personne qui vous a invité·e.
            </p>
            <p className="mt-8 text-[0.85rem]">
              <Link href="/login" className="text-blue-deep underline-offset-4 hover:underline">
                Vous avez déjà un mot de passe ? Se connecter
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
