import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from '../../routes'
import data from './data.json'
import { kw } from './labels'
import model from './model.json'

async function open() {
  const router = createMemoryRouter(routes, { initialEntries: ['/projetos/consumo-data-center'] })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('apresentação da etapa 3 (SARIMAX)', () => {
  it('abre na rota própria com os números do notebook', async () => {
    await open()
    expect(await screen.findByRole('heading', { name: /Resultado nos 7 dias de teste/ })).toBeInTheDocument()
    expect(screen.getAllByText(kw(data.metrics.sarimax.mae)).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Apresentar' })).toBeInTheDocument()
  })

  it('avisa quando os números são provisórios e só então', async () => {
    await open()
    await screen.findByRole('heading', { name: 'Teste o modelo' })
    expect(screen.queryByText('Números provisórios.') !== null).toBe(data.source.placeholder)
  })

  it('a seção de teste mostra a energia prevista e reage aos controles', async () => {
    await open()
    const section = (await screen.findByRole('heading', { name: 'Teste o modelo' })).closest('section')!
    const out = within(section).getByText('Previsão do SARIMAX').closest('aside')!
    const before = out.querySelector('.dc-try-kwh')!.textContent
    expect(within(out).getByText(/Previsão-base com o clima/)).toBeInTheDocument()
    const first = model.exog[0]
    const label = `${first.label} (${first.unit})`
    fireEvent.change(within(section).getByRole('slider', { name: label }), { target: { value: String(first.max) } })
    expect(within(out).getByText(/em relação à previsão-base/)).toBeInTheDocument()
    expect(out.querySelector('.dc-try-kwh')!.textContent).not.toBe(before)
    fireEvent.click(within(section).getByRole('button', { name: 'sem mudança' }))
    expect(out.querySelector('.dc-try-kwh')!.textContent).toBe(before)
  })

  it('data.json e model.json vêm do mesmo ajuste', () => {
    expect(model.hours).toBe(data.forecast.hours)
    expect(model.dc).toBe(data.dc)
    model.base.pred.forEach((v, i) => expect(v).toBeCloseTo(data.forecast.pred[i], 1))
    for (const e of model.exog) {
      const c = data.model.coef.find((x) => x.name === e.name)!
      expect(e.per_unit).toBeCloseTo(c.per_unit, 3)
    }
    expect(data.forecast.real).toHaveLength(data.forecast.hours)
    expect(data.series.target).toHaveLength(data.quality.hours)
  })

  it('nenhum gráfico ou texto sai com NaN, Infinity ou undefined', async () => {
    await open()
    await screen.findByRole('heading', { name: 'Teste o modelo' })
    const html = document.body.innerHTML
    expect(html).not.toMatch(/NaN|Infinity|undefined/)
    expect(document.querySelectorAll('svg[role="img"]').length).toBeGreaterThanOrEqual(15)
  })

  it('a tabela de parâmetros destaca a ordem de menor AIC', async () => {
    await open()
    const section = (await screen.findByRole('heading', { name: 'Escolha dos parâmetros' })).closest('section')!
    const rows = section.querySelectorAll('tr.dc-best')
    expect(rows).toHaveLength(1)
    expect(Math.min(...data.grid.rows.map((r) => r.aic))).toBe(data.grid.best.aic)
  })
})
