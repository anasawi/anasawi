'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Confirmation — revenir à la version en ligne. */
export function DiscardDialog({
  open,
  onOpenChange,
  discarding,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  discarding: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!discarding) onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-[1.05rem] font-normal">
            Annuler les modifications non publiées ?
          </DialogTitle>
          <DialogDescription className="text-[0.82rem] leading-relaxed">
            La page reviendra exactement à sa version en ligne. Tout ce qui
            a été modifié depuis la dernière publication sera perdu, et
            l’historique ⌘Z sera vidé.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={discarding}
            onClick={() => onOpenChange(false)}
          >
            Garder mon brouillon
          </Button>
          <Button variant="destructive" disabled={discarding} onClick={onConfirm}>
            {discarding ? 'Retour en cours…' : 'Revenir à la version en ligne'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
