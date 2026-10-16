/** Apresentações dos trabalhos, listadas em /projetos. A rota de cada uma fica em routes.tsx. */
export interface Project {
  path: string
  title: string
  summary: string
  /** etapa do trabalho, algoritmo e tipo de tarefa, exibidos como etiquetas */
  stage: string
  algorithm: string
  task: string
}

export const PROJECTS: Project[] = [
  {
    path: '/projetos/divida-de-sono',
    title: 'Dívida de sono × celular',
    summary:
      'Classifica cada pessoa em uma de quatro categorias de dívida de sono a partir do perfil, dos hábitos e do sono.',
    stage: 'Trabalho 1',
    algorithm: 'MLP',
    task: 'Classificação',
  },
  {
    path: '/projetos/horas-de-sono',
    title: 'Horas de sono × celular',
    summary: 'Prevê quantas horas uma pessoa dorme só com o perfil e os hábitos à noite, com uma árvore de decisão.',
    stage: 'Trabalho 2',
    algorithm: 'Árvore de decisão',
    task: 'Regressão',
  },
]
