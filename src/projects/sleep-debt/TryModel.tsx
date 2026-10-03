import { useId, useMemo, useState } from 'react'
import { classColor, num, pct } from './format'
import raw from './model.json'
import { createPredictor, type ExportedModel, type ModelInput } from './model'

const model = raw as unknown as ExportedModel
const predict = createPredictor(model)

/** Tradução dos valores categóricos do dataset (o modelo continua recebendo o valor original). */
const LEVEL_PT: Record<string, string> = {
  Female: 'Feminino',
  Male: 'Masculino',
  'Non-Binary': 'Não binário',
  'Corporate 9-to-5': 'Corporativo (horário comercial)',
  'Freelance / Creative': 'Freelancer / criativo',
  'Healthcare / Shift Worker': 'Saúde / trabalho em turnos',
  'Remote Tech': 'Tecnologia remota',
  Student: 'Estudante',
  Intermediate: 'Intermediário',
  'Morning Lark': 'Matutino',
  'Night Owl': 'Noturno',
  'Messaging / Chat': 'Mensagens / chat',
  'News / Reading': 'Notícias / leitura',
}

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
  {
    title: 'Sono e manhã seguinte',
    fields: [
      'sleep_latency_min',
      'total_sleep_hours',
      'deep_sleep_pct',
      'rem_sleep_pct',
      'morning_alarm_snoozes',
      'next_day_fatigue_score',
    ],
  },
]

interface Props {
  classes: string[]
  labels: Record<string, string>
}

export function TryModel({ classes, labels }: Props) {
  const [example, setExample] = useState(0)
  const [input, setInput] = useState<ModelInput>(model.examples[0].input)
  const [edited, setEdited] = useState(false)
  const result = useMemo(() => predict(input), [input])
  const ex = model.examples[example]
  const isMistake = example === model.examples.length - 1 && model.examples.length > 8

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
  const top = result.probabilities[result.predicted]

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
              <span className="sd-swatch" style={{ background: classColor(e.true) }} />
              {i === model.examples.length - 1 && model.examples.length > 8 ? 'um erro do modelo' : classes[e.true]}
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
          <p className="sd-step">Previsão da MLP</p>
          <p className="sd-try-class">
            <span className="sd-swatch big" style={{ background: classColor(result.predicted) }} />
            {classes[result.predicted]}
          </p>
          <p className="sd-muted">com {pct(top)} de probabilidade</p>
          <ul className="sd-probs">
            {result.probabilities.map((p, k) => (
              <li key={k} className={k === result.predicted ? 'on' : ''}>
                <span className="sd-probs-label">{classes[k]}</span>
                <span className="sd-probs-bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(0.5, p * 100)}%`, background: classColor(k) }} />
                </span>
                <span className="sd-probs-v mono">{pct(p)}</span>
              </li>
            ))}
          </ul>
          <p className={`sd-try-truth${edited ? ' muted' : ''}`}>
            {edited ? (
              'Valores editados por você: não há classe real para comparar.'
            ) : (
              <>
                Classe real desta pessoa: <strong>{classes[ex.true]}</strong>.{' '}
                {result.predicted === ex.true ? 'O modelo acertou.' : 'O modelo errou este caso.'}
                {isMistake && ' É um dos poucos erros do conjunto de teste.'}
              </>
            )}
          </p>
          <p className="sd-note">
            A conta é feita no seu navegador com os pesos treinados no notebook: os dados viram 29 entradas, passam
            pelas camadas de 32 e 16 neurônios (ReLU) e a softmax devolve uma probabilidade por classe. Experimente
            mexer nas horas de sono.
          </p>
          <details className="sd-more">
            <summary>Ver as 29 entradas</summary>
            <p className="sd-vecline mono">[{result.vector.map((v) => num(v, 2)).join(', ')}]</p>
          </details>
        </aside>
      </div>
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
