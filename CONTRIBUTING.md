# Adicionando um algoritmo

Cada algoritmo é um módulo independente em `src/algorithms/<id>/`. O núcleo (páginas, jogo, progresso) não precisa mudar.

## 1. Crie a pasta

```
src/algorithms/arvore-decisao/
  meta.ts
  index.ts
  content/lesson.ts
  content/quest.ts
  engine/            (opcional) a implementação do algoritmo, com testes
  widgets/           (opcional) componentes interativos
```

## 2. `meta.ts`: o cartão do catálogo

```ts
import type { AlgorithmMeta } from '../../core/types'

export const arvoreMeta: AlgorithmMeta = {
  id: 'arvore-decisao', // vira a URL: /arvore-decisao/aula
  name: 'Árvore de decisão',
  shortName: 'Árvore',
  family: 'Árvores e ensembles',
  task: 'Classificação e regressão',
  summary: 'Uma sequência de perguntas sim/não aprendida a partir dos dados.',
  example: 'decidir se vale a pena jogar tênis olhando o tempo.',
  prerequisites: ['probabilidade básica'],
}
```

## 3. `index.ts`: o módulo completo

```ts
import { lazy } from 'react'
import type { AlgorithmModule } from '../../core/types'
import { lesson } from './content/lesson'
import { quest } from './content/quest'
import { arvoreMeta } from './meta'

const mod: AlgorithmModule = {
  meta: arvoreMeta,
  lesson,
  quest,
  widgets: {
    SplitExplorer: lazy(() => import('./widgets/SplitExplorer')),
  },
}
export default mod
```

## 4. Registre em `src/core/registry.ts`

```ts
{ meta: arvoreMeta, load: () => import('../algorithms/arvore-decisao').then((m) => m.default) },
```

O import dinâmico mantém o código do algoritmo fora do bundle inicial.

## Escrevendo conteúdo

O tipo `Block` (em `src/core/types.ts`) define o que pode aparecer numa seção ou fase:

| Bloco                               | Para quê                                     |
| ----------------------------------- | -------------------------------------------- |
| `{ type: 'md', md }`                | texto em Markdown com LaTeX (`$x$`, `$$x$$`) |
| `{ type: 'callout', tone, md }`     | destaque: `tip`, `warn`, `example`, `deep`   |
| `{ type: 'reveal', summary, md }`   | conteúdo recolhido (respostas, derivações)   |
| `{ type: 'widget', widget, props }` | um widget do módulo, pelo nome               |
| `{ type: 'check', challenge }`      | pergunta de fixação dentro da aula (sem XP)  |

Desafios do jogo (`Challenge`):

| Tipo      | Campos                                                                            |
| --------- | --------------------------------------------------------------------------------- |
| `choice`  | `prompt`, `options` (exatamente uma com `correct: true`, todas com `feedback`)    |
| `number`  | `prompt`, `answer`, `tolerance`, `explanation`, `hint` opcional                   |
| `mission` | `prompt`, `widget`, `props`: o widget chama `onComplete()` quando o jogador vence |

Use `const md = String.raw` e escreva o Markdown com template strings: o `String.raw` preserva as barras do LaTeX. A indentação comum é removida automaticamente.

### Os três níveis

Toda fase do jogo precisa de `easy`, `medium` e `hard`, cada um com explicação e ao menos um desafio.

- **Fácil**: intuição, analogias do dia a dia, no máximo uma fórmula simples. Desafios conceituais ou com uma conta de uma linha.
- **Médio**: as fórmulas que se usa na prática e contas pequenas à mão.
- **Difícil**: derivações, notação matricial, custo computacional, detalhes de implementação e referências históricas.

Os ids de desafio precisam ser únicos dentro do módulo (sugestão: `<fase>-<nível>-<n>`).

## Widgets

Um widget é um componente React com `export default`. Ele recebe as `props` do conteúdo mais `level` e, em missões, `onComplete`. Use os utilitários existentes:

- `useCanvas(draw, deps, altura)`: canvas nítido que redesenha ao mudar tamanho ou tema; `draw` recebe a paleta atual.
- `drawAxes`, `plotFunction`, `fmt` em `components/plot.ts`.
- `NetDiagram`, `Segmented`, `Slider`, `Select`.

Cores sempre via paleta (`p.accent`, `p.pos`, `p.neg`...) ou variáveis CSS, nunca literais, para funcionar nos dois temas.

## Antes de abrir o PR

```bash
npm run check
```

O teste `src/core/content.test.ts` valida automaticamente todo módulo registrado. Se o algoritmo tiver missões com metas numéricas, acrescente um teste mostrando que elas têm solução (veja `src/algorithms/mlp/missions.test.ts`).
