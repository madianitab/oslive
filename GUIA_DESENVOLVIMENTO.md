# Guia de desenvolvimento do OSLive

Este guia reúne os padrões do projeto. Quem for alterar o OSLive (pessoa ou assistente de IA) deve lê-lo junto com o `README.md` e segui-lo.

**Pedido-modelo para um novo chat:**

> Repositório: https://github.com/madianitab/oslive. Leia o `README.md` e o `GUIA_DESENVOLVIMENTO.md` e siga os padrões. Quero [descreva o pedido]. Entregue como patch com autora madianitab &lt;madianitab@gmail.com&gt;.

---

## 1. Visão geral

- **Objetivo:** simulador didático de Sistemas Operacionais, usado nas aulas da professora Madianita (UNITINS). Os conceitos e a nomenclatura seguem o material das aulas, o livro da autora e os livros-texto (Silberschatz; Oliveira, Carissimi e Toscani; Tanenbaum).
- **Tecnologia:** Angular 18, com componentes `standalone`, `signals` e o novo controle de fluxo (`@if`, `@for`).
- **Publicação:** GitHub Pages, por meio do workflow `.github/workflows/deploy.yml`, a cada push na `main`.
- **Rotas com `#`** (`useHash: true`), por exemplo `#/escalonamento/simulador`. Sem isso, recarregar uma página no GitHub Pages dá erro 404. Não remova.

## 2. Estrutura de pastas

```
src/app/
├── core/          utilitários (gera_cor, constantes, tema claro/escuro)
├── ui/            DESIGN SYSTEM (componentes os-*, tokens.css, styles/)
├── pages/         landing, simulacoes (página com os cards), brandkit (vitrine do design system)
└── features/      um assunto por pasta
    └── <assunto>/
        ├── models/       lógica pura (algoritmos), sem Angular → fácil de testar
        ├── services/     estado da tela (signals) e regras de exercício
        ├── simulador/components/...     (ou simulador-simples, simulador-demanda, fixas, variaveis...)
        └── exercicios/components/...    (ou exercicios-simples...)
```

Assuntos atuais: `processos`, `escalonamento`, `particoes`, `paginacao` e `segmentacao`. A tabela de rotas está no `README.md`.

**Separação obrigatória:**
- O algoritmo fica no `models/` e não depende do Angular.
- O serviço guarda o estado com `signals`.
- Os componentes só exibem e repassam ações.

## 3. Design system (PR #1)

