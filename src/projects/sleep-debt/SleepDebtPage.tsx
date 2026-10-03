import { useMemo, useState, type ReactNode } from 'react'
import { NetDiagram } from '../../components/NetDiagram'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { ConfusionMatrix, DotWhisker, HBars, LineChart, SmallHistograms, StackedShare } from './charts'
import { classColor, int, num, pct } from './format'
import raw from './data.json'
import type { SleepDebtData } from './types'
import { TryModel } from './TryModel'
import { usePresentation } from './usePresentation'
import './sleep-debt.css'

/** Preencha para mostrar na capa. */
const META = {
  course: 'Pós-graduação · Trabalho 1 · Classificação de padrões',
  authors: [] as string[],
}

const data = raw as unknown as SleepDebtData

const CLASSES = ['Recuperação ótima', 'Déficit leve', 'Dívida moderada', 'Dívida severa']
const LABEL: Record<string, string> = Object.fromEntries(data.columns.map((c) => [c.name, c.desc]))

const SECTIONS = [
  { id: 'capa', title: 'Capa' },
  { id: 'problema', title: 'Problema e dataset' },
  { id: 'exploracao', title: 'Exploração' },
  { id: 'preparo', title: 'Preparação dos dados' },
  { id: 'divisao', title: 'Treino e teste' },
  { id: 'transformacao', title: 'Padronização e one-hot' },
  { id: 'entrada', title: 'O que entra na MLP' },
  { id: 'modelo', title: 'O modelo' },
  { id: 'treino', title: 'Treinamento' },
  { id: 'resultado', title: 'Resultado' },
  { id: 'arquitetura', title: 'Escolha da arquitetura' },
  { id: 'discussao', title: 'Discussão' },
  { id: 'testar', title: 'Teste o modelo' },
  { id: 'conclusao', title: 'Conclusão' },
] as const

