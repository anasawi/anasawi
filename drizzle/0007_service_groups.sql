-- Accompagnements : regroupement par intention et mention de méthode.
-- `group_label` porte l'intitulé de la famille (« Traverser quelque chose »)
-- saisi sur chaque accompagnement ; les familles se forment dans l'ordre de
-- tri, sans table séparée. `method` est la mention discrète affichée en
-- regard du titre (« Gestalt-thérapie », « Séance individuelle »).
ALTER TABLE "services" ADD COLUMN "group_label" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "method" text;
