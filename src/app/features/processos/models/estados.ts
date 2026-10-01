/**
 * Diagrama de estados do processo (livro, seção "Estados de um processo", Figura 4.2).
 *
 * Estados: Criação, Apto, Executando, Bloqueado e Destruição.
 * Transições: Admissão (criação → apto), Seleção pelo escalonador (apto → executando),
 * Interrupção de HW / preempção (executando → apto), Interrupção de SW / solicitação de E/S
 * (executando → bloqueado), Interrupção de HW / E/S concluída (bloqueado → apto),
 * Término normal (executando → destruição) e as situações especiais (linhas pontilhadas):
 * retorno imediato (executando → executando) e encerramento de um bloqueado por kill ou exceção
 * (bloqueado → destruição).
 *
 * Um cenário é gerado aleatoriamente (processos com chegada e sequência de CPU e E/S) e simulado
 * com uma CPU e escalonamento circular (quantum); cada mudança de estado vira um evento animado.
 */

export type Estado = 'CRIACAO' | 'APTO' | 'EXECUTANDO' | 'BLOQUEADO' | 'DESTRUICAO';

export type Transicao =
  | 'CRIACAO' | 'ADMISSAO' | 'SELECAO' | 'PREEMPCAO' | 'SOLICITA_ES'
  | 'ES_CONCLUIDA' | 'TERMINO' | 'RETORNO_IMEDIATO' | 'ENCERRAMENTO_BLOQUEADO';

export const NOMES_ESTADO: Record<Estado, string> = {
  CRIACAO: 'Criação', APTO: 'Apto', EXECUTANDO: 'Executando', BLOQUEADO: 'Bloqueado', DESTRUICAO: 'Destruição',
};

export const ROTULOS_TRANSICAO: Record<Transicao, string> = {
  CRIACAO: 'Criação do processo',
  ADMISSAO: 'Admissão',
  SELECAO: 'Seleção (escalonador)',
  PREEMPCAO: 'Interrupção de HW (preempção)',
  SOLICITA_ES: 'Interrupção de SW (solicitação de E/S)',
  ES_CONCLUIDA: 'Interrupção de HW (E/S concluída)',
  TERMINO: 'Término normal (exit)',
  RETORNO_IMEDIATO: 'Retorno imediato',
  ENCERRAMENTO_BLOQUEADO: 'Interrupção de SW (kill) / Exceção',
};

export interface Dispositivo { nome: string; operacao: string; }

export const DISPOSITIVOS: Dispositivo[] = [
  { nome: 'disco', operacao: 'leitura do disco' },
  { nome: 'teclado', operacao: 'espera por uma tecla' },
  { nome: 'rede', operacao: 'recebimento de dados pela rede' },
  { nome: 'impressora', operacao: 'impressão' },
];

export interface Passo {
  tipo: 'CPU' | 'ES';
  duracao: number;
  dispositivo?: Dispositivo;
}

export interface ProcessoEstados {
  nome: string;
  cor: string;
  chegada: number;
  passos: Passo[];
  /** Momento (em unidades de CPU já executadas) em que faz uma chamada de sistema atendida na hora. */
  chamadaSistema: number | null;
  /** Encerrado pelo SO enquanto bloqueado: índice do passo de E/S, após quantas unidades e o motivo. */
  encerramento: { passo: number; apos: number; motivo: 'kill' | 'excecao' } | null;
}

export interface Bloqueio { nome: string; dispositivo: string; restante: number; }

export interface Foto {
  t: number;
  estados: Record<string, Estado | null>;
  fila: string[];
  cpu: string | null;
  bloqueados: Bloqueio[];
  cpuExecutada: Record<string, number>;
}

export interface Evento {
  t: number;
  processo: string;
  de: Estado | null;
  para: Estado;
  transicao: Transicao;
  detalhe: string;
}

export interface Cenario {
  processos: ProcessoEstados[];
  quantum: number;
  eventos: Evento[];
  fotos: Foto[];                 // fotos[i] = situação depois do evento i
  inicial: Foto;                 // antes do primeiro evento
  linhaTempo: Record<string, (Estado | null)[]>; // estado de cada processo durante cada unidade de tempo
  duracao: number;
}

export interface OpcoesCenario {
  quantidade: number;
  quantum: number;
  especiais: boolean; // retorno imediato e encerramento de bloqueado
}

const CORES = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#db2777'];

function aleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function totalCpu(p: ProcessoEstados): number {
  return p.passos.filter(x => x.tipo === 'CPU').reduce((t, x) => t + x.duracao, 0);
}

