import { useId, useMemo, useState } from 'react'
import { int, num } from '../sleep-debt/format'
import { SeriesChart } from './charts'
import { dayMonthHour, dayTicks, kw, kwh, signed } from './labels'
import raw from './model.json'
import { scenario, type Delta, type ExportedModel } from './model'

const model = raw as unknown as ExportedModel

const ALL_PRESETS: { label: string; delta: Delta }[] = [
  { label: 'Onda de calor (+5 °C)', delta: { ambient_temperature_c: 5 } },
  { label: 'Semana fria (−5 °C)', delta: { ambient_temperature_c: -5 } },
  { label: 'Mais carga (+10 kW nos servidores)', delta: { it_power_kw: 10 } },
  {
    label: 'Calor e carga alta',
    delta: { ambient_temperature_c: 5, it_power_kw: 10 },
  },
]
const PRESETS = ALL_PRESETS.filter((p) => Object.keys(p.delta).every((k) => model.exog.some((e) => e.name === k)))

const zero = (): Delta => Object.fromEntries(model.exog.map((e) => [e.name, 0]))

export function TryScenario() {
  const [delta, setDelta] = useState<Delta>(zero)
  const sc = useMemo(() => scenario(model, delta), [delta])
  const changed = model.exog.some((e) => delta[e.name] !== 0)
  const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)
  const realKwh = sum(model.base.real)
  const baseKwh = sum(model.base.pred)
  const peak = Math.max(...sc.pred)
  const mean = sc.kwh / sc.pred.length
  const set = (name: string, v: number) => setDelta((d) => ({ ...d, [name]: v }))
  const none = Math.abs(sc.deltaKwh) < 0.5

  return (
    <div className="sd-try">
      <div className="sd-try-examples">
        <span className="sd-muted">Começar de um cenário:</span>
        <div className="sd-ba-pick" role="group" aria-label="Cenários prontos">
          <button type="button" className={changed ? '' : 'on'} onClick={() => setDelta(zero())}>
            sem mudança
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDelta({ ...zero(), ...p.delta })}
              className={model.exog.every((e) => (delta[e.name] ?? 0) === (p.delta[e.name] ?? 0)) ? 'on' : ''}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sd-try-grid">
        <form className="sd-try-form" onSubmit={(e) => e.preventDefault()} aria-label="Mudanças nos 7 dias de teste">
          <fieldset>
            <legend>O que muda em relação ao que aconteceu</legend>
            {model.exog.map((e) => (
              <RangeField
                key={e.name}
                label={`${e.label} (${e.unit})`}
                hint={`média nos dias de teste: ${num(e.test_mean, 1)}`}
                value={delta[e.name] ?? 0}
                min={e.min}
                max={e.max}
                step={e.step}
                onChange={(v) => set(e.name, v)}
              />
            ))}
          </fieldset>
          <div className="dc-try-chart">
            <SeriesChart
              ariaLabel="Previsão da potência de refrigeração nos 7 dias de teste, no cenário escolhido e na previsão-base"
              height={250}
              yFormat={(v) => `${Math.round(v)}`}
              yLabel="kW"
              xTicks={dayTicks(model.start, model.hours, 1)}
              xHover={(i) => dayMonthHour(model.start, i)}
              lines={[
                { label: 'real', values: model.base.real, tone: 'muted', width: 1.5 },
                { label: 'previsão-base', values: model.base.pred, tone: 'strong', dashed: changed },
                ...(changed ? [{ label: 'cenário', values: sc.pred, tone: 'accent' as const }] : []),
              ]}
              band={{ lo: sc.lo, hi: sc.hi, label: 'intervalo de 95%', tone: changed ? 'accent' : 'strong' }}
            />
          </div>
        </form>

        <aside className="sd-try-out" aria-live="polite">
          <p className="sd-step">Previsão do SARIMAX</p>
          <p className="sd-try-class dc-try-kwh">{kwh(sc.kwh)}</p>
          <p className="sd-muted">de energia de refrigeração prevista nos {int(model.hours / 24)} dias de teste</p>
          <p className="sd-try-truth">
            {changed ? (
              <>
                {none ? 'Sem diferença' : <strong>{signed(sc.deltaKwh, 0)} kWh</strong>} em relação à previsão-base (
                {kwh(baseKwh)}); a previsão desloca {signed(sc.shift, 2)} kW em todas as horas.
              </>
            ) : (
              <>
                Previsão-base com o clima e a carga que de fato ocorreram. O consumo real de refrigeração no período foi{' '}
                <strong>{kwh(realKwh)}</strong>.
              </>
            )}
          </p>
          <dl className="dc-try-stats">
            <div>
              <dt>potência média</dt>
              <dd>{kw(mean)}</dd>
            </div>
            <div>
              <dt>pico previsto</dt>
              <dd>{kw(peak)}</dd>
            </div>
          </dl>
          <p className="sd-note">
            A conta é feita no seu navegador: cada variável soma <em>coeficiente × mudança</em> à previsão de todas as
            horas (coeficientes na seção “O modelo final”). Vale só para essas variáveis; o resto do modelo (a memória
            do passado e a sazonalidade) não muda.
          </p>
        </aside>
      </div>
    </div>
  )
}

function RangeField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  hint: string
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
      <label htmlFor={id}>
        {label} <span className="sd-muted">· {hint}</span>
      </label>
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
