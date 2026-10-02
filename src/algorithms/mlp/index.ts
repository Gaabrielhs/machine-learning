import { lazy } from 'react'
import type { AlgorithmModule } from '../../core/types'
import { lesson } from './content/lesson'
import { quest } from './content/quest'
import { mlpMeta } from './meta'

const mlp: AlgorithmModule = {
  meta: mlpMeta,
  lesson,
  quest,
  widgets: {
    NeuronPlayground: lazy(() => import('./widgets/NeuronPlayground')),
    ActivationExplorer: lazy(() => import('./widgets/ActivationExplorer')),
    XorForward: lazy(() => import('./widgets/XorForward')),
    LossExplorer: lazy(() => import('./widgets/LossExplorer')),
    HillDescent: lazy(() => import('./widgets/HillDescent')),
    XorTrainStep: lazy(() => import('./widgets/XorTrainStep')),
    XorTrainer: lazy(() => import('./widgets/XorTrainer')),
    Playground: lazy(() => import('./widgets/Playground')),
  },
}

export default mlp
