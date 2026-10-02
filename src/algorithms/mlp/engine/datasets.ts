import type { Dataset } from './network'
import { createRng, gaussian, shuffle } from './rng'

export type DatasetName = 'xor' | 'circle' | 'moons' | 'spiral'

export const DATASET_LABELS: Record<DatasetName, string> = {
  xor: 'Quadrantes (XOR)',
  circle: 'Círculo',
  moons: 'Duas luas',
  spiral: 'Espiral',
}

/** As 4 linhas da tabela-verdade do XOR. */
export const XOR_TABLE: Dataset = {
  X: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  Y: [[0], [1], [1], [0]],
}

export interface Split {
  train: Dataset
  test: Dataset
}

/**
 * Gera um conjunto 2D binário com coordenadas aproximadamente em [-1, 1].
 * Determinístico para uma dada semente.
 */
export function makeDataset(name: DatasetName, n: number, noise: number, seed = 7): Dataset {
  const rng = createRng(seed)
  const X: number[][] = []
  const Y: number[][] = []
  const push = (x: number, y: number, label: number) => {
    X.push([x + gaussian(rng) * noise, y + gaussian(rng) * noise])
    Y.push([label])
  }
  for (let i = 0; i < n; i++) {
    const label = i % 2
    switch (name) {
      case 'xor': {
        let x = rng() * 2 - 1
        let y = rng() * 2 - 1
        // afasta os pontos dos eixos para deixar uma margem visível
        x += x > 0 ? 0.08 : -0.08
        y += y > 0 ? 0.08 : -0.08
        push(x * 0.9, y * 0.9, x * y < 0 ? 1 : 0)
        break
      }
      case 'circle': {
        const r = label ? 0.55 + rng() * 0.35 : rng() * 0.35
        const t = rng() * 2 * Math.PI
        push(r * Math.cos(t), r * Math.sin(t), label)
        break
      }
      case 'moons': {
        const t = rng() * Math.PI
        const s = 0.62
        if (label) push(s * (0.5 - Math.cos(t)), s * (0.25 - Math.sin(t)), 1)
        else push(s * (Math.cos(t) - 0.5), s * (Math.sin(t) - 0.25), 0)
        break
      }
      case 'spiral': {
        const k = Math.floor(i / 2) / (n / 2)
        const r = 0.08 + k * 0.85
        const t = k * 3.4 * Math.PI + label * Math.PI
        push(r * Math.cos(t), r * Math.sin(t), label)
        break
      }
    }
  }
  return { X, Y }
}

export function splitDataset(data: Dataset, testFraction: number, seed = 11): Split {
  const idx = shuffle(
    Array.from({ length: data.X.length }, (_, i) => i),
    createRng(seed),
  )
  const nTest = Math.round(data.X.length * testFraction)
  const pick = (ids: number[]): Dataset => ({
    X: ids.map((i) => data.X[i]),
    Y: ids.map((i) => data.Y[i]),
  })
  return { test: pick(idx.slice(0, nTest)), train: pick(idx.slice(nTest)) }
}
