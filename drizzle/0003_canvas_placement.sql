-- Position libre des blocs dans une section « Canevas ».
--
-- { x, y, w } en pourcentages du canevas, nul pour les blocs en flux.
-- Le placement ne s'applique qu'à l'écran large : sur mobile, les blocs
-- s'empilent dans l'ordre — c'est ce qui garde le responsive garanti.

ALTER TABLE "sections" ADD COLUMN "placement" jsonb;
