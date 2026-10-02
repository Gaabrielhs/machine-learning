/** Remove a indentação comum, para o conteúdo poder ser escrito indentado no código. */
export function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n')
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length)
  const cut = indents.length ? Math.min(...indents) : 0
  return lines.map((l) => l.slice(cut)).join('\n')
}

/**
 * Converte fórmulas de bloco escritas numa linha só ($$...$$) para a forma
 * cercada, que o remark-math sempre trata como bloco centralizado.
 */
export function normalizeDisplayMath(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*)\$\$(.+)\$\$\s*$/)
      if (!m) return line
      const [, indent, body] = m
      return ['', `${indent}$$`, `${indent}${body.trim()}`, `${indent}$$`, ''].join('\n')
    })
    .join('\n')
}

/** Aceita vírgula ou ponto decimal e o sinal de menos tipográfico. */
export function parseNumber(text: string): number {
  return Number(text.trim().replace(/\s/g, '').replace('−', '-').replace(',', '.'))
}
