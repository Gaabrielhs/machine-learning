import { Suspense, use } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { ModuleContext } from '../core/moduleContext'
import { findAlgorithm } from '../core/registry'
import type { AlgorithmEntry, AlgorithmModule } from '../core/types'
import { validateModule } from '../core/validate'
import { NotFound } from './NotFound'

const cache = new Map<string, Promise<AlgorithmModule>>()

function loadModule(entry: AlgorithmEntry): Promise<AlgorithmModule> {
  let p = cache.get(entry.meta.id)
  if (!p) {
    p = entry.load().then((mod) => {
      if (import.meta.env.DEV) {
        const errors = validateModule(mod)
        if (errors.length) console.warn('Conteúdo com problemas:\n' + errors.join('\n'))
      }
      return mod
    })
    p.catch(() => cache.delete(entry.meta.id))
    cache.set(entry.meta.id, p)
  }
  return p
}

function Loaded({ entry }: { entry: AlgorithmEntry }) {
  const mod = use(loadModule(entry))
  return (
    <ModuleContext.Provider value={mod}>
      <div className="algo-shell">
        <div className="algo-bar">
          <div className="algo-bar-name">
            <span className="tag">{mod.meta.family}</span>
            <strong>{mod.meta.name}</strong>
          </div>
          <nav className="mode-tabs" aria-label="Modo de estudo">
            <NavLink to={`/${mod.meta.id}/aula`}>Aula</NavLink>
            <NavLink to={`/${mod.meta.id}/jogo`}>Jogo</NavLink>
          </nav>
        </div>
        <Outlet />
      </div>
    </ModuleContext.Provider>
  )
}

export function AlgorithmShell() {
  const { algoId } = useParams()
  const entry = findAlgorithm(algoId)
  if (!entry) return <NotFound />
  return (
    <Suspense fallback={<div className="page-loading">Carregando {entry.meta.name}…</div>}>
      <Loaded entry={entry} />
    </Suspense>
  )
}
