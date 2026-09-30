import { NextResponse } from 'next/server'

import { contactSchema } from '@/lib/schemas'
import { clientIp, hashIp, rateLimit } from '@/lib/rate-limit'
import { describeError } from '@/server/actions/types'
import { db } from '@/server/db'
import { contactMessages } from '@/server/db/schema'
import { rejectCrossSite } from '@/server/http/same-origin'
import { getSettings } from '@/server/queries'

export const runtime = 'nodejs'

/** Un message honnête pèse quelques kilo-octets ; au-delà, on ne lit pas.
    Refusé comme n'importe quel formulaire invalide (400, même message) :
    le formulaire du site sait afficher celui-là, et un robot n'a pas à
    savoir laquelle des bornes il a franchie. */
const MAX_BODY_BYTES = 16 * 1024

export async function POST(request: Request) {
  const crossSite = rejectCrossSite(request)
  if (crossSite) return crossSite

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

  /* Le formulaire envoie du JSON, et rien d'autre n'est attendu : un autre
     type de contenu (formulaire HTML posté depuis ailleurs, texte brut)
     est refusé avant lecture — comme un corps annoncé trop gros. */
  const contentType = request.headers.get('content-type') ?? ''
  if (!/^application\/json\b/i.test(contentType)) {
    return NextResponse.json({ error: 'Formulaire invalide.' }, { status: 400 })
  }
  const announced = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(announced) && announced > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Formulaire invalide.' }, { status: 400 })
  }

  let body: unknown = null
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Formulaire invalide.' }, { status: 400 })
    }
    body = JSON.parse(text)
  } catch {
    body = null
  }

  const parsed = contactSchema.safeParse(body)

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

  /* Panne de base : réponse JSON formée comme les autres, plutôt qu'un 500
     brut que le formulaire ne sait pas lire. Le journal ne porte que
     l'erreur, jamais le message ni ses coordonnées. */
  try {
    await db.insert(contactMessages).values({
      name,
      email,
      phone: phone || null,
      message,
      ipHash,
    })
  } catch (error) {
    console.error('[contact] enregistrement impossible', describeError(error))
    return NextResponse.json(
      { error: 'Envoi impossible pour le moment. Réessayez dans quelques minutes.' },
      { status: 500 },
    )
  }

  /* La notification est accessoire : si Resend échoue, le message est déjà
     en base et consultable dans le CMS. On ne fait pas échouer la requête. */
  await sendNotification({ name, email, phone, message }).catch((error) => {
    console.error('[contact] notification non envoyée', describeError(error))
  })

  return NextResponse.json({ ok: true })
}

/** Une ligne, sans retour chariot ni caractère de contrôle : un nom qui
    finit dans le SUJET d'un e-mail ne doit pas pouvoir y injecter un
    en-tête. */
function singleLine(value: string): string {
  return value.replace(/[\r\n\t\p{Cc}]+/gu, ' ').replace(/\s+/g, ' ').trim()
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
    subject: `${singleLine(settings.siteName)} — message de ${singleLine(payload.name).slice(0, 80)}`,
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
