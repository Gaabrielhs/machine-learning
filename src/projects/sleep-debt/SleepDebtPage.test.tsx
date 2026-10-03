import { act, render, screen } from '@testing-library/react'
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

  it('os dados batem com o resultado registrado no notebook', () => {
    expect(data.metrics.test_acc).toBe(0.9806)
    expect(data.metrics.f1_macro).toBe(0.9745)
    expect(data.features).toHaveLength(29)
    expect(data.model.params).toBe(1556)
  })
})
