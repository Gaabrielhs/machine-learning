import { useId } from 'react'

interface Props<T extends string | number> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}

/** Grupo de opções exclusivas com <input type="radio"> nativo (teclado e leitores de tela grátis). */
export function Segmented<T extends string | number>({ label, value, options, onChange, className }: Props<T>) {
  const name = useId()
  return (
    <fieldset className={`segmented ${className ?? ''}`}>
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label key={String(o.value)} className={o.value === value ? 'on' : ''}>
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}
