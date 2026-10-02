import { useId } from 'react'
import { LEVEL_INFO, LEVELS, type Level } from '../core/types'

interface Props {
  value: Level
  onChange: (l: Level) => void
  compact?: boolean
}

export function DifficultySwitch({ value, onChange, compact }: Props) {
  const name = useId()
  return (
    <fieldset className={`difficulty${compact ? ' compact' : ''}`}>
      <legend className="sr-only">Nível de dificuldade</legend>
      {LEVELS.map((l, i) => (
        <label key={l} className={`difficulty-opt lvl-${l}${value === l ? ' on' : ''}`}>
          <input type="radio" name={name} className="sr-only" checked={value === l} onChange={() => onChange(l)} />
          <span className="pips" aria-hidden="true">
            {LEVELS.map((x, k) => (
              <i key={x} className={k <= i ? 'on' : ''} />
            ))}
          </span>
          {LEVEL_INFO[l].label}
        </label>
      ))}
    </fieldset>
  )
}
