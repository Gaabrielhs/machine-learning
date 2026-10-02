import { memo, type ComponentProps } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { dedent, normalizeDisplayMath } from './text'

const Link = ({ href, children, ...rest }: ComponentProps<'a'>) => {
  const external = !!href && /^https?:/.test(href)
  return (
    <a href={href} {...rest} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}

const TableWrap = (props: ComponentProps<'table'>) => (
  <div className="table-scroll">
    <table {...props} />
  </div>
)

const blockComponents: Components = { a: Link, table: TableWrap }
const inlineComponents: Components = { a: Link, p: ({ children }) => <>{children}</> }

interface Props {
  md: string
  /** renderiza sem <p> externo (para rótulos e opções) */
  inline?: boolean
  className?: string
}

export const Markdown = memo(function Markdown({ md, inline, className }: Props) {
  const body = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inline ? inlineComponents : blockComponents}
    >
      {normalizeDisplayMath(dedent(md))}
    </ReactMarkdown>
  )
  if (inline) return <span className={className}>{body}</span>
  return <div className={className ?? 'prose'}>{body}</div>
})
