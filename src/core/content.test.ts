import { describe, expect, it } from 'vitest'
import { ALGORITHMS } from './registry'
import { validateModule } from './validate'

describe('conteúdo de todos os algoritmos registrados', () => {
  for (const entry of ALGORITHMS)
    it(`${entry.meta.id}: módulo consistente`, async () => {
      const mod = await entry.load()
      expect(mod.meta).toEqual(entry.meta)
      expect(validateModule(mod)).toEqual([])
    })

  it('ids de algoritmo são únicos', () => {
    const ids = ALGORITHMS.map((a) => a.meta.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
