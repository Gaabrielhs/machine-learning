import { ACTIVATIONS, type ActivationName } from './activations'
import { createRng, gaussian, shuffle, type Rng } from './rng'

/**
 * MLP pequena e didática, escrita para ser lida.
 * Convenção: W[i][j] é o peso da entrada i para o neurônio j da camada.
 * Saída: um único neurônio sigmoide (classificação binária) ou vários.
 */
export type LossName = 'mse' | 'bce'

export interface Layer {
  W: number[][]
  b: number[]
}

export interface Network {
  sizes: number[]
  hidden: ActivationName
  output: ActivationName
  layers: Layer[]
}

export interface ForwardCache {
  /** zs[l] = saída linear da camada l+1 */
  zs: number[][]
  /** as[0] = entrada; as[l] = ativação da camada l */
  as: number[][]
}

export interface Gradients {
  dW: number[][][]
  db: number[][]
}

export type InitScheme = 'xavier' | 'he' | 'uniform'

export interface CreateOptions {
  hidden?: ActivationName
  output?: ActivationName
  init?: InitScheme
  seed?: number
}

export function createNetwork(sizes: number[], opts: CreateOptions = {}): Network {
  if (sizes.length < 2) throw new Error('A rede precisa de pelo menos entrada e saída.')
  const hidden = opts.hidden ?? 'tanh'
  const output = opts.output ?? 'sigmoid'
  const init = opts.init ?? (hidden === 'relu' ? 'he' : 'xavier')
  const rng = createRng(opts.seed ?? 1)
  const layers: Layer[] = []
  for (let l = 1; l < sizes.length; l++) {
    const nIn = sizes[l - 1]
    const nOut = sizes[l]
    const scale = init === 'he' ? Math.sqrt(2 / nIn) : init === 'xavier' ? Math.sqrt(1 / nIn) : 1
    const W = Array.from({ length: nIn }, () =>
      Array.from({ length: nOut }, () => (init === 'uniform' ? rng() * 2 - 1 : gaussian(rng) * scale)),
    )
    layers.push({ W, b: new Array<number>(nOut).fill(0) })
  }
  return { sizes: [...sizes], hidden, output, layers }
}

/** Cria uma rede a partir de pesos fixos (usado nos exemplos passo a passo). */
export function networkFromWeights(
  layers: Layer[],
  hidden: ActivationName = 'sigmoid',
  output: ActivationName = 'sigmoid',
): Network {
  const sizes = [layers[0].W.length, ...layers.map((l) => l.b.length)]
  return { sizes, hidden, output, layers: cloneLayers(layers) }
}

export function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((l) => ({ W: l.W.map((r) => [...r]), b: [...l.b] }))
}

export function cloneNetwork(net: Network): Network {
  return { ...net, sizes: [...net.sizes], layers: cloneLayers(net.layers) }
}

export function forward(net: Network, x: number[]): ForwardCache {
  const zs: number[][] = []
  const as: number[][] = [x]
  net.layers.forEach((layer, l) => {
    const isOut = l === net.layers.length - 1
    const act = ACTIVATIONS[isOut ? net.output : net.hidden]
    const prev = as[l]
    const z = layer.b.map((bj, j) => {
      let s = bj
      for (let i = 0; i < prev.length; i++) s += prev[i] * layer.W[i][j]
      return s
    })
    zs.push(z)
    as.push(z.map(act.f))
  })
  return { zs, as }
}

export function predict(net: Network, x: number[]): number[] {
  const { as } = forward(net, x)
  return as[as.length - 1]
}

const EPS = 1e-12

/** Perda de UMA amostra. MSE usa ½·Σ(ŷ−y)² para a derivada ficar limpa. */
export function sampleLoss(yhat: number[], y: number[], loss: LossName): number {
  let s = 0
  for (let k = 0; k < y.length; k++) {
    if (loss === 'mse') s += 0.5 * (yhat[k] - y[k]) ** 2
    else {
      const p = Math.min(Math.max(yhat[k], EPS), 1 - EPS)
      s += -(y[k] * Math.log(p) + (1 - y[k]) * Math.log(1 - p))
    }
  }
  return s
}

/**
 * Backpropagation para uma amostra. Devolve os gradientes e os deltas
 * (δ = ∂E/∂z) de cada camada, úteis para mostrar o passo a passo.
 */
