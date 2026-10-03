import { forward, networkFromWeights, type Layer } from '../../algorithms/mlp/engine/network'

/** Formato de model.json: a MLP treinada no notebook e o pré-processamento ajustado no treino. */
export interface ExportedModel {
  classes: string[]
  numeric: { name: string; mean: number; std: number; min: number; max: number; integer: boolean }[]
  categorical: { name: string; levels: string[] }[]
  hidden_activation: string
  output_activation: string
  layers: Layer[]
  examples: { input: ModelInput; true: number }[]
  parity: { input: ModelInput; proba: number[] }[]
}

export type ModelInput = Record<string, string | number>

export interface Prediction {
  /** vetor de 29 entradas, na mesma ordem do ColumnTransformer */
  vector: number[]
  probabilities: number[]
  predicted: number
}

/** Mesma transformação do notebook: z-score nas numéricas e one-hot nas categóricas, nessa ordem. */
export function encode(model: ExportedModel, input: ModelInput): number[] {
  const numeric = model.numeric.map((c) => (Number(input[c.name]) - c.mean) / c.std)
  // categoria desconhecida vira só zeros, como OneHotEncoder(handle_unknown="ignore")
  const onehot = model.categorical.flatMap((c) => c.levels.map((level) => (input[c.name] === level ? 1 : 0)))
  return [...numeric, ...onehot]
}

export function softmax(z: number[]): number[] {
  const max = Math.max(...z)
  const e = z.map((v) => Math.exp(v - max))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / sum)
}

/** Cria a função de previsão. As camadas ocultas usam ReLU; a saída, softmax. */
export function createPredictor(model: ExportedModel) {
  if (model.hidden_activation !== 'relu' || model.output_activation !== 'softmax')
    throw new Error(`Ativações não suportadas: ${model.hidden_activation}/${model.output_activation}`)
  const net = networkFromWeights(model.layers, 'relu', 'linear')
  return (input: ModelInput): Prediction => {
    const vector = encode(model, input)
    const { as } = forward(net, vector)
    const probabilities = softmax(as[as.length - 1])
    const predicted = probabilities.indexOf(Math.max(...probabilities))
    return { vector, probabilities, predicted }
  }
}
