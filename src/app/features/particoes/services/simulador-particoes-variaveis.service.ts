import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import {
  ALGORITMOS_FIT,
  AlgoritmoFit,
  Lacuna,
  ProcessoMem,
  ResultadoProtecao,
  escolherLacuna,
  lacunasEntre,
  protecao,
} from '../models/particoes';

export const TAM_SO_VAR = 100;      // KB reservados ao SO (endereços 0 a 99)
export const TAM_TOTAL_VAR = 500;   // KB de memória física
export const AREA_USUARIO_VAR = TAM_TOTAL_VAR - TAM_SO_VAR;

export interface Alocado { processo: ProcessoMem; base: number; }

export type ResultadoTentativa = 'alocado' | 'fragmentacao' | 'insuficiente' | 'grande';

export interface Decisao {
  processo: ProcessoMem;
  algoritmo: AlgoritmoFit;
  lacunas: Lacuna[];
  escolhida: Lacuna | null;
  /** O que cada algoritmo escolheria para o mesmo pedido (comparação). */
  comparativo: { algoritmo: AlgoritmoFit; lacuna: Lacuna | null }[];
  resultado: ResultadoTentativa;
  livre: number;
  maiorLacuna: number;
}

export interface Evento { tipo: 'ok' | 'erro' | 'aviso' | 'info'; texto: string; }

@Injectable()
export class SimuladorParticoesVariaveisService {
  readonly algoritmo = signal<AlgoritmoFit>('FIRST');
  readonly alocados = signal<Alocado[]>([]);
  readonly fila = signal<ProcessoMem[]>([]);
  readonly disco = signal<ProcessoMem[]>([]);
  readonly decisao = signal<Decisao | null>(null);
  readonly eventos = signal<Evento[]>([]);
  readonly protecaoTeste = signal<{ nome: string; logico: number; r: ResultadoProtecao } | null>(null);
  /** Circular-fit: endereço logo após a última alocação (próxima busca começa daqui). */
  readonly ponteiro = signal<number>(TAM_SO_VAR);
  private contador = 0;

  readonly lacunas = computed(() =>
    lacunasEntre(this.alocados().map(a => ({ inicio: a.base, tamanho: a.processo.tamanho })), TAM_SO_VAR, TAM_TOTAL_VAR));
  readonly livre = computed(() => this.lacunas().reduce((t, l) => t + l.tamanho, 0));
  readonly maiorLacuna = computed(() => this.lacunas().reduce((m, l) => Math.max(m, l.tamanho), 0));
  /** Há fragmentação externa quando um processo espera mesmo havendo memória livre suficiente no total. */
  readonly bloqueadosPorFragmentacao = computed(() =>
    this.fila().filter(p => p.tamanho <= this.livre() && p.tamanho > this.maiorLacuna()));
  readonly todosProcessos = computed(() => [
    ...this.alocados().map(a => a.processo), ...this.fila(), ...this.disco()]);

  definirAlgoritmo(a: AlgoritmoFit): void {
    this.algoritmo.set(a);
    this.log('info', `Algoritmo de alocação: ${ALGORITMOS_FIT.find(x => x.valor === a)!.nome}.`);
  }

  criar(tamanho: number): string | null {
    if (!Number.isInteger(tamanho) || tamanho < 1) return 'Informe o tamanho do processo em KB (número inteiro).';
    if (tamanho > AREA_USUARIO_VAR) return `O processo não cabe nem na memória vazia (área de usuário de ${AREA_USUARIO_VAR} KB).`;
    const p: ProcessoMem = { nome: `P${++this.contador}`, tamanho, cor: gera_cor(this.todosProcessos()) };
    if (!this.tentarAlocar(p)) {
      this.fila.update(f => [...f, p]);
    }
    return null;
  }

  gerarAleatorio(): void {
    this.criar(Math.floor(Math.random() * 12 + 2) * 10); // 20 a 130 KB
  }

