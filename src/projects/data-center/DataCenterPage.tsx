import type { ReactNode } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { HBars } from '../sleep-debt/charts'
import { int, num, pct } from '../sleep-debt/format'
import { usePresentation } from '../sleep-debt/usePresentation'
import '../sleep-debt/sleep-debt.css'
import { DcHistogram, SeriesChart, SplitBar, StemChart } from './charts'
import raw from './data.json'
import {
  addHours,
  arch,
  climate,
  dayMonth,
  dayMonthHour,
  dayTicks,
  FLAG_PT,
  hourLabel,
  isoDate,
  kw,
  orderText,
  pvalue,
  SHORT,
  signed,
  TINY,
  UNIT,
  WEEKDAYS,
  WORKLOAD_PT,
} from './labels'
import { TryScenario } from './TryScenario'
import type { DataCenterData, Role } from './types'
import './data-center.css'

/** Preencha para mostrar na capa. */
const META = {
  course: 'Pós-graduação em Ciência de Dados · Aprendizado de Máquina e Reconhecimento de Padrões · Trabalho 3',
  authors: [] as string[],
}

const data = raw as unknown as DataCenterData

const SECTIONS = [
  { id: 'capa', title: 'Capa' },
  { id: 'problema', title: 'Problema e dataset' },
  { id: 'resumo', title: 'Resumo em 1 minuto' },
  { id: 'dados', title: 'Os três data centers' },
  { id: 'refrigeracao', title: 'Refrigeração: o que muda' },
  { id: 'serie', title: 'A série: refrigeração' },
  { id: 'ritmo', title: 'O ritmo diário' },
  { id: 'qualidade', title: 'Qualidade e tratamento' },
  { id: 'colunas', title: 'Quais colunas entram' },
  { id: 'estacionariedade', title: 'A série é estável?' },
  { id: 'divisao', title: 'Treino e teste' },
  { id: 'como-funciona', title: 'Como o modelo funciona' },
  { id: 'parametros', title: 'Escolha dos parâmetros' },
  { id: 'modelo', title: 'O modelo final' },
  { id: 'resultado', title: 'Resultado' },
  { id: 'externas', title: 'O que as externas acrescentam' },
  { id: 'janelas', title: 'Outras semanas' },
  { id: 'centros', title: 'Três data centers' },
  { id: 'discussao', title: 'Discussão' },
  { id: 'testar', title: 'Teste o modelo' },
  { id: 'conclusao', title: 'Conclusão' },
] as const

const ROLE: Record<Role, { label: string; why: string }> = {
  exog: { label: 'entra', why: '' },
  target: { label: 'alvo', why: 'o que queremos prever' },
  id: { label: 'removida', why: 'identificador: não carrega informação' },
  time: { label: 'índice', why: 'vira o eixo do tempo da série' },
  group: { label: 'filtro', why: 'cada data center é modelado separadamente' },
  leak: { label: 'removida', why: 'inclui a refrigeração ou é calculada a partir dela: entregaria a resposta' },
  effect: { label: 'removida', why: 'resultado do controle da refrigeração, não uma condição externa' },
  unused: { label: 'fora', why: 'não usada nesta versão' },
  covered: { label: 'resumida', why: 'já está dentro da potência dos servidores (que soma todos eles)' },
  meta: { label: 'controle', why: 'serve ao tratamento, não como entrada' },
}

const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)
const mean = (v: number[]) => sum(v) / v.length

