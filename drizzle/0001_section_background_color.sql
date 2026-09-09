-- Remplace le fond de section (enum de 4 valeurs) par une couleur libre.
--
-- Écrite à la main plutôt que générée : `drizzle-kit generate` voit une
-- colonne supprimée et une colonne ajoutée, et pose une question interactive
-- (« renommage ou création ? ») à laquelle une commande chaînée ne peut pas
-- répondre. L'écrire ici permet en outre de reporter les valeurs existantes
-- au lieu de les perdre.

ALTER TABLE "sections"
  ADD COLUMN "background_color" text DEFAULT '#fcfaf7' NOT NULL;
--> statement-breakpoint

-- Report des quatre anciennes valeurs vers leur équivalent hexadécimal.
UPDATE "sections" SET "background_color" = CASE "background"::text
  WHEN 'ivory' THEN '#fcfaf7'
  WHEN 'warm'  THEN '#f6f2ec'
  WHEN 'mist'  THEN '#eaf1f4'
  WHEN 'ink'   THEN '#1c201e'
  ELSE '#fcfaf7'
END;
--> statement-breakpoint

ALTER TABLE "sections" DROP COLUMN "background";
--> statement-breakpoint

DROP TYPE "public"."section_background";
