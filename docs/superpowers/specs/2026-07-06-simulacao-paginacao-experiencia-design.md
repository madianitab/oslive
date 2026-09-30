# Redesign da experiência — Simulação de Paginação por Demanda (piloto)

**Data:** 2026-07-06
**Escopo:** Piloto em UMA simulação (Paginação por Demanda). Valida a experiência antes de replicar em Escalonamento e Segmentação.
**Premissa:** Reaproveitar o motor existente (`models/`, algoritmos FCFS/segunda-chance/histórico-de-bits já testados). Reconstruir a camada de apresentação/interação. A lógica só é *instrumentada* (para emitir passos), não reescrita.

---

## 1. Problema

As três simulações do OSLive compartilham o mesmo defeito de fundo, confirmado por análise das três: **mostram o resultado pronto, nunca a dinâmica**. Na paginação especificamente, a inicialização (`PaginacaoService.inicializarExercicio`) monta a memória física de uma vez num loop (linhas 77-80), sem registrar a sequência de referências e faltas de página. O "por demanda" — o conceito central — acontece invisível. O aluno preenche/adivinha o estado final, mas nunca vê *por que* uma página entrou ou saiu.

Somam-se: ausência de passo-a-passo/onboarding, terminologia técnica sem legenda, feedback fraco (modais Bootstrap), densidade visual alta e um fluxo de correção confuso no exercício de página vítima.

## 2. Decisões do brainstorm (validadas com o usuário)

1. **Modo de interação — "Assistir + Praticar":** um toggle alterna entre dois modos sobre o **mesmo cenário**. Primeiro o aluno *assiste* o SO executar a paginação (player com narração); depois vira o toggle para *praticar* e refaz o mesmo caso como exercício.
2. **Layout — sidebar + palco:** config à esquerda (sidebar colapsável), palco à direita, barra de controles sobre o palco. Reaproveita a casca `os-sim-shell` existente, que já entrega exatamente essa estrutura (slots `actions`/`config` + main).
3. **Narração — balão na ação + log lateral (C+B):** no modo Assistir, um balão ancorado aponta para o elemento que muda (o quadro substituído), explicando o passo atual; um painel "Diário" à direita acumula os passos de forma rolável. O balão explica o *agora*; o diário preserva o *histórico*.
4. **Controles do player:** play/pausa, passo à frente, passo atrás, velocidade, scrubber de progresso (passo N de M).

## 3. Arquitetura

### 3.1 Peça nova de lógica: a trilha de eventos (step trace)

O motor atual aplica as decisões sem registrá-las. A mudança central é fazer a inicialização **emitir uma trilha**: um array ordenado de passos, cada um descrevendo uma referência de página e seu efeito.

```
interface PassoPaginacao {
  indice: number;              // 0..M-1
  paginaReferenciada: Pagina;  // qual página o processo acessou
  tipo: 'hit' | 'fault';       // já estava na RAM, ou faltou
  quadroDestino: number;       // frame onde a página entrou (se fault)
  vitima?: Pagina;             // página removida (se fault com RAM cheia)
  quadroVitima?: number;       // frame de onde a vítima saiu
  memoriaFisica: MemoriaFisica[]; // snapshot do estado APÓS este passo
  narrativa: string;           // texto legível: "Falta de página em C1 → FIFO remove A0 (mais antigo)"
}
```

- Um serviço/monтador (`ConstrutorDeTrilhaPaginacao` ou método novo em `PaginacaoService`) executa a mesma sequência de `addPaginaEmMemoriaFisica`, mas **captura** cada decisão do algoritmo num `PassoPaginacao` e tira um snapshot do estado.
- Os algoritmos existentes (`FCFS`, `SegundaChance`, `HistoricoBitReferencia`) escolhem a vítima como já fazem — só precisamos ler *qual* vítima foi escolhida a cada passo. Se a API atual não expõe isso, adiciona-se um retorno/callback mínimo sem alterar a lógica de escolha.
- A `narrativa` é gerada a partir dos dados do passo (tipo, página, vítima, algoritmo), em PT-BR, com terminologia explicada.