/**
 * Cada processo segue o mesmo ciclo, com valores aleatórios:
 *   criação → CPU → CPU → E/S → CPU → fim
 * A 1ª fase de CPU é maior que o quantum: o processo usa a CPU duas vezes, voltando para a
 * fila de aptos entre elas (preempção). Depois faz uma E/S e volta para uma fase curta de CPU.
 */
export function gerarProcessos(op: OpcoesCenario): ProcessoEstados[] {
  const q = Math.max(1, op.quantum);
  const processos: ProcessoEstados[] = [];
  for (let i = 0; i < op.quantidade; i++) {
    const passos: Passo[] = [
      { tipo: 'CPU', duracao: aleatorio(q + 1, 2 * q) },
      { tipo: 'ES', duracao: aleatorio(2, 4), dispositivo: DISPOSITIVOS[aleatorio(0, DISPOSITIVOS.length - 1)] },
      { tipo: 'CPU', duracao: aleatorio(1, q) },
    ];
    processos.push({
      nome: `P${i + 1}`, cor: CORES[i % CORES.length],
      chegada: i === 0 ? 0 : aleatorio(0, 4),
      passos, chamadaSistema: null, encerramento: null,
    });
  }
  if (op.especiais) {
    // retorno imediato por chamada de sistema durante a 1ª fase de CPU de um processo
    const p = processos[aleatorio(0, processos.length - 1)];
    p.chamadaSistema = 1;
    // um outro processo é encerrado enquanto espera a E/S (kill ou exceção)
    const outro = processos.filter(x => x !== p)[aleatorio(0, processos.length - 2)];
    outro.encerramento = { passo: 1, apos: aleatorio(1, outro.passos[1].duracao - 1), motivo: Math.random() < 0.5 ? 'kill' : 'excecao' };
  }
  return processos;
}

interface Estado_ {
  estado: Estado | null;
  passo: number;
  restante: number;
  quantumUsado: number;
  cpuExecutada: number;
  bloqueadoHa: number;
}

