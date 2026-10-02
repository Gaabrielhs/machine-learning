export type ActivationName = 'sigmoid' | 'tanh' | 'relu' | 'linear'

export interface Activation {
  name: ActivationName
  label: string
  f: (z: number) => number
  /** Derivada em função de z e da saída a = f(z) (evita recalcular). */
  df: (z: number, a: number) => number
}

export const sigmoid = (z: number): number => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)))

export const ACTIVATIONS: Record<ActivationName, Activation> = {
  sigmoid: { name: 'sigmoid', label: 'Sigmoide', f: sigmoid, df: (_z, a) => a * (1 - a) },
  tanh: { name: 'tanh', label: 'Tanh', f: Math.tanh, df: (_z, a) => 1 - a * a },
  relu: { name: 'relu', label: 'ReLU', f: (z) => (z > 0 ? z : 0), df: (z) => (z > 0 ? 1 : 0) },
  linear: { name: 'linear', label: 'Linear', f: (z) => z, df: () => 1 },
}
