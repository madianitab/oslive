import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import { TAM, TIMESTAMP_INICIAL } from 'src/app/core/constantes';

export type AlgoritmoSubstituicao = 'FIFO' | 'SEGUNDA_CHANCE';

export const ALGORITMOS_SUBSTITUICAO: { valor: AlgoritmoSubstituicao; nome: string }[] = [
  { valor: 'FIFO', nome: 'FCFS (first-come, first-served)' },
  { valor: 'SEGUNDA_CHANCE', nome: 'Segunda Chance' },
];

export const NOMES_PROCESSOS_DEMANDA = ['A', 'B', 'C', 'D'];
export const MAX_PAGINAS_POR_PROCESSO = 4;
/** Quantidade de páginas carregadas automaticamente quando o processo é criado. */
export const PAGINAS_CARREGADAS_NA_CRIACAO = 2;

export interface PaginaDemanda {
  processo: string;
  indice: number;
  cor: string;
  quadro: number | null;
}

export interface ProcessoDemanda {
  nome: string;
  cor: string;
  paginas: PaginaDemanda[];
}

export interface EntradaFila {
  pagina: PaginaDemanda;
  timestamp: number;
  bitRef: 0 | 1;
}

export interface EventoSimulacao {
  tipo: 'carga' | 'substituicao' | 'segunda-chance' | 'remocao' | 'acesso' | 'info';
  mensagem: string;
}

export function nomePagina(p: PaginaDemanda): string {
  return `${p.processo}${p.indice}`;
}

/**
 * Estado da simulação de paginação por demanda. Fornecido no componente
 * principal do módulo, para que cada visita à tela comece do zero.
 */
@Injectable()
export class SimuladorPaginacaoDemandaService {

  readonly algoritmo = signal<AlgoritmoSubstituicao>('FIFO');
  readonly processos = signal<ProcessoDemanda[]>([]);
  readonly quadros = signal<(PaginaDemanda | null)[]>(Array(TAM).fill(null));
  readonly fila = signal<EntradaFila[]>([]);
  readonly eventos = signal<EventoSimulacao[]>([]);
  readonly totalCargas = signal(0);
  readonly totalSubstituicoes = signal(0);

  private relogio = TIMESTAMP_INICIAL;

  readonly nomesDisponiveis = computed(() =>
    NOMES_PROCESSOS_DEMANDA.filter(n => !this.processos().some(p => p.nome === n)));

  readonly quadrosLivres = computed(() => this.quadros().filter(q => q === null).length);

  definirAlgoritmo(algoritmo: AlgoritmoSubstituicao): void {
    this.algoritmo.set(algoritmo);
    const nome = ALGORITMOS_SUBSTITUICAO.find(a => a.valor === algoritmo)?.nome;
    this.registrar('info', `Algoritmo de substituição: ${nome}.`);
  }

  criarProcesso(nome: string, quantidadePaginas: number): string | null {
    if (!nome) return 'Selecione o nome do processo.';
    if (this.processos().some(p => p.nome === nome)) return 'Processo já existe!';
    if (!quantidadePaginas || quantidadePaginas < 1 || quantidadePaginas > MAX_PAGINAS_POR_PROCESSO) {
      return `A quantidade de páginas deve ser de 1 a ${MAX_PAGINAS_POR_PROCESSO}.`;
    }

    const cor = gera_cor(this.processos());
    const processo: ProcessoDemanda = { nome, cor, paginas: [] };
    for (let i = 0; i < quantidadePaginas; i++) {
      processo.paginas.push({ processo: nome, indice: i, cor, quadro: null });
    }
    this.processos.update(lista => [...lista, processo].sort((a, b) => a.nome.localeCompare(b.nome)));
    this.registrar('info', `Processo ${nome} criado com ${quantidadePaginas} página(s).`);

    processo.paginas.slice(0, PAGINAS_CARREGADAS_NA_CRIACAO).forEach(p => this.carregarPagina(p, true));
    return null;
  }

  removerProcesso(nome: string): void {
    const processo = this.processos().find(p => p.nome === nome);
    if (!processo) return;
    processo.paginas.filter(p => p.quadro !== null).forEach(p => this.liberar(p));
    this.processos.update(lista => lista.filter(p => p.nome !== nome));
    this.registrar('remocao', `Processo ${nome} finalizado: seus quadros foram liberados.`);
  }

  gerarAleatorio(): void {
    this.reiniciar(false);
    NOMES_PROCESSOS_DEMANDA.forEach(nome => this.criarProcesso(nome, Math.floor(Math.random() * 3) + 2));
  }

