import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from '../../routes'
import data from './data.json'

describe('apresentação do Trabalho 2 · Árvore de Decisão (Gemini)', () => {
  it('abre na rota própria com as métricas de regressão do notebook', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/projetos/gemini-arvore-de-decisao'] })
    await act(async () => {
      render(<RouterProvider router={router} />)
    })
    expect(await screen.findByRole('heading', { name: /Resultado no conjunto de teste/ })).toBeInTheDocument()
    expect(screen.getAllByText('88,8%').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Apresentar' })).toBeInTheDocument()
  })

  it('a seção de teste mostra a previsão em horas, o caminho na árvore e reage ao formulário', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/projetos/gemini-arvore-de-decisao'] })
    await act(async () => {
      render(<RouterProvider router={router} />)
    })
    const section = (await screen.findByRole('heading', { name: 'Teste a Árvore de Decisão' })).closest('section')!
    const out = within(section).getByText('Previsão da Árvore de Decisão').closest('aside')!
    expect(within(out).getByText(/Horas reais desta pessoa/)).toBeInTheDocument()
    expect(within(out).getByText(/Caminho de decisão percorrido/)).toBeInTheDocument()
    const fatigue = within(section).getByRole('slider', { name: 'cansaço no dia seguinte (1–10)' })
    fireEvent.change(fatigue, { target: { value: '1.0' } })
    expect(within(out).getByText(/Valores editados por você/)).toBeInTheDocument()
  })

  it('os dados batem com os números registrados no notebook', () => {
    expect(data.metrics.test_r2).toBe(0.8884)
    expect(data.metrics.test_mae).toBe(0.3852)
    expect(data.features).toHaveLength(28)
    expect(data.model.n_leaves).toBe(60)
  })
})
