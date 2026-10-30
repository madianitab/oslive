import { Injectable, computed, signal } from '@angular/core';
import {
  AlgoritmoSC,
  CasoSC,
  PaginaFila,
  Situacao,
  gerarFilaInicial,
  gerarSituacao,
} from '../models/segunda-chance-sequencia';

/**
 * Exercício "Segunda Chance em sequência": situações encadeadas (a fila resultante de uma é o
 * ponto de partida da próxima). Em cada uma, o aluno escolhe a página vítima e, se quiser,
 * monta a nova fila. Termina quando o aluno encerra ou após 10 situações.
 */
export type ModoResposta = 'VITIMA' | 'FILA';

export const MAX_SITUACOES = 10;

function ultimo<T>(lista: T[]): T | null {
  return lista.length ? lista[lista.length - 1] : null;
}

export const ALGORITMOS_SC: { valor: AlgoritmoSC; nome: string }[] = [
  { valor: 'SC', nome: 'Segunda Chance' },
  { valor: 'SCM', nome: 'Segunda Chance Melhorada (bits R e M)' },
];

export const MODOS_RESPOSTA: { valor: ModoResposta; nome: string }[] = [
  { valor: 'VITIMA', nome: 'Só a página vítima' },
  { valor: 'FILA', nome: 'Vítima e nova fila' },
];

export interface RespostaFila {
  pagina: string;
  r: string;
  m: string;
}

export interface RegistroSituacao {
  numero: number;
  caso: CasoSC;
  vitima: string;
  respostaVitima: string | null;
  acertoVitima: boolean;
  /** null quando o modo é só a vítima. */
  acertoFila: boolean | null;
  revelada: boolean;
}

@Injectable()
export class ExercicioSegundaChanceService {

  readonly algoritmo = signal<AlgoritmoSC>('SC');
  readonly modo = signal<ModoResposta>('VITIMA');

  readonly situacoes = signal<Situacao[]>([]);
  readonly registros = signal<RegistroSituacao[]>([]);
  readonly encerrado = signal(false);

  readonly respostaVitima = signal<string | null>(null);
  readonly respostaFila = signal<RespostaFila[]>([]);
  /** A situação atual já foi corrigida (ou teve a resposta revelada). */
  readonly respondida = signal(false);
  readonly revelada = signal(false);

  readonly gerado = computed(() => this.situacoes().length > 0);
  readonly atual = computed(() => ultimo(this.situacoes()));
  readonly ultimoRegistro = computed(() => ultimo(this.registros()));
  readonly numeroAtual = computed(() => this.situacoes().length);
  readonly podeAvancar = computed(() => this.respondida() && !this.encerrado() && this.numeroAtual() < MAX_SITUACOES);

  /** Páginas que podem aparecer na nova fila: as da memória e a solicitada. */
  readonly opcoesPaginas = computed(() => {
    const s = this.atual();
    return s ? [...s.filaFalta.map(p => p.nome), s.nova] : [];
  });

  readonly placar = computed(() => {
    const regs = this.registros();
    const pontosPorSituacao = this.modo() === 'FILA' ? 2 : 1;
    const acertos = regs.reduce((t, r) => t + (r.acertoVitima ? 1 : 0) + (r.acertoFila ? 1 : 0), 0);
    const total = regs.length * pontosPorSituacao;
    return { acertos, total, percentual: total ? Math.round((acertos / total) * 100) : 0 };
  });

  // ───────────────────────── configuração ─────────────────────────

  definirAlgoritmo(a: AlgoritmoSC): void {
    this.algoritmo.set(a);
    this.reiniciar();
  }

  definirModo(m: ModoResposta): void {
    this.modo.set(m);
    this.reiniciar();
  }

  /** Volta ao estado inicial, sem exercício. */
  reiniciar(): void {
    this.situacoes.set([]);
    this.registros.set([]);
    this.encerrado.set(false);
    this.limparResposta(true);
  }

  // ───────────────────────── fluxo ─────────────────────────

  novoExercicio(): void {
    this.reiniciar();
    this.adicionarSituacao(gerarFilaInicial(this.algoritmo()));
  }

