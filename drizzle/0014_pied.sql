-- Le pied de page : organismes, déontologie, sites de collègues, pages légales.
-- Null = valeurs de départ (lib/pied.ts).
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "pied" jsonb;
