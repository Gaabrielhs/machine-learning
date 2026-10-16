import { useId, useMemo, useState } from 'react'
import { int } from '../sleep-debt/format'
import { TopTree } from './charts'
import { hm, hours, LEVEL_PT, minutes, question } from './labels'
import raw from './model.json'
import { predict, type ExportedTree, type ModelInput } from './model'

const model = raw as unknown as ExportedTree

const GROUPS: { title: string; fields: string[] }[] = [
  { title: 'Perfil', fields: ['age', 'gender', 'occupation_type', 'chronotype'] },
  {
    title: 'Hábitos à noite',
    fields: [
      'bedtime_phone_minutes',
      'primary_bedtime_app',
      'screen_brightness_pct',
      'blue_light_filter_active',
      'caffeine_post_5pm_mg',
      'physical_activity_min',
    ],
  },
]

const EXAMPLE_NAMES = ['dorme pouco', 'abaixo da média', 'perto da média', 'acima da média', 'dorme muito']

export function TryTree({ labels }: { labels: Record<string, string> }) {
  const [example, setExample] = useState(0)
  const [input, setInput] = useState<ModelInput>(model.examples[0].input)
  const [edited, setEdited] = useState(false)
  const result = useMemo(() => predict(model, input), [input])
  const ex = model.examples[example]
  const mistakeIndex = model.examples.length - 1

  const pick = (i: number) => {
    setExample(i)
    setInput(model.examples[i].input)
    setEdited(false)
  }
  const set = (name: string, value: string | number) => {
    setInput((prev) => ({ ...prev, [name]: value }))
    setEdited(true)
  }

  const numeric = Object.fromEntries(model.numeric.map((c) => [c.name, c]))
  const categorical = Object.fromEntries(model.categorical.map((c) => [c.name, c]))
  const err = result.hours - ex.real

  return (
    <div className="sd-try">
      <div className="sd-try-examples">
        <span className="sd-muted">Começar de uma pessoa real do conjunto de teste:</span>
        <div className="sd-ba-pick" role="radiogroup" aria-label="Exemplos do conjunto de teste">
          {model.examples.map((e, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === example && !edited}
              className={i === example && !edited ? 'on' : ''}
              onClick={() => pick(i)}
            >
              {i === mistakeIndex ? 'o maior erro' : (EXAMPLE_NAMES[i] ?? `exemplo ${i + 1}`)} · {hours(e.real, 1)}
            </button>
          ))}
        </div>
      </div>

      <div className="sd-try-grid">
        <form className="sd-try-form" onSubmit={(e) => e.preventDefault()} aria-label="Dados da pessoa">
          {GROUPS.map((g) => (
            <fieldset key={g.title}>
              <legend>{g.title}</legend>
              {g.fields.map((f) =>
                categorical[f] ? (
                  <SelectField
                    key={f}
                    label={labels[f]}
                    value={String(input[f])}
                    options={categorical[f].levels}
                    onChange={(v) => set(f, v)}
                  />
                ) : f === 'blue_light_filter_active' ? (
                  <SelectField
                    key={f}
                    label={labels[f].replace(' (0/1)', '')}
                    value={String(input[f])}
                    options={['0', '1']}
                    names={{ '0': 'Não', '1': 'Sim' }}
                    onChange={(v) => set(f, Number(v))}
                  />
                ) : (
                  <RangeField
                    key={f}
                    label={labels[f]}
                    value={Number(input[f])}
                    min={numeric[f].min}
                    max={numeric[f].max}
                    step={numeric[f].integer ? 1 : 0.1}
                    onChange={(v) => set(f, v)}
                  />
                ),
              )}
            </fieldset>
          ))}
        </form>

        <aside className="sd-try-out" aria-live="polite">
          <p className="sd-step">Previsão da árvore</p>
          <p className="sd-try-class ct-try-hours">{hm(result.hours)}</p>
          <p className="sd-muted">
            de sono: a média das {int(model.tree.n[result.leaf])} pessoas de treino que caíram na mesma folha
          </p>
          <p className={`sd-try-truth${edited ? ' muted' : ''}`}>
            {edited ? (
              'Valores editados por você: não há valor real para comparar.'
            ) : (
              <>
                Esta pessoa dormiu <strong>{hm(ex.real)}</strong>. Erro de{' '}
                <strong>
                  {err > 0 ? '+' : '−'}
                  {minutes(Math.abs(err))}
                </strong>
                {example === mistakeIndex && ': o maior erro do conjunto de teste.'}
                {example !== mistakeIndex && '.'}
              </>
            )}
          </p>
          <h3 className="ct-path-title">Caminho na árvore</h3>
          <ol className="ct-path">
            {result.path.map((s) => {
              const q = question(s.feature, s.threshold)
              return (
                <li key={s.node}>
                  <span>{q.text}</span>
                  <strong>{s.left ? q.left : q.right}</strong>
                  <span className="sd-muted mono">
                    → {hours(model.tree.value[s.left ? model.tree.left[s.node] : model.tree.right[s.node]], 1)}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="sd-note">
            A conta é feita no seu navegador com a árvore treinada no notebook. Só {result.path.length} perguntas
            decidem a previsão; os outros campos podem mudar sem efeito nenhum. Experimente o cronotipo e os minutos de
            celular.
          </p>
        </aside>
      </div>
      <details className="sd-more">
        <summary>Ver o caminho no topo da árvore</summary>
        <TopTree model={model} levels={3} path={[...result.path.map((s) => s.node), result.leaf]} />
      </details>
    </div>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  const id = useId()
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div className="sd-field">
      <label htmlFor={id}>{label}</label>
      <div className="sd-field-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          inputMode="decimal"
          onChange={(e) => {
            const v = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(v)) onChange(clamp(v))
          }}
        />
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  names,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  names?: Record<string, string>
  onChange: (v: string) => void
}) {
  const id = useId()
  return (
    <div className="sd-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {names?.[o] ?? LEVEL_PT[o] ?? o}
          </option>
        ))}
      </select>
    </div>
  )
}
