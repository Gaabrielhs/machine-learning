import { useMemo, useState, type ReactNode } from 'react'
import { HBars } from '../sleep-debt/charts'
import { int, num } from '../sleep-debt/format'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePresentation } from '../sleep-debt/usePresentation'
import rawData from './gpt-data.json'
import rawModel from './gpt-model.json'
import '../sleep-debt/sleep-debt.css'

type Input = Record<string, string | number>
type Numeric = { name: string; min: number; max: number; integer: boolean }
type Cat = { name: string; levels: string[] }
type Node = { left: number; right: number; feature: number; threshold: number; value: number; n: number }
type Metric = { mae: number; rmse: number; r2: number }
type Data = {
  ready: boolean; shape: [number, number]; target: string; target_label: string; inputs: string[]
  columns: { name: string; label: string; kind: 'num' | 'cat' }[]
  split: { train: number; test: number }; preprocessing: { numeric: Numeric[]; categorical: Cat[]; feature_names: string[] }
  selected: { max_depth: number; min_samples_leaf: number }
  validation: { max_depth: number; min_samples_leaf: number; mae: number; std: number }[]
  metrics: { train: Metric; test: Metric }
  tree: { nodes: number; leaves: number; depth: number; preview: { node: number; depth: number; feature: string; threshold: number; n: number; value: number }[] }
  importance: { name: string; value: number }[]
  examples: { raw: Input; actual: number; prediction: number }[]
  target_summary: { min: number; max: number; mean: number }
}
type Model = { numeric: Numeric[]; categorical: Cat[]; feature_names: string[]; tree: { nodes: Node[] } }
const data = rawData as unknown as Data
const model = rawModel as unknown as Model
const SECTIONS = ['capa', 'problema', 'preparo', 'divisao', 'modelo', 'validacao', 'resultado', 'importancia', 'teste', 'conclusao']