O visual vem do design system criado no [PR #1](https://github.com/madianitab/oslive/pull/1), em `src/app/ui`. A página **`#/brandkit`** mostra todos os componentes em uso. **Todo módulo novo deve usar esse design system.** Não use Bootstrap, cores fixas nem componentes visuais próprios quando já existir um equivalente.

### 3.1 Componentes (`src/app/ui`, exportados em `ui/index.ts`)

| Componente | Uso | Entradas principais |
|---|---|---|
| `os-sim-shell` | Casca de toda tela de simulação ou exercício | `title`, `subtitle`; slots `actions` (botões do topo) e `config` (lateral) |
| `os-panel` | Painel da lateral de configuração | `title`; slot `meta` (ex.: contador) |
| `os-button` | Botões | `variant`: `p` (principal), `s` (secundário), `g` (fantasma), `d` (perigo); `size="sm"`; `type` |
| `os-button-group` | Grupo de botões de ícone no topo da casca | botões `.osbg-btn` (com `primary` ou `danger`), sempre com `aria-label` e `title` |
| `os-stat` | Cartões de números no topo da área | `label`, `value`, `unit`, `hint`, `accent` |
| `os-badge` | Etiquetas | `variant`: `n`, `a`, `s`, `w`, `d`, `i` |
| `os-card`, `os-card-icon` | Cards da página Simulações | `title`; slots `icon`, `badge`, `footer` |
| `os-sim-log` | Diário de eventos | `itens: { rotulo }[]`, `ativo` |
| `os-alert`, `os-input`, `os-progress`, `os-terminal`, `os-sim-player`, `os-sim-callout`, `os-topbar` | Ver `#/brandkit` | |

### 3.2 Estilos compartilhados (`src/app/ui/styles/`)

- `sim-config.css`: lateral de configuração (`.sim-config`, `.form-control`, `.check-row`, `.proc-form`, `.proc-actions`, `.ptable`, `.p-dot`, `.p-act`, `.hint`, `.empty`, `.info-livre`).
- `sim-viz.css`: área principal (`.viz`, `.viz-label`, `.viz-stats`, `.viz-scroll`, `.viz-table` (com `.gantt` para o diagrama de uso da CPU, compacto), `.t-lbl`, `.t-val`, `.t-proc`, `.res-card`, `.res-table`, `.mem-table`, `.mem-livre`, `.mem-grupo`, `.empty-hint`).

Inclua esses arquivos no `styleUrls` do componente, por exemplo `'../../../../../ui/styles/sim-viz.css'`. Use o CSS do próprio componente só para o que for específico daquela tela.

### 3.3 Tokens (`src/app/ui/tokens.css`)

Use **sempre** variáveis CSS, para funcionar nos temas claro e escuro:

- **Cores:** `--a` (destaque), `--a-soft`, `--text`, `--text-2`, `--text-3`, `--surface`, `--surface-2`, `--line`, `--line-soft`.
- **Estados:** `--ok`, `--ok-soft`, `--ok-deep`, `--err`, `--err-soft`, `--err-deep`, `--warn`, `--warn-soft`, `--warn-deep`, `--warn-line`, `--info`.
- **Fontes:** `--f-sans`, `--f-mono`, `--f-serif`.
- **Formas e sombras:** raios `--r-xs`, `--r-sm`, `--r-md`; sombras `--sh-xs` … `--sh-lg`; foco `--ring`; transição `--ease`.

**Tailwind:** prefixo `tw-` (ex.: `tw-grid`). O tema escuro é ativado por `[data-theme="dark"]`. **Teste sempre nos dois temas.**

### 3.4 Padrão de tela

```html
<os-sim-shell title="…" subtitle="…">
  <ng-container slot="actions"><os-button-group>…</os-button-group></ng-container>
  <app-lateral-xxx slot="config"></app-lateral-xxx>   <!-- painéis os-panel -->
  <app-area-xxx></app-area-xxx>                       <!-- div.viz com seções -->
</os-sim-shell>
```

- **Serviço por tela:** o componente "home" fornece o serviço com `providers: [MeuService]`, e a lateral e a área o injetam. Cada visita à tela começa do zero.
- **Topo da área:** cartões `os-stat` com os números principais.
- **Seções:** separadas por `div.viz-label`, cada uma com um título curto.
- **Exercícios:** tipos escolhidos na lateral; botões **Corrigir**, **Ver resposta**, **Limpar** e **Novo exercício**; campos verdes ou vermelhos na correção (`.acerto` / `.erro`); placar "acertos / total (%)"; gabarito com explicação curta.
- **Notificações:** `MatSnackBar` com duração de 2,5 a 5 s.
- **Textos:** português do Brasil e linguagem didática. Menos texto é melhor: a professora prefere informar com o mínimo, sem poluir a tela.

## 4. Convenções conceituais (combinadas com a professora)

### Geral
- **Numeração a partir de 0:** endereços, páginas, quadros, deslocamentos **e rótulos de bytes** (A0, C0, D2…). O número do rótulo é igual ao deslocamento.
- **Nomenclatura do material:** FCFS (e não FIFO) na paginação por demanda; "fila de aptos"; "página vítima"; "falta de página".

### Escalonamento
- **Prioridade:** **menor número = maior prioridade** (0 é a mais alta), tanto na preemptiva quanto na não preemptiva.
- **Desempate:**
  - SJF: ordem de chegada.
  - Prioridades: ordem de chegada.
  - Round Robin: quando um processo chega no mesmo instante em que outro volta por fim de quantum, **o que chega entra antes**.
- **Fila de aptos:** **o início fica à esquerda**.
  - FCFS e RR: ordem de entrada na fila.
  - SJF: menor execução primeiro.
  - Prioridades: menor número primeiro.
- **Múltiplas filas:** entre as filas, prioridade preemptiva. Quando o quantum termina e só há processos de filas inferiores esperando, o processo ganha **um novo quantum**.
- **Tempos:** turnaround = término − chegada; tempo de espera = turnaround − execução. Chegadas iguais são permitidas, e a CPU pode começar ociosa.
- **Simulador e exercícios usam os mesmos algoritmos** (`EscalonamentoService`), então o gabarito sempre bate com a simulação.

### Partições
- **Variáveis:** first-fit, best-fit, worst-fit e circular-fit (que começa na lacuna seguinte à última alocação). Desempate pelo menor endereço.
  - **Fragmentação externa** em destaque quando há memória livre suficiente no total, mas nenhuma lacuna comporta o processo.
  - **Compactação** com relocação: as bases mudam.
- **Fixas:** a sobra dentro da partição é **fragmentação interna**, sempre em destaque. As partições só mudam com a memória vazia.

### Paginação
- **Modelo da paginação simples:** página e quadro de 4 bytes, 8 quadros (32 bytes), endereço lógico de 4 bits (página 2 + deslocamento 2) e físico de 5 bits (quadro 3 + deslocamento 2).
- **Tabela de páginas:** tem bit **V/I**, com as 4 entradas; as páginas fora do espaço lógico do processo ficam com **I**.
- **Paginação por demanda:**
  - Clicar numa página é um **acesso**: com bit I ocorre falta de página (page-in), e com bit V é acesso direto.
  - Não existe "retirar página": uma página só sai da memória como **vítima** ou quando o processo é **finalizado**.
  - A substituição é **global**: a vítima pode ser de qualquer processo.
- **Histórico de bits:** colunas **T1…T4, sendo T4 o instante mais recente**. Compara a partir de T4; no empate, passa para T3, T2 e T1; persistindo o empate, sai o menor timestamp.
- **Segunda Chance:** bit de referência 0 na carga. Quem tem bit 1 ganha uma segunda chance: o bit vira 0, o timestamp é atualizado e a página vai para o fim da fila.

### Segmentação
- **Endereço lógico:** segmento (2 bits: 00 código, 01 dados, 10 pilha) + deslocamento (4 bits). Memória de 32 bytes, endereço físico de 5 bits.
- **Tradução:** se o deslocamento for menor que o limite, físico = base + deslocamento. Caso contrário, ou se o segmento não existir, ocorre **interrupção**.
- **Alocação best-fit segmento a segmento, na ordem código → dados → pilha:** a menor lacuna que comporta o segmento, com desempate pelo menor endereço. É **tudo ou nada**: se um segmento não couber, o processo não é criado.
- **Mensagens:** **fragmentação externa** quando há memória livre suficiente no total; **memória insuficiente** quando não há. A compactação atualiza as bases.

### Estados do processo
- **Diagrama:** segue a Figura 4.2 do livro, com cinco estados, as transições do livro e as linhas pontilhadas (retorno imediato e kill/exceção).
- **Ciclo de cada processo no cenário:** criação → CPU → CPU (preempção entre as duas) → E/S → CPU → fim, com 3 a 5 processos.

### Árvore de processos (fork)
- **Interpretador próprio** (`processos/models/arvore-processos.ts`) de um subconjunto de C: `int`/`pid_t`, vetores, globais, funções, `if`, `for`, `while`, `do`, `#define` simples. Cada processo tem sua cópia das variáveis; `fork()` clona tudo.
- **Chamadas:** `fork`, `getpid`, `getppid`, `wait`, `waitpid` (com `WNOHANG`), `sleep`, `exit`, `printf`, `WEXITSTATUS`. `sched_yield` ficou de fora, por decisão da professora.
- **PIDs:** o shell é o 99, o primeiro processo é o 100 e os demais seguem a ordem de criação. Limite de 64 processos; depois disso, `fork()` retorna -1.
- **Escalonamento:** uma CPU; cada processo executa até bloquear (`wait`, `waitpid`, `sleep`) ou terminar. Após o `fork()`, **o pai continua por padrão**; também há "filho primeiro" e "aleatória" (com semente, para repetir a execução).
- **Tempo:** as instruções são instantâneas; o tempo só avança com `sleep()`.
- **Zumbi e órfão:** quem termina vira **zumbi** até o pai chamar `wait`. Quando o pai termina antes, os filhos ficam **órfãos**, são adotados pelo init (PID 1) e o init os coleta na hora.
- **Saída:** cada `printf` aparece em uma linha, com a cor do processo.
- **Variável sem valor inicial:** o simulador considera 0 e mostra um aviso (em C o valor é indefinido). Globais começam com 0, como em C.

## 5. Como adicionar um módulo novo

1. **Modelo:** crie `features/<assunto>/models/<nome>.ts` com a lógica pura e um `.spec.ts` com casos do material.
2. **Serviço:** crie `services/<nome>.service.ts` com `@Injectable()` (sem `providedIn`), guardando o estado em signals.
3. **Componentes:** crie os componentes `home-…`, `lateral-…` e `area-…` no padrão da seção 3.4.
4. **Rota:** registre a rota em `app-routing.module.ts`, no grupo do assunto.
5. **Card:** adicione o card em `pages/simulacoes/simulacoes.component.ts`, no grupo certo, com o badge `simulador` (`a`) ou `exercícios` (`s`).
6. **README:** acrescente uma linha na tabela de módulos do `README.md`.
7. **Convenções:** se o módulo trouxer uma convenção conceitual nova, registre-a na seção 4 deste guia.

## 6. Testes antes de entregar

```bash
npm ci
npx ng build --base-href /oslive/          # build de produção sem erros
npx ng test --watch=false                  # testes unitários (Karma)
```

- **Testes unitários:** todos devem passar. Teste as regras conceituais no `models/` com exemplos do material das aulas.
- **Navegador:** confira a tela nos temas claro e escuro, sem erros no console.
- **Exercícios:** responder certo deve dar 100%, e uma resposta errada deve ser marcada.

## 7. Entrega (fluxo da professora)

As mudanças são entregues como **patch** e aplicadas pela professora:

1. **Um commit por pedido**, com mensagem em português: título curto e corpo explicando o que mudou e por quê.
2. **Autoria:** `madianitab <madianitab@gmail.com>`.
3. **Geração do patch:** `git format-patch -1 HEAD --stdout > oslive-<assunto>.patch`. **Confira que ele se aplica** sobre a `main` atual do GitHub, numa cópia limpa.
4. **Aplicação pela professora:**

   ```bash
   git status            # a pasta precisa estar limpa (arquivos .patch soltos não atrapalham)
   git pull
   git am oslive-<assunto>.patch
   git push
   ```

5. **Se o `git am` falhar:** rodar `git am --abort`, conferir com `git log --oneline -1` se o commit já está no GitHub e, se a mudança for só no `README.md`, usar `git am --exclude=README.md`.
6. **Após o push:** o GitHub Actions publica o site em cerca de 3 minutos. Recarregue com Ctrl + F5.

**Colaboradores:** mudanças grandes chegam por pull request, como o PR #1. Antes de entregar um patch, verifique se não há PR aberto mexendo nos mesmos arquivos.
