import { useState } from 'react'
import { int } from '../sleep-debt/format'
import { hourShade, hours, question } from './labels'
import { isLeaf, type ExportedTree } from './model'

/** A árvore inteira como lista recolhível: cada linha é uma resposta e o que acontece depois dela. */
export function TreeExplorer({ model, initialDepth = 2 }: { model: ExportedTree; initialDepth?: number }) {
  const [open, setOpen] = useState<Set<number>>(() => {
    const s = new Set<number>()
    const walk = (id: number, d: number) => {
      if (d >= initialDepth || isLeaf(model, id)) return
      s.add(id)
      walk(model.tree.left[id], d + 1)
      walk(model.tree.right[id], d + 1)
    }
    walk(0, 0)
    return s
  })
  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const all = () => setOpen(new Set(model.tree.left.flatMap((l, id) => (l >= 0 ? [id] : []))))
  const none = () => setOpen(new Set([0]))

  return (
    <div className="ct-explorer">
      <div className="ct-explorer-actions">
        <button type="button" className="btn btn-quiet" onClick={all}>
          Abrir tudo
        </button>
        <button type="button" className="btn btn-quiet" onClick={none}>
          Recolher
        </button>
      </div>
      <ul className="ct-outline" role="tree" aria-label="Árvore de decisão completa">
        <Node model={model} id={0} answer={null} open={open} toggle={toggle} depth={0} />
      </ul>
    </div>
  )
}

function Node({
  model,
  id,
  answer,
  open,
  toggle,
  depth,
}: {
  model: ExportedTree
  id: number
  answer: string | null
  open: Set<number>
  toggle: (id: number) => void
  depth: number
}) {
  const { left, right, feature, threshold, value, n } = model.tree
  const leaf = isLeaf(model, id)
  const q = leaf ? null : question(model.features[feature[id]], threshold[id])
  const expanded = open.has(id)
  return (
    <li role="treeitem" aria-expanded={leaf ? undefined : expanded} aria-level={depth + 1}>
      <button
        type="button"
        className={`ct-row${leaf ? ' leaf' : ''}`}
        onClick={() => !leaf && toggle(id)}
        disabled={leaf}
      >
        <span className="ct-caret" aria-hidden="true">
          {leaf ? '•' : expanded ? '▾' : '▸'}
        </span>
        {answer && <span className="ct-answer">{answer}</span>}
        <span className="ct-row-text">{leaf ? 'previsão' : q!.text}</span>
        <span className="ct-row-n sd-muted">{int(n[id])}</span>
        <span className="ct-row-v mono">
          <i style={{ background: hourShade(value[id]) }} aria-hidden="true" />
          {hours(value[id])}
        </span>
      </button>
      {!leaf && expanded && (
        <ul role="group">
          <Node model={model} id={left[id]} answer={q!.left} open={open} toggle={toggle} depth={depth + 1} />
          <Node model={model} id={right[id]} answer={q!.right} open={open} toggle={toggle} depth={depth + 1} />
        </ul>
      )}
    </li>
  )
}