export function backward(
  net: Network,
  cache: ForwardCache,
  y: number[],
  loss: LossName,
): Gradients & { deltas: number[][] } {
  const L = net.layers.length
  const deltas: number[][] = new Array(L)
  const yhat = cache.as[L]
  const outAct = ACTIVATIONS[net.output]
  deltas[L - 1] = yhat.map((a, k) => {
    // Sigmoide + entropia cruzada: o fator σ'(z) se cancela e sobra ŷ − y.
    if (loss === 'bce' && net.output === 'sigmoid') return a - y[k]
    const dA = loss === 'mse' ? a - y[k] : (a - y[k]) / Math.max(a * (1 - a), EPS)
    return dA * outAct.df(cache.zs[L - 1][k], a)
  })
  for (let l = L - 2; l >= 0; l--) {
    const act = ACTIVATIONS[net.hidden]
    const next = net.layers[l + 1]
    deltas[l] = cache.zs[l].map((z, j) => {
      let s = 0
      for (let k = 0; k < deltas[l + 1].length; k++) s += next.W[j][k] * deltas[l + 1][k]
      return s * act.df(z, cache.as[l + 1][j])
    })
  }
  const dW = net.layers.map((layer, l) => layer.W.map((row, i) => row.map((_, j) => cache.as[l][i] * deltas[l][j])))
  const db = deltas.map((d) => [...d])
  return { dW, db, deltas }
}

export interface Dataset {
  X: number[][]
  /** rótulos como vetores (ex.: [0] ou [1] para binário) */
  Y: number[][]
}

export interface TrainOptions {
  lr: number
  loss: LossName
  batchSize?: number
  /** L2 (weight decay); 0 desliga */
  l2?: number
  rng?: Rng
}

/** Uma época de gradiente descendente com mini-lotes. Retorna a perda média. */
export function trainEpoch(net: Network, data: Dataset, opts: TrainOptions): number {
  const n = data.X.length
  const batch = Math.max(1, Math.min(opts.batchSize ?? n, n))
  const order = shuffle(
    Array.from({ length: n }, (_, i) => i),
    opts.rng ?? Math.random,
  )
  let total = 0
  for (let start = 0; start < n; start += batch) {
    const idx = order.slice(start, start + batch)
    const acc = zeroGradients(net)
    for (const i of idx) {
      const cache = forward(net, data.X[i])
      total += sampleLoss(cache.as[cache.as.length - 1], data.Y[i], opts.loss)
      const g = backward(net, cache, data.Y[i], opts.loss)
      addInto(acc, g)
    }
    applyGradients(net, acc, opts.lr / idx.length, opts.l2 ?? 0)
  }
  return total / n
}

export function zeroGradients(net: Network): Gradients {
  return {
    dW: net.layers.map((l) => l.W.map((r) => r.map(() => 0))),
    db: net.layers.map((l) => l.b.map(() => 0)),
  }
}

function addInto(acc: Gradients, g: Gradients): void {
  acc.dW.forEach((W, l) => W.forEach((r, i) => r.forEach((_, j) => (r[j] += g.dW[l][i][j]))))
  acc.db.forEach((b, l) => b.forEach((_, j) => (b[j] += g.db[l][j])))
}

/** w ← w − η·(∂E/∂w + λ·w). O viés não é regularizado. */
export function applyGradients(net: Network, g: Gradients, lr: number, l2 = 0): void {
  net.layers.forEach((layer, l) => {
    layer.W.forEach((row, i) => row.forEach((w, j) => (row[j] = w - lr * (g.dW[l][i][j] + l2 * w))))
    layer.b.forEach((b, j) => (layer.b[j] = b - lr * g.db[l][j]))
  })
}

export function datasetLoss(net: Network, data: Dataset, loss: LossName): number {
  let s = 0
  data.X.forEach((x, i) => (s += sampleLoss(predict(net, x), data.Y[i], loss)))
  return s / data.X.length
}

/** Acurácia para saída binária (limiar 0,5) ou multiclasse (argmax). */
export function accuracy(net: Network, data: Dataset): number {
  let ok = 0
  data.X.forEach((x, i) => {
    const out = predict(net, x)
    const y = data.Y[i]
    if (out.length === 1) ok += (out[0] >= 0.5 ? 1 : 0) === y[0] ? 1 : 0
    else ok += argmax(out) === argmax(y) ? 1 : 0
  })
  return ok / data.X.length
}

export function argmax(v: number[]): number {
  let best = 0
  for (let i = 1; i < v.length; i++) if (v[i] > v[best]) best = i
  return best
}

export function parameterCount(sizes: number[]): number {
  let n = 0
  for (let l = 1; l < sizes.length; l++) n += sizes[l - 1] * sizes[l] + sizes[l]
  return n
}
