import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from '../../routes'
import data from './data.json'

describe('apresentação do trabalho', () => {
  it('abre na rota própria com os números do notebook', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/projetos/divida-de-sono'] })
    await act(async () => {
      render(<RouterProvider router={router} />)
    })
    expect(await screen.findByRole('heading', { name: /Resultado no conjunto de teste/ })).toBeInTheDocument()
    expect(screen.getAllByText('98,1%').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Apresentar' })).toBeInTheDocument()
  })

  it('a seção de teste mostra a previsão e reage ao formulário', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/projetos/divida-de-sono'] })
    await act(async () => {
      render(<RouterProvider router={router} />)
    })
    const section = (await screen.findByRole('heading', { name: 'Teste o modelo' })).closest('section')!
    const out = within(section).getByText('Previsão da MLP').closest('aside')!
    expect(within(out).getByText(/Classe real desta pessoa/)).toBeInTheDocument()
    // primeiro exemplo: alguém em recuperação ótima; com 3,2 h de sono isso deixa de fazer sentido
    expect(within(out).getByText('Recuperação ótima', { selector: '.sd-try-class' })).toBeInTheDocument()
    const hours = within(section).getByRole('slider', { name: 'horas de sono' })
    fireEvent.change(hours, { target: { value: '3.2' } })
    expect(within(out).getByText(/Valores editados/)).toBeInTheDocument()
    expect(within(out).queryByText('Recuperação ótima', { selector: '.sd-try-class' })).not.toBeInTheDocument()
  })

  it('os dados batem com o resultado registrado no notebook', () => {
    expect(data.metrics.test_acc).toBe(0.9806)
    expect(data.metrics.f1_macro).toBe(0.9745)
    expect(data.features).toHaveLength(29)
    expect(data.model.params).toBe(1556)
  })
})
