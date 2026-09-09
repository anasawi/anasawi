CREATE TYPE "public"."page_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."section_background" AS ENUM('ivory', 'warm', 'mist', 'ink');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"alt" text NOT NULL,
	"caption" text,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"blur_data_url" text,
	"mime_type" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"is_home" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"type" text NOT NULL,
	"anchor" text,
	"nav_label" text,
	"show_in_nav" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"background" "section_background" DEFAULT 'ivory' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"title" text,
	"description" text,
	"canonical" text,
	"og_media_id" uuid,
	"robots_index" boolean DEFAULT true NOT NULL,
	"robots_follow" boolean DEFAULT true NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"duration" text,
	"media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"site_name" text DEFAULT 'AMASWI' NOT NULL,
	"practitioner_name" text DEFAULT '' NOT NULL,
	"practitioner_title" text,
	"tagline" text,
	"contact_email" text,
	"contact_phone" text,
	"address_street" text,
	"address_postal_code" text,
	"address_city" text,
	"address_country" text DEFAULT 'FR',
	"latitude" text,
	"longitude" text,
	"opening_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"practical_info" text,
	"booking_url" text,
	"social_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_seo_title" text,
	"default_seo_description" text,
	"default_og_media_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_og_media_id_media_id_fk" FOREIGN KEY ("og_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_default_og_media_id_media_id_fk" FOREIGN KEY ("default_og_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_created_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "faq_order_idx" ON "faq_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "media_created_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_single_home_idx" ON "pages" USING btree ("is_home") WHERE "pages"."is_home" = true;--> statement-breakpoint
CREATE INDEX "sections_page_order_idx" ON "sections" USING btree ("page_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_meta_page_idx" ON "seo_meta" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "services_order_idx" ON "services" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");