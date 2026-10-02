import { useId, useState } from 'react'
import type { Challenge, Level } from '../core/types'
import { Markdown } from './Markdown'
import { parseNumber } from './text'
import { WidgetSlot } from './WidgetSlot'

interface Props {
  challenge: Challenge
  level: Level
  /** já vencido antes (vem do progresso salvo) */
  solved?: boolean
  /** XP mostrado no selo; omitido em exercícios de prática */
  xp?: number
  /** pergunta de fixação dentro da aula: sem XP */
  practice?: boolean
  onSolved?: (attempts: number) => void
}

export function ChallengeView({ challenge, level, solved, xp, practice, onSolved }: Props) {
  const [attempts, setAttempts] = useState(0)
  const [won, setWon] = useState(false)
  const done = solved || won

  const win = (n: number) => {
    if (!won) {
      setWon(true)
      onSolved?.(n)
    }
  }

  return (
    <section className={`challenge challenge-${challenge.kind}${done ? ' is-done' : ''}`}>
      <header className="challenge-head">
        <span className="challenge-kind">
          {challenge.kind === 'choice' ? 'Pergunta' : challenge.kind === 'number' ? 'Calcule' : 'Missão'}
        </span>
        {!practice && xp !== undefined && (
          <span className="xp-chip" aria-label={done ? 'concluído' : `${xp} XP`}>
            {done ? '✓ feito' : `+${xp} XP`}
          </span>
        )}
      </header>
      <Markdown md={challenge.prompt} />
      {challenge.kind === 'choice' && (
        <ChoiceBody
          challenge={challenge}
          onAttempt={(ok) => {
            const n = attempts + 1
            setAttempts(n)
            if (ok) win(n)
          }}
        />
      )}
      {challenge.kind === 'number' && (
        <NumberBody
          challenge={challenge}
          done={done}
          onAttempt={(ok) => {
            const n = attempts + 1
            setAttempts(n)
            if (ok) win(n)
          }}
        />
      )}
      {challenge.kind === 'mission' && (
        <>
          <WidgetSlot name={challenge.widget} props={challenge.props} level={level} onComplete={() => win(1)} />
          {done && (
            <p className="feedback ok" role="status">
              Missão cumprida.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function ChoiceBody({
  challenge,
  onAttempt,
}: {
  challenge: Extract<Challenge, { kind: 'choice' }>
  onAttempt: (ok: boolean) => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const opt = picked === null ? null : challenge.options[picked]
  return (
    <>
      <div className="options">
        {challenge.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className={`option${picked === i ? (o.correct ? ' right' : ' wrong') : ''}`}
            aria-pressed={picked === i}
            onClick={() => {
              setPicked(i)
              onAttempt(!!o.correct)
            }}
          >
            <span className="option-key">{String.fromCharCode(65 + i)}</span>
            <Markdown md={o.md} inline />
          </button>
        ))}
      </div>
      {opt && (
        <div className={`feedback ${opt.correct ? 'ok' : 'no'}`} role="status">
          <strong>{opt.correct ? 'Isso. ' : 'Ainda não. '}</strong>
          <Markdown md={opt.feedback} inline />
        </div>
      )}
    </>
  )
}

function NumberBody({
  challenge,
  done,
  onAttempt,
}: {
  challenge: Extract<Challenge, { kind: 'number' }>
  done: boolean
  onAttempt: (ok: boolean) => void
}) {
  const id = useId()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<'ok' | 'no' | null>(null)
  const [showHint, setShowHint] = useState(false)
  const check = () => {
    const v = parseNumber(value)
    if (!value.trim() || Number.isNaN(v)) return
    const ok = Math.abs(v - challenge.answer) <= challenge.tolerance + 1e-12
    setResult(ok ? 'ok' : 'no')
    onAttempt(ok)
  }
  return (
    <>
      <form
        className="number-form"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <label htmlFor={id} className="sr-only">
          Sua resposta
        </label>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder="sua resposta"
          onChange={(e) => {
            setValue(e.target.value)
            setResult(null)
          }}
        />
        <button className="btn" type="submit">
          Verificar
        </button>
        {challenge.hint && !done && (
          <button type="button" className="btn btn-quiet" onClick={() => setShowHint((s) => !s)}>
            {showHint ? 'Esconder dica' : 'Dica'}
          </button>
        )}
      </form>
      {showHint && challenge.hint && (
        <div className="hint">
          <Markdown md={challenge.hint} inline />
        </div>
      )}
      {result === 'no' && (
        <p className="feedback no" role="status">
          Não bateu. Confira a conta e tente de novo.
        </p>
      )}
      {(result === 'ok' || done) && (
        <div className="feedback ok" role="status">
          <strong>Correto. </strong>
          <Markdown md={challenge.explanation} inline />
        </div>
      )}
    </>
  )
}
