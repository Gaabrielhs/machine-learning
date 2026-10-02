import type { Quest } from '../../../core/types'

const md = String.raw

export const quest: Quest = {
  intro: md`
    Oito fases, do neurônio isolado até treinar uma rede de verdade. Cada fase tem uma explicação e desafios que dão XP.
    Mude o nível quando quiser: a explicação se adapta, e cada nível tem seus próprios desafios.
  `,
  phases: [
    /* ================================================================ */
    {
      id: 'neuronio',
      title: 'O neurônio',
      tagline: 'Pesos, viés e uma decisão.',
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                Pense num neurônio como alguém decidindo se vai à praia. Ele olha alguns fatores (tem sol? tem companhia?)
                e cada fator tem uma **importância**, que chamamos de **peso**. Ele soma tudo e compara com um limite pessoal,
                que chamamos de **viés**.

                $$z = w_1 x_1 + w_2 x_2 + b$$

                Se $z$ der positivo, a resposta é "sim" (1). Se der negativo, "não" (0).
                Um peso grande quer dizer "esse fator importa muito". Um peso negativo quer dizer "esse fator me faz desistir".
              `,
            },
            {
              type: 'callout',
              tone: 'example',
              md: md`
Sol vale $w_1 = 2$, companhia vale $w_2 = 1$ e o viés é $b = -1{,}5$. Com sol e sem companhia: $z = 2 - 1{,}5 = 0{,}5 > 0$. Vai à praia.
              `,
            },
          ],
          challenges: [
            {
              id: 'neu-e-1',
              kind: 'choice',
              prompt: md`
O que um peso **negativo** significa para o neurônio?
              `,
              options: [
                {
                  md: md`
Que a entrada é ignorada.
                  `,
                  feedback: md`
Uma entrada ignorada teria peso zero.
                  `,
                },
                {
                  md: md`
Que a entrada empurra a decisão para o "não".
                  `,
                  correct: true,
                  feedback: md`
Quanto maior a entrada, menor fica $z$.
                  `,
                },
                {
                  md: md`
Que o neurônio está com defeito.
                  `,
                  feedback: md`
Pesos negativos são normais e muito úteis.
                  `,
                },
              ],
            },
            {
              id: 'neu-e-2',
              kind: 'mission',
              prompt: md`
Ajuste os controles até o neurônio funcionar como a porta **E**: só responde 1 quando as duas entradas são 1.
              `,
              widget: 'NeuronPlayground',
              props: { gate: 'and', lockGate: true },
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                Um neurônio artificial calcula uma **soma ponderada** das entradas mais um **viés**, e passa o resultado por uma
                função de ativação $g$:
                $$z = \sum_{i=1}^{n} w_i x_i + b = \mathbf{w}\cdot\mathbf{x} + b, \qquad a = g(z)$$

                Com a função degrau ($g(z)=1$ se $z \ge 0$, senão 0) temos o **perceptron** de Rosenblatt (1958).

                **Geometria:** os pontos onde $z = 0$ formam uma reta (em 2D) ou um hiperplano (em mais dimensões).
                Os pesos definem a inclinação da reta; o viés a desloca. O neurônio classifica pelo lado da reta em que o ponto está.
              `,
            },
          ],
          challenges: [
            {
              id: 'neu-m-1',
              kind: 'number',
              prompt: md`
Calcule $z$ para $\mathbf{x} = (1, 0, 1)$, $\mathbf{w} = (0{,}5;\ -1;\ 2)$ e $b = -1$.
              `,
              answer: 1.5,
              tolerance: 0.001,
              hint: md`
$0{,}5\cdot1 + (-1)\cdot 0 + 2\cdot 1 - 1$
              `,
              explanation: md`
$0{,}5 + 0 + 2 - 1 = 1{,}5$.
              `,
            },
            {
              id: 'neu-m-2',
              kind: 'mission',
              prompt: md`
Faça o neurônio implementar a porta **NÃO-E (NAND)**: responde 0 só quando as duas entradas são 1.
              `,
              widget: 'NeuronPlayground',
              props: { gate: 'nand', lockGate: true },
            },
            {
              id: 'neu-m-3',
              kind: 'choice',
              prompt: md`
Se você dobrar todos os pesos **e** o viés, o que acontece com a reta de decisão?
              `,
              options: [
                {
                  md: md`
Ela fica no mesmo lugar.
                  `,
                  correct: true,
                  feedback: md`
$2(\mathbf{w}\cdot\mathbf{x}+b)=0$ tem as mesmas soluções que $\mathbf{w}\cdot\mathbf{x}+b=0$. Muda só a "confiança" da sigmoide, que fica mais abrupta.
                  `,
                },
                {
                  md: md`
Ela se afasta da origem.
                  `,
                  feedback: md`
Para deslocar a reta, mude o viés sem mudar os pesos na mesma proporção.
                  `,
                },
                {
                  md: md`
Ela gira 90 graus.
                  `,
                  feedback: md`
Multiplicar tudo pelo mesmo número não muda a direção.
                  `,
                },
              ],
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                Para um lote de $m$ amostras com $n$ atributos, $X \in \mathbb{R}^{m\times n}$, uma camada de $k$ neurônios calcula
                $$Z = XW + \mathbf{1}\,b^\top, \qquad W \in \mathbb{R}^{n\times k},\ b \in \mathbb{R}^{k}$$

                Cada neurônio define o hiperplano $\{\mathbf{x} : \mathbf{w}^\top\mathbf{x} + b = 0\}$, de dimensão $n-1$.
                O vetor $\mathbf{w}$ é normal ao hiperplano e a distância com sinal de um ponto até ele é
                $(\mathbf{w}^\top\mathbf{x}+b)/\lVert\mathbf{w}\rVert$.

                **XOR não é linearmente separável.** Suponha um neurônio degrau que resolva o XOR. As quatro linhas da tabela exigem
                $b < 0$, $w_2 + b \ge 0$, $w_1 + b \ge 0$ e $w_1 + w_2 + b < 0$. Somando a segunda e a terceira:
                $w_1 + w_2 + 2b \ge 0$, logo $w_1 + w_2 + b \ge -b > 0$, contradizendo a quarta. Esse argumento, popularizado por
                Minsky e Papert (1969), motivou as camadas ocultas.

                O **teorema de convergência do perceptron** garante que a regra $\mathbf{w} \leftarrow \mathbf{w} + \eta (y - \hat y)\mathbf{x}$
                termina em número finito de passos quando os dados são linearmente separáveis, e nunca termina quando não são.
              `,
            },
          ],
          challenges: [
            {
              id: 'neu-h-1',
              kind: 'number',
              prompt: md`
Com 29 atributos de entrada, qual é a dimensão do hiperplano de decisão de um único neurônio?
              `,
              answer: 28,
              tolerance: 0,
              explanation: md`
Um hiperplano em $\mathbb{R}^n$ tem dimensão $n - 1$.
              `,
            },
            {
              id: 'neu-h-2',
              kind: 'choice',
              prompt: md`
Na prova acima, que par de desigualdades, somado, gera a contradição com $w_1 + w_2 + b < 0$?
              `,
              options: [
                {
                  md: md`
$b < 0$ e $w_1 + b \ge 0$
                  `,
                  feedback: md`
Somar essas duas não envolve $w_2$.
                  `,
                },
                {
                  md: md`
$w_1 + b \ge 0$ e $w_2 + b \ge 0$, usando depois $b < 0$
                  `,
                  correct: true,
                  feedback: md`
A soma dá $w_1+w_2+2b \ge 0$; como $-b > 0$, segue $w_1+w_2+b > 0$.
                  `,
                },
                {
                  md: md`
Só $w_1 + w_2 + b < 0$ e $b < 0$
                  `,
                  feedback: md`
Essas duas são compatíveis entre si.
                  `,
                },
              ],
            },
            {
              id: 'neu-h-3',
              kind: 'mission',
              prompt: md`
Implemente a porta **OU** com um neurônio sigmoide. Depois, sem valer XP, tente o XOR e confirme a prova.
              `,
              widget: 'NeuronPlayground',
              props: { gate: 'or', lockGate: true },
            },
          ],
        },
      },
    },
    /* ================================================================ */
    {
      id: 'ativacao',
      title: 'Ativação',
      tagline: 'A curva que dá forma à rede.',
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                Um interruptor só tem dois estados. Um **dimmer** regula a luz suavemente. A função de ativação transforma o
                interruptor do neurônio num dimmer: em vez de pular de 0 para 1, a resposta muda aos poucos.

                A mais famosa é a **sigmoide**, uma curva em forma de S que sempre devolve um número entre 0 e 1.
                Números muito negativos viram quase 0; muito positivos, quase 1; e o zero vira exatamente 0,5.

                Por que isso importa? Sem ativação, empilhar neurônios não adianta: somar somas continua sendo uma soma, e a rede
                inteira só saberia desenhar retas.
              `,
            },
            {
              type: 'widget',
              widget: 'ActivationExplorer',
              props: { options: ['sigmoid', 'tanh', 'relu'], showDerivative: false },
            },
          ],
          challenges: [
            {
              id: 'ati-e-1',
              kind: 'number',
              prompt: md`
Quanto vale a sigmoide em $z = 0$?
              `,
              answer: 0.5,
              tolerance: 0.001,
              hint: md`
Use o gráfico: passe o mouse em $z = 0$.
              `,
              explanation: md`
$\sigma(0) = 1/(1+e^0) = 1/2$.
              `,
            },
            {
              id: 'ati-e-2',
              kind: 'choice',
              prompt: md`
Por que a rede precisa de função de ativação?
              `,
              options: [
                {
                  md: md`
Para os números ficarem menores e o computador ir mais rápido.
                  `,
                  feedback: md`
Velocidade não é o motivo.
                  `,
                },
                {
                  md: md`
Para a rede conseguir formar fronteiras curvas, e não só retas.
                  `,
                  correct: true,
                  feedback: md`
A curva da ativação é o que deixa a rede combinar retas em formas complexas.
                  `,
                },
                {
                  md: md`
Para a saída ser sempre positiva.
                  `,
                  feedback: md`
A tanh, por exemplo, dá valores negativos.
                  `,
                },
              ],
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                | Função   | Fórmula                         | Saída        | Uso típico                        |
                | -------- | ------------------------------- | ------------ | --------------------------------- |
                | Sigmoide | $\sigma(z)=\dfrac{1}{1+e^{-z}}$ | $(0,1)$      | saída binária (probabilidade)     |
                | Tanh     | $\tanh(z)$                      | $(-1,1)$     | camadas ocultas em redes pequenas |
                | ReLU     | $\max(0,z)$                     | $[0,\infty)$ | camadas ocultas em redes grandes  |

                A **derivada** (linha tracejada) mede a sensibilidade da saída a mudanças em $z$. O treino depende dela:
                onde a derivada é quase zero (as pontas achatadas da sigmoide e da tanh), o neurônio está **saturado** e aprende muito devagar.
              `,
            },
            { type: 'widget', widget: 'ActivationExplorer' },
          ],
          challenges: [
            {
              id: 'ati-m-1',
              kind: 'number',
              prompt: md`
Calcule $\sigma(2)$ com 3 casas decimais.
              `,
              answer: 0.881,
              tolerance: 0.001,
              hint: md`
$e^{-2} \approx 0{,}1353$
              `,
              explanation: md`
$1/(1+0{,}1353) \approx 0{,}881$.
              `,
            },
            {
              id: 'ati-m-2',
              kind: 'choice',
              prompt: md`
Qual ativação faz sentido na **saída** de uma rede que estima a probabilidade de chover?
              `,
              options: [
                {
                  md: md`
ReLU
                  `,
                  feedback: md`
A ReLU não tem limite superior; uma probabilidade não passa de 1.
                  `,
                },
                {
                  md: md`
Sigmoide
                  `,
                  correct: true,
                  feedback: md`
Ela devolve valores entre 0 e 1, como uma probabilidade.
                  `,
                },
                {
                  md: md`
Tanh
                  `,
                  feedback: md`
A tanh vai de −1 a 1. Probabilidade negativa não existe.
                  `,
                },
              ],
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                Derivadas, que o backpropagation usa em cada camada:
                $$\sigma'(z) = \sigma(z)\,\big(1-\sigma(z)\big), \qquad \tanh'(z) = 1 - \tanh^2(z), \qquad \operatorname{ReLU}'(z) = \mathbb{1}[z>0]$$

                Note que $\tanh(z) = 2\sigma(2z) - 1$: a tanh é uma sigmoide reescalada e centrada.

                **Gradiente que desaparece.** Como $\max \sigma' = 1/4$, cada camada sigmoide multiplica o gradiente por no
                máximo $0{,}25$. Em $L$ camadas, o fator chega a $4^{-L}$. A ReLU tem derivada 1 na parte ativa e não sofre disso,
                mas um neurônio com $z<0$ para todas as entradas tem gradiente zero para sempre (**ReLU morta**).

                Para várias classes, a saída usa a **softmax**, $\hat y_k = e^{z_k}/\sum_j e^{z_j}$, cuja jacobiana é
                $\partial \hat y_j/\partial z_k = \hat y_j(\delta_{jk} - \hat y_k)$.
              `,
            },
            { type: 'widget', widget: 'ActivationExplorer', props: { options: ['sigmoid', 'tanh', 'relu', 'linear'] } },
          ],
          challenges: [
            {
              id: 'ati-h-1',
              kind: 'number',
              prompt: md`
Se $\sigma(z) = 0{,}8$, quanto vale $\sigma'(z)$?
              `,
              answer: 0.16,
              tolerance: 0.0005,
              explanation: md`
$0{,}8 \cdot 0{,}2 = 0{,}16$. Não é preciso saber $z$.
              `,
            },
            {
              id: 'ati-h-2',
              kind: 'number',
              prompt: md`
No melhor caso, por quanto o gradiente é multiplicado ao atravessar 5 camadas sigmoide? (decimal, 6 casas)
              `,
              answer: 0.000977,
              tolerance: 0.000002,
              explanation: md`
$0{,}25^5 = 1/1024 \approx 0{,}000977$. Mil vezes menor: as primeiras camadas quase não aprendem.
              `,
            },
            {
              id: 'ati-h-3',
              kind: 'choice',
              prompt: md`
Por que subtrair $\max_k z_k$ de todos os $z_k$ antes da softmax não muda o resultado?
              `,
              options: [
                {
                  md: md`
Porque o fator $e^{-c}$ aparece no numerador e no denominador e se cancela.
                  `,
                  correct: true,
                  feedback: md`
E evita que $e^{z}$ estoure para valores grandes de $z$.
                  `,
                },
                {
                  md: md`
Porque a softmax é linear.
                  `,
                  feedback: md`
A exponencial não é linear.
                  `,
                },
                {
                  md: md`
Muda, mas o erro é desprezível.
                  `,
                  feedback: md`
A igualdade é exata.
                  `,
                },
              ],
            },
          ],
        },
      },
    },
    /* ================================================================ */
    {
      id: 'camadas',
      title: 'Camadas',
      tagline: 'Juntando neurônios para resolver o XOR.',
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                Uma rede é uma **linha de montagem**. A camada de entrada recebe os dados. As **camadas ocultas** transformam.
                A camada de saída dá a resposta. A informação só anda para a frente, por isso o cálculo se chama **forward**.

                Lembra da luz da escada (XOR)? Um neurônio não resolve. Mas dois resolvem, cada um com uma pergunta simples:

                - neurônio 1: "algum interruptor está para cima?" (OU)
                - neurônio 2: "eles não estão os dois para cima?" (NÃO-E)

                A saída acende quando os dois dizem sim. Ligue os interruptores abaixo com os **pesos escolhidos à mão**.
              `,
            },
            { type: 'widget', widget: 'XorForward', props: { preset: 'handmade' } },
          ],
          challenges: [
            {
              id: 'cam-e-1',
              kind: 'choice',
              prompt: md`
Qual combinação dá o XOR?
              `,
              options: [
                {
                  md: md`
OU **e** NÃO-E
                  `,
                  correct: true,
                  feedback: md`
"Pelo menos um" e "não os dois" é o mesmo que "exatamente um".
                  `,
                },
                {
                  md: md`
E **e** NÃO-E
                  `,
                  feedback: md`
E e NÃO-E nunca são verdadeiros ao mesmo tempo.
                  `,
                },
                {
                  md: md`
OU **ou** E
                  `,
                  feedback: md`
Isso é só o OU: acenderia também com os dois para cima.
                  `,
                },
              ],
            },
            {
              id: 'cam-e-2',
              kind: 'choice',
              prompt: md`
Por que a camada do meio se chama **oculta**?
              `,
              options: [
                {
                  md: md`
Porque seus valores não aparecem nem na entrada nem na saída.
                  `,
                  correct: true,
                  feedback: md`
Ninguém fornece nem lê esses valores diretamente; a rede decide o que eles representam.
                  `,
                },
                {
                  md: md`
Porque ela é desligada depois do treino.
                  `,
                  feedback: md`
Ela continua sendo usada em toda previsão.
                  `,
                },
                {
                  md: md`
Porque seus pesos são secretos.
                  `,
                  feedback: md`
Os pesos podem ser inspecionados normalmente.
                  `,
                },
              ],
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                Na rede 2-2-1, o forward é:
                $$h_j = \sigma\!\Big(\sum_i w_{ij}\,x_i + b_j\Big), \qquad \hat y = \sigma\!\Big(\sum_j v_j\,h_j + c\Big)$$

                Uma solução à mão usa pesos grandes, para a sigmoide agir quase como degrau:
                $h_1 = \sigma(20x_1 + 20x_2 - 10)$ (OU), $h_2 = \sigma(-20x_1 - 20x_2 + 30)$ (NÃO-E) e
                $\hat y = \sigma(20h_1 + 20h_2 - 30)$ (E).
              `,
            },
            { type: 'widget', widget: 'XorForward', props: { preset: 'handmade' } },
          ],
          challenges: [
            {
              id: 'cam-m-1',
              kind: 'number',
              prompt: md`
Na solução à mão, quanto vale o $z$ de $h_1$ para a entrada $(1, 1)$?
              `,
              answer: 30,
              tolerance: 0,
              explanation: md`
$20 + 20 - 10 = 30$, então $h_1 \approx 1$.
              `,
            },
            {
              id: 'cam-m-2',
              kind: 'number',
              prompt: md`
Para a entrada $(0, 0)$: $h_1 \approx 0$ e $h_2 \approx 1$. Quanto vale o $z$ da saída (use os valores arredondados)?
              `,
              answer: -10,
              tolerance: 0,
              explanation: md`
$20\cdot 0 + 20 \cdot 1 - 30 = -10$, e $\sigma(-10) \approx 0$: luz apagada.
              `,
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                Em forma matricial, com uma amostra por linha:
                $$A^{[0]} = X, \qquad Z^{[l]} = A^{[l-1]}W^{[l]} + b^{[l]}, \qquad A^{[l]} = g^{[l]}(Z^{[l]})$$
                com $W^{[l]} \in \mathbb{R}^{n_{l-1}\times n_l}$. O número de parâmetros é $\sum_l (n_{l-1}+1)\,n_l$.

                **Aproximação universal** (Cybenko 1989, Hornik 1991): uma camada oculta com ativação não polinomial e neurônios
                suficientes aproxima qualquer função contínua num domínio compacto, com o erro que se quiser.
                O teorema garante existência, não diz quantos neurônios nem como achar os pesos. Na prática, redes mais
                profundas costumam representar a mesma função com muito menos neurônios.
              `,
            },
            { type: 'widget', widget: 'XorForward', props: { preset: 'example' } },
          ],
          challenges: [
            {
              id: 'cam-h-1',
              kind: 'number',
              prompt: md`
Quantos parâmetros (pesos + vieses) tem uma rede 4-8-8-3?
              `,
              answer: 139,
              tolerance: 0,
              hint: md`
$(4+1)\cdot 8 + (8+1)\cdot 8 + (8+1)\cdot 3$
              `,
              explanation: md`
$40 + 72 + 27 = 139$.
              `,
            },
            {
              id: 'cam-h-2',
              kind: 'choice',
              prompt: md`
Com $X$ de shape $(64, 29)$ e uma camada de 32 neurônios, qual é a shape de $W$ e de $Z$?
              `,
              options: [
                {
                  md: md`
$W$: $(29, 32)$; $Z$: $(64, 32)$
                  `,
                  correct: true,
                  feedback: md`
$(64,29)\times(29,32) = (64,32)$: uma linha por amostra, uma coluna por neurônio.
                  `,
                },
                {
                  md: md`
$W$: $(32, 29)$; $Z$: $(64, 32)$
                  `,
                  feedback: md`
Com uma amostra por linha, $XW$ exige que $W$ tenha 29 linhas.
                  `,
                },
                {
                  md: md`
$W$: $(64, 32)$; $Z$: $(29, 32)$
                  `,
                  feedback: md`
O número de pesos não depende do tamanho do lote.
                  `,
                },
              ],
            },
            {
              id: 'cam-h-3',
              kind: 'choice',
              prompt: md`
O que o teorema da aproximação universal **não** garante?
              `,
              options: [
                {
                  md: md`
Que uma rede com uma camada oculta pode representar qualquer função contínua.
                  `,
                  feedback: md`
Isso ele garante (com neurônios suficientes).
                  `,
                },
                {
                  md: md`
Que o gradiente descendente vai encontrar esses pesos.
                  `,
                  correct: true,
                  feedback: md`
Representar é diferente de aprender. Treinar pode cair em mínimos ruins, ou exigir dados e tempo demais.
                  `,
                },
              ],
            },
          ],
        },
      },
    },
    /* ================================================================ */
    {
      id: 'erro',
      title: 'Medir o erro',
      tagline: 'Um número para dizer o quanto a rede errou.',
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                Para aprender, a rede precisa saber o quanto errou. A medida mais simples é a **distância ao quadrado** entre a
                resposta da rede e o gabarito:
                $$\text{erro} = (\text{gabarito} - \text{resposta})^2$$
                Elevar ao quadrado deixa o erro sempre positivo e faz erros grandes pesarem bem mais que erros pequenos.
                Errar por 0,1 custa 0,01. Errar por 0,5 custa 0,25.
              `,
            },
            { type: 'widget', widget: 'LossExplorer', props: { showBce: false } },
          ],
          challenges: [
            {
              id: 'err-e-1',
              kind: 'number',
              prompt: md`
O gabarito é 1 e a rede respondeu 0,7. Qual é o erro quadrático $(1 - 0{,}7)^2$?
              `,
              answer: 0.09,
              tolerance: 0.0005,
              explanation: md`
$0{,}3^2 = 0{,}09$.
              `,
            },
            {
              id: 'err-e-2',
              kind: 'choice',
              prompt: md`
O que acontece com o erro se a rede responder exatamente o gabarito?
              `,
              options: [
                {
                  md: md`
Ele vira zero.
                  `,
                  correct: true,
                  feedback: md`
E é esse zero que o treino tenta alcançar.
                  `,
                },
                {
                  md: md`
Ele vira 1.
                  `,
                  feedback: md`
Diferença zero ao quadrado é zero.
                  `,
                },
                {
                  md: md`
Ele fica negativo.
                  `,
                  feedback: md`
Um quadrado nunca é negativo.
                  `,
                },
              ],
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                Para o conjunto de treino inteiro usamos a **média** dos erros, o **erro quadrático médio (MSE)**:
                $$\text{MSE} = \frac{1}{m}\sum_{i=1}^{m}\big(y_i - \hat y_i\big)^2$$
                Em classificação, a escolha mais comum é a **entropia cruzada binária**:
                $$\text{BCE} = -\frac{1}{m}\sum_{i=1}^{m}\Big[y_i \ln \hat y_i + (1-y_i)\ln(1-\hat y_i)\Big]$$
                Compare as duas abaixo: com o gabarito 1 e a saída perto de 0, a entropia cruzada dispara.
              `,
            },
            { type: 'widget', widget: 'LossExplorer' },
          ],
          challenges: [
            {
              id: 'err-m-1',
              kind: 'number',
              prompt: md`
Previsões $(0{,}9;\ 0{,}2;\ 0{,}6)$ e gabaritos $(1;\ 0;\ 1)$. Qual é o MSE?
              `,
              answer: 0.07,
              tolerance: 0.0005,
              hint: md`
$(0{,}1^2 + 0{,}2^2 + 0{,}4^2)/3$
              `,
              explanation: md`
$(0{,}01 + 0{,}04 + 0{,}16)/3 = 0{,}07$.
              `,
            },
            {
              id: 'err-m-2',
              kind: 'choice',
              prompt: md`
O gabarito é 1 e a rede disse 0,01 com toda a confiança. Qual medida pune mais esse erro?
              `,
              options: [
                {
                  md: md`
Erro quadrático
                  `,
                  feedback: md`
Ele fica perto de 0,98 (ou 0,49 com o fator ½), um valor limitado.
                  `,
                },
                {
                  md: md`
Entropia cruzada
                  `,
                  correct: true,
                  feedback: md`
$-\ln 0{,}01 \approx 4{,}6$, e cresce sem limite quando a saída vai a 0.
                  `,
                },
              ],
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                A entropia cruzada vem da **máxima verossimilhança**. Se a rede modela $P(y=1\mid x) = \hat y$, a verossimilhança de
                um rótulo é $\hat y^{\,y}(1-\hat y)^{1-y}$. Maximizar o produto sobre as amostras equivale a minimizar o negativo do
                log, que é exatamente a BCE. Para $K$ classes com softmax, o mesmo raciocínio dá $-\sum_k y_k \ln \hat y_k$.

                **Por que BCE com sigmoide treina melhor que MSE?** Derivando em relação a $z$ da saída:
                $$\frac{\partial\,\text{MSE}}{\partial z} \propto (\hat y - y)\,\hat y(1-\hat y), \qquad \frac{\partial\,\text{BCE}}{\partial z} = \hat y - y$$
                Com MSE, se a saída satura no lado errado ($\hat y \approx 0$, $y = 1$), o fator $\hat y(1-\hat y) \approx 0$ apaga o
                gradiente justamente quando o erro é máximo. Com BCE o fator se cancela. Veja os gradientes no painel abaixo.
              `,
            },
            { type: 'widget', widget: 'LossExplorer' },
          ],
          challenges: [
            {
              id: 'err-h-1',
              kind: 'number',
              prompt: md`
BCE de uma amostra com $y = 1$ e $\hat y = 0{,}25$ (3 casas).
              `,
              answer: 1.386,
              tolerance: 0.001,
              explanation: md`
$-\ln 0{,}25 = \ln 4 \approx 1{,}386$. É também a perda inicial típica de um classificador de 4 classes com saída uniforme.
              `,
            },
            {
              id: 'err-h-2',
              kind: 'number',
              prompt: md`
Com $y = 1$ e $\hat y = 0{,}01$, quanto vale o gradiente em $z$ usando MSE, $(\hat y - y)\hat y(1-\hat y)$? (4 casas)
              `,
              answer: -0.0098,
              tolerance: 0.00005,
              explanation: md`
$-0{,}99 \cdot 0{,}01 \cdot 0{,}99 \approx -0{,}0098$, contra $-0{,}99$ da BCE: cem vezes menor.
              `,
            },
          ],
        },
      },
    },
    /* ================================================================ */
    {
      id: 'gradiente',
      title: 'Descer a montanha',
      tagline: 'Gradiente descendente e a taxa de aprendizado.',
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                Você está numa montanha com neblina e quer chegar ao vale. Não enxerga longe, mas sente o chão inclinado.
                Estratégia: **dê um passo para o lado que desce**. Repita.

                Na rede, a montanha é o erro e sua posição são os pesos. A inclinação diz para onde mexer cada peso.
                O tamanho do passo se chama **taxa de aprendizado**:

                - passo pequeno demais: você chega, mas demora;
                - passo grande demais: você pula o vale e vai parar mais alto do outro lado.
              `,
            },
          ],
          challenges: [
            {
              id: 'gra-e-1',
              kind: 'mission',
              prompt: md`
Escolha uma taxa e chegue ao fundo do vale ($w = 3$) em até **10 passos**.
              `,
              widget: 'HillDescent',
              props: { mission: { maxSteps: 10, tolerance: 0.1 }, startLr: 0.05 },
            },
            {
              id: 'gra-e-2',
              kind: 'choice',
              prompt: md`
O treino está pulando de um lado para o outro e o erro só aumenta. O que fazer?
              `,
              options: [
                {
                  md: md`
Aumentar a taxa de aprendizado.
                  `,
                  feedback: md`
Passos maiores pulam ainda mais longe.
                  `,
                },
                {
                  md: md`
Diminuir a taxa de aprendizado.
                  `,
                  correct: true,
                  feedback: md`
Passos menores param de ultrapassar o vale.
                  `,
                },
                {
                  md: md`
Treinar por mais tempo sem mudar nada.
                  `,
                  feedback: md`
Se está divergindo, mais tempo só piora.
                  `,
                },
              ],
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                A regra do **gradiente descendente** para cada peso:
                $$w \leftarrow w - \eta\,\frac{\partial E}{\partial w}$$
                A derivada $\partial E/\partial w$ é a inclinação do erro naquele ponto. Se ela é positiva, aumentar $w$ aumenta o erro,
                então o passo diminui $w$. O sinal de menos cuida disso.

                No exemplo, $E(w) = (w-3)^2$, então $E'(w) = 2(w-3)$.
              `,
            },
          ],
          challenges: [
            {
              id: 'gra-m-1',
              kind: 'number',
              prompt: md`
O peso vale $w = 2$, a derivada é $0{,}4$ e a taxa é $\eta = 0{,}5$. Qual é o novo peso?
              `,
              answer: 1.8,
              tolerance: 0.0005,
              explanation: md`
$2 - 0{,}5 \cdot 0{,}4 = 1{,}8$.
              `,
            },
            {
              id: 'gra-m-2',
              kind: 'mission',
              prompt: md`
Chegue a menos de 0,05 do mínimo em até **4 passos**.
              `,
              widget: 'HillDescent',
              props: { mission: { maxSteps: 4, tolerance: 0.05 }, startLr: 0.05 },
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                Pela expansão de Taylor, $E(\mathbf{w} - \eta\nabla E) \approx E(\mathbf{w}) - \eta\lVert\nabla E\rVert^2$: para $\eta$
                pequeno, o passo sempre diminui o erro. Para uma quadrática com curvatura $c$ (segunda derivada), o passo multiplica a
                distância ao mínimo por $(1 - \eta c)$, que só encolhe se $0 < \eta < 2/c$. Com várias direções de curvaturas diferentes,
                a mais íngreme limita $\eta$ e a mais rasa dita a velocidade: é por isso que padronizar os atributos ajuda.

                **Variantes:** em lote (gradiente exato, 1 passo por época), estocástico (1 amostra por passo, ruidoso) e
                **mini-lote** (o padrão). **Momentum** acumula velocidade: $v \leftarrow \beta v + \nabla E$, $w \leftarrow w - \eta v$.
                **Adam** adapta a taxa por parâmetro usando médias móveis do gradiente e do seu quadrado.
              `,
            },
          ],
          challenges: [
            {
              id: 'gra-h-1',
              kind: 'number',
              prompt: md`
Para $E(w) = (w-3)^2$, que taxa $\eta$ leva qualquer ponto ao mínimo em **um** passo?
              `,
              answer: 0.5,
              tolerance: 0.0001,
              hint: md`
Resolva $w - \eta \cdot 2(w-3) = 3$.
              `,
              explanation: md`
$(w-3)(1 - 2\eta) = 0 \Rightarrow \eta = 1/2 = 1/c$, com $c = 2$.
              `,
            },
            {
              id: 'gra-h-2',
              kind: 'mission',
              prompt: md`
Agora prove: chegue a menos de 0,01 do mínimo em **1 passo**.
              `,
              widget: 'HillDescent',
              props: { mission: { maxSteps: 1, tolerance: 0.01 }, startLr: 0.1 },
            },
            {
              id: 'gra-h-3',
              kind: 'choice',
              prompt: md`
Nessa parábola ($c = 2$), a partir de que taxa o gradiente descendente diverge?
              `,
              options: [
                {
                  md: md`
$\eta > 0{,}5$
                  `,
                  feedback: md`
Acima de 0,5 ele oscila, mas ainda converge enquanto $|1-2\eta|<1$.
                  `,
                },
                {
                  md: md`
$\eta > 1$
                  `,
                  correct: true,
                  feedback: md`
$|1 - 2\eta| > 1 \iff \eta > 1 = 2/c$.
                  `,
                },
                {
                  md: md`
$\eta > 2$
                  `,
                  feedback: md`
O limite é $2/c$, e aqui $c = 2$.
                  `,
                },
              ],
            },
          ],
        },
      },
    },
    /* ================================================================ */
    {
      id: 'backprop',
      title: 'Backpropagation',
      tagline: 'A regra da cadeia, de trás para frente.',
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                A rede errou. De quem é a culpa? O **backpropagation** distribui a culpa do erro entre todos os pesos, começando
                pela saída e voltando camada por camada.

                A ideia matemática é a **regra da cadeia**, que funciona como engrenagens: se a engrenagem A gira 2 vezes mais
                rápido que a B, e a B gira 3 vezes mais rápido que a C, então A gira $2 \times 3 = 6$ vezes mais rápido que C.
                Na rede, cada peso afeta um neurônio, que afeta o próximo, que afeta o erro. Multiplicando os efeitos de cada elo,
                descobrimos o efeito do peso no erro.

                Pesos que contribuíram muito para o erro mudam muito. Pesos que quase não influenciaram, mudam pouco.
              `,
            },
          ],
          challenges: [
            {
              id: 'bac-e-1',
              kind: 'number',
              prompt: md`
A engrenagem A gira 2× mais rápido que a B, e a B gira 3× mais rápido que a C. Quantas vezes A gira mais rápido que C?
              `,
              answer: 6,
              tolerance: 0,
              explanation: md`
Os efeitos se multiplicam: $2 \times 3 = 6$. A regra da cadeia faz isso com derivadas.
              `,
            },
            {
              id: 'bac-e-2',
              kind: 'choice',
              prompt: md`
Por que o algoritmo começa pela **saída**?
              `,
              options: [
                {
                  md: md`
Porque é lá que sabemos o erro, comparando com o gabarito.
                  `,
                  correct: true,
                  feedback: md`
A partir do erro na saída, a culpa é passada para as camadas anteriores.
                  `,
                },
                {
                  md: md`
Porque a saída tem mais pesos.
                  `,
                  feedback: md`
Normalmente tem menos.
                  `,
                },
                {
                  md: md`
Por tradição; poderia começar em qualquer camada.
                  `,
                  feedback: md`
As camadas internas dependem da culpa calculada nas posteriores.
                  `,
                },
              ],
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                Com erro $E = \frac12(\hat y - y)^2$ e sigmoides, definimos o **delta** de cada neurônio como $\delta = \partial E/\partial z$:
                $$\delta_o = (\hat y - y)\,\hat y(1-\hat y), \qquad \delta_j = \delta_o\, v_j\, h_j(1-h_j)$$
                e os gradientes:
                $$\frac{\partial E}{\partial v_j} = \delta_o\,h_j, \qquad \frac{\partial E}{\partial w_{ij}} = \delta_j\,x_i, \qquad \frac{\partial E}{\partial b} = \delta$$
                Regra prática: **gradiente de um peso = delta do neurônio de chegada × valor que entrou pelo peso**.
              `,
            },
            { type: 'widget', widget: 'XorTrainStep' },
          ],
          challenges: [
            {
              id: 'bac-m-1',
              kind: 'number',
              prompt: md`
$\hat y = 0{,}6$ e $y = 1$. Calcule $\delta_o$.
              `,
              answer: -0.096,
              tolerance: 0.0005,
              explanation: md`
$(0{,}6-1)\cdot 0{,}6\cdot 0{,}4 = -0{,}096$.
              `,
            },
            {
              id: 'bac-m-2',
              kind: 'number',
              prompt: md`
Com esse $\delta_o$ e um neurônio oculto que vale $h_1 = 0{,}5$, quanto vale $\partial E/\partial v_1$?
              `,
              answer: -0.048,
              tolerance: 0.0005,
              explanation: md`
$-0{,}096 \cdot 0{,}5 = -0{,}048$. Negativo: aumentar $v_1$ reduz o erro.
              `,
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                Para um lote, com $dZ^{[L]} = \tfrac{1}{m}(\hat Y - Y)$ (softmax ou sigmoide com entropia cruzada):
                $$dW^{[l]} = \big(A^{[l-1]}\big)^{\!\top} dZ^{[l]}, \qquad db^{[l]} = \mathbf{1}^\top dZ^{[l]}$$
                $$dA^{[l-1]} = dZ^{[l]}\big(W^{[l]}\big)^{\!\top}, \qquad dZ^{[l-1]} = dA^{[l-1]} \odot g'\big(Z^{[l-1]}\big)$$
                As shapes guiam as transposições: $dW$ tem a shape de $W$.

                O backprop é a **diferenciação automática em modo reverso**: calcula o gradiente em relação a todos os parâmetros com
                custo da ordem de um forward, enquanto diferenças finitas exigiriam dois forwards **por parâmetro**. Diferenças finitas
                continuam úteis para **verificar** uma implementação: erro relativo abaixo de $10^{-7}$ indica gradiente correto.
              `,
            },
            { type: 'widget', widget: 'XorTrainStep' },
          ],
          challenges: [
            {
              id: 'bac-h-1',
              kind: 'choice',
              prompt: md`
$A^{[l-1]}$ tem shape $(m, n_{l-1})$ e $dZ^{[l]}$ tem shape $(m, n_l)$. Qual produto dá $dW^{[l]}$?
              `,
              options: [
                {
                  md: md`
$\big(A^{[l-1]}\big)^{\!\top} dZ^{[l]}$
                  `,
                  correct: true,
                  feedback: md`
$(n_{l-1}, m)\times(m, n_l)$; a soma sobre $m$ acumula as amostras do lote.
                  `,
                },
                {
                  md: md`
$A^{[l-1]}\,dZ^{[l]}$
                  `,
                  feedback: md`
As dimensões internas ($n_{l-1}$ e $m$) não batem.
                  `,
                },
                {
                  md: md`
$\big(dZ^{[l]}\big)^{\!\top} A^{[l-1]}$
                  `,
                  feedback: md`
Dá $(n_l, n_{l-1})$, a transposta.
                  `,
                },
              ],
            },
            {
              id: 'bac-h-2',
              kind: 'number',
              prompt: md`
Softmax + entropia cruzada, uma amostra. A probabilidade dada à classe correta é 0,7. Quanto vale $\partial L/\partial z$ dessa classe?
              `,
              answer: -0.3,
              tolerance: 0.0005,
              explanation: md`
$\hat y_k - y_k = 0{,}7 - 1 = -0{,}3$.
              `,
            },
            {
              id: 'bac-h-3',
              kind: 'number',
              prompt: md`
Verificar por diferenças finitas centradas uma rede com 1.556 parâmetros custa quantos forwards?
              `,
              answer: 3112,
              tolerance: 0,
              explanation: md`
Dois por parâmetro. O backprop faz o mesmo trabalho com um forward e um backward.
              `,
            },
          ],
        },
      },
    },
    /* ================================================================ */
    {
      id: 'treino',
      title: 'Treinar bem',
      tagline: 'Épocas, lotes e o perigo de decorar.',
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                Treinar é repetir: mostrar exemplos, medir o erro, ajustar os pesos. Uma passada por todos os exemplos é uma **época**.

                Um cuidado essencial: separar alguns exemplos que a rede **nunca** vê no treino, o **conjunto de teste**.
                É como estudar com exercícios e fazer a prova com questões novas. Se a rede acerta o treino mas erra o teste,
                ela **decorou** em vez de aprender. Isso se chama **overfitting**.
              `,
            },
            { type: 'widget', widget: 'XorTrainer' },
          ],
          challenges: [
            {
              id: 'tre-e-1',
              kind: 'choice',
              prompt: md`
A rede acerta 100% no treino e 60% no teste. O que aconteceu?
              `,
              options: [
                {
                  md: md`
Overfitting: ela decorou os exemplos de treino.
                  `,
                  correct: true,
                  feedback: md`
Acertar só o que já viu é decorar.
                  `,
                },
                {
                  md: md`
Ela precisa de mais épocas.
                  `,
                  feedback: md`
Mais épocas normalmente aumentam a decoreba.
                  `,
                },
                {
                  md: md`
O teste está com defeito.
                  `,
                  feedback: md`
A diferença grande entre treino e teste é o sinal clássico de overfitting.
                  `,
                },
              ],
            },
            {
              id: 'tre-e-2',
              kind: 'choice',
              prompt: md`
O que é uma época?
              `,
              options: [
                {
                  md: md`
Uma atualização de um peso.
                  `,
                  feedback: md`
Uma época tem muitas atualizações.
                  `,
                },
                {
                  md: md`
Uma passada completa por todos os exemplos de treino.
                  `,
                  correct: true,
                  feedback: md`
Treinos costumam ter de dezenas a milhares de épocas.
                  `,
                },
                {
                  md: md`
O tempo de 1 segundo de treino.
                  `,
                  feedback: md`
Época conta passadas pelos dados, não tempo.
                  `,
                },
              ],
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                **Mini-lotes.** Em vez de atualizar após cada exemplo ou após todos, atualizamos após grupos de 16 a 128 exemplos.
                Cada época então tem $\lceil m / \text{lote} \rceil$ atualizações.

                **Três conjuntos.** Treino (ajusta os pesos), **validação** (escolhe hiperparâmetros como taxa e número de neurônios)
                e teste (só no final, para o número que vai no relatório).

                **Parada antecipada.** Acompanhe a perda de validação. Quando ela para de cair por várias épocas seguidas, pare e
                volte aos pesos da melhor época.
              `,
            },
            { type: 'widget', widget: 'Playground', props: { dataset: 'moons', layers: [6] } },
          ],
          challenges: [
            {
              id: 'tre-m-1',
              kind: 'number',
              prompt: md`
1.000 exemplos de treino e lote de 50. Quantas atualizações de pesos por época?
              `,
              answer: 20,
              tolerance: 0,
              explanation: md`
$1000 / 50 = 20$.
              `,
            },
            {
              id: 'tre-m-2',
              kind: 'choice',
              prompt: md`
A perda de treino continua caindo, mas a de validação começou a subir. O que a parada antecipada faz?
              `,
              options: [
                {
                  md: md`
Continua até a perda de treino chegar a zero.
                  `,
                  feedback: md`
Isso aprofundaria o overfitting.
                  `,
                },
                {
                  md: md`
Para e restaura os pesos da época com menor perda de validação.
                  `,
                  correct: true,
                  feedback: md`
É uma forma simples e eficaz de regularização.
                  `,
                },
                {
                  md: md`
Aumenta a taxa de aprendizado.
                  `,
                  feedback: md`
Não há relação direta com a taxa.
                  `,
                },
              ],
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                **Inicialização.** Pesos iguais geram neurônios idênticos que recebem gradientes idênticos: a simetria nunca se quebra.
                A escala importa: com $\operatorname{Var}(w) = s^2$, a variância de $z$ é cerca de $n_{\text{in}} s^2$.
                Xavier usa $s^2 = 1/n_{\text{in}}$ (tanh, sigmoide); He usa $s^2 = 2/n_{\text{in}}$ (ReLU zera metade das entradas).

                **Regularização L2.** $E_{\text{reg}} = E + \tfrac{\lambda}{2}\sum w^2$ soma $\lambda w$ ao gradiente: cada passo
                encolhe os pesos (_weight decay_). **Dropout** zera neurônios ao acaso no treino, com escala $1/(1-p)$, e nada na inferência.

                **Diagnóstico.** Perda inicial perto de $\ln K$; a rede deve conseguir decorar um lote minúsculo; verifique o gradiente
                numericamente antes de treinar no conjunto completo.
              `,
            },
            { type: 'widget', widget: 'Playground', props: { dataset: 'spiral', layers: [8, 8] } },
          ],
          challenges: [
            {
              id: 'tre-h-1',
              kind: 'number',
              prompt: md`
Inicialização de He para uma camada com 50 entradas: qual é o desvio-padrão dos pesos?
              `,
              answer: 0.2,
              tolerance: 0.0005,
              explanation: md`
$\sqrt{2/50} = \sqrt{0{,}04} = 0{,}2$.
              `,
            },
            {
              id: 'tre-h-2',
              kind: 'choice',
              prompt: md`
Com L2, $E_{\text{reg}} = E + \tfrac{\lambda}{2}\lVert W\rVert^2$. O que muda no gradiente de $W$?
              `,
              options: [
                {
                  md: md`
Soma-se $\lambda W$.
                  `,
                  correct: true,
                  feedback: md`
A derivada de $\tfrac{\lambda}{2}w^2$ é $\lambda w$.
                  `,
                },
                {
                  md: md`
Soma-se $\lambda$.
                  `,
                  feedback: md`
O termo depende do próprio peso.
                  `,
                },
                {
                  md: md`
Multiplica-se por $\lambda$.
                  `,
                  feedback: md`
O termo é aditivo.
                  `,
                },
              ],
            },
            {
              id: 'tre-h-3',
              kind: 'choice',
              prompt: md`
Todos os pesos de uma camada oculta começam em 0,1. O que acontece?
              `,
              options: [
                {
                  md: md`
Os neurônios da camada continuam idênticos durante todo o treino.
                  `,
                  correct: true,
                  feedback: md`
Mesma entrada, mesma saída, mesmo gradiente. A camada inteira equivale a um neurônio.
                  `,
                },
                {
                  md: md`
Nada; o treino quebra a simetria sozinho.
                  `,
                  feedback: md`
O gradiente descendente é determinístico dado o estado; nada diferencia os neurônios.
                  `,
                },
              ],
            },
          ],
        },
      },
    },
    /* ================================================================ */
    {
      id: 'chefao',
      title: 'Desafio final',
      tagline: 'Monte e treine uma rede de verdade.',
      boss: true,
      levels: {
        easy: {
          blocks: [
            {
              type: 'md',
              md: md`
                Hora de treinar uma rede de verdade. Os pontos azuis e laranja estão misturados em quadrantes, como um XOR com ruído.
                Clique em **Treinar** e acompanhe o acerto no teste. Se travar, clique em **Novos pesos** ou adicione neurônios.
              `,
            },
          ],
          challenges: [
            {
              id: 'boss-e-1',
              kind: 'mission',
              prompt: md`
Chegue a **95% de acerto no teste** com os quadrantes.
              `,
              widget: 'Playground',
              props: { dataset: 'xor', lockDataset: true, layers: [4], mission: { target: 0.95 } },
            },
            {
              id: 'boss-e-2',
              kind: 'choice',
              prompt: md`
Por que olhamos o acerto no **teste** e não no treino?
              `,
              options: [
                {
                  md: md`
Porque o teste mostra se a rede funciona com dados que ela nunca viu.
                  `,
                  correct: true,
                  feedback: md`
É o que importa no mundo real.
                  `,
                },
                {
                  md: md`
Porque o teste é maior.
                  `,
                  feedback: md`
Normalmente ele é menor que o treino.
                  `,
                },
              ],
            },
          ],
        },
        medium: {
          blocks: [
            {
              type: 'md',
              md: md`
                Uma classe forma um disco no centro, a outra um anel ao redor. Um neurônio só desenha uma reta; quantos você precisa
                para cercar o disco? Desafio: resolva com **no máximo 4 neurônios ocultos**.
              `,
            },
          ],
          challenges: [
            {
              id: 'boss-m-1',
              kind: 'mission',
              prompt: md`
**95% no teste** no círculo usando até **4 neurônios ocultos** no total.
              `,
              widget: 'Playground',
              props: { dataset: 'circle', lockDataset: true, layers: [1], mission: { target: 0.95, maxNeurons: 4 } },
            },
            {
              id: 'boss-m-2',
              kind: 'number',
              prompt: md`
Qual é o menor número de neurônios ocultos (uma camada, ativação tanh) que costuma resolver o círculo? Teste no laboratório.
              `,
              answer: 3,
              tolerance: 0,
              explanation: md`
Três retas formam um triângulo que cerca o disco. Com 2, a região fica aberta.
              `,
            },
          ],
        },
        hard: {
          blocks: [
            {
              type: 'md',
              md: md`
                Duas espirais entrelaçadas: o clássico teste de Lang e Witbrock (1988). Exige fronteiras muito curvas, normalmente
                com duas camadas ocultas. Escolha arquitetura, ativação e taxa. Se a perda estacionar alta, mude a taxa ou sorteie
                novos pesos; se o teste ficar muito abaixo do treino, reduza o tamanho da rede ou aumente o ruído.
              `,
            },
          ],
          challenges: [
            {
              id: 'boss-h-1',
              kind: 'mission',
              prompt: md`
**90% de acerto no teste** na espiral.
              `,
              widget: 'Playground',
              props: { dataset: 'spiral', lockDataset: true, layers: [4], mission: { target: 0.9 } },
            },
            {
              id: 'boss-h-2',
              kind: 'choice',
              prompt: md`
Sua rede chegou a 100% no treino e 80% no teste na espiral com muito ruído. Qual mudança tem mais chance de ajudar?
              `,
              options: [
                {
                  md: md`
Dobrar o número de neurônios.
                  `,
                  feedback: md`
Mais capacidade tende a decorar ainda mais o ruído.
                  `,
                },
                {
                  md: md`
Usar menos neurônios ou parar antes (parada antecipada).
                  `,
                  correct: true,
                  feedback: md`
Reduzir capacidade ou tempo de treino combate o overfitting.
                  `,
                },
                {
                  md: md`
Aumentar a taxa de aprendizado.
                  `,
                  feedback: md`
Isso afeta a otimização, não a generalização diretamente.
                  `,
                },
              ],
            },
          ],
        },
      },
    },
  ],
}
