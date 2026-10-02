import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from './routes'
import { progress } from './core/progress'

// O módulo do algoritmo carrega com Suspense; act espera a promessa resolver.
async function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('aplicação', () => {
  beforeEach(() => progress.resetAll())

  it('lista os algoritmos na página inicial', async () => {
    await renderAt('/')
    expect(screen.getByRole('link', { name: 'Perceptron multicamadas (MLP)' })).toBeInTheDocument()
  })

  it('abre a aula com todas as seções', async () => {
    await renderAt('/mlp/aula')
    expect(await screen.findByRole('heading', { name: 'O problema: a luz da escada' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Backpropagation: distribuindo a culpa' })).toBeInTheDocument()
  })

  it('pede a dificuldade no primeiro acesso ao jogo e depois mostra o mapa', async () => {
    const user = userEvent.setup()
    await renderAt('/mlp/jogo')
    await user.click(await screen.findByRole('button', { name: /Médio/ }))
    expect(await screen.findByRole('heading', { name: 'Mapa da trilha' })).toBeInTheDocument()
  })

  it('troca a explicação ao mudar a dificuldade dentro da fase', async () => {
    progress.setLevel('easy')
    const user = userEvent.setup()
    await renderAt('/mlp/jogo/neuronio')
    expect(await screen.findByText(/decidindo se vai à praia/)).toBeInTheDocument()
    const sw = screen.getAllByRole('group', { name: 'Nível de dificuldade' })[0]
    await user.click(within(sw).getByRole('radio', { name: /Difícil/ }))
    expect(await screen.findByText(/Minsky e Papert/)).toBeInTheDocument()
    expect(screen.queryByText(/decidindo se vai à praia/)).not.toBeInTheDocument()
  })

  it('dá XP ao acertar um desafio e guarda o progresso', async () => {
    progress.setLevel('easy')
    const user = userEvent.setup()
    await renderAt('/mlp/jogo/ativacao')
    const input = await screen.findByLabelText('Sua resposta')
    await user.type(input, '0,5')
    await user.click(screen.getAllByRole('button', { name: 'Verificar' })[0])
    expect(await screen.findAllByText(/Correto/)).not.toHaveLength(0)
    expect(screen.getAllByText('10 XP').length).toBeGreaterThan(0)
  })

  it('mostra 404 para endereço desconhecido', async () => {
    await renderAt('/nao-existe/aula')
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })
})
