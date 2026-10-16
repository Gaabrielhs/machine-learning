import type { ReactNode } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { HBars } from '../sleep-debt/charts'
import { int, num, pct } from '../sleep-debt/format'
import { usePresentation } from '../sleep-debt/usePresentation'
import '../sleep-debt/sleep-debt.css'
import { ComplexityCurve, GridHeatmap, Histogram, Scatter, TopTree } from './charts'
import raw from './data.json'
import { featureLabel, hm, hours, LEVEL_PT, minutes, SHORT } from './labels'
import modelRaw from './model.json'
import type { ExportedTree } from './model'
import { TreeExplorer } from './TreeExplorer'
import { TryTree } from './TryTree'
import type { Role, TreeData } from './types'
import './sleep-hours.css'

/** Preencha para mostrar na capa. */
const META = {
  course: 'Pós-graduação em Ciência de Dados · Aprendizado de Máquina e Reconhecimento de Padrões · Trabalho 2',
  authors: [] as string[],
}

const data = raw as unknown as TreeData
const model = modelRaw as unknown as ExportedTree
const LABEL: Record<string, string> = Object.fromEntries(data.columns.map((c) => [c.name, c.desc]))

const SECTIONS = [
  { id: 'capa', title: 'Capa' },
  { id: 'problema', title: 'Problema e dataset' },
  { id: 'alvo', title: 'O alvo' },
  { id: 'relacoes', title: 'O que anda junto com o sono' },
  { id: 'colunas', title: 'Quais colunas entram' },
  { id: 'preparo', title: 'Preparação dos dados' },
  { id: 'escala', title: 'Sem padronização' },
  { id: 'divisao', title: 'Treino e teste' },
  { id: 'como-aprende', title: 'Como a árvore aprende' },
  { id: 'hiperparametros', title: 'Escolha dos hiperparâmetros' },
  { id: 'arvore', title: 'A árvore final' },
  { id: 'resultado', title: 'Resultado' },
  { id: 'importancia', title: 'Importância dos atributos' },
  { id: 'discussao', title: 'Discussão' },
  { id: 'testar', title: 'Teste o modelo' },
  { id: 'comparacao', title: 'Árvore × MLP' },
  { id: 'conclusao', title: 'Conclusão' },
] as const

const ROLE: Record<Role, { label: string; why: string }> = {
  input: { label: 'entra', why: '' },
  target: { label: 'alvo', why: 'o que queremos prever' },
  id: { label: 'removida', why: 'identificador: não generaliza' },
  leak: { label: 'removida', why: 'é uma faixa de horas de sono: vazaria a resposta' },
  night: { label: 'removida', why: 'medida da mesma noite que queremos prever' },
  morning: { label: 'removida', why: 'consequência medida na manhã seguinte' },
}

