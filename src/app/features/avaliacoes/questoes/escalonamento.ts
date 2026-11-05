import {
  AlgoritmoExercicio,
  GabaritoEscalonamento,
  gerarGabaritoEscalonamento,
  gerarProcessosEscalonamento,
  usaPrioridade,
} from '../../escalonamento/models/exercicio-escalonamento';
import { Processo } from '../../escalonamento/models/processo';
import { Montador } from './montador';
import { Campo, Celula, GradeAssunto, QuestaoGerada, Tabela, TipoQuestao } from './tipos';

const ALGORITMOS: AlgoritmoExercicio[] = ['FIFO', 'SJF', 'PRIO', 'PRIO_P', 'RR'];

const NOMES: Record<AlgoritmoExercicio, string> = {
  FIFO: 'FIFO (FCFS)',
  SJF: 'SJF (não preemptivo)',
  PRIO: 'Prioridade não preemptiva',
  PRIO_P: 'Prioridade preemptiva',
  RR: 'Round Robin',
};

/** Regras de desempate do material (seção 4 do guia). */
const REGRAS: Record<AlgoritmoExercicio, string> = {
  FIFO: 'Chegadas no mesmo instante: ordem da tabela.',
  SJF: 'Empate no tempo de execução: ordem de chegada.',
  PRIO: 'Menor número = maior prioridade. Empate: ordem de chegada.',
  PRIO_P: 'Menor número = maior prioridade. Empate: ordem de chegada.',
  RR: 'Quando um processo chega no mesmo instante em que outro volta por fim de quantum, o que chega entra antes na fila.',
};

const TURNAROUND = 'Turnaround (tempo total)';
const FORMULAS = 'Turnaround (tempo total) = término − chegada; espera = turnaround − execução.';

/** Formas de perguntar o mesmo escalonamento. */
export type FormaEscalonamento = 'diag' | 'diagtab' | 'tabdiag' | 'tab';

const FORMAS: { id: FormaEscalonamento; nome: string }[] = [
  { id: 'diag', nome: 'Diagrama de uso da CPU' },
  { id: 'diagtab', nome: 'Diagrama e tabela' },
  { id: 'tabdiag', nome: 'Tabela com o diagrama pronto' },
  { id: 'tab', nome: 'Tabela sem diagrama' },
];

/** Instantes por faixa do diagrama: faixas curtas cabem ao lado dos dados mesmo com zoom. */
const INSTANTES_POR_TABELA = 10;

function tabelaProcessos(processos: Processo[], alg: AlgoritmoExercicio): Tabela {
  const prio = usaPrioridade(alg);
  return {
    titulo: 'Processos',
    cabecalho: ['Processo', 'Chegada', 'Execução', ...(prio ? ['Prioridade'] : [])],
    linhas: processos.map(p => [p.nome, String(p.chegada), String(p.execucao), ...(prio ? [String(p.prioridade)] : [])]),
  };
}

/**
 * Diagrama numa tabela só, em faixas de até 10 instantes (linha "Instante" e linha "CPU"),
 * para caber ao lado dos dados com zoom. Cada célula é texto (diagrama pronto) ou campo.
 */
function tabelaDiagrama(g: GabaritoEscalonamento, celula: (i: number) => Celula, titulo: string): Tabela {
  const faixas: Celula[][] = [];
  for (let ini = 0; ini < g.diagrama.length; ini += INSTANTES_POR_TABELA) {
    const trecho = g.diagrama.slice(ini, ini + INSTANTES_POR_TABELA);
    faixas.push(['Instante', ...trecho.map(c => String(c.tempo))]);
    faixas.push(['CPU', ...trecho.map((_, k) => celula(ini + k))]);
  }
  const [cabecalho, ...linhas] = faixas;
  return { titulo, cabecalho: cabecalho as string[], linhas };
}

function tabelaResultado(g: GabaritoEscalonamento, m: Montador): Tabela {
  return {
    titulo: 'Resultado',
    cabecalho: ['Processo', 'Tempo de espera', TURNAROUND],
    linhas: g.tabela.map(l => [
      l.nome,
      m.campo({ id: `esp-${l.nome}`, tipo: 'numero', rotulo: `Espera de ${l.nome}` }, l.espera),
      m.campo({ id: `tat-${l.nome}`, tipo: 'numero', rotulo: `${TURNAROUND} de ${l.nome}` }, l.turnaround),
    ]),
  };
}

