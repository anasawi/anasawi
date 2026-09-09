import { config } from 'dotenv'

/**
 * Charge les variables d'environnement pour les scripts CLI.
 *
 * Next.js lit `.env.local` tout seul ; dotenv, non — il ne lit que `.env`.
 * Les scripts lancés hors du serveur Next (drizzle-kit, seed, doctor,
 * création d'admin) doivent donc le lui demander explicitement, sans quoi ils
 * ne voient pas `DATABASE_URL` alors que l'application, elle, la voit.
 *
 * Ordre : `.env.local` d'abord (valeurs de la machine, non versionnées), puis
 * `.env` en repli. `override: false` garantit que le premier fichier chargé
 * gagne, et qu'une variable déjà définie dans le shell l'emporte sur les deux.
 *
 * À importer EN PREMIER dans tout script CLI : les modules ESM sont évalués
 * dans l'ordre des imports, et `./index` lit `process.env` dès son chargement.
 */
for (const path of ['.env.local', '.env']) {
  config({ path, override: false, quiet: true })
}
