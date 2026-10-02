import { describe, expect, it } from 'vitest'
import { dedent, normalizeDisplayMath, parseNumber } from './text'

describe('texto', () => {
  it('remove a indentação comum', () => {
    expect(dedent('\n    a\n      b\n  ')).toBe('a\n  b')
  })
  it('transforma $$...$$ de uma linha em bloco, mantendo a indentação', () => {
    expect(normalizeDisplayMath('texto\n   $$x^2$$\nmais')).toBe('texto\n\n   $$\n   x^2\n   $$\n\nmais')
    expect(normalizeDisplayMath('inline $$x$$ no meio')).toBe('inline $$x$$ no meio')
  })
  it('lê números com vírgula e menos tipográfico', () => {
    expect(parseNumber('−0,096')).toBe(-0.096)
    expect(parseNumber(' 1 556 ')).toBe(1556)
  })
})