export function SleepHoursPage() {
  useDocumentTitle('Horas de sono · Árvore de decisão')
  const p = usePresentation(SECTIONS.map((s) => s.id))
  const m = data.metrics
  const fs = data.first_split
  const g = data.grid
  const bestRow = g.depths.indexOf(String(g.best.max_depth ?? 'none'))
  const bestCol = g.leaves.indexOf(g.best.min_samples_leaf)
  const depthLabels = g.depths.map((d) => (d === 'none' ? '∞' : d))
  const inputs = data.columns.filter((c) => c.role === 'input')
  const removed = data.columns.filter((c) => c.role !== 'input' && c.role !== 'target')
  const nOneHot = data.onehot.reduce((a, o) => a + o.levels.length, 0)
  const topImp = data.importance.slice(0, 6)
  const restImp = data.importance.slice(6).reduce((a, d) => a + d.value, 0)
  const chrono = data.cat_means.find((c) => c.name === 'chronotype')!
  const occupation = data.cat_means.find((c) => c.name === 'occupation_type')!
  const appMeans = data.cat_means.find((c) => c.name === 'primary_bedtime_app')!
  const [, nightOnly, morning] = data.scenarios

  return (
    <div className={`sd ct${p.on ? ' is-presenting' : ''}`}>
      <div className="sd-bar">
        <span className="sd-bar-title">Horas de sono × celular · Árvore de decisão</span>
        <div className="sd-bar-actions">
          {p.on && (
            <span className="sd-counter" aria-live="polite">
              {p.index + 1} / {SECTIONS.length}
            </span>
          )}
          {p.on && (
            <>
              <button type="button" className="btn btn-quiet" onClick={p.prev} aria-label="Seção anterior">
                ←
              </button>
              <button type="button" className="btn btn-quiet" onClick={p.next} aria-label="Próxima seção">
                →
              </button>
            </>
          )}
          <button type="button" className="btn" onClick={p.toggle}>
            {p.on ? 'Sair da apresentação' : 'Apresentar'}
          </button>
        </div>
      </div>
      {!p.on && (
        <p className="sd-hint">
          Em <strong>Apresentar</strong>, cada seção ocupa a tela; use ← → (ou espaço) para navegar e Esc para sair.
        </p>
      )}

      {/* ============================== Capa ============================== */}
      <Slide id="capa">
        <p className="sd-kicker">{META.course}</p>
        <h1 className="sd-cover-title">
          Quantas horas você vai dormir? <em>Regressão com árvore de decisão</em>
        </h1>
        {META.authors.length > 0 && <p className="sd-authors">{META.authors.join(' · ')}</p>}
        <div className="sd-kpis">
          <Kpi value={int(data.shape[0])} label="pessoas no dataset" />
          <Kpi value={String(inputs.length)} label="atributos de perfil e hábitos usados como entrada" />
          <Kpi value={num(m.test.r2, 2)} label="de R² em dados nunca vistos no treino" strong />
          <Kpi value={minutes(m.test.mae)} label="de erro médio na previsão das horas de sono" strong />
        </div>
      </Slide>

      {/* ============================== Problema ============================== */}
      <Slide id="problema" step="Contexto" title="O problema e o dataset">
        <p className="sd-lede">
          A partir do perfil de uma pessoa e dos seus hábitos à noite (celular, cafeína, atividade física), prever{' '}
          <strong>quantas horas ela vai dormir</strong>. O alvo é um número contínuo: um problema de regressão.
        </p>
        <div className="sd-two">
          <div>
            <h3>Dataset</h3>
            <p>
              <a
                href="https://www.kaggle.com/datasets/samartalwar/sleep-debt-and-screen-time-late-night-phone-habits"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sleep Debt &amp; Screen Time: Late Night Phone Habits
              </a>{' '}
              (Kaggle). {int(data.shape[0])} linhas, {data.shape[1]} colunas, nenhum valor ausente. É o mesmo dataset da
              etapa 1, em que uma MLP classificava a categoria de dívida de sono.
            </p>
            <h3>Algoritmo</h3>
            <p>
              Árvore de decisão para regressão, com o <code>DecisionTreeRegressor</code> do scikit-learn.
            </p>
          </div>
          <div>
            <h3>Requisitos do trabalho</h3>
            <table className="sd-table">
              <tbody>
                <ReqRow req="Algoritmo de regressão" ok="árvore de decisão" />
                <ReqRow req="500 ou mais amostras" ok={`${int(data.shape[0])} amostras`} />
                <ReqRow req="Dataset pouco comum" ok="não é um dos clássicos de curso" />
                <ReqRow req="Tratamento dos dados detalhado" ok="seções 5 a 8 desta apresentação" />
                <ReqRow req="Avaliar em dados fora do treino" ok={`${int(data.split.test)} amostras de teste`} />
              </tbody>
            </table>
          </div>
        </div>
      </Slide>

      {/* ============================== Alvo ============================== */}
      <Slide id="alvo" step="Notebook · seção 3" title="O alvo: horas de sono">
        <p className="sd-lede">
          As pessoas dormem entre {hours(data.target.min, 1)} e {hours(data.target.max, 1)}, com média de{' '}
          {hm(data.target.mean)} e desvio-padrão de {hm(data.target.std)}. Um modelo que chutasse sempre a média
          erraria, em média, {minutes(m.baseline.mae)}: essa é a referência a vencer.
        </p>
        <figure className="sd-fig">
          <figcaption>Distribuição das horas de sono ({int(data.shape[0])} pessoas)</figcaption>
          <Histogram
            bins={data.target.bins}
            counts={data.target.counts}
            xLabel="horas de sono"
            binLabel={(a, b) => `${num(a)} h a ${num(b)} h`}
            ticks={[3, 4, 5, 6, 7, 8, 9, 10]}
            tickFormat={(v) => `${v} h`}
            marker={{ value: data.target.mean, label: `média ${hours(data.target.mean)}` }}
            ariaLabel="Histograma das horas de sono"
          />
        </figure>
      </Slide>

      {/* ============================== Relações ============================== */}
      <Slide id="relacoes" step="Notebook · seção 3" title="O que anda junto com as horas de sono">
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>Correlação de cada coluna numérica com as horas de sono</figcaption>
            <HBars
              ariaLabel="Correlação de cada atributo numérico com as horas de sono"
              max={1}
              format={(v) => num(v)}
              labelWidth={190}
              rowHeight={26}
              data={data.corr.map((c) => ({
                label: SHORT[c.name],
                value: Math.abs(c.r),
                note: num(c.r),
                color: c.r < 0 ? 'var(--neg)' : 'var(--pos)',
                strong: data.columns.find((x) => x.name === c.name)?.role === 'input',
                tip: `${LABEL[c.name]}: correlação ${num(c.r)}`,
              }))}
            />
            <p className="sd-note">
              Laranja: correlação negativa (mais disso, menos sono). Em negrito, as colunas que entram no modelo. As
              duas mais fortes (cansaço e despertador adiado) são consequências do sono, não causas.
            </p>
          </figure>
          <div>
            <h3>Média de horas por categoria</h3>
            <CatMeans title="Cronotipo" rows={chrono.levels} />
            <CatMeans title="Ocupação" rows={occupation.levels} />
            <p className="sd-note">
              Noturnos dormem {hm(chrono.levels[chrono.levels.length - 1].mean - chrono.levels[0].mean)} a menos que
              matutinos. Já o app usado quase não muda nada: de {hours(appMeans.levels[0].mean)} a{' '}
              {hours(appMeans.levels[appMeans.levels.length - 1].mean)}.
            </p>
          </div>
        </div>
      </Slide>

      {/* ============================== Colunas ============================== */}
      <Slide id="colunas" step="Notebook · seção 4 · tratamento" title="Quais colunas podem entrar no modelo">
        <p className="sd-lede">
          Das 17 colunas além do alvo, {removed.length} ficam de fora. A principal é <code>sleep_debt_category</code>:
          ela é uma faixa de horas de sono, então usá-la seria entregar a resposta ao modelo (<em>vazamento do alvo</em>
          ).
        </p>
        <div className="sd-two">
          <div>
            <h3>Entram ({inputs.length})</h3>
            <ul className="ct-cols">
              {inputs.map((c) => (
                <li key={c.name}>
                  <span className="ct-badge in">{c.kind === 'cat' ? 'categórica' : 'numérica'}</span>
                  {c.desc}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Ficam de fora ({removed.length})</h3>
            <ul className="ct-cols">
              {removed.map((c) => (
                <li key={c.name}>
                  <span className="ct-badge out">{ROLE[c.role].label}</span>
                  <span>
                    {c.desc} <span className="sd-muted">· {ROLE[c.role].why}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="sd-note">
              Latência, sono profundo, REM, cansaço e despertador só existem durante ou depois da noite que queremos
              prever. A seção Discussão mostra o que acontece se elas forem mantidas.
            </p>
          </div>
        </div>
      </Slide>

      {/* ============================== Preparo ============================== */}
      <Slide id="preparo" step="Notebook · seção 4 · tratamento" title="Preparação dos dados">
        <p className="sd-lede">
          Toda transformação que aprende algo com os dados é ajustada só no treino e depois aplicada ao teste. Para a
          árvore, o tratamento é mais simples que na MLP: só as categóricas precisam mudar.
        </p>
        <ol className="sd-pipeline">
          <PipeStep n="1" title="Carregar o CSV" detail={`${int(data.shape[0])} × ${data.shape[1]}, sem ausentes`} />
          <PipeStep
            n="2"
            title="Remover colunas"
            detail={`${removed.length} colunas: id, vazamento e medidas do sono`}
          />
          <PipeStep n="3" title="Separar treino e teste" detail="80/20, aleatório (semente 42)" />
          <PipeStep n="4a" title="Categóricas → one-hot" detail={`4 colunas viram ${nOneHot}`} />
          <PipeStep n="4b" title="Numéricas: como estão" detail={`${data.numeric.length} colunas, sem padronizar`} />
          <PipeStep n="5" title="Matriz final" detail={`${data.features.length} colunas numéricas`} accent />
        </ol>
        <Code>{`COLUNAS_REMOVIDAS = ["user_id", "sleep_debt_category",                       # id e vazamento
                     "sleep_latency_min", "deep_sleep_pct", "rem_sleep_pct",      # medidas da noite
                     "next_day_fatigue_score", "morning_alarm_snoozes"]           # consequências
X = df.drop(columns=COLUNAS_REMOVIDAS + ["total_sleep_hours"])
y = df["total_sleep_hours"].to_numpy()

X_train_df, X_test_df, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

preproc = ColumnTransformer([
    ("num", "passthrough", colunas_numericas),                        # numéricas entram como estão
    ("cat", OneHotEncoder(handle_unknown="ignore"), colunas_categoricas),
], sparse_threshold=0)
X_train = preproc.fit_transform(X_train_df)   # fit SÓ no treino
X_test = preproc.transform(X_test_df)`}</Code>
        <div className="sd-two">
          <div>
            <h3>Categóricas: one-hot</h3>
            <p>
              O scikit-learn só aceita números. Trocar TikTok por 0 e YouTube por 1 criaria uma ordem que não existe;
              com one-hot cada categoria vira uma coluna 0/1.
            </p>
          </div>
          <ul className="sd-onehot">
            {data.onehot.map((o) => (
              <li key={o.name}>
                <span className="sd-onehot-name">
                  {SHORT[o.name]} <span className="sd-muted">→ {o.levels.length} colunas</span>
                </span>
                <span className="sd-chips">
                  {o.levels.map((l) => (
                    <span key={l} className="sd-chip">
                      {LEVEL_PT[l] ?? l}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Slide>

      {/* ============================== Escala ============================== */}
      <Slide id="escala" step="Notebook · seção 4 · tratamento" title="Por que não padronizar as numéricas">
        <p className="sd-lede">
          Na MLP, o z-score era obrigatório. Na árvore, não muda nada: cada nó só compara um atributo com um limiar, e
          mudar a escala muda o limiar junto, sem mudar quem vai para cada lado.
        </p>
        <div className="sd-two">
          <div className="ct-eq">
            <p className="ct-eq-row">
              <span className="sd-muted">valor original</span>
              <code>celular ≤ 84,5 min</code>
            </p>
            <p className="ct-eq-arrow" aria-hidden="true">
              ⇕ mesmas pessoas de cada lado
            </p>
            <p className="ct-eq-row">
              <span className="sd-muted">com z-score</span>
              <code>
                z ≤ (84,5 − {num(data.scale_check.phone_mean, 1)}) / {num(data.scale_check.phone_std, 1)} ={' '}
                {num((84.5 - data.scale_check.phone_mean) / data.scale_check.phone_std, 2)}
              </code>
            </p>
          </div>
          <div>
            <h3>Conferido no notebook</h3>
            <p>
              Treinamos a mesma árvore com e sem z-score. A maior diferença entre as {int(data.split.test)} previsões do
              teste foi <strong>{num(data.scale_check.max_diff, 1)}</strong>.
            </p>
            <p className="sd-note">
              Pelo mesmo motivo, outliers nas numéricas (cafeína até 250 mg, por exemplo) não atrapalham a árvore: só a
              ordem dos valores importa.
            </p>
          </div>
        </div>
      </Slide>

      {/* ============================== Divisão ============================== */}
      <Slide id="divisao" step="Notebook · seção 4" title="Treino e teste">
        <p className="sd-lede">
          {int(data.split.train)} pessoas para treino e {int(data.split.test)} para teste. Na regressão não há classes
          para estratificar; a divisão é aleatória, e o alvo ficou com a mesma distribuição nos dois conjuntos.
        </p>
        <div className="sd-kpis">
          <Kpi value={int(data.split.train)} label="treino (80%): escolhe os hiperparâmetros e treina a árvore" />
          <Kpi value={int(data.split.test)} label="teste (20%): usado uma única vez, no final" />
          <Kpi
            value={`${hours(data.split.train_mean)}`}
            label={`média no treino (desvio ${hours(data.split.train_std)})`}
          />
          <Kpi
            value={`${hours(data.split.test_mean)}`}
            label={`média no teste (desvio ${hours(data.split.test_std)})`}
          />
        </div>
        <p className="sd-note">
          Dentro do treino, a validação cruzada de 5 partes separa um pedaço diferente a cada rodada para comparar
          hiperparâmetros sem tocar no teste.
        </p>
      </Slide>

      {/* ============================== Como aprende ============================== */}
      <Slide id="como-aprende" step="Algoritmo" title="Como a árvore aprende">
        <p className="sd-lede">
          A árvore testa todas as perguntas possíveis (cada atributo, cada limiar) e escolhe a que deixa os dois grupos
          mais homogêneos, ou seja, a que mais reduz o erro quadrático. Depois repete o processo dentro de cada grupo.
        </p>
        <div className="sd-two">
          <div>
            <h3>A primeira pergunta: “{featureLabel(fs.feature)}?”</h3>
            <table className="sd-table">
              <thead>
                <tr>
                  <th>grupo</th>
                  <th className="r">pessoas</th>
                  <th className="r">média</th>
                  <th className="r">variância</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>todos (raiz)</td>
                  <td className="r">{int(fs.root.n)}</td>
                  <td className="r">{hours(fs.root.mean)}</td>
                  <td className="r">{num(fs.root.var)}</td>
                </tr>
                <tr>
                  <td>não noturnos</td>
                  <td className="r">{int(fs.left.n)}</td>
                  <td className="r">{hours(fs.left.mean)}</td>
                  <td className="r">{num(fs.left.var)}</td>
                </tr>
                <tr>
                  <td>noturnos</td>
                  <td className="r">{int(fs.right.n)}</td>
                  <td className="r">{hours(fs.right.mean)}</td>
                  <td className="r">{num(fs.right.var)}</td>
                </tr>
              </tbody>
            </table>
            <p className="sd-note">
              Só essa pergunta já elimina {pct(fs.gain)} do erro quadrático da raiz. Isso equivale a um R² de{' '}
              {num(fs.gain, 2)} com um único “sim ou não”.
            </p>
          </div>
          <div>
            <h3>Critério de divisão</h3>
            <p className="sd-formula">
              ganho = n·Var(pai) − n<sub>esq</sub>·Var(esq) − n<sub>dir</sub>·Var(dir)
            </p>
            <p>
              A previsão de uma folha é a <strong>média</strong> das horas de sono das pessoas de treino que chegaram
              nela. Sem limite, a árvore continua dividindo até cada folha ter uma pessoa só, e decora o treino.
            </p>
          </div>
        </div>
        <figure className="sd-fig">
          <figcaption>Os três primeiros níveis da árvore final (cor: menos horas = mais escuro)</figcaption>
          <TopTree model={model} levels={3} />
        </figure>
      </Slide>

      {/* ============================== Hiperparâmetros ============================== */}
      <Slide id="hiperparametros" step="Notebook · seção 5" title="Escolha dos hiperparâmetros">
        <p className="sd-lede">
          Testamos {g.depths.length} profundidades × {g.leaves.length} tamanhos mínimos de folha com validação cruzada
          de 5 partes, só no treino. A melhor combinação foi{' '}
          <strong>max_depth = {g.best.max_depth ?? 'sem limite'}</strong> e{' '}
          <strong>min_samples_leaf = {g.best.min_samples_leaf}</strong>, com R² médio de {num(g.best.score, 3)} na
          validação.
        </p>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>R² no treino e na validação (min_samples_leaf = 1)</figcaption>
            <ComplexityCurve labels={depthLabels} train={g.curves['1'].train} val={g.curves['1'].val} best={bestRow} />
            <p className="sd-note">
              A partir da profundidade {(g.best.max_depth ?? 0) + 1}, o treino continua melhorando, mas a validação
              piora: a árvore começa a decorar. Sem limite (∞), chega a R² = 1 no treino e{' '}
              {num(g.curves['1'].val[g.curves['1'].val.length - 1], 2)} na validação.
            </p>
          </figure>
          <figure className="sd-fig">
            <figcaption>R² na validação para cada combinação</figcaption>
            <GridHeatmap rows={depthLabels} cols={g.leaves} values={g.test} best={[bestRow, bestCol]} />
            <p className="sd-note">
              Folhas maiores (50, 100) evitam o overfitting mesmo em árvores fundas, mas perdem detalhe.
            </p>
          </figure>
        </div>
        <Code>{`busca = GridSearchCV(
    DecisionTreeRegressor(criterion="squared_error", random_state=42),
    {"max_depth": list(range(1, 16)) + [None], "min_samples_leaf": [1, 5, 10, 20, 50, 100]},
    cv=5, scoring="r2", return_train_score=True)
busca.fit(X_train, y_train)`}</Code>
      </Slide>

      {/* ============================== Árvore ============================== */}
      <Slide id="arvore" step="Notebook · seção 6" title="A árvore final">
        <div className="sd-kpis">
          <Kpi value={String(data.tree_stats.depth)} label="níveis de perguntas, no máximo" />
          <Kpi value={String(data.tree_stats.leaves)} label="folhas: previsões possíveis" />
          <Kpi value={String(data.tree_stats.nodes)} label="nós no total" />
          <Kpi value={String(g.best.min_samples_leaf)} label="pessoas de treino, no mínimo, em cada folha" />
        </div>
        <p className="sd-lede">
          Toda a árvore cabe numa lista. Clique numa pergunta para abrir as respostas; o número cinza é quantas pessoas
          de treino passaram por ali, e a etiqueta é a média de horas delas.
        </p>
        <TreeExplorer model={model} />
      </Slide>

      {/* ============================== Resultado ============================== */}
      <Slide id="resultado" step="Notebook · seção 7" title="Resultado no conjunto de teste">
        <div className="sd-kpis">
          <Kpi value={num(m.test.r2, 3)} label="R² no teste: a árvore explica cerca de 80% da variação" strong />
          <Kpi value={minutes(m.test.mae)} label={`erro médio absoluto (MAE = ${hours(m.test.mae)})`} strong />
          <Kpi value={minutes(m.test.rmse)} label={`RMSE (${hours(m.test.rmse)}): pune mais os erros grandes`} />
          <Kpi value={minutes(m.baseline.mae)} label="erro médio de quem chuta sempre a média" />
        </div>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>Previsto × real ({int(data.split.test)} pessoas de teste)</figcaption>
            <Scatter real={data.scatter.real} pred={data.scatter.pred} />
          </figure>
          <div className="sd-stack">
            <figure className="sd-fig">
              <figcaption>Erro de cada previsão (previsto − real)</figcaption>
              <Histogram
                bins={data.residuals.bins}
                counts={data.residuals.counts}
                xLabel="erro, em horas"
                binLabel={(a, b) => `erro entre ${num(a, 1)} h e ${num(b, 1)} h`}
                ticks={[-3, -2, -1, 0, 1, 2, 3]}
                tickFormat={(v) => (v > 0 ? `+${v}` : String(v).replace('-', '−'))}
                marker={{ value: 0, label: 'sem erro' }}
                ariaLabel="Histograma dos erros no teste"
              />
            </figure>
            <ul className="sd-points quiet">
              <li>
                {pct(m.within_30, 0)} das previsões erram por no máximo 30 min; {pct(m.within_60, 0)}, por no máximo 1
                h.
              </li>
              <li>
                Treino (R² {num(m.train.r2, 3)}) e teste (R² {num(m.test.r2, 3)}) quase iguais: sem overfitting.
              </li>
              <li>
                As previsões formam faixas horizontais: a árvore só devolve {m.distinct_predictions} valores diferentes
                no teste, um por folha.
              </li>
            </ul>
          </div>
        </div>
      </Slide>

      {/* ============================== Importância ============================== */}
      <Slide id="importancia" step="Notebook · seção 8" title="Importância dos atributos">
        <p className="sd-lede">
          Quanto cada entrada reduziu o erro quadrático, somando todas as divisões em que foi usada. Quatro atributos
          fazem quase todo o trabalho.
        </p>
        <HBars
          ariaLabel="Importância de cada entrada da árvore"
          max={Math.max(...topImp.map((d) => d.value)) * 1.1}
          format={(v) => pct(v)}
          labelWidth={240}
          data={[
            ...topImp.map((d, i) => ({
              label: featureLabel(d.name),
              value: d.value,
              strong: i < 2,
              color: i < 2 ? 'var(--sd-series-strong)' : 'var(--sd-series)',
            })),
            {
              label: `outras ${data.importance.length - topImp.length} entradas`,
              value: restImp,
              color: 'var(--line)',
            },
          ]}
        />
        <p className="sd-note">
          App usado, brilho da tela, gênero e idade quase não aparecem na árvore. Isso bate com a exploração: a média de
          horas mal muda entre essas categorias.
        </p>
      </Slide>

      {/* ============================== Discussão ============================== */}
      <Slide id="discussao" step="Notebook · seção 9" title="Discussão: e se usássemos as medidas do sono?">
        <p className="sd-lede">
          Repetimos a mesma divisão, o mesmo pré-processamento e a mesma busca de hiperparâmetros com outros conjuntos
          de colunas.
        </p>
        <HBars
          ariaLabel="R² no teste em cada cenário de atributos"
          max={1}
          format={(v) => num(v, 2)}
          labelWidth={220}
          data={data.scenarios.map((s, i) => ({
            label: s.label,
            value: s.r2,
            strong: i === 0,
            color: i === 0 ? 'var(--sd-series-strong)' : 'var(--sd-series)',
            note: `R² ${num(s.r2, 2)} · ${minutes(s.mae)}`,
            tip: `${s.label} (${s.n_inputs} atributos, profundidade ${s.best.max_depth}): R² ${num(s.r2, 3)}, erro médio ${minutes(s.mae)}`,
          }))}
        />
        <ul className="sd-points">
          <li>As medidas da noite (latência, sono profundo, REM) quase não ajudam: R² de {num(nightOnly.r2, 2)}.</li>
          <li>
            Cansaço e despertador adiado sobem o R² para {num(morning.r2, 2)} e o erro cai para {minutes(morning.mae)}.
            Mas são <em>efeitos</em> de ter dormido pouco: o modelo melhora no número e deixa de servir para prever o
            sono antes de ele acontecer.
          </li>
        </ul>
      </Slide>

      {/* ============================== Teste ============================== */}
      <Slide id="testar" step="Demonstração" title="Teste o modelo">
        <p className="sd-lede">
          Preencha os dados de uma pessoa e veja quantas horas a árvore prevê, com o caminho de perguntas até a folha.
        </p>
        <TryTree labels={LABEL} />
      </Slide>

      {/* ============================== Comparação ============================== */}
      <Slide id="comparacao" step="Etapa 1 × etapa 2" title="Árvore de decisão × MLP">
        <div className="table-scroll">
          <table className="sd-table">
            <thead>
              <tr>
                <th>aspecto</th>
                <th>Etapa 1: MLP</th>
                <th>Etapa 2: árvore de decisão</th>
              </tr>
            </thead>
            <tbody>
              <CmpRow k="Tarefa" a="classificação (4 categorias de dívida de sono)" b="regressão (horas de sono)" />
              <CmpRow k="Numéricas" a="z-score obrigatório" b="sem transformação: só a ordem importa" />
              <CmpRow k="Categóricas" a="one-hot" b="one-hot" />
              <CmpRow k="Hiperparâmetros" a="camadas, taxa de aprendizado, lote" b="max_depth, min_samples_leaf" />
              <CmpRow k="Contra overfitting" a="early stopping e L2" b="limite de profundidade e folhas mínimas" />
              <CmpRow
                k="Interpretação"
                a="1.556 pesos, difícil de explicar"
                b={`${data.tree_stats.leaves} folhas, cada previsão é uma sequência de perguntas`}
              />
              <CmpRow k="Saída" a="probabilidade contínua por classe" b="valor constante por folha (em degraus)" />
            </tbody>
          </table>
        </div>
      </Slide>

      {/* ============================== Conclusão ============================== */}
      <Slide id="conclusao" step="Fechamento" title="Conclusão">
        <ul className="sd-points">
          <li>
            Só com perfil e hábitos, a árvore prevê as horas de sono com <strong>R² de {num(m.test.r2, 2)}</strong> e{' '}
            <strong>erro médio de {minutes(m.test.mae)}</strong>, contra {minutes(m.baseline.mae)} de quem chuta a
            média.
          </li>
          <li>
            O tratamento dos dados foi decisivo: tirar a categoria de dívida de sono (vazamento) e as medidas
            posteriores ao sono deixa o modelo honesto.
          </li>
          <li>
            A profundidade controla o overfitting: com {g.best.max_depth} níveis, treino e teste têm o mesmo desempenho.
          </li>
          <li>
            Tempo de celular antes de dormir, ser noturno e trabalhar em turnos na saúde explicam quase tudo. App,
            brilho e gênero quase não importam.
          </li>
        </ul>
        <h3>Próximos passos</h3>
        <ul className="sd-points quiet">
          <li>Floresta aleatória ou boosting para suavizar a previsão em degraus de uma árvore só.</li>
          <li>Poda por custo-complexidade (ccp_alpha) como alternativa ao limite de profundidade.</li>
        </ul>
      </Slide>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Peças                                                              */
/* ------------------------------------------------------------------ */

function Slide({ id, step, title, children }: { id: string; step?: string; title?: string; children: ReactNode }) {
  return (
    <section id={id} className="sd-slide" aria-labelledby={title ? `${id}-t` : undefined}>
      <div className="sd-slide-inner">
        {step && <p className="sd-step">{step}</p>}
        {title && <h2 id={`${id}-t`}>{title}</h2>}
        {children}
      </div>
    </section>
  )
}

function Kpi({ value, label, strong }: { value: string; label: string; strong?: boolean }) {
  return (
    <div className={`sd-kpi${strong ? ' strong' : ''}`}>
      <span className="sd-kpi-value">{value}</span>
      <span className="sd-kpi-label">{label}</span>
    </div>
  )
}

function ReqRow({ req, ok }: { req: string; ok: string }) {
  return (
    <tr>
      <td>
        <span className="sd-check" aria-hidden="true">
          ✓
        </span>{' '}
        {req}
      </td>
      <td className="sd-muted">{ok}</td>
    </tr>
  )
}

function CmpRow({ k, a, b }: { k: string; a: string; b: string }) {
  return (
    <tr>
      <td>
        <strong>{k}</strong>
      </td>
      <td className="sd-muted">{a}</td>
      <td>{b}</td>
    </tr>
  )
}

function PipeStep({ n, title, detail, accent }: { n: string; title: string; detail: string; accent?: boolean }) {
  return (
    <li className={accent ? 'accent' : undefined}>
      <span className="sd-pipe-n">{n}</span>
      <strong>{title}</strong>
      <span className="sd-muted">{detail}</span>
    </li>
  )
}

function Code({ children }: { children: string }) {
  return (
    <details className="sd-code">
      <summary>Código no notebook</summary>
      <pre>
        <code>{children}</code>
      </pre>
    </details>
  )
}

function CatMeans({ title, rows }: { title: string; rows: { level: string; mean: number; n: number }[] }) {
  return (
    <figure className="sd-fig ct-catmeans">
      <figcaption>{title}</figcaption>
      <HBars
        ariaLabel={`Média de horas de sono por ${title.toLowerCase()}`}
        max={8}
        format={(v) => hours(v)}
        labelWidth={170}
        rowHeight={26}
        data={rows.map((r) => ({
          label: LEVEL_PT[r.level] ?? r.level,
          value: r.mean,
          note: hours(r.mean),
          tip: `${LEVEL_PT[r.level] ?? r.level}: ${int(r.n)} pessoas, média ${hours(r.mean)}`,
        }))}
      />
    </figure>
  )
}

export default SleepHoursPage
