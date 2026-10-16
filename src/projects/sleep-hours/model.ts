/** Formato de model.json: a árvore treinada no notebook, nos mesmos arrays de `DecisionTreeRegressor.tree_`. */
export interface ExportedTree {
  numeric: { name: string; min: number; max: number; integer: boolean }[]
  categorical: { name: string; levels: string[] }[]
  /** nomes das 23 entradas, na ordem do ColumnTransformer */
  features: string[]
  tree: {
    /** filho da esquerda (condição verdadeira); -1 numa folha */
    left: number[]
    right: number[]
    /** índice da entrada testada; negativo numa folha */
    feature: number[]
    threshold: number[]
    /** média de horas de sono das pessoas de treino que chegaram ao nó */
    value: number[]
    n: number[]
  }
  examples: { input: ModelInput; real: number }[]
  parity: { input: ModelInput; pred: number }[]
}

export type ModelInput = Record<string, string | number>

export interface Step {
  node: number
  feature: string
  threshold: number
  /** valor da entrada nesse nó */
  value: number
  /** true = foi para a esquerda (valor ≤ limiar) */
  left: boolean
}

export interface TreePrediction {
  vector: number[]
  hours: number
  leaf: number
  path: Step[]
}

/** Mesma transformação do notebook: numéricas como estão e one-hot nas categóricas, nessa ordem. */
export function encode(model: ExportedTree, input: ModelInput): number[] {
  const numeric = model.numeric.map((c) => Number(input[c.name]))
  // categoria desconhecida vira só zeros, como OneHotEncoder(handle_unknown="ignore")
  const onehot = model.categorical.flatMap((c) => c.levels.map((level) => (input[c.name] === level ? 1 : 0)))
  return [...numeric, ...onehot]
}

export const isLeaf = (model: ExportedTree, node: number) => model.tree.left[node] < 0

/** Percorre a árvore como o scikit-learn: vai para a esquerda quando x ≤ limiar. */
export function predict(model: ExportedTree, input: ModelInput): TreePrediction {
  const vector = encode(model, input)
  const { left, right, feature, threshold, value } = model.tree
  const path: Step[] = []
  let node = 0
  while (!isLeaf(model, node)) {
    // o scikit-learn compara em float32
    const x = Math.fround(vector[feature[node]])
    const goLeft = x <= threshold[node]
    path.push({ node, feature: model.features[feature[node]], threshold: threshold[node], value: x, left: goLeft })
    node = goLeft ? left[node] : right[node]
  }
  return { vector, hours: value[node], leaf: node, path }
}
