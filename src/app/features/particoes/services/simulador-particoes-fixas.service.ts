import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import { ProcessoMem, ResultadoProtecao, protecao } from '../models/particoes';

export const TAM_SO_FIX = 120;                 // KB do SO
export const AREA_USUARIO_FIX = 380;           // KB divididos em partições
export const PARTICOES_PADRAO = [200, 100, 50, 30]; // exemplo do material

export type PoliticaFixa = 'FIRST' | 'BEST';

export const POLITICAS_FIXAS: { valor: PoliticaFixa; nome: string; regra: string }[] = [
  { valor: 'FIRST', nome: 'Primeira partição livre que comporta', regra: 'percorre a tabela de partições e usa a primeira livre com tamanho suficiente' },
  { valor: 'BEST', nome: 'Menor partição livre que comporta', regra: 'usa a partição livre de menor tamanho que comporta o processo (menos fragmentação interna)' },
];

export interface Particao {
  numero: number;
  inicio: number;
  tamanho: number;
  processo: ProcessoMem | null;
}

export interface Evento { tipo: 'ok' | 'erro' | 'aviso' | 'info'; texto: string; }

@Injectable()
export class SimuladorParticoesFixasService {
  readonly politica = signal<PoliticaFixa>('FIRST');
  readonly particoes = signal<Particao[]>(this.montar(PARTICOES_PADRAO));
  readonly fila = signal<ProcessoMem[]>([]);
  readonly eventos = signal<Evento[]>([]);
  readonly ultimo = signal<{ processo: ProcessoMem; particao: Particao | null; motivo: string } | null>(null);
  readonly protecaoTeste = signal<{ nome: string; logico: number; r: ResultadoProtecao } | null>(null);
  private contador = 0;

  readonly fragInterna = computed(() =>
    this.particoes().reduce((t, p) => t + (p.processo ? p.tamanho - p.processo.tamanho : 0), 0));
  readonly livres = computed(() => this.particoes().filter(p => !p.processo));
  readonly livreTotal = computed(() => this.livres().reduce((t, p) => t + p.tamanho, 0));
  readonly usado = computed(() => this.particoes().reduce((t, p) => t + (p.processo?.tamanho ?? 0), 0));
  readonly maiorParticao = computed(() => Math.max(...this.particoes().map(p => p.tamanho)));
  readonly todosProcessos = computed(() => [...this.particoes().filter(p => p.processo).map(p => p.processo!), ...this.fila()]);
  readonly vazia = computed(() => this.todosProcessos().length === 0);

  private montar(tamanhos: number[]): Particao[] {
    let inicio = TAM_SO_FIX;
    return tamanhos.map((t, i) => {
      const p = { numero: i + 1, inicio, tamanho: t, processo: null };
      inicio += t;
      return p;
    });
  }

  /** As partições só podem ser redefinidas com a memória vazia (não mudam durante a execução). */
  configurar(texto: string): string | null {
    if (!this.vazia()) return 'As partições fixas não mudam durante a execução: encerre todos os processos para redefini-las.';
    const tamanhos = texto.split(/[,;\s]+/).filter(Boolean).map(Number);
    if (tamanhos.length === 0 || tamanhos.some(t => !Number.isInteger(t) || t < 1)) return 'Informe os tamanhos em KB separados por vírgula (ex.: 200, 100, 50, 30).';
    const soma = tamanhos.reduce((a, b) => a + b, 0);
    if (soma > AREA_USUARIO_FIX) return `A soma das partições (${soma} KB) passa da área de usuário (${AREA_USUARIO_FIX} KB).`;
    this.particoes.set(this.montar(tamanhos));
    this.log('info', `Partições definidas: ${tamanhos.join(', ')} KB.`);
    return null;
  }

  definirPolitica(p: PoliticaFixa): void {
    this.politica.set(p);
  }

