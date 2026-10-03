import { useEffect, useRef, useState, type ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* Infra: largura medida e tooltip                                     */
/* ------------------------------------------------------------------ */

/** Mede a largura do container para desenhar o SVG em pixels reais (texto legível no celular). */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

interface Tip {
  x: number
  y: number
  content: ReactNode
}

export function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const show = (e: React.PointerEvent | React.FocusEvent, content: ReactNode) => {
    const host = (e.currentTarget as Element).closest('.sd-chart') as HTMLElement | null
    if (!host) return
    const box = host.getBoundingClientRect()
    if ('clientX' in e) setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content })
    else {
      const r = (e.currentTarget as Element).getBoundingClientRect()
      setTip({ x: r.left - box.left + r.width / 2, y: r.top - box.top, content })
    }
  }
  const hide = () => setTip(null)
  const node = tip ? (
    <div className="sd-tip" role="status" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  ) : null
  return { show, hide, node }
}
