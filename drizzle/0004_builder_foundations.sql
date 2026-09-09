-- Fondations du page builder (phase 1).
--
-- `styles` : apparence par élément, schéma commun à tous les types, avec
--   surcharges par breakpoint — { base, tablet?, mobile? }.
-- `name`  : nom affiché dans le panneau Calques, renommable.
--
-- Le placement libre { x, y, w } gagne un `h` optionnel — porté par le
-- JSONB existant, aucune colonne à ajouter pour lui.

ALTER TABLE "sections" ADD COLUMN "styles" jsonb;
--> statement-breakpoint

ALTER TABLE "sections" ADD COLUMN "name" text;