  /** Tenta alocar e registra a decisão (lacunas, escolhida e comparação entre algoritmos). */
  private tentarAlocar(p: ProcessoMem, origem = 'criado'): boolean {
    const lacunas = this.lacunas();
    const alg = this.algoritmo();
    const escolhida = escolherLacuna(lacunas, p.tamanho, alg, this.ponteiro());
    const comparativo = ALGORITMOS_FIT.map(a => ({ algoritmo: a.valor, lacuna: escolherLacuna(lacunas, p.tamanho, a.valor, this.ponteiro()) }));
    const livre = this.livre();
    const maior = this.maiorLacuna();
    let resultado: ResultadoTentativa = 'alocado';
    if (!escolhida) resultado = p.tamanho <= livre ? 'fragmentacao' : 'insuficiente';
    this.decisao.set({ processo: p, algoritmo: alg, lacunas, escolhida, comparativo, resultado, livre, maiorLacuna: maior });

    if (escolhida) {
      this.alocados.update(l => [...l, { processo: p, base: escolhida.inicio }]);
      this.ponteiro.set(escolhida.inicio + p.tamanho);
      const sobra = escolhida.tamanho - p.tamanho;
      this.log('ok', `${p.nome} (${p.tamanho} KB) ${origem} → lacuna em ${escolhida.inicio} KB (${escolhida.tamanho} KB); ${sobra > 0 ? `sobra ${sobra} KB vira nova lacuna.` : 'ocupou a lacuna inteira.'}`);
      return true;
    }
    if (resultado === 'fragmentacao') {
      this.log('erro', `FRAGMENTAÇÃO EXTERNA: ${p.nome} precisa de ${p.tamanho} KB, há ${livre} KB livres, mas a maior lacuna tem ${maior} KB. ${p.nome} aguarda na fila.`);
    } else {
      this.log('aviso', `Memória insuficiente: ${p.nome} precisa de ${p.tamanho} KB e há ${livre} KB livres. ${p.nome} aguarda na fila.`);
    }
    return false;
  }

  /** Processos da fila são tentados em ordem de chegada sempre que memória é liberada. */
  private tentarFila(): void {
    const restantes: ProcessoMem[] = [];
    for (const p of this.fila()) {
      const lac = escolherLacuna(this.lacunas(), p.tamanho, this.algoritmo(), this.ponteiro());
      if (lac) this.tentarAlocar(p, 'saiu da fila');
      else restantes.push(p);
    }
    this.fila.set(restantes);
  }

  encerrar(nome: string): void {
    const a = this.alocados().find(x => x.processo.nome === nome);
    if (a) {
      this.alocados.update(l => l.filter(x => x !== a));
      this.log('info', `${nome} terminou: ${a.processo.tamanho} KB liberados em ${a.base} KB (lacunas vizinhas são unificadas).`);
      this.limparProtecao(nome);
      this.tentarFila();
      return;
    }
    this.fila.update(f => f.filter(p => p.nome !== nome));
    this.disco.update(d => d.filter(p => p.nome !== nome));
  }

  swapOut(nome: string): void {
    const a = this.alocados().find(x => x.processo.nome === nome);
    if (!a) return;
    this.alocados.update(l => l.filter(x => x !== a));
    this.disco.update(d => [...d, a.processo]);
    this.log('info', `Swap-out: ${nome} foi copiado para o disco e liberou ${a.processo.tamanho} KB.`);
    this.limparProtecao(nome);
    this.tentarFila();
  }

  swapIn(nome: string): void {
    const p = this.disco().find(x => x.nome === nome);
    if (!p) return;
    if (this.tentarAlocar(p, 'voltou do disco (swap-in)')) {
      this.disco.update(d => d.filter(x => x !== p));
    }
  }

  /** Compactação: desloca os processos para o início da área de usuário, unindo as lacunas. */
  compactar(): void {
    if (this.lacunas().length <= 1 && (this.lacunas()[0]?.inicio ?? TAM_TOTAL_VAR) + (this.lacunas()[0]?.tamanho ?? 0) >= TAM_TOTAL_VAR) {
      this.log('info', 'Compactação desnecessária: a memória livre já está numa única lacuna no fim.');
      return;
    }
    let cursor = TAM_SO_VAR;
    let movidos = 0;
    const novos = [...this.alocados()].sort((a, b) => a.base - b.base).map(a => {
      if (a.base !== cursor) movidos += a.processo.tamanho;
      const n = { processo: a.processo, base: cursor };
      cursor += a.processo.tamanho;
      return n;
    });
    const antes = this.lacunas().length;
    this.alocados.set(novos);
    this.ponteiro.set(cursor);
    this.protecaoTeste.set(null);
    this.log('aviso', `Compactação: ${antes} lacunas viraram 1 de ${this.livre()} KB. Foram copiados ${movidos} KB e as bases (relocação dinâmica) mudaram — por isso é um recurso caro.`);
    this.tentarFila();
  }

  testarProtecao(nome: string, logico: number): void {
    const a = this.alocados().find(x => x.processo.nome === nome);
    if (!a) return;
    this.protecaoTeste.set({ nome, logico, r: protecao(a.base, a.processo.tamanho, logico) });
  }

  reiniciar(): void {
    this.alocados.set([]);
    this.fila.set([]);
    this.disco.set([]);
    this.decisao.set(null);
    this.eventos.set([]);
    this.protecaoTeste.set(null);
    this.ponteiro.set(TAM_SO_VAR);
    this.contador = 0;
  }

  private limparProtecao(nome: string): void {
    if (this.protecaoTeste()?.nome === nome) this.protecaoTeste.set(null);
  }

  private log(tipo: Evento['tipo'], texto: string): void {
    this.eventos.update(e => [{ tipo, texto }, ...e].slice(0, 40));
  }
}
