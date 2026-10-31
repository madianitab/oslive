import { Aleatorio } from '../../../core/aleatorio';
import { Processo } from './processo';
import { Escalonador, ResultadoCpu } from './escalonador';

/**
 * Exercício de escalonamento sem Angular: geração dos processos e gabarito.
 * Usado pela tela de exercícios e pela correção das avaliações no servidor.
 */

export type AlgoritmoExercicio = 'FIFO' | 'SJF' | 'PRIO' | 'PRIO_P' | 'RR';

export const ALGORITMOS_EXERCICIO: { valor: AlgoritmoExercicio; nome: string }[] = [
  { valor: 'FIFO', nome: 'FIFO (First In, First Out)' },
  { valor: 'SJF', nome: 'SJF (Shortest Job First)' },
  { valor: 'PRIO', nome: 'Prioridade (Não Preemptiva)' },
  { valor: 'PRIO_P', nome: 'Prioridade (Preemptiva)' },
  { valor: 'RR', nome: 'RR (Round Robin)' },
];

export interface LinhaTabelaResultado {
  nome: string;
  cor: string;
  espera: number;
  turnaround: number;
}

export interface GabaritoEscalonamento {
  diagrama: ResultadoCpu[];
  tabela: LinhaTabelaResultado[];
  mediaEspera: number;
  mediaTurnaround: number;
}

export const NOMES_PROCESSOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function usaPrioridade(algoritmo: AlgoritmoExercicio | null): boolean {
  return algoritmo === 'PRIO' || algoritmo === 'PRIO_P';
}

/**
 * Quatro processos com chegada de 0 a 8 (podem coincidir; a CPU pode começar ociosa),
 * execução de 1 a 7, prioridade de 0 a 3 e quantum de 1 a 3. Cores ficam por conta da tela.
 */
export function gerarProcessosEscalonamento(rnd: Aleatorio = Math.random): { processos: Processo[]; quantum: number } {
  const processos: Processo[] = [];
  for (let i = 0; i < 4; i++) {
    const chegada = Math.floor(rnd() * 9);
    const execucao = Math.floor(rnd() * 7) + 1;
    const prioridade = Math.floor(rnd() * 4);
    processos.push(new Processo(NOMES_PROCESSOS[i], chegada, execucao, prioridade, ''));
  }
  const quantum = Math.floor(rnd() * 3) + 1;
  return { processos: processos.sort((a, b) => a.chegada - b.chegada), quantum };
}

/**
 * Calcula o gabarito com os mesmos algoritmos do simulador,
 * garantindo que exercício e simulação sempre concordem.
 */
export function gerarGabaritoEscalonamento(
  processos: Processo[], algoritmo: AlgoritmoExercicio, quantum: number, escalonador = new Escalonador(),
): GabaritoEscalonamento {
  const copias = processos.map(p => p.clone());
  copias.forEach(p => { p.tempoEspera = 0; p.tempoExecucao = 0; });

  let diagrama: ResultadoCpu[];
  switch (algoritmo) {
    case 'FIFO': diagrama = escalonador.simulaFifo(copias); break;
    case 'SJF': diagrama = escalonador.simulaSJF(copias); break;
    case 'PRIO': diagrama = escalonador.simulaPrio(copias); break;
    case 'PRIO_P': diagrama = escalonador.simulaPrioPremp(copias); break;
    case 'RR': diagrama = escalonador.simulaRR(copias, quantum); break;
  }

  const tabela: LinhaTabelaResultado[] = [...copias]
    .sort((a, b) => a.chegada - b.chegada)
    .map(p => ({
      nome: p.nome,
      cor: p.cor,
      espera: p.tempoEspera,
      turnaround: p.tempoEspera + (p.execucao ?? 0),
    }));

  const media = (valores: number[]) =>
    valores.length ? parseFloat((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)) : 0;

  return {
    diagrama,
    tabela,
    mediaEspera: media(tabela.map(l => l.espera)),
    mediaTurnaround: media(tabela.map(l => l.turnaround)),
  };
}

/** Normaliza a resposta do diagrama: sem espaços e em maiúscula. */
export function normalizarCelulaDiagrama(valor: string | null | undefined): string {
  return (valor ?? '').trim().toUpperCase();
}

/** Aceita vírgula ou ponto decimal; campo vazio é erro. */
export function corrigirNumero(resposta: string | number | null | undefined, esperado: number): boolean {
  if (resposta === null || resposta === undefined || `${resposta}`.trim() === '') return false;
  return Number(`${resposta}`.replace(',', '.')) === esperado;
}
