import { useEffect, useLayoutEffect, useRef, type DependencyList } from 'react'

export interface Palette {
  bg: string
  surface: string
  ink: string
  muted: string
  line: string
  accent: string
  pos: string
  neg: string
  ok: string
  bad: string
}

/** Lê as cores do tema atual a partir dos tokens CSS. */
export function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim() || '#888'
  return {
    bg: v('--bg'),
    surface: v('--surface'),
    ink: v('--ink'),
    muted: v('--muted'),
    line: v('--line'),
    accent: v('--accent'),
    pos: v('--pos'),
    neg: v('--neg'),
    ok: v('--ok'),
    bad: v('--bad'),
  }
}

export const THEME_EVENT = 'trilha:themechange'

export type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number, p: Palette) => void

/**
 * Canvas nítido em telas de alta densidade que se redesenha ao mudar de
 * tamanho, de tema ou quando `deps` mudam.
 */
export function useCanvas(draw: DrawFn, deps: DependencyList, height: number) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  useLayoutEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const paint = () => {
      const ctx = cv.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const w = cv.clientWidth || cv.parentElement?.clientWidth || 300
      cv.style.height = `${height}px`
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, height)
      drawRef.current(ctx, w, height, readPalette())
    }
    paint()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(paint) : null
    ro?.observe(cv)
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    mq?.addEventListener?.('change', paint)
    window.addEventListener(THEME_EVENT, paint)
    return () => {
      ro?.disconnect()
      mq?.removeEventListener?.('change', paint)
      window.removeEventListener(THEME_EVENT, paint)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, ...deps])

  return ref
}
