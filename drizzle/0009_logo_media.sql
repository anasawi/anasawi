-- Le logo du site, choisi depuis l'administration.
--
-- Il vivait dans le code (`components/site/Logo.tsx`), donc changer de
-- logo demandait un déploiement. Il rejoint les Réglages, à côté de
-- l'image de partage : Anne le remplace elle-même, comme ses photos.
--
-- `set null` à la suppression du média : retirer une image de la
-- bibliothèque ne doit pas casser l'en-tête du site — il retombe sur le
-- logo livré avec l'application.
--
-- Le séparateur `statement-breakpoint` n'est pas décoratif : le pilote
-- HTTP de Neon refuse plusieurs instructions dans une même requête
-- préparée, et Drizzle découpe le fichier dessus.
ALTER TABLE "settings" ADD COLUMN "logo_media_id" uuid;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
