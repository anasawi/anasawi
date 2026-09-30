-- Consolidation du schéma : colonne morte, défaut, unicité, index.
--
-- `pages.puck_data` : reliquat de l'éditeur Puck (migration 0005), que plus
-- aucun code ne lit ni n'écrit — le schéma Drizzle ne la déclare même plus.
-- `settings.site_name` : le défaut de la base rejoint celui du code.
-- `users_email_lower_idx` : l'application cherche par `lower(email)` ; sans
-- index d'expression, cette recherche parcourait la table, et rien
-- n'empêchait deux comptes différant par la casse.
-- Les index sur clés étrangères : Postgres n'en crée pas ; une suppression
-- de média (`ON DELETE SET NULL`) parcourait sinon chaque table référente.
ALTER TABLE "pages" DROP COLUMN IF EXISTS "puck_data";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "site_name" SET DEFAULT 'ANASAWI';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" (lower("email"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seo_meta_og_media_idx" ON "seo_meta" ("og_media_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_media_idx" ON "services" ("media_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settings_logo_media_idx" ON "settings" ("logo_media_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settings_default_og_media_idx" ON "settings" ("default_og_media_id");
