import { describe, expect, it, vi } from 'vitest'
import { XOR_TABLE } from './datasets'
import { xorExampleNetwork } from './examples'
import { TrainingSession } from './session'

describe('TrainingSession', () => {
  it('registra a perda por época e avisa os inscritos', () => {
    const s = new TrainingSession(xorExampleNetwork(), XOR_TABLE, { loss: 'mse', batchSize: 1 })
    const listener = vi.fn<() => void>()
    s.subscribe(listener)
    s.step(5, 1)
    expect(s.epoch).toBe(5)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(s.getSnapshot()).toBe(1)
    s.reset(xorExampleNetwork())
    expect(s.epoch).toBe(0)
  })
})
