import './load-env'

import { hash } from 'bcryptjs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

import { db } from './index'
import { users } from './schema'

/**
 * Crée ou met à jour un compte administrateur.
 *
 *   npm run admin:create
 *
 * Le mot de passe est saisi de façon interactive et masquée : il n'apparaît
 * ni à l'écran, ni dans l'historique du shell, ni dans un fichier du dépôt.
 */

/* Codes de contrôle nommés — plus lisibles que des caractères invisibles
   écrits littéralement dans le source. */
const ENTER = new Set(['\r', '\n'])
const CTRL_C = String.fromCharCode(3)
const BACKSPACE = new Set([String.fromCharCode(127), String.fromCharCode(8)])

/**
 * Lecture masquée.
 *
 * `readline.question` renvoie l'écho de la frappe ; on passe donc stdin en
 * mode brut pour intercepter chaque touche et n'afficher qu'une puce.
 */
function askSecret(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(prompt)

    const wasRaw = stdin.isRaw ?? false
    stdin.setRawMode?.(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let value = ''

    const finish = (result: string | null) => {
      stdin.setRawMode?.(wasRaw)
      stdin.pause()
      stdin.removeListener('data', onData)
      stdout.write('\n')
      if (result === null) process.exit(130)
      resolve(result)
    }

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (ENTER.has(char)) return finish(value)
        if (char === CTRL_C) return finish(null)

        if (BACKSPACE.has(char)) {
          if (value.length > 0) {
            value = value.slice(0, -1)
            stdout.write('\b \b')
          }
          continue
        }

        value += char
        stdout.write('*')
      }
    }

    stdin.on('data', onData)
  })
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout })
  const name = (await rl.question('Nom : ')).trim()
  const email = (await rl.question('E-mail : ')).trim().toLowerCase()
  rl.close()

  if (!name || !email.includes('@')) {
    console.error('\n  x Nom ou adresse e-mail invalide.\n')
    process.exit(1)
  }

  const password = await askSecret('Mot de passe (12 caracteres minimum) : ')

  if (password.length < 12) {
    console.error('\n  x Mot de passe trop court.\n')
    process.exit(1)
  }

  const confirmation = await askSecret('Confirmer le mot de passe : ')

  if (password !== confirmation) {
    console.error('\n  x Les deux saisies different.\n')
    process.exit(1)
  }

  const passwordHash = await hash(password, 12)

  await db
    .insert(users)
    .values({ name, email, passwordHash, role: 'owner' })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, name },
    })

  console.log(`\n  Compte pret pour ${email} - connexion sur /login\n`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
