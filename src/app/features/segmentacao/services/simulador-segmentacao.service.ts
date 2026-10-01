import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import {
  MAX_TAMANHO_SEGMENTO,
  ProcessoSegmentado,
  ResultadoAlocacao,
  ResultadoTraducao,
  TipoSegmento,
  alocar,
  compactar,
  lacunasDe,
  ocupacao,
  traduzir,
} from '../models/segmentacao';

export const NOMES_SEGMENTACAO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface TraducaoSimulador {
  processo: string;
  segmento: number;
  deslocamento: number;
  resultado: ResultadoTraducao;
}

/** Estado do simulador de segmentação (uma instância por visita à tela). */
@Injectable()
export class SimuladorSegmentacaoService {

  readonly processos = signal<ProcessoSegmentado[]>([]);
  readonly selecionado = signal<string | null>(null);
  /** Última tentativa de criação: mostra, passo a passo, como o best-fit alocou (ou por que falhou). */
  readonly ultimaAlocacao = signal<{ nome: string; resultado: ResultadoAlocacao } | null>(null);
  readonly traducao = signal<TraducaoSimulador | null>(null);

  readonly memoria = computed(() => ocupacao(this.processos()));
  readonly lacunas = computed(() => lacunasDe(this.processos()));
  readonly livre = computed(() => this.lacunas().reduce((t, l) => t + l.tamanho, 0));
  readonly maiorLacuna = computed(() => this.lacunas().reduce((m, l) => Math.max(m, l.tamanho), 0));
  readonly processoSelecionado = computed(() => this.processos().find(p => p.nome === this.selecionado()) ?? null);
  readonly nomesDisponiveis = computed(() => NOMES_SEGMENTACAO.filter(n => !this.processos().some(p => p.nome === n)));

  criarProcesso(nome: string, tamanhos: Record<TipoSegmento, number>): string | null {
    nome = (nome ?? '').trim().toUpperCase();
    if (!/^[A-Z]$/.test(nome)) return 'Informe uma letra (A a Z) para o nome do processo.';
    if (this.processos().some(p => p.nome === nome)) return `O processo ${nome} já existe.`;
    for (const t of ['C', 'D', 'P'] as TipoSegmento[]) {
      const v = tamanhos[t];
      if (!Number.isInteger(v) || v < 1 || v > MAX_TAMANHO_SEGMENTO) {
        return `Os segmentos devem ter de 1 a ${MAX_TAMANHO_SEGMENTO} bytes (deslocamento de 4 bits).`;
      }
    }

    const resultado = alocar(this.processos(), nome, gera_cor(this.processos()), tamanhos);
    this.ultimaAlocacao.set({ nome, resultado });
    if (!resultado.ok) {
      return resultado.motivo === 'fragmentacao'
        ? `Fragmentação externa: há ${resultado.livreTotal} bytes livres (o processo precisa de ${resultado.necessario}), mas nenhuma lacuna comporta um dos segmentos. Experimente compactar a memória.`
        : `Memória insuficiente: o processo precisa de ${resultado.necessario} bytes e há ${resultado.livreTotal} livres.`;
    }
    this.processos.update(lista => [...lista, resultado.processo!]);
    this.selecionado.set(nome);
    this.traducao.set(null);
    return null;
  }

  removerProcesso(nome: string): void {
    this.processos.update(lista => lista.filter(p => p.nome !== nome));
    if (this.selecionado() === nome) this.selecionado.set(this.processos()[0]?.nome ?? null);
    if (this.traducao()?.processo === nome) this.traducao.set(null);
    if (this.ultimaAlocacao()?.nome === nome) this.ultimaAlocacao.set(null);
  }

  gerarAleatorio(): string | null {
    const nome = this.nomesDisponiveis()[Math.floor(Math.random() * this.nomesDisponiveis().length)];
    const r = () => Math.floor(Math.random() * 4) + 1;
    return this.criarProcesso(nome, { C: r(), D: r(), P: r() });
  }

  /** Compactação: junta as lacunas no fim da memória, atualizando as bases dos segmentos. */
  compactar(): string {
    const lacunas = this.lacunas();
    const antes = lacunas.length;
    if (antes === 0) return 'A memória está cheia: não há lacunas para juntar.';
    if (antes === 1 && lacunas[0].inicio + lacunas[0].tamanho === 32) {
      return 'A memória já está compactada: toda a área livre está numa única lacuna no fim.';
    }
    this.processos.update(lista => compactar(lista));
    this.traducao.set(null);
    this.ultimaAlocacao.set(null);
    return `Memória compactada: ${antes} lacunas viraram 1 lacuna de ${this.livre()} bytes. As bases foram atualizadas nas tabelas de segmentos.`;
  }

  selecionar(nome: string): void {
    this.selecionado.set(nome);
    this.traducao.set(null);
  }

  traduzir(nome: string, segmento: number, deslocamento: number): void {
    const p = this.processos().find(x => x.nome === nome);
    if (!p) return;
    this.traducao.set({ processo: nome, segmento, deslocamento, resultado: traduzir(p, segmento, deslocamento) });
  }

  reiniciar(): void {
    this.processos.set([]);
    this.selecionado.set(null);
    this.ultimaAlocacao.set(null);
    this.traducao.set(null);
  }
}
