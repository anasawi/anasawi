'use client'

import { Check, Copy, Link2, Plus, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { PASTELS } from './editor/pastels'
import { PageHeader } from './PageHeader'
import { FieldError } from './form/FieldError'
import { useActionForm } from './hooks/useActionForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import {
  changerRole,
  createUser,
  deleteUser,
  renewInvitation,
} from '@/server/actions/users'
import type { UtilisateurListe } from '@/server/queries/users'

/**
 * Écran « Utilisateurs ».
 *
 * On invite une personne : nom, e-mail, et l'écran rend un LIEN à lui
 * transmettre (par le canal qu'on veut : mail, message…). Sur ce lien,
 * elle choisit son mot de passe — personne d'autre ne le connaît. Tant
 * qu'elle ne l'a pas fait, la ligne le dit : « Invitation en attente ».
 *
 * Le lien est montré à sa création, et reste recopiable depuis la liste
 * tant qu'il vaut : le jeton est stocké CHIFFRÉ (pas seulement haché),
 * la base peut donc le rendre à nouveau. « Nouveau lien » en refait un,
 * et périme le précédent.
 */

type Draft = { name: string; email: string }
const VIDE: Draft = { name: '', email: '' }

/** Ce que chaque rôle permet — dit en clair, à côté du choix. */
const ROLES = [
  { valeur: 'owner', libelle: 'Propriétaire', aide: 'Tout : le site, les comptes et la synchronisation préprod ⇄ production.' },
  { valeur: 'editor', libelle: 'Éditeur', aide: 'Le contenu du site : textes, photos, accompagnements, réglages.' },
] as const