export function DataCenterPage() {
  useDocumentTitle('Consumo de data centers · SARIMAX')
  const p = usePresentation(SECTIONS.map((s) => s.id))
  const d = data
  const m = d.metrics
  const H = d.forecast.hours
  const days = Math.round(H / 24)
  const target = d.series.target
  const center = d.centers.find((c) => c.id === d.dc)
  const exogLabel = (n: string) => TINY[n] ?? n
  const used = new Set(d.split.exog)
  const inputs = d.columns.filter((c) => c.role === 'exog' && used.has(c.name))
  const constant = d.columns.filter((c) => c.role === 'exog' && !used.has(c.name))
  const removed = d.columns.filter((c) => c.role !== 'exog' && c.role !== 'target')
  const lessError = 1 - m.sarimax.mae / m.profile.mae
  const meanPower = mean(target)
  const best = d.grid.best
  const coefs = d.model.coef
  const hours = d.quality.hours
  const flagTotal = sum(Object.values(d.quality.flags))
  const nanCols = Object.entries(d.quality.nan_by_col).filter(([, v]) => v > 0)
  const abl = (label: string) => d.ablation.find((a) => a.label === label)
  const tempBy = d.centers_results
    .map((c) => ({ id: c.id, v: c.per_unit.ambient_temperature_c }))
    .filter((x): x is { id: string; v: number } => x.v !== undefined)
  const tempMax = tempBy.reduce((a, b) => (b.v > a.v ? b : a), tempBy[0])
  const tempMin = tempBy.reduce((a, b) => (b.v < a.v ? b : a), tempBy[0])
  const eff = d.cooling.per_dc.reduce((a, b) => (b.pue_mean < a.pue_mean ? b : a))
  const leftover = d.diagnostics.ljung.filter((l) => l.p <= 0.05)
  const bestAblation = d.ablation.reduce((a, b) => (b.mae < a.mae ? b : a))
  const winsRolling = d.rolling.filter((r) => r.sarimax.mae < r.profile.mae).length
  const forecastStart = hours - 2 * H
  const windowStart = addHours(d.series.start, forecastStart)
  const verdict = (s: DataCenterData['stationarity'][number]) =>
    s.adf_ok && s.kpss_ok
      ? ['estacionária', 'ok']
      : !s.adf_ok && !s.kpss_ok
        ? ['não estacionária', 'warn']
        : ['os testes divergem', 'warn']

  return (
    <div className={`sd dc${p.on ? ' is-presenting' : ''}`}>
      <div className="sd-bar">
        <span className="sd-bar-title">Consumo de data centers · SARIMAX</span>
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
      {d.source.placeholder && (
        <aside className="dc-banner" role="note">
          <strong>Números provisórios.</strong> Esta página foi gerada com dados de teste (<code>{d.source.file}</code>
          ), não com o dataset do Kaggle. Rode <code>trabalho-sarimax-datacenter/gerar_dados_apresentacao.py</code> com
          o CSV real e copie <code>data.json</code> e <code>model.json</code> para{' '}
          <code>src/projects/data-center/</code> antes de apresentar.
        </aside>
      )}
      {!p.on && (
        <p className="sd-hint">
          Em <strong>Apresentar</strong>, cada seção ocupa a tela; use ← → (ou espaço) para navegar e Esc para sair.
        </p>
      )}

      {/* ============================== Capa ============================== */}
      <Slide id="capa">
        <p className="sd-kicker">{META.course}</p>
        <h1 className="sd-cover-title">
          Quanto custa esfriar um data center de IA? <em>Previsão da refrigeração com SARIMAX</em>
        </h1>
        {META.authors.length > 0 && <p className="sd-authors">{META.authors.join(' · ')}</p>}
        <div className="sd-kpis">
          <Kpi value={int(d.dataset.rows)} label="leituras de 3 data centers, a cada 15 minutos" />
          <Kpi value={int(hours)} label={`horas de série do ${d.dc}, depois do tratamento`} />
          <Kpi value={kw(m.sarimax.mae)} label={`de erro médio nos ${days} dias de teste (MAE)`} strong />
          <Kpi value={`${num(m.sarimax.mape, 1)}%`} label="de erro percentual médio (MAPE)" strong />
        </div>
      </Slide>

      {/* ============================== Problema ============================== */}
      <Slide id="problema" step="Contexto" title="O problema e o dataset">
        <p className="sd-lede">
          Boa parte da energia de um data center vai para <strong>esfriar</strong> os computadores. Queremos prever,
          hora a hora, quanta energia a <strong>refrigeração</strong> vai gastar nos próximos {days} dias, e comparar
          como três tipos de refrigeração reagem ao calor e ao trabalho dos servidores. Para prever, o modelo olha o
          gasto dos dias anteriores, a <strong>temperatura de fora</strong> e a <strong>carga</strong> dos servidores.
        </p>
        <div className="sd-two">
          <div>
            <h3>Dataset</h3>
            <p>
              <a
                href="https://www.kaggle.com/datasets/eishatuzzuhra/ai-data-center-energy-efficiency-dataset-2026"
                target="_blank"
                rel="noopener noreferrer"
              >
                AI Data Center Energy Efficiency Dataset 2026
              </a>{' '}
              (Kaggle). {int(d.dataset.rows)} leituras e {d.dataset.columns} colunas, de {isoDate(d.dataset.start)} a{' '}
              {isoDate(d.dataset.end)}, a cada {d.dataset.step_min} minutos, em 3 data centers com refrigeração e clima
              diferentes. Os dados são <strong>sintéticos</strong> ({d.dataset.origins.join(', ')}), e isso é dito na
              apresentação.
            </p>
            <h3>Algoritmo</h3>
            <p>
              SARIMAX: um modelo de previsão para dados que se repetem com o tempo (como o gasto de energia, que tem um
              ritmo a cada dia) e que também aceita “ajudas de fora”, como o clima. Usamos a biblioteca Python
              statsmodels.
            </p>
          </div>
          <div>
            <h3>Requisitos do trabalho</h3>
            <table className="sd-table">
              <tbody>
                <ReqRow req="Um dos seis algoritmos do módulo" ok="SARIMAX" />
                <ReqRow req="Dataset pouco comum" ok="de 2026; não é um dos clássicos de curso" />
                <ReqRow
                  req="Séries temporais: sem exigência de categóricas ou 500 amostras"
                  ok={`mesmo assim: ${int(hours)} horas`}
                />
                <ReqRow req="Tratamento dos dados detalhado" ok="seções 6, 7 e 8 desta apresentação" />
                <ReqRow req="Avaliar em dados fora do treino" ok={`últimos ${days} dias, nunca vistos`} />
                <ReqRow req="Dataset diferente dos outros grupos" ok="conferido na planilha do trabalho 3" />
              </tbody>
            </table>
          </div>
        </div>
      </Slide>

      {/* ============================== Resumo ============================== */}
      <Slide id="resumo" step="Em palavras simples" title="Resumo em 1 minuto">
        <ol className="sd-points">
          <li>
            <strong>O problema:</strong> os computadores esquentam e a refrigeração gasta energia para esfriá-los. O
            gasto muda com a temperatura de fora e com o quanto os servidores estão trabalhando. Queremos prever esse
            gasto dos próximos {days} dias e comparar três jeitos de refrigerar.
          </li>
          <li>
            <strong>A ideia:</strong> o gasto de hoje se parece com o de ontem; sobe quando esquenta lá fora e quando os
            servidores trabalham mais. O modelo (SARIMAX) aprende essas duas coisas: o <em>ritmo do passado</em> e o{' '}
            <em>efeito da temperatura e da carga dos servidores</em>.
          </li>
          <li>
            <strong>O cuidado:</strong> separamos os últimos {days} dias e escondemos do modelo. Depois comparamos a
            previsão dele com o que realmente aconteceu, como corrigir uma prova depois de estudar.
          </li>
          <li>
            <strong>O resultado:</strong> em média, o modelo errou só <strong>{kw(m.sarimax.mae)}</strong> por hora,
            cerca de {num(m.sarimax.mape, 1)}% do gasto real. Uma previsão simples (a média de cada hora do dia) erra{' '}
            {kw(m.profile.mae)}.
          </li>
        </ol>
        <p className="sd-note">
          As próximas seções mostram cada passo. Os blocos “Ver detalhes” guardam as contas para quem quiser conferir;
          dá para apresentar sem abri-los.
        </p>
      </Slide>

      {/* ============================== Dados ============================== */}
      <Slide id="dados" step="Notebook · seções 1 e 2" title="Os três data centers">
        <p className="sd-lede">
          Cada data center esfria seus computadores de um jeito e fica num clima diferente. Modelamos o{' '}
          <strong>{d.dc}</strong>
          {center ? ` (${arch(center.architecture)})` : ''}; a seção seguinte compara a refrigeração dos três, e no fim
          repetimos o mesmo método em cada um. Escolhemos o {d.dc} para o modelo detalhado porque é onde a temperatura
          de fora mais pesa.
        </p>
        <div className="table-scroll">
          <table className="sd-table">
            <thead>
              <tr>
                <th>data center</th>
                <th>refrigeração</th>
                <th>clima simulado</th>
                <th className="r">servidores</th>
                <th className="r">setpoint (°C)</th>
                <th className="r">leituras</th>
              </tr>
            </thead>
            <tbody>
              {d.centers.map((c) => (
                <tr key={c.id} className={c.id === d.dc ? 'dc-best' : undefined}>
                  <td>{c.id}</td>
                  <td>{arch(c.architecture)}</td>
                  <td>{climate(c.climate)}</td>
                  <td className="r">{c.servers}</td>
                  <td className="r">{num(c.setpoint_c, 0)}</td>
                  <td className="r">{int(c.rows)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sd-note">
          Tipos de carga registrados no dataset:{' '}
          {Object.entries(d.dataset.workloads)
            .map(([k, v]) => `${WORKLOAD_PT[k] ?? k} (${int(v)})`)
            .join(', ')}
          . Os timestamps estão em UTC; o fuso de cada data center está no arquivo de cadastro.
        </p>
      </Slide>

      {/* ============================== Refrigeração ============================== */}
      <Slide
        id="refrigeracao"
        step="Antes do modelo · só olhando os dados"
        title="Refrigeração: o que muda entre os três"
      >
        <p className="sd-lede">
          Antes de usar o modelo, olhamos os números como são. Duas medidas ajudam: o <strong>PUE</strong> (quanta
          energia o data center gasta no total para cada 1 kW que os computadores usam; quanto mais perto de 1, melhor)
          e o <strong>custo de esfriar</strong> (kW de refrigeração para cada kW de servidor).
        </p>
        <div className="table-scroll">
          <table className="sd-table">
            <thead>
              <tr>
                <th>data center</th>
                <th>refrigeração</th>
                <th className="r">PUE médio</th>
                <th className="r">custo de esfriar</th>
                <th className="r">temperatura média de fora</th>
                <th className="r">quanto a temperatura explica</th>
              </tr>
            </thead>
            <tbody>
              {d.cooling.per_dc.map((c) => (
                <tr key={c.id} className={c.id === d.dc ? 'dc-best' : undefined}>
                  <td>{c.id}</td>
                  <td>{arch(d.centers.find((x) => x.id === c.id)?.architecture ?? '-')}</td>
                  <td className="r">{num(c.pue_mean, 2)}</td>
                  <td className="r">{num(c.overhead, 2)} kW por kW</td>
                  <td className="r">{num(c.temp_mean, 0)} °C</td>
                  <td className="r">
                    {pct(c.r2_load, 0)} → {pct(c.r2_load_temp, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sd-note">
          Última coluna: o quanto da variação da refrigeração se explica só pela carga dos servidores, e depois pela
          carga <em>mais</em> a temperatura de fora.
        </p>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>
              Refrigeração (kW) com carga parecida ({d.cooling.by_temp.load_range[0]} a{' '}
              {d.cooling.by_temp.load_range[1]} kW de servidores), por temperatura de fora
            </figcaption>
            <SeriesChart
              ariaLabel="Potência de refrigeração por faixa de temperatura, com carga parecida, em cada data center"
              height={240}
              lines={d.cooling.per_dc.map((c, i) => ({
                label: c.id,
                values: d.cooling.by_temp.cooling[c.id],
                tone: (['strong', 'muted', 'accent'] as const)[i % 3],
                width: c.id === d.dc ? 2.4 : 1.6,
              }))}
              xTicks={d.cooling.by_temp.edges.map((label, index) => ({ index, label: label.replace(' °C', '') }))}
              xHover={(i) => d.cooling.by_temp.edges[i]}
              yFormat={(v) => `${Math.round(v)}`}
              yLabel="kW de refrigeração"
            />
          </figure>
          <figure className="sd-fig">
            <figcaption>Custo de esfriar ao longo do dia (kW por kW de servidor, hora UTC)</figcaption>
            <SeriesChart
              ariaLabel="Custo de esfriar por hora do dia em cada data center"
              height={240}
              lines={d.cooling.per_dc.map((c, i) => ({
                label: c.id,
                values: d.cooling.overhead_by_hour[c.id],
                tone: (['strong', 'muted', 'accent'] as const)[i % 3],
                width: c.id === d.dc ? 2.4 : 1.6,
              }))}
              xTicks={[0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({ index: h, label: hourLabel(h) }))}
              xHover={(i) => `${hourLabel(i)} UTC`}
              yFormat={(v) => num(v, 2)}
              yLabel="kW por kW"
            />
          </figure>
        </div>
        <ul className="sd-points quiet">
          <li>
            Na refrigeração <strong>mais eficiente</strong> (menor PUE e menor custo de esfriar), o gasto quase não muda
            com a temperatura nem com a hora do dia.
          </li>
          <li>
            Onde a temperatura <strong>mais pesa</strong>, o custo de esfriar varia bastante ao longo do dia: sobe
            quando esquenta e cai quando esfria.
          </li>
          <li>
            Cuidado: cada data center tem <em>uma</em> arquitetura, <em>um</em> clima, um número de servidores e um
            setpoint. Não dá para separar o efeito de cada um. As linhas só aparecem onde há leituras suficientes (pelo
            menos {d.cooling.by_temp.min_n}) e os dados são sintéticos; é uma comparação para ilustrar o método.
          </li>
        </ul>
      </Slide>

      {/* ============================== Série ============================== */}
      <Slide id="serie" step="Notebook · seção 4" title="A série: potência de refrigeração">
        <p className="sd-lede">
          Cada ponto do gráfico é a potência de refrigeração em uma hora. Depois da limpeza dos dados, o {d.dc} tem{' '}
          {int(hours)} horas ({int(Math.round(hours / 24))} dias). A refrigeração gasta, em média, {kw(meanPower)} (kW é
          a unidade de potência), com mínimo de {kw(Math.min(...target))} e máximo de {kw(Math.max(...target))}.
        </p>
        <figure className="sd-fig">
          <figcaption>Potência de refrigeração do {d.dc}, média horária (kW)</figcaption>
          <SeriesChart
            ariaLabel={`Potência de refrigeração do ${d.dc} ao longo de toda a série`}
            lines={[{ label: 'refrigeração', values: target, tone: 'main', width: 1.3 }]}
            shade={{ from: hours - H, label: `últimos ${days} dias (teste)` }}
            xTicks={dayTicks(d.series.start, hours, 7)}
            xHover={(i) => dayMonthHour(d.series.start, i)}
            yFormat={(v) => `${Math.round(v)}`}
            yLabel="kW"
          />
        </figure>
        <figure className="sd-fig">
          <figcaption>Primeira semana, para ver o formato do dia</figcaption>
          <SeriesChart
            ariaLabel="Potência de refrigeração na primeira semana da série"
            lines={[{ label: 'refrigeração', values: target.slice(0, 168), tone: 'main' }]}
            xTicks={dayTicks(d.series.start, 168, 1)}
            xHover={(i) => dayMonthHour(d.series.start, i)}
            yFormat={(v) => `${Math.round(v)}`}
            yLabel="kW"
            height={200}
          />
        </figure>
      </Slide>

      {/* ============================== Ritmo ============================== */}
      <Slide id="ritmo" step="Notebook · seção 4" title="O ritmo diário e o que anda junto">
        <p className="sd-lede">
          A refrigeração segue um desenho que se repete a cada 24 horas, porque a temperatura e a carga dos servidores
          também se repetem. É esse “ritmo” que o modelo aproveita para prever.
        </p>
        <div className="sd-kpis">
          <Kpi
            value={num(d.stl.strength_seasonal, 2)}
            label="o quanto a refrigeração se repete todo dia (0 = nada, 1 = igualzinho)"
            strong
          />
          <Kpi value={num(d.stl.strength_trend, 2)} label="o quanto ela sobe ou desce ao longo das semanas (0 a 1)" />
        </div>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>Refrigeração média por hora do dia (faixa: ± 1 desvio-padrão)</figcaption>
            <SeriesChart
              ariaLabel="Refrigeração média por hora do dia"
              lines={[{ label: 'média', values: d.profile.hour_mean, tone: 'main', width: 2.2 }]}
              band={{
                lo: d.profile.hour_mean.map((v, i) => v - d.profile.hour_std[i]),
                hi: d.profile.hour_mean.map((v, i) => v + d.profile.hour_std[i]),
                label: '± 1 desvio-padrão',
                tone: 'strong',
              }}
              xTicks={[0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({ index: h, label: hourLabel(h) }))}
              xLabel="hora do dia (UTC)"
              xHover={(i) => `${hourLabel(i)} UTC`}
              yFormat={(v) => `${Math.round(v)}`}
              yLabel="kW"
              height={230}
            />
          </figure>
          <figure className="sd-fig">
            <figcaption>Correlação de cada variável com a refrigeração</figcaption>
            <HBars
              ariaLabel="Correlação de cada variável com a refrigeração"
              max={1}
              format={(v) => num(v)}
              labelWidth={170}
              rowHeight={30}
              data={d.corr.map((c) => ({
                label: exogLabel(c.name),
                value: Math.abs(c.r),
                note: num(c.r),
                color: c.r < 0 ? 'var(--neg)' : 'var(--pos)',
                strong: true,
                tip: `${SHORT[c.name] ?? c.name}: correlação ${num(c.r)}`,
              }))}
            />
            <p className="sd-note">
              Quanto mais perto de 1, mais a variável anda junto com a refrigeração. Laranja: quando uma sobe, a
              refrigeração cai. Andar junto não prova que uma causa a outra.
            </p>
          </figure>
        </div>
        <figure className="sd-fig">
          <figcaption>Refrigeração média por dia da semana (kW)</figcaption>
          <HBars
            ariaLabel="Refrigeração média por dia da semana"
            max={Math.max(...d.profile.weekday_mean) * 1.1}
            format={(v) => `${num(v, 1)} kW`}
            labelWidth={60}
            rowHeight={24}
            data={d.profile.weekday_mean.map((v, i) => ({ label: WEEKDAYS[i], value: v, note: kw(v) }))}
          />
        </figure>
        <details className="sd-more">
          <summary>Ver detalhes: a refrigeração separada em tendência, ciclo diário e sobra</summary>
          <div className="dc-stl">
            {(
              [
                ['Tendência', d.stl.trend],
                ['Ciclo diário (sazonal)', d.stl.seasonal],
                ['Resto (resíduo)', d.stl.resid],
              ] as [string, number[]][]
            ).map(([label, v]) => (
              <figure className="sd-fig" key={label}>
                <figcaption>{label}</figcaption>
                <SeriesChart
                  ariaLabel={`Decomposição STL: ${label}`}
                  lines={[{ label, values: v, tone: 'main', width: 1.2 }]}
                  xTicks={dayTicks(d.series.start, hours, 14)}
                  xHover={(i) => dayMonthHour(d.series.start, i)}
                  yFormat={(x) => num(x, 0)}
                  height={130}
                />
              </figure>
            ))}
          </div>
        </details>
      </Slide>

      {/* ============================== Qualidade ============================== */}
      <Slide id="qualidade" step="Notebook · seção 3 · tratamento" title="Qualidade dos dados e tratamento">
        <p className="sd-lede">
          O modelo precisa de uma leitura em cada horário, sem falhas. Por isso arrumamos os dados em seis passos: sem
          apagar nenhuma linha, e juntando as leituras de 15 em 15 minutos em uma por hora.
        </p>
        <ol className="sd-pipeline">
          <PipeStep n="1" title="Carregar o CSV" detail={`${int(d.dataset.rows)} × ${d.dataset.columns}`} />
          <PipeStep n="2" title={`Filtrar o ${d.dc}`} detail={`${int(d.quality.rows)} leituras`} />
          <PipeStep n="3" title="Ordenar e tirar duplicatas" detail={`${int(d.quality.duplicates)} repetidas`} />
          <PipeStep
            n="4"
            title="Conferir buracos no tempo"
            detail={`${int(d.quality.gaps)} instantes faltando, passo de ${d.quality.step_min} min`}
          />
          <PipeStep
            n="5"
            title="Interpolar ausentes no tempo"
            detail={`${int(d.quality.nan_cells)} células preenchidas`}
          />
          <PipeStep n="6" title="Agregar por hora (média)" detail={`${int(hours)} horas`} accent />
        </ol>
        <div className="sd-two">
          <div>
            <h3>O dataset avisa quando uma leitura é suspeita</h3>
            <table className="sd-table compact">
              <thead>
                <tr>
                  <th>data_quality_flag</th>
                  <th className="r">leituras</th>
                  <th className="r">parte</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(d.quality.flags).map(([k, v]) => (
                  <tr key={k}>
                    <td>
                      {FLAG_PT[k] ?? k} <span className="sd-muted">({k})</span>
                    </td>
                    <td className="r">{int(v)}</td>
                    <td className="r">{pct(v / flagTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nanCols.length > 0 && (
              <p className="sd-note">
                Células vazias nas colunas usadas:{' '}
                {nanCols.map(([k, v]) => `${TINY[k] ?? SHORT[k] ?? k} (${int(v)})`).join(', ')}.
              </p>
            )}
          </div>
          <div>
            <h3>Por que preencher os buracos e juntar por hora</h3>
            <ul className="sd-points quiet">
              <li>
                Se apagássemos a linha de um sensor com defeito, ficaria um buraco na série, e o modelo precisa de uma
                leitura em cada horário. Em vez disso, preenchemos o buraco com um valor entre o anterior e o seguinte
                (interpolação).
              </li>
              <li>
                Tirar a média de 4 leituras suaviza pequenas oscilações e deixa o cálculo muito mais rápido (24 pontos
                por dia em vez de 96).
              </li>
              <li>
                {d.config.mask_flagged
                  ? 'As linhas com flag diferente de “ok” foram tratadas como ausentes e interpoladas.'
                  : 'As linhas com flag diferente de “ok” foram mantidas: só os valores vazios são interpolados. A opção MASK_FLAGGED do notebook trata todas elas como ausentes.'}
              </li>
            </ul>
          </div>
        </div>
        <Code>{`d["timestamp"] = pd.to_datetime(d["timestamp"], utc=True).dt.tz_localize(None)
d = d.sort_values("timestamp").drop_duplicates("timestamp").set_index("timestamp")

passo = d.index.to_series().diff().mode().iloc[0]                  # 15 min
d = d.reindex(pd.date_range(d.index.min(), d.index.max(), freq=passo))   # expõe os buracos
d = d.interpolate(method="time", limit_direction="both")           # preenche no tempo
horaria = d.resample("60min").mean()                               # 4 leituras → 1 hora`}</Code>
      </Slide>

      {/* ============================== Colunas ============================== */}
      <Slide id="colunas" step="Notebook · seção 2" title="Quais colunas entram no modelo">
        <p className="sd-lede">
          O que queremos prever é <code>{d.target}</code> (a potência da refrigeração). Três colunas são ela própria
          escrita de outro jeito, ou a incluem: <code>total_facility_power_kw</code> (que soma a refrigeração),{' '}
          <code>pue</code> e <code>facility_energy_kwh</code>. Usá-las seria como dar a resposta da prova junto com a
          pergunta; isso se chama <em>vazamento do alvo</em>, e deixaria o resultado bonito, mas falso. A temperatura de
          entrada do ar também fica de fora: ela é <em>resultado</em> da refrigeração, não uma condição de fora.
        </p>
        <div className="sd-two">
          <div>
            <h3>Entram como variáveis externas ({inputs.length})</h3>
            <ul className="dc-cols">
              {inputs.map((c) => (
                <li key={c.name}>
                  <span className="dc-badge in">entra</span>
                  {c.desc}
                </li>
              ))}
            </ul>
            {constant.length > 0 && (
              <p className="sd-note">
                {constant.map((c) => c.desc).join(', ')}: valor constante neste data center, então não ajuda a prever e
                foi descartada automaticamente.
              </p>
            )}
            <p className="sd-note">
              A temperatura de fora e a carga dos servidores acontecem antes da refrigeração e não dependem dela. Por
              isso ajudam a prever, e podemos testar “e se esquentasse 5 °C?”. A GPU, a CPU e o número de servidores já
              estão resumidos na potência dos servidores.
            </p>
          </div>
          <div>
            <h3>Ficam de fora ({removed.length + constant.length})</h3>
            <ul className="dc-cols">
              {removed.map((c) => (
                <li key={c.name}>
                  <span className="dc-badge out">{ROLE[c.role].label}</span>
                  <span>
                    {c.desc} <span className="sd-muted">· {ROLE[c.role].why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Slide>

      {/* ============================== Estacionariedade ============================== */}
      <Slide id="estacionariedade" step="Notebook · seção 5" title="A série é estacionária?">
        <p className="sd-lede">
          Antes de modelar, conferimos se a refrigeração tem um comportamento estável (sem subir ou descer sem parar).
          Se não tiver, o modelo trabalha com <strong>diferenças</strong>: <code>d = 1</code> olha quanto a refrigeração
          mudou de uma hora para outra, e <code>D = 1</code> compara cada hora com a mesma hora do dia anterior. Isso
          foi decidido por dois testes estatísticos (ADF e KPSS), que ficam no bloco abaixo.
        </p>
        <details className="sd-more">
          <summary>Ver detalhes: testes ADF e KPSS e gráficos ACF e PACF</summary>
          <div className="table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>série</th>
                  <th className="r">ADF (p)</th>
                  <th className="r">KPSS (p)</th>
                  <th>leitura</th>
                </tr>
              </thead>
              <tbody>
                {d.stationarity.map((s) => {
                  const [text, tone] = verdict(s)
                  return (
                    <tr key={s.label}>
                      <td>{s.label}</td>
                      <td className="r">{pvalue(s.adf_p)}</td>
                      <td className="r">
                        {s.kpss_p <= 0.01 || s.kpss_p >= 0.1
                          ? s.kpss_p >= 0.1
                            ? '≥ 0,10'
                            : '≤ 0,01'
                          : num(s.kpss_p, 3)}
                      </td>
                      <td>
                        <span className={`dc-verdict ${tone}`}>{text}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="sd-two">
            <figure className="sd-fig">
              <figcaption>ACF: quanto a refrigeração se parece com a de horas atrás</figcaption>
              <StemChart
                values={d.acf.acf}
                ci={d.acf.ci}
                guides={[24, 48, 72]}
                ariaLabel="Autocorrelação da série após a diferenciação sazonal"
              />
            </figure>
            <figure className="sd-fig">
              <figcaption>PACF: o mesmo, sem contar o efeito indireto</figcaption>
              <StemChart
                values={d.acf.pacf}
                ci={d.acf.ci}
                guides={[24, 48, 72]}
                ariaLabel="Autocorrelação parcial da série após a diferenciação sazonal"
              />
            </figure>
          </div>
          <p className="sd-note">
            Hastes alaranjadas saem da faixa cinza (a faixa de ±1,96/√n em que uma correlação pode ser só acaso). As
            linhas tracejadas marcam 24, 48 e 72 horas (um, dois e três dias). O KPSS só informa valores entre 0,01 e
            0,10. Estes gráficos orientam a ordem (p, q, P, Q); a escolha final é feita pelo AIC.
          </p>
        </details>
      </Slide>

      {/* ============================== Divisão ============================== */}
      <Slide id="divisao" step="Notebook · seção 6" title="Treino e teste, sem embaralhar">
        <p className="sd-lede">
          Como estudar para uma prova: o modelo aprende com o passado (treino) e é avaliado nos últimos {days} dias (
          {int(d.split.test_h)} horas), que ele nunca viu (teste). Não dá para embaralhar os dias, porque o futuro não
          pode ajudar a prever o passado.
        </p>
        <SplitBar
          train={d.split.train_h}
          test={d.split.test_h}
          trainLabel={
            <>
              <strong>Treino:</strong> {int(d.split.train_h)} h, de {isoDate(d.split.train_start)} a{' '}
              {isoDate(d.split.train_end)}
            </>
          }
          testLabel={
            <>
              Teste: {int(d.split.test_h)} h
              <br />
              {isoDate(d.split.test_start)} a {isoDate(d.split.test_end)}
            </>
          }
        />
        <div className="sd-two">
          <div>
            <h3>Variáveis externas na mesma escala</h3>
            <table className="sd-table compact">
              <thead>
                <tr>
                  <th>variável</th>
                  <th className="r">média no treino</th>
                  <th className="r">desvio-padrão</th>
                </tr>
              </thead>
              <tbody>
                {d.split.exog.map((n) => (
                  <tr key={n}>
                    <td>{SHORT[n] ?? n}</td>
                    <td className="r">{num(d.split.exog_mean[n], 2)}</td>
                    <td className="r">{num(d.split.exog_std[n], 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sd-note">
              Colocamos temperatura, carga etc. na mesma escala (subtraímos a média e dividimos pelo desvio-padrão) para
              o ajuste funcionar melhor. A média e o desvio vêm só do treino; usar o teste seria espiar a prova.
            </p>
          </div>
          <div>
            <h3>Modelos de referência</h3>
            <p>
              Para provar que o SARIMAX vale a pena, ele compete com duas previsões simples (se ele não ganhar delas,
              não serve):
            </p>
            <ul className="sd-points quiet">
              <li>
                <strong>Último dia repetido:</strong> as 24 horas finais do treino, copiadas pelos {days} dias.
              </li>
              <li>
                <strong>Perfil médio horário:</strong> a média do treino para cada hora do dia ({kw(d.split.train_mean)}{' '}
                de média geral).
              </li>
            </ul>
          </div>
        </div>
        <Code>{`y_train, y_test = y.iloc[:-168], y.iloc[-168:]
X_train, X_test = X.iloc[:-168], X.iloc[-168:]
mu, sd = X_train.mean(), X_train.std()              # só do treino
Xs_train, Xs_test = (X_train - mu) / sd, (X_test - mu) / sd`}</Code>
      </Slide>

      {/* ============================== Como funciona ============================== */}
      <Slide id="como-funciona" step="Algoritmo" title="Como o SARIMAX funciona">
        <p className="sd-lede">
          O modelo junta duas partes. A primeira é uma <strong>conta simples</strong>: quanto cada ajuda de fora
          (temperatura e carga) empurra a refrigeração para cima ou para baixo. A segunda é a <strong>memória</strong>:
          o gasto de agora se parece com o das últimas horas e com o da mesma hora nos dias anteriores.
        </p>
        <div className="dc-eq">
          <p className="sd-muted">
            em palavras: refrigeração = efeito da temperatura e da carga + o que o passado explica
          </p>
          <code>
            refrigeração<sub>t</sub> = β<sub>1</sub>·x<sub>1,t</sub> + β<sub>2</sub>·x<sub>2,t</sub> + … + erro
            <sub>t</sub>
          </code>
          <code>
            erro<sub>t</sub> ~ SARIMA{orderText(d.model.order, d.model.seasonal)}
          </code>
        </div>
        <details className="sd-more">
          <summary>Ver detalhes: o que significam p, d, q, P, D, Q e s</summary>
          <div className="table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>parâmetro</th>
                  <th>o que controla</th>
                  <th className="r">valor escolhido</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>p</td>
                  <td>AR: quantas horas anteriores do erro entram na previsão</td>
                  <td className="r">{d.model.order[0]}</td>
                </tr>
                <tr>
                  <td>d</td>
                  <td>diferenciação simples: trabalha com a variação de uma hora para a outra</td>
                  <td className="r">{d.model.order[1]}</td>
                </tr>
                <tr>
                  <td>q</td>
                  <td>MA: quantos erros de previsão anteriores corrigem a próxima</td>
                  <td className="r">{d.model.order[2]}</td>
                </tr>
                <tr>
                  <td>P, D, Q</td>
                  <td>o mesmo, mas no ciclo diário (defasagens de 24, 48… horas)</td>
                  <td className="r">
                    {d.model.seasonal[0]}, {d.model.seasonal[1]}, {d.model.seasonal[2]}
                  </td>
                </tr>
                <tr>
                  <td>s</td>
                  <td>tamanho do ciclo: 24 horas, em dados horários</td>
                  <td className="r">{d.model.seasonal[3]}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <p className="sd-note">
          Como o efeito do clima e da carga é uma soma, se mudarmos o clima ou a carga dos dias futuros a previsão só
          desloca na mesma proporção, sem mexer no resto. É isso que a seção “Teste o modelo” usa.
        </p>
      </Slide>

      {/* ============================== Parâmetros ============================== */}
      <Slide id="parametros" step="Notebook · seção 7" title="Escolha dos parâmetros">
        <p className="sd-lede">
          O modelo tem alguns “botões” a regular (a <em>ordem</em>, escrita como números entre parênteses). Testamos{' '}
          {d.grid.rows.length} combinações no treino e ficamos com a de menor <strong>AIC</strong>, uma nota que premia
          o modelo que explica bem os dados sem ser complicado demais (quanto menor, melhor). A vencedora foi{' '}
          <strong>SARIMAX{orderText(best.order, best.seasonal)}</strong>, com AIC de {num(best.aic, 1)}.
        </p>
        <details className="sd-more">
          <summary>Ver detalhes: todas as combinações testadas</summary>
          <div className="table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>ordem (p, d, q)</th>
                  <th>sazonal (P, D, Q, s)</th>
                  <th className="r">AIC</th>
                  <th className="r">AIC − melhor</th>
                  <th className="r">BIC</th>
                  <th className="r">tempo de ajuste</th>
                </tr>
              </thead>
              <tbody>
                {d.grid.rows.map((r) => (
                  <tr key={`${r.order}-${r.seasonal}`} className={r.aic === best.aic ? 'dc-best' : undefined}>
                    <td>({r.order.join(', ')})</td>
                    <td>({r.seasonal.join(', ')})</td>
                    <td className="r">{num(r.aic, 1)}</td>
                    <td className="r">{r.aic === best.aic ? '—' : `+${num(r.aic - best.aic, 1)}`}</td>
                    <td className="r">{num(r.bic, 1)}</td>
                    <td className="r">{num(r.seconds, 0)} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sd-note">
            O AIC só é estritamente comparável entre modelos com a mesma diferenciação; aqui D = 1 em todos, e a escolha
            entre d = 0 e d = 1 é confirmada no teste.
            {d.config.fast && ' Esta execução usou o modo rápido, com poucas combinações.'}
          </p>
        </details>
        <Code>{`for ordem, sazonal in itertools.product(ORDENS, SAZONAIS):
    modelo = SARIMAX(y_train, exog=Xs_train, order=ordem, seasonal_order=sazonal,
                     enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
    resultados.append((ordem, sazonal, modelo.aic))        # menor AIC vence`}</Code>
      </Slide>

      {/* ============================== Modelo ============================== */}
      <Slide id="modelo" step="Notebook · seção 8" title="O modelo final e o diagnóstico">
        <div className="sd-two">
          <div>
            <h3>O que cada ajuda de fora faz</h3>
            <div className="table-scroll">
              <table className="sd-table compact">
                <thead>
                  <tr>
                    <th>variável</th>
                    <th className="r">kW por unidade</th>
                    <th className="r">intervalo de 95%</th>
                    <th className="r">p</th>
                  </tr>
                </thead>
                <tbody>
                  {coefs.map((c) => (
                    <tr key={c.name}>
                      <td>
                        {exogLabel(c.name)}
                        <span className="sd-muted"> · por {UNIT[c.name] ?? 'unidade'}</span>
                      </td>
                      <td className="r">{signed(c.per_unit, 3)}</td>
                      <td className="r">
                        {num(c.low / c.sd, 3)} a {num(c.high / c.sd, 3)}
                      </td>
                      <td className="r">{pvalue(c.p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sd-note">
              Exemplo de leitura: cada °C a mais lá fora soma o valor da linha “temperatura ambiente” à refrigeração,
              mantida a mesma carga. O “p” diz se o efeito é real ou poderia ser acaso: abaixo de 0,05, é real.
            </p>
            <details className="sd-more">
              <summary>Ver detalhes: coeficientes da parte da memória (SARIMA)</summary>
              <table className="sd-table compact">
                <tbody>
                  {d.model.dynamics.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <code>{c.name}</code>
                      </td>
                      <td className="r">{num(c.coef, 3)}</td>
                      <td className="r sd-muted">p {pvalue(c.p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
          <div>
            <h3>O modelo deixou algum padrão sem explicar?</h3>
            <p>
              A diferença entre o que o modelo ajustou e o que aconteceu é a “sobra”. Se o modelo é bom, a sobra parece
              ruído aleatório, sem padrão.
            </p>
            <figure className="sd-fig">
              <figcaption>Padrão na sobra (até 48 horas): hastes dentro da faixa cinza = sem padrão</figcaption>
              <StemChart
                values={d.diagnostics.resid_acf}
                ci={d.diagnostics.ci}
                guides={[24, 48]}
                ariaLabel="Autocorrelação dos resíduos do modelo final"
                height={170}
              />
            </figure>
            <details className="sd-more">
              <summary>Ver detalhes: teste de Ljung-Box e distribuição da sobra</summary>
              <table className="sd-table compact">
                <thead>
                  <tr>
                    <th>teste de Ljung-Box</th>
                    <th className="r">p</th>
                    <th>leitura</th>
                  </tr>
                </thead>
                <tbody>
                  {d.diagnostics.ljung.map((l) => (
                    <tr key={l.lag}>
                      <td>até a defasagem {l.lag}</td>
                      <td className="r">{pvalue(l.p)}</td>
                      <td>
                        <span className={`dc-verdict ${l.p > 0.05 ? 'ok' : 'warn'}`}>
                          {l.p > 0.05 ? 'sem padrão sobrando' : 'ainda há padrão'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <figure className="sd-fig">
                <figcaption>Distribuição dos resíduos (kW)</figcaption>
                <DcHistogram
                  bins={d.diagnostics.hist.bins}
                  counts={d.diagnostics.hist.counts}
                  xLabel="erro de ajuste no treino, em kW"
                  unit="horas"
                  ticks={[-3, -2, -1, 0, 1, 2, 3].map((k) => Math.round(k * d.diagnostics.resid_std * 10) / 10)}
                  tickFormat={(v) => num(v, 1)}
                  marker={{ value: 0, label: 'zero' }}
                  ariaLabel="Histograma dos resíduos do modelo final"
                />
              </figure>
              <p className="sd-note">
                Média dos resíduos: {num(d.diagnostics.resid_mean, 2)} kW; desvio-padrão:{' '}
                {num(d.diagnostics.resid_std, 2)} kW. Os {d.config.period + 1} primeiros são ignorados (efeito da
                diferenciação).
              </p>
            </details>
          </div>
        </div>
      </Slide>

      {/* ============================== Resultado ============================== */}
      <Slide id="resultado" step="Notebook · seção 9" title={`Resultado nos ${days} dias de teste`}>
        <p className="sd-lede">
          Pedimos ao modelo a previsão de {days} dias que ele nunca viu e comparamos com a refrigeração real. Quanto
          menor o erro, melhor.
        </p>
        <div className="sd-kpis">
          <Kpi
            value={kw(m.sarimax.mae)}
            label="de erro médio por hora (MAE): quanto a previsão se afasta do real, em média"
            strong
          />
          <Kpi value={kw(m.sarimax.rmse)} label="RMSE: parecido com o MAE, mas pesa mais os erros grandes" strong />
          <Kpi value={`${num(m.sarimax.mape, 2)}%`} label="erro médio em % da refrigeração real (MAPE)" />
          <Kpi
            value={kw(m.profile.mae)}
            label="erro de uma previsão simples (a média de cada hora do dia): a referência a vencer"
          />
        </div>
        <figure className="sd-fig">
          <figcaption>Previsão de {days} dias × refrigeração real (kW)</figcaption>
          <SeriesChart
            ariaLabel="Previsão do SARIMAX nos dias de teste contra a potência real"
            height={270}
            lines={[
              { label: 'real', values: target.slice(-2 * H), tone: 'muted', width: 1.6 },
              { label: 'previsão do SARIMAX', values: d.forecast.pred, tone: 'accent', width: 2, offset: H },
            ]}
            band={{ lo: d.forecast.lo, hi: d.forecast.hi, label: 'intervalo de 95%', offset: H, tone: 'accent' }}
            shade={{ from: H, label: 'período de teste' }}
            xTicks={dayTicks(windowStart, 2 * H, 1)}
            xHover={(i) => dayMonthHour(windowStart, i)}
            yFormat={(v) => `${Math.round(v)}`}
            yLabel="kW"
          />
        </figure>
        <div className="sd-two">
          <figure className="sd-fig">
            <figcaption>Erro médio (MAE) de cada abordagem, em kW</figcaption>
            <HBars
              ariaLabel="Erro médio absoluto de cada abordagem no teste"
              max={Math.max(m.naive.mae, m.profile.mae, m.sarima.mae, m.sarimax.mae) * 1.15}
              format={(v) => num(v, 2)}
              labelWidth={190}
              data={[
                { label: 'Último dia repetido', value: m.naive.mae, color: 'var(--line)' },
                { label: 'Perfil médio horário', value: m.profile.mae, color: 'var(--line)' },
                { label: 'SARIMA (sem externas)', value: m.sarima.mae },
                {
                  label: 'SARIMAX (com externas)',
                  value: m.sarimax.mae,
                  strong: true,
                  color: 'var(--sd-series-strong)',
                },
              ]}
            />
          </figure>
          <ul className="sd-points quiet">
            <li>
              Em {pct(m.within_ci, 0)} das horas, o valor real caiu dentro da faixa azul clara (o “intervalo de 95%”, a
              margem de erro que o modelo estimou). O esperado seria perto de 95%.
            </li>
            <li>{pct(m.within_5pct, 0)} das previsões erram por no máximo 5% do valor real.</li>
            <li>
              Em média, a previsão ficou {signed(m.bias, 2)} kW distante do real (previsão − real):{' '}
              {Math.abs(m.bias) < 0.05 * m.sarimax.mae + 0.05
                ? 'sem tendência clara de errar para um lado'
                : m.bias > 0
                  ? 'o modelo tende a prever acima do real'
                  : 'o modelo tende a prever abaixo do real'}
              .
            </li>
          </ul>
        </div>
        <figure className="sd-fig">
          <figcaption>Erro médio por hora do dia (kW): onde o modelo mais erra</figcaption>
          <SeriesChart
            ariaLabel="Erro médio absoluto por hora do dia, do SARIMAX e do perfil médio"
            height={200}
            lines={[
              { label: 'SARIMAX', values: d.err_by_hour.sarimax, tone: 'accent' },
              { label: 'perfil médio horário', values: d.err_by_hour.profile, tone: 'muted', dashed: true },
            ]}
            xTicks={[0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({ index: h, label: hourLabel(h) }))}
            xHover={(i) => `${hourLabel(i)} UTC`}
            yFormat={(v) => num(v, 1)}
            yLabel="erro médio, em kW"
          />
        </figure>
      </Slide>

      {/* ============================== Externas ============================== */}
      <Slide id="externas" step="Notebook · seção 10" title="O que as variáveis externas acrescentam">
        <p className="sd-lede">
          Refizemos a previsão dando ao modelo “ingredientes” diferentes, para ver o que ajuda de verdade. A melhor
          combinação foi <strong>{bestAblation.label}</strong>, com erro médio de {kw(bestAblation.mae)}.
        </p>
        <HBars
          ariaLabel="Erro médio absoluto do SARIMAX com diferentes conjuntos de variáveis externas"
          max={Math.max(...d.ablation.map((a) => a.mae)) * 1.15}
          format={(v) => num(v, 2)}
          labelWidth={190}
          data={d.ablation.map((a) => ({
            label: a.label,
            value: a.mae,
            strong: a === bestAblation,
            color: a === bestAblation ? 'var(--sd-series-strong)' : 'var(--sd-series)',
            note: `${num(a.mae, 2)} kW`,
            tip: `${a.label}${a.exog.length ? ` (${a.exog.map(exogLabel).join(', ')})` : ''}: MAE ${num(a.mae, 3)} kW, RMSE ${num(a.rmse, 3)} kW, MAPE ${num(a.mape, 2)}%`,
          }))}
        />
        <details className="sd-more">
          <summary>Ver detalhes: tabela completa</summary>
          <div className="table-scroll">
            <table className="sd-table compact">
              <thead>
                <tr>
                  <th>entradas</th>
                  <th>variáveis</th>
                  <th className="r">MAE (kW)</th>
                  <th className="r">RMSE (kW)</th>
                  <th className="r">MAPE</th>
                </tr>
              </thead>
              <tbody>
                {d.ablation.map((a) => (
                  <tr key={a.label} className={a === bestAblation ? 'dc-best' : undefined}>
                    <td>{a.label}</td>
                    <td className="sd-muted">
                      {a.exog.length ? a.exog.map(exogLabel).join(', ') : 'nenhuma: só o passado da série'}
                    </td>
                    <td className="r">{num(a.mae, 2)}</td>
                    <td className="r">{num(a.rmse, 2)}</td>
                    <td className="r">{num(a.mape, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="sd-note">
          “Só o passado” sabe do ritmo diário, mas não sabe como serão a carga e o clima nos dias previstos. Nas outras
          linhas, o modelo recebe os valores reais desses dias (por isso é uma previsão “condicional”).
        </p>
      </Slide>

      {/* ============================== Janelas ============================== */}
      <Slide id="janelas" step="Notebook · seção 11" title="E em outras semanas?">
        <p className="sd-lede">
          Acertar uma semana pode ser sorte. Por isso repetimos o teste em {d.rolling.length} semanas seguidas, sempre
          treinando só com o que veio antes. O SARIMAX teve menos erro que a previsão simples (média de cada hora) em{' '}
          <strong>
            {winsRolling} de {d.rolling.length}
          </strong>{' '}
          semanas.
        </p>
        <div className="sd-two">
          <div className="table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>semana de teste</th>
                  <th className="r">treino (h)</th>
                  <th className="r">MAE SARIMAX</th>
                  <th className="r">MAE perfil médio</th>
                </tr>
              </thead>
              <tbody>
                {d.rolling.map((r) => (
                  <tr key={r.start}>
                    <td>
                      {isoDate(r.start)} a {isoDate(r.end)}
                    </td>
                    <td className="r">{int(r.train_h)}</td>
                    <td className="r">{num(r.sarimax.mae, 2)} kW</td>
                    <td className="r">{num(r.profile.mae, 2)} kW</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figure className="sd-fig">
            <figcaption>Erro médio (kW) por semana de teste</figcaption>
            <HBars
              ariaLabel="Erro médio absoluto por semana de teste, do SARIMAX e do perfil médio horário"
              max={Math.max(...d.rolling.flatMap((r) => [r.sarimax.mae, r.profile.mae])) * 1.15}
              format={(v) => num(v, 2)}
              labelWidth={140}
              rowHeight={24}
              data={d.rolling.flatMap((r) => [
                {
                  label: `${dayMonth(r.start, 0)} · SARIMAX`,
                  value: r.sarimax.mae,
                  color: 'var(--sd-series-strong)',
                  strong: true,
                },
                { label: `${dayMonth(r.start, 0)} · perfil`, value: r.profile.mae, color: 'var(--line)' },
              ])}
            />
          </figure>
        </div>
        <p className="sd-note">
          O erro do SARIMAX varia entre {num(Math.min(...d.rolling.map((r) => r.sarimax.mae)), 2)} e{' '}
          {num(Math.max(...d.rolling.map((r) => r.sarimax.mae)), 2)} kW entre as semanas. A ordem do modelo foi
          escolhida no treino da primeira divisão e mantida fixa nas outras.
        </p>
      </Slide>

      {/* ============================== Centros ============================== */}
      <Slide id="centros" step="Notebook · seção 12" title="O mesmo método nos três data centers">
        <p className="sd-lede">
          Repetimos exatamente o mesmo método nos três data centers. As duas últimas colunas mostram quanto a
          refrigeração de cada um sobe para cada °C a mais lá fora e para cada kW a mais de servidores, com o resto
          igual.
        </p>
        <div className="table-scroll">
          <table className="sd-table">
            <thead>
              <tr>
                <th>data center</th>
                <th>refrigeração</th>
                <th className="r">refrigeração média</th>
                <th className="r">MAE</th>
                <th className="r">MAPE</th>
                <th className="r">MAE perfil médio</th>
                {d.split.exog.map((n) => (
                  <th key={n} className="r">
                    kW por {UNIT[n] ?? n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.centers_results.map((c) => (
                <tr key={c.id} className={c.id === d.dc ? 'dc-best' : undefined}>
                  <td>{c.id}</td>
                  <td>{arch(d.centers.find((x) => x.id === c.id)?.architecture ?? '-')}</td>
                  <td className="r">{kw(c.mean_kw)}</td>
                  <td className="r">{num(c.mae, 2)} kW</td>
                  <td className="r">{num(c.mape, 2)}%</td>
                  <td className="r">{num(c.profile_mae, 2)} kW</td>
                  {d.split.exog.map((n) => (
                    <td key={n} className="r">
                      {c.per_unit[n] === undefined ? '—' : signed(c.per_unit[n], 3)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sd-note">
          É uma comparação indicativa: cada data center tem uma só janela de teste, o clima e a carga são simulados e os
          data centers diferem em mais coisas do que a refrigeração (clima, número de servidores, setpoint).
        </p>
      </Slide>

      {/* ============================== Discussão ============================== */}
      <Slide id="discussao" step="Notebook · seção 13" title="Discussão e limites">
        <ul className="sd-points">
          <li>
            O SARIMAX erra em média <strong>{kw(m.sarimax.mae)}</strong> ({num(m.sarimax.mape, 1)}% do valor real),
            contra {kw(m.profile.mae)} do perfil médio horário:{' '}
            {lessError > 0
              ? `${pct(lessError, 0)} menos erro.`
              : `${pct(-lessError, 0)} a mais de erro; neste teste o modelo não superou a referência simples.`}
          </li>
          {abl('+ clima') && abl('+ carga') && abl('Só o passado (SARIMA)') && (
            <li>
              Cada ingrediente ajuda, e os dois juntos ajudam muito mais: só o passado erra {kw(m.sarima.mae)}; com a
              temperatura, {kw(abl('+ clima')!.mae)}; com a carga, {kw(abl('+ carga')!.mae)}; com as duas,{' '}
              {kw(m.sarimax.mae)}. A refrigeração depende das duas ao mesmo tempo, e não é uma fórmula direta da carga.
            </li>
          )}
          {tempBy.length > 1 && (
            <li>
              Cada °C a mais lá fora soma, na refrigeração do {tempMax.id}, <strong>{num(tempMax.v, 2)} kW</strong> (com
              a mesma carga), contra {num(tempMin.v, 2)} kW no {tempMin.id}. O data center de menor PUE é o {eff.id} (
              {num(eff.pue_mean, 2)}).
            </li>
          )}
          <li>
            Em {winsRolling} de {d.rolling.length} semanas o SARIMAX bateu o perfil médio, e o erro oscilou entre{' '}
            {num(Math.min(...d.rolling.map((r) => r.sarimax.mae)), 2)} e{' '}
            {num(Math.max(...d.rolling.map((r) => r.sarimax.mae)), 2)} kW.
          </li>
          <li>O intervalo de 95% cobriu {pct(m.within_ci, 0)} das horas de teste.</li>
        </ul>
        <h3>Limites</h3>
        <ul className="sd-points quiet">
          <li>
            <strong>Dados sintéticos:</strong> o ritmo diário costuma ser mais limpo que o de um data center real.
          </li>
          <li>
            <strong>Previsão condicional:</strong> o teste usa a temperatura e a carga que de fato aconteceram. Em
            produção, esses valores viriam de previsão do tempo e de planejamento de carga, com erro próprio.
          </li>
          <li>
            <strong>Só três data centers:</strong> cada um tem uma arquitetura, um clima, um número de servidores e um
            setpoint. A comparação mostra diferenças, mas não prova que uma arquitetura é melhor que outra.
          </li>
          <li>
            <strong>Série curta:</strong> são {int(Math.round(hours / 24))} dias, então não há como modelar a
            sazonalidade semanal nem a anual.
          </li>
          <li>
            <strong>Relação em linha reta:</strong> o modelo soma um efeito constante por °C e por kW. Mudanças de modo
            de operação da refrigeração (como o free cooling ligando e desligando) podem não caber numa reta.
          </li>
          {leftover.length > 0 && (
            <li>
              <strong>Sobrou algum padrão:</strong> o teste dos resíduos (Ljung-Box) ainda acusa padrão até a defasagem{' '}
              {leftover.map((l) => l.lag).join(' e ')}, ou seja, há um ritmo que o modelo não pegou por completo.
            </li>
          )}
        </ul>
      </Slide>

      {/* ============================== Teste ============================== */}
      <Slide id="testar" step="Demonstração" title="Teste o modelo">
        <p className="sd-lede">
          Mude o clima e a carga dos {days} dias de teste e veja quanta energia de refrigeração o modelo prevê para o{' '}
          {d.dc}. A previsão inicial usa os valores que de fato ocorreram.
        </p>
        <TryScenario />
      </Slide>

      {/* ============================== Conclusão ============================== */}
      <Slide id="conclusao" step="Fechamento" title="Conclusão">
        <ul className="sd-points">
          <li>
            O SARIMAX previu a potência de refrigeração do {d.dc} por {days} dias com{' '}
            <strong>erro médio de {kw(m.sarimax.mae)}</strong> ({num(m.sarimax.mape, 1)}%), contra {kw(m.profile.mae)}{' '}
            da previsão simples do perfil médio horário. O ganho vem de combinar o ritmo do passado com a temperatura de
            fora e a carga dos servidores.
          </li>
          {tempBy.length > 1 && (
            <li>
              Os três data centers reagem de forma diferente ao calor: cada °C a mais soma {num(tempMax.v, 2)} kW de
              refrigeração no {tempMax.id} e {num(tempMin.v, 2)} kW no {tempMin.id}. O mais eficiente é o {eff.id}, com
              PUE de {num(eff.pue_mean, 2)}. Isso vale para este dataset sintético, em que arquitetura e clima vêm
              juntos.
            </li>
          )}
          <li>
            O tratamento deu a base: interpolar em vez de apagar linhas, agregar por hora e tirar do modelo as colunas
            que incluem o alvo (potência total, PUE e energia), para o resultado não ser falso.
          </li>
          <li>
            Os coeficientes são fáceis de ler (kW por °C e por kW de servidor) e permitem testar cenários, como uma onda
            de calor ou um aumento de carga.
          </li>
        </ul>
        <h3>Próximos passos</h3>
        <ul className="sd-points quiet">
          <li>Usar dados de mais data centers, ou reais, para separar o efeito da arquitetura do efeito do clima.</li>
          <li>Trocar a temperatura real do teste por uma previsão do tempo, medindo o erro de ponta a ponta.</li>
          <li>
            Comparar com uma LSTM, que aprende relações que não são retas entre carga, temperatura e refrigeração.
          </li>
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

export default DataCenterPage
