import { Suspense } from 'react'
import { useModule } from '../core/moduleContext'
import type { Level } from '../core/types'
import { ErrorBoundary } from './ErrorBoundary'

interface Props {
  name: string
  props?: Record<string, unknown>
  level?: Level
  onComplete?: () => void
  caption?: string
}

export function WidgetSlot({ name, props, level, onComplete, caption }: Props) {
  const mod = useModule()
  const Widget = mod.widgets[name]
  if (!Widget) return <div className="panel error-panel">Widget “{name}” não encontrado.</div>
  return (
    <figure className="widget">
      <ErrorBoundary>
        <Suspense fallback={<div className="widget-loading">Carregando…</div>}>
          <Widget {...props} level={level} onComplete={onComplete} />
        </Suspense>
      </ErrorBoundary>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
