import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from '../../routes'
import data from './data.json'

async function open() {
  const router = createMemoryRouter(routes, { initialEntries: ['/projetos/horas-de-sono'] })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('apresentação da etapa 2 (árvore de decisão)', () => {
  it('abre na rota própria com os números do notebook', async () => {
    await open()
    expect(await screen.findByRole('heading', { name: /Resultado no conjunto de teste/ })).toBeInTheDocument()
    expect(screen.getAllByText('32 min').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Apresentar' })).toBeInTheDocument()
  })

  it('a seção de teste mostra a previsão e reage ao formulário', async () => {
    await open()
    const section = (await screen.findByRole('heading', { name: 'Teste o modelo' })).closest('section')!
    const out = within(section).getByText('Previsão da árvore').closest('aside')!
    expect(within(out).getByText(/Esta pessoa dormiu/)).toBeInTheDocument()
    const before = out.querySelector('.ct-try-hours')!.textContent
    const phone = within(section).getByRole('slider', { name: 'minutos no celular antes de dormir' })
    fireEvent.change(phone, { target: { value: '1' } })
    expect(within(out).getByText(/Valores editados/)).toBeInTheDocument()
    expect(out.querySelector('.ct-try-hours')!.textContent).not.toBe(before)
  })

  it('a lista da árvore abre e recolhe', async () => {
    await open()
    const tree = await screen.findByRole('tree', { name: 'Árvore de decisão completa' })
    const closed = within(tree).getAllByRole('treeitem').length
    fireEvent.click(within(tree.parentElement!).getByRole('button', { name: 'Abrir tudo' }))
    expect(within(tree).getAllByRole('treeitem')).toHaveLength(data.tree_stats.nodes)
    expect(closed).toBeLessThan(data.tree_stats.nodes)
  })

  it('os dados batem com o resultado do notebook', () => {
    expect(data.metrics.test.r2).toBe(0.7975)
    expect(data.metrics.test.mae).toBe(0.5283)
    expect(data.features).toHaveLength(23)
    expect(data.grid.best).toMatchObject({ max_depth: 6, min_samples_leaf: 5 })
  })
})