function gerarForma(alg: AlgoritmoExercicio, forma: FormaEscalonamento, rnd: () => number): QuestaoGerada {
  const { processos, quantum } = gerarProcessosEscalonamento(rnd);
  const g = gerarGabaritoEscalonamento(processos, alg, quantum);
  const m = new Montador();
  const algoritmo = `Escalone os processos com ${NOMES[alg]}${alg === 'RR' ? `, quantum = ${quantum}` : ''}.`;
  const comoPreencher = 'No diagrama, escreva em cada instante o processo que está na CPU, ou - se ela estiver ociosa.';

  const campoCpu = (i: number): Celula => {
    const c = g.diagrama[i];
    return m.campo({ id: `cpu-${i}`, tipo: 'texto', rotulo: `CPU no instante ${c.tempo}`, mini: true },
      c.nome === '-' ? null : c.nome);
  };
  const textoCpu = (i: number): Celula => g.diagrama[i].nome;

  const dados: Tabela[] = [tabelaProcessos(processos, alg)];
  const respostas: Tabela[] = [];
  let pedido: string;
  switch (forma) {
    case 'diag':
      respostas.push(tabelaDiagrama(g, campoCpu, 'Diagrama de uso da CPU'));
      pedido = `Preencha o diagrama de uso da CPU. ${comoPreencher}`;
      break;
    case 'diagtab':
      respostas.push(tabelaDiagrama(g, campoCpu, 'Diagrama de uso da CPU'));
      respostas.push(tabelaResultado(g, m));
      pedido = `Preencha o diagrama de uso da CPU e calcule o tempo de espera e o turnaround (tempo total) de cada processo. ` +
        `${comoPreencher} ${FORMULAS}`;
      break;
    case 'tabdiag':
      dados.push(tabelaDiagrama(g, textoCpu, 'Diagrama de uso da CPU (- = ociosa)'));
      respostas.push(tabelaResultado(g, m));
      pedido = `Com base no diagrama de uso da CPU, calcule o tempo de espera e o turnaround (tempo total) de cada processo. ${FORMULAS}`;
      break;
    case 'tab':
      respostas.push(tabelaResultado(g, m));
      pedido = `Calcule o tempo de espera e o turnaround (tempo total) de cada processo. ${FORMULAS}`;
      break;
  }

  return {
    publica: {
      tipo: `esc-${alg}-${forma}`,
      titulo: `Escalonamento — ${NOMES[alg]}`,
      enunciado: `${algoritmo} ${pedido} ${REGRAS[alg]}`,
      dados,
      respostas,
      campos: m.campos,
    },
    gabarito: m.gabarito,
  };
}

/**
 * Tipo antigo (esc-FIFO, esc-SJF…): tabela de espera e turnaround com as médias.
 * Fica oculto na criação, mas precisa continuar gerando exatamente a mesma questão
 * para as provas já salvas (correção, revisão e correção do aluno).
 */
function gerarAntigo(alg: AlgoritmoExercicio, rnd: () => number): QuestaoGerada {
  const { processos, quantum } = gerarProcessosEscalonamento(rnd);
  const g = gerarGabaritoEscalonamento(processos, alg, quantum);

  const campos: Campo[] = [];
  const gabarito: Record<string, string> = {};
  const campo = (id: string, rotulo: string, valor: number): Celula => {
    campos.push({ id, tipo: 'numero', rotulo });
    gabarito[id] = String(valor);
    return { campo: id };
  };

  const linhas = g.tabela.map(l => [
    l.nome,
    campo(`esp-${l.nome}`, `Espera de ${l.nome}`, l.espera),
    campo(`tat-${l.nome}`, `${TURNAROUND} de ${l.nome}`, l.turnaround),
  ]);
  linhas.push(['Média', campo('media-esp', 'Média de espera', g.mediaEspera), campo('media-tat', `Média de turnaround (tempo total)`, g.mediaTurnaround)]);

  return {
    publica: {
      tipo: `esc-${alg}`,
      titulo: `Escalonamento — ${NOMES[alg]}`,
      enunciado:
        `Escalone os processos com ${NOMES[alg]}${alg === 'RR' ? `, quantum = ${quantum}` : ''} ` +
        `e calcule o tempo de espera e o turnaround (tempo total) de cada processo, e as médias (até 2 casas decimais). ` +
        `${FORMULAS} ${REGRAS[alg]}`,
      dados: [tabelaProcessos(processos, alg)],
      respostas: [{ titulo: 'Resultado', cabecalho: ['Processo', 'Tempo de espera', TURNAROUND], linhas }],
      campos,
    },
    gabarito,
  };
}

/** Na criação da prova, o escalonamento é escolhido em duas listas: algoritmos × o que pedir. */
export const GRADE_ESCALONAMENTO: GradeAssunto = {
  assunto: 'Escalonamento',
  linhasTitulo: 'Algoritmos',
  colunasTitulo: 'O que pedir',
  linhas: ALGORITMOS.map(a => ({ id: a, nome: NOMES[a] })),
  colunas: FORMAS.map(f => ({ id: f.id, nome: f.nome })),
  tipo: (alg, forma) => `esc-${alg}-${forma}`,
};

export const QUESTOES_ESCALONAMENTO: TipoQuestao[] = [
  ...ALGORITMOS.flatMap(alg => FORMAS.map(f => ({
    id: `esc-${alg}-${f.id}`,
    assunto: 'Escalonamento',
    nome: `${NOMES[alg]}: ${f.nome.toLowerCase()}`,
    chaves: [`alg:${alg}`, `forma:${f.id}`],
    gerar: (rnd: () => number) => gerarForma(alg, f.id, rnd),
  }))),
  ...ALGORITMOS.map(alg => ({
    id: `esc-${alg}`,
    assunto: 'Escalonamento',
    nome: `${NOMES[alg]}: espera e turnaround, com médias (antigo)`,
    oculto: true,
    gerar: (rnd: () => number) => gerarAntigo(alg, rnd),
  })),
];
