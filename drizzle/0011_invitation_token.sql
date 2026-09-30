-- Le lien d'invitation reste consultable tant qu'il est valable.
--
-- N'en garder que l'empreinte obligeait à en refaire un pour le recopier —
-- et l'ancien mourait. L'administration doit pouvoir le copier de nouveau
-- sans rien changer. Le jeton est donc conservé en clair, à côté de son
-- empreinte : il ne vaut que sept jours et une seule fois.
ALTER TABLE "invitations" ADD COLUMN "token" text;
