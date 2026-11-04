'use client'

import { Type } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { TYPOS, typoDe, variablesDe } from './typos'
import { ADMIN_HINT_COOKIE } from '@/components/site/AdminBar'

/**
 * Le sélecteur de typographie du site moderne, pour essayer les paires
 * de `typos.ts` en vrai, page entière. Le choix est gardé dans le
 * navigateur (localStorage) ; `/moderne?typo=lora` l'impose.
 *
 * Visible en développement, pour l'administratrice connectée, ou dès
 * qu'une typo a été choisie par
 * l'adresse (lien « Essayer sur le site » de /moderne/typos) — jamais
 * pour un visiteur qui n'a rien demandé.
 */

const CLE = 'ad-typo'

function lire(): string | null {
  try {
    return localStorage.getItem(CLE)
  } catch {
    return null
  }
}

function ecrire(id: string | null) {
  try {
    if (id) localStorage.setItem(CLE, id)
    else localStorage.removeItem(CLE)
  } catch {
    /* navigation privée : le choix ne survit pas au rechargement */
  }
}

function appliquer(id: string | null) {
  const t = typoDe(id)
  document.getElementById('ad-typo-feuille')?.remove()
  const cibles = document.querySelectorAll<HTMLElement>('.ad')
  const vars = t ? variablesDe(t) : variablesDe(TYPOS[0]!)
  for (const el of cibles) {
    for (const [k, v] of Object.entries(vars)) {
      if (t) el.style.setProperty(k, v)
      else el.style.removeProperty(k)
    }
  }
  if (!t) return
  const lien = document.createElement('link')
  lien.id = 'ad-typo-feuille'
  lien.rel = 'stylesheet'
  lien.href = t.url
  document.head.appendChild(lien)
}

export function EssaiTypo() {
  const [visible, setVisible] = useState(false)
  const [choix, setChoix] = useState<string>('fraunces')
  const [ouvert, setOuvert] = useState(false)

  useEffect(() => {
    const parametre = new URLSearchParams(window.location.search).get('typo')
    if (parametre && typoDe(parametre)) ecrire(parametre)
    const id = lire()
    /* Visible pour l'administratrice connectée (cookie-témoin posé à la
       connexion) : c'est Anne qui choisit. */
    const connectee = document.cookie.split(';').some((c) => c.trim() === `${ADMIN_HINT_COOKIE}=1`)
    setVisible(process.env.NODE_ENV === 'development' || Boolean(id) || connectee)
    if (id && typoDe(id)) {
      setChoix(id)
      appliquer(id)
    }
  }, [])

  if (!visible) return null
  const actuelle = typoDe(choix) ?? TYPOS[0]!

  const choisir = (id: string) => {
    setChoix(id)
    ecrire(id)
    appliquer(id)
  }

  return (
    <div className="fixed bottom-24 right-4 z-[70] flex flex-col sm:bottom-5 sm:right-5 items-end font-[system-ui] text-[13px]">
      {ouvert && (
        <div className="mb-2 w-[300px] overflow-hidden rounded-[20px] border border-black/10 bg-white/95 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <span className="font-semibold text-[#2e424f]">Typographie</span>
            <Link href="/moderne/typos" className="text-[12px] text-[#46728a] underline-offset-2 hover:underline">
              Voir les spécimens
            </Link>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto p-1.5">
            {TYPOS.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => choisir(t.id)}
                  className={`w-full rounded-[12px] px-3 py-2 text-left transition-colors ${choix === t.id ? 'bg-[#eaf1f4]' : 'hover:bg-black/[0.04]'}`}
                >
                  <span className="block text-[19px] leading-tight text-[#2e424f]" style={{ fontFamily: `'${t.titre}', serif`, fontWeight: t.poids }}>
                    {t.titre}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-[#77746c]">
                    {String(i + 1).padStart(2, '0')} · {t.nom}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              ecrire(null)
              appliquer(null)
              setChoix('fraunces')
            }}
            className="w-full border-t border-black/5 px-4 py-2.5 text-left text-[12px] text-[#77746c] hover:text-[#2e424f]"
          >
            Revenir à la typographie du site
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="inline-flex items-center gap-2 rounded-full bg-[#2e424f] py-2 pl-3 pr-4 font-medium text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)]"
      >
        <Type className="h-4 w-4" />
        {actuelle.titre}
      </button>
    </div>
  )
}
