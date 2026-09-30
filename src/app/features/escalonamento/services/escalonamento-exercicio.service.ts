import { Injectable } from '@angular/core';
import { Processo } from '../models/processo';
import { EscalonamentoService, ResultadoCpu } from './escalonamento.service';

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

/** Marca de correção de cada campo: null = ainda não corrigido. */
export type Correcao = boolean | null;

@Injectable({ providedIn: 'root' })
export class EscalonamentoExercicioService {

  constructor(private escalonamento: EscalonamentoService) {}

  usaPrioridade(algoritmo: AlgoritmoExercicio | null): boolean {
    return algoritmo === 'PRIO' || algoritmo === 'PRIO_P';
  }

  /**
   * Calcula o gabarito usando os mesmos algoritmos do simulador,
   * garantindo que exercício e simulação sempre concordem.
   */
  gerarGabarito(processos: Processo[], algoritmo: AlgoritmoExercicio, quantum: number): GabaritoEscalonamento {
    const copias = processos.map(p => p.clone());
    copias.forEach(p => { p.tempoEspera = 0; p.tempoExecucao = 0; });

    let diagrama: ResultadoCpu[];
    switch (algoritmo) {
      case 'FIFO': diagrama = this.escalonamento.simulaFifo(copias); break;
      case 'SJF': diagrama = this.escalonamento.simulaSJF(copias); break;
      case 'PRIO': diagrama = this.escalonamento.simulaPrio(copias); break;
      case 'PRIO_P': diagrama = this.escalonamento.simulaPrioPremp(copias); break;
      case 'RR': diagrama = this.escalonamento.simulaRR(copias, quantum); break;
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
  normalizarCelulaDiagrama(valor: string | null | undefined): string {
    return (valor ?? '').trim().toUpperCase();
  }

  corrigirNumero(resposta: string | number | null | undefined, esperado: number): boolean {
    if (resposta === null || resposta === undefined || `${resposta}`.trim() === '') {
      return false;
    }
    return Number(`${resposta}`.replace(',', '.')) === esperado;
  }
}
