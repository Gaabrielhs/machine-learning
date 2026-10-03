import { useCallback, useEffect, useState } from 'react'

const CLASS = 'sd-present'

/**
 * Modo apresentação: cada seção ocupa a tela, o cabeçalho do site some e as setas,
 * espaço e PageUp/PageDown navegam entre seções. Esc sai.
 */
export function usePresentation(ids: readonly string[]) {
  const [on, setOn] = useState(false)
  const [index, setIndex] = useState(0)

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(ids.length - 1, i))
      setIndex(next)
      document.getElementById(ids[next])?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [ids],
  )

  // acompanha a seção visível (também fora do modo apresentação, para o contador)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setIndex(ids.indexOf(e.target.id))
        }),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [ids])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle(CLASS, on)
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        go(index + 1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        go(index - 1)
      } else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(ids.length - 1)
      else if (e.key === 'Escape') setOn(false)
    }
    // Esc em tela cheia é consumido pelo navegador: sair da tela cheia também sai do modo
    const onFs = () => {
      if (!document.fullscreenElement) setOn(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
      root.classList.remove(CLASS)
    }
  }, [on, index, go, ids.length])

  const toggle = () => {
    const entering = !on
    setOn(entering)
    if (entering) {
      document.documentElement.requestFullscreen?.().catch(() => {})
      requestAnimationFrame(() => go(index))
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  return { on, index, toggle, next: () => go(index + 1), prev: () => go(index - 1) }
}