export function SleepDebtPage() {
  useDocumentTitle('Dívida de sono · MLP')
  const p = usePresentation(SECTIONS.map((s) => s.id))
  const m = data.metrics
  const bestEpoch = data.model.val_scores.indexOf(Math.max(...data.model.val_scores))

  return (
    <div className={`sd${p.on ? ' is-presenting' : ''}`}>
      <div className="sd-bar">
        <span className="sd-bar-title">Dívida de sono × celular · MLP</span>
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
          Celular na hora de dormir e <em>dívida de sono</em>: classificação com uma rede MLP
        </h1>
        {META.authors.length > 0 && <p className="sd-authors">{META.authors.join(' · ')}</p>}
        <div className="sd-kpis">
          <Kpi value={int(data.shape[0])} label="pessoas no dataset" />
          <Kpi value="16" label="atributos de entrada (4 categóricos, 12 numéricos)" />
          <Kpi value="4" label="classes de dívida de sono" />
          <Kpi value={pct(m.test_acc)} label="de acurácia em dados nunca vistos no treino" strong />
        </div>
      </Slide>

      {/* ============================== Problema ============================== */}
      <Slide id="problema" step="Contexto" title="O problema e o dataset">
        <p className="sd-lede">
          Dado o perfil de uma pessoa, seus hábitos com o celular à noite e medidas do sono, prever em qual das quatro
          categorias de dívida de sono ela está.
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
              (Kaggle). {int(data.shape[0])} linhas, {data.shape[1]} colunas, nenhum valor ausente.
            </p>
            <h3>Algoritmo</h3>
            <p>
              Perceptron multicamadas (MLP), com o <code>MLPClassifier</code> do scikit-learn como implementação de
              referência.
            </p>
          </div>
          <div>
            <h3>Requisitos do trabalho</h3>
            <table className="sd-table">
              <tbody>
                <ReqRow req="Multiclasse" ok={`${CLASSES.length} classes`} />
                <ReqRow req="Categóricas e numéricas" ok="4 categóricas, 12 numéricas" />
                <ReqRow req="10 ou mais atributos" ok="16 atributos originais" />
                <ReqRow req="500 ou mais amostras" ok={`${int(data.shape[0])} amostras`} />
                <ReqRow req="Avaliar em dados fora do treino" ok={`${int(data.split.test)} amostras de teste`} />
              </tbody>
            </table>
          </div>
        </div>
      </Slide>

      {/* ============================== Exploração ============================== */}
      <Slide id="exploracao" step="Notebook · seção 3" title="Exploração: classes desbalanceadas">
        <p className="sd-lede">
          Mais da metade das pessoas está em dívida moderada; a classe severa tem só{' '}
          {pct(data.class_counts[3] / data.shape[0])}. Um modelo que sempre chutasse “dívida moderada” já acertaria{' '}
          {pct(data.baseline_majority)}. Por isso a divisão é estratificada e o resultado é medido também com F1 macro,
          que dá o mesmo peso a cada classe.
        </p>
        <HBars
          ariaLabel="Número de pessoas em cada classe"
          max={Math.max(...data.class_counts) * 1.08}
          format={int}
          labelWidth={160}
          data={data.class_counts.map((c, k) => ({
            label: CLASSES[k],
            value: c,
            color: classColor(k),
            note: `${int(c)} · ${pct(c / data.shape[0])}`,
            tip: `${CLASSES[k]} (${data.classes[k]}): ${int(c)} pessoas`,
          }))}
        />
        <details className="sd-more">
          <summary>Todas as colunas</summary>
          <ColumnsTable />
        </details>
      </Slide>

      {/* ============================== Preparo ============================== */}
      <Slide id="preparo" step="Notebook · seção 4" title="Preparação dos dados">
        <p className="sd-lede">
          Toda transformação que aprende algo com os dados (médias, desvios, categorias) é ajustada só no treino e
          depois aplicada ao teste. Assim o teste continua sendo dado que o modelo nunca viu.
        </p>
        <ol className="sd-pipeline">
          <PipeStep n="1" title="Carregar o CSV" detail={`${int(data.shape[0])} × ${data.shape[1]}`} />
          <PipeStep n="2" title="Remover user_id" detail="identificador único, não generaliza" />
          <PipeStep n="3" title="Separar treino e teste" detail="80/20, estratificado pelas classes" />
          <PipeStep n="4a" title="Numéricas → z-score" detail="12 colunas, StandardScaler" />
          <PipeStep n="4b" title="Categóricas → one-hot" detail="4 colunas viram 17" />
          <PipeStep n="5" title="Matriz final" detail="29 colunas numéricas" accent />
        </ol>
        <Code>{`X = df.drop(columns=["user_id", ALVO])
y = df[ALVO].map({c: i for i, c in enumerate(CLASSES)}).to_numpy()

X_train_df, X_test_df, y_train, y_test = train_test_split(
    X, y, test_size=0.20, stratify=y, random_state=42)

preproc = ColumnTransformer([
    ("num", StandardScaler(), colunas_numericas),
    ("cat", OneHotEncoder(handle_unknown="ignore"), colunas_categoricas),
], sparse_threshold=0)

X_train = preproc.fit_transform(X_train_df)   # fit SÓ no treino
X_test = preproc.transform(X_test_df)         # teste usa as estatísticas do treino`}</Code>
      </Slide>

      {/* ============================== Divisão ============================== */}
      <Slide id="divisao" step="Notebook · seção 4" title="Treino e teste com as mesmas proporções">
        <p className="sd-lede">
          {int(data.split.train)} amostras para treino e {int(data.split.test)} para teste. Com <code>stratify=y</code>,
          cada classe aparece na mesma proporção nos dois conjuntos. O teste só é usado uma vez, no final.
        </p>
        <StackedShare
          classes={CLASSES}
          rows={[
            { label: 'Treino', counts: data.split.train_counts },
            { label: 'Teste', counts: data.split.test_counts },
          ]}
        />
        <Legend />
        <p className="sd-note">
          Dentro do treino, o <code>MLPClassifier</code> ainda separa 10% como validação para decidir quando parar
          (early stopping).
        </p>
      </Slide>

      {/* ============================== Transformação ============================== */}
      <Slide id="transformacao" step="Notebook · seção 4" title="Padronização e one-hot">
        <div className="sd-two">
          <div>
            <h3>Numéricas: z-score</h3>
            <p className="sd-formula">
              x′ = (x − média<sub>treino</sub>) / desvio<sub>treino</sub>
            </p>
            <p>
              Cafeína vai de 0 a 250 mg; o filtro de luz azul é 0 ou 1. Sem padronizar, os atributos de escala grande
              dominam a soma ponderada de cada neurônio e o gradiente descendente converge mal.
            </p>
            <div className="table-scroll">
              <table className="sd-table compact">
                <thead>
                  <tr>
                    <th>atributo</th>
                    <th className="r">média</th>
                    <th className="r">desvio</th>
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
            <h3>Categóricas: one-hot</h3>
            <p>
              Cada categoria vira uma coluna 0/1. Usar números inteiros (TikTok = 0, YouTube = 1, …) criaria uma ordem
              que não existe entre as categorias.
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
              12 numéricas + 17 colunas one-hot = <strong>29 entradas</strong>
            </p>
          </div>
        </div>
      </Slide>

      {/* ============================== Entrada ============================== */}
      <Slide id="entrada" step="Notebook · seção 4" title="O que entra na MLP">
        <p className="sd-lede">
          Cada pessoa vira um vetor de 29 números. Escolha uma amostra do treino e passe o mouse num atributo para ver
          de onde vem cada coluna.
        </p>
        <BeforeAfter />
        <div className="sd-shapes">
          <span>
            <code>X_train</code> ({int(data.split.train)}, 29)
          </span>
          <span>
            <code>X_test</code> ({int(data.split.test)}, 29)
          </span>
          <span>
            <code>y</code> inteiros 0–3
          </span>
        </div>
      </Slide>

      {/* ============================== Modelo ============================== */}
      <Slide id="modelo" step="Notebook · seção 5" title="O modelo: 29 → 32 → 16 → 4">
        <div className="sd-two">
          <div>
            <NetDiagram
              sizes={data.model.layers}
              maxNodes={8}
              height={230}
              labels={{ outputs: CLASSES.map((c) => c.split(' ')[1] ?? c) }}
            />
            <p className="sd-note">
              {int(data.model.params)} parâmetros treináveis (pesos e vieses). Saída softmax com uma probabilidade por
              classe.
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
                  k="camadas ocultas"
                  v="(32, 16)"
                  why="capacidade suficiente sem exagero (ver validação cruzada)"
                />
                <HpRow k="ativação" v="ReLU" why="não satura; treina rápido" />
                <HpRow k="otimizador" v="Adam, η = 0,001" why="ajusta o passo por parâmetro; robusto" />
                <HpRow k="mini-lote" v="64" why="bom equilíbrio entre ruído e velocidade" />
                <HpRow k="L2 (alpha)" v="0,0001" why="regularização leve" />
                <HpRow k="early stopping" v="10% validação, paciência 15" why="para quando a validação não melhora" />
                <HpRow k="semente" v="42" why="resultados reproduzíveis" />
              </tbody>
            </table>
          </div>
        </div>
        <Code>{`mlp = MLPClassifier(hidden_layer_sizes=(32, 16), activation="relu", solver="adam",
                    learning_rate_init=1e-3, batch_size=64, alpha=1e-4, max_iter=300,
                    early_stopping=True, validation_fraction=0.1, n_iter_no_change=15,
                    random_state=42)
mlp.fit(X_train, y_train)`}</Code>
      </Slide>

      {/* ============================== Treino ============================== */}
      <Slide id="treino" step="Notebook · seção 5" title="Treinamento">
        <p className="sd-lede">
          A perda cai rápido nas primeiras épocas. A acurácia de validação atinge o máximo na época {bestEpoch + 1};
          depois de mais de 15 épocas seguidas sem melhora (a paciência do early stopping), o treino para na época{' '}
          {data.model.n_iter} e fica com os pesos da melhor época.
        </p>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>Perda de treino (entropia cruzada)</figcaption>
            <LineChart
              values={data.model.loss_curve}
              yLabel="perda"
              format={(v) => num(v, 2)}
              yDomain={[0, Math.ceil(data.model.loss_curve[0] * 10) / 10]}
              ariaLabel="Perda de treino por época"
            />
          </figure>
          <figure className="sd-fig">
            <figcaption>Acurácia na validação</figcaption>
            <LineChart
              values={data.model.val_scores}
              yLabel="acurácia"
              format={(v) => pct(v, 1)}
              yDomain={[Math.floor(Math.min(...data.model.val_scores) * 20) / 20, 1]}
              marker={{ index: bestEpoch, label: `melhor: ${pct(data.model.best_val)}` }}
              ariaLabel="Acurácia de validação por época"
            />
          </figure>
        </div>
      </Slide>

      {/* ============================== Resultado ============================== */}
      <Slide id="resultado" step="Notebook · seção 6" title="Resultado no conjunto de teste">
        <div className="sd-kpis">
          <Kpi value={pct(m.test_acc)} label="acurácia no teste" strong />
          <Kpi value={pct(m.f1_macro)} label="F1 macro no teste" strong />
          <Kpi value={pct(m.train_acc)} label="acurácia no treino (sem overfitting relevante)" />
          <Kpi value={pct(data.baseline_majority)} label="chutar sempre a classe mais comum" />
        </div>
        <div className="sd-two">
          <ConfusionMatrix matrix={m.confusion} classes={CLASSES} />
          <div className="table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>classe</th>
                  <th className="r">precisão</th>
                  <th className="r">revocação</th>
                  <th className="r">F1</th>
                  <th className="r">amostras</th>
                </tr>
              </thead>
              <tbody>
                {m.per_class.map((c, k) => (
                  <tr key={k}>
                    <td>
                      <span className="sd-swatch" style={{ background: classColor(k) }} />
                      {CLASSES[k]}
                    </td>
                    <td className="r">{pct(c.precision)}</td>
                    <td className="r">{pct(c.recall)}</td>
                    <td className="r">{pct(c.f1)}</td>
                    <td className="r">{int(c.support)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sd-note">
              Os erros acontecem entre classes vizinhas (moderada × severa, leve × moderada), nunca entre extremos. A
              classe mais difícil é a severa, a menor do dataset.
            </p>
          </div>
        </div>
      </Slide>

      {/* ============================== Arquitetura ============================== */}
      <Slide id="arquitetura" step="Notebook · seção 7" title="Escolha da arquitetura">
        <p className="sd-lede">
          Comparamos quatro arquiteturas com validação cruzada de 5 partes, só no treino. As diferenças ficam dentro da
          variação entre as partes: o problema não exige uma rede grande.
        </p>
        <DotWhisker
          domain={[0.95, 0.98]}
          highlight="(32, 16)"
          data={data.cv.map((c) => ({ label: `(${c.layers.join(', ')})`, mean: c.mean, std: c.std }))}
        />
        <p className="sd-note">Ponto: média do F1 macro. Barra: ± um desvio-padrão entre as 5 partes.</p>
      </Slide>

      {/* ============================== Discussão ============================== */}
      <Slide id="discussao" step="Notebook · seção 8" title="Discussão: o peso das horas de sono">
        <p className="sd-lede">
          Usando um único atributo por vez, as horas de sono sozinhas já acertam {pct(data.solo[0].acc)} das classes. A
          categoria de dívida de sono é, na prática, uma faixa de horas dormidas.
        </p>
        <div className="sd-stack">
          <figure className="sd-fig">
            <figcaption>
              Acurácia usando só um atributo (árvore de profundidade 3, validação cruzada no treino)
            </figcaption>
            <HBars
              ariaLabel="Acurácia de cada atributo usado sozinho"
              max={1}
              format={(v) => pct(v)}
              labelWidth={200}
              rowHeight={24}
              reference={{ value: data.baseline_majority, label: 'classe mais comum' }}
              data={data.solo.map((s, i) => ({
                label: LABEL[s.name],
                value: s.acc,
                strong: i === 0,
                color: i === 0 ? 'var(--sd-series-strong)' : 'var(--sd-series)',
              }))}
            />
          </figure>
          <figure className="sd-fig">
            <figcaption>Horas de sono em cada classe</figcaption>
            <SmallHistograms bins={data.sleep_hist.bins} counts={data.sleep_hist.counts} classes={CLASSES} />
          </figure>
        </div>
        <h3>E sem as medidas de sono?</h3>
        <HBars
          ariaLabel="Acurácia no teste em cada cenário de atributos"
          max={1}
          format={(v) => pct(v)}
          labelWidth={200}
          reference={{ value: data.baseline_majority, label: 'classe mais comum' }}
          data={data.scenarios.map((s) => ({
            label: s.label,
            value: s.acc,
            note: `${pct(s.acc)} · F1 ${pct(s.f1)}`,
            tip: `${s.label} (${s.n_inputs} entradas): acurácia ${pct(s.acc)}, F1 macro ${pct(s.f1)}`,
          }))}
        />
        <p className="sd-note">
          “Só hábitos e perfil” remove horas de sono, latência, sono profundo, REM, cansaço no dia seguinte e
          despertadores adiados: medidas do próprio sono ou consequências dele. Mesmo assim, o uso do celular, a cafeína
          e o cronotipo levam a {pct(data.scenarios[2].acc)} de acurácia, bem acima dos {pct(data.baseline_majority)} do
          chute.
        </p>
      </Slide>

      {/* ============================== Teste ============================== */}
      <Slide id="testar" step="Demonstração" title="Teste o modelo">
        <p className="sd-lede">
          Preencha os dados de uma pessoa e veja a classe que a MLP treinada prevê. Comece por um exemplo real do
          conjunto de teste e mude os valores para ver como a previsão reage.
        </p>
        <TryModel classes={CLASSES} labels={LABEL} />
      </Slide>

      {/* ============================== Conclusão ============================== */}
      <Slide id="conclusao" step="Fechamento" title="Conclusão">
        <ul className="sd-points">
          <li>
            Com padronização, one-hot e divisão estratificada, a MLP 29 → 32 → 16 → 4 chega a{' '}
            <strong>{pct(m.test_acc)} de acurácia</strong> e <strong>{pct(m.f1_macro)} de F1 macro</strong> em dados que
            nunca viu.
          </li>
          <li>Treino e teste têm desempenho parecido: o early stopping evitou overfitting.</li>
          <li>Os poucos erros ficam entre classes vizinhas, e a classe severa, a menor, é a mais difícil.</li>
          <li>
            O resultado alto depende das horas de sono, que praticamente definem a classe. Só com hábitos e perfil, a
            rede ainda acerta {pct(data.scenarios[2].acc)}.
          </li>
        </ul>
        <h3>Próximos passos</h3>
        <ul className="sd-points quiet">
          <li>Implementar a mesma MLP só com NumPy e comparar com o scikit-learn usando exatamente a mesma divisão.</li>
          <li>Tratar o desbalanceamento (pesos por classe) no cenário sem as medidas de sono.</li>
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
    <ul className="sd-legend" aria-label="Legenda das classes">
      {CLASSES.map((c, k) => (
        <li key={c}>
          <span className="sd-swatch" style={{ background: classColor(k) }} />
          {c}
        </li>
      ))}
    </ul>
  )
}

function ColumnsTable() {
  return (
    <div className="table-scroll">
      <table className="sd-table compact">
        <thead>
          <tr>
            <th>coluna</th>
            <th>significado</th>
            <th>tipo</th>
            <th>valores</th>
          </tr>
        </thead>
        <tbody>
          {data.columns.map((c) => (
            <tr key={c.name}>
              <td className="mono">{c.name}</td>
              <td>{c.desc}</td>
              <td>{{ id: 'identificador', target: 'alvo', cat: 'categórica', num: 'numérica' }[c.kind]}</td>
              <td className="sd-muted">
                {c.kind === 'num'
                  ? `${num(c.min ?? 0, 1)} a ${num(c.max ?? 0, 1)} (média ${num(c.mean ?? 0, 1)})`
                  : c.kind === 'cat'
                    ? Object.keys(c.levels ?? {}).join(', ')
                    : c.kind === 'target'
                      ? '4 classes'
                      : 'único por pessoa'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Uma linha bruta do CSV ao lado do vetor de 29 números que vai para a rede. */
function BeforeAfter() {
  const [sample, setSample] = useState(0)
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
  const target = data.classes.indexOf(row.sleep_debt_category as string)

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
          <h3>Antes: linha do CSV</h3>
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
                <td>alvo</td>
                <td className="r">
                  <span className="sd-swatch" style={{ background: classColor(target) }} />
                  {CLASSES[target]} → <span className="mono">{target}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="sd-ba-col">
          <h3>Depois: 29 entradas da rede</h3>
          <p className="sd-calc" aria-live="polite">
            {focused
              ? `${LABEL[focused.name]}: (${num(row[focused.name] as number, 1)} − ${num(focused.mean)}) / ${num(focused.std)} = ${num(s.vec[data.features.indexOf(focused.name)], 2)}`
              : focus
                ? `${LABEL[focus]}: uma coluna por categoria, 1 na categoria da pessoa`
                : 'Toque ou passe o mouse num atributo.'}
          </p>
          <ol className="sd-vec">
            {data.features.map((f, i) => {
              const v = s.vec[i]
              const isNum = i < data.scaler.length
              const hot = owner[i] === focus
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
                          left: v < 0 ? `${50 + Math.max(-3, v) * (50 / 3)}%` : '50%',
                          width: `${Math.min(3, Math.abs(v)) * (50 / 3)}%`,
                        }}
                      />
                    </span>
                  ) : (
                    <span className="sd-zbar empty" aria-hidden="true" />
                  )}
                  <span className="sd-vec-v mono">{isNum ? num(v, 2) : v.toFixed(0)}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}

export default SleepDebtPage
