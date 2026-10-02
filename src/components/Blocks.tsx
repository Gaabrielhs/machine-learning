import type { Block, CalloutTone, Level } from '../core/types'
import { ChallengeView } from './ChallengeView'
import { Markdown } from './Markdown'
import { WidgetSlot } from './WidgetSlot'

const TONE_LABEL: Record<CalloutTone, string> = {
  tip: 'Dica',
  warn: 'Atenção',
  example: 'Exemplo',
  deep: 'Para ir mais fundo',
}

export function Blocks({ blocks, level }: { blocks: Block[]; level?: Level }) {
  return (
    <div className="blocks">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'md':
            return <Markdown key={i} md={b.md} />
          case 'callout':
            return (
              <aside key={i} className={`callout callout-${b.tone}`}>
                <div className="callout-label">{b.title ?? TONE_LABEL[b.tone]}</div>
                <Markdown md={b.md} />
              </aside>
            )
          case 'reveal':
            return (
              <details key={i} className="reveal">
                <summary>{b.summary}</summary>
                <Markdown md={b.md} />
              </details>
            )
          case 'widget':
            return <WidgetSlot key={i} name={b.widget} props={b.props} level={level} caption={b.caption} />
          case 'check':
            return <ChallengeView key={i} challenge={b.challenge} level={level ?? 'medium'} practice />
        }
      })}
    </div>
  )
}
