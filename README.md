# Trilha ML

Site para aprender algoritmos de aprendizado de máquina por dentro. Cada algoritmo tem dois modos:

- **Aula**: um exemplo pequeno, explicado passo a passo, com widgets interativos (a MLP usa a "luz da escada", o problema XOR).
- **Jogo**: fases com desafios e XP, em três níveis (**Fácil**, **Médio**, **Difícil**). O nível pode ser trocado a qualquer momento; a explicação e os desafios mudam junto, e o botão "Aprofundar" mostra a explicação do nível seguinte.

O primeiro módulo é o **Perceptron multicamadas (MLP)**. A arquitetura foi feita para receber outros algoritmos sem mexer no núcleo (veja [CONTRIBUTING.md](CONTRIBUTING.md)).

## Rodando localmente

Requer Node 20 ou mais recente.

```bash
npm install
npm run dev
```

| Comando             | O que faz                                            |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | servidor de desenvolvimento                          |
| `npm run build`     | build de produção em `dist/`                         |
| `npm run preview`   | serve o build localmente                             |
| `npm test`          | testes (motor da rede, conteúdo, missões, interface) |
| `npm run lint`      | lint com oxlint                                      |
| `npm run typecheck` | checagem de tipos                                    |
| `npm run format`    | formata com Prettier                                 |
| `npm run check`     | tudo acima, na ordem do CI                           |

## Deploy

O build é um site estático (SPA). Qualquer host estático serve, desde que redirecione rotas desconhecidas para `index.html`.

- **Cloudflare Pages**: conecte o repositório (preset _React (Vite)_, build `npm run build`, saída `dist`). `public/_headers` define CSP e cache. O fallback de rotas é automático porque o build não tem `404.html`.
- **GitHub Pages**: ative _Settings → Pages → Source: GitHub Actions_. O workflow **Deploy GitHub Pages** publica a cada push na `main` e copia `index.html` para `404.html`. Com domínio próprio o site fica na raiz; sem domínio, crie a variável de repositório `BASE_PATH=/<nome-do-repo>/`. O GitHub Pages não permite cabeçalhos HTTP, então a CSP não se aplica lá.
- **Vercel**: importe o repositório. `vercel.json` já define build, fallback de rotas, cabeçalhos e cache.
- **Netlify**: importe o repositório. `netlify.toml` faz o mesmo.

Para publicar em um subcaminho em outro host, defina `BASE_PATH` no build (ex.: `BASE_PATH=/trilha/ npm run build`).

O CI (`.github/workflows/ci.yml`) roda tipos, lint, formatação, testes e build em cada push e pull request.

## Arquitetura

```
src/
  core/              tipos de conteúdo, registro de algoritmos, progresso, validação
  components/        Markdown + KaTeX, blocos, desafios, diagramas, gráficos
  pages/             início, aula, mapa do jogo, fase
  algorithms/
    mlp/
      meta.ts        dados do catálogo (carregados sempre)
      index.ts       módulo completo (carregado sob demanda)
      content/       lesson.ts (aula) e quest.ts (fases × 3 níveis)
      engine/        rede neural em TypeScript puro, com testes
      widgets/       componentes interativos usados pelo conteúdo
```

- **Conteúdo como dados.** Aula e jogo são objetos TypeScript tipados com Markdown e LaTeX (`$...$`, `$$...$$`). Widgets entram por nome.
- **Validação no CI.** `src/core/validate.ts` confere cada módulo: três níveis por fase, exatamente uma opção correta por pergunta, respostas numéricas finitas, widgets existentes, ids únicos. `missions.test.ts` treina redes de verdade para garantir que as missões do desafio final têm solução.
- **Progresso local.** XP e fases concluídas ficam no `localStorage` do visitante, num formato versionado (`src/core/progress.ts`). Nada é enviado a servidor algum.
- **Desempenho.** A página inicial não carrega KaTeX nem Markdown. Cada algoritmo e cada widget viram chunks separados.
- **Acessibilidade.** Controles nativos (rádios, fieldsets), foco visível, link para pular ao conteúdo, `prefers-reduced-motion` e temas claro/escuro.

## Configuração

Nome, slogan e link do repositório ficam em `src/config/site.ts`. As cores e fontes ficam em `src/styles/tokens.css`.
