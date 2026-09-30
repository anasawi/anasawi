'use client'

import { Check, Copy, Link2, Plus, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
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
  createUser,
  deleteUser,
  renewInvitation,
  type UtilisateurListe,
} from '@/server/actions/users'

/**
 * Écran « Utilisateurs ».
 *
 * On invite une personne : nom, e-mail, et l'écran rend un LIEN à lui
 * transmettre (par le canal qu'on veut : mail, message…). Sur ce lien,
 * elle choisit son mot de passe — personne d'autre ne le connaît. Tant
 * qu'elle ne l'a pas fait, la ligne le dit : « Invitation en attente ».
 *
 * Le lien n'est montré qu'une fois, au moment où il est créé : la base ne
 * garde que son empreinte. « Nouveau lien » en refait un, et périme le
 * précédent.
 */

type Draft = { name: string; email: string }
const VIDE: Draft = { name: '', email: '' }

export function UsersManager({ initial }: { initial: UtilisateurListe[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [erreurs, setErreurs] = useState<Record<string, string[]>>({})
  /* Le lien tout juste créé — pour cette personne, à copier. */
  const [lien, setLien] = useState<{ nom: string; url: string } | null>(null)

  const origine = typeof window === 'undefined' ? '' : window.location.origin

  function creer() {
    if (!draft) return
    setErreurs({})
    start(async () => {
      const result = await createUser(draft)
      if (!result.ok) {
        setErreurs(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }
      toast.success(`${draft.name} a été ajouté·e — transmettez-lui le lien.`)
      setLien({ nom: draft.name, url: `${origine}${result.data.lien}` })
      setDraft(null)
      router.refresh()
    })
  }

  function nouveauLien(u: UtilisateurListe) {
    start(async () => {
      const result = await renewInvitation(u.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setLien({ nom: u.name, url: `${origine}${result.data.lien}` })
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-muted-foreground">
          Chaque personne reçoit un lien pour choisir son mot de passe. Vous ne
          le connaîtrez jamais.
        </p>
        <Button onClick={() => setDraft(VIDE)}>
          <Plus />
          Inviter une personne
        </Button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-lg border border-border bg-white px-6 py-14 text-center">
          <p className="text-[13px] text-muted-foreground">Aucun utilisateur pour l’instant.</p>
          <Button className="mt-4" onClick={() => setDraft(VIDE)}>
            <UserPlus />
            Inviter une personne
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
          {initial.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ivory-warm text-[13px] font-medium text-ink-soft"
              >
                {u.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1 basis-[200px]">
                <p className="truncate text-[13.5px] text-foreground">
                  {u.name}
                  {u.moi && <span className="ml-2 text-[12px] text-muted-foreground">(vous)</span>}
                </p>
                <p className="truncate text-[12.5px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="basis-[180px] text-[12.5px]">
                {u.actif ? (
                  <span className="inline-flex items-center gap-1.5 text-[#256b47]">
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    Actif
                    {u.lastLoginAt && (
                      <span className="text-muted-foreground"> · vu le {formatDate(u.lastLoginAt)}</span>
                    )}
                  </span>
                ) : u.invitationEnCours ? (
                  <span className="text-[#8a5f1e]">Invitation en attente</span>
                ) : (
                  <span className="text-muted-foreground">Lien expiré — à renouveler</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
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
                <ErreurChamp id="u-name-erreur" messages={erreurs.name} />
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
                <ErreurChamp id="u-email-erreur" messages={erreurs.email} />
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
            <Button onClick={() => setLien(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

function ErreurChamp({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages || messages.length === 0) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs leading-[1.5] text-red-700">
      {messages[0]}
    </p>
  )
}
