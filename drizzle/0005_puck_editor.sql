-- Adoption de l'éditeur Puck (@puckeditor/core).
--
-- Le document Puck vit à côté des sections historiques : quand `puck_data`
-- est renseigné, le rendu public l'utilise ; sinon il retombe sur les
-- sections. Bascule réversible, aucune donnée détruite.

ALTER TABLE "pages" ADD COLUMN "puck_data" jsonb;
