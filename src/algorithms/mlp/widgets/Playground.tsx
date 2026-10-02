import { useEffect, useMemo, useRef, useState } from 'react'
import { NetDiagram } from '../../../components/NetDiagram'
import { drawAxes, fmt } from '../../../components/plot'
import type { WidgetProps } from '../../../core/types'
import { useAnimationLoop } from '../../../hooks/useAnimationLoop'
import { useCanvas } from '../../../hooks/useCanvas'
import type { ActivationName } from '../engine/activations'
import { DATASET_LABELS, makeDataset, splitDataset, type DatasetName } from '../engine/datasets'
import { accuracy, createNetwork, parameterCount } from '../engine/network'
import { TrainingSession } from '../engine/session'
import { downsample, drawBoundary, drawLossCurve, drawPoints } from './shared'
import { Select } from './Slider'
import { useSession } from './useSession'

interface Mission {
  /** acurácia mínima no conjunto de teste (0–1) */
  target: number
  /** limite de neurônios ocultos somando todas as camadas */
  maxNeurons?: number
}

interface Props extends WidgetProps {
  dataset?: DatasetName
  lockDataset?: boolean
  layers?: number[]
  activation?: ActivationName
  lr?: number
  mission?: Mission
}

const LRS = [0.003, 0.01, 0.03, 0.1, 0.3, 1]
const MAX_EPOCHS = 3000
const FRAME_BUDGET_MS = 10