export function UsersManager({ initial, integre = false }: { initial: UtilisateurListe[]; /** Dans un onglet des Réglages : sans grand titre. */ integre?: boolean }) {
  const router = useRouter()
  const { pending, fieldErrors: erreurs, run } = useActionForm()
  const [draft, setDraft] = useState<Draft | null>(null)
  /* Le lien tout juste créé — pour cette personne, à copier. */
  const [lien, setLien] = useState<{ nom: string; url: string } | null>(null)

  const origine = typeof window === 'undefined' ? '' : window.location.origin
  /* Seul un propriétaire change les rôles. */
  const moiProprietaire = initial.some((u) => u.moi && u.role === 'owner')

  function role(u: UtilisateurListe, valeur: 'owner' | 'editor') {
    if (u.role === valeur) return
    run(() => changerRole(u.id, valeur), {
      success: `${u.name} est maintenant ${valeur === 'owner' ? 'propriétaire' : 'éditeur·rice'}.`,
      onSuccess: () => router.refresh(),
    })
  }

  function creer() {
    if (!draft) return
    run(() => createUser(draft), {
      success: `${draft.name} a été ajouté·e — transmettez-lui le lien.`,
      onSuccess: (data) => {
        setLien({ nom: draft.name, url: `${origine}${data.lien}` })
        setDraft(null)
        router.refresh()
      },
    })
  }

  function nouveauLien(u: UtilisateurListe) {
    run(() => renewInvitation(u.id), {
      onSuccess: (data) => {
        setLien({ nom: u.name, url: `${origine}${data.lien}` })
        router.refresh()
      },
    })
  }

  return (
    <>
      {integre ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[60ch] text-[13px] leading-[19px] text-muted-foreground">
            {ROLES.map((r) => (
              <span key={r.valeur} className="block">
                <strong className="font-semibold text-foreground">{r.libelle}</strong> — {r.aide}
              </span>
            ))}
          </p>
          <Button size="sm" onClick={() => setDraft(VIDE)}>
            <Plus />
            Inviter une personne
          </Button>
        </div>
      ) : (
        <PageHeader
          overline="Accès à l’administration"
          title="Utilisateurs"
          description={`${initial.length} ${initial.length > 1 ? 'personnes peuvent' : 'personne peut'} se connecter · chacune choisit son mot de passe`}
          action={
            <Button size="sm" onClick={() => setDraft(VIDE)}>
              <Plus />
              Inviter une personne
            </Button>
          }
        />
      )}

      {initial.length === 0 ? (
        <div className="rounded-[24px] bg-block px-6 py-16 text-center">
          <p className="text-[14px] text-muted-foreground">Aucun utilisateur pour l’instant.</p>
          <Button className="mt-4" onClick={() => setDraft(VIDE)}>
            <UserPlus />
            Inviter une personne
          </Button>
        </div>
      ) : (
        <div className="bloc-ecran flex flex-col rounded-[24px] bg-block p-2">
          <div className="flex min-h-0 flex-1 flex-col rounded-[20px] bg-white">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#eef1f2] px-5 py-4 sm:px-6">
              <h2 className="text-[16px] font-semibold text-foreground">
                Les personnes
                <span className="ml-2 text-[13px] font-medium text-[#8aa4a8]">{initial.length}</span>
              </h2>
              <p className="text-[13px] text-[#8aa4a8]">
                Vous ne connaîtrez jamais leur mot de passe
              </p>
            </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin] sm:p-3">
          {initial.map((u, i) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] px-3 py-3 transition-colors duration-[250ms] hover:bg-[#f7f8f8]">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
                style={{ background: PASTELS[(i + 8) % PASTELS.length]!.bg, color: PASTELS[(i + 8) % PASTELS.length]!.fg }}
              >
                {u.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1 basis-[200px]">
                <p className="truncate text-[14px] font-medium text-foreground">
                  {u.name}
                  {u.moi && <span className="ml-2 text-[13px] text-muted-foreground">(vous)</span>}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">{u.email}</p>
              </div>
              {/* Le rôle : modifiable par un propriétaire, affiché sinon. */}
              <div className="shrink-0">
                {moiProprietaire ? (
                  <div role="radiogroup" aria-label={`Rôle de ${u.name}`} className="flex gap-0.5 rounded-[10px] bg-block p-[3px]">
                    {ROLES.map((r) => (
                      <button
                        key={r.valeur}
                        type="button"
                        role="radio"
                        aria-checked={u.role === r.valeur}
                        title={r.aide}
                        disabled={pending}
                        onClick={() => role(u, r.valeur)}
                        className={
                          u.role === r.valeur
                            ? 'h-7 rounded-[8px] bg-white px-2.5 text-[12.5px] font-medium text-foreground shadow-[0_1px_2px_rgba(22,73,81,0.08)]'
                            : 'h-7 rounded-[8px] px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground'
                        }
                      >
                        {r.libelle}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="rounded-full bg-block px-2.5 py-1 text-[12px] font-medium text-muted-foreground" title={ROLES.find((r) => r.valeur === u.role)?.aide}>
                    {ROLES.find((r) => r.valeur === u.role)?.libelle}
                  </span>
                )}
              </div>
              <div className="basis-[180px] text-[13px]">
                {u.actif ? (
                  <span className="inline-flex items-center gap-1.5 text-success-ink">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    Actif
                    {u.lastLoginAt && (
                      <span className="text-muted-foreground"> · vu le {formatDate(u.lastLoginAt)}</span>
                    )}
                  </span>
                ) : u.invitation?.valable ? (
                  <span className="text-warning-ink">
                    Invitation en attente
                    <span className="block text-muted-foreground">
                      Le lien expire {delaiRestant(u.invitation.expiresAt)}
                    </span>
                  </span>
                ) : u.invitation ? (
                  <span className="text-danger">
                    Lien expiré
                    <span className="block text-muted-foreground">
                      le {formatDate(u.invitation.expiresAt)} — faites-en un nouveau
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Aucune invitation — faites un lien</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {u.invitation?.valable && (
                  <BoutonCopier
                    url={`${origine}${u.invitation.lien}`}
                    label={`Copier le lien d’invitation de ${u.name}`}
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => nouveauLien(u)}
                  title={u.actif ? 'Un nouveau lien pour choisir un autre mot de passe' : 'Refaire un lien d’invitation'}
                >
                  <Link2 />
                  Nouveau lien
                </Button>
                {!u.moi && (
                  <ConfirmDelete
                    label={u.name}
                    description="Cette personne ne pourra plus se connecter à l’administration. Le site n’est pas concerné."
                    succes="Utilisateur supprimé."
                    onConfirm={async () => {
                      const r = await deleteUser(u.id)
                      if (r.ok) router.refresh()
                      return r
                    }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
          </div>
        </div>
      )}

      {/* ── Inviter ───────────────────────────────────────────────── */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Inviter une personne</DialogTitle>
            <DialogDescription>
              Vous obtiendrez un lien à lui envoyer : c’est elle qui choisira
              son mot de passe.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                creer()
              }}
            >
              <div>
                <Label htmlFor="u-name" className="mb-2 block">
                  Nom
                </Label>
                <Input
                  id="u-name"
                  value={draft.name}
                  autoComplete="off"
                  autoFocus
                  aria-invalid={erreurs.name ? true : undefined}
                  aria-describedby={erreurs.name ? 'u-name-erreur' : undefined}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <FieldError id="u-name-erreur" messages={erreurs.name} />
              </div>
              <div>
                <Label htmlFor="u-email" className="mb-2 block">
                  Adresse e-mail
                </Label>
                <Input
                  id="u-email"
                  type="email"
                  value={draft.email}
                  autoComplete="off"
                  aria-invalid={erreurs.email ? true : undefined}
                  aria-describedby={erreurs.email ? 'u-email-erreur' : undefined}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
                <FieldError id="u-email-erreur" messages={erreurs.email} />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending || !draft.name.trim() || !draft.email.trim()} aria-busy={pending}>
                  {pending ? 'Création…' : 'Créer le lien d’invitation'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Le lien, à copier ─────────────────────────────────────── */}
      <Dialog open={lien !== null} onOpenChange={(open) => !open && setLien(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Lien d’invitation pour {lien?.nom}</DialogTitle>
            <DialogDescription>
              Envoyez-lui ce lien (mail, message…). Il est valable 7 jours et
              ne sert qu’une fois : sur cette page, {lien?.nom} choisira son
              mot de passe. Vous ne reverrez pas ce lien : vous pourrez en
              créer un nouveau si besoin.
            </DialogDescription>
          </DialogHeader>
          {lien && <LienACopier url={lien.url} />}
          <DialogFooter>
            <Button onClick={() => setLien(null)}>J’ai copié le lien</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** « expire dans 6 jours », « dans 3 heures », « dans quelques minutes ». */
function delaiRestant(date: Date): string {
  const ms = new Date(date).getTime() - Date.now()
  const heures = Math.floor(ms / 3_600_000)
  if (heures >= 48) return `dans ${Math.floor(heures / 24)} jours`
  if (heures >= 24) return 'demain'
  if (heures >= 2) return `dans ${heures} heures`
  if (heures === 1) return 'dans une heure'
  return 'dans quelques minutes'
}

function BoutonCopier({ url, label }: { url: string; label: string }) {
  const [copie, setCopie] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      title="Le même lien, à envoyer de nouveau"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopie(true)
          toast.success('Lien copié.')
          window.setTimeout(() => setCopie(false), 2500)
        } catch {
          toast.error('Impossible de copier automatiquement.')
        }
      }}
    >
      {copie ? <Check /> : <Copy />}
      {copie ? 'Copié' : 'Copier le lien'}
    </Button>
  )
}

function LienACopier({ url }: { url: string }) {
  const [copie, setCopie] = useState(false)
  return (
    <div className="grid gap-2">
      <Label htmlFor="u-lien" className="sr-only">
        Lien d’invitation
      </Label>
      <div className="flex gap-2">
        <Input id="u-lien" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-[12px]" />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              setCopie(true)
              toast.success('Lien copié.')
              window.setTimeout(() => setCopie(false), 2500)
            } catch {
              toast.error('Impossible de copier automatiquement : sélectionnez le lien et copiez-le.')
            }
          }}
        >
          {copie ? <Check /> : <Copy />}
          {copie ? 'Copié' : 'Copier'}
        </Button>
      </div>
    </div>
  )
}
