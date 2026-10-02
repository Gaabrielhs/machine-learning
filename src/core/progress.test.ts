import { beforeEach, describe, expect, it } from 'vitest'
import { challengeXp, progress, rankFor, totalXp } from './progress'

describe('progresso', () => {
  beforeEach(() => progress.resetAll())

  it('soma XP e não conta o mesmo desafio duas vezes', () => {
    progress.completeChallenge('mlp', 'neuronio', 'easy', 'a', 10)
    progress.completeChallenge('mlp', 'neuronio', 'easy', 'a', 10)
    progress.completeChallenge('mlp', 'neuronio', 'hard', 'b', 30)
    const saved = JSON.parse(localStorage.getItem('trilha-ml:progress')!)
    expect(totalXp(saved.algorithms.mlp)).toBe(40)
  })

  it('XP cai pela metade depois da primeira tentativa e dobra em missões', () => {
    expect(challengeXp('medium', 'choice', 1)).toBe(20)
    expect(challengeXp('medium', 'choice', 2)).toBe(10)
    expect(challengeXp('hard', 'mission', 1)).toBe(60)
  })

  it('calcula o ranking', () => {
    expect(rankFor(0).current.min).toBe(0)
    expect(rankFor(250).next?.min).toBe(450)
  })
})
