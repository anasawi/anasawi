-- Le lien d'invitation reste consultable tant qu'il est valable.
--
-- N'en garder que l'empreinte obligeait à en refaire un pour le recopier —
-- et l'ancien mourait. L'administration doit pouvoir le copier de nouveau
-- sans rien changer. Le jeton est donc conservé à côté de son empreinte —
-- CHIFFRÉ par l'application (AES-256-GCM, clé dérivée d'AUTH_SECRET, voir
-- `src/server/invitation-token.ts`) : la colonne seule ne permet pas de
-- s'en servir. Il ne vaut que sept jours et une seule fois.
ALTER TABLE "invitations" ADD COLUMN "token" text;
