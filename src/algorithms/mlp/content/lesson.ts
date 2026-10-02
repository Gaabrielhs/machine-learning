import type { Lesson } from '../../../core/types'

const md = String.raw

export const lesson: Lesson = {
  intro: md`
    Vamos construir, entender e treinar uma rede neural pequena o suficiente para caber numa folha de papel:
    duas entradas, dois neurônios escondidos e uma saída. O problema é a luz de uma escada.
  `,
  sections: [
    {
      id: 'problema',
      title: 'O problema: a luz da escada',
      blocks: [
        {
          type: 'md',
          md: md`
            Muitas escadas têm um interruptor embaixo e outro em cima. Mexer em **qualquer um** troca o estado da luz.
            Se chamarmos cada interruptor de $x_1$ e $x_2$ (0 = para baixo, 1 = para cima), a luz fica assim:

            | $x_1$ | $x_2$ |   luz $y$   |
            | :---: | :---: | :---------: |
            |   0   |   0   | apagada (0) |
            |   0   |   1   |  acesa (1)  |
            |   1   |   0   |  acesa (1)  |
            |   1   |   1   | apagada (0) |

            Essa tabela tem nome: **OU exclusivo**, ou **XOR**. A luz acende quando exatamente um interruptor está para cima.

            Queremos uma rede que **aprenda** essa regra só olhando os 4 exemplos, sem ninguém programar o "se".
            Parece fácil, mas foi justamente esse problema que mostrou, em 1969, por que redes de uma camada só não bastam.
          `,
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'O que é aprender, aqui',
          md: md`
            A rede é uma fórmula com números ajustáveis (os **pesos**). Aprender é achar valores para esses pesos que façam a
            fórmula acertar os exemplos. Todo o resto da aula é sobre como achar esses valores automaticamente.
          `,
        },
      ],
    },
    {
      id: 'neuronio',
      title: 'O neurônio artificial',
      blocks: [
        {
          type: 'md',
          md: md`
            Um neurônio faz duas coisas:

            1. **Soma ponderada.** Multiplica cada entrada por um peso, soma tudo e soma um número extra chamado **viés**:
               $$z = w_1 x_1 + w_2 x_2 + b$$
               O peso diz o quanto cada entrada importa (e se ela empurra para cima ou para baixo). O viés desloca o resultado.
            2. **Ativação.** Passa $z$ por uma função que espreme o valor num intervalo. Aqui usamos a **sigmoide**,
               que transforma qualquer número num valor entre 0 e 1:
               $$\sigma(z) = \frac{1}{1 + e^{-z}}$$

            Se $\sigma(z) \ge 0{,}5$, dizemos que o neurônio respondeu "1". Isso acontece exatamente quando $z \ge 0$.
          `,
        },
        {
          type: 'widget',
          widget: 'NeuronPlayground',
          props: { gate: 'or' },
          caption:
            'Mexa nos pesos. A cor mostra a saída do neurônio em cada ponto do plano. Tente resolver OU e depois E.',
        },
        {
          type: 'md',
          md: md`
            Repare na linha tracejada: é onde $z = 0$. De um lado o neurônio diz 1, do outro diz 0.
            **Um neurônio sozinho só sabe desenhar uma reta.** Os pesos giram a reta e o viés a desliza.
          `,
        },
        {
          type: 'check',
          challenge: {
            id: 'l-neuronio-1',
            kind: 'number',
            prompt: md`
Com $w_1 = 2$, $w_2 = -1$ e $b = 0{,}5$, quanto vale $z$ para a entrada $(x_1, x_2) = (1, 1)$?
            `,
            answer: 1.5,
            tolerance: 0.001,
            hint: md`
Faça $2 \cdot 1 + (-1) \cdot 1 + 0{,}5$.
            `,
            explanation: md`
$z = 2 - 1 + 0{,}5 = 1{,}5$. Como $z > 0$, o neurônio responde 1.
            `,
          },
        },
      ],
    },
    {
      id: 'limite',
      title: 'Por que um neurônio não basta',
      blocks: [
        {
          type: 'md',
          md: md`
            No laboratório acima, escolha **OU exclusivo (XOR)** e tente acertar os 4 pontos. Não dá: o melhor possível são 3.

            Olhe os pontos do XOR: os dois "acesos" estão em cantos opostos, e os dois "apagados" também.
            Nenhuma reta separa um par do outro. Dizemos que o XOR **não é linearmente separável**.

            A saída é usar **dois** neurônios, cada um desenhando sua reta, e um terceiro que combina as respostas:

            - o neurônio $h_1$ responde "pelo menos um interruptor para cima" (OU);
            - o neurônio $h_2$ responde "não estão os dois para cima" (NÃO-E);
            - a saída acende quando $h_1$ **e** $h_2$ dizem sim.

            OU **e** NÃO-E é exatamente o XOR. Esses neurônios do meio formam a **camada oculta**: ninguém vê os valores
            deles, só a saída. Uma rede com camadas ocultas é um **perceptron multicamadas**, ou **MLP**.
          `,
        },
        {
          type: 'check',
          challenge: {
            id: 'l-limite-1',
            kind: 'choice',
            prompt: md`
Por que precisamos da camada oculta para o XOR?
            `,
            options: [
              {
                md: md`
Porque o XOR tem 4 exemplos e um neurônio só aprende 3.
                `,
                feedback: md`
O número de exemplos não é o problema. O formato da separação é.
                `,
              },
              {
                md: md`
Porque nenhuma reta separa os pontos acesos dos apagados.
                `,
                correct: true,
                feedback: md`
Um neurônio só desenha uma reta. Combinando duas retas, a rede consegue isolar os cantos opostos.
                `,
              },
              {
                md: md`
Porque a sigmoide não funciona com zeros e uns.
                `,
                feedback: md`
A sigmoide aceita qualquer número de entrada.
                `,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'ativacao',
      title: 'Funções de ativação',
      blocks: [
        {
          type: 'md',
          md: md`
            Por que não usar só a soma $z$, sem ativação? Porque somar somas continua sendo uma soma.
            Se os neurônios forem só lineares, a rede inteira vira uma única conta linear, e uma conta linear só desenha retas.
            A ativação **dobra** o espaço, e é isso que permite combinar retas em formas mais complexas.

            As três ativações mais comuns:

            - **Sigmoide** $\sigma(z)$: saída entre 0 e 1. Boa para representar probabilidade na saída.
            - **Tanh**: parecida, mas entre −1 e 1, centrada no zero. Costuma treinar mais rápido nas camadas ocultas.
            - **ReLU** $\max(0, z)$: zero para negativos, a própria entrada para positivos. Simples e muito usada em redes grandes.

            A linha tracejada abaixo é a **derivada**: o quanto a saída muda quando $z$ muda um pouquinho.
            Ela vai ser importante no treino, porque a rede só aprende por onde a derivada não é zero.
          `,
        },
        { type: 'widget', widget: 'ActivationExplorer' },
        {
          type: 'callout',
          tone: 'deep',
          md: md`
            A derivada da sigmoide tem uma forma prática: $\sigma'(z) = \sigma(z)\,(1 - \sigma(z))$.
            Ou seja, se o neurônio já calculou sua saída $a$, a derivada é só $a(1-a)$. O maior valor possível é $0{,}25$, em $z = 0$.
          `,
        },
      ],
    },
    {
      id: 'rede',
      title: 'Montando a rede',
      blocks: [
        {
          type: 'md',
          md: md`
            Nossa rede tem 2 entradas, 2 neurônios ocultos e 1 saída. Ela tem 9 números ajustáveis:
            4 pesos da entrada para a camada oculta, 2 vieses da camada oculta, 2 pesos da camada oculta para a saída e 1 viés da saída.

            Calcular a saída a partir da entrada se chama **forward** (passagem para a frente): cada camada usa o resultado da anterior.

            $$h_1 = \sigma(w_{11} x_1 + w_{21} x_2 + b_1) \qquad h_2 = \sigma(w_{12} x_1 + w_{22} x_2 + b_2)$$
            $$\hat y = \sigma(v_1 h_1 + v_2 h_2 + c)$$

            O chapéu em $\hat y$ indica "o que a rede acha". O $y$ sem chapéu é a resposta certa.

            Ligue e desligue os interruptores. Primeiro com os **pesos iniciais**, que são números quaisquer: a rede ainda
            não sabe nada e responde perto de 0,5 para tudo. Depois troque para os **pesos escolhidos à mão**, que implementam
            OU, NÃO-E e E. Essa rede acerta a luz da escada.
          `,
        },
        { type: 'widget', widget: 'XorForward' },
        {
          type: 'md',
          md: md`
            Escolher os pesos à mão funcionou porque o problema é minúsculo. Com 30 entradas e milhares de pesos, ninguém consegue.
            A partir de agora, a meta é fazer a rede **encontrar** pesos assim sozinha, partindo dos pesos iniciais.
          `,
        },
      ],
    },
    {
      id: 'erro',
      title: 'Medindo o erro',
      blocks: [
        {
          type: 'md',
          md: md`
            Para melhorar, a rede precisa de um número que diga o quanto errou. O mais simples é o **erro quadrático**:
            $$E = \tfrac{1}{2}\,(\hat y - y)^2$$

            - Elevar ao quadrado deixa o erro sempre positivo e pune mais os erros grandes.
            - O $\tfrac{1}{2}$ é só conveniência: ele cancela o 2 que aparece ao derivar.

            Para avaliar a rede inteira, tiramos a média do erro nos 4 exemplos. Treinar é **diminuir esse número**.
          `,
        },
        { type: 'widget', widget: 'LossExplorer', props: { showBce: false } },
        {
          type: 'callout',
          tone: 'deep',
          md: md`
            Em classificação, também é comum usar a **entropia cruzada**, $E = -[y \ln \hat y + (1-y)\ln(1-\hat y)]$.
            Ela pune muito mais uma resposta confiante e errada, e com a sigmoide na saída o gradiente fica mais simples: $\hat y - y$.
            O laboratório do fim da aula usa entropia cruzada.
          `,
        },
      ],
    },
    {
      id: 'gradiente',
      title: 'Descendo a montanha',
      blocks: [
        {
          type: 'md',
          md: md`
            Imagine o erro como uma paisagem: cada combinação de pesos é um ponto, e a altura é o erro. Queremos chegar ao vale.
            Você está no meio de uma névoa e só enxerga o chão sob seus pés. A estratégia: **sinta a inclinação e dê um passo morro abaixo**.

            A inclinação é a **derivada** do erro em relação ao peso, $\frac{\partial E}{\partial w}$. A regra de atualização é:
            $$w_{\text{novo}} = w - \eta \cdot \frac{\partial E}{\partial w}$$

            O sinal de menos faz o passo ir contra a subida. O número $\eta$ (eta) é a **taxa de aprendizado**: o tamanho do passo.

            Abaixo, um único peso $w$ e o erro $E(w) = (w-3)^2$, cujo mínimo está em $w = 3$. Dê passos com taxas diferentes.
          `,
        },
        { type: 'widget', widget: 'HillDescent' },
        {
          type: 'md',
          md: md`
            - **Taxa pequena** (0,05): chega, mas devagar.
            - **Taxa média** (0,3 a 0,5): chega rápido. Com 0,5 chega em um passo só, porque esta parábola é perfeita.
            - **Taxa grande** (acima de 1): cada passo pula o vale e cai mais alto do outro lado. O treino **diverge**.

            Numa rede de verdade, fazemos isso para todos os pesos ao mesmo tempo. Falta só saber calcular cada $\frac{\partial E}{\partial w}$.
          `,
        },
      ],
    },
    {
      id: 'backprop',
      title: 'Backpropagation: distribuindo a culpa',
      blocks: [
        {
          type: 'md',
          md: md`
            A saída errou. Quanto da culpa é de cada peso? O **backpropagation** responde isso andando de trás para frente,
            usando a **regra da cadeia**: se $A$ afeta $B$ e $B$ afeta $C$, o efeito de $A$ em $C$ é o produto dos efeitos.
            Como engrenagens: se uma gira 2 vezes mais rápido que a outra, e essa 3 vezes mais rápido que a terceira,
            a primeira gira 6 vezes mais rápido que a terceira.

            Definimos o **delta** ($\delta$) de cada neurônio: o quanto o erro muda quando o $z$ daquele neurônio muda.

            **Na saída**, a culpa é o erro vezes a derivada da sigmoide:
            $$\delta_o = (\hat y - y)\cdot \hat y\,(1-\hat y)$$

            **Na camada oculta**, cada neurônio recebe a culpa da saída, proporcional ao peso que o liga a ela:
            $$\delta_j = \delta_o \cdot v_j \cdot h_j\,(1 - h_j)$$

            **O gradiente de cada peso** é o delta do neurônio de destino vezes o valor que entrou pelo peso:
            $$\frac{\partial E}{\partial v_j} = \delta_o \cdot h_j \qquad \frac{\partial E}{\partial w_{ij}} = \delta_j \cdot x_i \qquad \frac{\partial E}{\partial b_j} = \delta_j$$

            Explore um passo completo, com todos os números:
          `,
        },
        { type: 'widget', widget: 'XorTrainStep' },
        {
          type: 'md',
          md: md`
            Escolha um exemplo e clique em **Aplicar o passo** algumas vezes: a saída para aquele exemplo se aproxima do alvo.
            Mas melhorar um exemplo pode piorar outro. Por isso o treino passa por todos os exemplos, muitas vezes.
          `,
        },
        {
          type: 'check',
          challenge: {
            id: 'l-backprop-1',
            kind: 'number',
            prompt: md`
A saída deu $\hat y = 0{,}6$ e o alvo é $y = 1$. Quanto vale $\delta_o = (\hat y - y)\,\hat y\,(1-\hat y)$?
            `,
            answer: -0.096,
            tolerance: 0.0005,
            hint: md`
$(0{,}6 - 1) \cdot 0{,}6 \cdot 0{,}4$
            `,
            explanation: md`
$-0{,}4 \cdot 0{,}24 = -0{,}096$. Negativo: aumentar $z$ diminui o erro, então o passo vai empurrar a saída para cima.
            `,
          },
        },
      ],
    },
    {
      id: 'treino',
      title: 'Treinando de verdade',
      blocks: [
        {
          type: 'md',
          md: md`
            Juntando tudo, o treino é um laço:

            1. pegue um exemplo;
            2. **forward**: calcule a saída;
            3. **erro**: compare com o gabarito;
            4. **backward**: calcule os deltas e os gradientes;
            5. **atualize** todos os pesos com $w \leftarrow w - \eta \cdot \partial E/\partial w$.

            Passar uma vez por todos os exemplos é uma **época**. Clique em Treinar e acompanhe a fronteira de decisão,
            o erro e os pesos mudando.
          `,
        },
        { type: 'widget', widget: 'XorTrainer' },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Às vezes não funciona',
          md: md`
            Clique em **Sortear pesos** algumas vezes e treine. Em alguns sorteios a rede empaca com erro alto: ela caiu num
            **mínimo local**, um vale que não é o mais fundo. Com 2 neurônios ocultos, a rede tem pouca folga.
            Na prática usamos mais neurônios, o que torna esse problema raro.
          `,
        },
      ],
    },
    {
      id: 'laboratorio',
      title: 'Laboratório',
      blocks: [
        {
          type: 'md',
          md: md`
            Agora com dados mais parecidos com os reais: 300 pontos no plano, com ruído. Parte deles fica separada como **teste**
            (pontos vazados): a rede nunca treina com eles. É o acerto no teste que diz se a rede **generalizou**
            ou só decorou os exemplos.

            Experimente:

            - **Círculo** com 1 neurônio oculto: impossível, pelo mesmo motivo do XOR. Com 3 ou 4 já resolve.
            - **Espiral**: precisa de 2 camadas e vários neurônios. Teste tanh e ReLU.
            - **Muito ruído** e muitos neurônios: o acerto no treino sobe e o do teste para de subir. Isso é **overfitting**.
            - Taxa 1 em vez de 0,1: o erro fica instável, como na montanha.
          `,
        },
        { type: 'widget', widget: 'Playground' },
      ],
    },
    {
      id: 'resumo',
      title: 'Resumo',
      blocks: [
        {
          type: 'md',
          md: md`
            | Ideia                 | Em uma frase                                                        |
            | --------------------- | ------------------------------------------------------------------- |
            | Neurônio              | soma ponderada das entradas mais um viés, passada por uma ativação  |
            | Ativação              | dobra o espaço; sem ela, a rede inteira seria uma reta              |
            | Camada oculta         | combina várias retas para formar fronteiras curvas                  |
            | Forward               | calcula a saída camada por camada                                   |
            | Erro (perda)          | número que mede o quanto a rede errou                               |
            | Gradiente descendente | anda contra a inclinação do erro, com passo $\eta$                  |
            | Backpropagation       | regra da cadeia de trás para frente para achar a culpa de cada peso |
            | Época                 | uma passada por todos os exemplos de treino                         |
            | Teste                 | dados guardados para medir se a rede generaliza                     |

            Para problemas com **mais de duas classes**, a saída ganha um neurônio por classe e a sigmoide é trocada pela
            **softmax**, que transforma as saídas em probabilidades que somam 1. O resto continua igual.
          `,
        },
      ],
    },
  ],
}
