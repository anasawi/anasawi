'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDate, toE164, truncate } from '@/lib/utils'
import { deleteMessage, markMessageRead } from '@/server/actions/content'
import type { ContactMessage } from '@/server/db/schema'

export function MessagesList({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter()
  const [items, setItems] = useState(messages)
  const [openId, setOpenId] = useState<string | null>(null)
  const [, start] = useTransition()

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white px-6 py-14 text-center">
        <p className="text-[13px] text-muted-foreground">
          Aucun message pour l’instant — ils arriveront ici quand un visiteur
          vous écrira.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
      {items.map((message) => {
        const open = openId === message.id

        return (
          <li
            key={message.id}
            className={cn(!message.isRead && 'bg-blue-mist/30')}
          >
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
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-ivory/50"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {message.name}
                  </span>
                  {!message.isRead && <Badge>Nouveau</Badge>}
                </span>
                <span className="mt-1 block truncate text-[12.5px] text-muted-foreground">
                  {truncate(message.message, 110)}
                </span>
              </span>

              <time
                dateTime={message.createdAt.toISOString()}
                className="shrink-0 text-[11.5px] text-muted-foreground"
              >
                {formatDate(message.createdAt)}
              </time>
            </button>

            {open && (
              <div className="border-t border-border bg-ivory/40 px-5 py-4">
                <p className="text-[12px] text-muted-foreground">
                  {message.email}
                </p>
                <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed">
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
