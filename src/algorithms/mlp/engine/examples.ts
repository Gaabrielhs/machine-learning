import { networkFromWeights, type Network } from './network'

/**
 * Pesos iniciais fixos da rede 2-2-1 usada como exemplo nas aulas.
 * Fixos para que os números mostrados no texto sejam sempre os mesmos.
 * Com MSE, sigmoide e taxa 1, a rede aprende o XOR em algumas centenas de épocas.
 */
export const XOR_EXAMPLE_LAYERS = [
  {
    W: [
      [0.9, -0.7],
      [-0.6, 0.8],
    ],
    b: [0.1, 0.1],
  },
  { W: [[0.4], [0.6]], b: [-0.2] },
]

export const XOR_EXAMPLE_LR = 1

export const xorExampleNetwork = (): Network => networkFromWeights(XOR_EXAMPLE_LAYERS, 'sigmoid', 'sigmoid')

/** Rede 2-2-1 montada à mão: h1 ≈ OU, h2 ≈ NÃO-E, saída ≈ E. Resolve o XOR. */
export const XOR_HANDMADE_LAYERS = [
  {
    W: [
      [20, -20],
      [20, -20],
    ],
    b: [-10, 30],
  },
  { W: [[20], [20]], b: [-30] },
]

export const xorHandmadeNetwork = (): Network => networkFromWeights(XOR_HANDMADE_LAYERS, 'sigmoid', 'sigmoid')
