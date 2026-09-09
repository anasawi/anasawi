'use client'

import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/server/actions/types'

/**
 * Confirmation avant suppression, systématique dans le CMS.
 * Le libellé rappelle ce qui va disparaître — une boîte « Êtes-vous sûr ? »
 * sans objet nommé ne protège de rien.
 */
export function ConfirmDelete({
  label,
  description,
  onConfirm,
  trigger,
}: {
  label: string
  description?: string
  onConfirm: () => Promise<ActionResult<unknown>>
  trigger?: React.ReactNode
}) {
  const [pending, start] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label={`Supprimer ${label}`}>
            <Trash2 className="text-destructive" />
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {label} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              'Cette action est définitive. Le contenu ne pourra pas être récupéré.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault()
              start(async () => {
                const result = await onConfirm()
                if (result.ok) toast.success('Supprimé.')
                else toast.error(result.error)
              })
            }}
          >
            {pending ? 'Suppression…' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
