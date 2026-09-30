-- Des utilisateurs invités, qui choisissent eux-mêmes leur mot de passe.
--
-- Jusqu'ici, un compte se créait à la main (`admin:create`), mot de passe
-- compris. Désormais l'administration crée la personne, et lui remet un
-- LIEN : c'est elle qui choisit son mot de passe, que personne d'autre ne
-- connaît. Tant qu'elle ne l'a pas fait, `password_hash` est nul et la
-- connexion lui est refusée.
--
-- Une invitation est retrouvée par l'empreinte SHA-256 du jeton. Elle
-- expire, ne sert qu'une fois, et disparaît avec le compte. (La migration
-- 0011 ajoute ensuite le jeton lui-même, conservé chiffré, pour que le
-- lien reste recopiable tant qu'il vaut.)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
CREATE TABLE "invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "invitations_user_idx" ON "invitations" ("user_id");