/** Laboratório: escolha dados e arquitetura e veja a rede aprender. */
export default function Playground({
  dataset = 'circle',
  lockDataset,
  layers: initialLayers = [4],
  activation = 'tanh',
  lr: initialLr = 0.1,
  mission,
  onComplete,
}: Props) {
  const [name, setName] = useState<DatasetName>(dataset)
  const [noise, setNoise] = useState(0.05)
  const [hidden, setHidden] = useState<number[]>(initialLayers)
  const [act, setAct] = useState<ActivationName>(activation)
  const [lr, setLr] = useState(initialLr)
  const [running, setRunning] = useState(false)
  const [seed, setSeed] = useState(3)

  const split = useMemo(() => splitDataset(makeDataset(name, 300, noise), 0.3), [name, noise])
  const sizes = useMemo(() => [2, ...hidden, 1], [hidden])
  // cada configuração ganha uma sessão nova: o treino recomeça do zero
  const session = useMemo(
    () =>
      new TrainingSession(createNetwork(sizes, { hidden: act, seed }), split.train, {
        loss: 'bce',
        batchSize: 10,
        seed,
        evalSet: split.test,
      }),
    [sizes, act, seed, split],
  )
  const version = useSession(session)

  useAnimationLoop(running, () => {
    session.stepFor(FRAME_BUDGET_MS, lr, MAX_EPOCHS)
    if (session.epoch >= MAX_EPOCHS) setRunning(false)
  })

  const { net, epoch } = session
  const trainAcc = accuracy(net, split.train)
  const testAcc = accuracy(net, split.test)
  const neurons = hidden.reduce((a, b) => a + b, 0)
  const withinLimit = !mission?.maxNeurons || neurons <= mission.maxNeurons
  const won = !!mission && epoch > 0 && testAcc >= mission.target && withinLimit

  const fired = useRef(false)
  useEffect(() => {
    if (won && !fired.current) {
      fired.current = true
      onComplete?.()
    }
  }, [won, onComplete])
  const isRunning = running && !won

  const boardRef = useCanvas(
    (ctx, w, h, p) => {
      const side = Math.min(w, h)
      const ox = (w - side) / 2
      const f = drawAxes(ctx, w, h, p, {
        xr: [-1.2, 1.2],
        yr: [-1.2, 1.2],
        pad: { l: ox + 30, r: ox + 6, t: 6, b: 24 },
        xTicks: 4,
        yTicks: 4,
      })
      drawBoundary(ctx, f, net, [-1.2, 1.2], p, 50)
      drawPoints(ctx, f, split.train, p)
      drawPoints(ctx, f, split.test, p, { hollow: true })
    },
    [version, session],
    300,
  )
  const lossRef = useCanvas(
    (ctx, w, h, p) =>
      drawLossCurve(ctx, w, h, p, [
        { values: downsample(session.trainLoss), color: p.accent, label: 'treino' },
        { values: downsample(session.evalLoss), color: p.neg, label: 'teste' },
      ]),
    [version, session],
    160,
  )

  const stop = () => setRunning(false)
  const setLayer = (i: number, delta: number) => {
    stop()
    setHidden((hs) => hs.map((n, k) => (k === i ? Math.min(8, Math.max(1, n + delta)) : n)))
  }

  return (
    <div className="w w-playground">
      <div className="w-controls">
        <Select
          label="dados"
          value={name}
          onChange={(v) => (stop(), setName(v))}
          disabled={lockDataset}
          options={(Object.keys(DATASET_LABELS) as DatasetName[]).map((k) => ({ value: k, label: DATASET_LABELS[k] }))}
        />
        <Select
          label="ruído"
          value={String(noise)}
          onChange={(v) => (stop(), setNoise(Number(v)))}
          options={[
            { value: '0', label: 'nenhum' },
            { value: '0.05', label: 'pouco' },
            { value: '0.12', label: 'médio' },
            { value: '0.2', label: 'muito' },
          ]}
        />
        <Select
          label="ativação"
          value={act}
          onChange={(v) => (stop(), setAct(v))}
          options={[
            { value: 'tanh', label: 'Tanh' },
            { value: 'relu', label: 'ReLU' },
            { value: 'sigmoid', label: 'Sigmoide' },
          ]}
        />
        <Select
          label="taxa η"
          value={String(lr)}
          onChange={(v) => setLr(Number(v))}
          options={LRS.map((v) => ({ value: String(v), label: String(v).replace('.', ',') }))}
        />
      </div>
      <fieldset className="w-controls layers-ctl">
        <legend className="ctl-label">camadas ocultas</legend>
        {hidden.map((n, i) => (
          <span key={i} className="layer-pill">
            <button type="button" aria-label={`menos neurônios na camada ${i + 1}`} onClick={() => setLayer(i, -1)}>
              −
            </button>
            <span>
              {n} neurônio{n > 1 ? 's' : ''}
            </span>
            <button type="button" aria-label={`mais neurônios na camada ${i + 1}`} onClick={() => setLayer(i, 1)}>
              +
            </button>
          </span>
        ))}
        {hidden.length < 3 && (
          <button type="button" className="btn btn-quiet" onClick={() => (stop(), setHidden((h) => [...h, 2]))}>
            + camada
          </button>
        )}
        {hidden.length > 1 && (
          <button type="button" className="btn btn-quiet" onClick={() => (stop(), setHidden((h) => h.slice(0, -1)))}>
            − camada
          </button>
        )}
      </fieldset>
      <div className="w-grid">
        <canvas ref={boardRef} aria-label="Pontos de treino e teste sobre a fronteira de decisão" />
        <div className="w-side">
          <div className="w-controls">
            <button type="button" className="btn" onClick={() => setRunning(!isRunning)} disabled={epoch >= MAX_EPOCHS}>
              {isRunning ? 'Pausar' : epoch ? 'Continuar' : 'Treinar'}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => (stop(), setSeed((s) => s + 1))}>
              Novos pesos
            </button>
          </div>
          <p className="w-stat">
            <span>época</span>
            <strong>{epoch}</strong>
          </p>
          <p className="w-stat">
            <span>acerto no treino</span>
            <strong>{fmt(trainAcc * 100, 1)}%</strong>
          </p>
          <p className="w-stat">
            <span>acerto no teste</span>
            <strong>{fmt(testAcc * 100, 1)}%</strong>
          </p>
          <p className="w-stat">
            <span>parâmetros</span>
            <strong>{parameterCount(sizes)}</strong>
          </p>
          {mission && (
            <p className={`w-status ${won ? 'ok' : !withinLimit ? 'no' : ''}`} role="status">
              {won
                ? 'Missão cumprida.'
                : !withinLimit
                  ? `Use no máximo ${mission.maxNeurons} neurônios ocultos (agora: ${neurons}).`
                  : `Meta: ${Math.round(mission.target * 100)}% de acerto no teste${mission.maxNeurons ? ` com até ${mission.maxNeurons} neurônios ocultos` : ''}.`}
            </p>
          )}
          <p className="w-note">Pontos cheios: treino. Vazados: teste (a rede nunca treina com eles).</p>
        </div>
      </div>
      <canvas ref={lossRef} aria-label="Perda de treino e de teste ao longo das épocas" />
      <NetDiagram
        sizes={sizes}
        weights={net.layers.map((l) => l.W)}
        labels={{ inputs: ['x₁', 'x₂'], outputs: ['ŷ'] }}
        height={180}
      />
    </div>
  )
}
