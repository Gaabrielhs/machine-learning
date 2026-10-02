import { useState } from 'react'
import { NetDiagram } from '../../../components/NetDiagram'
import { drawAxes, fmt } from '../../../components/plot'
import { useAnimationLoop } from '../../../hooks/useAnimationLoop'
import { useCanvas } from '../../../hooks/useCanvas'
import { XOR_TABLE } from '../engine/datasets'
import { XOR_EXAMPLE_LR, xorExampleNetwork } from '../engine/examples'
import { createNetwork, datasetLoss, predict } from '../engine/network'
import { TrainingSession } from '../engine/session'
import { downsample, drawBoundary, drawLossCurve, drawPoints } from './shared'
import { Slider } from './Slider'
import { useSession } from './useSession'

const MAX_EPOCHS = 20000
const CONVERGED = 1e-3

/** Treina a rede 2-2-1 no XOR ao vivo. */
export default function XorTrainer() {
  const [session] = useState(() => new TrainingSession(xorExampleNetwork(), XOR_TABLE, { loss: 'mse', batchSize: 1 }))
  const version = useSession(session)
  const [running, setRunning] = useState(false)
  const [lr, setLr] = useState(XOR_EXAMPLE_LR)
  const [speed, setSpeed] = useState(4)
  const [seedLabel, setSeedLabel] = useState('pesos do exemplo')

  useAnimationLoop(running, () => {
    session.step(speed, lr)
    // para sozinho quando aprendeu (ou desistiu), para não gastar CPU à toa
    if (session.epoch >= MAX_EPOCHS || (session.trainLoss.at(-1) ?? 1) < CONVERGED) setRunning(false)
  })

  const reset = (random: boolean) => {
    setRunning(false)
    const seed = Math.floor(Math.random() * 1e6)
    session.reset(random ? createNetwork([2, 2, 1], { hidden: 'sigmoid', init: 'uniform', seed }) : xorExampleNetwork())
    setSeedLabel(random ? `pesos sorteados (semente ${seed})` : 'pesos do exemplo')
  }

  const { net } = session
  const outs = XOR_TABLE.X.map((x) => predict(net, x)[0])
  const loss = session.trainLoss.at(-1) ?? datasetLoss(net, XOR_TABLE, 'mse')

  const boundaryRef = useCanvas(
    (ctx, w, h, p) => {
      const side = Math.min(w, h)
      const ox = (w - side) / 2
      const f = drawAxes(ctx, w, h, p, {
        xr: [-0.25, 1.25],
        yr: [-0.25, 1.25],
        pad: { l: ox + 28, r: ox + 6, t: 6, b: 24 },
        xTicks: 3,
        yTicks: 3,
      })
      drawBoundary(ctx, f, net, [-0.25, 1.25], p, 40)
      drawPoints(ctx, f, XOR_TABLE, p, { r: 9 })
    },
    [version],
    240,
  )
  const lossRef = useCanvas(
    (ctx, w, h, p) =>
      drawLossCurve(ctx, w, h, p, [{ values: downsample(session.trainLoss), color: p.accent, label: 'erro médio' }]),
    [version],
    170,
  )

  return (
    <div className="w w-trainer">
      <div className="w-controls">
        <button type="button" className="btn" onClick={() => setRunning((r) => !r)}>
          {running ? 'Pausar' : session.epoch ? 'Continuar' : 'Treinar'}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => session.step(1, lr)} disabled={running}>
          +1 época
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => reset(false)}>
          Recomeçar
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => reset(true)}>
          Sortear pesos
        </button>
        <Slider label="taxa η" value={lr} min={0.1} max={5} step={0.1} onChange={setLr} />
        <Slider
          label="velocidade"
          value={speed}
          min={1}
          max={40}
          step={1}
          onChange={setSpeed}
          format={(v) => `${v} ép/quadro`}
        />
      </div>
      <div className="w-grid">
        <canvas ref={boundaryRef} aria-label="Fronteira de decisão da rede sobre os 4 pontos do XOR" />
        <div className="w-side">
          <p className="w-stat">
            <span>época</span>
            <strong>{session.epoch}</strong>
          </p>
          <p className="w-stat">
            <span>erro médio</span>
            <strong>{fmt(loss, 4)}</strong>
          </p>
          <div className="table-scroll">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>x₁</th>
                  <th>x₂</th>
                  <th>alvo</th>
                  <th>rede</th>
                </tr>
              </thead>
              <tbody>
                {XOR_TABLE.X.map((x, i) => {
                  const ok = (outs[i] >= 0.5 ? 1 : 0) === XOR_TABLE.Y[i][0]
                  return (
                    <tr key={i} className={ok ? 'hit' : 'miss'}>
                      <td>{x[0]}</td>
                      <td>{x[1]}</td>
                      <td>{XOR_TABLE.Y[i][0]}</td>
                      <td>{fmt(outs[i])}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="w-note">{seedLabel}</p>
        </div>
      </div>
      <canvas ref={lossRef} aria-label="Curva do erro ao longo das épocas" />
      <NetDiagram
        sizes={[2, 2, 1]}
        weights={net.layers.map((l) => l.W)}
        labels={{ inputs: ['x₁', 'x₂'], outputs: ['ŷ'] }}
        height={170}
      />
      <p className="w-note">Azul = peso positivo, laranja = negativo. Espessura = tamanho do peso.</p>
    </div>
  )
}
