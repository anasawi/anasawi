'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { RunAction } from './useActionQueue'
import { hasUnpublishedChanges, projectSection } from '@/lib/publish'
import { discardDraft, publishPage } from '@/server/actions/publish'
import type { Section } from '@/server/db/schema'

/** Les seuls états que la barre du haut sait dire. */
export type PublishState = 'live' | 'pending' | 'never'

/**
 * Publication et retour à la version en ligne.
 *
 * La version en ligne est gardée localement pour passer au vert dès la
 * publication, et resynchronisée au rechargement. Seuls Publier et
 * Annuler les modifications rechargent la page depuis le serveur.
 */
export function usePublish({
  pageId,
  publishedSnapshot,
  publishedAt,
  sections,
  sectionsRef,
  commitSections,
  enqueue,
  flushDraftRef,
  clearHistory,
  setSelectedId,
}: {
  pageId: string
  /** Instantané servi au public — sert à l'indicateur d'état. */
  publishedSnapshot: unknown
  publishedAt: Date | null
  sections: Section[]
  sectionsRef: MutableRefObject<Section[]>
  commitSections: (update: (prev: Section[]) => Section[]) => void
  enqueue: RunAction
  /** Écriture forcée du reliquat de frappe de l'inspecteur. */
  flushDraftRef: MutableRefObject<(() => Promise<void>) | null>
  clearHistory: () => void
  setSelectedId: Dispatch<SetStateAction<string | null>>
}) {
  const router = useRouter()

  /* Version en ligne — locale pour passer au vert dès la publication,
     resynchronisée au rechargement. */
  const [snapshot, setSnapshot] = useState<unknown>(publishedSnapshot)
  const [publishedOn, setPublishedOn] = useState<Date | null>(publishedAt)
  useEffect(() => {
    setSnapshot(publishedSnapshot)
    setPublishedOn(publishedAt)
  }, [publishedSnapshot, publishedAt])

  /** Boîte « Annuler les modifications non publiées ». */
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [publishing, setPublishing] = useState(false)

  /* Mémoïsé : la comparaison projette, trie et sérialise les deux états
     complets de la page — inutile de la refaire à chaque frappe si ni les
     sections ni l'instantané n'ont changé. */
  const dirty = useMemo(
    () => hasUnpublishedChanges(sections, snapshot),
    [sections, snapshot],
  )
  const publishState: PublishState = !publishedOn
    ? 'never'
    : dirty
      ? 'pending'
      : 'live'
  const canPublish = publishState !== 'live'

  const publish = useCallback(async () => {
    setPublishing(true)
    try {
      /* Le reliquat de frappe de l'inspecteur part d'abord : ce que
         l'admin voit est ce qui sera publié. */
      await flushDraftRef.current?.()
      const result = await enqueue(() => publishPage(pageId))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      /* Vert tout de suite ; le rechargement confirme depuis la base. */
      setSnapshot(sectionsRef.current.map(projectSection))
      setPublishedOn(new Date())
      toast.success('En ligne ✓')
      router.refresh()
    } finally {
      setPublishing(false)
    }
  }, [enqueue, flushDraftRef, pageId, router, sectionsRef])

  /* ── Annuler les modifications non publiées ──────────────────────── */

  const discard = useCallback(async () => {
    setDiscarding(true)
    try {
      /* Le brouillon en attente est écrit puis remplacé — ainsi la
         fermeture de l'inspecteur n'envoie rien vers une ligne disparue. */
      await flushDraftRef.current?.()
      flushSync(() => setSelectedId(null))

      const result = await enqueue(() => discardDraft(pageId))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      commitSections(() => result.data.sections)
      clearHistory()
      setConfirmDiscard(false)
      toast.success('Retour à la version en ligne.')
      router.refresh()
    } finally {
      setDiscarding(false)
    }
  }, [clearHistory, commitSections, enqueue, flushDraftRef, pageId, router, setSelectedId])

  return {
    publishState,
    canPublish,
    publishing,
    publish,
    confirmDiscard,
    setConfirmDiscard,
    discarding,
    discard,
  }
}
