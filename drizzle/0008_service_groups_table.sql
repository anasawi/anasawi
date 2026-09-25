-- Les familles d'accompagnements deviennent des entités à part entière.
--
-- Jusqu'ici, la famille était un texte recopié sur chaque accompagnement :
-- impossible de la renommer d'un coup, d'en créer une vide pour y glisser des
-- lignes ensuite, ou de la réordonner sans toucher à ses membres. Une table
-- dédiée règle les trois.
--
-- Les familles existantes sont reprises telles quelles, dans leur ordre
-- d'apparition, avant que la colonne texte ne disparaisse : aucun
-- regroupement n'est perdu.
CREATE TABLE "service_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "label" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_group_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "service_groups"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX "services_group_idx" ON "services" ("group_id");--> statement-breakpoint
INSERT INTO "service_groups" ("label", "sort_order")
  SELECT "group_label", MIN("sort_order")
  FROM "services"
  WHERE "group_label" IS NOT NULL AND btrim("group_label") <> ''
  GROUP BY "group_label";--> statement-breakpoint
UPDATE "services" AS s
  SET "group_id" = g."id"
  FROM "service_groups" AS g
  WHERE s."group_label" = g."label";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "group_label";