export function GptDecisionTreePage() {
  useDocumentTitle('Dívida de sono · Árvore de decisão')
  const p = usePresentation(SECTIONS)
  if (!data.ready) return <Waiting />
  const labels = Object.fromEntries(data.columns.map((x) => [x.name, x.label]))
  const test = data.metrics.test
  return <div className={`sd${p.on ? ' is-presenting' : ''}`}>
    <div className="sd-bar">
      <span className="sd-bar-title">Dívida de sono × celular · Árvore de decisão (DTR)</span>
      <div className="sd-bar-actions">
        {p.on && <span className="sd-counter">{p.index + 1} / {SECTIONS.length}</span>}
        {p.on && <button type="button" className="btn btn-quiet" onClick={p.prev}>←</button>}
        {p.on && <button type="button" className="btn btn-quiet" onClick={p.next}>→</button>}
        <button type="button" className="btn" onClick={p.toggle}>{p.on ? 'Sair da apresentação' : 'Apresentar'}</button>
      </div>
    </div>
    {!p.on && <p className="sd-hint">Em <strong>Apresentar</strong>, use ← → (ou espaço) para navegar e Esc para sair.</p>}

    <Slide id="capa">
      <p className="sd-kicker">Pós-graduação em Ciência de Dados · Aprendizado de Máquina e Reconhecimento de Padrões · Trabalho 2</p>
      <h1 className="sd-cover-title">Hábitos noturnos e <em>fadiga no dia seguinte</em>: regressão com árvore de decisão</h1>
      <div className="sd-kpis"><Kpi value={int(data.shape[0])} label="pessoas no dataset" /><Kpi value="15" label="atributos de entrada" /><Kpi value={`± ${num(test.mae)}`} label="erro médio absoluto no teste" strong /><Kpi value={num(test.r2)} label="R² em dados novos" strong /></div>
    </Slide>

    <Slide id="problema" step="Contexto" title="O problema e o dataset">
      <p className="sd-lede">A tarefa agora é regressão: estimar a pontuação numérica de fadiga no dia seguinte, em uma escala de {num(data.target_summary.min, 1)} a {num(data.target_summary.max, 1)}, usando perfil, hábitos noturnos e medidas de sono.</p>
      <div className="sd-two"><div><h3>Dataset</h3><p><a href="https://www.kaggle.com/datasets/samartalwar/sleep-debt-and-screen-time-late-night-phone-habits" target="_blank" rel="noreferrer">Sleep Debt &amp; Screen Time: Late Night Phone Habits</a> (Kaggle): {int(data.shape[0])} linhas e {data.shape[1]} colunas.</p><p>Alvo: <code>next_day_fatigue_score</code>, com média {num(data.target_summary.mean)}.</p></div><div><h3>Algoritmo</h3><p><strong>DTR</strong> significa <em>Decision Tree Regressor</em>. Cada folha devolve a média da fadiga das pessoas que chegaram até ela.</p><p>É uma escolha didática: suas regras são legíveis e ela não exige padronização de atributos numéricos.</p></div></div>
    </Slide>

    <Slide id="preparo" step="Notebook · preparação" title="Tratamento dos dados">
      <p className="sd-lede">Removemos o identificador <code>user_id</code>, o alvo e a categoria de dívida de sono. As quatro variáveis categóricas recebem one-hot; as numéricas mantêm a escala original porque a árvore só compara valores com limites.</p>
      <ol className="sd-pipeline"><Pipe n="1" title="Carregar CSV" detail={`${int(data.shape[0])} × ${data.shape[1]}`} /><Pipe n="2" title="Remover colunas" detail="identificador, alvo e classe antiga" /><Pipe n="3" title="One-hot" detail="4 atributos categóricos" /><Pipe n="4" title="Sem z-score" detail="não é necessário para árvores" /><Pipe n="5" title="Matriz final" detail={`${data.preprocessing.feature_names.length} entradas`} accent /></ol>
      <Code code={'X = df.drop(columns=[\"user_id\", \"sleep_debt_category\", \"next_day_fatigue_score\"])\\ny = df[\"next_day_fatigue_score\"]\\n# OneHotEncoder nas categóricas; numéricas passam sem StandardScaler.'} />
    </Slide>

    <Slide id="divisao" step="Notebook · avaliação" title="Treino e teste">
      <p className="sd-lede">Com a semente 42, reservamos {int(data.split.test)} pessoas ({num(data.split.test / data.shape[0] * 100, 0)}%) para o teste final e usamos {int(data.split.train)} no treino. Como o alvo é contínuo, não há estratificação por classe.</p>
      <div className="sd-kpis"><Kpi value={int(data.split.train)} label="amostras de treino" /><Kpi value={int(data.split.test)} label="amostras de teste" /><Kpi value="3" label="partes na validação cruzada" /></div>
    </Slide>

    <Slide id="modelo" step="Notebook · modelo" title="A árvore escolhida">
      <div className="sd-two"><div><h3>Hiperparâmetros</h3><table className="sd-table"><tbody><Row a="critério" b="redução do erro quadrático" /><Row a="profundidade máxima" b={String(data.selected.max_depth)} /><Row a="mínimo por folha" b={String(data.selected.min_samples_leaf)} /><Row a="semente" b="42" /></tbody></table></div><div><h3>Estrutura final</h3><div className="sd-kpis"><Kpi value={int(data.tree.nodes)} label="nós" /><Kpi value={int(data.tree.leaves)} label="folhas" /><Kpi value={String(data.tree.depth)} label="profundidade" /></div></div></div>
      <Code code={`tree = CartRegressor(max_depth=${data.selected.max_depth}, min_samples_leaf=${data.selected.min_samples_leaf})\\ntree.fit(X_train, y_train)`} />
      <h3>Primeiras regras aprendidas</h3>
      <div className="table-scroll"><table className="sd-table"><thead><tr><th>nível</th><th>regra</th><th className="r">pessoas</th><th className="r">média</th></tr></thead><tbody>{data.tree.preview.map((x) => <tr key={x.node}><td>{x.depth}</td><td>se {featureName(x.feature, labels)} ≤ {num(x.threshold)}</td><td className="r">{int(x.n)}</td><td className="r">{num(x.value)}</td></tr>)}</tbody></table></div>
    </Slide>

    <Slide id="validacao" step="Notebook · seleção" title="Validação cruzada">
      <p className="sd-lede">A configuração é escolhida pela menor média do MAE em três divisões do treino. Assim, o teste final não influencia a escolha de profundidade e de tamanho mínimo de folha.</p>
      <div className="table-scroll"><table className="sd-table"><thead><tr><th>profundidade</th><th>mín. por folha</th><th className="r">MAE médio</th><th className="r">desvio</th></tr></thead><tbody>{data.validation.map((x) => <tr key={`${x.max_depth}-${x.min_samples_leaf}`}><td>{x.max_depth}</td><td>{x.min_samples_leaf}</td><td className="r">{num(x.mae)}</td><td className="r">± {num(x.std)}</td></tr>)}</tbody></table></div>
    </Slide>

    <Slide id="resultado" step="Notebook · resultado" title="Resultado no conjunto de teste">
      <div className="sd-kpis"><Kpi value={num(test.mae)} label="MAE: erro absoluto médio" strong /><Kpi value={num(test.rmse)} label="RMSE: penaliza erros grandes" strong /><Kpi value={num(test.r2)} label="R²: variância explicada" strong /><Kpi value={num(data.metrics.train.mae)} label="MAE no treino" /></div>
      <p className="sd-lede">Em média, a previsão fica a {num(test.mae)} ponto(s) da fadiga real no teste. A comparação com o erro de treino mostra o quanto a árvore generaliza.</p>
      <ExampleTable />
    </Slide>

    <Slide id="importancia" step="Interpretação" title="Atributos mais usados pela árvore">
      <p className="sd-lede">A importância soma quanto cada atributo reduziu o erro quadrático, ponderado pelas pessoas que passaram pelo nó. É evidência de uso pelo modelo, não de causalidade.</p>
      <HBars ariaLabel="Importância dos atributos" max={Math.max(...data.importance.map((x) => x.value)) * 1.12} format={(v) => num(v, 3)} labelWidth={245} data={data.importance.map((x, i) => ({ label: featureName(x.name, labels), value: x.value, note: num(x.value, 3), strong: i === 0 }))} />
    </Slide>

    <Slide id="teste" step="Demonstração" title="Teste a árvore">
      <p className="sd-lede">Escolha um exemplo de teste ou altere os atributos. A previsão e o caminho na árvore são calculados no navegador com o modelo exportado pelo notebook.</p>
      <TryTree labels={labels} />
    </Slide>

    <Slide id="conclusao" step="Fechamento" title="Conclusão">
      <ul className="sd-points"><li>A DTR transforma {data.inputs.length} atributos em uma estimativa contínua de fadiga, com <strong>MAE de {num(test.mae)}</strong> no teste.</li><li>One-hot preserva as categorias sem impor ordem; padronização não é necessária para a árvore.</li><li>Os hiperparâmetros foram selecionados por validação cruzada, mantendo o teste isolado.</li><li>Regras, caminho e importância facilitam defender o modelo na apresentação.</li></ul>
    </Slide>
  </div>
}