Essa trilha é a fonte de verdade tanto do modo Assistir (reproduz passo a passo) quanto do Praticar (em cada fault, esconde a vítima e pede ao aluno que a escolha, comparando com `passo.vitima`).

### 3.2 Componentes de UI (piloto — específicos da paginação por ora)

Todos os componentes reutilizáveis novos vão em `src/app/ui` como `os-*` (convenção do projeto). Os específicos de paginação ficam em `features/paginacao/components`.

- **`os-sim-player` (novo, DS candidato):** barra de controles — play/pausa, passo ±1, velocidade, scrubber. Recebe `total`, `atual`, emite eventos `play/pause/step/seek/velocidade`. Sem conhecer paginação.
- **`os-sim-log` (novo, DS candidato):** painel "Diário" — lista de entradas com destaque do passo atual, rolável. Recebe uma lista de `{ rotulo, ativo }`.
- **`os-sim-callout` (novo, DS candidato):** balão de narração ancorado, com seta. Recebe texto + posição/alvo.
- **`sim-toggle` Assistir/Praticar:** pode ser o `os-button-group` existente (já usado no DS). Verificar antes de criar componente novo.
- **Palco de paginação (`area-paginacao` reformulado):** memória física (quadros), disco, e — no modo Assistir — animação de entrada/saída de páginas guiada pela trilha. Reaproveita as tabelas atuais, mas dirigidas pelo `PassoPaginacao.memoriaFisica` corrente em vez do estado estático.

### 3.3 Estado e fluxo

- Container (`home-paginacao...` reformulado ou novo) detém: cenário atual (processos gerados), trilha (`PassoPaginacao[]`), índice do passo corrente, modo (`assistir | praticar`), estado de reprodução (`tocando`).
- **Assistir:** timer avança o índice; palco renderiza `trilha[indice].memoriaFisica`; balão mostra `trilha[indice].narrativa`; log destaca a entrada `indice`.
- **Praticar:** ao chegar num passo `fault`, pausa e pede a vítima; compara escolha com `trilha[indice].vitima`; dá feedback inline (acerto/erro) por passo — substitui os modais Bootstrap atuais.
- **Trocar de modo preserva o cenário** (mesma trilha) e reposiciona no início.

## 4. Fora de escopo (YAGNI para o piloto)

- Escalonamento e Segmentação (ciclos futuros, herdando os componentes `os-sim-*`).
- Criação manual de processos / sequência de acesso customizada (mantém "Gerar processos" aleatório por ora).
- Exercícios de "preencher memória lógica/física" (ex. 1 e 2 atuais) — o piloto foca no fluxo página-vítima/substituição, que é onde a dinâmica é mais rica. Reavaliar depois.
- Persistência de progresso, contas de usuário, responsividade fina de mobile (desktop-first; mobile não pode quebrar, mas não é o foco).

## 5. Testes

- **Motor/trilha (unit):** dado um conjunto de processos e um algoritmo, a trilha emitida tem o nº de passos esperado; cada `fault` aponta a vítima correta (comparar com o comportamento já testado dos models); o snapshot final da trilha == estado final do `inicializarExercicio` atual (garante que instrumentar não alterou a lógica).
- **Geração de narrativa (unit):** cada tipo de passo produz texto PT-BR correto e sem termos órfãos.
- **Componentes UI (unit):** `os-sim-player` emite os eventos certos; `os-sim-log` destaca o índice ativo; toggle troca de modo sem perder o cenário.
- **Fluxo (component/integration):** Assistir reproduz do passo 0 ao M-1; Praticar pausa em cada fault e corrige a escolha da vítima.

## 6. Riscos / pontos de atenção

- **Instrumentar sem alterar a lógica:** o teste de equivalência (snapshot final == atual) é o guarda-chuva. Se a API dos models não expõe a vítima escolhida, a menor mudança possível é preferível a reescrever o algoritmo.
- **Ancorar o balão a células que se movem** é a parte mais delicada de implementar (foi o trade-off aceito no brainstorm). Começar com posicionamento simples (relativo ao quadro alvo) e refinar.
- **`os-sim-player/log/callout` como DS:** nascem no piloto, mas projetados genéricos para Escalonamento/Segmentação reaproveitarem. Não acoplar a tipos de paginação.
```
