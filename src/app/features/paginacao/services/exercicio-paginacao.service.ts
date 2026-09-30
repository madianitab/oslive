import { Injectable, computed, signal } from '@angular/core';
import { gera_cor } from 'src/app/core/utils';
import { TAM, TAM_HISTORICO_REF, TIMESTAMP_INICIAL } from 'src/app/core/constantes';

/**
 * Exercícios de Paginação por Demanda (ideia original do módulo de Carlos Bruno):
 *  1. Preencher a memória lógica: a partir da memória física, completar a tabela de páginas (End. MF e bit V/I);
 *  2. Preencher a memória física: a partir das tabelas de páginas, dizer qual página está em cada quadro;
 *  3. Determinar a página vítima: com a memória cheia, escolher quem sai por FIFO (FCFS),
 *     Histórico de bits de referência ou Segunda Chance.
 */
export type TipoExercicio = 'LOGICA' | 'FISICA' | 'VITIMA';
export type AlgoritmoVitima = 'FIFO' | 'HISTORICO' | 'SEGUNDA_CHANCE';

export const TIPOS_EXERCICIO: { valor: TipoExercicio; nome: string; descricao: string }[] = [
  { valor: 'LOGICA', nome: 'Preencher Memória Lógica',
    descricao: 'Observe a memória física e complete a tabela de páginas de cada processo (quadro e bit V/I).' },
  { valor: 'FISICA', nome: 'Preencher Memória Física',
    descricao: 'Observe as tabelas de páginas e indique qual página está em cada quadro da memória física.' },
  { valor: 'VITIMA', nome: 'Determinar Página Vítima',
    descricao: 'A memória física está cheia e uma nova página precisa entrar: escolha a página que será substituída.' },
];

export const ALGORITMOS_VITIMA: { valor: AlgoritmoVitima; nome: string }[] = [
  { valor: 'FIFO', nome: 'FIFO / FCFS (first-come, first-served)' },
  { valor: 'HISTORICO', nome: 'Histórico de bits de referência' },
  { valor: 'SEGUNDA_CHANCE', nome: 'Segunda Chance' },
];

export const NOMES_PROCESSOS = ['A', 'B', 'C', 'D'];
export const BITS_HISTORICO = TAM_HISTORICO_REF;

export interface PaginaExercicio {
  processo: string;
  indice: number;
  cor: string;
  /** Quadro da memória física (null = página só no disco, bit I). */
  quadro: number | null;
  /** Momento da carga na memória física. */
  timestamp: number | null;
  /** Segunda Chance: bit de referência. */
  bitRef: 0 | 1;
  /** Histórico de bits de referência (posição 0 = acesso mais recente). */
  historico: number[];
}

export interface ProcessoExercicio {
  nome: string;
  cor: string;
  paginas: PaginaExercicio[];
}

export type Correcao = boolean | null;

export interface RespostaPagina {
  quadro: string;   // '' = não respondido, '-' = fora da memória, '0'..'7' = quadro
  bit: string;      // '' = não respondido, 'V' ou 'I'
}

export function nomePagina(p: PaginaExercicio): string {
  return `${p.processo}${p.indice}`;
}

export function valorHistorico(p: PaginaExercicio): number {
  return p.historico.reduce((acc, bit) => acc * 2 + bit, 0);
}

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function aleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

  gerar(): void {
    const tipo = this.tipo();
    const n = this.quantidadeProcessos();
    const nomes = NOMES_PROCESSOS.slice(0, n);

    // Na página vítima a memória precisa ficar cheia e sobrar ao menos uma página no disco.
    let tamanhos: number[];
    do {
      tamanhos = nomes.map(() => tipo === 'VITIMA' ? aleatorio(2, 4) : aleatorio(1, 4));
    } while (tipo === 'VITIMA' && tamanhos.reduce((a, b) => a + b, 0) <= TAM);

    const processos: ProcessoExercicio[] = [];
    nomes.forEach((nome, i) => {
      const cor = gera_cor(processos);
      const paginas: PaginaExercicio[] = [];
      for (let k = 0; k < tamanhos[i]; k++) {
        paginas.push({ processo: nome, indice: k, cor, quadro: null, timestamp: null, bitRef: 0, historico: [] });
      }
      processos.push({ nome, cor, paginas });
    });

    const todas = processos.flatMap(p => p.paginas);
    const total = todas.length;

    // Quantas páginas ficam carregadas:
    // - exercícios 1 e 2: parte das páginas (sempre sobra ao menos uma no disco quando possível);
    // - exercício 3: a memória física fica cheia.
    let carregadas: number;
    if (tipo === 'VITIMA') {
      carregadas = TAM;
    } else if (total === 1) {
      carregadas = 1;
    } else {
      const maximo = Math.min(TAM, total - 1);
      const minimo = Math.max(1, Math.min(maximo, Math.ceil(total / 2)));
      carregadas = aleatorio(minimo, maximo);
    }

    const ordemCarga = embaralhar(todas).slice(0, carregadas);
    const quadrosLivres = embaralhar([...Array(TAM).keys()]);
    const quadros: (PaginaExercicio | null)[] = Array(TAM).fill(null);

    ordemCarga.forEach((pagina, i) => {
      const quadro = quadrosLivres[i];
      pagina.quadro = quadro;
      pagina.timestamp = TIMESTAMP_INICIAL + i;
      pagina.bitRef = Math.random() < 0.5 ? 0 : 1;
      pagina.historico = Array.from({ length: BITS_HISTORICO }, () => (Math.random() < 0.5 ? 0 : 1));
      quadros[quadro] = pagina;
    });

    this.processos.set(processos);
    this.quadros.set(quadros);
    this.paginaSolicitada.set(tipo === 'VITIMA' ? (embaralhar(todas.filter(p => p.quadro === null))[0] ?? null) : null);
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
   * - FIFO/FCFS: a carregada há mais tempo (menor timestamp);
   * - Histórico de bits: menor valor do histórico (bit mais recente à esquerda); empate → menor timestamp;
   * - Segunda Chance: percorre em ordem de timestamp; bit 1 ganha segunda chance (vira 0 e vai para o fim);
   *   a primeira com bit 0 sai. Se todas tiverem bit 1, a mais antiga sai depois da volta completa.
   */
  private calcularVitima(): PaginaExercicio | null {
    const fila = this.filaCarga();
    if (fila.length === 0) return null;
    switch (this.algoritmo()) {
      case 'FIFO':
        return fila[0];
      case 'HISTORICO':
        return [...fila].sort((a, b) => valorHistorico(a) - valorHistorico(b) || (a.timestamp ?? 0) - (b.timestamp ?? 0))[0];
      case 'SEGUNDA_CHANCE':
        return fila.find(p => p.bitRef === 0) ?? fila[0];
    }
  }
}