function Waiting() {
  return <div className="sd"><section className="sd-slide"><div className="sd-slide-inner"><p className="sd-kicker">Trabalho 2 · DTR</p><h1 className="sd-cover-title">Apresentação pronta para receber os <em>resultados do Colab</em>.</h1><p className="sd-lede">Nenhuma métrica foi inventada. Execute o script no Colab, baixe os dois JSONs gerados e substitua os arquivos desta pasta.</p><Code code={'# Após enviar o CSV e gpt_decision_tree_regression.py\\n!python gpt_decision_tree_regression.py --csv bedtime_screentime_sleep_debt.csv --output-dir gpt-export --no-notebook\\n# Copie gpt-export/gpt-data.json e gpt-export/gpt-model.json para esta pasta.'} /></div></section></div>
}

function TryTree({ labels }: { labels: Record<string, string> }) {
  const [choice, setChoice] = useState(0)
  const [input, setInput] = useState<Input>(data.examples[0].raw)
  const [edited, setEdited] = useState(false)
  const result = useMemo(() => evaluate(input), [input])
  const numeric = Object.fromEntries(model.numeric.map((x) => [x.name, x]))
  const categorical = Object.fromEntries(model.categorical.map((x) => [x.name, x]))
  const choose = (i: number) => { setChoice(i); setInput(data.examples[i].raw); setEdited(false) }
  const update = (name: string, value: string | number) => { setInput({ ...input, [name]: value }); setEdited(true) }
  return <div className="sd-try"><div className="sd-ba-pick">{data.examples.map((_, i) => <button type="button" key={i} className={i === choice && !edited ? 'on' : ''} onClick={() => choose(i)}>exemplo {i + 1}</button>)}</div><div className="sd-try-grid"><form className="sd-try-form" onSubmit={(e) => e.preventDefault()}>{data.inputs.map((name) => categorical[name] ? <label className="sd-field" key={name}>{labels[name]}<select value={String(input[name])} onChange={(e) => update(name, e.target.value)}>{categorical[name].levels.map((v) => <option key={v}>{v}</option>)}</select></label> : <label className="sd-field" key={name}>{labels[name]}<div className="sd-field-row"><input type="range" min={numeric[name].min} max={numeric[name].max} step={numeric[name].integer ? 1 : 0.1} value={Number(input[name])} onChange={(e) => update(name, Number(e.target.value))} /><output>{num(Number(input[name]), numeric[name].integer ? 0 : 1)}</output></div></label>)}</form><aside className="sd-try-out"><p className="sd-step">Previsão da árvore</p><p className="sd-try-class">{num(result.value)} <span className="sd-muted">/ 10</span></p>{!edited && <p>Valor real: <strong>{num(data.examples[choice].actual)}</strong> · erro: <strong>{num(Math.abs(data.examples[choice].actual - result.value))}</strong></p>}<h3>Caminho seguido</h3><ol className="sd-points quiet">{result.path.map((x, i) => <li key={i}>{featureName(x.feature, labels)} {x.left ? '≤' : '>'} {num(x.threshold)}</li>)}<li>Folha: média de {int(result.n)} pessoas.</li></ol></aside></div></div>
}

