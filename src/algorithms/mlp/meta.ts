import type { AlgorithmMeta } from '../../core/types'

export const mlpMeta: AlgorithmMeta = {
  id: 'mlp',
  name: 'Perceptron multicamadas (MLP)',
  shortName: 'MLP',
  family: 'Redes neurais',
  task: 'Classificação e regressão',
  summary:
    'A rede neural clássica: camadas de neurônios que somam, ativam e passam adiante. Aprende ajustando pesos com gradiente descendente e backpropagation.',
  example: 'a luz da escada, que acende com um interruptor e apaga com os dois (o problema XOR).',
  prerequisites: ['funções e gráficos', 'derivada (ajuda, mas a aula explica)', 'somatório'],
}
