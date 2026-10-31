// src/app/core/aleatorio.ts
function criarAleatorio(semente) {
  let a = typeof semente === "number" ? semente >>> 0 : hashTexto(semente);
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function inteiro(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function embaralhar(rnd, lista) {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// src/app/features/escalonamento/models/processo.ts
var Processo = class _Processo {
  constructor(nome, chegada, execucao, prioridade, cor) {
    this.tempoEspera = 0;
    this.tempoExecucao = 0;
    this.entrouNaFila = 0;
    this.saiuDaFila = 0;
    this.nome = nome;
    this.chegada = chegada;
    this.execucao = execucao;
    this.prioridade = prioridade;
    this.cor = cor;
  }
  incrTEspera() {
    this.tempoEspera++;
  }
  incrTExecucao() {
    if (this.execucao != null) {
      this.tempoExecucao += 1;
      return this.tempoExecucao >= this.execucao;
    }
    return false;
  }
  clone() {
    const clone = new _Processo(this.nome, this.chegada, this.execucao, this.prioridade, this.cor);
    clone.tempoEspera = this.tempoEspera;
    clone.tempoExecucao = this.tempoExecucao;
    clone.entrouNaFila = this.entrouNaFila;
    clone.saiuDaFila = this.saiuDaFila;
    clone.prioridade = this.prioridade;
    return clone;
  }
};

// src/app/features/escalonamento/models/lista-processos.ts
var ListaProcessos = class {
  constructor(Processos) {
    this.listaProcessos = Processos;
    this.listaFinalizados = [];
    this.listaProcessos.sort((a, b) => a.chegada - b.chegada);
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  processosPorTempo(tempo) {
    const processosProntos = this.listaProcessos.filter((p) => p.chegada <= tempo);
    this.listaProcessos = this.listaProcessos.filter((p) => p.chegada > tempo);
    return processosProntos;
  }
  addFinalizado(p) {
    if (p) {
      this.listaFinalizados.push(p);
    }
  }
  tabelaResultado(listProcessos) {
    const listAux = listProcessos ?? this.listaFinalizados;
    let espMed = 0;
    let execMed = 0;
    let turnMed = 0;
    let aux;
    var resultado = [];
    for (let i in listAux) {
      aux = listAux[i];
      if (aux.execucao != null) {
        espMed += aux.tempoEspera;
        execMed += aux.execucao;
        turnMed += aux.tempoEspera + aux.execucao;
        resultado.push({ nome: aux.nome, espera: aux.tempoEspera, execucao: aux.execucao, turn: aux.tempoEspera + aux.execucao });
      }
    }
    espMed = parseFloat((espMed / listAux.length).toFixed(2));
    execMed = parseFloat((execMed / listAux.length).toFixed(2));
    turnMed = parseFloat((turnMed / listAux.length).toFixed(2));
    resultado.push({ nome: "M\xE9dia", espera: espMed, execucao: execMed, turn: turnMed });
    return resultado;
  }
};

// src/app/features/escalonamento/models/cpu.ts
var CPU = class {
  constructor() {
    this.processo = null;
    this.ocupado = false;
  }
  alocaProcesso(p) {
    if (p === void 0) {
      return false;
    }
    this.processo = p;
    this.ocupado = true;
    return true;
  }
  retiraProcesso() {
    const p = this.processo;
    this.processo = null;
    this.ocupado = false;
    return p;
  }
  act() {
    if (!this.ocupado) {
      return null;
    }
    if (this.processo && this.processo.incrTExecucao()) {
      const finishedProcess = this.processo;
      this.processo = null;
      this.ocupado = false;
      return finishedProcess;
    }
    return null;
  }
};

// src/app/features/escalonamento/models/fifo.ts
var FIFO = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  addProcesso(processo) {
    if (processo) {
      this.listaProcessos.push(processo);
    }
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera(tempo) {
    this.listaProcessos.forEach((processo) => {
      for (let j = 0; j < tempo; j++) {
        processo.incrTEspera();
      }
    });
  }
};

// src/app/features/escalonamento/models/sjf.ts
var SJF = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  addProcesso(processo) {
    this.listaProcessos.push(processo);
    this.listaProcessos.sort((a, b) => {
      if (a.execucao !== null && b.execucao !== null) {
        return a.execucao - b.execucao;
      }
      return 0;
    });
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera() {
    this.listaProcessos.forEach((processo) => processo.incrTEspera());
  }
};

// src/app/features/escalonamento/models/prio.ts
var Prio = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  /**
   * Insere mantendo a fila ordenada por prioridade: quanto MENOR o número,
   * MAIOR a prioridade (0 é a mais alta), igual ao algoritmo preemptivo.
   * Em caso de empate, vale a ordem de chegada (a ordenação é estável).
   */
  addProcesso(processo) {
    this.listaProcessos.push(processo);
    this.listaProcessos.sort((a, b) => {
      if (a.prioridade != null && b.prioridade != null) {
        return a.prioridade - b.prioridade;
      }
      return 0;
    });
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera() {
    for (let processo of this.listaProcessos) {
      processo.incrTEspera();
    }
  }
};

// src/app/features/escalonamento/models/prio-p.ts
var PrioP = class {
  constructor() {
    this.listaProcessos = [];
  }
  vazio() {
    return this.listaProcessos.length === 0;
  }
  addProcesso(processo) {
    this.listaProcessos.push(processo);
    this.listaProcessos.sort((a, b) => {
      if (a.prioridade != null && b.prioridade != null) {
        return a.prioridade - b.prioridade;
      }
      return 0;
    });
  }
  topo() {
    return this.listaProcessos[0];
  }
  escolherProcesso() {
    return this.listaProcessos.shift();
  }
  addTEspera() {
    for (let processo of this.listaProcessos) {
      processo.incrTEspera();
    }
  }
};

// src/app/features/escalonamento/models/escalonador.ts
var Escalonador = class {
  simulaFifo(processos) {
    const escalona = new FIFO();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalona.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalona.addProcesso(p));
      if (!cpu.ocupado && !escalona.vazio()) {
        cpu.alocaProcesso(escalona.escolherProcesso());
      }
      escalona.addTEspera(1);
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }
  simulaSJF(processos) {
    const escalonar = new SJF();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalonar.addProcesso(p));
      if (!cpu.ocupado && !escalonar.vazio()) {
        const escolhido = escalonar.escolherProcesso();
        if (escolhido) cpu.alocaProcesso(escolhido);
      }
      escalonar.addTEspera();
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }
  simulaPrio(processos) {
    const escalona = new Prio();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalona.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalona.addProcesso(p));
      if (!cpu.ocupado && !escalona.vazio()) {
        cpu.alocaProcesso(escalona.escolherProcesso());
      }
      escalona.addTEspera();
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      if (finalizado) arrumalista.addFinalizado(finalizado);
      time++;
    }
    return resultado;
  }
  simulaPrioPremp(processos) {
    const escalonar = new PrioP();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      arrumalista.processosPorTempo(time).forEach((p) => escalonar.addProcesso(p));
      if (!cpu.ocupado) {
        const proximo = escalonar.escolherProcesso();
        if (proximo) cpu.alocaProcesso(proximo);
      } else {
        const topo = escalonar.topo();
        if (topo?.prioridade != null && cpu.processo?.prioridade != null && cpu.processo.prioridade > topo.prioridade) {
          const interrompido = cpu.retiraProcesso();
          if (interrompido) escalonar.addProcesso(interrompido);
          cpu.alocaProcesso(escalonar.escolherProcesso());
        }
      }
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      const finalizado = cpu.act();
      escalonar.addTEspera();
      if (finalizado) {
        arrumalista.addFinalizado(finalizado);
        cpu.alocaProcesso(escalonar.escolherProcesso());
      }
      time++;
    }
    return resultado;
  }
  simulaRR(processos, quantum) {
    const escalonar = new FIFO();
    const cpu = new CPU();
    const resultado = [];
    const arrumalista = new ListaProcessos(processos);
    let time = 0;
    let tmp = 0;
    let chaveamento = 0;
    while (!arrumalista.vazio() || !escalonar.vazio() || cpu.ocupado) {
      const prontos = arrumalista.processosPorTempo(time);
      while (prontos.length > 0) escalonar.addProcesso(prontos.shift());
      if (chaveamento > 0) {
        const interrompido = cpu.retiraProcesso();
        if (interrompido) escalonar.addProcesso(interrompido);
        chaveamento = 0;
      }
      if (tmp === 0 && !escalonar.vazio()) {
        cpu.alocaProcesso(escalonar.escolherProcesso());
      }
      resultado.push(cpu.processo ? { tempo: time, nome: cpu.processo.nome, cor: cpu.processo.cor } : { tempo: time, nome: "-", cor: "#FFFFFF" });
      if (cpu.ocupado) {
        tmp++;
        const executado = cpu.act();
        if (!cpu.ocupado && executado) {
          arrumalista.addFinalizado(executado);
          tmp = 0;
        }
      }
      escalonar.addTEspera(1);
      time++;
      if (tmp === quantum) {
        tmp = 0;
        chaveamento = 1;
      }
    }
    return resultado;
  }
  simulaMF(processos, config) {
    let tempoCpu = 0;
    let quantum = 0;
    let contQuantum = 0;
    let processoAtual = null;
    let algRR = false;
    let filaAptos = [];
    const diagramaCpu = [];
    let dadosTabelaResultados = [];
    const filaApto = [];
    processos.forEach((p) => {
      if (p.prioridade != null) p.prioridade = Number(p.prioridade);
    });
    const processosOrdenados = [...processos].sort((a, b) => a.chegada - b.chegada);
    const limite = processos.reduce((t, p) => Math.max(t, p.chegada), 0) + processos.reduce((t, p) => t + (p.execucao ?? 0), 0) + 2;
    for (let i = 0; ; i++) {
      if (processosOrdenados.length === 0 && filaAptos.length === 0 && processoAtual === null) break;
      if (i > limite) return { resultado: diagramaCpu, filaApto, tabelaResultados: dadosTabelaResultados };
      while (processosOrdenados.length > 0 && processosOrdenados[0].chegada === tempoCpu) {
        processosOrdenados[0].entrouNaFila = tempoCpu;
        filaAptos = filaAptos.length > 0 ? this.atualizarFilaAptos(filaAptos, processosOrdenados[0]) : [processosOrdenados[0]];
        processosOrdenados.shift();
      }
      let processoAtualAtualizado = false;
      if (filaAptos.length > 0) {
        if (processoAtual === null) {
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (processoAtual.tempoExecucao === processoAtual.execucao) {
          processoAtual.tempoEspera = tempoCpu - (processoAtual.chegada + processoAtual.tempoExecucao);
          dadosTabelaResultados = this.inserirOrdemChegada(dadosTabelaResultados, processoAtual);
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (filaAptos[0].prioridade < processoAtual.prioridade) {
          processoAtual.entrouNaFila = tempoCpu;
          filaAptos = this.atualizarFilaAptos(filaAptos, processoAtual);
          processoAtual = filaAptos[0];
          processoAtualAtualizado = true;
        } else if (algRR && quantum === contQuantum) {
          if (filaAptos[0].prioridade === processoAtual.prioridade) {
            processoAtual.entrouNaFila = tempoCpu;
            filaAptos = this.atualizarFilaAptos(filaAptos, processoAtual);
            processoAtual = filaAptos[0];
            processoAtualAtualizado = true;
          } else {
            contQuantum = 0;
          }
        }
        if (processoAtualAtualizado) {
          processoAtual.saiuDaFila = tempoCpu;
          if (processoAtual.saiuDaFila > processoAtual.entrouNaFila) {
            filaApto.push(processoAtual.clone());
          }
          quantum = 0;
          contQuantum = 0;
          filaAptos.shift();
        }
      } else {
        if (processoAtual !== null && processoAtual.tempoExecucao === processoAtual.execucao) {
          processoAtual.tempoEspera = tempoCpu - (processoAtual.chegada + processoAtual.tempoExecucao);
          dadosTabelaResultados = this.inserirOrdemChegada(dadosTabelaResultados, processoAtual);
          processoAtual = null;
        } else if (algRR && quantum === contQuantum) {
          contQuantum = 0;
        }
      }
      if (processoAtual === null && filaAptos.length === 0 && processosOrdenados.length > 0) {
        diagramaCpu.push({ tempo: tempoCpu, nome: "-", cor: "#FFFFFF" });
        tempoCpu++;
        continue;
      }
      if (processoAtualAtualizado) {
        switch (processoAtual.prioridade) {
          case 0:
            algRR = config.filaRR1;
            if (algRR) quantum = config.quantum;
            break;
          case 1:
            algRR = config.filaRR2;
            if (algRR) quantum = config.quantum1;
            break;
          case 2:
            algRR = config.filaRR3;
            if (algRR) quantum = config.quantum2;
            break;
          case 3:
            algRR = config.filaRR4;
            if (algRR) quantum = config.quantum3;
            break;
          default:
            algRR = false;
        }
      }
      contQuantum += algRR ? 1 : 0;
      if (processoAtual !== null) {
        if (processoAtual.tempoExecucao === void 0) processoAtual.tempoExecucao = 0;
        processoAtual.tempoExecucao++;
        diagramaCpu.push({ tempo: tempoCpu, nome: processoAtual.nome, chegada: processoAtual.chegada, cor: processoAtual.cor, prioridade: processoAtual.prioridade });
      }
      tempoCpu++;
    }
    return { resultado: diagramaCpu, filaApto, tabelaResultados: dadosTabelaResultados };
  }
  atualizarFilaAptos(filaAptos, processo) {
    let inseriu = false;
    for (let i = 0; i < filaAptos.length; i++) {
      if (processo.prioridade != null && processo.prioridade < filaAptos[i].prioridade) {
        filaAptos.splice(i, 0, processo);
        inseriu = true;
        break;
      }
    }
    if (!inseriu) filaAptos.push(processo);
    return filaAptos;
  }
  validarPrio(lista) {
    return lista.every((p) => p.prioridade != null);
  }
  inserirOrdemChegada(lista, processo) {
    let inseriu = false;
    for (let i = 0; i < lista.length; i++) {
      if (processo.chegada < lista[i].chegada) {
        lista.splice(i, 0, processo.clone());
        inseriu = true;
        break;
      }
    }
    if (!inseriu) lista.push(processo.clone());
    return lista;
  }
};

// src/app/features/escalonamento/models/exercicio-escalonamento.ts
var NOMES_PROCESSOS = ["A", "B", "C", "D", "E", "F", "G", "H"];
function usaPrioridade(algoritmo) {
  return algoritmo === "PRIO" || algoritmo === "PRIO_P";
}
function gerarProcessosEscalonamento(rnd = Math.random) {
  const processos = [];
  for (let i = 0; i < 4; i++) {
    const chegada = Math.floor(rnd() * 9);
    const execucao = Math.floor(rnd() * 7) + 1;
    const prioridade = Math.floor(rnd() * 4);
    processos.push(new Processo(NOMES_PROCESSOS[i], chegada, execucao, prioridade, ""));
  }
  const quantum = Math.floor(rnd() * 3) + 1;
  return { processos: processos.sort((a, b) => a.chegada - b.chegada), quantum };
}
function gerarGabaritoEscalonamento(processos, algoritmo, quantum, escalonador = new Escalonador()) {
  const copias = processos.map((p) => p.clone());
  copias.forEach((p) => {
    p.tempoEspera = 0;
    p.tempoExecucao = 0;
  });
  let diagrama;
  switch (algoritmo) {
    case "FIFO":
      diagrama = escalonador.simulaFifo(copias);
      break;
    case "SJF":
      diagrama = escalonador.simulaSJF(copias);
      break;
    case "PRIO":
      diagrama = escalonador.simulaPrio(copias);
      break;
    case "PRIO_P":
      diagrama = escalonador.simulaPrioPremp(copias);
      break;
    case "RR":
      diagrama = escalonador.simulaRR(copias, quantum);
      break;
  }
  const tabela2 = [...copias].sort((a, b) => a.chegada - b.chegada).map((p) => ({
    nome: p.nome,
    cor: p.cor,
    espera: p.tempoEspera,
    turnaround: p.tempoEspera + (p.execucao ?? 0)
  }));
  const media = (valores) => valores.length ? parseFloat((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)) : 0;
  return {
    diagrama,
    tabela: tabela2,
    mediaEspera: media(tabela2.map((l) => l.espera)),
    mediaTurnaround: media(tabela2.map((l) => l.turnaround))
  };
}

// src/app/features/avaliacoes/questoes/escalonamento.ts
var NOMES = {
  FIFO: "FIFO",
  SJF: "SJF (n\xE3o preemptivo)",
  PRIO: "Prioridade n\xE3o preemptiva",
  PRIO_P: "Prioridade preemptiva",
  RR: "Round Robin"
};
var REGRAS = {
  FIFO: "Chegadas no mesmo instante: ordem da tabela.",
  SJF: "Empate no tempo de execu\xE7\xE3o: ordem de chegada.",
  PRIO: "Menor n\xFAmero = maior prioridade. Empate: ordem de chegada.",
  PRIO_P: "Menor n\xFAmero = maior prioridade. Empate: ordem de chegada.",
  RR: "Quando um processo chega no mesmo instante em que outro volta por fim de quantum, o que chega entra antes na fila."
};
function gerar(alg, rnd) {
  const { processos, quantum } = gerarProcessosEscalonamento(rnd);
  const g = gerarGabaritoEscalonamento(processos, alg, quantum);
  const prio = usaPrioridade(alg);
  const campos = [];
  const gabarito = {};
  const campo = (id, rotulo, valor) => {
    campos.push({ id, tipo: "numero", rotulo });
    gabarito[id] = String(valor);
    return { campo: id };
  };
  const linhas = g.tabela.map((l) => [
    l.nome,
    campo(`esp-${l.nome}`, `Espera de ${l.nome}`, l.espera),
    campo(`tat-${l.nome}`, `Turnaround de ${l.nome}`, l.turnaround)
  ]);
  linhas.push(["M\xE9dia", campo("media-esp", "M\xE9dia de espera", g.mediaEspera), campo("media-tat", "M\xE9dia de turnaround", g.mediaTurnaround)]);
  return {
    publica: {
      tipo: `esc-${alg}`,
      titulo: `Escalonamento \u2014 ${NOMES[alg]}`,
      enunciado: `Escalone os processos com ${NOMES[alg]}${alg === "RR" ? `, quantum = ${quantum}` : ""} e calcule o tempo de espera e o turnaround de cada processo, e as m\xE9dias (at\xE9 2 casas decimais). Turnaround = t\xE9rmino \u2212 chegada; espera = turnaround \u2212 execu\xE7\xE3o. ${REGRAS[alg]}`,
      dados: [{
        titulo: "Processos",
        cabecalho: ["Processo", "Chegada", "Execu\xE7\xE3o", ...prio ? ["Prioridade"] : []],
        linhas: processos.map((p) => [p.nome, String(p.chegada), String(p.execucao), ...prio ? [String(p.prioridade)] : []])
      }],
      respostas: [{ titulo: "Resultado", cabecalho: ["Processo", "Tempo de espera", "Turnaround"], linhas }],
      campos
    },
    gabarito
  };
}
var QUESTOES_ESCALONAMENTO = ["FIFO", "SJF", "PRIO", "PRIO_P", "RR"].map((alg) => ({
  id: `esc-${alg}`,
  assunto: "Escalonamento",
  nome: `${NOMES[alg]}: espera e turnaround`,
  gerar: (rnd) => gerar(alg, rnd)
}));

// src/app/features/particoes/models/particoes.ts
var ALGORITMOS_FIT = [
  { valor: "FIRST", nome: "First-fit", regra: "a primeira lacuna que comporta o processo, come\xE7ando sempre do in\xEDcio" },
  { valor: "BEST", nome: "Best-fit", regra: "a lacuna que resulta na menor sobra" },
  { valor: "WORST", nome: "Worst-fit", regra: "a lacuna que resulta na maior sobra" },
  { valor: "CIRCULAR", nome: "Circular-fit", regra: "como o first-fit, mas come\xE7ando na lacuna seguinte \xE0 \xFAltima aloca\xE7\xE3o" }
];
function escolherLacuna(lacunas3, tamanho, alg, ponteiro) {
  const cabem = lacunas3.filter((l) => l.tamanho >= tamanho);
  if (cabem.length === 0) return null;
  switch (alg) {
    case "FIRST":
      return cabem[0];
    case "BEST":
      return [...cabem].sort((a, b) => a.tamanho - b.tamanho || a.inicio - b.inicio)[0];
    case "WORST":
      return [...cabem].sort((a, b) => b.tamanho - a.tamanho || a.inicio - b.inicio)[0];
    case "CIRCULAR":
      return cabem.find((l) => l.inicio >= ponteiro) ?? cabem[0];
  }
}
function lacunasEntre(ocupados, inicio, fim) {
  const ord = [...ocupados].sort((a, b) => a.inicio - b.inicio);
  const out = [];
  let cursor = inicio;
  for (const o of ord) {
    if (o.inicio > cursor) out.push({ inicio: cursor, tamanho: o.inicio - cursor });
    cursor = Math.max(cursor, o.inicio + o.tamanho);
  }
  if (cursor < fim) out.push({ inicio: cursor, tamanho: fim - cursor });
  return out;
}

// src/app/features/particoes/models/exercicios-particoes.ts
function inteiro2(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function multiplo(rnd, min, max, passo) {
  return inteiro2(rnd, Math.ceil(min / passo), Math.floor(max / passo)) * passo;
}
var SO_FIXAS = 120;
var AREA_FIXAS = 380;
function iniciosParticoes(particoes) {
  let inicio = SO_FIXAS;
  return particoes.map((t) => {
    const i = inicio;
    inicio += t;
    return i;
  });
}
function escolherParticao(particoes, ocupadas, tamanho, politica) {
  const livres = particoes.map((t, i) => ({ t, i })).filter((x) => !ocupadas[x.i] && x.t >= tamanho);
  if (!livres.length) return null;
  if (politica === "BEST") livres.sort((a, b) => a.t - b.t || a.i - b.i);
  return livres[0].i;
}
function resolverFixas(particoes, politica, passos) {
  const ocupadas = particoes.map(() => null);
  const fila = [];
  const eventos = [];
  for (const p of passos) {
    if ("chega" in p) {
      const i = escolherParticao(particoes, ocupadas, p.chega.tamanho, politica);
      if (i === null) {
        const livre = particoes.reduce((t, x, k) => t + (ocupadas[k] ? 0 : x), 0);
        fila.push(p.chega);
        eventos.push({ tipo: "chegada", processo: p.chega, particao: null, frag: null, externa: livre >= p.chega.tamanho });
      } else {
        ocupadas[i] = p.chega;
        eventos.push({ tipo: "chegada", processo: p.chega, particao: i + 1, frag: particoes[i] - p.chega.tamanho, externa: false });
      }
    } else {
      const i = ocupadas.findIndex((x) => x?.nome === p.termina);
      if (i === -1) return null;
      ocupadas[i] = null;
      const k = fila.findIndex((f) => f.tamanho <= particoes[i]);
      let entra = null;
      if (k !== -1) {
        entra = fila.splice(k, 1)[0];
        ocupadas[i] = entra;
      }
      eventos.push({ tipo: "termino", processo: p.termina, particaoLiberada: i + 1, entra, fragEntra: entra ? particoes[i] - entra.tamanho : null });
    }
  }
  const fragFinal = ocupadas.reduce((t, x, k) => t + (x ? particoes[k] - x.tamanho : 0), 0);
  return { politica, particoes, eventos, fragFinal };
}
function gerarFixas(politica, rnd = Math.random) {
  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const n = inteiro2(rnd, 4, 5);
    let particoes;
    do {
      particoes = Array.from({ length: n }, () => multiplo(rnd, 30, 160, 10));
    } while (particoes.reduce((a, b) => a + b, 0) > AREA_FIXAS);
    const maior = Math.max(...particoes);
    const passos = [];
    const ativos = [];
    let cont = 0;
    const total = inteiro2(rnd, 7, 9);
    for (let e = 0; e < total; e++) {
      if (ativos.length >= 2 && rnd() < 0.3) {
        const nome = ativos.splice(inteiro2(rnd, 0, ativos.length - 1), 1)[0];
        passos.push({ termina: nome });
      } else {
        const tamanho = rnd() < 0.2 ? particoes[inteiro2(rnd, 0, n - 1)] : multiplo(rnd, 10, maior, 5);
        const nome = `P${++cont}`;
        passos.push({ chega: { nome, tamanho } });
        ativos.push(nome);
      }
    }
    const ex = resolverFixas(particoes, politica, passos);
    if (!ex) continue;
    const temFila = ex.eventos.some((ev) => ev.tipo === "chegada" && ev.particao === null);
    const saiDaFila = ex.eventos.some((ev) => ev.tipo === "termino" && ev.entra);
    const temFrag = ex.eventos.some((ev) => ev.tipo === "chegada" && (ev.frag ?? 0) > 0);
    if (temFila && saiDaFila && temFrag) return ex;
  }
  return resolverFixas([200, 100, 50, 30], politica, [
    { chega: { nome: "P1", tamanho: 150 } },
    { chega: { nome: "P2", tamanho: 120 } },
    { chega: { nome: "P3", tamanho: 50 } },
    { chega: { nome: "P4", tamanho: 25 } },
    { termina: "P1" },
    { chega: { nome: "P5", tamanho: 90 } }
  ]);
}
var SO_VAR = 100;
var TOTAL_VAR = 500;
function lacunasVar(alocados) {
  return lacunasEntre(alocados.map((a) => ({ inicio: a.base, tamanho: a.tamanho })), SO_VAR, TOTAL_VAR);
}
function resolverAlocacao(algoritmo, inicial, passos) {
  let alocados = inicial.alocados.map((a) => ({ ...a }));
  let ponteiro = inicial.ponteiro;
  const fila = [];
  const eventos = [];
  const alocar2 = (p) => {
    const lac = escolherLacuna(lacunasVar(alocados), p.tamanho, algoritmo, ponteiro);
    if (!lac) return null;
    alocados.push({ ...p, base: lac.inicio });
    ponteiro = lac.inicio + p.tamanho;
    return lac.inicio;
  };
  for (const passo of passos) {
    if ("chega" in passo) {
      const lacunas3 = lacunasVar(alocados);
      const baseFirst = escolherLacuna(lacunas3, passo.chega.tamanho, "FIRST", ponteiro)?.inicio ?? null;
      const base = alocar2(passo.chega);
      if (base === null) {
        const livre = lacunas3.reduce((t, l) => t + l.tamanho, 0);
        fila.push(passo.chega);
        eventos.push({ tipo: "chegada", processo: passo.chega, resultado: livre >= passo.chega.tamanho ? "fragmentacao" : "insuficiente", base: null, baseFirst });
      } else {
        eventos.push({ tipo: "chegada", processo: passo.chega, resultado: "alocado", base, baseFirst });
      }
    } else {
      const a = alocados.find((x) => x.nome === passo.termina);
      if (!a) return null;
      alocados = alocados.filter((x) => x !== a);
      let entra = null;
      let baseEntra = null;
      for (let k = 0; k < fila.length; k++) {
        const b = alocar2(fila[k]);
        if (b !== null) {
          if (entra) return null;
          entra = fila.splice(k, 1)[0];
          baseEntra = b;
          k--;
        }
      }
      eventos.push({ tipo: "termino", processo: passo.termina, liberado: { inicio: a.base, tamanho: a.tamanho }, entra, baseEntra });
    }
  }
  return { algoritmo, inicial, eventos, final: { alocados, ponteiro } };
}
function gerarEstadoInicial(rnd, minLacunas = 2) {
  for (; ; ) {
    const alocados = [];
    let cursor = SO_VAR;
    let n = 0;
    while (true) {
      const tamanho = multiplo(rnd, 20, 90, 10);
      if (cursor + tamanho > TOTAL_VAR - 20) break;
      alocados.push({ nome: `P${++n}`, tamanho, base: cursor });
      cursor += tamanho;
    }
    const restantes = alocados.filter(() => rnd() > 0.4);
    const lacunas3 = lacunasVar(restantes);
    if (restantes.length >= 2 && lacunas3.length >= minLacunas && lacunas3.length <= 5) {
      const ultimo = restantes.reduce((m, a) => Math.max(m, a.base + a.tamanho), SO_VAR);
      return { estado: { alocados: restantes, ponteiro: ultimo }, proximoNumero: n + 1 };
    }
  }
}
function gerarAlocacao(algoritmo, rnd = Math.random) {
  for (let tentativa = 0; tentativa < 2e3; tentativa++) {
    const { estado, proximoNumero } = gerarEstadoInicial(rnd, 3);
    let num = proximoNumero;
    const ativos = estado.alocados.map((a) => a.nome);
    const passos = [];
    const total = inteiro2(rnd, 5, 7);
    for (let e = 0; e < total; e++) {
      if (e > 0 && rnd() < 0.3 && ativos.length) {
        passos.push({ termina: ativos.splice(inteiro2(rnd, 0, ativos.length - 1), 1)[0] });
      } else {
        const nome = `P${num++}`;
        passos.push({ chega: { nome, tamanho: multiplo(rnd, 10, 120, 10) } });
        ativos.push(nome);
      }
    }
    const ex = resolverAlocacao(algoritmo, estado, passos);
    if (!ex) continue;
    const chegadas = ex.eventos.filter((e) => e.tipo === "chegada");
    const temExterna = chegadas.some((c) => c.resultado === "fragmentacao");
    const alocadas = chegadas.filter((c) => c.resultado === "alocado").length;
    const diferente = algoritmo === "FIRST" || chegadas.some((c) => c.resultado === "alocado" && c.base !== c.baseFirst);
    if (temExterna && alocadas >= 2 && diferente) return ex;
  }
  throw new Error("N\xE3o foi poss\xEDvel gerar o exerc\xEDcio de aloca\xE7\xE3o");
}
function gerarLacunas(rnd = Math.random) {
  const { estado } = gerarEstadoInicial(rnd, 2);
  return { alocados: estado.alocados, lacunas: lacunasVar(estado.alocados) };
}
function compactar(alocados) {
  let cursor = SO_VAR;
  const novasBases = {};
  [...alocados].sort((a, b) => a.base - b.base).forEach((a) => {
    novasBases[a.nome] = cursor;
    cursor += a.tamanho;
  });
  return { novasBases, lacunaFinal: { inicio: cursor, tamanho: TOTAL_VAR - cursor } };
}
function gerarCompactacao(rnd = Math.random) {
  const { estado } = gerarEstadoInicial(rnd, 3);
  return { alocados: estado.alocados, ...compactar(estado.alocados) };
}

// src/app/features/avaliacoes/questoes/corrigir.ts
var NAO_SE_APLICA = "-";
function normalizar(tipo, valor) {
  const v = (valor ?? "").trim();
  if (v === "-" || v === "\u2014" || v === "\u2013") return NAO_SE_APLICA;
  switch (tipo) {
    case "numero": {
      if (v === "") return "";
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) ? String(n) : v.toUpperCase();
    }
    case "binario":
      return v.replace(/[\s|_.]/g, "");
    case "texto": {
      const t = v.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[\s|_.]/g, "");
      return ["INTERRUPCAO", "INT", "X"].includes(t) ? "ERRO" : t;
    }
    case "opcao":
      return v;
  }
}
function corrigirQuestao(q, respostas) {
  const campos = {};
  let acertos = 0;
  for (const c of q.publica.campos) {
    const certo = respostas?.[c.id] !== void 0 && normalizar(c.tipo, respostas[c.id]) !== "" && normalizar(c.tipo, respostas[c.id]) === normalizar(c.tipo, q.gabarito[c.id]);
    campos[c.id] = certo;
    if (certo) acertos++;
  }
  return { acertos, total: q.publica.campos.length, campos };
}
function arredondar(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function corrigirProva(questoes, respostas, valorTotal) {
  const valor = questoes.length ? valorTotal / questoes.length : 0;
  let soma = 0;
  const lista = questoes.map((q, i) => {
    const c = corrigirQuestao(q, respostas[String(i)]);
    const nota = c.total ? valor * c.acertos / c.total : 0;
    soma += nota;
    return { ...c, valor: arredondar(valor), nota: arredondar(nota) };
  });
  return { nota: arredondar(soma), questoes: lista };
}

// src/app/features/avaliacoes/questoes/particoes.ts
var Montador = class {
  constructor() {
    this.campos = [];
    this.gabarito = {};
  }
  campo(c, valor) {
    this.campos.push(c);
    this.gabarito[c.id] = valor === null ? NAO_SE_APLICA : String(valor);
    return { campo: c.id };
  }
};
function tabelaProcessos(alocados) {
  return {
    titulo: "Processos na mem\xF3ria",
    cabecalho: ["Processo", "Base (KB)", "Tamanho (KB)"],
    linhas: [...alocados].sort((a, b) => a.base - b.base).map((a) => [a.nome, String(a.base), String(a.tamanho)])
  };
}
var AVISO_VAR = `Mem\xF3ria de ${TOTAL_VAR} KB. O SO ocupa de 0 a ${SO_VAR - 1} KB; a \xE1rea dos processos come\xE7a em ${SO_VAR} KB.`;
var NOME_POLITICA = {
  FIRST: "primeira parti\xE7\xE3o livre que comporta",
  BEST: "menor parti\xE7\xE3o livre que comporta"
};
function fixas(politica, rnd) {
  const ex = gerarFixas(politica, rnd);
  const m = new Montador();
  const inicios = iniciosParticoes(ex.particoes);
  const opcoesParticao = [
    ...ex.particoes.map((_, i) => ({ valor: String(i + 1), rotulo: `Parti\xE7\xE3o ${i + 1}` })),
    { valor: "fila", rotulo: "Fila" }
  ];
  const nomes = ex.eventos.filter((e) => e.tipo === "chegada").map((e) => e.processo.nome);
  const linhas = ex.eventos.map((e, i) => {
    if (e.tipo === "chegada") {
      return [
        String(i + 1),
        `${e.processo.nome} chega (${e.processo.tamanho} KB)`,
        m.campo(
          { id: `ev${i}-part`, tipo: "opcao", rotulo: `Parti\xE7\xE3o de ${e.processo.nome}`, opcoes: opcoesParticao },
          e.particao === null ? "fila" : e.particao
        ),
        m.campo({ id: `ev${i}-frag`, tipo: "numero", rotulo: `Fragmenta\xE7\xE3o interna de ${e.processo.nome}`, dica: "- se foi para a fila" }, e.frag)
      ];
    }
    return [
      String(i + 1),
      `${e.processo} termina`,
      m.campo({
        id: `ev${i}-entra`,
        tipo: "opcao",
        rotulo: `Quem sai da fila quando ${e.processo} termina`,
        opcoes: [{ valor: "ninguem", rotulo: "Ningu\xE9m" }, ...nomes.map((n) => ({ valor: n, rotulo: n }))]
      }, e.entra ? e.entra.nome : "ninguem"),
      m.campo({ id: `ev${i}-fragentra`, tipo: "numero", rotulo: `Fragmenta\xE7\xE3o interna de quem entra`, dica: "- se ningu\xE9m entra" }, e.fragEntra)
    ];
  });
  return {
    publica: {
      tipo: `fixas-${politica}`,
      titulo: `Parti\xE7\xF5es fixas \u2014 ${NOME_POLITICA[politica]}`,
      enunciado: `O SO ocupa de 0 a ${SO_FIXAS - 1} KB e as parti\xE7\xF5es ocupam os ${AREA_FIXAS} KB seguintes. Cada processo usa a ${NOME_POLITICA[politica]}; se nenhuma livre comportar, vai para a fila. Quando um processo termina, entra o primeiro da fila (ordem de chegada) que couber na parti\xE7\xE3o liberada. Informe a parti\xE7\xE3o de cada chegada, quem sai da fila em cada t\xE9rmino e a fragmenta\xE7\xE3o interna. Use "-" quando n\xE3o se aplica.`,
      dados: [{
        titulo: "Parti\xE7\xF5es",
        cabecalho: ["Parti\xE7\xE3o", "In\xEDcio (KB)", "Tamanho (KB)"],
        linhas: ex.particoes.map((t, i) => [String(i + 1), String(inicios[i]), String(t)])
      }],
      respostas: [
        { titulo: "Eventos", cabecalho: ["#", "Evento", "Parti\xE7\xE3o / quem entra", "Fragmenta\xE7\xE3o interna (KB)"], linhas },
        { cabecalho: ["Ao final", "Valor"], linhas: [[
          "Fragmenta\xE7\xE3o interna total (KB)",
          m.campo({ id: "frag-final", tipo: "numero", rotulo: "Fragmenta\xE7\xE3o interna total" }, ex.fragFinal)
        ]] }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var RESULTADOS = [
  { valor: "alocado", rotulo: "Alocado" },
  { valor: "fragmentacao", rotulo: "Fragmenta\xE7\xE3o externa" },
  { valor: "insuficiente", rotulo: "Mem\xF3ria insuficiente" }
];
function alocacao(alg, rnd) {
  const ex = gerarAlocacao(alg, rnd);
  const m = new Montador();
  const info = ALGORITMOS_FIT.find((a) => a.valor === alg);
  const nomes = ex.eventos.filter((e) => e.tipo === "chegada").map((e) => e.processo.nome);
  const linhas = ex.eventos.map((e, i) => {
    if (e.tipo === "chegada") {
      return [
        String(i + 1),
        `${e.processo.nome} chega (${e.processo.tamanho} KB)`,
        m.campo({ id: `ev${i}-res`, tipo: "opcao", rotulo: `Resultado de ${e.processo.nome}`, opcoes: RESULTADOS }, e.resultado),
        m.campo({ id: `ev${i}-base`, tipo: "numero", rotulo: `Endere\xE7o de ${e.processo.nome}`, dica: "- se n\xE3o foi alocado" }, e.base)
      ];
    }
    return [
      String(i + 1),
      `${e.processo} termina`,
      m.campo({
        id: `ev${i}-entra`,
        tipo: "opcao",
        rotulo: `Quem entra quando ${e.processo} termina`,
        opcoes: [{ valor: "ninguem", rotulo: "Ningu\xE9m entra" }, ...nomes.map((n) => ({ valor: n, rotulo: `${n} entra` }))]
      }, e.entra ? e.entra.nome : "ninguem"),
      m.campo({ id: `ev${i}-baseentra`, tipo: "numero", rotulo: "Endere\xE7o de quem entra", dica: "- se ningu\xE9m entra" }, e.baseEntra)
    ];
  });
  return {
    publica: {
      tipo: `var-${alg}`,
      titulo: `Parti\xE7\xF5es vari\xE1veis \u2014 ${info.nome}`,
      enunciado: `${AVISO_VAR} Aloque com ${info.nome} (${info.regra}; empate: menor endere\xE7o)` + (alg === "CIRCULAR" ? `. A busca come\xE7a em ${ex.inicial.ponteiro} KB (ap\xF3s a \xFAltima aloca\xE7\xE3o)` : "") + `. Sem lacuna que comporte, o processo vai para a fila e tenta de novo quando mem\xF3ria \xE9 liberada. Informe o resultado e o endere\xE7o inicial de cada evento. Use "-" quando n\xE3o se aplica.`,
      dados: [tabelaProcessos(ex.inicial.alocados)],
      respostas: [{ titulo: "Sequ\xEAncia de eventos", cabecalho: ["#", "Evento", "Resultado / quem entra", "Endere\xE7o inicial (KB)"], linhas }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var LINHAS_LACUNAS = 5;
function lacunas(rnd) {
  const ex = gerarLacunas(rnd);
  const m = new Montador();
  const linhas = Array.from({ length: LINHAS_LACUNAS }, (_, i) => {
    const l = ex.lacunas[i];
    return [
      String(i + 1),
      m.campo({ id: `lac${i}-inicio`, tipo: "numero", rotulo: `In\xEDcio da lacuna ${i + 1}`, dica: "- se sobrar" }, l ? l.inicio : null),
      m.campo({ id: `lac${i}-tamanho`, tipo: "numero", rotulo: `Tamanho da lacuna ${i + 1}`, dica: "- se sobrar" }, l ? l.tamanho : null)
    ];
  });
  return {
    publica: {
      tipo: "var-lacunas",
      titulo: "Parti\xE7\xF5es vari\xE1veis \u2014 tabela de lacunas",
      enunciado: `${AVISO_VAR} Preencha a tabela de lacunas (in\xEDcio e tamanho), em ordem de endere\xE7o. Lacunas vizinhas formam uma s\xF3. Preencha as linhas que sobrarem com "-".`,
      dados: [tabelaProcessos(ex.alocados)],
      respostas: [{ titulo: "Tabela de lacunas", cabecalho: ["#", "In\xEDcio (KB)", "Tamanho (KB)"], linhas }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function compactacao(rnd) {
  const ex = gerarCompactacao(rnd);
  const m = new Montador();
  const ordem = [...ex.alocados].sort((a, b) => a.base - b.base);
  return {
    publica: {
      tipo: "var-compactacao",
      titulo: "Parti\xE7\xF5es vari\xE1veis \u2014 compacta\xE7\xE3o",
      enunciado: `${AVISO_VAR} Fa\xE7a a compacta\xE7\xE3o: os processos v\xE3o para o in\xEDcio da \xE1rea dos processos, na ordem de endere\xE7o. Informe a nova base de cada processo e a lacuna que sobra.`,
      dados: [],
      respostas: [
        {
          titulo: "Novas bases",
          cabecalho: ["Processo", "Base atual (KB)", "Tamanho (KB)", "Nova base (KB)"],
          linhas: ordem.map((a) => [
            a.nome,
            String(a.base),
            String(a.tamanho),
            m.campo({ id: `base-${a.nome}`, tipo: "numero", rotulo: `Nova base de ${a.nome}` }, ex.novasBases[a.nome])
          ])
        },
        {
          titulo: "Lacuna depois da compacta\xE7\xE3o",
          cabecalho: ["In\xEDcio (KB)", "Tamanho (KB)"],
          linhas: [[
            m.campo({ id: "lacuna-inicio", tipo: "numero", rotulo: "In\xEDcio da lacuna final" }, ex.lacunaFinal.inicio),
            m.campo({ id: "lacuna-tamanho", tipo: "numero", rotulo: "Tamanho da lacuna final" }, ex.lacunaFinal.tamanho)
          ]]
        }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var QUESTOES_PARTICOES = [
  ...["FIRST", "BEST"].map((p) => ({
    id: `fixas-${p}`,
    assunto: "Parti\xE7\xF5es fixas",
    nome: `Aloca\xE7\xE3o: ${NOME_POLITICA[p]}`,
    gerar: (rnd) => fixas(p, rnd)
  })),
  ...ALGORITMOS_FIT.map((a) => ({
    id: `var-${a.valor}`,
    assunto: "Parti\xE7\xF5es vari\xE1veis",
    nome: `Aloca\xE7\xE3o: ${a.nome}`,
    gerar: (rnd) => alocacao(a.valor, rnd)
  })),
  { id: "var-lacunas", assunto: "Parti\xE7\xF5es vari\xE1veis", nome: "Tabela de lacunas", gerar: lacunas },
  { id: "var-compactacao", assunto: "Parti\xE7\xF5es vari\xE1veis", nome: "Compacta\xE7\xE3o", gerar: compactacao }
];

// src/app/features/paginacao/models/paginacao-simples.ts
var TAMANHO_PAGINA = 4;
var QUANTIDADE_QUADROS = 8;
var MAX_BYTES_PROCESSO = 16;
function binario(valor, bits) {
  return valor.toString(2).padStart(bits, "0");
}

// src/app/features/paginacao/models/exercicio-paginacao-simples.ts
var NOMES_EXERCICIO_SIMPLES = ["A", "B", "C"];
var QUANTIDADE_PERGUNTAS_TRADUCAO = 4;
var BITS_PAGINA = 2;
var BITS_QUADRO = 3;
var BITS_DESLOCAMENTO = 2;
function paginasNecessarias(bytes) {
  return Math.ceil(bytes / TAMANHO_PAGINA);
}
function fragmentacaoInterna(bytes) {
  return paginasNecessarias(bytes) * TAMANHO_PAGINA - bytes;
}
function enderecoLogico(pagina, deslocamento) {
  return binario(pagina, BITS_PAGINA) + binario(deslocamento, BITS_DESLOCAMENTO);
}
function enderecoFisico(quadro, deslocamento) {
  return binario(quadro, BITS_QUADRO) + binario(deslocamento, BITS_DESLOCAMENTO);
}
function gerarPaginacaoSimples(tipo, rnd = Math.random) {
  const embaralhar2 = (l) => embaralhar(rnd, l);
  let tamanhos;
  do {
    tamanhos = NOMES_EXERCICIO_SIMPLES.map(() => inteiro(rnd, 1, MAX_BYTES_PROCESSO));
  } while (tamanhos.reduce((t, b) => t + paginasNecessarias(b), 0) > QUANTIDADE_QUADROS || // o primeiro processo (exercício da tabela de páginas) tem pelo menos 2 páginas
  paginasNecessarias(tamanhos[0]) < 2 || // memória física: sobram pelo menos 2 quadros livres, para os quadros editáveis não entregarem a resposta
  tipo === "MEMORIA_FISICA" && tamanhos.reduce((t, b) => t + paginasNecessarias(b), 0) > QUANTIDADE_QUADROS - 2 || // pelo menos um processo com sobra, para trabalhar a fragmentação interna
  tamanhos.every((b) => fragmentacaoInterna(b) === 0));
  const livres = embaralhar2([...Array(QUANTIDADE_QUADROS).keys()]);
  const processos = NOMES_EXERCICIO_SIMPLES.map((nome, i) => ({ nome, bytes: tamanhos[i], cor: "", quadros: livres.splice(0, paginasNecessarias(tamanhos[i])) }));
  const candidatos = processos.map((p, i) => ({ p, i })).filter((x) => x.p.quadros.length >= 2);
  const alvoMemoria = embaralhar2(candidatos)[0].i;
  return { processos, alvoMemoria, perguntas: sortearPerguntas(processos, embaralhar2) };
}
function sortearPerguntas(processos, embaralhar2) {
  const candidatos = [];
  processos.forEach((p) => {
    for (let i = 0; i < p.bytes; i++) {
      candidatos.push({ processo: p, pagina: Math.floor(i / TAMANHO_PAGINA), deslocamento: i % TAMANHO_PAGINA });
    }
  });
  const escolhidas = [];
  for (const p of embaralhar2(processos)) {
    const doProcesso = embaralhar2(candidatos.filter((c) => c.processo === p));
    if (doProcesso.length) escolhidas.push(doProcesso[0]);
  }
  for (const c of embaralhar2(candidatos)) {
    if (escolhidas.length >= QUANTIDADE_PERGUNTAS_TRADUCAO) break;
    if (!escolhidas.some((e) => e.processo === c.processo && e.pagina === c.pagina)) escolhidas.push(c);
  }
  return escolhidas.slice(0, QUANTIDADE_PERGUNTAS_TRADUCAO);
}

// src/app/core/constantes.ts
var TAM = 8;
var TAM_HISTORICO_REF = 4;
var TIMESTAMP_INICIAL = 100;

// src/app/features/paginacao/models/historico-bits.ts
function valorHistoricoBits(historico) {
  return historico.reduce((acc, bit) => acc * 2 + (bit ? 1 : 0), 0);
}
function vitimaHistorico(paginas) {
  if (paginas.length === 0) return null;
  return [...paginas].sort((a, b) => valorHistoricoBits(a.historico) - valorHistoricoBits(b.historico) || (a.timestamp ?? 0) - (b.timestamp ?? 0))[0];
}
function bitsT1aT4(historico) {
  return [...historico].reverse();
}

// src/app/features/paginacao/models/exercicio-paginacao-demanda.ts
var NOMES_PROCESSOS2 = ["A", "B", "C", "D"];
var BITS_HISTORICO = TAM_HISTORICO_REF;
function nomePagina(p) {
  return `${p.processo}${p.indice}`;
}
function gerarPaginacaoDemanda(tipo, quantidade, rnd = Math.random) {
  const embaralhar2 = (l) => embaralhar(rnd, l);
  const nomes = NOMES_PROCESSOS2.slice(0, quantidade);
  let tamanhos;
  do {
    tamanhos = nomes.map(() => tipo === "VITIMA" ? inteiro(rnd, 2, 4) : inteiro(rnd, 1, 4));
  } while (tipo === "VITIMA" && tamanhos.reduce((a, b) => a + b, 0) <= TAM);
  const processos = nomes.map((nome, i) => ({
    nome,
    cor: "",
    paginas: Array.from({ length: tamanhos[i] }, (_, k) => ({ processo: nome, indice: k, cor: "", quadro: null, timestamp: null, bitRef: 0, historico: [] }))
  }));
  const todas = processos.flatMap((p) => p.paginas);
  const total = todas.length;
  let carregadas;
  if (tipo === "VITIMA") {
    carregadas = TAM;
  } else if (total === 1) {
    carregadas = 1;
  } else {
    const maximo = Math.min(TAM, total - 1);
    const minimo = Math.max(1, Math.min(maximo, Math.ceil(total / 2)));
    carregadas = inteiro(rnd, minimo, maximo);
  }
  const ordemCarga = embaralhar2(todas).slice(0, carregadas);
  const quadrosLivres = embaralhar2([...Array(TAM).keys()]);
  const quadros = Array(TAM).fill(null);
  ordemCarga.forEach((pagina, i) => {
    const quadro = quadrosLivres[i];
    pagina.quadro = quadro;
    pagina.timestamp = TIMESTAMP_INICIAL + i;
    pagina.bitRef = rnd() < 0.5 ? 0 : 1;
    pagina.historico = Array.from({ length: BITS_HISTORICO }, () => rnd() < 0.5 ? 0 : 1);
    quadros[quadro] = pagina;
  });
  const paginaSolicitada = tipo === "VITIMA" ? embaralhar2(todas.filter((p) => p.quadro === null))[0] ?? null : null;
  return { processos, quadros, paginaSolicitada };
}
function calcularVitimaPaginacao(quadros, algoritmo) {
  const fila = quadros.filter((q) => q !== null).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  if (fila.length === 0) return null;
  switch (algoritmo) {
    case "FIFO":
      return fila[0];
    case "HISTORICO":
      return vitimaHistorico(fila);
    case "SEGUNDA_CHANCE":
      return fila.find((p) => p.bitRef === 0) ?? fila[0];
  }
}

// src/app/features/avaliacoes/questoes/paginacao.ts
var Montador2 = class {
  constructor() {
    this.campos = [];
    this.gabarito = {};
  }
  campo(c, valor) {
    this.campos.push(c);
    this.gabarito[c.id] = valor === null ? NAO_SE_APLICA : String(valor);
    return { campo: c.id };
  }
};
var MODELO_SIMPLES = `P\xE1ginas e quadros de ${TAMANHO_PAGINA} bytes; mem\xF3ria f\xEDsica de ${QUANTIDADE_QUADROS} quadros. Endere\xE7o l\xF3gico = p\xE1gina (2 bits) + deslocamento (2 bits); f\xEDsico = quadro (3 bits) + deslocamento (2 bits).`;
function tabelaPaginas(p) {
  return {
    titulo: `Tabela de p\xE1ginas de ${p.nome} (${p.bytes} bytes)`,
    cabecalho: ["P\xE1gina", "Quadro"],
    linhas: p.quadros.map((q, i) => [binario(i, 2), binario(q, BITS_QUADRO)])
  };
}
function memoriaSimples(processos) {
  const linhas = [];
  for (let q = 0; q < QUANTIDADE_QUADROS; q++) {
    const dono = processos.find((p) => p.quadros.includes(q));
    let conteudo = "livre";
    if (dono) {
      const pag = dono.quadros.indexOf(q);
      conteudo = Array.from({ length: TAMANHO_PAGINA }, (_, d) => {
        const i = pag * TAMANHO_PAGINA + d;
        return i < dono.bytes ? `${dono.nome}${i}` : "sobra";
      }).join(" ");
    }
    linhas.push([binario(q, BITS_QUADRO), conteudo]);
  }
  return { titulo: "Mem\xF3ria f\xEDsica", cabecalho: ["Quadro", "Bytes"], linhas };
}
function simplesTraducao(rnd) {
  const ex = gerarPaginacaoSimples("TRADUCAO", rnd);
  const m = new Montador2();
  return {
    publica: {
      tipo: "pag-traducao",
      titulo: "Pagina\xE7\xE3o simples \u2014 tradu\xE7\xE3o de endere\xE7os",
      enunciado: `${MODELO_SIMPLES} Use as tabelas de p\xE1ginas para traduzir cada endere\xE7o l\xF3gico em f\xEDsico (5 bits).`,
      dados: ex.processos.map(tabelaPaginas),
      respostas: [{
        titulo: "Endere\xE7os",
        cabecalho: ["Processo", "Endere\xE7o l\xF3gico", "Endere\xE7o f\xEDsico"],
        linhas: ex.perguntas.map((q, i) => [
          q.processo.nome,
          enderecoLogico(q.pagina, q.deslocamento),
          m.campo(
            { id: `trad${i}`, tipo: "binario", rotulo: `Endere\xE7o f\xEDsico ${i + 1}`, dica: "5 bits" },
            enderecoFisico(q.processo.quadros[q.pagina], q.deslocamento)
          )
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function simplesTabela(rnd) {
  const ex = gerarPaginacaoSimples("TABELA", rnd);
  const m = new Montador2();
  const alvo = ex.processos[0];
  return {
    publica: {
      tipo: "pag-tabela",
      titulo: "Pagina\xE7\xE3o simples \u2014 tabela de p\xE1ginas",
      enunciado: `${MODELO_SIMPLES} Observe a mem\xF3ria f\xEDsica e complete a tabela de p\xE1ginas do processo ${alvo.nome} (${alvo.bytes} bytes). O n\xFAmero do byte \xE9 a posi\xE7\xE3o dele no processo, contando a partir de 0.`,
      dados: [memoriaSimples(ex.processos)],
      respostas: [{
        titulo: `Tabela de p\xE1ginas de ${alvo.nome}`,
        cabecalho: ["P\xE1gina", "Quadro (3 bits)"],
        linhas: alvo.quadros.map((q, i) => [
          binario(i, 2),
          m.campo({ id: `pag${i}`, tipo: "binario", rotulo: `Quadro da p\xE1gina ${i}`, dica: "3 bits" }, binario(q, BITS_QUADRO))
        ])
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function simplesCalculos(rnd) {
  const ex = gerarPaginacaoSimples("CALCULOS", rnd);
  const m = new Montador2();
  const quadros = ex.processos.reduce((t, p) => t + p.quadros.length, 0);
  return {
    publica: {
      tipo: "pag-calculos",
      titulo: "Pagina\xE7\xE3o simples \u2014 p\xE1ginas e fragmenta\xE7\xE3o",
      enunciado: `${MODELO_SIMPLES} Calcule quantas p\xE1ginas cada processo ocupa, a fragmenta\xE7\xE3o interna de cada um, quantos quadros ficam ocupados e quantos bytes ficam livres na mem\xF3ria f\xEDsica.`,
      dados: [],
      respostas: [
        {
          titulo: "Processos",
          cabecalho: ["Processo", "Tamanho (bytes)", "P\xE1ginas", "Fragmenta\xE7\xE3o interna (bytes)"],
          linhas: ex.processos.map((p) => [
            p.nome,
            String(p.bytes),
            m.campo({ id: `${p.nome}-paginas`, tipo: "numero", rotulo: `P\xE1ginas de ${p.nome}` }, paginasNecessarias(p.bytes)),
            m.campo({ id: `${p.nome}-sobra`, tipo: "numero", rotulo: `Fragmenta\xE7\xE3o interna de ${p.nome}` }, fragmentacaoInterna(p.bytes))
          ])
        },
        {
          titulo: "Mem\xF3ria f\xEDsica",
          cabecalho: ["Quadros ocupados", "Bytes livres"],
          linhas: [[
            m.campo({ id: "quadros", tipo: "numero", rotulo: "Quadros ocupados" }, quadros),
            m.campo({ id: "livre", tipo: "numero", rotulo: "Bytes livres" }, (QUANTIDADE_QUADROS - quadros) * TAMANHO_PAGINA)
          ]]
        }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function memoriaDemanda(quadros, colunas) {
  const extra = colunas === "FIFO" ? ["Carga"] : colunas === "SEGUNDA_CHANCE" ? ["Carga", "Bit R"] : colunas === "HISTORICO" ? ["Carga", "T1", "T2", "T3", "T4"] : [];
  return {
    titulo: "Mem\xF3ria f\xEDsica",
    cabecalho: ["Quadro", "P\xE1gina", ...extra],
    linhas: quadros.map((p, q) => {
      if (!p) return [String(q), "livre", ...extra.map(() => "")];
      const cols = colunas === "FIFO" ? [String(p.timestamp)] : colunas === "SEGUNDA_CHANCE" ? [String(p.timestamp), String(p.bitRef)] : colunas === "HISTORICO" ? [String(p.timestamp), ...bitsT1aT4(p.historico).map(String)] : [];
      return [String(q), nomePagina(p), ...cols];
    })
  };
}
function demandaTabela(rnd) {
  const ex = gerarPaginacaoDemanda("LOGICA", 4, rnd);
  const m = new Montador2();
  const opcoesQuadro = [{ valor: "-", rotulo: "-" }, ...Array.from({ length: TAM }, (_, q) => ({ valor: String(q), rotulo: String(q) }))];
  const opcoesBit = [{ valor: "V", rotulo: "V" }, { valor: "I", rotulo: "I" }];
  return {
    publica: {
      tipo: "dem-tabela",
      titulo: "Pagina\xE7\xE3o por demanda \u2014 tabela de p\xE1ginas",
      enunciado: `Mem\xF3ria f\xEDsica de ${TAM} quadros. Observe a mem\xF3ria f\xEDsica e complete a tabela de p\xE1ginas de cada processo: o quadro (ou "-" se a p\xE1gina est\xE1 s\xF3 no disco) e o bit V/I.`,
      dados: [memoriaDemanda(ex.quadros, "nenhuma")],
      respostas: ex.processos.map((p) => ({
        titulo: `Processo ${p.nome}`,
        cabecalho: ["P\xE1gina", "Quadro", "Bit V/I"],
        linhas: p.paginas.map((pg) => [
          String(pg.indice),
          m.campo(
            { id: `${nomePagina(pg)}-q`, tipo: "opcao", rotulo: `Quadro de ${nomePagina(pg)}`, opcoes: opcoesQuadro },
            pg.quadro === null ? "-" : pg.quadro
          ),
          m.campo(
            { id: `${nomePagina(pg)}-b`, tipo: "opcao", rotulo: `Bit de ${nomePagina(pg)}`, opcoes: opcoesBit },
            pg.quadro === null ? "I" : "V"
          )
        ])
      })),
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var NOME_VITIMA = {
  FIFO: "FIFO",
  HISTORICO: "Hist\xF3rico de bits de refer\xEAncia",
  SEGUNDA_CHANCE: "Segunda Chance"
};
var REGRA_VITIMA = {
  FIFO: "Sai a p\xE1gina carregada h\xE1 mais tempo (menor carga).",
  HISTORICO: "Compare a partir de T4 (o mais recente), depois T3, T2 e T1; persistindo o empate, sai a de menor carga.",
  SEGUNDA_CHANCE: "Percorra em ordem de carga: bit R = 1 ganha segunda chance (vira 0 e vai para o fim); a primeira com bit 0 sai."
};
function demandaVitima(alg, rnd) {
  const ex = gerarPaginacaoDemanda("VITIMA", 4, rnd);
  const m = new Montador2();
  const vitima = calcularVitimaPaginacao(ex.quadros, alg);
  const carregadas = ex.quadros.filter((q) => q !== null);
  return {
    publica: {
      tipo: `dem-${alg}`,
      titulo: `Pagina\xE7\xE3o por demanda \u2014 p\xE1gina v\xEDtima (${NOME_VITIMA[alg]})`,
      enunciado: `A mem\xF3ria f\xEDsica est\xE1 cheia e ocorreu falta de p\xE1gina para ${nomePagina(ex.paginaSolicitada)}. Pelo algoritmo ${NOME_VITIMA[alg]}, qual p\xE1gina sai? ${REGRA_VITIMA[alg]}`,
      dados: [memoriaDemanda(ex.quadros, alg)],
      respostas: [{
        cabecalho: ["P\xE1gina v\xEDtima"],
        linhas: [[m.campo({
          id: "vitima",
          tipo: "opcao",
          rotulo: "P\xE1gina v\xEDtima",
          opcoes: carregadas.map((p) => ({ valor: nomePagina(p), rotulo: nomePagina(p) }))
        }, nomePagina(vitima))]]
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var QUESTOES_PAGINACAO = [
  { id: "pag-traducao", assunto: "Pagina\xE7\xE3o simples", nome: "Tradu\xE7\xE3o de endere\xE7os", gerar: simplesTraducao },
  { id: "pag-tabela", assunto: "Pagina\xE7\xE3o simples", nome: "Tabela de p\xE1ginas", gerar: simplesTabela },
  { id: "pag-calculos", assunto: "Pagina\xE7\xE3o simples", nome: "P\xE1ginas e fragmenta\xE7\xE3o interna", gerar: simplesCalculos },
  { id: "dem-tabela", assunto: "Pagina\xE7\xE3o por demanda", nome: "Tabela de p\xE1ginas (quadro e bit V/I)", gerar: demandaTabela },
  ...["FIFO", "HISTORICO", "SEGUNDA_CHANCE"].map((a) => ({
    id: `dem-${a}`,
    assunto: "Pagina\xE7\xE3o por demanda",
    nome: `P\xE1gina v\xEDtima: ${NOME_VITIMA[a]}`,
    gerar: (rnd) => demandaVitima(a, rnd)
  }))
];

// src/app/features/segmentacao/models/segmentacao.ts
var TAMANHO_MEMORIA = 32;
var BITS_FISICO = 5;
var BITS_SEGMENTO = 2;
var BITS_DESLOCAMENTO2 = 4;
var SEGMENTOS = [
  { tipo: "C", numero: 0, nome: "C\xF3digo" },
  { tipo: "D", numero: 1, nome: "Dados" },
  { tipo: "P", numero: 2, nome: "Pilha" }
];
function binario2(valor, bits) {
  return valor.toString(2).padStart(bits, "0");
}
function nomeByte(tipo, deslocamento) {
  return `${tipo}${deslocamento}`;
}
function ocupacao(processos) {
  const mem = Array.from({ length: TAMANHO_MEMORIA }, (_, endereco) => ({
    endereco,
    processo: null,
    segmento: null,
    deslocamento: null,
    conteudo: null
  }));
  processos.forEach((p) => p.segmentos.forEach((s) => {
    for (let d = 0; d < s.tamanho; d++) {
      mem[s.base + d] = { endereco: s.base + d, processo: p, segmento: s, deslocamento: d, conteudo: nomeByte(s.tipo, d) };
    }
  }));
  return mem;
}
function lacunas2(ocupado) {
  const out = [];
  let inicio = -1;
  for (let i = 0; i <= ocupado.length; i++) {
    const livre = i < ocupado.length && !ocupado[i];
    if (livre && inicio < 0) inicio = i;
    if (!livre && inicio >= 0) {
      out.push({ inicio, tamanho: i - inicio });
      inicio = -1;
    }
  }
  return out;
}
function melhorLacuna(lista, tamanho) {
  return lista.filter((l) => l.tamanho >= tamanho).sort((a, b) => a.tamanho - b.tamanho || a.inicio - b.inicio)[0] ?? null;
}
var ORDEM_ALOCACAO = ["C", "D", "P"];
function alocar(processos, nome, cor, tamanhos) {
  const ocupado = ocupacao(processos).map((b) => b.processo !== null);
  const livreTotal = ocupado.filter((o) => !o).length;
  const necessario = tamanhos.C + tamanhos.D + tamanhos.P;
  const passos = [];
  const segmentos = [];
  for (const tipo of ORDEM_ALOCACAO) {
    const info = SEGMENTOS.find((s) => s.tipo === tipo);
    const lista = lacunas2(ocupado);
    const escolhida = melhorLacuna(lista, tamanhos[tipo]);
    passos.push({
      segmento: tipo,
      nome: info.nome,
      tamanho: tamanhos[tipo],
      lacunas: lista,
      escolhida,
      sobra: escolhida ? escolhida.tamanho - tamanhos[tipo] : 0
    });
    if (!escolhida) {
      return {
        ok: false,
        processo: null,
        passos,
        motivo: livreTotal >= necessario ? "fragmentacao" : "insuficiente",
        livreTotal,
        necessario
      };
    }
    for (let i = 0; i < tamanhos[tipo]; i++) ocupado[escolhida.inicio + i] = true;
    segmentos.push({ tipo, numero: info.numero, nome: info.nome, tamanho: tamanhos[tipo], base: escolhida.inicio });
  }
  segmentos.sort((a, b) => a.numero - b.numero);
  return { ok: true, processo: { nome, cor, segmentos }, passos, motivo: null, livreTotal, necessario };
}
function traduzir(p, numeroSegmento, deslocamento) {
  const s = p.segmentos.find((x) => x.numero === numeroSegmento);
  if (!s) {
    return { ok: false, fisico: null, erro: `Segmento ${binario2(numeroSegmento, BITS_SEGMENTO)} n\xE3o existe: interrup\xE7\xE3o de prote\xE7\xE3o.` };
  }
  if (deslocamento >= s.tamanho) {
    return {
      ok: false,
      fisico: null,
      erro: `Deslocamento ${deslocamento} \u2265 limite ${s.tamanho} do segmento ${binario2(s.numero, BITS_SEGMENTO)}: interrup\xE7\xE3o (endere\xE7o fora do segmento).`
    };
  }
  return { ok: true, fisico: s.base + deslocamento, erro: null };
}

// src/app/features/segmentacao/models/exercicio-segmentacao.ts
var NOMES_EX_SEG = ["A", "B", "C"];
var QTD_PERGUNTAS_TRADUCAO = 4;
function tamanhosAleatorios(rnd, max = 4) {
  return { C: inteiro(rnd, 1, max), D: inteiro(rnd, 1, max), P: inteiro(rnd, 1, max) };
}
function montarCenario(rnd, minLivre) {
  let processos = [];
  const ordem = ["A", "X", "B", "Y", "C"];
  for (const nome of ordem) {
    const temporario = nome === "X" || nome === "Y";
    const r = alocar(processos, nome, temporario ? "#000000" : "", tamanhosAleatorios(rnd, temporario ? 3 : 4));
    if (!r.ok) return null;
    processos = [...processos, r.processo];
  }
  processos = processos.filter((p) => NOMES_EX_SEG.includes(p.nome));
  const livre = ocupacao(processos).filter((b) => !b.processo).length;
  return livre >= minLivre ? processos : null;
}
function gerarSegmentacao(tipo, rnd = Math.random) {
  let processos = null;
  let novo = null;
  let gabarito = null;
  let querFragmentacao = rnd() < 0.3;
  for (let tentativa = 0; tentativa < 2e3; tentativa++) {
    if (tentativa === 1500) querFragmentacao = false;
    processos = montarCenario(rnd, tipo === "MEMORIA_FISICA" ? 6 : 3);
    if (!processos) continue;
    if (tipo !== "ALOCACAO") break;
    const tamanhos = tamanhosAleatorios(rnd, querFragmentacao ? 6 : 4);
    const r = alocar(processos, "D", "", tamanhos);
    const serve = querFragmentacao ? !r.ok && r.motivo === "fragmentacao" : r.ok;
    if (serve) {
      novo = { nome: "D", cor: "", tamanhos };
      gabarito = r;
      break;
    }
    processos = null;
  }
  if (!processos) throw new Error("N\xE3o foi poss\xEDvel gerar o exerc\xEDcio de segmenta\xE7\xE3o.");
  return {
    processos,
    alvo: tipo === "TABELA" ? 0 : inteiro(rnd, 0, processos.length - 1),
    perguntas: sortearPerguntas2(rnd, processos),
    novo,
    gabaritoAlocacao: gabarito
  };
}
function sortearPerguntas2(rnd, processos) {
  const embaralhar2 = (l) => embaralhar(rnd, l);
  const validas = [];
  processos.forEach((p2) => p2.segmentos.forEach((s2) => {
    for (let d = 0; d < s2.tamanho; d++) validas.push({ processo: p2, segmento: s2.numero, deslocamento: d });
  }));
  const escolhidas = [];
  for (const p2 of embaralhar2(processos)) {
    if (escolhidas.length >= QTD_PERGUNTAS_TRADUCAO - 1) break;
    const c = embaralhar2(validas.filter((v) => v.processo === p2))[0];
    if (c) escolhidas.push(c);
  }
  const p = embaralhar2(processos)[0];
  const s = embaralhar2(p.segmentos)[0];
  escolhidas.push({ processo: p, segmento: s.numero, deslocamento: inteiro(rnd, s.tamanho, Math.min(15, s.tamanho + 3)) });
  return embaralhar2(escolhidas);
}

// src/app/features/avaliacoes/questoes/segmentacao.ts
var Montador3 = class {
  constructor() {
    this.campos = [];
    this.gabarito = {};
  }
  campo(c, valor) {
    this.campos.push(c);
    this.gabarito[c.id] = valor === null ? NAO_SE_APLICA : String(valor);
    return { campo: c.id };
  }
};
var MODELO = `Mem\xF3ria f\xEDsica de ${TAMANHO_MEMORIA} bytes (endere\xE7o f\xEDsico de ${BITS_FISICO} bits). Endere\xE7o l\xF3gico = segmento (${BITS_SEGMENTO} bits: 00 c\xF3digo, 01 dados, 10 pilha) + deslocamento (${BITS_DESLOCAMENTO2} bits).`;
function tabelaSegmentos(p) {
  return {
    titulo: `Tabela de segmentos de ${p.nome}`,
    cabecalho: ["Segmento", "Base", "Limite"],
    linhas: p.segmentos.map((s) => [
      `${binario2(s.numero, BITS_SEGMENTO)} \xB7 ${s.nome}`,
      `${binario2(s.base, BITS_FISICO)} (${s.base})`,
      String(s.tamanho)
    ])
  };
}
function memoriaFisica(processos) {
  const mem = ocupacao(processos);
  const linhas = [];
  for (let i = 0; i < TAMANHO_MEMORIA; i += 8) {
    linhas.push([`${i}\u2013${i + 7}`, ...mem.slice(i, i + 8).map((b) => b.processo ? `${b.processo.nome}:${b.conteudo}` : "\xB7")]);
  }
  return {
    titulo: "Mem\xF3ria f\xEDsica (A:C0 = byte 0 do c\xF3digo de A; \xB7 = livre)",
    cabecalho: ["Endere\xE7os", "+0", "+1", "+2", "+3", "+4", "+5", "+6", "+7"],
    linhas
  };
}
function traducao(rnd) {
  const ex = gerarSegmentacao("TRADUCAO", rnd);
  const m = new Montador3();
  return {
    publica: {
      tipo: "seg-traducao",
      titulo: "Segmenta\xE7\xE3o \u2014 tradu\xE7\xE3o de endere\xE7os",
      enunciado: `${MODELO} Traduza cada endere\xE7o l\xF3gico em f\xEDsico (${BITS_FISICO} bits). Se o deslocamento n\xE3o for menor que o limite (ou o segmento n\xE3o existir), responda "erro": ocorre uma interrup\xE7\xE3o.`,
      dados: ex.processos.map(tabelaSegmentos),
      respostas: [{
        titulo: "Endere\xE7os",
        cabecalho: ["Processo", "Endere\xE7o l\xF3gico (seg \xB7 desloc.)", 'Endere\xE7o f\xEDsico ou "erro"'],
        linhas: ex.perguntas.map((q, i) => {
          const r = traduzir(q.processo, q.segmento, q.deslocamento);
          return [
            q.processo.nome,
            `${binario2(q.segmento, BITS_SEGMENTO)} ${binario2(q.deslocamento, BITS_DESLOCAMENTO2)}`,
            m.campo(
              { id: `trad${i}`, tipo: "texto", rotulo: `Endere\xE7o f\xEDsico ${i + 1}`, dica: "5 bits ou erro" },
              r.ok ? binario2(r.fisico, BITS_FISICO) : "ERRO"
            )
          ];
        })
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function tabela(rnd) {
  const ex = gerarSegmentacao("TABELA", rnd);
  const m = new Montador3();
  const alvo = ex.processos[0];
  return {
    publica: {
      tipo: "seg-tabela",
      titulo: "Segmenta\xE7\xE3o \u2014 tabela de segmentos",
      enunciado: `${MODELO} Observe a mem\xF3ria f\xEDsica e complete a base (${BITS_FISICO} bits) e o limite de cada segmento do processo ${alvo.nome}.`,
      dados: [memoriaFisica(ex.processos)],
      respostas: [{
        titulo: `Tabela de segmentos de ${alvo.nome}`,
        cabecalho: ["Segmento", "Base (5 bits)", "Limite"],
        linhas: ["C", "D", "P"].map((t) => {
          const s = alvo.segmentos.find((x) => x.tipo === t);
          return [
            `${binario2(s.numero, BITS_SEGMENTO)} \xB7 ${s.nome}`,
            m.campo({ id: `${t}-base`, tipo: "binario", rotulo: `Base de ${s.nome}`, dica: "5 bits" }, binario2(s.base, BITS_FISICO)),
            m.campo({ id: `${t}-limite`, tipo: "numero", rotulo: `Limite de ${s.nome}` }, s.tamanho)
          ];
        })
      }],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
function alocacao2(rnd) {
  const ex = gerarSegmentacao("ALOCACAO", rnd);
  const m = new Montador3();
  const novo = ex.novo;
  const g = ex.gabaritoAlocacao;
  return {
    publica: {
      tipo: "seg-alocacao",
      titulo: "Segmenta\xE7\xE3o \u2014 aloca\xE7\xE3o best-fit",
      enunciado: `${MODELO} O processo ${novo.nome} vai ser criado com c\xF3digo de ${novo.tamanhos.C}, dados de ${novo.tamanhos.D} e pilha de ${novo.tamanhos.P} bytes. Aloque segmento a segmento por best-fit, na ordem c\xF3digo \u2192 dados \u2192 pilha (menor lacuna que comporta; empate: menor endere\xE7o). \xC9 tudo ou nada: se um segmento n\xE3o couber, o processo n\xE3o \xE9 criado. Diga se o processo \xE9 criado e a base de cada segmento ("-" se n\xE3o for criado).`,
      dados: [memoriaFisica(ex.processos)],
      respostas: [
        {
          cabecalho: ["O processo \xE9 criado?"],
          linhas: [[m.campo({
            id: "cabe",
            tipo: "opcao",
            rotulo: "O processo \xE9 criado?",
            opcoes: [
              { valor: "sim", rotulo: "Sim" },
              { valor: "fragmentacao", rotulo: "N\xE3o: fragmenta\xE7\xE3o externa" },
              { valor: "insuficiente", rotulo: "N\xE3o: mem\xF3ria insuficiente" }
            ]
          }, g.ok ? "sim" : g.motivo)]]
        },
        {
          titulo: `Tabela de segmentos de ${novo.nome}`,
          cabecalho: ["Segmento", "Limite", "Base (5 bits)"],
          linhas: SEGMENTOS.map((info) => {
            const base = g.processo?.segmentos.find((s) => s.tipo === info.tipo)?.base;
            return [
              `${binario2(info.numero, BITS_SEGMENTO)} \xB7 ${info.nome}`,
              String(novo.tamanhos[info.tipo]),
              m.campo(
                { id: `${info.tipo}-base`, tipo: "binario", rotulo: `Base de ${info.nome}`, dica: "5 bits ou -" },
                base === void 0 ? null : binario2(base, BITS_FISICO)
              )
            ];
          })
        }
      ],
      campos: m.campos
    },
    gabarito: m.gabarito
  };
}
var QUESTOES_SEGMENTACAO = [
  { id: "seg-traducao", assunto: "Segmenta\xE7\xE3o", nome: "Tradu\xE7\xE3o de endere\xE7os", gerar: traducao },
  { id: "seg-tabela", assunto: "Segmenta\xE7\xE3o", nome: "Tabela de segmentos", gerar: tabela },
  { id: "seg-alocacao", assunto: "Segmenta\xE7\xE3o", nome: "Aloca\xE7\xE3o best-fit", gerar: alocacao2 }
];

// src/app/features/avaliacoes/questoes/catalogo.ts
var CATALOGO = [
  ...QUESTOES_ESCALONAMENTO,
  ...QUESTOES_PARTICOES,
  ...QUESTOES_PAGINACAO,
  ...QUESTOES_SEGMENTACAO
];
var MAX_QUESTOES = 20;
function tipoQuestao(id) {
  return CATALOGO.find((t) => t.id === id);
}
function validarModelo(modelo) {
  if (!Array.isArray(modelo) || modelo.length < 1 || modelo.length > MAX_QUESTOES) {
    throw new Error(`A prova deve ter de 1 a ${MAX_QUESTOES} quest\xF5es.`);
  }
  return modelo.map((item) => {
    const tipo = item?.tipo;
    if (typeof tipo !== "string" || !tipoQuestao(tipo)) throw new Error(`Tipo de quest\xE3o desconhecido: ${String(tipo)}`);
    return { tipo };
  });
}
function gerarProva(modelo, semente) {
  return modelo.map((item, i) => tipoQuestao(item.tipo).gerar(criarAleatorio(`${semente}:${i}`)));
}
export {
  corrigirProva,
  gerarProva,
  validarModelo
};
