import { NextResponse } from 'next/server'

import { contactSchema } from '@/lib/schemas'
import { clientIp, hashIp, rateLimit } from '@/lib/rate-limit'
import { db } from '@/server/db'
import { contactMessages } from '@/server/db/schema'
import { getSettings } from '@/server/queries'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ip = clientIp(request)
  const ipHash = hashIp(ip)

  const { allowed } = rateLimit(`contact:${ipHash}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })

  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de messages envoyés. Réessayez dans une heure.' },
      { status: 429 },
    )
  }

  const parsed = contactSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'Formulaire invalide.' }, { status: 400 })
  }

  /* Piège à robots : on répond 200 sans rien enregistrer. Un spammeur qui
     reçoit une erreur ajuste son script ; un spammeur qui reçoit un succès
     ne revient pas. */
  if (parsed.data.website) {
    return NextResponse.json({ ok: true })
  }

  const { name, email, phone, message } = parsed.data

  await db.insert(contactMessages).values({
    name,
    email,
    phone: phone || null,
    message,
    ipHash,
  })

  /* La notification est accessoire : si Resend échoue, le message est déjà
     en base et consultable dans le CMS. On ne fait pas échouer la requête. */
  await sendNotification({ name, email, phone, message }).catch((error) => {
    console.error('[contact] notification non envoyée', error)
  })

  return NextResponse.json({ ok: true })
}

async function sendNotification(payload: {
  name: string
  email: string
  phone?: string
  message: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_NOTIFY_TO
  const from = process.env.CONTACT_NOTIFY_FROM

  if (!apiKey || !to || !from) return

  const settings = await getSettings()
  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  await resend.emails.send({
    from,
    to,
    replyTo: payload.email,
    subject: `${settings.siteName} — message de ${payload.name}`,
    text: [
      `Nom : ${payload.name}`,
      `E-mail : ${payload.email}`,
      payload.phone ? `Téléphone : ${payload.phone}` : null,
      '',
      payload.message,
    ]
      .filter((line) => line !== null)
      .join('\n'),
  })
}
