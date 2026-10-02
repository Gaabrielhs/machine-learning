import { mlpMeta } from '../algorithms/mlp/meta'
import type { AlgorithmEntry } from './types'

/**
 * Catálogo de algoritmos. Para adicionar um novo:
 *   1. crie src/algorithms/<id>/ com meta.ts e index.ts (veja CONTRIBUTING.md)
 *   2. registre aqui com um import dinâmico (o código só carrega quando a página abre)
 */
export const ALGORITHMS: AlgorithmEntry[] = [
  { meta: mlpMeta, load: () => import('../algorithms/mlp').then((m) => m.default) },
]

export function findAlgorithm(id: string | undefined): AlgorithmEntry | undefined {
  return ALGORITHMS.find((a) => a.meta.id === id)
}