  criar(tamanho: number): string | null {
    if (!Number.isInteger(tamanho) || tamanho < 1) return 'Informe o tamanho do processo em KB (número inteiro).';
    if (tamanho > this.maiorParticao()) {
      return `O processo (${tamanho} KB) é maior que a maior partição (${this.maiorParticao()} KB): nunca poderá executar com esta configuração.`;
    }
    const p: ProcessoMem = { nome: `P${++this.contador}`, tamanho, cor: gera_cor(this.todosProcessos()) };
    if (!this.tentarAlocar(p)) this.fila.update(f => [...f, p]);
    return null;
  }

  gerarAleatorio(): void {
    this.criar(Math.floor(Math.random() * Math.max(1, this.maiorParticao() / 5)) * 5 + 5);
  }

  private escolher(tamanho: number): Particao | null {
    const cabem = this.livres().filter(p => p.tamanho >= tamanho);
    if (this.politica() === 'BEST') return [...cabem].sort((a, b) => a.tamanho - b.tamanho || a.numero - b.numero)[0] ?? null;
    return cabem[0] ?? null;
  }

  private tentarAlocar(p: ProcessoMem, origem = 'criado'): boolean {
    const part = this.escolher(p.tamanho);
    if (part) {
      this.particoes.update(l => l.map(x => x.numero === part.numero ? { ...x, processo: p } : x));
      const frag = part.tamanho - p.tamanho;
      const motivo = frag > 0
        ? `FRAGMENTAÇÃO INTERNA de ${frag} KB: ${p.nome} usa ${p.tamanho} KB da partição ${part.numero} (${part.tamanho} KB); a sobra fica presa na partição e ninguém mais pode usá-la.`
        : `${p.nome} ocupa a partição ${part.numero} inteira (encaixe exato, sem fragmentação interna).`;
      this.ultimo.set({ processo: p, particao: part, motivo });
      this.log(frag > 0 ? 'aviso' : 'ok', `${p.nome} (${p.tamanho} KB) ${origem} → partição ${part.numero}. ${frag > 0 ? `Fragmentação interna: ${frag} KB.` : 'Sem fragmentação interna.'}`);
      return true;
    }
    const livre = this.livreTotal();
    const motivo = livre >= p.tamanho
      ? `FRAGMENTAÇÃO EXTERNA: as partições livres somam ${livre} KB, mas nenhuma sozinha comporta ${p.nome} (${p.tamanho} KB). ${p.nome} aguarda na fila.`
      : `Nenhuma partição livre comporta ${p.nome} (${p.tamanho} KB) agora. ${p.nome} aguarda na fila até uma partição grande o suficiente ser liberada.`;
    this.ultimo.set({ processo: p, particao: null, motivo });
    this.log(livre >= p.tamanho ? 'erro' : 'aviso', motivo);
    return false;
  }

  private tentarFila(): void {
    const restantes: ProcessoMem[] = [];
    for (const p of this.fila()) {
      if (this.escolher(p.tamanho)) this.tentarAlocar(p, 'saiu da fila');
      else restantes.push(p);
    }
    this.fila.set(restantes);
  }

  encerrar(nome: string): void {
    const part = this.particoes().find(x => x.processo?.nome === nome);
    if (part) {
      this.particoes.update(l => l.map(x => x.numero === part.numero ? { ...x, processo: null } : x));
      this.log('info', `${nome} terminou: a partição ${part.numero} (${part.tamanho} KB) ficou livre.`);
      if (this.protecaoTeste()?.nome === nome) this.protecaoTeste.set(null);
      this.tentarFila();
      return;
    }
    this.fila.update(f => f.filter(p => p.nome !== nome));
  }

  /** Base = início da partição; limite = tamanho da partição (como no material). */
  testarProtecao(nome: string, logico: number): void {
    const part = this.particoes().find(x => x.processo?.nome === nome);
    if (!part) return;
    this.protecaoTeste.set({ nome, logico, r: protecao(part.inicio, part.tamanho, logico) });
  }

  reiniciar(): void {
    this.particoes.update(l => l.map(x => ({ ...x, processo: null })));
    this.fila.set([]);
    this.eventos.set([]);
    this.ultimo.set(null);
    this.protecaoTeste.set(null);
    this.contador = 0;
  }

  private log(tipo: Evento['tipo'], texto: string): void {
    this.eventos.update(e => [{ tipo, texto }, ...e].slice(0, 40));
  }
}
