import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

afterEach(() => cleanup())

// a primeira carga de uma página (rota lazy + KaTeX) passa de 1 s em máquinas de CI mais lentas
configure({ asyncUtilTimeout: 5000 })

// jsdom não implementa canvas nem matchMedia; os widgets toleram a ausência.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
if (!window.matchMedia)
  window.matchMedia = (q: string) =>
    ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
window.scrollTo = (() => {}) as typeof window.scrollTo
