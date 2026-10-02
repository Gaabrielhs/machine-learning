import { datasetLoss, trainEpoch, type Dataset, type LossName, type Network } from './network'
import { createRng, type Rng } from './rng'

export interface SessionOptions {
  loss: LossName
  batchSize: number
  seed?: number
  /** conjunto avaliado a cada época além do treino (ex.: teste) */
  evalSet?: Dataset
}

/**
 * Estado mutável de um treino em andamento, exposto como "store" externo
 * (subscribe + getSnapshot) para componentes React via useSyncExternalStore.
 */
export class TrainingSession {
  net: Network
  readonly data: Dataset
  readonly opts: SessionOptions
  trainLoss: number[] = []
  evalLoss: number[] = []
  private rng: Rng
  private version = 0
  private listeners = new Set<() => void>()

  constructor(net: Network, data: Dataset, opts: SessionOptions) {
    this.net = net
    this.data = data
    this.opts = opts
    this.rng = createRng(opts.seed ?? 1)
  }

  get epoch(): number {
    return this.trainLoss.length
  }

  /** Treina `epochs` épocas e registra a perda (no conjunto inteiro) após cada uma. */
  step(epochs: number, lr: number): void {
    for (let i = 0; i < epochs; i++) {
      trainEpoch(this.net, this.data, { lr, loss: this.opts.loss, batchSize: this.opts.batchSize, rng: this.rng })
      this.trainLoss.push(datasetLoss(this.net, this.data, this.opts.loss))
      if (this.opts.evalSet) this.evalLoss.push(datasetLoss(this.net, this.opts.evalSet, this.opts.loss))
    }
    this.emit()
  }

  /** Treina até gastar `budgetMs` ou chegar a `maxEpochs`. */
  stepFor(budgetMs: number, lr: number, maxEpochs: number): void {
    const t0 = performance.now()
    do this.step(1, lr)
    while (performance.now() - t0 < budgetMs && this.epoch < maxEpochs)
  }

  reset(net: Network, seed = this.opts.seed ?? 1): void {
    this.net = net
    this.rng = createRng(seed)
    this.trainLoss = []
    this.evalLoss = []
    this.emit()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): number => this.version

  private emit() {
    this.version++
    this.listeners.forEach((l) => l())
  }
}
