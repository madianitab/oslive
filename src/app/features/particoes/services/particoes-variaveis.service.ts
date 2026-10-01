import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import { Area, ESTRATEGIAS, Estrategia, aleatorio, escolher, lacunas } from '../models/particoes';

export const MEMORIA_TOTAL = 256;  // KB
export const AREA_SO = 32;         // KB reservados ao sistema operacional (início da memória)
export const NOMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => 'P' + l);

export interface ProcessoVar {
  nome: string;
  tamanho: number;
  cor: string;
  inicio: number;   // registrador base
}

export interface ProcessoForaDaMemoria {
  nome: string;
  tamanho: number;
  cor: string;
}

export type ResultadoTentativa = 'alocado' | 'fragmentacao' | 'insuficiente';

export interface Tentativa {
  nome: string;
  tamanho: number;
  estrategia: Estrategia;
  lacunas: Area[];
  /** O que cada estratégia escolheria para o mesmo pedido (comparação). */
  comparacao: { estrategia: Estrategia; inicio: number | null; sobra: number }[];
  resultado: ResultadoTentativa;
  livreTotal: number;
  maiorLacuna: number;
}

@Injectable()
export class ParticoesVariaveisService {

  readonly estrategia = signal<Estrategia>('FIRST');
  readonly processos = signal<ProcessoVar[]>([]);
  readonly fila = signal<ProcessoForaDaMemoria[]>([]);     // aguardando memória
  readonly disco = signal<ProcessoForaDaMemoria[]>([]);    // swap-out
  /** Circular-fit: posição logo após a última alocação. */
  readonly ponteiro = signal<number>(AREA_SO);
  readonly ultima = signal<Tentativa | null>(null);
  readonly eventos = signal<{ rotulo: string }[]>([]);

  readonly lacunas = computed(() => lacunas(this.processos().map(p => ({ inicio: p.inicio, tamanho: p.tamanho })), AREA_SO, MEMORIA_TOTAL));
  readonly livre = computed(() => this.lacunas().reduce((t, l) => t + l.tamanho, 0));
  readonly maiorLacuna = computed(() => this.lacunas().reduce((m, l) => Math.max(m, l.tamanho), 0));
  /** Memória livre que está fora da maior lacuna: indicador do grau de fragmentação externa. */
  readonly livreFragmentado = computed(() => this.livre() - this.maiorLacuna());
  readonly nomesUsados = computed(() => [...this.processos(), ...this.fila(), ...this.disco()].map(p => p.nome));

  definirEstrategia(e: Estrategia): void {
    this.estrategia.set(e);
    this.registrar(`Estratégia de alocação: ${ESTRATEGIAS.find(x => x.valor === e)!.nome}.`);
  }

  proximoNome(): string {
    return NOMES.find(n => !this.nomesUsados().includes(n)) ?? 'P?';
  }

  criar(nome: string, tamanho: number): string | null {
    nome = (nome ?? '').trim().toUpperCase();
    if (!nome) return 'Informe o nome do processo.';
    if (this.nomesUsados().includes(nome)) return `O processo ${nome} já existe.`;
    if (!Number.isInteger(tamanho) || tamanho < 1) return 'Informe o tamanho do processo em KB (número inteiro maior que zero).';
    if (tamanho > MEMORIA_TOTAL - AREA_SO) {
      return `${nome} (${tamanho} KB) é maior que toda a memória do usuário (${MEMORIA_TOTAL - AREA_SO} KB): nunca poderá ser carregado.`;
    }
    const p = { nome, tamanho, cor: gera_cor([...this.processos(), ...this.fila(), ...this.disco()]) };
    const r = this.tentar(p);
    if (r !== 'alocado') {
      this.fila.update(f => [...f, p]);
      this.registrar(`${nome} (${tamanho} KB) foi para a fila de espera por memória.`);
    }
    return null;
  }

  gerarAleatorio(): void {
    this.criar(this.proximoNome(), aleatorio(10, 70));
  }

  /** Fim do processo: a área volta a ser lacuna e se une às lacunas vizinhas. */
  encerrar(nome: string): void {
    const p = this.processos().find(x => x.nome === nome);
    if (!p) return;
    this.processos.update(l => l.filter(x => x.nome !== nome));
    this.registrar(`${nome} terminou: ${p.tamanho} KB liberados em ${p.inicio} (lacunas vizinhas são unificadas).`);
    this.atenderFila();
  }

  /** Swap-out: o processo é suspenso e copiado para o disco, liberando a memória. */
  swapOut(nome: string): void {
    const p = this.processos().find(x => x.nome === nome);
    if (!p) return;
    this.processos.update(l => l.filter(x => x.nome !== nome));
    this.disco.update(d => [...d, { nome: p.nome, tamanho: p.tamanho, cor: p.cor }]);
    this.registrar(`Swap-out de ${nome}: copiado para o disco, ${p.tamanho} KB liberados.`);
    this.atenderFila();
  }

