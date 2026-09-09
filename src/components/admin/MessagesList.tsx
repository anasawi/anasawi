'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDate, toE164 } from '@/lib/utils'
import { deleteMessage, markMessageRead } from '@/server/actions/content'
import type { ContactMessage } from '@/server/db/schema'

export function MessagesList({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter()
  const [items, setItems] = useState(messages)
  const [openId, setOpenId] = useState<string | null>(null)
  const [, start] = useTransition()

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
        Aucun message reçu.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {items.map((message) => {
        const open = openId === message.id

        return (
          <li key={message.id} className={cn(!message.isRead && 'bg-accent/40')}>
            <button
              type="button"
              onClick={() => {
                setOpenId(open ? null : message.id)

                if (!message.isRead) {
                  setItems((prev) =>
                    prev.map((m) =>
                      m.id === message.id ? { ...m, isRead: true } : m,
                    ),
                  )
                  start(async () => {
                    await markMessageRead(message.id, true)
                    router.refresh()
                  })
                }
              }}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/35"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {message.name}
                  </span>
                  {!message.isRead && <Badge>Nouveau</Badge>}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {message.email}
                </span>
              </span>

              <time
                dateTime={message.createdAt.toISOString()}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {formatDate(message.createdAt)}
              </time>
            </button>

            {open && (
              <div className="border-t border-border bg-background px-4 py-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.message}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${message.email}`}>Répondre par e-mail</a>
                  </Button>

                  {message.phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${toE164(message.phone)}`}>
                        {message.phone}
                      </a>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      start(async () => {
                        const result = await markMessageRead(message.id, false)
                        if (result.ok) {
                          setItems((prev) =>
                            prev.map((m) =>
                              m.id === message.id ? { ...m, isRead: false } : m,
                            ),
                          )
                          setOpenId(null)
                        } else toast.error(result.error)
                      })
                    }
                  >
                    Marquer comme non lu
                  </Button>

                  <ConfirmDelete
                    label={`le message de ${message.name}`}
                    onConfirm={async () => {
                      const result = await deleteMessage(message.id)
                      if (result.ok) {
                        setItems((prev) =>
                          prev.filter((m) => m.id !== message.id),
                        )
                      }
                      return result
                    }}
                  />
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
