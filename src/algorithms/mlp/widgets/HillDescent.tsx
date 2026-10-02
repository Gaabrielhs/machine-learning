import { useEffect, useRef, useState } from 'react'
import { drawAxes, fmt, plotFunction } from '../../../components/plot'
import type { WidgetProps } from '../../../core/types'
import { useCanvas } from '../../../hooks/useCanvas'
import { Slider } from './Slider'

interface Props extends WidgetProps {
  /** missão: chegar a |w − 3| < tolerance em até maxSteps passos */
  mission?: { maxSteps: number; tolerance: number }
  startLr?: number
}

const START = -1
const TARGET = 3
const E = (w: number) => (w - TARGET) ** 2
const dE = (w: number) => 2 * (w - TARGET)

/** Gradiente descendente numa parábola: E(w) = (w − 3)². */
export default function HillDescent({ mission, startLr = 0.1, onComplete }: Props) {
  const [lr, setLr] = useState(startLr)
  const [path, setPath] = useState<number[]>([START])
  const w = path[path.length - 1]
  const steps = path.length - 1
  const reached = Math.abs(w - TARGET) < (mission?.tolerance ?? 0.05)
  const won = !!mission && reached && steps <= mission.maxSteps
  const failed = !!mission && !won && steps >= mission.maxSteps
  const diverged = Math.abs(w) > 60
  const fired = useRef(false)
  useEffect(() => {
    if (won && !fired.current) {
      fired.current = true
      onComplete?.()
    }
  }, [won, onComplete])

  const ref = useCanvas(
    (ctx, cw, h, p) => {
      const xr: [number, number] = [-3, 9]
      const f = drawAxes(ctx, cw, h, p, { xr, yr: [-2, 38], xLabel: 'peso w', yLabel: 'erro E(w)' })
      plotFunction(ctx, f, E, xr, p.accent)
      ctx.strokeStyle = p.neg
      ctx.fillStyle = p.neg
      ctx.lineWidth = 1.5
      path.forEach((v, i) => {
        if (Math.abs(v) > 60) return
        if (i > 0 && Math.abs(path[i - 1]) <= 60) {
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(f.x(path[i - 1]), f.y(E(path[i - 1])))
          ctx.lineTo(f.x(v), f.y(E(v)))
          ctx.stroke()
          ctx.setLineDash([])
        }
        ctx.beginPath()
        ctx.arc(f.x(v), f.y(E(v)), i === path.length - 1 ? 7 : 3, 0, 2 * Math.PI)
        ctx.fill()
      })
      // reta tangente no ponto atual: mostra a inclinação
      if (Math.abs(w) <= 60) {
        const s = dE(w)
        ctx.strokeStyle = p.ink
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.moveTo(f.x(w - 1.2), f.y(E(w) - 1.2 * s))
        ctx.lineTo(f.x(w + 1.2), f.y(E(w) + 1.2 * s))
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    },
    [path],
    250,
  )

  const step = () => setPath((ps) => [...ps, ps[ps.length - 1] - lr * dE(ps[ps.length - 1])])
  const reset = () => setPath([START])

  return (
    <div className="w">
      <div className="w-controls">
        <Slider
          label="taxa η"
          value={lr}
          min={0.02}
          max={1.1}
          step={0.01}
          onChange={(v) => {
            setLr(v)
            reset()
          }}
          format={(v) => v.toFixed(2).replace('.', ',')}
        />
        <button type="button" className="btn" onClick={step} disabled={failed || won || diverged}>
          Dar um passo
        </button>
        <button type="button" className="btn btn-quiet" onClick={reset}>
          Recomeçar
        </button>
      </div>
      <canvas ref={ref} aria-label="Parábola do erro com a trajetória dos passos" />
      <p className="w-readout">
        passo {steps}
        {mission ? ` de ${mission.maxSteps}` : ''} · w = {fmt(w, 3)} · E(w) = {fmt(E(w), 3)} · inclinação E′(w) ={' '}
        {fmt(dE(w), 3)} · próximo passo = −η·E′ = {fmt(-lr * dE(w), 3)}
      </p>
      {mission && (
        <p className={`w-status ${won ? 'ok' : failed || diverged ? 'no' : ''}`} role="status">
          {won
            ? 'Chegou ao fundo do vale.'
            : diverged
              ? 'Divergiu: os passos estão grandes demais. Diminua η e recomece.'
              : failed
                ? 'Acabaram os passos. Ajuste η e recomece.'
                : `Objetivo: |w − 3| < ${String(mission.tolerance).replace('.', ',')} em até ${mission.maxSteps} passos.`}
        </p>
      )}
    </div>
  )
}
