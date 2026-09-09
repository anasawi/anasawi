-- Colonnes : une section peut désormais contenir des blocs enfants.
--
-- Un seul niveau d'imbrication est autorisé (contrainte appliquée côté
-- application, dans `createSection` et `moveSection`) : une section porte des
-- colonnes, mais un bloc placé dans une colonne ne peut pas en porter à son
-- tour. C'est ce plafond qui garde le repliement mobile calculable.

ALTER TABLE "sections" ADD COLUMN "parent_id" uuid;
--> statement-breakpoint

ALTER TABLE "sections" ADD COLUMN "column_index" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Pas de colonne « column_count » : le nombre de colonnes vit dans le payload
-- du bloc `columns`, avec ses autres réglages. Le dupliquer en colonne SQL
-- créerait deux sources de vérité à garder synchronisées.

-- Auto-référence : supprimer une section emporte ses blocs enfants.
ALTER TABLE "sections"
  ADD CONSTRAINT "sections_parent_fk"
  FOREIGN KEY ("parent_id") REFERENCES "sections"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE INDEX "sections_parent_idx"
  ON "sections" ("parent_id", "column_index", "sort_order");
