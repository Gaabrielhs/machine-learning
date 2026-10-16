import { useMemo, useState, type ReactNode } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import raw from './data.json'
import { bandColor, hoursToBandIndex, hoursToHm, int, num, pct } from './format'
import {
  ContinuousHistogram,
  DecisionTreeDiagram,
  DepthLineChart,
  DotWhisker,
  HBars,
  ScatterPlot,
  StackedShare,
} from './treeCharts'
import { TryTreeModel } from './TryTreeModel'
import type { GeminiTreeData } from './types'
import { usePresentation } from './usePresentation'
import '../sleep-debt/sleep-debt.css'
import './gemini-tree.css'

/** Metadados da apresentação (Trabalho 2 · Versão Gemini). */
const META = {
  course:
    'Pós-graduação em Ciência de Dados · Aprendizado de Máquina e Reconhecimento de Padrões · Trabalho 2 (Gemini)',
  authors: [] as string[],
}

const data = raw as unknown as GeminiTreeData
const BANDS = data.bands
const LABEL: Record<string, string> = Object.fromEntries(data.columns.map((c) => [c.name, c.desc]))

const SECTIONS = [
  { id: 'capa', title: 'Capa' },
  { id: 'problema', title: 'Problema e dataset' },
  { id: 'exploracao', title: 'Exploração do alvo' },
  { id: 'preparo', title: 'Tratamento dos dados' },
  { id: 'divisao', title: 'Treino e teste' },
  { id: 'transformacao', title: 'One-hot e escala' },
  { id: 'entrada', title: 'O que entra na árvore' },
  { id: 'modelo', title: 'A Árvore de Decisão' },
  { id: 'treino', title: 'Profundidade e poda' },
  { id: 'resultado', title: 'Resultado no teste' },
  { id: 'arquitetura', title: 'Validação cruzada' },
  { id: 'discussao', title: 'Importância e cenários' },
  { id: 'testar', title: 'Teste o modelo' },
  { id: 'conclusao', title: 'Conclusão' },
] as const

