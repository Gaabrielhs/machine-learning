import { useEffect, useState } from 'react'
import { THEME_EVENT } from '../hooks/useCanvas'

type Mode = 'system' | 'light' | 'dark'
const KEY = 'trilha-ml:theme'
const LABEL: Record<Mode, string> = { system: 'Tema do sistema', light: 'Tema claro', dark: 'Tema escuro' }
const NEXT: Record<Mode, Mode> = { system: 'light', light: 'dark', dark: 'system' }

function read(): Mode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(read)
  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', mode)
    try {
      if (mode === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, mode)
    } catch {
      /* ignora */
    }
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [mode])
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setMode(NEXT[mode])}
      aria-label={`${LABEL[mode]}. Clique para trocar.`}
      title={LABEL[mode]}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        {mode === 'dark' ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
        ) : mode === 'light' ? (
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" fill="currentColor" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
          </g>
        ) : (
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
          </g>
        )}
      </svg>
    </button>
  )
}