  /** Swap-in: volta para a memória, possivelmente em outro endereço (relocação). */
  swapIn(nome: string): string | null {
    const p = this.disco().find(x => x.nome === nome);
    if (!p) return null;
    const r = this.tentar(p);
    if (r === 'alocado') {
      this.disco.update(d => d.filter(x => x.nome !== nome));
      return null;
    }
    return this.mensagemFalha(this.ultima()!);
  }

  removerDaFila(nome: string): void {
    this.fila.update(f => f.filter(x => x.nome !== nome));
  }

  /** Compactação: desloca os processos para o início, unindo as lacunas (exige relocação dinâmica). */
  compactar(): string {
    const antes = this.lacunas().length;
    if (antes <= 1 && (this.lacunas()[0]?.inicio ?? 0) + (this.lacunas()[0]?.tamanho ?? 0) >= MEMORIA_TOTAL) {
      return antes === 0 ? 'A memória está cheia: não há lacunas para unir.' : 'A memória já está compactada: há uma única lacuna, no fim.';
    }
    let cursor = AREA_SO;
    const movidos: string[] = [];
    const novos = [...this.processos()].sort((a, b) => a.inicio - b.inicio).map(p => {
      const n = { ...p, inicio: cursor };
      if (n.inicio !== p.inicio) movidos.push(`${p.nome}: base ${p.inicio} → ${n.inicio}`);
      cursor += p.tamanho;
      return n;
    });
    this.processos.set(novos);
    this.ponteiro.set(cursor);
    this.registrar(`Compactação: ${antes} lacunas viraram 1 de ${this.livre()} KB. Relocação: ${movidos.join('; ') || 'nenhum processo movido'}.`);
    this.atenderFila();
    return `Memória compactada: ${antes} lacunas viraram 1 lacuna de ${this.livre()} KB. ${movidos.length} processo(s) relocado(s).`;
  }

  reiniciar(): void {
    this.processos.set([]);
    this.fila.set([]);
    this.disco.set([]);
    this.ponteiro.set(AREA_SO);
    this.ultima.set(null);
    this.eventos.set([]);
  }

  mensagemFalha(t: Tentativa): string {
    return t.resultado === 'fragmentacao'
      ? `Fragmentação externa: há ${t.livreTotal} KB livres, mas a maior lacuna tem ${t.maiorLacuna} KB e ${t.nome} precisa de ${t.tamanho} KB contíguos.`
      : `Memória insuficiente: ${t.nome} precisa de ${t.tamanho} KB e há ${t.livreTotal} KB livres.`;
  }

  // ───────────────────────── internos ─────────────────────────

  private tentar(p: ProcessoForaDaMemoria): ResultadoTentativa {
    const lista = this.lacunas();
    const estrategia = this.estrategia();
    const comparacao = ESTRATEGIAS.map(e => {
      const c = escolher(lista, p.tamanho, e.valor, this.ponteiro());
      return { estrategia: e.valor, inicio: c.escolhida?.inicio ?? null, sobra: c.sobra };
    });
    const { escolhida } = escolher(lista, p.tamanho, estrategia, this.ponteiro());
    const livreTotal = lista.reduce((t, l) => t + l.tamanho, 0);
    const maiorLacuna = lista.reduce((m, l) => Math.max(m, l.tamanho), 0);
    const resultado: ResultadoTentativa = escolhida ? 'alocado' : livreTotal >= p.tamanho ? 'fragmentacao' : 'insuficiente';
    const tentativa: Tentativa = { nome: p.nome, tamanho: p.tamanho, estrategia, lacunas: lista, comparacao, resultado, livreTotal, maiorLacuna };
    this.ultima.set(tentativa);

    if (escolhida) {
      this.processos.update(l => [...l, { ...p, inicio: escolhida.inicio }]);
      this.ponteiro.set(escolhida.inicio + p.tamanho);
      const sobra = escolhida.tamanho - p.tamanho;
      this.registrar(`${p.nome} (${p.tamanho} KB) alocado em ${escolhida.inicio} pela lacuna de ${escolhida.tamanho} KB` +
        (sobra ? `; a sobra de ${sobra} KB virou nova lacuna.` : ' (encaixe exato).'));
    } else {
      this.registrar(this.mensagemFalha(tentativa));
    }
    return resultado;
  }

  /** Depois que memória é liberada, tenta carregar quem está esperando (em ordem de chegada). */
  private atenderFila(): void {
    for (const p of [...this.fila()]) {
      if (this.tentar(p) === 'alocado') {
        this.fila.update(f => f.filter(x => x.nome !== p.nome));
      }
    }
  }

  private registrar(rotulo: string): void {
    this.eventos.update(e => [{ rotulo }, ...e].slice(0, 40));
  }
}
