import { Injectable } from '@angular/core';
import { Processo } from '../models/processo';
import { EscalonamentoService } from './escalonamento.service';
import {
  AlgoritmoExercicio,
  GabaritoEscalonamento,
  corrigirNumero,
  gerarGabaritoEscalonamento,
  normalizarCelulaDiagrama,
  usaPrioridade,
} from '../models/exercicio-escalonamento';

export { ALGORITMOS_EXERCICIO } from '../models/exercicio-escalonamento';
export type { AlgoritmoExercicio, GabaritoEscalonamento, LinhaTabelaResultado } from '../models/exercicio-escalonamento';

/** Marca de correção de cada campo: null = ainda não corrigido. */
export type Correcao = boolean | null;

/** As regras ficam em models/exercicio-escalonamento.ts (sem Angular). */
@Injectable({ providedIn: 'root' })
export class EscalonamentoExercicioService {

  constructor(private escalonamento: EscalonamentoService) {}

  usaPrioridade(algoritmo: AlgoritmoExercicio | null): boolean {
    return usaPrioridade(algoritmo);
  }

  gerarGabarito(processos: Processo[], algoritmo: AlgoritmoExercicio, quantum: number): GabaritoEscalonamento {
    return gerarGabaritoEscalonamento(processos, algoritmo, quantum, this.escalonamento);
  }

  normalizarCelulaDiagrama(valor: string | null | undefined): string {
    return normalizarCelulaDiagrama(valor);
  }

  corrigirNumero(resposta: string | number | null | undefined, esperado: number): boolean {
    return corrigirNumero(resposta, esperado);
  }
}
