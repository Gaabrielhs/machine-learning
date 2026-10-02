import { useState } from 'react'
import { drawAxes, fmt, plotFunction } from '../../../components/plot'
import { Segmented } from '../../../components/Segmented'
import type { WidgetProps } from '../../../core/types'
import { useCanvas } from '../../../hooks/useCanvas'
import { Slider } from './Slider'

interface Props extends WidgetProps {
  showBce?: boolean
}

const mse = (y: number, p: number) => 0.5 * (p - y) ** 2
const bce = (y: number, p: number) => -(y * Math.log(Math.max(p, 1e-9)) + (1 - y) * Math.log(Math.max(1 - p, 1e-9)))

/** Compara erro quadrático e entropia cruzada para uma saída sigmoide. */
export default function LossExplorer({ showBce = true }: Props) {
  const [y, setY] = useState(1)
  const [p, setP] = useState(0.2)
  const ref = useCanvas(
    (ctx, w, h, pal) => {
      const f = drawAxes(ctx, w, h, pal, { xr: [0, 1], yr: [0, showBce ? 4 : 0.6], xLabel: 'saída ŷ', yLabel: 'erro' })
      plotFunction(ctx, f, (q) => mse(y, q), [0, 1], pal.accent)
      if (showBce) plotFunction(ctx, f, (q) => bce(y, q), [0.001, 1], pal.neg, { dash: [6, 4] })
      ctx.fillStyle = pal.ink
      ctx.beginPath()
      ctx.arc(f.x(p), f.y(mse(y, p)), 5, 0, 2 * Math.PI)
      ctx.fill()
      if (showBce && bce(y, p) <= 4) {
        ctx.beginPath()
        ctx.arc(f.x(p), f.y(bce(y, p)), 5, 0, 2 * Math.PI)
        ctx.fill()
      }
    },
    [y, p, showBce],
    230,
  )
  // derivadas em relação a z (antes da sigmoide)
  const gMse = (p - y) * p * (1 - p)
  const gBce = p - y
  return (
    <div className="w">
      <div className="w-controls">
        <Segmented
          label="Resposta certa"
          value={y}
          onChange={setY}
          options={[0, 1].map((v) => ({ value: v, label: `gabarito y = ${v}` }))}
        />
        <Slider label="saída da rede ŷ" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} />
        <span className="legend">
          <i className="sw sw-accent" /> erro quadrático
          {showBce && (
            <>
              <i className="sw sw-neg dashed" /> entropia cruzada
            </>
          )}
        </span>
      </div>
      <canvas ref={ref} aria-label="Curvas de erro em função da saída" />
      <p className="w-readout">
        erro quadrático ½(ŷ−y)² = {fmt(mse(y, p), 4)} · gradiente que chega em z: {fmt(gMse, 4)}
        {showBce && (
          <>
            {' '}
            · entropia cruzada = {fmt(bce(y, p), 4)} · gradiente em z: {fmt(gBce, 4)}
          </>
        )}
      </p>
    </div>
  )
}