export function GeminiDecisionTreePage() {
  useDocumentTitle('Horas de sono · Árvore de Decisão (Gemini)')
  const p = usePresentation(SECTIONS.map((s) => s.id))
  const m = data.metrics
  const chosenDepthIdx = data.model.depths.indexOf(data.model.max_depth)

  return (
    <div className={`sd${p.on ? ' is-presenting' : ''}`}>
      <div className="sd-bar">
        <span className="sd-bar-title">Horas de sono × celular · Árvore de Decisão (DT · Gemini)</span>
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
          Hábitos noturnos no celular e <em>horas de sono</em>: regressão com Árvore de Decisão
        </h1>
        {META.authors.length > 0 && <p className="sd-authors">{META.authors.join(' · ')}</p>}
        <div className="sd-kpis">
          <Kpi value={int(data.shape[0])} label="pessoas avaliadas no dataset" />
          <Kpi value="15" label="atributos de entrada (4 categóricos, 11 numéricos)" />
          <Kpi value={`${num(data.target.min, 1)}–${num(data.target.max, 1)} h`} label="alvo contínuo (horas de sono)" />
          <Kpi
            value={pct(m.test_r2)}
            label={`de variância explicada (R²) no teste · erro médio de ${num(m.test_mae, 2)} h (~23 min)`}
            strong
          />
        </div>
      </Slide>

      {/* ============================== Problema ============================== */}
      <Slide id="problema" step="Contexto" title="Da classificação à regressão contínua">
        <p className="sd-lede">
          No Trabalho 1, a rede MLP classificou as pessoas em 4 categorias de dívida de sono e mostrou que as horas
          dormidas definiam a classe. Agora, usamos uma <strong>Árvore de Decisão de Regressão (CART)</strong> para
          prever diretamente a variável numérica contínua <code>total_sleep_hours</code> (em horas).
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
              (Kaggle). {int(data.shape[0])} linhas e {data.shape[1]} colunas originais, sem valores ausentes.
            </p>
            <h3>Algoritmo: Decision Tree Regressor (DT / CART)</h3>
            <p>
              Particiona recursivamente os dados com perguntas binárias (<code>Se atributo ≤ limiar</code>) que
              minimizam o <strong>Erro Quadrático Médio (MSE)</strong> dentro de cada folha, prevendo a média das
              amostras que caem na folha.
            </p>
          </div>
          <div>
            <h3>Requisitos do Trabalho 2</h3>
            <table className="sd-table">
              <tbody>
                <ReqRow req="Regressão com Árvore de Decisão (DT)" ok="DecisionTreeRegressor (CART)" />
                <ReqRow req="500 ou mais amostras" ok={`${int(data.shape[0])} amostras`} />
                <ReqRow req="Dataset não clichê e exclusivo" ok="Hábitos de tela noturna e sono" />
                <ReqRow req="Detalhamento do tratamento de dados" ok="Remoção de vazamento, one-hot e escala" />
                <ReqRow req="Avaliação em dados não vistos" ok={`${int(data.split.test)} amostras reservadas para teste`} />
              </tbody>
            </table>
          </div>
        </div>
      </Slide>

      {/* ============================== Exploração ============================== */}
      <Slide id="exploracao" step="Notebook · seção 3" title="Exploração: distribuição contínua do alvo">
        <p className="sd-lede">
          O alvo <code>total_sleep_hours</code> varia continuamente de <strong>{num(data.target.min, 1)} h</strong> a{' '}
          <strong>{num(data.target.max, 1)} h</strong>, com média de{' '}
          <strong>
            {num(data.target.mean, 2)} h ({hoursToHm(data.target.mean)})
          </strong>{' '}
          e desvio-padrão de <strong>{num(data.target.std, 2)} h</strong>. Na regressão, o modelo base (“chutar sempre a
          média do treino”) tem <strong>R² = 0%</strong> e erro quadrático médio (RMSE) de{' '}
          <strong>{num(data.target.baseline_rmse, 2)} h</strong>.
        </p>
        <ContinuousHistogram
          bins={data.sleep_hist.bins}
          counts={data.sleep_hist.counts}
          unit="h"
          meanMarker={{ value: data.target.mean, label: `média: ${num(data.target.mean, 2)} h` }}
          colorBySleepBand
          ariaLabel="Distribuição contínua das horas totais de sono"
        />
        <Legend />
        <details className="sd-more">
          <summary>Todas as 18 colunas do CSV e seu papel na regressão</summary>
          <ColumnsTable />
        </details>
      </Slide>

      {/* ============================== Preparo ============================== */}
      <Slide id="preparo" step="Notebook · seção 4 (Requisito 4)" title="Técnicas de tratamento dos dados">
        <p className="sd-lede">
          Antes de aplicar a Árvore de Decisão, realizamos cinco etapas de higienização e codificação para evitar
          vazamento de informação (<em>data leakage</em>) e representar variáveis categóricas sem criar ordens falsas.
        </p>
        <ol className="sd-pipeline">
          <PipeStep n="1" title="Inspeção e limpeza" detail="0 valores nulos, 0 duplicatas nas 8.500 linhas" />
          <PipeStep n="2" title="Remover user_id" detail="identificador único sem poder de generalização" />
          <PipeStep
            n="3"
            title="Prevenir Data Leakage"
            detail="remover sleep_debt_category (derivada diretamente do alvo)"
          />
          <PipeStep n="4" title="Divisão Treino / Teste" detail="80% treino (6.800) / 20% teste (1.700), semente 42" />
          <PipeStep n="5" title="Categóricas → One-Hot" detail="4 colunas nominais viram 17 colunas binárias (0/1)" />
          <PipeStep n="6" title="Matriz final" detail="11 numéricas + 17 one-hot = 28 entradas" accent />
        </ol>
        <Code>{`# 1. Remoção de identificador e prevenção de vazamento de dados (target leakage):
# 'sleep_debt_category' foi construída a partir de faixas de 'total_sleep_hours'.
COLUNAS_REMOVIDAS = ["user_id", "sleep_debt_category"]
ALVO = "total_sleep_hours"

X = df.drop(columns=COLUNAS_REMOVIDAS + [ALVO])
y = df[ALVO].to_numpy()

# 2. Divisão treino/teste ANTES de ajustar qualquer transformador
X_train_df, X_test_df, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42)

# 3. Codificação One-Hot para categóricas; numéricas mantidas (ou padronizadas para comparação)
preproc = ColumnTransformer([
    ("num", "passthrough", colunas_numericas),
    ("cat", OneHotEncoder(handle_unknown="ignore"), colunas_categoricas),
], sparse_threshold=0)

X_train = preproc.fit_transform(X_train_df)   # ajustado SÓ no treino
X_test  = preproc.transform(X_test_df)`}</Code>
      </Slide>

      {/* ============================== Divisão ============================== */}
      <Slide id="divisao" step="Notebook · seção 4" title="Treino e teste com a mesma distribuição">
        <p className="sd-lede">
          Separamos {int(data.split.train)} amostras para treino (média <strong>{num(data.split.train_mean, 2)} h</strong>
          ) e {int(data.split.test)} para teste (média <strong>{num(data.split.test_mean, 2)} h</strong>). Agrupando o
          alvo contínuo em 4 faixas de horas de sono, verificamos que os dois conjuntos preservam exatamente as mesmas
          proporções.
        </p>
        <StackedShare
          bands={BANDS}
          rows={[
            { label: 'Treino', counts: data.split.train_counts },
            { label: 'Teste', counts: data.split.test_counts },
          ]}
        />
        <Legend />
        <p className="sd-note">
          Toda escolha de profundidade máxima (<code>max_depth</code>) e tamanho mínimo de folha (
          <code>min_samples_leaf</code>) é feita via validação cruzada de 5 pastas apenas dentro das 6.800 amostras de
          treino.
        </p>
      </Slide>

      {/* ============================== Transformação ============================== */}
      <Slide id="transformacao" step="Notebook · seção 4" title="One-Hot Encoding e invariância à escala">
        <div className="sd-two">
          <div>
            <h3>Diferença crucial para a MLP: invariância à escala</h3>
            <p className="sd-formula">
              corte em x ≤ 62,5 min ⇔ corte em z ≤ +0,086
            </p>
            <p>
              Na MLP do Trabalho 1, padronizar com <code>StandardScaler</code> era obrigatório para o gradiente
              descendente convergir. Já a <strong>Árvore de Decisão ordena cada coluna e testa pontos médios</strong>:
              qualquer transformação monotônica (como o z-score) produz exatamente os mesmos cortes!
            </p>
            <p className="sd-note">
              Comprovamos no notebook: treinar a árvore com dados brutos ou padronizados com <code>StandardScaler</code>{' '}
              resulta em <strong>R² = {pct(data.model.invariance_r2_raw, 2)}</strong> vs{' '}
              <strong>R² = {pct(data.model.invariance_r2_zscore, 2)}</strong> (idênticos!). Manter as unidades originais
              torna as regras da árvore imediatamente legíveis em minutos, mg e anos.
            </p>
            <div className="table-scroll">
              <table className="sd-table compact">
                <thead>
                  <tr>
                    <th>atributo numérico</th>
                    <th className="r">média (treino)</th>
                    <th className="r">desvio (treino)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scaler.map((s) => (
                    <tr key={s.name}>
                      <td title={s.name}>{LABEL[s.name]}</td>
                      <td className="r">{num(s.mean)}</td>
                      <td className="r">{num(s.std)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3>Categóricas: One-Hot Encoding</h3>
            <p>
              Como o <code>DecisionTreeRegressor</code> do scikit-learn opera sobre matrizes numéricas, convertemos as 4
              colunas categóricas nominais em 17 indicadores binários (0 ou 1). Um corte em <code>≤ 0,5</code> separa se
              a pessoa pertence (1) ou não (0) àquela categoria.
            </p>
            <ul className="sd-onehot">
              {data.onehot.map((o) => (
                <li key={o.name}>
                  <span className="sd-onehot-name">
                    {LABEL[o.name]} <span className="sd-muted">→ {o.levels.length} colunas</span>
                  </span>
                  <span className="sd-chips">
                    {o.levels.map((l) => (
                      <span key={l} className="sd-chip">
                        {l}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="sd-sum">
              11 numéricas + 17 colunas one-hot = <strong>28 atributos de entrada</strong>
            </p>
          </div>
        </div>
      </Slide>

      {/* ============================== Entrada ============================== */}
      <Slide id="entrada" step="Notebook · seção 4" title="O que entra na Árvore de Decisão">
        <p className="sd-lede">
          Cada participante vira um vetor de 28 números. Compare abaixo a versão nas unidades originais (usada nas
          regras da árvore) e a versão em z-score (usada na MLP), para as mesmas 4 pessoas do Trabalho 1.
        </p>
        <BeforeAfter />
        <div className="sd-shapes">
          <span>
            <code>X_train</code> ({int(data.split.train)}, 28)
          </span>
          <span>
            <code>X_test</code> ({int(data.split.test)}, 28)
          </span>
          <span>
            <code>y</code> contínuo em horas ({num(data.target.min, 1)} a {num(data.target.max, 1)} h)
          </span>
        </div>
      </Slide>

      {/* ============================== Modelo ============================== */}
      <Slide id="modelo" step="Notebook · seção 5" title="O modelo: Árvore de Decisão de Regressão (CART)">
        <p className="sd-lede">
          Ao contrário da MLP (uma caixa-preta com 1.556 pesos), a árvore de decisão é <strong>transparente</strong>:
          começa na raiz com todas as {int(data.split.train)} pessoas (média {num(data.split.train_mean, 2)} h) e faz
          perguntas sucessivas até chegar em <strong>{int(data.model.n_leaves)} folhas</strong>. Veja os 3 primeiros
          níveis da árvore treinada:
        </p>
        <DecisionTreeDiagram root={data.model.top_tree} />
        <div className="sd-two">
          <div>
            <h3>Como a árvore escolhe cada corte?</h3>
            <p>
              Em cada nó, o algoritmo testa todos os 28 atributos e todos os limiares possíveis, escolhendo o par{' '}
              <code>(atributo, limiar)</code> que resulta na maior redução ponderada do{' '}
              <strong>Erro Quadrático Médio (MSE)</strong> entre os filhos esquerdo e direito:
            </p>
            <p className="sd-formula">
              ΔMSE = MSE<sub>pai</sub> − (n<sub>esq</sub>/n · MSE<sub>esq</sub> + n<sub>dir</sub>/n · MSE<sub>dir</sub>)
            </p>
          </div>
          <div className="table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>hiperparâmetro</th>
                  <th>valor</th>
                  <th>por quê</th>
                </tr>
              </thead>
              <tbody>
                <HpRow
                  k="criterion"
                  v='"squared_error"'
                  why="minimiza a variância (MSE) das horas de sono em cada nó"
                />
                <HpRow
                  k="max_depth"
                  v={String(data.model.max_depth)}
                  why="até 6 perguntas seguidas: captura não-linearidades sem decorar ruído"
                />
                <HpRow
                  k="min_samples_leaf"
                  v={String(data.model.min_samples_leaf)}
                  why="cada folha exige pelo menos 20 pessoas para calcular uma média estável"
                />
                <HpRow
                  k="nós / folhas"
                  v={`${data.model.n_nodes} nós / ${data.model.n_leaves} folhas`}
                  why="estrutura compacta e 100% inspecionável"
                />
                <HpRow k="random_state" v="42" why="desempate determinístico e reprodutível" />
              </tbody>
            </table>
          </div>
        </div>
        <Code>{`arvore = DecisionTreeRegressor(
    criterion="squared_error",
    max_depth=6,
    min_samples_leaf=20,
    random_state=42,
)
arvore.fit(X_train, y_train)`}</Code>
      </Slide>

      {/* ============================== Treino / Poda ============================== */}
      <Slide id="treino" step="Notebook · seção 5" title="Profundidade e pré-poda: controlando o Overfitting">
        <p className="sd-lede">
          Se deixarmos a árvore crescer sem limite, ela cria centenas de folhas minúsculas para decorar o treino: o erro
          no treino cai continuamente, mas o erro na validação volta a subir a partir da profundidade 9. Com{' '}
          <code>max_depth = 6</code> e <code>min_samples_leaf = 20</code>, paramos no joelho da curva.
        </p>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>MSE na validação (linha sólida) vs treino (tracejada)</figcaption>
            <DepthLineChart
              depths={data.model.depths}
              primary={data.model.val_mse_curve}
              secondary={data.model.train_mse_curve}
              primaryLabel="validação"
              secondaryLabel="treino"
              yLabel="erro quadrático (h²)"
              format={(v) => num(v, 2)}
              yDomain={[0, 1.0]}
              marker={{ index: chosenDepthIdx, label: `escolhido: prof. ${data.model.max_depth}` }}
              ariaLabel="Erro quadrático médio de treino e validação por profundidade máxima"
            />
          </figure>
          <figure className="sd-fig">
            <figcaption>Coeficiente de determinação (R²) na validação</figcaption>
            <DepthLineChart
              depths={data.model.depths}
              primary={data.model.val_r2_curve}
              yLabel="R² validação"
              format={(v) => pct(v, 1)}
              yDomain={[0.55, 0.92]}
              marker={{ index: chosenDepthIdx, label: `prof. 6: ${pct(data.model.val_r2_curve[chosenDepthIdx], 1)}` }}
              ariaLabel="R² na validação por profundidade máxima"
            />
          </figure>
        </div>
      </Slide>

      {/* ============================== Resultado ============================== */}
      <Slide id="resultado" step="Notebook · seção 6" title="Resultado no conjunto de teste">
        <div className="sd-kpis">
          <Kpi value={pct(m.test_r2)} label="R² no teste (variância explicada)" strong />
          <Kpi value={`${num(m.test_mae, 2)} h`} label={`MAE no teste (~${Math.round(m.test_mae * 60)} min de erro médio)`} strong />
          <Kpi value={`${num(m.test_rmse, 2)} h`} label={`RMSE no teste (treino: ${num(m.train_rmse, 2)} h — sem overfitting)`} />
          <Kpi value={`${num(data.target.baseline_rmse, 2)} h`} label="RMSE de chutar sempre a média (6,26 h)" />
        </div>
        <div className="sd-two">
          <ScatterPlot points={m.scatter} />
          <div>
            <h3>Erro por faixa de horas de sono</h3>
            <div className="table-scroll">
              <table className="sd-table">
                <thead>
                  <tr>
                    <th>faixa real</th>
                    <th className="r">MAE (h)</th>
                    <th className="r">RMSE (h)</th>
                    <th className="r">viés médio</th>
                    <th className="r">amostras</th>
                  </tr>
                </thead>
                <tbody>
                  {m.per_band.map((b, k) => (
                    <tr key={b.label}>
                      <td>
                        <span className="sd-swatch" style={{ background: bandColor(k) }} />
                        {b.label}
                      </td>
                      <td className="r">{num(b.mae, 2)} h</td>
                      <td className="r">{num(b.rmse, 2)} h</td>
                      <td className="r">
                        {b.bias >= 0 ? '+' : ''}
                        {num(b.bias, 2)} h
                      </td>
                      <td className="r">{int(b.support)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figure className="sd-fig" style={{ marginTop: 18 }}>
              <figcaption>Distribuição dos resíduos (previsto − real) no teste</figcaption>
              <ContinuousHistogram
                bins={m.residuals.bins}
                counts={m.residuals.counts}
                unit="h"
                meanMarker={{ value: 0, label: 'erro zero' }}
                ariaLabel="Histograma dos erros de previsão no conjunto de teste"
              />
            </figure>
          </div>
        </div>
      </Slide>

      {/* ============================== Arquitetura / CV ============================== */}
      <Slide id="arquitetura" step="Notebook · seção 7" title="Validação cruzada de hiperparâmetros">
        <p className="sd-lede">
          Comparamos cinco configurações de árvore com validação cruzada de 5 pastas (5-fold CV) apenas no treino.
          Limitar a profundidade em 6 ou 8 com folhas de no mínimo 20 amostras supera claramente a árvore sem limite (que
          sofre <em>overfitting</em> e cai para 82,2%).
        </p>
        <DotWhisker
          domain={[0.8, 0.91]}
          highlight="prof. 6, folha ≥ 20"
          data={data.cv.map((c) => ({ label: c.label, mean: c.mean, std: c.std }))}
        />
        <p className="sd-note">
          Ponto: média do R² nas 5 pastas de validação. Barra: ± um desvio-padrão. Escolhemos{' '}
          <code>prof. 6, folha ≥ 20</code> por atingir 88,3% com metade das folhas da profundidade 8.
        </p>
      </Slide>

      {/* ============================== Discussão ============================== */}
      <Slide id="discussao" step="Notebook · seção 8" title="Discussão: importância das variáveis e cenários">
        <p className="sd-lede">
          Uma grande vantagem da Árvore de Decisão sobre a MLP é medir nativamente a{' '}
          <strong>importância de cada variável</strong> (fração da redução total de MSE na árvore). Quando todas as
          variáveis estão presentes, o cansaço do dia seguinte domina a árvore (88,3% da redução de MSE), seguido pelo
          cronotipo (8,1%) e ocupação (2,2%).
        </p>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>Importância na Árvore completa (% da redução de MSE)</figcaption>
            <HBars
              ariaLabel="Importância de Gini/MSE das variáveis na árvore"
              max={1}
              format={(v) => pct(v, 1)}
              labelWidth={195}
              rowHeight={26}
              data={data.solo.slice(0, 8).map((s, i) => ({
                label: LABEL[s.name],
                value: s.importance,
                strong: i === 0,
                color: i === 0 ? 'var(--sd-series-strong)' : 'var(--sd-series)',
              }))}
            />
          </figure>
          <figure className="sd-fig">
            <figcaption>Poder preditivo isolado (R² usando 1 variável por vez)</figcaption>
            <HBars
              ariaLabel="R² usando um único atributo por vez em uma árvore rasa"
              max={1}
              format={(v) => pct(v, 1)}
              labelWidth={195}
              rowHeight={26}
              data={[...data.solo]
                .sort((a, b) => b.r2 - a.r2)
                .slice(0, 8)
                .map((s, i) => ({
                  label: LABEL[s.name],
                  value: s.r2,
                  strong: i < 2,
                  color: i < 2 ? 'var(--sd-series-strong)' : 'var(--sd-series)',
                }))}
            />
          </figure>
        </div>

        <h3>E se previrmos o sono ANTES de a pessoa dormir (só com hábitos e perfil)?</h3>
        <HBars
          ariaLabel="R² no teste em cada cenário de variáveis"
          max={1}
          format={(v) => pct(v, 1)}
          labelWidth={250}
          data={data.scenarios.map((s) => ({
            label: s.label,
            value: s.r2,
            note: `R² ${pct(s.r2, 1)} · MAE ${num(s.mae, 2)} h`,
            tip: `${s.label} (${s.n_inputs} entradas): R² = ${pct(s.r2, 2)}, MAE = ${num(s.mae, 2)} h, RMSE = ${num(s.rmse, 2)} h`,
          }))}
        />
        <p className="sd-note">
          Cansaço no dia seguinte e sonecas do despertador são consequências medidas <em>depois</em> de acordar. Quando
          removemos todas as medidas pós-sono (“Só hábitos noturnos e perfil”), a árvore passa a usar{' '}
          <strong>minutos de celular na cama, cronotipo, cafeína após 17h e ocupação</strong> e ainda explica{' '}
          <strong>{pct(data.scenarios[2].r2)} da variância</strong> (erro médio de {num(data.scenarios[2].mae, 2)} h,
          contra {num(data.target.baseline_mae, 2)} h do chute pela média).
        </p>
      </Slide>

      {/* ============================== Teste o modelo ============================== */}
      <Slide id="testar" step="Demonstração interativa" title="Teste a Árvore de Decisão">
        <p className="sd-lede">
          Altere os dados de uma pessoa e acompanhe, passo a passo, <strong>quais regras da árvore são ativadas</strong>{' '}
          da raiz até a folha para calcular as horas de sono previstas.
        </p>
        <TryTreeModel bands={BANDS} labels={LABEL} />
      </Slide>

      {/* ============================== Conclusão ============================== */}
      <Slide id="conclusao" step="Fechamento" title="Conclusão: Árvore de Decisão vs MLP">
        <ul className="sd-points">
          <li>
            A Árvore de Decisão de Regressão (<code>max_depth=6</code>, <code>min_samples_leaf=20</code>, 60 folhas)
            explica <strong>{pct(m.test_r2)} da variância (R²)</strong> das horas de sono no conjunto de teste, com erro
            médio absoluto de apenas <strong>{num(m.test_mae, 2)} h (~23 minutos)</strong>.
          </li>
          <li>
            <strong>Tratamento de dados decisivo:</strong> remover <code>sleep_debt_category</code> evitou vazamento de
            alvo (<em>data leakage</em>), e o experimento com/sem <code>StandardScaler</code> comprovou na prática a
            invariância das árvores à escala das variáveis numéricas.
          </li>
          <li>
            <strong>Interpretabilidade vs Caixa-Preta:</strong> enquanto a MLP do Trabalho 1 combinava 1.556 pesos em
            camadas ocultas, cada previsão da árvore é explicada por no máximo <strong>6 regras simples</strong> na
            unidade original dos dados.
          </li>
          <li>
            <strong>Previsão antes de dormir:</strong> mesmo usando apenas hábitos noturnos (celular, cafeína, brilho da
            tela) e perfil demográfico, a árvore mantém <strong>R² = {pct(data.scenarios[2].r2)}</strong>.
          </li>
        </ul>
        <h3>Limitações e próximos passos</h3>
        <ul className="sd-points quiet">
          <li>
            Por prever uma média constante por folha, uma árvore única gera previsões em “degraus” e não extrapola além
            do intervalo observado no treino ({num(data.target.min, 1)} h a {num(data.target.max, 1)} h).
          </li>
          <li>
            Combinar várias árvores via <em>Random Forest</em> ou <em>Gradient Boosting</em> suavizaria esses degraus
            mantendo a facilidade de pré-processamento.
          </li>
        </ul>
      </Slide>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Peças auxiliares                                                    */
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

function HpRow({ k, v, why }: { k: string; v: string; why: string }) {
  return (
    <tr>
      <td>{k}</td>
      <td className="mono">{v}</td>
      <td className="sd-muted">{why}</td>
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

function Legend() {
  return (
    <ul className="sd-legend" aria-label="Legenda das faixas de horas de sono">
      {BANDS.map((b, k) => (
        <li key={b}>
          <span className="sd-swatch" style={{ background: bandColor(k) }} />
          {b}
        </li>
      ))}
    </ul>
  )
}

function ColumnsTable() {
  const kindLabel: Record<string, string> = {
    id: 'identificador (removido)',
    leakage: 'vazamento / derivada do alvo (removida)',
    target: 'alvo contínuo (y)',
    cat: 'categórica (one-hot)',
    num: 'numérica (entrada)',
  }
  return (
    <div className="table-scroll">
      <table className="sd-table compact">
        <thead>
          <tr>
            <th>coluna</th>
            <th>significado</th>
            <th>papel no modelo</th>
            <th>valores</th>
          </tr>
        </thead>
        <tbody>
          {data.columns.map((c) => (
            <tr key={c.name}>
              <td className="mono">{c.name}</td>
              <td>{c.desc}</td>
              <td>{kindLabel[c.kind] ?? c.kind}</td>
              <td className="sd-muted">
                {c.kind === 'num' || c.kind === 'target'
                  ? `${num(c.min ?? 0, 1)} a ${num(c.max ?? 0, 1)} (média ${num(c.mean ?? 0, 1)})`
                  : c.kind === 'cat'
                    ? Object.keys(c.levels ?? {}).join(', ')
                    : c.kind === 'leakage'
                      ? '4 faixas derivadas das horas de sono'
                      : 'único por pessoa'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mostra uma linha bruta do CSV ao lado do vetor de 28 números (unidades originais ou z-score). */
function BeforeAfter() {
  const [sample, setSample] = useState(0)
  const [mode, setMode] = useState<'raw' | 'z'>('raw')
  const [focus, setFocus] = useState<string | null>(null)
  const s = data.samples[sample]
  const inputs = data.columns.filter((c) => c.kind === 'num' || c.kind === 'cat').map((c) => c.name)
  const owner = useMemo(
    () => data.features.map((f) => inputs.find((name) => f === name || f.startsWith(`${name}_`)) ?? f),
    [inputs],
  )
  const scaler = Object.fromEntries(data.scaler.map((x) => [x.name, x]))
  const row = s.raw
  const focused = focus ? scaler[focus] : undefined
  const vec = mode === 'raw' ? s.vec_raw : s.vec_z
  const targetHours = Number(row.total_sleep_hours)
  const bandIdx = hoursToBandIndex(targetHours)

  return (
    <div className="sd-ba">
      <div className="sd-ba-pick" role="radiogroup" aria-label="Amostra">
        {data.samples.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={i === sample}
            className={i === sample ? 'on' : ''}
            onClick={() => setSample(i)}
          >
            {x.id}
          </button>
        ))}
      </div>
      <div className="sd-ba-grid">
        <div className="sd-ba-col">
          <h3>Antes: linha do CSV (15 atributos)</h3>
          <table className="sd-table compact">
            <tbody>
              {inputs.map((name) => (
                <tr
                  key={name}
                  className={focus === name ? 'hot' : ''}
                  tabIndex={0}
                  onPointerEnter={() => setFocus(name)}
                  onClick={() => setFocus(name)}
                  onFocus={() => setFocus(name)}
                >
                  <td>{LABEL[name]}</td>
                  <td className="r mono">
                    {typeof row[name] === 'number' ? num(row[name] as number, 1).replace(',0', '') : row[name]}
                  </td>
                </tr>
              ))}
              <tr className="sd-target-row">
                <td>alvo contínuo (y)</td>
                <td className="r">
                  <span className="sd-swatch" style={{ background: bandColor(bandIdx) }} />
                  <span className="mono">{num(targetHours, 2)} h</span> ({hoursToHm(targetHours)})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="sd-ba-col">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <h3>Depois: 28 entradas da árvore</h3>
            <div className="sd-mode-switch" role="group" aria-label="Escala das variáveis numéricas">
              <button type="button" className={mode === 'raw' ? 'on' : ''} onClick={() => setMode('raw')}>
                Unidades originais
              </button>
              <button type="button" className={mode === 'z' ? 'on' : ''} onClick={() => setMode('z')}>
                Padronizado (z-score)
              </button>
            </div>
          </div>
          <p className="sd-calc" aria-live="polite">
            {focused
              ? mode === 'raw'
                ? `${LABEL[focused.name]}: mantido na unidade original (${num(row[focused.name] as number, 1)}) — a árvore corta direto nesse valor`
                : `${LABEL[focused.name]}: (${num(row[focused.name] as number, 1)} − ${num(focused.mean)}) / ${num(focused.std)} = ${num(s.vec_z[data.features.indexOf(focused.name)], 2)}`
              : focus
                ? `${LABEL[focus]}: One-Hot Encoding (1 na categoria da pessoa, 0 nas demais)`
                : 'Toque ou passe o mouse num atributo à esquerda.'}
          </p>
          <ol className="sd-vec">
            {data.features.map((f, i) => {
              const v = vec[i]
              const isNum = i < data.scaler.length
              const hot = owner[i] === focus
              const zVal = s.vec_z[i]
              return (
                <li key={f} className={`${hot ? 'hot' : ''}${!isNum && v === 0 ? ' zero' : ''}`}>
                  <span className="sd-vec-i">{i}</span>
                  <span className="sd-vec-name" title={f}>
                    {isNum ? LABEL[f] : f.replace(`${owner[i]}_`, '')}
                  </span>
                  {isNum ? (
                    <span className="sd-zbar" aria-hidden="true">
                      <i
                        style={{
                          left: zVal < 0 ? `${50 + Math.max(-3, zVal) * (50 / 3)}%` : '50%',
                          width: `${Math.min(3, Math.abs(zVal)) * (50 / 3)}%`,
                        }}
                      />
                    </span>
                  ) : (
                    <span className="sd-zbar empty" aria-hidden="true" />
                  )}
                  <span className="sd-vec-v mono">
                    {isNum ? (mode === 'raw' ? num(v, 1).replace(',0', '') : num(v, 2)) : v.toFixed(0)}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}

export default GeminiDecisionTreePage