/** Simula o cenário (uma CPU, fila circular com quantum) e registra cada mudança de estado. */
export function simular(processos: ProcessoEstados[], quantum: number): Cenario {
  const st: Record<string, Estado_> = {};
  processos.forEach(p => st[p.nome] = { estado: null, passo: 0, restante: p.passos[0].duracao, quantumUsado: 0, cpuExecutada: 0, bloqueadoHa: 0 });
  const proc = (n: string) => processos.find(p => p.nome === n)!;
  const fila: string[] = [];
  let cpu: string | null = null;
  const eventos: Evento[] = [];
  const fotos: Foto[] = [];
  const linhaTempo: Record<string, (Estado | null)[]> = {};
  processos.forEach(p => linhaTempo[p.nome] = []);

  const foto = (t: number): Foto => ({
    t,
    estados: Object.fromEntries(processos.map(p => [p.nome, st[p.nome].estado])),
    fila: [...fila],
    cpu,
    bloqueados: processos.filter(p => st[p.nome].estado === 'BLOQUEADO').map(p => ({
      nome: p.nome, dispositivo: p.passos[st[p.nome].passo].dispositivo!.nome, restante: st[p.nome].restante,
    })),
    cpuExecutada: Object.fromEntries(processos.map(p => [p.nome, st[p.nome].cpuExecutada])),
  });
  const inicial = foto(0);
  const emitir = (t: number, nome: string, para: Estado, transicao: Transicao, detalhe: string) => {
    const de = st[nome].estado;
    st[nome].estado = para;
    eventos.push({ t, processo: nome, de, para, transicao, detalhe });
    fotos.push(foto(t));
  };

  let t = 0;
  for (; t < 200; t++) {
    // 0. fim da unidade anterior para quem está executando
    let preemptar: string | null = null;
    if (cpu) {
      const s = st[cpu];
      const p = proc(cpu);
      if (s.restante === 0) {
        s.passo++;
        s.quantumUsado = 0;
        if (s.passo >= p.passos.length) {
          const nome = cpu;
          cpu = null;
          emitir(t, nome, 'DESTRUICAO', 'TERMINO',
            `${nome} concluiu toda a sua execução e chamou exit(): passa de Executando para Destruição e o SO libera seus recursos (PCB, memória).`);
        } else {
          const ps = p.passos[s.passo];
          s.restante = ps.duracao;
          s.bloqueadoHa = 0;
          const nome = cpu;
          cpu = null;
          emitir(t, nome, 'BLOQUEADO', 'SOLICITA_ES',
            `${nome} solicita ${ps.dispositivo!.operacao} (${ps.duracao} u) por meio de uma chamada de sistema e precisa esperar: vai para Bloqueado e libera a CPU.`);
        }
      } else if (s.quantumUsado >= quantum) {
        const chegaAgora = processos.some(x => x.chegada === t && st[x.nome].estado === null);
        const esTermina = processos.some(x => st[x.nome].estado === 'BLOQUEADO' && st[x.nome].restante === 0);
        if (fila.length > 0 || chegaAgora || esTermina) {
          preemptar = cpu;
        } else {
          s.quantumUsado = 0;
          emitir(t, cpu, 'EXECUTANDO', 'RETORNO_IMEDIATO',
            `O timer interrompeu ${cpu} ao fim do quantum (${quantum} u), mas não há outro processo apto: o SO devolve a CPU a ${cpu}, que continua Executando.`);
        }
      }
    }

    // 1. chegadas
    for (const p of processos.filter(x => x.chegada === t)) {
      emitir(t, p.nome, 'CRIACAO', 'CRIACAO', `${p.nome} é criado: o SO monta seu bloco descritor (PCB) e carrega o programa na memória.`);
      emitir(t, p.nome, 'APTO', 'ADMISSAO', `Admissão: ${p.nome} está pronto para executar e entra na fila de aptos para disputar o processador.`);
      fila.push(p.nome);
    }

    // 2. bloqueados: E/S concluída ou encerramento pelo SO
    for (const p of processos.filter(x => st[x.nome].estado === 'BLOQUEADO')) {
      const s = st[p.nome];
      const enc = p.encerramento;
      if (enc && enc.passo === s.passo && s.bloqueadoHa >= enc.apos) {
        emitir(t, p.nome, 'DESTRUICAO', 'ENCERRAMENTO_BLOQUEADO', enc.motivo === 'kill'
          ? `Outro processo pediu o término de ${p.nome} (chamada externa, como o kill) enquanto ele esperava a E/S: o SO o encerra direto de Bloqueado para Destruição.`
          : `Exceção (timeout na ${p.passos[s.passo].dispositivo!.operacao}): o SO encerra ${p.nome} mesmo estando Bloqueado.`);
        continue;
      }
      if (s.restante === 0) {
        const op = p.passos[s.passo].dispositivo!.operacao;
        s.passo++;
        s.restante = p.passos[s.passo].duracao;
        emitir(t, p.nome, 'APTO', 'ES_CONCLUIDA',
          `O dispositivo gerou uma interrupção de HW: a ${op} de ${p.nome} terminou. ${p.nome} volta para a fila de aptos (não vai direto para a CPU).`);
        fila.push(p.nome);
      }
    }

    // 3. preempção pelo timer
    if (preemptar) {
      st[preemptar].quantumUsado = 0;
      cpu = null;
      const prox = fila[0];
      emitir(t, preemptar, 'APTO', 'PREEMPCAO',
        `Interrupção de HW (timer): ${preemptar} usou todo o seu quantum (${quantum} u) e ${prox} está esperando. O SO retira a CPU de ${preemptar} (preempção), que volta ao fim da fila de aptos.`);
      fila.push(preemptar);
    }

    // 4. seleção pelo escalonador
    if (!cpu && fila.length) {
      const nome = fila.shift()!;
      cpu = nome;
      st[nome].quantumUsado = 0;
      emitir(t, nome, 'EXECUTANDO', 'SELECAO', `Seleção: o escalonador escolhe ${nome}, o primeiro da fila de aptos, e lhe entrega a CPU.`);
    }

    if (processos.every(p => st[p.nome].estado === 'DESTRUICAO')) break;

    // 5. registra a unidade t e executa
    processos.forEach(p => linhaTempo[p.nome].push(st[p.nome].estado === 'DESTRUICAO' ? null : st[p.nome].estado));
    if (cpu) {
      const s = st[cpu];
      s.restante--;
      s.quantumUsado++;
      s.cpuExecutada++;
      const p = proc(cpu);
      if (p.chamadaSistema !== null && s.cpuExecutada >= p.chamadaSistema && s.restante > 0) {
        emitir(t + 1, cpu, 'EXECUTANDO', 'RETORNO_IMEDIATO',
          `${cpu} fez uma chamada de sistema simples (ex.: consultar a hora). O SO atende na hora e devolve a CPU: retorno imediato, ${cpu} continua Executando.`);
        p.chamadaSistema = null;
      }
    }
    processos.filter(p => st[p.nome].estado === 'BLOQUEADO').forEach(p => {
      st[p.nome].restante = Math.max(0, st[p.nome].restante - 1);
      st[p.nome].bloqueadoHa++;
    });
  }

  return { processos, quantum, eventos, fotos, inicial, linhaTempo, duracao: t };
}
