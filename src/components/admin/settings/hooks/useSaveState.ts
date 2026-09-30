'use client'

import { useEffect, useState, useTransition } from 'react'

/**
 * L'état d'un enregistrement : en cours, réussi (quelques secondes),
 * ou en erreur (jusqu'au prochain essai). Le message d'erreur est celui
 * du serveur, tel quel.
 */
export function useSaveState() {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(t)
  }, [saved])

  /** `fn` renvoie le message d'erreur, ou null si tout s'est bien passé. */
  const lancer = (fn: () => Promise<string | null>) => {
    start(async () => {
      setError(null)
      setSaved(false)
      const erreur = await fn()
      if (erreur) setError(erreur)
      else setSaved(true)
    })
  }

  return { pending, saved, error, lancer }
}

