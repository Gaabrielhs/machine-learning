import type { RouteObject } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

// Páginas de algoritmo carregam sob demanda: a página inicial não baixa KaTeX nem Markdown.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    HydrateFallback: () => null,
    children: [
      { index: true, element: <Home /> },
      {
        path: ':algoId',
        lazy: async () => ({ Component: (await import('./pages/AlgorithmShell')).AlgorithmShell }),
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('./pages/AlgorithmOverview')).AlgorithmOverview }),
          },
          { path: 'aula', lazy: async () => ({ Component: (await import('./pages/LessonPage')).LessonPage }) },
          { path: 'jogo', lazy: async () => ({ Component: (await import('./pages/QuestHome')).QuestHome }) },
          { path: 'jogo/:phaseId', lazy: async () => ({ Component: (await import('./pages/PhasePage')).PhasePage }) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]