  proxima(): void {
    const s = this.atual();
    if (!s || !this.podeAvancar()) return;
    this.adicionarSituacao(s.resultado.filaFinal);
  }

  encerrar(): void {
    if (!this.gerado()) return;
    this.encerrado.set(true);
  }

  private adicionarSituacao(fila: PaginaFila[]): void {
    const vistos = this.situacoes().map(s => s.resultado.caso);
    const vitimas = this.situacoes().map(s => s.resultado.vitima.nome);
    const sit = gerarSituacao(fila, this.algoritmo(), vistos, vitimas, ultimo(vistos));
    this.situacoes.update(l => [...l, sit]);
    this.limparResposta(true);
  }

  // ───────────────────────── respostas ─────────────────────────

  /** Limpa a resposta da situação atual (depois de corrigida, só com `forcar`). */
  limparResposta(forcar = false): void {
    if (this.respondida() && !forcar) return;
    const n = this.atual()?.resultado.filaFinal.length ?? 0;
    this.respostaVitima.set(null);
    this.respostaFila.set(Array.from({ length: n }, () => ({ pagina: '', r: '', m: '' })));
    this.respondida.set(false);
    this.revelada.set(false);
  }

  escolherVitima(nome: string): void {
    if (this.respondida()) return;
    this.respostaVitima.set(nome);
  }

  responderFila(i: number, campo: keyof RespostaFila, valor: string): void {
    if (this.respondida()) return;
    this.respostaFila.update(l => l.map((r, k) => k === i ? { ...r, [campo]: valor } : r));
  }

  /** Corrige a situação atual. Retorna uma mensagem quando falta responder algo. */
  corrigir(): string | null {
    if (!this.atual() || this.respondida() || this.encerrado()) return null;
    if (this.respostaVitima() === null) return 'Clique na página que será a vítima.';
    if (this.modo() === 'FILA' && this.respostaFila().some(r => !r.pagina || r.r === '' || (this.algoritmo() === 'SCM' && r.m === ''))) {
      return 'Preencha toda a nova fila.';
    }
    this.registrar(false);
    return null;
  }

  /** Mostra a resposta sem corrigir: a situação conta como erro. */
  verResposta(): void {
    if (!this.atual() || this.respondida() || this.encerrado()) return;
    this.registrar(true);
  }

  private registrar(revelada: boolean): void {
    const s = this.atual()!;
    const acertoVitima = !revelada && this.respostaVitima() === s.resultado.vitima.nome;
    const acertoFila = this.modo() === 'FILA' ? !revelada && this.filaCorreta() : null;
    this.registros.update(l => [...l, {
      numero: this.numeroAtual(),
      caso: s.resultado.caso,
      vitima: s.resultado.vitima.nome,
      respostaVitima: revelada ? null : this.respostaVitima(),
      acertoVitima,
      acertoFila,
      revelada,
    }]);
    this.respondida.set(true);
    this.revelada.set(revelada);
    if (this.numeroAtual() >= MAX_SITUACOES) this.encerrado.set(true);
  }

  // ───────────────────────── correção ─────────────────────────

  /** Correção de um campo da nova fila (null antes de responder). */
  campoCorreto(i: number, campo: keyof RespostaFila): boolean | null {
    if (!this.respondida() || this.revelada()) return null;
    const esperado = this.atual()?.resultado.filaFinal[i];
    if (!esperado) return null;
    const r = this.respostaFila()[i];
    if (campo === 'pagina') return r.pagina === esperado.nome;
    return r[campo] === String(esperado[campo]);
  }

  private filaCorreta(): boolean {
    const n = this.atual()?.resultado.filaFinal.length ?? 0;
    const campos: (keyof RespostaFila)[] = this.algoritmo() === 'SCM' ? ['pagina', 'r', 'm'] : ['pagina', 'r'];
    // Usa a mesma regra de campoCorreto, sem depender do sinal "respondida".
    const fila = this.atual()!.resultado.filaFinal;
    return Array.from({ length: n }).every((_, i) => campos.every(c => {
      const r = this.respostaFila()[i];
      return c === 'pagina' ? r.pagina === fila[i].nome : r[c] === String(fila[i][c]);
    }));
  }
}
