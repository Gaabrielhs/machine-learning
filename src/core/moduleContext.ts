import { createContext, useContext } from 'react'
import type { AlgorithmModule } from './types'

export const ModuleContext = createContext<AlgorithmModule | null>(null)

export function useModule(): AlgorithmModule {
  const mod = useContext(ModuleContext)
  if (!mod) throw new Error('useModule precisa estar dentro de <ModuleContext.Provider>')
  return mod
}
