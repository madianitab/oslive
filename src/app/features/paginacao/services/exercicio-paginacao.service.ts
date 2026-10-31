import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import { TAM } from 'src/app/core/constantes';
import {
  ALGORITMOS_VITIMA,
  AlgoritmoVitima,
  BITS_HISTORICO,
  Correcao,
  NOMES_PROCESSOS,
  PaginaExercicio,
  ProcessoExercicio,
  RespostaPagina,
  TIPOS_EXERCICIO,
  TipoExercicio,
  calcularVitimaPaginacao,
  gerarPaginacaoDemanda,
  nomePagina,
  valorHistorico,
} from '../models/exercicio-paginacao-demanda';

export {
  TIPOS_EXERCICIO,
  ALGORITMOS_VITIMA,
  NOMES_PROCESSOS,
  BITS_HISTORICO,
  nomePagina,
  valorHistorico,
} from '../models/exercicio-paginacao-demanda';
export type {
  TipoExercicio,
  AlgoritmoVitima,
  PaginaExercicio,
  ProcessoExercicio,
  Correcao,
  RespostaPagina,
} from '../models/exercicio-paginacao-demanda';

/** Estado do exercício, fornecido pela tela (cada visita começa do zero). */
@Injectable()
export class ExercicioPaginacaoService {

  readonly tipo = signal<TipoExercicio>('LOGICA');
  readonly algoritmo = signal<AlgoritmoVitima>('FIFO');
  readonly quantidadeProcessos = signal<number>(4);

  readonly processos = signal<ProcessoExercicio[]>([]);
  /** Página que está em cada quadro (gabarito). */
  readonly quadros = signal<(PaginaExercicio | null)[]>(Array(TAM).fill(null));
  /** Exercício 3: página que provocou a falta de página e precisa entrar. */
  readonly paginaSolicitada = signal<PaginaExercicio | null>(null);

  /** Respostas do aluno. */
  readonly respostasLogica = signal<Record<string, RespostaPagina>>({});
  readonly respostasFisica = signal<string[]>(Array(TAM).fill(''));
  readonly respostaVitima = signal<number | null>(null);

  readonly corrigido = signal(false);
  readonly mostrarResposta = signal(false);

  readonly todasPaginas = computed(() => this.processos().flatMap(p => p.paginas));