function evaluate(input: Input) {
  const vector = [...model.numeric.map((x) => Number(input[x.name])), ...model.categorical.flatMap((x) => x.levels.map((v) => Number(input[x.name] === v)))]
  let id = 0
  const path: { feature: string; threshold: number; left: boolean }[] = []
  while (model.tree.nodes[id].left !== -1) { const node = model.tree.nodes[id]; const left = vector[node.feature] <= node.threshold; path.push({ feature: model.feature_names[node.feature], threshold: node.threshold, left }); id = left ? node.left : node.right }
  return { value: model.tree.nodes[id].value, n: model.tree.nodes[id].n, path }
}

function featureName(value: string, labels: Record<string, string>) { const [name, level] = value.split('='); return level ? `${labels[name] ?? name}: ${level}` : (labels[name] ?? name) }
function Slide({ id, step, title, children }: { id: string; step?: string; title?: string; children: ReactNode }) { return <section id={id} className="sd-slide"><div className="sd-slide-inner">{step && <p className="sd-step">{step}</p>}{title && <h2>{title}</h2>}{children}</div></section> }
function Kpi({ value, label, strong }: { value: string; label: string; strong?: boolean }) { return <div className={`sd-kpi${strong ? ' strong' : ''}`}><span className="sd-kpi-value">{value}</span><span className="sd-kpi-label">{label}</span></div> }
function Pipe({ n, title, detail, accent }: { n: string; title: string; detail: string; accent?: boolean }) { return <li className={accent ? 'accent' : undefined}><span className="sd-pipe-n">{n}</span><strong>{title}</strong><span className="sd-muted">{detail}</span></li> }
function Row({ a, b }: { a: string; b: string }) { return <tr><td>{a}</td><td className="mono">{b}</td></tr> }
function Code({ code }: { code: string }) { return <details className="sd-code"><summary>Código no notebook</summary><pre><code>{code}</code></pre></details> }
function ExampleTable() { return <div className="table-scroll"><table className="sd-table"><thead><tr><th>caso de teste</th><th className="r">fadiga real</th><th className="r">previsão</th><th className="r">erro absoluto</th></tr></thead><tbody>{data.examples.map((x, i) => <tr key={i}><td>{i + 1}</td><td className="r">{num(x.actual)}</td><td className="r">{num(x.prediction)}</td><td className="r">{num(Math.abs(x.actual - x.prediction))}</td></tr>)}</tbody></table></div> }

export default GptDecisionTreePage