  /**
   * O processo acessa uma página da memória lógica:
   * - bit I → falta de página (a página é trazida do disco);
   * - bit V → acesso direto, sem falta de página (liga o bit de referência).
   * Uma página só sai da memória como vítima de uma substituição ou quando o processo é finalizado.
   */
  acessarPaginaLogica(pagina: PaginaDemanda): void {
    if (pagina.quadro === null) {
      this.carregarPagina(pagina);
      return;
    }
    this.fila.update(f => f.map(e => e.pagina === pagina ? { ...e, bitRef: 1 } : e));
    this.registrar('acesso', `Acesso a ${nomePagina(pagina)}: bit V, sem falta de página` +
      (this.algoritmo() === 'SEGUNDA_CHANCE' ? ' (bit de referência = 1).' : '.'));
  }

  /** Acesso a uma página já carregada: liga o bit de referência (usado pela Segunda Chance). */
  acessarPagina(entrada: EntradaFila): void {
    this.fila.update(f => f.map(e => e === entrada ? { ...e, bitRef: 1 } : e));
    this.registrar('acesso', `Página ${nomePagina(entrada.pagina)} acessada: bit de referência = 1.`);
  }

  carregarPagina(pagina: PaginaDemanda, naCriacao = false): void {
    if (pagina.quadro !== null) return;

    let quadro = this.quadros().findIndex(q => q === null);
    if (quadro === -1) {
      quadro = this.escolherVitima(pagina);
    }

    const timestamp = this.relogio++;
    pagina.quadro = quadro;
    this.quadros.update(q => q.map((atual, i) => i === quadro ? pagina : atual));
    this.fila.update(f => [...f, { pagina, timestamp, bitRef: 0 }]);
    this.totalCargas.update(n => n + 1);
    this.atualizarProcessos();
    this.registrar('carga', naCriacao
      ? `${nomePagina(pagina)} carregada no quadro ${quadro} na criação do processo (timestamp ${timestamp}).`
      : `Falta de página em ${nomePagina(pagina)} → page-in do disco para o quadro ${quadro} → tabela: bit V (timestamp ${timestamp}).`);
  }

  reiniciar(registrar = true): void {
    this.processos.set([]);
    this.quadros.set(Array(TAM).fill(null));
    this.fila.set([]);
    this.eventos.set([]);
    this.totalCargas.set(0);
    this.totalSubstituicoes.set(0);
    this.relogio = TIMESTAMP_INICIAL;
    if (registrar) this.registrar('info', 'Simulação reiniciada.');
  }

  /** Retira a vítima da memória conforme o algoritmo e devolve o quadro liberado. */
  private escolherVitima(nova: PaginaDemanda): number {
    let fila = [...this.fila()];

    if (this.algoritmo() === 'SEGUNDA_CHANCE') {
      while (fila[0].bitRef === 1) {
        const primeira = fila.shift()!;
        const novoTimestamp = this.relogio++;
        fila.push({ ...primeira, bitRef: 0, timestamp: novoTimestamp });
        this.registrar('segunda-chance',
          `Página ${nomePagina(primeira.pagina)} tinha bit 1: recebeu segunda chance (bit 0, timestamp ${novoTimestamp}).`);
      }
    }

    const vitima = fila.shift()!;
    this.totalSubstituicoes.update(n => n + 1);
    this.fila.set(fila);
    const quadro = vitima.pagina.quadro!;
    vitima.pagina.quadro = null;
    this.quadros.update(q => q.map((atual, i) => i === quadro ? null : atual));
    this.registrar('substituicao',
      `Memória cheia: página ${nomePagina(vitima.pagina)} (timestamp ${vitima.timestamp}) substituída por ${nomePagina(nova)} no quadro ${quadro}.`);
    return quadro;
  }

  private liberar(pagina: PaginaDemanda): void {
    const quadro = pagina.quadro;
    pagina.quadro = null;
    this.quadros.update(q => q.map((atual, i) => i === quadro ? null : atual));
    this.fila.update(f => f.filter(e => e.pagina !== pagina));
    this.atualizarProcessos();
  }

  /** Força a atualização das telas que leem as páginas dos processos. */
  private atualizarProcessos(): void {
    this.processos.update(lista => lista.map(p => ({ ...p, paginas: [...p.paginas] })));
  }

  private registrar(tipo: EventoSimulacao['tipo'], mensagem: string): void {
    this.eventos.update(e => [{ tipo, mensagem }, ...e].slice(0, 30));
  }
}