  /** Páginas carregadas em ordem de carga (fila FIFO / Segunda Chance). */
  readonly filaCarga = computed(() =>
    this.quadros().filter((q): q is PaginaExercicio => q !== null)
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)));

  readonly vitima = computed(() => this.calcularVitima());

  readonly placar = computed(() => this.calcularPlacar());

  readonly gerado = computed(() => this.processos().length > 0);

  // ───────────────────────── configuração ─────────────────────────

  definirTipo(tipo: TipoExercicio): void {
    this.tipo.set(tipo);
    if (tipo === 'VITIMA' && this.quantidadeProcessos() < 3) this.quantidadeProcessos.set(3);
    this.limparCenario();
  }

  definirAlgoritmo(algoritmo: AlgoritmoVitima): void {
    this.algoritmo.set(algoritmo);
    if (this.tipo() === 'VITIMA') this.limparCenario();
  }

  definirQuantidade(n: number): void {
    const minimo = this.tipo() === 'VITIMA' ? 3 : 1;
    this.quantidadeProcessos.set(Math.min(4, Math.max(minimo, Number(n) || minimo)));
    this.limparCenario();
  }

  limparCenario(): void {
    this.processos.set([]);
    this.quadros.set(Array(TAM).fill(null));
    this.paginaSolicitada.set(null);
    this.limparRespostas();
  }

  limparRespostas(): void {
    const respostas: Record<string, RespostaPagina> = {};
    this.todasPaginas().forEach(p => respostas[nomePagina(p)] = { quadro: '', bit: '' });
    this.respostasLogica.set(respostas);
    this.respostasFisica.set(Array(TAM).fill(''));
    this.respostaVitima.set(null);
    this.corrigido.set(false);
    this.mostrarResposta.set(false);
  }

  // ───────────────────────── geração ─────────────────────────

  /** Regras em models/exercicio-paginacao-demanda.ts; aqui só as cores. */
  gerar(): void {
    const ex = gerarPaginacaoDemanda(this.tipo(), this.quantidadeProcessos());
    const usadas: ProcessoExercicio[] = [];
    for (const p of ex.processos) {
      p.cor = gera_cor(usadas);
      p.paginas.forEach(pg => pg.cor = p.cor);
      usadas.push(p);
    }
    this.processos.set(ex.processos);
    this.quadros.set(ex.quadros);
    this.paginaSolicitada.set(ex.paginaSolicitada);
    this.limparRespostas();
  }

  // ───────────────────────── respostas ─────────────────────────

  responderLogica(pagina: PaginaExercicio, campo: 'quadro' | 'bit', valor: string): void {
    const chave = nomePagina(pagina);
    this.respostasLogica.update(r => ({ ...r, [chave]: { ...r[chave], [campo]: valor } }));
    this.corrigido.set(false);
  }

  responderFisica(quadro: number, valor: string): void {
    this.respostasFisica.update(r => r.map((v, i) => i === quadro ? valor : v));
    this.corrigido.set(false);
  }

  responderVitima(quadro: number): void {
    this.respostaVitima.set(quadro);
    this.corrigido.set(false);
  }

  /** Segunda Chance: clicar no bit simula um acesso (ou a limpeza) e muda o gabarito. */
  alternarBitReferencia(pagina: PaginaExercicio): void {
    pagina.bitRef = pagina.bitRef === 1 ? 0 : 1;
    this.quadros.update(q => [...q]);
    this.corrigido.set(false);
  }

  corrigir(): void {
    this.corrigido.set(true);
  }

  alternarResposta(): void {
    this.mostrarResposta.update(v => !v);
  }

  // ───────────────────────── correção ─────────────────────────

  corretoQuadro(p: PaginaExercicio): Correcao {
    if (!this.corrigido()) return null;
    const r = this.respostasLogica()[nomePagina(p)]?.quadro ?? '';
    return r === (p.quadro === null ? '-' : String(p.quadro));
  }

  corretoBit(p: PaginaExercicio): Correcao {
    if (!this.corrigido()) return null;
    const r = this.respostasLogica()[nomePagina(p)]?.bit ?? '';
    return r === (p.quadro === null ? 'I' : 'V');
  }

  corretoFrame(i: number): Correcao {
    if (!this.corrigido()) return null;
    const esperado = this.quadros()[i];
    return this.respostasFisica()[i] === (esperado ? nomePagina(esperado) : '-');
  }

  corretoVitima(): Correcao {
    if (!this.corrigido()) return null;
    return this.respostaVitima() === this.vitima()?.quadro;
  }

  private calcularPlacar(): { acertos: number; total: number } | null {
    if (!this.corrigido() || !this.gerado()) return null;
    let acertos = 0;
    let total = 0;
    switch (this.tipo()) {
      case 'LOGICA':
        this.todasPaginas().forEach(p => {
          total += 2;
          acertos += (this.corretoQuadro(p) ? 1 : 0) + (this.corretoBit(p) ? 1 : 0);
        });
        break;
      case 'FISICA':
        for (let i = 0; i < TAM; i++) {
          total++;
          if (this.corretoFrame(i)) acertos++;
        }
        break;
      case 'VITIMA':
        total = 1;
        acertos = this.corretoVitima() ? 1 : 0;
        break;
    }
    return { acertos, total };
  }

  /**
   * Página vítima de acordo com o algoritmo:
   * - FIFO: a carregada há mais tempo (menor timestamp);
   * - Histórico de bits (como no material): compara a partir de T4 (mais recente) e descarta quem tem 1,
   *   seguindo para T3, T2, T1; equivale ao menor valor lendo T4…T1 como binário; empate → menor timestamp;
   * - Segunda Chance: percorre em ordem de timestamp; bit 1 ganha segunda chance (vira 0 e vai para o fim);
   *   a primeira com bit 0 sai. Se todas tiverem bit 1, a mais antiga sai depois da volta completa.
   */
  private calcularVitima(): PaginaExercicio | null {
    return calcularVitimaPaginacao(this.quadros(), this.algoritmo());
  }
}
