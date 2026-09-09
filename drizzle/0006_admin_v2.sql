-- Admin V2 : publication en deux temps, réglages de section, modèles
-- personnels, navigation et identité globales.
ALTER TABLE "pages" ADD COLUMN "published_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "settings" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "navigation" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "identity" jsonb;--> statement-breakpoint
CREATE TABLE "saved_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "type" text NOT NULL,
  "background_color" text NOT NULL DEFAULT '#fcfaf7',
  "payload" jsonb NOT NULL,
  "settings" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
