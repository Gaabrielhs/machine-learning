/** Formato de model.json: a Árvore de Decisão de Regressão treinada e o pré-processamento. */
export interface SerializedTreeNode {
  /** Índice da feature de corte (presente apenas em nós internos) */
  f?: number
  /** Limiar de corte x[f] <= t (presente apenas em nós internos) */
  t?: number
  /** Valor previsto (média das horas de sono das amostras que caíram no nó) */
  v: number
  /** Número de amostras de treino neste nó */
  n: number
  /** Subárvore esquerda (x[f] <= t) */
  l?: SerializedTreeNode
  /** Subárvore direita (x[f] > t) */
  r?: SerializedTreeNode
}

export interface ExportedTreeModel {
  target: string
  bands: string[]
  numeric: { name: string; mean: number; std: number; min: number; max: number; integer: boolean }[]
  categorical: { name: string; levels: string[] }[]
  features: string[]
  tree: SerializedTreeNode
  examples: { label: string; band: number; input: ModelInput; true: number }[]
  parity: { input: ModelInput; pred: number }[]
}

export type ModelInput = Record<string, string | number>

export interface DecisionStep {
  featureIndex: number
  featureName: string
  value: number
  threshold: number
  direction: 'left' | 'right'
  nodeMean: number
  nodeSamples: number
}

export interface TreePrediction {
  /** Vetor de 28 entradas (11 numéricas + 17 one-hot) */
  vector: number[]
  /** Horas de sono previstas pela folha da árvore */
  predicted: number
  /** Número de amostras de treino na folha atingida */
  leafSamples: number
  /** Caminho de decisões percorrido da raiz até a folha */
  path: DecisionStep[]
}

/** Codifica uma pessoa nas 28 entradas da árvore (11 numéricas originais + 17 one-hot). */
export function encodeTreeInput(model: ExportedTreeModel, input: ModelInput): number[] {
  const numeric = model.numeric.map((c) => Number(input[c.name]))
  const onehot = model.categorical.flatMap((c) => c.levels.map((level) => (input[c.name] === level ? 1 : 0)))
  return [...numeric, ...onehot]
}

/** Cria o preditor que percorre a árvore de decisão e registra o caminho completo de regras. */
export function createTreePredictor(model: ExportedTreeModel) {
  return (input: ModelInput): TreePrediction => {
    const vector = encodeTreeInput(model, input)
    const path: DecisionStep[] = []
    let node = model.tree
    while (node.f !== undefined && node.t !== undefined && node.l && node.r) {
      const fIdx = node.f
      const val = vector[fIdx]
      const goLeft = val <= node.t
      path.push({
        featureIndex: fIdx,
        featureName: model.features[fIdx],
        value: val,
        threshold: node.t,
        direction: goLeft ? 'left' : 'right',
        nodeMean: node.v,
        nodeSamples: node.n,
      })
      node = goLeft ? node.l : node.r
    }
    return {
      vector,
      predicted: node.v,
      leafSamples: node.n,
      path,
    }
  }
}
