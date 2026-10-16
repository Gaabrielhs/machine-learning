import { useId, useMemo, useState } from 'react'
import { bandColor, hoursToBandIndex, hoursToHm, int, num } from './format'
import raw from './model.json'
import { createTreePredictor, type DecisionStep, type ExportedTreeModel, type ModelInput } from './treeModel'

const model = raw as unknown as ExportedTreeModel
const predict = createTreePredictor(model)

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
      'deep_sleep_pct',
      'rem_sleep_pct',
      'morning_alarm_snoozes',
      'next_day_fatigue_score',
    ],
  },
]

interface Props {
  bands: string[]
  labels: Record<string, string>
}

function formatDecisionStep(step: DecisionStep, labels: Record<string, string>): { rule: string; status: string } {
  const f = step.featureName
  // verifica se é uma coluna one-hot
  const catPrefix = ['gender_', 'occupation_type_', 'chronotype_', 'primary_bedtime_app_'].find((p) =>
    f.startsWith(p),
  )
  if (catPrefix) {
    const col = catPrefix.slice(0, -1)
    const rawLevel = f.slice(catPrefix.length)
    const ptLevel = LEVEL_PT[rawLevel] ?? rawLevel
    const isThisLevel = step.value > 0.5
    return {
      rule: `${labels[col] ?? col} é "${ptLevel}"?`,
      status: isThisLevel ? 'Sim (1 > 0,5 → direita)' : 'Não (0 ≤ 0,5 → esquerda)',
    }
  }
  const op = step.direction === 'left' ? '≤' : '>'
  return {
    rule: `${labels[f] ?? f} ${op} ${num(step.threshold, 2)}`,
    status: `valor = ${num(step.value, 1)} → ${step.direction === 'left' ? 'esquerda' : 'direita'}`,
  }
}

export function TryTreeModel({ bands, labels }: Props) {
  const [example, setExample] = useState(0)
  const [input, setInput] = useState<ModelInput>(model.examples[0].input)
  const [edited, setEdited] = useState(false)
  const result = useMemo(() => predict(input), [input])
  const ex = model.examples[example]
  const isOutlierExample = example === model.examples.length - 1

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
  const predBand = hoursToBandIndex(result.predicted)
  const gaugePct = Math.min(100, Math.max(0, ((result.predicted - 3.2) / (9.8 - 3.2)) * 100))
  const trueGaugePct = Math.min(100, Math.max(0, ((ex.true - 3.2) / (9.8 - 3.2)) * 100))

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
              <span className="sd-swatch" style={{ background: bandColor(e.band) }} />
              {i === model.examples.length - 1 ? 'maior desvio no teste' : `${e.label} (${num(e.true, 1)} h)`}
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
          <p className="sd-step">Previsão da Árvore de Decisão</p>
          <p className="sd-try-class">
            <span className="sd-swatch big" style={{ background: bandColor(predBand) }} />
            {num(result.predicted, 2)} h <span className="sd-try-hm">({hoursToHm(result.predicted)})</span>
          </p>
          <p className="sd-muted">
            Faixa correspondente: <strong>{bands[predBand]}</strong> · folha com {int(result.leafSamples)} pessoas do
            treino
          </p>

          <div className="sd-gauge" aria-label="Escala de horas de sono de 3,2h a 9,8h">
            <div className="sd-gauge-track">
              <i
                className="sd-gauge-fill"
                style={{ width: `${gaugePct}%`, background: bandColor(predBand) }}
              />
              {!edited && (
                <span
                  className="sd-gauge-true"
                  style={{ left: `${trueGaugePct}%` }}
                  title={`Real: ${num(ex.true, 2)} h`}
                />
              )}
            </div>
            <div className="sd-gauge-labels mono">
              <span>3,2 h</span>
              <span>6,5 h</span>
              <span>9,8 h</span>
            </div>
          </div>

          <p className={`sd-try-truth${edited ? ' muted' : ''}`}>
            {edited ? (
              'Valores editados por você: altere os controles e veja as regras da árvore mudarem ao vivo.'
            ) : (
              <>
                Horas reais desta pessoa: <strong>{num(ex.true, 2)} h</strong> (erro absoluto de{' '}
                <strong>{num(Math.abs(result.predicted - ex.true), 2)} h</strong>).
                {isOutlierExample && ' Este é o caso extremo de 9,8 h onde a folha prevê a média do grupo (8,00 h).'}
              </>
            )}
          </p>

          <div className="sd-path-box">
            <p className="sd-path-title">Caminho de decisão percorrido ({result.path.length} perguntas):</p>
            <ol className="sd-path-list">
              {result.path.map((step, idx) => {
                const formatted = formatDecisionStep(step, labels)
                return (
                  <li key={idx}>
                    <span className="sd-path-n">{idx + 1}</span>
                    <div>
                      <strong>{formatted.rule}</strong>
                      <span className="sd-path-meta">
                        {formatted.status} · média parcial: {num(step.nodeMean, 2)} h
                      </span>
                    </div>
                  </li>
                )
              })}
              <li className="leaf">
                <span className="sd-path-n">★</span>
                <div>
                  <strong>Folha atingida → {num(result.predicted, 2)} h</strong>
                  <span className="sd-path-meta">
                    Média das {int(result.leafSamples)} pessoas do treino que caíram nesta folha
                  </span>
                </div>
              </li>
            </ol>
          </div>

          <details className="sd-more">
            <summary>Ver o vetor de 28 entradas</summary>
            <p className="sd-vecline mono">[{result.vector.map((v) => num(v, 1)).join(', ')}]</p>
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
