import { fmt } from './plot'

interface Props {
  sizes: number[]
  /** pesos por camada: W[l][i][j] */
  weights?: number[][][]
  /** valores a exibir em cada neurônio: values[l][j] */
  values?: number[][]
  labels?: { inputs?: string[]; outputs?: string[] }
  /** destaca um neurônio [camada, índice] */
  highlight?: [number, number]
  maxNodes?: number
  height?: number
}

/** Diagrama SVG de uma rede: cor = sinal do peso, espessura = magnitude. */
export function NetDiagram({ sizes, weights, values, labels, highlight, maxNodes = 8, height = 220 }: Props) {
  const width = 560
  const padX = 70
  const padY = 26
  const shown = sizes.map((n) => Math.min(n, maxNodes))
  const xs = sizes.map((_, l) => padX + (l * (width - 2 * padX)) / (sizes.length - 1))
  const ys = shown.map((n) =>
    Array.from({ length: n }, (_, j) => (n === 1 ? height / 2 : padY + (j * (height - 2 * padY)) / (n - 1))),
  )
  let wmax = 1e-9
  weights?.forEach((W) => W.forEach((r) => r.forEach((w) => (wmax = Math.max(wmax, Math.abs(w))))))
  const r = sizes.some((n) => n > 5) ? 11 : 17

  return (
    <svg
      className="net-diagram"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Rede com camadas de ${sizes.join(', ')} neurônios`}
    >
      {shown.slice(1).map((n, l) =>
        Array.from({ length: shown[l] }, (_unused, i) =>
          Array.from({ length: n }, (_, j) => {
            const w = weights?.[l]?.[i]?.[j]
            const stroke = w === undefined ? 'var(--line)' : w >= 0 ? 'var(--pos)' : 'var(--neg)'
            const sw = w === undefined ? 1.2 : 0.6 + 5 * (Math.abs(w) / wmax)
            return (
              <line
                key={`${l}-${i}-${j}`}
                x1={xs[l]}
                y1={ys[l][i]}
                x2={xs[l + 1]}
                y2={ys[l + 1][j]}
                stroke={stroke}
                strokeWidth={sw}
                strokeOpacity={0.75}
              >
                {w !== undefined && <title>{`w = ${fmt(w)}`}</title>}
              </line>
            )
          }),
        ),
      )}
      {shown.map((n, l) =>
        Array.from({ length: n }, (_, j) => {
          const v = values?.[l]?.[j]
          const hot = highlight && highlight[0] === l && highlight[1] === j
          return (
            <g key={`n-${l}-${j}`}>
              <circle
                cx={xs[l]}
                cy={ys[l][j]}
                r={r}
                fill="var(--surface)"
                stroke={hot ? 'var(--ink)' : 'var(--accent)'}
                strokeWidth={hot ? 3 : 1.8}
              />
              {v !== undefined && (
                <text x={xs[l]} y={ys[l][j] + 4} textAnchor="middle" className="net-value">
                  {Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)}
                </text>
              )}
            </g>
          )
        }),
      )}
      {labels?.inputs?.map(
        (t, j) =>
          ys[0][j] !== undefined && (
            <text key={`li${j}`} x={xs[0] - r - 8} y={ys[0][j] + 4} textAnchor="end" className="net-label">
              {t}
            </text>
          ),
      )}
      {labels?.outputs?.map(
        (t, j) =>
          ys[sizes.length - 1][j] !== undefined && (
            <text key={`lo${j}`} x={xs[sizes.length - 1] + r + 8} y={ys[sizes.length - 1][j] + 4} className="net-label">
              {t}
            </text>
          ),
      )}
      {sizes.map(
        (n, l) =>
          n > maxNodes && (
            <text key={`more${l}`} x={xs[l]} y={height - 4} textAnchor="middle" className="net-label">
              +{n - maxNodes}
            </text>
          ),
      )}
    </svg>
  )
}
